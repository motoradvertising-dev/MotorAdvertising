/* ============================================================================
   Gestión › Propuestas: generador con IA y editor (v1.1)
   ----------------------------------------------------------------------------
   Lo carga /paginas/gestion/. Pinta la tarjeta "Crear propuesta con IA" antes
   del listado por meses, el editor (vista previa + correcciones) y expone lo
   que el listado necesita para mezclar las propuestas de la base de datos con
   las páginas hechas a mano.

   MotorPropuestasUI.init({ root, editorRoot, catalogo, onChange })
   MotorPropuestasUI.cargar()            → Promise<filas de public.propuestas>
   MotorPropuestasUI.paraListado(filas)  → entradas con la forma de paginas.json
   MotorPropuestasUI.abrirEditor(id)
   MotorPropuestasUI.publicar(id, estado) / eliminar(id)

   Guarda y corrige a través de la Edge Function generate-proposal y de las
   funciones SQL de supabase/setup-proposals.sql (una versión por día).
   Depende de window.MotorAuth y window.MotorProposal.
   ============================================================================ */
(function () {
    'use strict';

    var TIPOS = [
        ['web', 'Desarrollo web'], ['marketing', 'Marketing y pauta'], ['automatizacion', 'Automatización y software'],
        ['comercial', 'Comercial / closer'], ['mixta', 'Mixta (web + marketing)'], ['otro', 'Otro']
    ];
    var TIPO_LABEL = {};
    TIPOS.forEach(function (t) { TIPO_LABEL[t[0]] = t[1]; });
    var ESTADO_LABEL = { borrador: 'Borrador', publicada: 'Publicada', archivada: 'Archivada' };
    var COLS = 'id, slug, cliente, titulo, tipo, idioma, estado, contenido, referencias, created_at, updated_at, ' +
               'propuesta_versiones(id, dia, numero, cambios, created_at, updated_at)';

    var cfg = { root: null, editorRoot: null, catalogo: [], onChange: function () {} };
    var filas = [];          // propuestas de la base de datos
    var editando = null;     // fila abierta en el editor
    var anterior = null;     // { contenido, instruccion } para "Deshacer"
    var vistaMovil = false;
    // Petición en curso ({ id, tipo, instruccion }): mientras exista, el editor de esa
    // propuesta se pinta bloqueado y no se lanza otra escritura sobre ella (dos
    // correcciones a la vez se pisarían en el servidor).
    var pendiente = null;

    /* ---------- Utilidades ---------- */

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }
    function slugify(s) {
        return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
            .toLowerCase().replace(/&/g, ' y ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    }
    function hoyISO() {
        try { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }); }
        catch (e) { return new Date().toISOString().slice(0, 10); }
    }
    function fecha(iso) {
        try { return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }); }
        catch (e) { return ''; }
    }
    function fechaDia(dia) {
        try { return new Date(dia + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }); }
        catch (e) { return dia; }
    }
    function urlPublica(slug) { return window.location.origin + '/paginas/propuesta/?p=' + encodeURIComponent(slug); }
    function $(id) { return document.getElementById(id); }
    function val(id) { var el = $(id); return el ? String(el.value || '').trim() : ''; }
    function msg(id, text, type) {
        var el = $(id);
        if (!el) return;
        el.textContent = text || '';
        el.className = 'gp-msg' + (text ? ' show ' + (type || '') : '');
    }
    // Igual que msg() pero con HTML ya escapado (para un enlace dentro del aviso).
    function msgHtml(id, html, type) {
        var el = $(id);
        if (!el) return;
        el.innerHTML = html || '';
        el.className = 'gp-msg' + (html ? ' show ' + (type || '') : '');
    }
    // Recarga la lista tras una escritura. Si la recarga falla lo dice (lo escrito ya
    // quedó en la base) en vez de dejar la pantalla congelada en el estado anterior.
    function recargar(msgId, luego) {
        return cargar().then(luego, function (e) {
            var detalle = e && e.message ? e.message : 'sin conexión';
            msg(msgId, 'Se guardó, pero no se pudo actualizar la lista (' + detalle + '). Recarga la página para ver el estado real.', 'err');
        });
    }
    // Mensaje de error de una Edge Function (viene como JSON en el cuerpo).
    function errorDe(res, porDefecto) {
        return new Promise(function (resolve) {
            var ctx = res.error && res.error.context;
            if (ctx && typeof ctx.json === 'function') {
                ctx.json().then(function (j) { resolve((j && j.error) || porDefecto); }).catch(function () { resolve(porDefecto); });
            } else {
                resolve((res.error && res.error.message) ? porDefecto + ' (' + res.error.message + ')' : porDefecto);
            }
        });
    }
    function db() { return window.MotorAuth.client; }

    /* ---------- Datos ---------- */

    function cargar() {
        return db().from('propuestas').select(COLS).order('created_at', { ascending: false })
            .then(function (r) {
                if (r.error) throw r.error;
                filas = (r.data || []).map(function (p) {
                    p.propuesta_versiones = (p.propuesta_versiones || []).slice().sort(function (a, b) { return b.numero - a.numero; });
                    return p;
                });
                return filas;
            });
    }

    // Misma forma que las entradas de paginas.json, para el listado por meses.
    function paraListado(rows) {
        return (rows || filas).map(function (p) {
            var vs = p.propuesta_versiones || [];
            return {
                db: true, id: p.id, estado: p.estado, tipo: p.tipo, cliente: p.cliente,
                slug: p.slug, url: '/paginas/propuesta/?p=' + encodeURIComponent(p.slug),
                titulo: p.titulo || ('Propuesta · Motor Advertising × ' + p.cliente),
                grupo: 'propuestas',
                creada: p.created_at, actualizada: p.updated_at, num_versiones: vs.length,
                versiones: vs.map(function (v) {
                    var cambios = v.cambios || [];
                    return {
                        sha: v.id, fecha: v.updated_at || v.created_at, dia: v.dia, titulo: p.titulo,
                        mensaje: v.numero === 1 && !cambios.length ? 'Creada con IA'
                            : cambios.length ? 'Correcciones: ' + cambios.join(' · ') : 'Modificada'
                    };
                })
            };
        });
    }

    function filaPorId(id) { return filas.filter(function (p) { return p.id === id; })[0] || null; }

    /* ---------- Formulario ---------- */

    function opcionesTipo(sel) {
        return TIPOS.map(function (t) { return '<option value="' + t[0] + '"' + (t[0] === sel ? ' selected' : '') + '>' + esc(t[1]) + '</option>'; }).join('');
    }

    function listaReferencias() {
        var legacy = (cfg.catalogo || []).filter(function (p) { return p.grupo === 'propuestas' && !p.db; });
        var items = filas.map(function (p) {
            return { slug: p.slug, nombre: p.cliente, sub: TIPO_LABEL[p.tipo] || p.tipo, db: true };
        }).concat(legacy.map(function (p) {
            var m = /[×→]\s*(.+)$/.exec(p.titulo || '');
            return { slug: p.slug, nombre: m ? m[1].trim() : (p.titulo || p.slug), sub: p.url, db: false };
        }));
        return items.map(function (it) {
            return '<label class="gp-ref' + (it.db ? ' is-db' : '') + '"><input type="checkbox" name="gp-ref" value="' + esc(it.slug) + '">' +
                '<span>' + esc(it.nombre) + '<small>' + esc(it.sub) + '</small></span></label>';
        }).join('') || '<p class="gp-hint">Aún no hay propuestas para usar de referencia.</p>';
    }

    function renderForm() {
        cfg.root.innerHTML =
            '<details class="gp-card" id="gp-card">' +
                '<summary>' +
                    '<span class="gp-orb" aria-hidden="true"><i class="fas fa-wand-magic-sparkles"></i></span>' +
                    '<span class="gp-head-txt">' +
                        '<span class="gp-eyebrow">Con IA · misma plantilla de siempre</span>' +
                        '<span class="gp-title">Crear propuesta nueva</span>' +
                        '<span class="gp-sub">Nombre, precios y tus apuntes; la IA arma la propuesta siguiendo las anteriores. Después la corriges aquí mismo y la publicas.</span>' +
                    '</span>' +
                    '<i class="fas fa-chevron-down pg-chev" aria-hidden="true"></i>' +
                '</summary>' +
                '<div class="gp-body">' +
                    '<form id="gp-form" novalidate>' +
                        '<div class="gp-grid">' +
                            '<div class="gp-f"><label for="gp-cliente">Cliente <b>*</b></label><input type="text" id="gp-cliente" maxlength="140" placeholder="Ej. IPS y CRC Renueva" autocomplete="off">' +
                                '<p class="gp-url">Enlace: <strong id="gp-url-prev">…</strong></p></div>' +
                            '<div class="gp-f"><label for="gp-tipo">Tipo</label><select id="gp-tipo">' + opcionesTipo('web') + '</select></div>' +
                            '<div class="gp-f"><label for="gp-idioma">Idioma y moneda</label>' +
                                '<div style="display:flex;gap:8px"><select id="gp-idioma" aria-label="Idioma"><option value="es">Español</option><option value="en">English</option></select>' +
                                '<select id="gp-moneda" aria-label="Moneda"><option value="COP">COP</option><option value="USD">USD</option></select></div></div>' +
                            '<div class="gp-f gp-wide"><label for="gp-precios">Precios y forma de pago <b>*</b></label>' +
                                '<textarea id="gp-precios" maxlength="6000" placeholder="Ej. Web $2.000.000 pago único al iniciar · Fee mensual $600.000 · Pauta mínima $500.000 (la paga el cliente a Meta) · Perfil de Google opcional +$500.000"></textarea>' +
                                '<p class="gp-hint">Pon cada precio con su moneda y si es único o mensual, el anticipo o la forma de pago, y qué paga el cliente a terceros (pauta, dominio, hosting).</p></div>' +
                            '<div class="gp-f gp-wide"><label for="gp-apuntes">Tus apuntes <b>*</b></label>' +
                                '<textarea id="gp-apuntes" class="tall" maxlength="24000" placeholder="Pega aquí tus notas tal cual: qué se ofrece, alcance de cada parte, entregas, condiciones, lo que NO se debe decir, referentes que le gustan al cliente…"></textarea>' +
                                '<p class="gp-hint">Mientras más concreto el alcance (qué incluye y qué no, tiempos, garantía, requerimientos), más exacta la propuesta. Si mencionas a otro cliente (p. ej. «como la de Flaminio»), la IA toma esa propuesta de referencia.</p></div>' +
                            '<div class="gp-f gp-wide"><label>Propuestas de referencia <span style="text-transform:none;letter-spacing:0">(opcional · máx. 4)</span></label>' +
                                '<div class="gp-refs" id="gp-refs">' + listaReferencias() + '</div>' +
                                '<p class="gp-hint">Si no marcas ninguna, la IA usa las más parecidas según el tipo.</p></div>' +
                            '<details class="gp-more"><summary><i class="fas fa-sliders" aria-hidden="true"></i> Más datos del cliente y de la propuesta (opcional)</summary>' +
                                '<div class="gp-grid">' +
                                    '<div class="gp-f"><label for="gp-marca">Nombre corto para el titular</label><input type="text" id="gp-marca" maxlength="60" placeholder="Ej. Renueva (sale como MOTOR × RENUEVA)"></div>' +
                                    '<div class="gp-f"><label for="gp-nit">NIT / identificación</label><input type="text" id="gp-nit" maxlength="40" placeholder="Ej. 901.646.074"></div>' +
                                    '<div class="gp-f"><label for="gp-sector">Sector / a qué se dedica</label><input type="text" id="gp-sector" maxlength="200" placeholder="Ej. IPS de salud ocupacional"></div>' +
                                    '<div class="gp-f"><label for="gp-ciudad">Ciudad / país</label><input type="text" id="gp-ciudad" maxlength="80" placeholder="Ej. Bogotá, Colombia"></div>' +
                                    '<div class="gp-f"><label for="gp-web">Sitio web actual</label><input type="url" id="gp-web" maxlength="200" placeholder="https://…"></div>' +
                                    '<div class="gp-f"><label for="gp-contacto">Persona de contacto</label><input type="text" id="gp-contacto" maxlength="120" placeholder="Nombre y cargo"></div>' +
                                    '<div class="gp-f"><label for="gp-fecha">Fecha de emisión</label><input type="date" id="gp-fecha"></div>' +
                                    '<div class="gp-f"><label for="gp-vigencia">Vigencia</label><input type="text" id="gp-vigencia" maxlength="60" value="dos (2) semanas"></div>' +
                                    '<div class="gp-f"><label for="gp-trm">TRM de referencia (si hay USD)</label><input type="text" id="gp-trm" maxlength="20" placeholder="Ej. $3.167,98"></div>' +
                                    '<div class="gp-f gp-wide"><label for="gp-tono">Tono o enfoque del titular</label><input type="text" id="gp-tono" maxlength="600" placeholder="Ej. directo y comercial; titular tipo «Una web que vende»"></div>' +
                                    '<div class="gp-f gp-wide"><label for="gp-slug">Enlace (se genera solo)</label><input type="text" id="gp-slug" maxlength="60" placeholder="renueva" autocomplete="off">' +
                                        '<p class="gp-hint">Solo letras minúsculas, números y guiones. Queda en <code>/paginas/propuesta/?p=…</code></p></div>' +
                                '</div>' +
                            '</details>' +
                        '</div>' +
                        '<div class="gp-actions">' +
                            '<button type="submit" class="gp-btn" id="gp-generar"><i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i> Generar propuesta</button>' +
                            '<span class="gp-msg" id="gp-msg" role="status" aria-live="polite"></span>' +
                        '</div>' +
                    '</form>' +
                '</div>' +
            '</details>';

        $('gp-fecha').value = hoyISO();
        var cliente = $('gp-cliente'), slugIn = $('gp-slug');
        var slugManual = false;
        function syncUrl() {
            var s = slugManual && val('gp-slug') ? slugify(val('gp-slug')) : slugify(cliente.value);
            if (!slugManual) slugIn.value = s;
            // Misma regla que la base de datos: entre 2 y 60 caracteres.
            $('gp-url-prev').textContent = s.length >= 2 ? urlPublica(s).replace(/^https?:\/\//, '')
                : s ? 'muy corto: el enlace necesita al menos 2 letras o números (ajústalo en «Más datos»)' : '…';
        }
        cliente.addEventListener('input', syncUrl);
        slugIn.addEventListener('input', function () { slugManual = !!slugIn.value.trim(); syncUrl(); });
        $('gp-idioma').addEventListener('change', function () {
            var en = this.value === 'en';
            if (!val('gp-vigencia') || /semanas|weeks/.test(val('gp-vigencia'))) $('gp-vigencia').value = en ? 'two (2) weeks' : 'dos (2) semanas';
            if (en && $('gp-moneda').value === 'COP') $('gp-moneda').value = 'USD';
        });
        $('gp-refs').addEventListener('change', function (e) {
            var t = e.target;
            if (t && t.checked && cfg.root.querySelectorAll('input[name="gp-ref"]:checked').length > 4) {
                t.checked = false;   // se rechaza la que se acaba de marcar, no otra
                msg('gp-msg', 'Máximo 4 propuestas de referencia.', 'err');
            }
        });
        $('gp-form').addEventListener('submit', function (e) { e.preventDefault(); generar(); });
        syncUrl();
    }

    function refrescarReferencias() {
        var box = $('gp-refs');
        if (!box) return;
        var marcadas = {};
        box.querySelectorAll('input:checked').forEach(function (i) { marcadas[i.value] = true; });
        box.innerHTML = listaReferencias();
        box.querySelectorAll('input').forEach(function (i) { if (marcadas[i.value]) i.checked = true; });
    }

    function generar() {
        var cliente = val('gp-cliente'), precios = val('gp-precios'), apuntes = val('gp-apuntes');
        if (!cliente) { msg('gp-msg', 'Escribe el nombre del cliente.', 'err'); $('gp-cliente').focus(); return; }
        if (!precios) { msg('gp-msg', 'Indica los precios y la forma de pago.', 'err'); $('gp-precios').focus(); return; }
        if (apuntes.length < 40) { msg('gp-msg', 'Pega tus apuntes de la propuesta (al menos unas líneas).', 'err'); $('gp-apuntes').focus(); return; }
        if (pendiente) { msg('gp-msg', 'Espera a que termine la operación en curso.', 'err'); return; }
        var slug = slugify(val('gp-slug') || cliente);
        if (slug.length < 2) { msg('gp-msg', 'El enlace necesita al menos 2 letras o números: ajústalo en «Más datos › Enlace».', 'err'); $('gp-slug').focus(); return; }
        var refs = [];
        cfg.root.querySelectorAll('input[name="gp-ref"]:checked').forEach(function (i) { refs.push(i.value); });
        var fechaIso = val('gp-fecha');
        var body = {
            modo: 'crear', cliente: cliente, slug: slug, tipo: val('gp-tipo'), idioma: val('gp-idioma'),
            precios: precios, apuntes: apuntes, referencias: refs,
            datos: {
                marca: val('gp-marca'), nit: val('gp-nit'), sector: val('gp-sector'), ciudad: val('gp-ciudad'), web: val('gp-web'),
                contacto: val('gp-contacto'), moneda: val('gp-moneda'), trm: val('gp-trm'), vigencia: val('gp-vigencia'), tono: val('gp-tono'),
                fecha: fechaIso ? fechaDia(fechaIso) : ''
            }
        };
        var btn = $('gp-generar');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin" aria-hidden="true"></i> Generando… (1 a 2 minutos)';
        msg('gp-msg', 'La IA está leyendo tus apuntes y las propuestas de referencia. No cierres la página.', 'info');
        pendiente = { id: null, tipo: 'crear' };
        var listo = function () {
            pendiente = null;
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i> Generar propuesta';
        };
        db().functions.invoke('generate-proposal', { body: body }).then(function (res) {
            listo();
            if (res.error) {
                errorDe(res, 'No se pudo generar la propuesta. Intenta de nuevo.').then(function (t) { msg('gp-msg', t, 'err'); });
                return;
            }
            var data = res.data || {};
            if (!data.propuesta || !data.propuesta.id) { msg('gp-msg', 'La función no devolvió la propuesta. Revisa la configuración.', 'err'); return; }
            var nuevaId = data.propuesta.id;
            $('gp-form').reset();
            $('gp-fecha').value = hoyISO();
            $('gp-url-prev').textContent = '…';
            msg('gp-msg', 'Lista. Quedó como BORRADOR.', 'ok');
            recargar('gp-msg', function () {
                cfg.onChange();
                refrescarReferencias();
                // Si hay otra propuesta abierta con una corrección a medio escribir, no se la quitamos de en medio.
                if (editando && editando.id !== nuevaId && val('gp-instr')) {
                    msgHtml('gp-msg', 'Lista. Quedó como BORRADOR. <a href="#" data-gp-abrir="' + esc(nuevaId) + '">Abrir la propuesta nueva</a> cuando termines con la que tienes abierta.', 'ok');
                    return;
                }
                msg('gp-msg', 'Lista. Quedó como BORRADOR: revísala abajo, pide las correcciones que quieras y publícala.', 'ok');
                abrirEditor(nuevaId);
            });
        }, function (e) {
            listo();
            msg('gp-msg', 'No se pudo generar la propuesta (' + (e && e.message ? e.message : 'sin conexión') + ').', 'err');
        });
    }

    /* ---------- Editor ---------- */

    function versionHoy(p) {
        var hoy = hoyISO();
        return (p.propuesta_versiones || []).filter(function (v) { return v.dia === hoy; })[0] || null;
    }

    function renderEditor() {
        var p = editando;
        var root = cfg.editorRoot;
        if (!p) { root.innerHTML = ''; return; }
        var vHoy = versionHoy(p);
        var n = (p.propuesta_versiones || []).length;
        var publica = p.estado === 'publicada';
        var ocupado = !!(pendiente && pendiente.id === p.id);
        var corrigiendo = ocupado && pendiente.tipo === 'corregir';
        var dis = ocupado ? ' disabled' : '';
        root.innerHTML =
            '<div class="gp-editor" id="gp-editor" role="region" aria-label="Editor de la propuesta">' +
                '<div class="gp-ed-head">' +
                    '<div class="gp-ed-title">' +
                        '<span class="gp-eyebrow">Propuesta con IA · editor</span>' +
                        '<h3>' + esc(p.cliente) + '</h3>' +
                        '<div class="gp-ed-meta">' +
                            '<span class="gp-chip ' + esc(p.estado) + '">' + esc(ESTADO_LABEL[p.estado] || p.estado) + '</span>' +
                            '<span>' + esc(TIPO_LABEL[p.tipo] || p.tipo) + ' · ' + (p.idioma === 'en' ? 'English' : 'Español') + '</span>' +
                            '<span>' + (n === 1 ? '1 versión' : n + ' versiones') + (vHoy ? ' · la de hoy es la v' + vHoy.numero : '') + '</span>' +
                            '<span>' + esc(urlPublica(p.slug).replace(/^https?:\/\//, '')) + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="gp-ed-actions">' +
                        '<button type="button" class="gp-btn2 ' + (publica ? 'warn' : 'ok') + '" id="gp-pub"' + dis + '><i class="fas ' + (publica ? 'fa-eye-slash' : 'fa-paper-plane') + '" aria-hidden="true"></i> ' + (publica ? 'Despublicar' : 'Publicar') + '</button>' +
                        '<button type="button" class="gp-btn2" id="gp-copy"><i class="fas fa-link" aria-hidden="true"></i> Copiar enlace</button>' +
                        '<a class="gp-btn2" href="' + esc(urlPublica(p.slug)) + '" target="_blank" rel="noopener"><i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i> Abrir</a>' +
                        '<button type="button" class="gp-btn2 danger" id="gp-del"' + dis + '><i class="fas fa-trash-can" aria-hidden="true"></i> Eliminar</button>' +
                        '<button type="button" class="gp-btn2" id="gp-close"><i class="fas fa-xmark" aria-hidden="true"></i> Cerrar</button>' +
                    '</div>' +
                '</div>' +
                '<div class="gp-frame-wrap' + (vistaMovil ? ' movil' : '') + '" id="gp-frame-wrap">' +
                    '<div class="gp-frame-bar"><span>Así la ve el cliente</span>' +
                        '<span class="gp-size"><button type="button" data-size="pc" class="' + (vistaMovil ? '' : 'on') + '">Computador</button><button type="button" data-size="movil" class="' + (vistaMovil ? 'on' : '') + '">Celular</button></span></div>' +
                    '<iframe class="gp-frame" id="gp-frame" title="Vista previa de la propuesta" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>' +
                '</div>' +
                '<div id="gp-warn"></div>' +
                '<div class="gp-fix">' +
                    '<textarea id="gp-instr" maxlength="4000" placeholder="Pide la corrección como se la pedirías a alguien del equipo: «Cambia el precio de la web a $2.500.000 y quita la sección opcional», «El titular de la parte 1 debe ser Una web que vende», «Agrega una condición de 50 % de anticipo»…"' + dis + '>' + (corrigiendo ? esc(pendiente.instruccion) : '') + '</textarea>' +
                    '<div class="gp-fix-btns">' +
                        '<button type="button" class="gp-btn" id="gp-fix"' + dis + '>' + (corrigiendo ? '<i class="fas fa-circle-notch fa-spin" aria-hidden="true"></i> Corrigiendo…' : '<i class="fas fa-pen-nib" aria-hidden="true"></i> Corregir') + '</button>' +
                        (anterior && anterior.id === p.id ? '<button type="button" class="gp-btn2" id="gp-undo"' + dis + '><i class="fas fa-rotate-left" aria-hidden="true"></i> Deshacer</button>' : '') +
                    '</div>' +
                    '<p class="gp-hint">Las correcciones de hoy se guardan sobre la versión de hoy (no crean una versión nueva). Si la cambias otro día, esa sí queda como versión aparte en el historial.' +
                        (publica ? ' <strong style="color:#ffce7a">La propuesta está publicada: cada corrección se ve de inmediato en el enlace del cliente.</strong>' : '') + '</p>' +
                    '<span class="gp-msg" id="gp-fix-msg" role="status" aria-live="polite" style="grid-column:1/-1"></span>' +
                '</div>' +
            '</div>';

        pintarPreview();
        if (ocupado) msg('gp-fix-msg', corrigiendo ? 'Aplicando la corrección… (30 a 90 segundos)' : 'Guardando…', 'info');
        $('gp-close').addEventListener('click', cerrarEditor);
        $('gp-pub').addEventListener('click', function () { publicar(p.id, publica ? 'borrador' : 'publicada'); });
        $('gp-del').addEventListener('click', function () { eliminar(p.id); });
        $('gp-copy').addEventListener('click', function () {
            var url = urlPublica(p.slug);
            var done = function () { msg('gp-fix-msg', 'Enlace copiado: ' + url + (publica ? '' : ' (aún es borrador: publícala para que el cliente pueda abrirla).'), publica ? 'ok' : 'info'); };
            var falla = function () { msg('gp-fix-msg', 'No se pudo copiar automáticamente. Copia el enlace a mano: ' + url, 'err'); };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, falla); else falla();
        });
        $('gp-fix').addEventListener('click', corregir);
        var undo = $('gp-undo');
        if (undo) undo.addEventListener('click', deshacer);
        root.querySelectorAll('[data-size]').forEach(function (b) {
            b.addEventListener('click', function () {
                vistaMovil = b.getAttribute('data-size') === 'movil';
                $('gp-frame-wrap').classList.toggle('movil', vistaMovil);
                root.querySelectorAll('[data-size]').forEach(function (x) { x.classList.toggle('on', x === b); });
            });
        });
    }

    function pintarPreview() {
        var frame = $('gp-frame');
        if (!frame || !editando || !window.MotorProposal) return;
        try {
            frame.srcdoc = MotorProposal.documento(editando.contenido, { base: window.location.origin });
        } catch (e) {
            if (window.console) console.error('[propuestas] vista previa:', e);
        }
        // Avisos de la plantilla (bloques desconocidos, títulos largos, conteos raros):
        // se arreglan pidiendo una corrección.
        var warn = $('gp-warn');
        if (!warn || typeof MotorProposal.validar !== 'function') return;
        var v = MotorProposal.validar(editando.contenido);
        var items = v.errores.concat(v.avisos);
        warn.innerHTML = items.length
            ? '<div class="gp-warnbox"><p class="gp-warnbox-t"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i> ' +
              (items.length === 1 ? 'Un detalle para revisar' : items.length + ' detalles para revisar') + '</p><ul>' +
              items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>'
            : '';
    }

    function abrirEditor(id) {
        var p = filaPorId(id);
        if (!p) return;
        // Ya abierta y sin operación en curso: solo se lleva la vista hasta ella (no se
        // repinta, para no borrar la corrección que se esté escribiendo).
        var yaAbierta = !!(editando && editando.id === id && !(pendiente && pendiente.id === id));
        editando = p;
        if (!yaAbierta) renderEditor();
        var el = $('gp-editor');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function cerrarEditor() { editando = null; renderEditor(); }

    function corregir() {
        var p = editando;
        var instr = val('gp-instr');
        if (!p) return;
        if (instr.length < 3) { msg('gp-fix-msg', 'Escribe qué quieres corregir.', 'err'); $('gp-instr').focus(); return; }
        if (pendiente) { msg('gp-fix-msg', 'Espera a que termine la operación en curso.', 'err'); return; }
        var previo = JSON.parse(JSON.stringify(p.contenido));
        pendiente = { id: p.id, tipo: 'corregir', instruccion: instr };
        renderEditor();   // editor bloqueado con el aviso "Aplicando…" (sobrevive a cualquier repintado)
        // Libera el editor; si la corrección falló, conserva la instrucción para reintentar.
        var fin = function (conservarInstr) {
            pendiente = null;
            if (editando && editando.id === p.id) {
                renderEditor();
                if (conservarInstr && $('gp-instr')) $('gp-instr').value = instr;
            }
        };
        db().functions.invoke('generate-proposal', { body: { modo: 'corregir', propuesta_id: p.id, instruccion: instr } }).then(function (res) {
            if (res.error) {
                fin(true);
                errorDe(res, 'No se pudo aplicar la corrección. Intenta de nuevo.').then(function (t) { if (editando && editando.id === p.id) msg('gp-fix-msg', t, 'err'); });
                return;
            }
            var data = res.data || {};
            if (!data.contenido) { fin(true); msg('gp-fix-msg', 'La función no devolvió la propuesta corregida.', 'err'); return; }
            anterior = { id: p.id, contenido: previo, instruccion: instr };
            // El resultado se muestra ya: la corrección quedó guardada aunque falle la recarga.
            p.contenido = data.contenido;
            if (editando && editando.id === p.id) editando = p;
            fin(false);
            recargar('gp-fix-msg', function () {
                cfg.onChange();
                if (editando && editando.id === p.id) {
                    editando = filaPorId(p.id) || editando;
                    renderEditor();
                    msg('gp-fix-msg', 'Corrección aplicada' + (editando.estado === 'publicada' ? ' y ya visible en el enlace del cliente.' : '.'), 'ok');
                }
            });
        }, function (e) {
            fin(true);
            msg('gp-fix-msg', 'No se pudo aplicar la corrección (' + (e && e.message ? e.message : 'sin conexión') + ').', 'err');
        });
    }

    function deshacer() {
        var p = editando;
        if (!p || !anterior || anterior.id !== p.id) return;
        if (pendiente) { msg('gp-fix-msg', 'Espera a que termine la operación en curso.', 'err'); return; }
        var restaurar = anterior.contenido;
        pendiente = { id: p.id, tipo: 'deshacer' };
        renderEditor();
        db().rpc('guardar_propuesta', { p_id: p.id, p_contenido: restaurar, p_cambio: 'Deshacer: ' + anterior.instruccion }).then(function (r) {
            pendiente = null;
            if (r.error) { if (editando && editando.id === p.id) renderEditor(); msg('gp-fix-msg', 'No se pudo deshacer: ' + r.error.message, 'err'); return; }
            anterior = null;
            p.contenido = restaurar;
            if (editando && editando.id === p.id) { editando = p; renderEditor(); }
            recargar('gp-fix-msg', function () {
                cfg.onChange();
                if (editando && editando.id === p.id) {
                    editando = filaPorId(p.id) || editando;
                    renderEditor();
                    msg('gp-fix-msg', 'Se restauró la versión anterior a la última corrección.', 'ok');
                }
            });
        });
    }

    function publicar(id, estado) {
        var p = filaPorId(id);
        if (!p) return;
        if (pendiente && pendiente.id === id) { msg('gp-fix-msg', 'Espera a que termine la corrección en curso.', 'err'); return; }
        if (estado === 'publicada' && !confirm('¿Publicar la propuesta de «' + p.cliente + '»? Quien tenga el enlace podrá verla.')) return;
        return db().from('propuestas').update({ estado: estado }).eq('id', id).then(function (r) {
            if (r.error) { alert('No se pudo cambiar el estado: ' + r.error.message); return; }
            p.estado = estado;
            if (editando && editando.id === id) renderEditor();
            return recargar('gp-fix-msg', function () {
                cfg.onChange();
                if (editando && editando.id === id) { editando = filaPorId(id); renderEditor(); msg('gp-fix-msg', estado === 'publicada' ? 'Publicada. Ya puedes enviar el enlace al cliente.' : 'Despublicada: el enlace ya no muestra la propuesta.', 'ok'); }
            });
        });
    }

    function eliminar(id) {
        var p = filaPorId(id);
        if (!p) return;
        if (pendiente && pendiente.id === id) { msg('gp-fix-msg', 'Espera a que termine la corrección en curso.', 'err'); return; }
        if (!confirm('¿Eliminar la propuesta de «' + p.cliente + '» y todas sus versiones? No se puede deshacer.')) return;
        return db().from('propuestas').delete().eq('id', id).then(function (r) {
            if (r.error) { alert('No se pudo eliminar: ' + r.error.message); return; }
            if (editando && editando.id === id) cerrarEditor();
            filas = filas.filter(function (x) { return x.id !== id; });
            cfg.onChange();
            return recargar('gp-msg', function () { cfg.onChange(); refrescarReferencias(); });
        });
    }

    /* ---------- Init ---------- */

    function init(opts) {
        cfg.root = opts.root;
        cfg.editorRoot = opts.editorRoot;
        cfg.catalogo = opts.catalogo || [];
        cfg.onChange = typeof opts.onChange === 'function' ? opts.onChange : function () {};
        renderForm();
        cfg.root.addEventListener('click', function (e) {
            var a = e.target && e.target.closest ? e.target.closest('[data-gp-abrir]') : null;
            if (!a) return;
            e.preventDefault();
            abrirEditor(a.getAttribute('data-gp-abrir'));
        });
        // Enlace directo: /paginas/gestion/#nueva-propuesta abre el generador.
        if (window.location.hash === '#nueva-propuesta') {
            $('gp-card').open = true;
            setTimeout(function () { $('gp-card').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
        }
    }

    window.MotorPropuestasUI = {
        init: init, cargar: cargar, paraListado: paraListado, abrirEditor: abrirEditor,
        publicar: publicar, eliminar: eliminar, refrescarReferencias: refrescarReferencias,
        filas: function () { return filas; }, version: '1.1'
    };
})();
