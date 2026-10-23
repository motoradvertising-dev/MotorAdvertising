#!/usr/bin/env node
/* ============================================================================
   Copia el prompt legible (PROMPT.md) de una Edge Function a un módulo
   TypeScript (prompt.ts) para que el código y el documento no se desincronicen.

   Uso:  node tools/sync-prompt.js generate-proposal
   Luego: npx supabase functions deploy generate-proposal --project-ref seeaexvmdvmlbbezuosm --use-api
   ============================================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const fn = process.argv[2];
if (!fn) { console.error('Uso: node tools/sync-prompt.js <nombre-de-la-funcion>'); process.exit(1); }
const dir = path.resolve(__dirname, '..', 'supabase', 'functions', fn);
const md = fs.readFileSync(path.join(dir, 'PROMPT.md'), 'utf8').replace(/\r\n/g, '\n').trim();
let out = '// GENERADO por tools/sync-prompt.js a partir de PROMPT.md (y ejemplo.json) — no editar a mano.\n' +
          'export const SYSTEM_PROMPT: string = ' + JSON.stringify(md) + ';\n';
// ejemplo.json (opcional): una propuesta completa de la casa que se adjunta al
// prompt como ejemplo de forma. Se compacta para gastar menos tokens.
// Se exporta SIEMPRE (vacío si no hay archivo) para que el import de index.ts no rompa.
const ejemploPath = path.join(dir, 'ejemplo.json');
let ejemplo = '';
if (fs.existsSync(ejemploPath)) {
    ejemplo = JSON.stringify(JSON.parse(fs.readFileSync(ejemploPath, 'utf8')));
} else {
    console.warn('Aviso: no hay ejemplo.json en ' + dir + '; el prompt sale sin ejemplo completo.');
}
out += 'export const EJEMPLO: string = ' + JSON.stringify(ejemplo) + ';\n';
fs.writeFileSync(path.join(dir, 'prompt.ts'), out);
console.log('prompt.ts actualizado:', md.length, 'caracteres' + (fs.existsSync(ejemploPath) ? ' + ejemplo' : ''));
