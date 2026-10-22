#!/usr/bin/env node
/* ============================================================================
   Genera paginas/gestion/paginas.json — el índice que muestra Gestión →
   "Propuestas" y "Otras páginas".

   Para cada página publicada en /paginas (archivos index.html confirmados en
   git) guarda su título, su grupo, cuándo se creó, cuándo se modificó y, para
   propuestas y reportes, TODAS sus versiones (cada commit que la tocó). Las
   versiones antiguas se ven en /paginas/gestion/version/ leyendo el archivo de
   ese commit en GitHub.

   Uso (después de hacer commit de los cambios en /paginas):
       node tools/paginas-manifest.js
   y luego commit de paginas/gestion/paginas.json.

   Historial: NO se usa `git log --follow` porque, como cada propuesta nace
   copiando otra, git le atribuiría el historial de la propuesta original. Solo
   se sigue un cambio de nombre real (R) o un traslado en el que la ruta vieja
   quedó como redirección hacia la nueva.
   ============================================================================ */
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'paginas', 'gestion', 'paginas.json');
const REPO = 'motoradvertising-dev/MotorAdvertising';
const CON_VERSIONES = ['propuestas', 'reportes'];
const CUENTA = ['login', 'creacion-de-cuenta', 'perfil'];

function git(args) {
    return execFileSync('git', ['-c', 'core.quotepath=off'].concat(args), { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'pipe'] });
}
function show(sha, file) {
    try { return git(['show', sha + ':' + file]); } catch (e) { return ''; }
}
function decode(s) {
    return String(s)
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ').trim();
}
function titleOf(html) {
    const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    return m ? decode(m[1]) : '';
}
// Destino de una página de redirección (meta refresh), o null.
function redirectOf(html) {
    if (!/http-equiv\s*=\s*["']refresh["']/i.test(html)) return null;
    const m = /content\s*=\s*["'][^"']*url\s*=\s*([^"']+)["']/i.exec(html);
    return m ? m[1].trim() : '';
}
function slugOf(file) {
    return file.replace(/^paginas\//, '').replace(/\/?index\.html$/, '');
}

// Commits que tocaron una ruta exacta (más nuevo primero), opcionalmente antes de un commit.
function commitsOf(file, before) {
    // Sin D: el commit que borró la ruta no es una versión (con --no-renames no hay R ni C).
    const args = ['log', '--no-renames', '--diff-filter=AMT', '--format=%H%x09%aI%x09%s'];
    if (before) args.push(before + '^');
    args.push('--', file);
    let out = '';
    try { out = git(args); } catch (e) { return []; }
    return out.split('\n').filter(Boolean).map((l) => {
        const [sha, fecha, ...rest] = l.split('\t');
        return { sha, fecha, mensaje: rest.join('\t'), ruta: file };
    });
}

// ¿De dónde viene esta ruta en el commit que la creó? Solo cambio de nombre real
// o traslado (la ruta vieja quedó como redirección a esta página).
function originOf(file, createdSha) {
    const slug = slugOf(file);
    let out = '';
    try { out = git(['show', '-M', '-C', '--name-status', '--format=', createdSha]); } catch (e) { return null; }
    for (const line of out.split('\n')) {
        const p = line.split('\t');
        if (p.length !== 3 || p[2] !== file) continue;
        if (/^R/.test(p[0])) return p[1];
        if (/^C/.test(p[0])) {
            const dest = redirectOf(show(createdSha, p[1]));
            if (dest != null && dest.replace(/\/+$/, '').endsWith('/' + slug)) return p[1];
        }
    }
    return null;
}

function historyOf(file) {
    let versions = commitsOf(file);
    let current = file;
    for (let depth = 0; depth < 5 && versions.length; depth++) {
        const created = versions[versions.length - 1].sha;
        const src = originOf(current, created);
        if (!src) break;
        const older = commitsOf(src, created);
        if (!older.length) break;
        versions = versions.concat(older);
        current = src;
    }
    return versions;
}

function groupOf(slug, title, redirect) {
    if (redirect != null) return 'redirecciones';
    if (/^propuesta/i.test(slug) || /propuesta|proposal/i.test(title)) return 'propuestas';
    if (/^reporte/i.test(slug) || /^reporte|report\b/i.test(title)) return 'reportes';
    if (/^gestion(\/|$)/.test(slug)) return 'administracion';
    if (CUENTA.indexOf(slug) !== -1) return 'cuenta';
    return 'sitio';
}

const files = git(['ls-files', 'paginas']).split('\n').filter((f) => /(^|\/)index\.html$/.test(f));
const paginas = files.map((file) => {
    const html = show('HEAD', file);
    const slug = slugOf(file);
    const titulo = titleOf(html);
    const redirige = redirectOf(html);
    const grupo = groupOf(slug, titulo, redirige);
    const versiones = historyOf(file);
    const entry = {
        slug,
        url: '/paginas/' + slug + '/',
        titulo,
        grupo,
        creada: versiones.length ? versiones[versiones.length - 1].fecha : null,
        actualizada: versiones.length ? versiones[0].fecha : null,
        num_versiones: versiones.length
    };
    if (redirige != null) entry.redirige_a = redirige;
    if (CON_VERSIONES.indexOf(grupo) !== -1) {
        // Título de cada versión (puede cambiar con el tiempo, p. ej. al poner el nombre del cliente).
        entry.versiones = versiones.map((v) => ({
            sha: v.sha,
            fecha: v.fecha,
            mensaje: v.mensaje,
            ruta: v.ruta,
            titulo: titleOf(show(v.sha, v.ruta))
        }));
    }
    return entry;
}).sort((a, b) => String(b.creada).localeCompare(String(a.creada)));

const manifest = {
    generado: new Date().toISOString(),
    commit: git(['rev-parse', '--short', 'HEAD']).trim(),
    repo: REPO,
    paginas
};
fs.writeFileSync(OUT, JSON.stringify(manifest, null, 1) + '\n');
const porGrupo = {};
paginas.forEach((p) => { porGrupo[p.grupo] = (porGrupo[p.grupo] || 0) + 1; });
console.log('paginas.json:', paginas.length, 'páginas', JSON.stringify(porGrupo));
