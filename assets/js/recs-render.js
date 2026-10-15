/* ============================================================================
   Recomendaciones de Motor — renderer compartido (v1.0)
   ----------------------------------------------------------------------------
   Lo usan el panel del cliente (/paginas/perfil/) y Gestión → Perfil de
   usuario (vista previa). Pinta una sección desplegable con una tarjeta
   desplegable por recomendación. Estilos en /assets/css/recs.css.

   MotorRecs.render(contenedor, filas, opciones)
     filas: filas de public.recomendaciones (ver supabase/setup-recommendations.sql)
     opciones.wa        enlace de WhatsApp para los botones
     opciones.estado    true = marca los borradores (vista de Gestión)
     opciones.abierta   true = la sección arranca desplegada
     opciones.hoy       Date para calcular cuentas regresivas (pruebas)

   Formato del campo "cuerpo" (una instrucción por línea):
     línea en blanco  → nuevo párrafo
     - texto          → viñeta
     1. Título: texto → paso de un proceso (el ícono sale de las palabras clave)
     > texto          → frase destacada
     ? texto          → pregunta para el cliente
     **texto**        → negrita
   ============================================================================ */
(function () {
    'use strict';

    var CATS = {
        atencion: { label: 'Atención al cliente', icon: 'fa-headset',   color: '#8fa8ff' },
        proceso:  { label: 'Proceso comercial',   icon: 'fa-route',     color: '#59a8c4' },
        campanas: { label: 'Campañas',            icon: 'fa-bullhorn',  color: '#ffce7a' },
        web:      { label: 'Sitio web',           icon: 'fa-globe',     color: '#7fd8a4' },
        canal:    { label: 'Nuevo canal',         icon: 'fa-rocket',    color: '#ff8fb1' },
        general:  { label: 'General',             icon: 'fa-lightbulb', color: '#c7ccd6' }
    };
    var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    var MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
    var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    var DIAS_INI = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    var DAY_MS = 86400000;
    var uid = 0;

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }
    // Escapa y luego aplica la única marca permitida: **negrita**.
    function inline(s) {
        return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    }
    function sinTildes(s) {
        return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    }

    /* ---------- Fechas y horas ---------- */

    function parseFecha(s) {
        var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
        return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
    }
    function soloDia(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
    function diasEntre(a, b) { return Math.round((soloDia(b) - soloDia(a)) / DAY_MS); }

    function rangoLargo(d1, d2) {
        if (!d2 || diasEntre(d1, d2) === 0) {
            return DIAS[d1.getDay()].charAt(0).toUpperCase() + DIAS[d1.getDay()].slice(1) + ' ' + d1.getDate() + ' de ' + MESES[d1.getMonth()];
        }
        var semana = d1.getDay() === 1 && diasEntre(d1, d2) >= 4 && diasEntre(d1, d2) <= 6;
        var pre = semana ? 'Semana del ' : 'Del ';
        if (d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear()) {
            return pre + d1.getDate() + ' al ' + d2.getDate() + ' de ' + MESES[d2.getMonth()];
        }
        return pre + d1.getDate() + ' de ' + MESES[d1.getMonth()] + ' al ' + d2.getDate() + ' de ' + MESES[d2.getMonth()];
    }
    function rangoCorto(d1, d2) {
        if (!d2 || diasEntre(d1, d2) === 0) return d1.getDate() + ' ' + MESES_CORTOS[d1.getMonth()];
        if (d1.getMonth() === d2.getMonth()) return d1.getDate() + '–' + d2.getDate() + ' ' + MESES_CORTOS[d2.getMonth()];
        return d1.getDate() + ' ' + MESES_CORTOS[d1.getMonth()] + ' – ' + d2.getDate() + ' ' + MESES_CORTOS[d2.getMonth()];
    }
    // Estado de un rango respecto a hoy: { futuro|curso|pasado, texto }
    function cuenta(d1, d2, hoy) {
        var fin = d2 || d1;
        var faltan = diasEntre(hoy, d1);
        if (faltan > 1) return { k: 'futuro', t: 'Empieza en ' + faltan + ' días' };
        if (faltan === 1) return { k: 'futuro', t: 'Empieza mañana' };
        if (faltan === 0) return { k: 'curso', t: 'Empieza hoy' };
        if (diasEntre(hoy, fin) >= 0) return { k: 'curso', t: 'En curso · hasta el ' + fin.getDate() + ' de ' + MESES[fin.getMonth()] };
        return { k: 'pasado', t: 'Fecha cumplida' };
    }

    function minutos(t) {
        var m = /^(\d{1,2}):(\d{2})/.exec(t || '');
        return m ? (+m[1]) * 60 + (+m[2]) : null;
    }
    function hora12(min) {
        var h = Math.floor(min / 60) % 24, mm = min % 60;
        var suf = h === 12 && mm === 0 ? 'm.' : (h < 12 ? 'a. m.' : 'p. m.');
        var h12 = h % 12 === 0 ? 12 : h % 12;
        return h12 + ':' + (mm < 10 ? '0' : '') + mm + ' ' + suf;
    }

    /* ---------- Cuerpo con formato sencillo ---------- */

    function iconoPaso(texto) {
        var t = sinTildes(texto);
        if (/whats/.test(t)) return 'fab fa-whatsapp';
        if (/videollamada|video ?llamada|camara/.test(t)) return 'fas fa-video';
        if (/correo|e-?mail|mail/.test(t)) return 'fas fa-envelope';
        if (/llamada|telefon/.test(t)) return 'fas fa-phone';
        if (/grab/.test(t)) return 'fas fa-clapperboard';
        if (/reunion|cita/.test(t)) return 'fas fa-people-group';
        if (/contrat|firma|cierre/.test(t)) return 'fas fa-file-signature';
        return '';
    }

    function cuerpo(txt) {
        var lines = String(txt || '').replace(/\r/g, '').split('\n');
        var out = [], para = [], list = [], steps = [], qs = [];
        function flushPara() { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } }
        function flushList() {
            if (list.length) {
                out.push('<ul class="rc-bullets">' + list.map(function (li) {
                    return '<li><i class="fas fa-check" aria-hidden="true"></i><span>' + inline(li) + '</span></li>';
                }).join('') + '</ul>');
                list = [];
            }
        }
        function flushSteps() {
            if (!steps.length) return;
            out.push('<ol class="rc-steps" style="--n:' + steps.length + '">' + steps.map(function (s, i) {
                var m = /^([^:]{2,48}):\s*(.+)$/.exec(s);
                var ttl = m ? m[1] : '', txt = m ? m[2] : s;
                if (ttl) txt = txt.charAt(0).toUpperCase() + txt.slice(1);   // "Título: se hace…" → "Se hace…"
                var ico = iconoPaso(ttl || txt);
                return '<li>' +
                    '<span class="rc-step-top">' +
                        '<span class="rc-step-ico" aria-hidden="true">' + (ico ? '<i class="' + ico + '"></i>' : (i + 1)) + '</span>' +
                        '<span class="rc-step-n">Paso ' + (i + 1) + '</span>' +
                    '</span>' +
                    (ttl ? '<strong>' + inline(ttl) + '</strong>' : '') +
                    '<span class="rc-step-t">' + inline(txt) + '</span>' +
                '</li>';
            }).join('') + '</ol>');
            steps = [];
        }
        function flushQs() {
            if (!qs.length) return;
            out.push('<div class="rc-qs"><span class="rc-qs-t"><i class="fas fa-circle-question" aria-hidden="true"></i> Preguntas para ustedes</span>' +
                '<ul>' + qs.map(function (q) { return '<li>' + inline(q) + '</li>'; }).join('') + '</ul></div>');
            qs = [];
        }
        function flushAll() { flushPara(); flushList(); flushSteps(); flushQs(); }

        lines.forEach(function (raw) {
            var line = raw.trim(), m;
            if (!line) { flushAll(); return; }
            if ((m = /^[-•]\s+(.+)$/.exec(line))) { flushPara(); flushSteps(); flushQs(); list.push(m[1]); return; }
            if ((m = /^\d{1,2}[.)]\s+(.+)$/.exec(line))) { flushPara(); flushList(); flushQs(); steps.push(m[1]); return; }
            if ((m = /^\?\s*(.+)$/.exec(line))) { flushPara(); flushList(); flushSteps(); qs.push(m[1]); return; }
            if ((m = /^>\s*(.+)$/.exec(line))) {
                flushAll();
                out.push('<blockquote class="rc-quote"><i class="fas fa-quote-left" aria-hidden="true"></i><span>' + inline(m[1]) + '</span></blockquote>');
                return;
            }
            flushList(); flushSteps(); flushQs();
            para.push(line);
        });
        flushAll();
        return out.join('');
    }

    /* ---------- Bloques visuales ---------- */

    // Las 24 horas del día con la franja recomendada resaltada.
    function franja(desde, hasta, hoy) {
        var a = minutos(desde), b = minutos(hasta);
        if (a == null || b == null || a === b) return '';
        var segs = b > a ? [[a, b]] : [[a, 1440], [0, b]];   // franja que cruza la medianoche
        var pct = function (m) { return (m / 1440 * 100).toFixed(3) + '%'; };
        var ahora = hoy.getHours() * 60 + hoy.getMinutes();
        var dentro = b > a ? (ahora >= a && ahora < b) : (ahora >= a || ahora < b);
        var noche = a >= 17 * 60 || a < 5 * 60;
        return '<div class="rc-day">' +
            '<div class="rc-day-head">' +
                '<span class="rc-day-lbl"><i class="fas ' + (noche ? 'fa-moon' : 'fa-clock') + '" aria-hidden="true"></i> Franja recomendada</span>' +
                '<strong class="rc-day-range">' + hora12(a) + ' – ' + hora12(b) + '</strong>' +
            '</div>' +
            '<div class="rc-day-bar" role="img" aria-label="Franja recomendada de ' + hora12(a) + ' a ' + hora12(b) + ' dentro de las 24 horas del día">' +
                segs.map(function (s) {
                    return '<span class="rc-day-seg" style="left:' + pct(s[0]) + ';width:' + pct(s[1] - s[0]) + '"></span>';
                }).join('') +
                '<span class="rc-day-now' + (dentro ? ' in' : '') + (ahora < 90 ? ' l' : ahora > 1350 ? ' r' : '') + '" style="left:' + pct(ahora) + '"><span>Ahora</span></span>' +
            '</div>' +
            '<div class="rc-day-ticks" aria-hidden="true"><span>12 a. m.</span><span><i class="fas fa-sun"></i> 6 a. m.</span><span>12 m.</span><span><i class="fas fa-moon"></i> 6 p. m.</span><span>12 a. m.</span></div>' +
        '</div>';
    }

    // Calendario con el día o la semana y la cuenta regresiva.
    function calendario(d1, d2, hoy) {
        var fin = d2 || d1;
        var n = diasEntre(d1, fin);
        var c = cuenta(d1, d2, hoy);
        var dias = '';
        if (n >= 1 && n <= 6) {
            var items = [];
            for (var i = 0; i <= n; i++) {
                var d = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate() + i);
                items.push('<span class="' + (diasEntre(hoy, d) === 0 ? 'hoy' : '') + '"><small>' + DIAS_INI[d.getDay()] + '</small>' + d.getDate() + '</span>');
            }
            dias = '<span class="rc-cal-week" aria-hidden="true">' + items.join('') + '</span>';
        }
        var num = n > 0 && d1.getMonth() === fin.getMonth() ? d1.getDate() + '–' + fin.getDate() : String(d1.getDate());
        return '<div class="rc-cal rc-cal--' + c.k + '">' +
            '<span class="rc-cal-tile" aria-hidden="true">' +
                '<span class="m">' + MESES_CORTOS[d1.getMonth()] + '</span>' +
                '<span class="d">' + num + '</span>' +
                '<span class="y">' + d1.getFullYear() + '</span>' +
            '</span>' +
            '<span class="rc-cal-info">' +
                '<strong>' + esc(rangoLargo(d1, d2)) + ' de ' + fin.getFullYear() + '</strong>' +
                dias +
                '<span class="rc-cal-count"><i class="fas ' + (c.k === 'pasado' ? 'fa-circle-check' : 'fa-hourglass-half') + '" aria-hidden="true"></i> ' + esc(c.t) + '</span>' +
            '</span>' +
        '</div>';
    }

    /* ---------- Render ---------- */

    function render(container, rows, opts) {
        opts = opts || {};
        var hoy = opts.hoy instanceof Date ? opts.hoy : new Date();
        var wa = opts.wa || 'https://wa.link/9k84s7';
        rows = (rows || []).slice();
        if (!container) return;
        if (!rows.length) { container.innerHTML = ''; return; }
        var id = 'recs' + (++uid);

        // Próxima fecha (para el adelanto en la cabecera) y última actualización.
        var proxima = null, ultima = null, nuevas = 0;
        rows.forEach(function (r) {
            var d1 = parseFecha(r.fecha_desde), d2 = parseFecha(r.fecha_hasta);
            if (d1 && diasEntre(hoy, d2 || d1) >= 0 && (!proxima || d1 < proxima.d1)) proxima = { d1: d1, d2: d2 };
            var u = r.updated_at || r.created_at;
            if (u && (!ultima || u > ultima)) ultima = u;
            if (r.created_at && (hoy - new Date(r.created_at)) < 14 * DAY_MS) nuevas++;
        });
        var fechaUlt = '';
        if (ultima) {
            var du = new Date(ultima);
            if (!isNaN(du)) fechaUlt = du.getDate() + ' de ' + MESES[du.getMonth()] + ' de ' + du.getFullYear();
        }

        var dots = rows.map(function (r) {
            var c = CATS[r.categoria] || CATS.general;
            return '<span class="recs-dot" style="--c:' + c.color + '" title="' + esc(c.label) + '"><i class="fas ' + c.icon + '"></i></span>';
        }).join('');

        var items = rows.map(function (r, i) {
            var c = CATS[r.categoria] || CATS.general;
            var rid = id + '-' + i;
            var d1 = parseFecha(r.fecha_desde), d2 = parseFecha(r.fecha_hasta);
            var flags = [];
            if (opts.estado && r.status !== 'publicado') flags.push('<span class="rc-flag draft">Borrador</span>');
            if (r.created_at && (hoy - new Date(r.created_at)) < 14 * DAY_MS) flags.push('<span class="rc-flag new">Nueva</span>');
            if (d1 && diasEntre(hoy, d2 || d1) >= 0) flags.push('<span class="rc-flag date"><i class="fas fa-calendar-day" aria-hidden="true"></i> ' + esc(rangoCorto(d1, d2)) + '</span>');

            var body = '';
            if (d1) body += calendario(d1, d2, hoy);
            if (r.hora_desde && r.hora_hasta) body += franja(r.hora_desde, r.hora_hasta, hoy);
            body += cuerpo(r.cuerpo);
            if (r.boton) {
                body += '<a class="rc-wa" href="' + esc(wa) + '" target="_blank" rel="noopener"><i class="fab fa-whatsapp" aria-hidden="true"></i> ' + esc(r.boton) + '</a>';
            }

            return '<li class="rc" style="--c:' + c.color + '">' +
                '<h3 class="rc-h">' +
                    '<button type="button" class="rc-btn" id="' + rid + '-b" aria-expanded="false" aria-controls="' + rid + '-p">' +
                        '<span class="rc-num" aria-hidden="true">' + (i < 9 ? '0' : '') + (i + 1) + '</span>' +
                        '<span class="rc-ico" aria-hidden="true"><i class="fas ' + c.icon + '"></i></span>' +
                        '<span class="rc-txt">' +
                            '<span class="rc-cat">' + esc(c.label) + '</span>' +
                            '<span class="rc-ttl">' + esc(r.titulo) + '</span>' +
                            (r.resumen ? '<span class="rc-sum">' + esc(r.resumen) + '</span>' : '') +
                        '</span>' +
                        (flags.length ? '<span class="rc-flags">' + flags.join('') + '</span>' : '') +
                        '<span class="rc-chev" aria-hidden="true"><i class="fas fa-plus"></i></span>' +
                    '</button>' +
                '</h3>' +
                '<div class="rc-panel" id="' + rid + '-p" role="region" aria-labelledby="' + rid + '-b">' +
                    '<div class="rc-panel-in"><div class="rc-body">' + body + '</div></div>' +
                '</div>' +
            '</li>';
        }).join('');

        var total = rows.length;
        var meta = total + (total === 1 ? ' recomendación' : ' recomendaciones') +
            (nuevas && nuevas < total ? ' · ' + nuevas + (nuevas === 1 ? ' nueva' : ' nuevas') : '') +
            (fechaUlt ? ' · Actualizado el ' + fechaUlt : '');

        container.innerHTML =
            '<section class="recs" id="recomendaciones" aria-label="Recomendaciones de Motor Advertising">' +
                '<h2 class="recs-h">' +
                    '<button type="button" class="recs-head" aria-expanded="false" aria-controls="' + id + '-body">' +
                        '<span class="recs-orb" aria-hidden="true"><i class="fas fa-lightbulb"></i></span>' +
                        '<span class="recs-head-txt">' +
                            '<span class="recs-eyebrow">Recomendaciones de Motor</span>' +
                            '<span class="recs-title">Plan de acción para su equipo</span>' +
                            '<span class="recs-meta">' + esc(meta) + '</span>' +
                            '<span class="recs-strip">' +
                                '<span class="recs-dots" aria-hidden="true">' + dots + '</span>' +
                                (proxima ? '<span class="recs-next"><i class="fas fa-calendar-day" aria-hidden="true"></i> Próxima fecha: ' + esc(rangoCorto(proxima.d1, proxima.d2)) + '</span>' : '') +
                            '</span>' +
                        '</span>' +
                        '<span class="recs-cta"><span class="recs-cta-t">Ver plan</span><i class="fas fa-chevron-down" aria-hidden="true"></i></span>' +
                    '</button>' +
                '</h2>' +
                '<div class="recs-body" id="' + id + '-body">' +
                    '<div class="recs-body-in"><div class="recs-pad">' +
                        '<div class="recs-tools"><button type="button" class="recs-all">Abrir todas</button></div>' +
                        '<ol class="recs-list">' + items + '</ol>' +
                        '<div class="recs-foot">' +
                            '<span><i class="fas fa-comments" aria-hidden="true"></i> ¿Dudas sobre alguna recomendación? Las revisamos con ustedes.</span>' +
                            '<a class="rc-wa ghost" href="' + esc(wa) + '" target="_blank" rel="noopener"><i class="fab fa-whatsapp" aria-hidden="true"></i> Hablar con Motor</a>' +
                        '</div>' +
                    '</div></div>' +
                '</div>' +
            '</section>';

        var sec = container.querySelector('.recs');
        var head = sec.querySelector('.recs-head');
        var all = sec.querySelector('.recs-all');
        var recs = Array.prototype.slice.call(sec.querySelectorAll('.rc'));

        function setSection(open) {
            sec.classList.toggle('open', open);
            head.setAttribute('aria-expanded', open ? 'true' : 'false');
            head.querySelector('.recs-cta-t').textContent = open ? 'Ocultar' : 'Ver plan';
        }
        function setItem(li, open) {
            li.classList.toggle('open', open);
            li.querySelector('.rc-btn').setAttribute('aria-expanded', open ? 'true' : 'false');
        }
        function syncAll() {
            var abiertas = recs.filter(function (li) { return li.classList.contains('open'); }).length;
            all.textContent = abiertas === recs.length ? 'Cerrar todas' : 'Abrir todas';
        }

        head.addEventListener('click', function () { setSection(!sec.classList.contains('open')); });
        recs.forEach(function (li) {
            li.querySelector('.rc-btn').addEventListener('click', function () {
                setItem(li, !li.classList.contains('open'));
                syncAll();
            });
        });
        all.addEventListener('click', function () {
            var abrir = all.textContent === 'Abrir todas';
            recs.forEach(function (li) { setItem(li, abrir); });
            syncAll();
        });

        // Enlace directo: /paginas/perfil/#recomendaciones abre la sección.
        var directo = window.location.hash === '#recomendaciones';
        setSection(!!opts.abierta || directo);
        if (directo) setTimeout(function () { sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
    }

    window.MotorRecs = { render: render, CATS: CATS, cuerpo: cuerpo, version: '1.0' };
})();
