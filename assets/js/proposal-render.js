/* ============================================================================
   Propuestas Motor — renderer compartido (v1.0)
   ----------------------------------------------------------------------------
   Convierte el JSON de una propuesta (lo que genera la IA y se guarda en
   public.propuestas.contenido) en la página de propuesta de la casa: misma
   estructura y mismas clases que las propuestas hechas a mano (hero MOTOR ×
   CLIENTE, secciones numeradas, requerimientos, condiciones, cierre, pie).
   Estilos: /assets/css/proposal.css. Lo usan la página pública
   /paginas/propuesta/ y la vista previa de Gestión.

   MotorProposal.render(contenedor, contenido, opciones)
       Pinta la propuesta dentro de `contenedor` (normalmente document.body).
       opciones.titulo = true  → también pone document.title.
   MotorProposal.documento(contenido, opciones)
       Devuelve la página completa como texto HTML (para un iframe srcdoc).
       opciones.base = 'https://motoradvertising.co'  (origen de los assets)
   MotorProposal.normalizar(contenido)
       Rellena valores por defecto; lo usa render.

   Todo el texto se escapa. Dentro de los textos se admiten solo dos marcas:
   **negrita** y *énfasis*. Nada más del JSON llega al HTML sin escapar.

   Forma del contenido (resumen; el detalle está en
   supabase/functions/generate-proposal/PROMPT.md):
     idioma, titulo_pagina, cliente, marca, eyebrow, intro, cifras[],
     secciones[] { etiqueta, titulo, titulo_outline, intro, fondo, bloques[] },
     requerimientos { titulo, titulo_outline, items[] },
     condiciones { titulo, titulo_outline, items[] },
     cierre { lineas[3], texto, cta }, pie { copyright, lema }
   Tipos de bloque: estrategia, pilares, parrafos, servicios, chips, precios,
   total, addon, niveles, tabla, resumen, lista, nota.
   ============================================================================ */
(function () {
    'use strict';

    var CSS_VERSION = '1.1';
    var WA_PROPUESTAS = 'https://wa.link/x57gdn';
    var FONTS = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,300;0,600;0,700;0,800;0,900;1,300&family=DM+Sans:wght@300;400;500&display=swap';

    var TXT = {
        es: { reqs: 'Requerimientos Operativos', reqsT: 'Para', reqsO: 'arrancar.', cond: 'Condiciones', condT: 'Reglas del', condO: 'juego.',
              cierre: 'Cierre', cta: 'Aceptar propuesta', scroll: 'Scroll', conf: 'Confidencial', lema: 'Your brand. Our engine.' },
        en: { reqs: 'Operating Requirements', reqsT: 'What we need', reqsO: 'from you.', cond: 'Terms & Conditions', condT: 'Rules of', condO: 'the game.',
              cierre: 'Closing', cta: 'Accept proposal', scroll: 'Scroll', conf: 'Confidential', lema: 'Your brand. Our engine.' }
    };
    var LIMITES = { titulo: 28, titulo_outline: 24, marca: 18, service_titulo: 48, linea_cierre: 26 };

    /* ---------- Utilidades ---------- */

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }
    // Escapa y aplica las dos únicas marcas permitidas: **negrita** y *énfasis*.
    // El énfasis exige *texto* pegado (sin espacios en los bordes) para no
    // convertir asteriscos sueltos ("*Precio sujeto a TRM") en cursivas.
    function inline(s) {
        return esc(s)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/(^|[^*\w])\*([^*\s][^*\n]{0,78}?[^*\s]|[^*\s])\*(?![*\w])/g, '$1<em>$2</em>');
    }
    function str(v, def) { return typeof v === 'string' ? v : (v == null ? (def || '') : String(v)); }
    // Un ícono es un emoji corto; un texto largo no se pinta a 22px como si lo fuera.
    function emoji(v) {
        var s = str(v).trim();
        return s.length > 0 && s.length <= 10 && !/[A-Za-z0-9]{3,}/.test(s) ? esc(s) : '';
    }
    function arr(v) { return Array.isArray(v) ? v : []; }
    function obj(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
    function pad2(n) { return (n < 10 ? '0' : '') + n; }
    function safeUrl(u) {
        u = str(u).trim();
        return /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : '';
    }
    // Título de sección en dos líneas: la segunda en contorno.
    function titulo2(t, o, extraClass) {
        var html = inline(t);
        if (str(o)) html += '<br><span class="outline">' + inline(o) + '</span>';
        return '<h2 class="section-title reveal' + (extraClass ? ' ' + extraClass : '') + '">' + html + '</h2>';
    }
    function cell(c) {
        if (c && typeof c === 'object') {
            return inline(c.valor) + (str(c.sub) ? '<small>' + inline(c.sub) + '</small>' : '');
        }
        return inline(c);
    }

    /* ---------- Bloques ---------- */

    var BLOQUES = {
        // Lead grande a la izquierda, párrafos a la derecha (01 Enfoque).
        estrategia: function (b) {
            var ps = arr(b.parrafos).map(function (p) { return '<p>' + inline(p) + '</p>'; }).join('');
            return '<div class="strategy-grid">' +
                '<div class="strategy-lead reveal">' + inline(b.lead) + '</div>' +
                '<div class="strategy-right reveal">' + ps + '</div>' +
            '</div>';
        },
        // Cuadrícula de pilares con ícono, título y texto.
        pilares: function (b) {
            var items = arr(b.items);
            var cols = b.columnas === 4 ? ' cols-4' : (b.columnas === 3 || (items.length % 3 === 0 && items.length !== 4 && b.columnas !== 2)) ? ' cols-3' : '';
            return '<div class="pillars reveal' + cols + '">' + items.map(function (it) {
                it = obj(it);
                return '<div class="pillar">' +
                    (emoji(it.icono) ? '<div class="pillar-icon">' + emoji(it.icono) + '</div>' : '') +
                    '<h4>' + inline(it.titulo) + '</h4>' +
                    '<p>' + inline(it.texto) + '</p>' +
                '</div>';
            }).join('') + '</div>';
        },
        // Párrafos sueltos (intro de una parte).
        parrafos: function (b) {
            return arr(b.items).map(function (p, i) {
                return '<p class="part-intro reveal' + (i === 0 && b.separado ? ' spaced' : '') + '">' + inline(p) + '</p>';
            }).join('');
        },
        // Lista numerada de servicios con etiquetas y detalles con flecha.
        servicios: function (b) {
            return '<div class="services-list">' + arr(b.items).map(function (it, i) {
                it = obj(it);
                var tags = arr(it.tags).map(function (t) { return '<span class="tag">' + inline(t) + '</span>'; }).join('');
                var dets = arr(it.detalles).map(function (d) { return '<li>' + inline(d) + '</li>'; }).join('');
                return '<div class="service-item reveal">' +
                    '<div class="service-num">' + pad2(i + 1) + '</div>' +
                    '<div class="service-body">' +
                        '<div class="service-title">' + inline(it.titulo) + '</div>' +
                        (tags ? '<div class="service-tags">' + tags + '</div>' : '') +
                        (dets ? '<ul class="service-details">' + dets + '</ul>' : '') +
                    '</div>' +
                    '<div class="service-expand">↗</div>' +
                '</div>';
            }).join('') + '</div>';
        },
        // Cuadrícula de chips numerados (p. ej. las 9 especialidades) o flujo con flechas.
        chips: function (b) {
            if (b.variante === 'flujo') {
                return (str(b.titulo) ? '<p class="esp-head reveal">' + inline(b.titulo) + '</p>' : '') +
                    '<div class="flow reveal">' + arr(b.items).map(function (it, i) {
                        if (typeof it === 'string') it = { nombre: it };
                        it = obj(it);
                        return (i ? '<span class="flow-sep" aria-hidden="true">→</span>' : '') +
                            '<span class="flow-chip">' + (emoji(it.icono) ? '<span class="flow-ico">' + emoji(it.icono) + '</span>' : '') + inline(it.nombre) + '</span>';
                    }).join('') + '</div>';
            }
            return (str(b.titulo) ? '<p class="esp-head reveal">' + inline(b.titulo) + '</p>' : '') +
                '<div class="esp-grid reveal">' + arr(b.items).map(function (it, i) {
                    if (typeof it === 'string') it = { nombre: it };
                    it = obj(it);
                    return '<div class="esp-item">' +
                        '<span class="esp-num">' + pad2(i + 1) + '</span>' +
                        (emoji(it.icono) ? '<span class="esp-icon">' + emoji(it.icono) + '</span>' : '') +
                        '<span class="esp-name">' + inline(it.nombre) + '</span>' +
                    '</div>';
                }).join('') + '</div>';
        },
        // Una, dos o tres cajas de precio.
        precios: function (b) {
            var items = arr(b.items);
            var cls = items.length === 1 ? ' single' : items.length >= 3 ? ' triple' : '';
            if (b.pegado) cls += ' tight';
            return '<div class="part-price reveal' + cls + '">' + items.slice(0, 3).map(function (it) {
                it = obj(it);
                var marca = str(it.marca).slice(0, 6);
                return '<div class="price-box' + (it.suave ? ' soft' : '') + '"' + (marca ? ' data-marca="' + esc(marca) + '"' : '') + '>' +
                    '<p class="pb-label">' + inline(it.etiqueta) + '</p>' +
                    (str(it.antes) ? '<div class="pb-old">' + inline(it.antes) + '</div>' : '') +
                    '<div class="pb-amount">' + inline(it.valor) + '</div>' +
                    (str(it.unidad) ? '<p class="pb-currency">' + inline(it.unidad) + '</p>' : '') +
                    (str(it.nota) ? '<p class="pb-note">' + inline(it.nota) + '</p>' : '') +
                '</div>';
            }).join('') + '</div>';
        },
        // Barra de total.
        total: function (b) {
            return '<div class="total-bar reveal">' +
                '<span>' + inline(b.etiqueta) + '</span>' +
                '<strong>' + inline(b.valor) + (str(b.nota) ? ' <small>' + inline(b.nota) + '</small>' : '') + '</strong>' +
            '</div>';
        },
        // Opcional / add-on: caja grande con precio + caja de detalle (lista o filas).
        addon: function (b) {
            var det = obj(b.detalle);
            var right = '';
            if (arr(det.filas).length) {
                right = arr(det.filas).map(function (f) {
                    f = obj(f);
                    return '<div class="addon-row">' +
                        '<div><div class="ar-nivel">' + inline(f.titulo) + '</div>' +
                        (str(f.detalle) ? '<div class="ar-detalle">' + inline(f.detalle) + '</div>' : '') + '</div>' +
                        '<div class="ar-precio">' + inline(f.valor) + (str(f.nota) ? ' <small>' + inline(f.nota) + '</small>' : '') + '</div>' +
                    '</div>';
                }).join('');
            } else {
                right = '<ul>' + arr(det.lista).map(function (l) { return '<li>' + inline(l) + '</li>'; }).join('') + '</ul>';
            }
            return '<div class="addon-layout">' +
                '<div class="addon-main reveal" data-marca="' + esc(str(b.marca, '★').slice(0, 6)) + '">' +
                    '<p class="addon-label">' + inline(b.etiqueta) + '</p>' +
                    '<div class="addon-amount">' + inline(b.valor) + '</div>' +
                    (str(b.unidad) ? '<div class="addon-currency">' + inline(b.unidad) + '</div>' : '') +
                    '<div class="addon-note">' + inline(b.texto) + '</div>' +
                '</div>' +
                '<div class="addon-scale reveal">' +
                    (str(det.titulo) ? '<h4>' + inline(det.titulo) + '</h4>' : '') +
                    right +
                    (str(b.aclaracion) ? '<div class="clarification"><p>' + inline(b.aclaracion) + '</p></div>' : '') +
                '</div>' +
            '</div>';
        },
        // Niveles / planes lado a lado + barra explicativa.
        niveles: function (b) {
            var items = arr(b.items).slice(0, 4);
            var cols = items.length === 2 ? ' cols-2' : items.length === 4 ? ' cols-4' : '';
            var exp = obj(b.explicacion);
            return (str(b.nota) ? '<p class="trm-note reveal">' + inline(b.nota) + '</p>' : '') +
                '<div class="levels' + cols + '">' + items.map(function (it, i) {
                    it = obj(it);
                    var destacado = it.destacado === 'top' || it.destacado === true ? ' top' : it.destacado === 'mid' ? ' mid' : '';
                    return '<div class="level reveal' + destacado + '">' +
                        '<div class="level-num">' + pad2(i + 1) + '</div>' +
                        '<p class="level-name">' + inline(it.nombre) + '</p>' +
                        '<h3 class="level-title">' + inline(it.titulo) + '</h3>' +
                        '<div class="level-fee">' + inline(it.valor) + (str(it.unidad) ? ' <small>' + inline(it.unidad) + '</small>' : '') + '</div>' +
                        (str(it.sub) ? '<p class="level-fee-cop">' + inline(it.sub) + '</p>' : '') +
                        '<ul class="level-list">' + arr(it.lista).map(function (l) { return '<li>' + inline(l) + '</li>'; }).join('') + '</ul>' +
                        (str(it.disparador) ? '<div class="level-trigger">' + inline(it.disparador) + '</div>' : '') +
                    '</div>';
                }).join('') + '</div>' +
                (str(exp.texto) ? '<div class="escala-bar reveal"><div>' +
                    (str(exp.titulo) ? '<h5>' + inline(exp.titulo) + '</h5>' : '') +
                    '<p>' + inline(exp.texto) + '</p></div></div>' : '');
        },
        // Tabla de precios con fila de total opcional.
        tabla: function (b) {
            var cols = arr(b.columnas);
            var head = cols.length ? '<thead><tr>' + cols.map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') + '</tr></thead>' : '';
            var rows = arr(b.filas).map(function (f) {
                return '<tr>' + arr(f).map(function (c) { return '<td>' + cell(c) + '</td>'; }).join('') + '</tr>';
            }).join('');
            var tot = arr(b.total).length ? '<tr class="is-total">' + arr(b.total).map(function (c) { return '<td>' + cell(c) + '</td>'; }).join('') + '</tr>' : '';
            return (str(b.nota) ? '<p class="trm-note reveal">' + inline(b.nota) + '</p>' : '') +
                '<div class="ptable-wrap reveal"><table class="ptable">' + head + '<tbody>' + rows + tot + '</tbody></table></div>' +
                (str(b.pie) ? '<p class="resumen-note reveal">' + inline(b.pie) + '</p>' : '');
        },
        // Resumen de inversión en filas (concepto · detalle · precio).
        resumen: function (b) {
            return '<div class="resumen-box reveal">' + arr(b.filas).map(function (f) {
                f = obj(f);
                return '<div class="resumen-row">' +
                    '<div><div class="rr-item">' + inline(f.item) + '</div>' +
                    (str(f.detalle) ? '<div class="rr-detalle">' + inline(f.detalle) + '</div>' : '') + '</div>' +
                    '<div class="rr-precio">' + inline(f.valor) + (str(f.nota) ? ' <small>' + inline(f.nota) + '</small>' : '') + '</div>' +
                '</div>';
            }).join('') +
            (str(b.aclaracion) ? '<div class="clarification"><p>' + inline(b.aclaracion) + '</p></div>' : '') +
            '</div>';
        },
        // Lista en caja blanca (una o dos columnas).
        lista: function (b) {
            return '<div class="list-box reveal' + (b.columnas === 2 ? ' cols-2' : '') + '">' +
                (str(b.titulo) ? '<h4>' + inline(b.titulo) + '</h4>' : '') +
                '<ul>' + arr(b.items).map(function (l) { return '<li>' + inline(l) + '</li>'; }).join('') + '</ul>' +
            '</div>';
        },
        // Pasos / fases: hasta 4 como tarjetas con número grande; más, como ruta en filas.
        pasos: function (b) {
            var items = arr(b.items).slice(0, 12);
            if (items.length > 4) {
                return '<div class="steps reveal">' + items.map(function (it, i) {
                    it = obj(it);
                    return '<div class="step' + (it.hito ? ' milestone' : '') + '">' +
                        '<div class="step-num">' + (str(it.num) ? esc(str(it.num).slice(0, 12)) : pad2(i + 1)) + '</div>' +
                        '<div><h4>' + (it.hito && emoji(it.icono) ? emoji(it.icono) + ' ' : '') + inline(it.titulo) + '</h4><p>' + inline(it.texto) + '</p></div>' +
                    '</div>';
                }).join('') + '</div>';
            }
            var cols = items.length === 2 ? ' cols-2' : items.length === 4 ? ' cols-4' : '';
            return '<div class="reqs-grid reveal' + cols + '">' + items.map(function (it, i) {
                it = obj(it);
                return '<div class="req-card' + (it.hito ? ' hito' : '') + '"><div class="req-num">' + (str(it.num) ? esc(it.num) : pad2(i + 1)) + '</div>' +
                    '<h4>' + inline(it.titulo) + '</h4><p>' + inline(it.texto) + '</p></div>';
            }).join('') + '</div>';
        },
        // Cifras grandes (plazos, garantía, cantidades): 2 a 4 tarjetas.
        cifras: function (b) {
            var items = arr(b.items).slice(0, 4);
            var cols = items.length === 2 ? ' cols-2' : items.length === 4 ? ' cols-4' : '';
            return '<div class="reqs-grid cifras-grid reveal' + cols + '">' + items.map(function (it) {
                it = obj(it);
                return '<div class="req-card"><div class="req-num">' + inline(it.cifra) + '</div>' +
                    '<h4>' + inline(it.titulo) + '</h4><p>' + inline(it.texto) + '</p></div>';
            }).join('') + '</div>';
        },
        // Qué incluye / qué no incluye, lado a lado.
        alcance: function (b) {
            var inc = obj(b.incluye), exc = obj(b.excluye);
            var excItems = arr(exc.items);
            return '<div class="alcance-grid reveal">' +
                '<div class="list-box"><h4>' + inline(str(inc.titulo, 'Incluye')) + '</h4>' +
                    '<ul>' + arr(inc.items).map(function (l) { return '<li>' + inline(l) + '</li>'; }).join('') + '</ul></div>' +
                '<div class="excl-box"><h4>' + inline(str(exc.titulo, 'No incluye')) + '</h4>' +
                    (excItems.length ? '<ul>' + excItems.map(function (l) { return '<li>' + inline(l) + '</li>'; }).join('') + '</ul>' : '<p>' + inline(exc.texto) + '</p>') +
                '</div>' +
            '</div>';
        },
        // Aclaración suelta con "!" o, con etiqueta, cajita blanca.
        nota: function (b) {
            if (str(b.etiqueta)) {
                return '<div class="note-box reveal"><p class="pb-label">' + inline(b.etiqueta) + '</p><p>' + inline(b.texto) + '</p></div>';
            }
            return '<div class="clarification loose reveal"><p>' + inline(b.texto) + '</p></div>';
        }
    };

    /* ---------- Normalización ---------- */

    function normalizar(c) {
        c = obj(c);
        var idioma = c.idioma === 'en' ? 'en' : 'es';
        var t = TXT[idioma];
        var cliente = str(c.cliente, 'Cliente');
        var secciones = arr(c.secciones).map(function (s) {
            s = obj(s);
            return {
                etiqueta: str(s.etiqueta), titulo: str(s.titulo), titulo_outline: str(s.titulo_outline),
                intro: str(s.intro), fondo: s.fondo === 'beige' || s.fondo === 'crema' ? s.fondo : '',
                bloques: arr(s.bloques).map(obj).filter(function (b) { return esBloque(str(b.tipo)); })
            };
        });
        var reqs = obj(c.requerimientos);
        var cond = obj(c.condiciones);
        var cierre = obj(c.cierre);
        var pie = obj(c.pie);
        var lineas = arr(cierre.lineas).map(function (l) { return str(l); }).filter(Boolean).slice(0, 3);
        return {
            idioma: idioma,
            titulo_pagina: str(c.titulo_pagina) || (idioma === 'en' ? 'Proposal · Motor Advertising × ' : 'Propuesta · Motor Advertising × ') + cliente,
            cliente: cliente,
            marca: str(c.marca) || cliente,
            eyebrow: str(c.eyebrow),
            intro: str(c.intro),
            cifras: arr(c.cifras).map(obj).filter(function (x) { return str(x.valor); }).slice(0, 3),
            secciones: secciones,
            requerimientos: { etiqueta: str(reqs.etiqueta) || t.reqs, titulo: str(reqs.titulo) || t.reqsT, titulo_outline: str(reqs.titulo_outline) || t.reqsO,
                              items: arr(reqs.items).map(obj).filter(function (x) { return str(x.titulo) || str(x.texto); }) },
            condiciones: { etiqueta: str(cond.etiqueta) || t.cond, titulo: str(cond.titulo) || t.condT, titulo_outline: str(cond.titulo_outline) || t.condO,
                           items: arr(cond.items).map(obj).filter(function (x) { return str(x.titulo) || str(x.texto); }) },
            cierre: { etiqueta: str(cierre.etiqueta) || t.cierre, lineas: lineas, texto: str(cierre.texto), cta: str(cierre.cta) || t.cta,
                      enlace: safeUrl(cierre.enlace) || WA_PROPUESTAS },
            pie: { copyright: str(pie.copyright) || ('© ' + new Date().getFullYear() + ' Motor Advertising · ' + t.conf), lema: str(pie.lema) || t.lema },
            _t: t
        };
    }

    /* ---------- Render ---------- */

    function hero(c) {
        var cifras = c.cifras.map(function (x) {
            return '<div class="hero-badge"><strong>' + inline(x.valor) + '</strong><small>' + inline(x.nota) + '</small></div>';
        }).join('');
        return '<section class="hero">' +
            '<div class="hero-grid-lines"></div><div class="hero-glow"></div>' +
            (c.eyebrow ? '<p class="hero-eyebrow">' + inline(c.eyebrow) + '</p>' : '') +
            '<h1 class="hero-x' + (marcaLarga(c.marca) ? ' long' : '') + '"><span class="stroke">MOTOR</span><br><span>× ' + inline(c.marca) + '</span></h1>' +
            '<div class="hero-sub">' + (c.intro ? '<p>' + inline(c.intro) + '</p>' : '') + cifras + '</div>' +
            '<div class="scroll-hint"><span>' + c._t.scroll + '</span></div>' +
        '</section>';
    }

    // Solo los tipos propios de BLOQUES (no «constructor», «__proto__» ni otros heredados).
    function esBloque(t) {
        return Object.prototype.hasOwnProperty.call(BLOQUES, t) && typeof BLOQUES[t] === 'function';
    }
    // Marca larga, o con una palabra que no cabe en 320 px: letra menor.
    function marcaLarga(m) {
        return m.length > 14 || m.split(/\s+/).some(function (w) { return w.length > 11; });
    }

    function seccion(num, s, fondo) {
        var cuerpo = s.bloques.map(function (b) { return BLOQUES[str(b.tipo)](b); }).join('');
        return '<div class="green-line"></div>' +
            '<section class="band-' + fondo + '">' +
                '<div class="section-label">' + pad2(num) + ' — ' + inline(s.etiqueta) + '</div>' +
                titulo2(s.titulo, s.titulo_outline) +
                (s.intro ? '<p class="part-intro reveal">' + inline(s.intro) + '</p>' : '') +
                cuerpo +
            '</section>';
    }

    function requerimientos(num, r, fondo) {
        if (!r.items.length) return '';
        var cols = r.items.length === 2 ? ' cols-2' : r.items.length >= 4 ? ' cols-4' : '';
        return '<div class="green-line"></div>' +
            '<section class="band-' + fondo + '">' +
                '<div class="section-label">' + pad2(num) + ' — ' + inline(r.etiqueta) + '</div>' +
                titulo2(r.titulo, r.titulo_outline) +
                '<div class="reqs-grid reveal' + cols + '">' + r.items.slice(0, 4).map(function (it, i) {
                    return '<div class="req-card"><div class="req-num">' + pad2(i + 1) + '</div>' +
                        '<h4>' + inline(it.titulo) + '</h4><p>' + inline(it.texto) + '</p></div>';
                }).join('') + '</div>' +
            '</section>';
    }

    function condiciones(num, cd, fondo) {
        if (!cd.items.length) return '';
        return '<div class="green-line"></div>' +
            '<section class="band-' + fondo + '">' +
                '<div class="section-label">' + pad2(num) + ' — ' + inline(cd.etiqueta) + '</div>' +
                titulo2(cd.titulo, cd.titulo_outline) +
                '<div class="cond-grid reveal">' + cd.items.map(function (it) {
                    return '<div class="cond-item">' +
                        (emoji(it.icono) ? '<div class="cond-icon">' + emoji(it.icono) + '</div>' : '') +
                        '<div><h4>' + inline(it.titulo) + '</h4><p>' + inline(it.texto) + '</p></div>' +
                    '</div>';
                }).join('') + '</div>' +
            '</section>';
    }

    function cierre(num, c) {
        var l = c.cierre.lineas;
        var h2 = l.length ? l.map(function (x, i) {
            var cls = i === 1 ? ' class="green"' : i === 2 ? ' class="outline"' : '';
            return (cls ? '<span' + cls + '>' + inline(x) + '</span>' : inline(x));
        }).join('<br>') : inline(c.cliente);
        return '<div class="green-line"></div>' +
            '<section class="closing">' +
                '<div class="closing-glow"></div>' +
                '<div class="section-label">' + pad2(num) + ' — ' + inline(c.cierre.etiqueta) + '</div>' +
                '<h2 class="reveal">' + h2 + '</h2>' +
                (c.cierre.texto ? '<p class="reveal">' + inline(c.cierre.texto) + '</p>' : '') +
                '<a href="' + esc(c.cierre.enlace) + '" class="cta-btn reveal" target="_blank" rel="noopener">' + inline(c.cierre.cta) + ' ↗</a>' +
            '</section>';
    }

    function pie(c) {
        return '<footer><p>' + inline(c.pie.copyright) + '</p><p class="footer-logo">// MOTOR ADVERTISING</p><p>' + inline(c.pie.lema) + '</p></footer>';
    }

    function cuerpo(contenido) {
        var c = normalizar(contenido);
        var html = hero(c);
        var num = 0;
        // Fondos alternos (beige, crema, beige…) salvo que la sección fije el suyo.
        var fondo = 'beige';
        c.secciones.forEach(function (s) {
            var f = s.fondo || fondo;
            html += seccion(++num, s, f);
            fondo = f === 'beige' ? 'crema' : 'beige';
        });
        // Requerimientos y Condiciones siguen la misma alternancia (antes iban fijos
        // beige/crema y con un número impar de secciones quedaban dos beige seguidas).
        if (c.requerimientos.items.length) { html += requerimientos(++num, c.requerimientos, fondo); fondo = fondo === 'beige' ? 'crema' : 'beige'; }
        if (c.condiciones.items.length) { html += condiciones(++num, c.condiciones, fondo); fondo = fondo === 'beige' ? 'crema' : 'beige'; }
        html += cierre(++num, c) + pie(c);
        return { html: html, c: c };
    }

    function observar(root) {
        var els = root.querySelectorAll('.reveal');
        if (!('IntersectionObserver' in window)) {
            Array.prototype.forEach.call(els, function (el) { el.classList.add('visible'); });
            return;
        }
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
            });
        }, { threshold: 0.1 });
        Array.prototype.forEach.call(els, function (el) { observer.observe(el); });
    }

    /* ---------- Validación (avisos para la vista previa de Gestión) ---------- */

    // Revisa el contenido tal como lo entregó la IA y devuelve { errores, avisos }.
    // Los errores impiden pintar algo útil; los avisos son cosas que se verán
    // raras (bloques desconocidos que se omiten, títulos largos, conteos impares).
    function validar(contenido) {
        var errores = [], avisos = [];
        var c = obj(contenido);
        if (!str(c.cliente)) errores.push('Falta el nombre del cliente.');
        if (!arr(c.secciones).length) errores.push('La propuesta no tiene secciones.');
        if (str(c.marca).length > LIMITES.marca) avisos.push('El nombre del titular («' + str(c.marca) + '») es largo: se verá en letra más pequeña. Ideal, hasta ' + LIMITES.marca + ' caracteres.');
        if (arr(c.cifras).length > 3) avisos.push('Hay más de 3 cifras en el encabezado; solo se muestran 3.');
        var fijas = /^(requerimientos|condiciones|cierre|operating requirements|terms|closing)/i;
        arr(c.secciones).forEach(function (s, i) {
            s = obj(s);
            var n = 'Sección ' + pad2(i + 1) + (str(s.etiqueta) ? ' (' + str(s.etiqueta) + ')' : '');
            if (!str(s.titulo) || !str(s.titulo_outline)) avisos.push(n + ': el título debe tener dos líneas (titulo y titulo_outline).');
            if (str(s.titulo).length > LIMITES.titulo || str(s.titulo_outline).length > LIMITES.titulo_outline) avisos.push(n + ': título largo para la plantilla (líneas de hasta ' + LIMITES.titulo + ' y ' + LIMITES.titulo_outline + ' caracteres).');
            if (fijas.test(str(s.etiqueta))) avisos.push(n + ': los requerimientos, las condiciones y el cierre van en sus campos propios; esta sección se verá duplicada.');
            var bloques = arr(s.bloques).map(obj);
            if (!bloques.length) avisos.push(n + ': no tiene bloques.');
            if (bloques.length > 4) avisos.push(n + ': tiene ' + bloques.length + ' bloques; la plantilla se ve mejor con 1 a 4.');
            bloques.forEach(function (b) {
                var t = str(b.tipo);
                if (!esBloque(t)) { avisos.push(n + ': el bloque «' + (t || 'sin tipo') + '» no existe y se omite.'); return; }
                if (t === 'pasos') arr(b.items).forEach(function (it) { if (str(obj(it).num).length > 8) avisos.push(n + ': el paso «' + str(obj(it).titulo).slice(0, 30) + '» lleva una etiqueta muy larga en «num» («' + str(obj(it).num) + '»); usa códigos cortos como 01 o Mes 1.'); });
                if (t === 'pilares' && [3, 4, 6].indexOf(arr(b.items).length) === -1) avisos.push(n + ': los pilares se ven mejor en 3, 4 o 6 (hay ' + arr(b.items).length + ').');
                if (t === 'precios' && arr(b.items).length > 3) avisos.push(n + ': hay más de 3 cajas de precio; solo se muestran 3.');
                if (t === 'niveles' && arr(b.items).length > 4) avisos.push(n + ': hay más de 4 niveles; solo se muestran 4.');
                if (t === 'tabla' && arr(b.columnas).length > 5) avisos.push(n + ': la tabla tiene más de 5 columnas y se desbordará en celular.');
                if (t === 'servicios') arr(b.items).forEach(function (it) { if (str(obj(it).titulo).length > LIMITES.service_titulo) avisos.push(n + ': el servicio «' + str(obj(it).titulo).slice(0, 30) + '…» tiene un título muy largo.'); });
            });
        });
        var nr = arr(obj(c.requerimientos).items).length;
        if (nr === 1 || nr > 4) avisos.push('Requerimientos: se ven mejor 2 a 4 tarjetas (hay ' + nr + ').');
        var nc = arr(obj(c.condiciones).items).length;
        if (nc && (nc < 4 || nc > 6)) avisos.push('Condiciones: la plantilla usa de 4 a 6 (hay ' + nc + ').');
        var lineas = arr(obj(c.cierre).lineas);
        if (lineas.length !== 3) avisos.push('El cierre debe tener exactamente 3 líneas (hay ' + lineas.length + ').');
        lineas.forEach(function (l) { if (str(l).length > LIMITES.linea_cierre) avisos.push('Línea del cierre muy larga: «' + str(l) + '».'); });
        JSON.stringify(c, function (k, v) {
            if (typeof v === 'string' && /<[a-z!\/]/i.test(v) && avisos.indexOf('Hay texto con etiquetas HTML; se mostrará tal cual, escapado.') === -1) avisos.push('Hay texto con etiquetas HTML; se mostrará tal cual, escapado.');
            return v;
        });
        return { errores: errores, avisos: avisos };
    }

    function render(container, contenido, opts) {
        opts = opts || {};
        var r = cuerpo(contenido);
        container.innerHTML = r.html;
        if (opts.titulo !== false && container === document.body) document.title = r.c.titulo_pagina;
        document.documentElement.lang = r.c.idioma;
        observar(container);
        return r.c;
    }

    // Página completa (para iframes srcdoc o descargas).
    function documento(contenido, opts) {
        opts = opts || {};
        var base = str(opts.base, 'https://motoradvertising.co').replace(/\/+$/, '');
        var r = cuerpo(contenido);
        return '<!DOCTYPE html><html lang="' + r.c.idioma + '"><head><meta charset="UTF-8">' +
            '<meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="robots" content="noindex">' +
            '<title>' + esc(r.c.titulo_pagina) + '</title>' +
            '<link href="' + FONTS + '" rel="stylesheet">' +
            '<link rel="stylesheet" href="' + base + '/assets/css/proposal.css?v=' + CSS_VERSION + '">' +
            '<noscript><style>.reveal{opacity:1;transform:none}</style></noscript>' +
            '</head><body>' + r.html +
            '<script>(function(){var els=document.querySelectorAll(".reveal");if(!("IntersectionObserver" in window)){for(var i=0;i<els.length;i++)els[i].classList.add("visible");return;}' +
            'var o=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)e.target.classList.add("visible");});},{threshold:0.1});' +
            'for(var j=0;j<els.length;j++)o.observe(els[j]);})();<\/script></body></html>';
    }

    window.MotorProposal = { render: render, documento: documento, normalizar: normalizar, validar: validar, BLOQUES: Object.keys(BLOQUES), version: '1.1' };
})();
