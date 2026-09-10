/**
 * report-render.js v1.1 — Renderer compartido de reportes de pauta
 * ----------------------------------------------------------------------------
 * Pinta un reporte (JSON generado por la Edge Function generate-report) dentro
 * de un contenedor .rep-shell, incluidas las gráficas con Chart.js.
 *
 * Uso:
 *   MotorReport.render(shellEl, report, { cliente, periodo, fecha, estado })
 *
 * Soporta el formato v2 del reporte (plataformas, KPIs con `favorable` y
 * `contexto`, gráficas con `insight`/`formato_valor`/`eje_y`, tabla de
 * rendimiento, proyección de presupuesto interactiva, hallazgos y
 * recomendaciones estructurados, notas) y sigue pintando los reportes
 * antiguos (hallazgos/recomendaciones como texto plano).
 *
 * Requiere: Chart.js (UMD) cargado antes, y los estilos .rep-* de styles.css.
 * Toda la salida de la IA pasa por esc() antes de llegar al HTML; los pocos
 * valores que van a atributos son números validados o códigos con lista blanca.
 * Los números de la proyección se recalculan aquí con la fórmula del prompt
 * (resultado = base × (1 + var)^elasticidad): la tabla y el slider siempre
 * son coherentes entre sí aunque el modelo haya redondeado distinto.
 * Una gráfica defectuosa nunca impide pintar el resto del reporte.
 */
(function () {
    'use strict';

    var PALETTE = ['#59a8c4', '#0e7490', '#25d366', '#ffce7a', '#ff9c92', '#a78bfa', '#f472b6', '#94a3b8'];
    var SCENARIOS = [-30, -15, 0, 15, 30, 50];

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function num(v) {
        if (v === null || v === undefined || v === '') return null;
        var n = Number(v);
        return isFinite(n) ? n : null;
    }

    function isObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }

    // Formato numérico del reporte: el prompt conserva el formato del input en
    // los textos ($1.250.000 / 3,2 % o $1,250.50). Se detecta para que los
    // números que formatea el renderer (proyección, ejes) usen la misma convención.
    function detectLocale(rep) {
        var samples = [];
        (Array.isArray(rep.kpis) ? rep.kpis : []).forEach(function (k) { if (isObj(k) && k.valor != null) samples.push(String(k.valor)); });
        var t = rep.tabla_rendimiento;
        if (isObj(t) && Array.isArray(t.filas)) {
            t.filas.forEach(function (r) { (Array.isArray(r) ? r : []).forEach(function (c) { samples.push(String(c == null ? '' : c)); }); });
        }
        var s = samples.join(' ');
        var esMarks = /\d\.\d{3}(?!\d)/.test(s) || /\d,\d{1,2}(?!\d)/.test(s);
        var enMarks = /\d,\d{3}(?!\d)/.test(s) || /\d\.\d{1,2}(?!\d)/.test(s);
        return (!esMarks && enMarks) ? 'en-US' : 'es-CO';
    }

    function fmtNum(v, dec, loc) {
        var n = num(v);
        if (n === null) return '—';
        var d = (dec == null) ? ((Math.abs(n) < 100 && n % 1 !== 0) ? 2 : 0) : dec;
        try {
            return n.toLocaleString(loc || 'es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
        } catch (e) {
            return n.toFixed(d);
        }
    }

    // Código de moneda con lista blanca (COP, USD, MXN, €…); cualquier otra cosa se omite.
    function currencyCode(moneda) {
        var code = String(moneda || '').trim();
        return (/^[A-Za-z$€£¥]{1,5}$/.test(code) && code !== '$') ? code : '';
    }

    function fmtMoney(v, moneda, dec, loc) {
        var code = currencyCode(moneda);
        return '$' + fmtNum(v, dec, loc) + (code ? ' ' + code : '');
    }

    function fmtVal(v, formato, moneda, loc) {
        if (v === null || v === undefined) return '—';
        if (formato === 'moneda') return fmtMoney(v, moneda, null, loc);
        if (formato === 'porcentaje') {
            var n = num(v);
            return n === null ? '—' : fmtNum(n, (n % 1 !== 0) ? 1 : 0, loc) + ' %';
        }
        return fmtNum(v, null, loc);
    }

    function fmtPct(v, dec, signed, loc) {
        var n = num(v);
        if (n === null) return '—';
        var s = fmtNum(n, dec == null ? 1 : dec, loc) + ' %';
        return (signed && n > 0) ? '+' + s : s;
    }

    /* ───────── Bloques ───────── */

    function renderKpis(list) {
        var html = (list || []).filter(isObj).map(function (k) {
            var t = (k.tendencia === 'up' || k.tendencia === 'down') ? k.tendencia : 'flat';
            var icon = t === 'up' ? 'fa-arrow-trend-up' : (t === 'down' ? 'fa-arrow-trend-down' : 'fa-minus');
            // Color: verde/rojo solo cuando el modelo dice si el cambio es favorable.
            // Reportes antiguos (sin el campo) mantienen el color por tendencia.
            var cls;
            if (k.favorable === true) cls = 'good';
            else if (k.favorable === false) cls = 'bad';
            else if ('favorable' in k) cls = 'flat';
            else cls = t;
            var delta = k.delta ? '<span class="k-delta ' + cls + '"><i class="fas ' + icon + '"></i> ' + esc(k.delta) + '</span>' : '';
            var ctx = k.contexto ? '<div class="k-ctx">' + esc(k.contexto) + '</div>' : '';
            return '<div class="rep-kpi"><div class="k-label">' + esc(k.label) + '</div><div class="k-value">' + esc(k.valor) + '</div>' + delta + ctx + '</div>';
        }).join('');
        return html ? '<h3 class="rep-h">Indicadores clave</h3><div class="rep-kpis">' + html + '</div>' : '';
    }

    function renderChartBoxes(list, uid) {
        var html = (list || []).filter(isObj).map(function (g, i) {
            var insight = g.insight ? '<p class="c-insight"><i class="fas fa-lightbulb"></i>' + esc(g.insight) + '</p>' : '';
            return '<div class="rep-chart"><h4>' + esc(g.titulo) + '</h4><div class="c-box"><canvas id="' + uid + '-' + i + '"></canvas></div>' + insight + '</div>';
        }).join('');
        return html ? '<h3 class="rep-h">Rendimiento</h3><div class="rep-charts">' + html + '</div>' : '';
    }

    function renderTable(t) {
        if (!isObj(t) || !Array.isArray(t.columnas) || !Array.isArray(t.filas) || !t.filas.length) return '';
        var head = t.columnas.map(function (c, i) { return '<th' + (i ? ' class="num"' : '') + '>' + esc(c) + '</th>'; }).join('');
        var rows = t.filas.map(function (r) {
            r = Array.isArray(r) ? r : [r];
            var isTotal = /^total/i.test(String(r[0] == null ? '' : r[0]).trim());
            return '<tr' + (isTotal ? ' class="is-total"' : '') + '>' +
                r.map(function (c, i) { return '<td' + (i ? ' class="num"' : '') + '>' + esc(c) + '</td>'; }).join('') + '</tr>';
        }).join('');
        return '<h3 class="rep-h">' + esc(t.titulo || 'Rendimiento por campaña') + '</h3>' +
            '<div class="rep-table-wrap"><table class="rep-table"><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
            (t.nota ? '<p class="rep-tnote">' + esc(t.nota) + '</p>' : '');
    }

    function scenario(base, rb, el, pct) {
        var f = 1 + pct / 100;
        var presupuesto = base * f;
        var resultado = f > 0 ? Math.round(rb * Math.pow(f, el)) : 0;
        var varRes = f > 0 ? (Math.pow(f, el) - 1) * 100 : -100;
        var cpr = resultado > 0 ? presupuesto / resultado : null;
        return { pct: pct, presupuesto: presupuesto, resultado: resultado, varRes: varRes, cpr: cpr };
    }

    // Devuelve { html, state } — state alimenta el slider tras el innerHTML.
    function renderProjection(p, uid, monedaRep, loc) {
        if (!isObj(p)) return { html: '', state: null };
        var base = num(p.presupuesto_base), rb = num(p.resultado_base), el = num(p.elasticidad);
        if (base === null || rb === null || base <= 0 || rb <= 0) return { html: '', state: null };
        if (el === null || el <= 0 || el > 1.5) el = 0.85;

        var sl = isObj(p.slider) ? p.slider : {};
        var min = num(sl.min), max = num(sl.max), step = num(sl.paso);
        if (min === null) min = -50;
        min = Math.max(min, -100);
        if (max === null || max <= min) max = 100;
        if (step === null || step <= 0) step = 5;
        // La recomendación se alinea a la rejilla del slider: así el valor inicial
        // del control, la fila "Recomendado" y data-pct coinciden con lo que el
        // navegador realmente selecciona.
        var reco = num(p.variacion_recomendada_pct);
        if (reco === null) reco = 0;
        reco = min + Math.round((reco - min) / step) * step;
        reco = Math.round(reco * 100) / 100;
        reco = Math.max(min, Math.min(max, reco));

        var moneda = p.moneda || monedaRep || '';
        var metrica = p.metrica || 'Resultados';
        var pcts = SCENARIOS.filter(function (pc) { return pc >= min && pc <= max; });
        if (pcts.indexOf(reco) < 0) pcts.push(reco);
        pcts.sort(function (a, b) { return a - b; });

        var rows = pcts.map(function (pc) {
            var s = scenario(base, rb, el, pc);
            var isReco = pc === reco;
            return '<tr class="' + (isReco ? 'is-reco' : '') + '" data-pct="' + pc + '">' +
                '<td>' + fmtPct(pc, 0, true, loc) + (isReco ? '<span class="pj-badge">Recomendado</span>' : '') + '</td>' +
                '<td class="num">' + fmtMoney(s.presupuesto, moneda, 0, loc) + '</td>' +
                '<td class="num">' + fmtNum(s.resultado, 0, loc) + '</td>' +
                '<td class="num">' + fmtPct(s.varRes, 1, true, loc) + '</td>' +
                '<td class="num">' + (s.cpr === null ? '—' : fmtMoney(s.cpr, moneda, 2, loc)) + '</td>' +
                '</tr>';
        }).join('');

        var supuestos = (Array.isArray(p.supuestos) ? p.supuestos : []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
        var zeroTick = (min < 0 && max > 0)
            ? '<span class="pj-tick0" style="left:' + ((0 - min) / (max - min) * 100).toFixed(2) + '%">0 %</span>'
            : '';

        var html =
            '<h3 class="rep-h">Proyección de presupuesto</h3>' +
            '<div class="rep-proj">' +
                '<div class="pj-head">' +
                    '<div>' +
                        '<div class="pj-metric">Métrica proyectada: <strong>' + esc(metrica) + '</strong></div>' +
                        '<div class="pj-base" title="Modelo de rendimientos decrecientes · elasticidad ' + fmtNum(el, 2, loc) + '">Base del período: ' + fmtMoney(base, moneda, 0, loc) + ' de inversión · ' + fmtNum(rb, 0, loc) + ' resultados · ' + fmtMoney(base / rb, moneda, 2, loc) + ' por resultado</div>' +
                    '</div>' +
                    '<div class="pj-disclaimer"><i class="fas fa-circle-info"></i> Estimación, no garantía</div>' +
                '</div>' +
                '<div class="pj-slider">' +
                    '<label for="' + uid + '-pjr"><span>Variación del presupuesto</span><output id="' + uid + '-pjv"></output></label>' +
                    '<input type="range" id="' + uid + '-pjr" min="' + min + '" max="' + max + '" step="' + step + '" value="' + reco + '" aria-label="Variación del presupuesto">' +
                    '<div class="pj-ticks"><span>' + fmtPct(min, 0, true, loc) + '</span>' + zeroTick + '<span>' + fmtPct(max, 0, true, loc) + '</span></div>' +
                '</div>' +
                '<div class="pj-out">' +
                    '<div class="pj-stat"><span>Presupuesto</span><strong id="' + uid + '-pjb"></strong></div>' +
                    '<div class="pj-stat hl"><span>Estimación de ' + esc(metrica) + '</span><strong id="' + uid + '-pjn"></strong></div>' +
                    '<div class="pj-stat"><span>Variación del resultado</span><strong id="' + uid + '-pjd"></strong></div>' +
                    '<div class="pj-stat"><span>Costo por resultado</span><strong id="' + uid + '-pjc"></strong></div>' +
                '</div>' +
                '<div class="rep-table-wrap"><table class="rep-table pj-table" id="' + uid + '-pjt"><thead><tr>' +
                    '<th>Variación del presupuesto</th><th class="num">Presupuesto</th><th class="num">' + esc(metrica) + '</th><th class="num">Variación del resultado</th><th class="num">Costo por resultado</th>' +
                '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
                (p.lectura ? '<p class="pj-lectura">' + esc(p.lectura) + '</p>' : '') +
                (supuestos ? '<ul class="pj-supuestos">' + supuestos + '</ul>' : '') +
            '</div>';

        return { html: html, state: { base: base, rb: rb, el: el, moneda: moneda, loc: loc } };
    }

    function bindProjection(state, uid) {
        if (!state) return;
        var range = document.getElementById(uid + '-pjr');
        if (!range) return;
        var out = document.getElementById(uid + '-pjv');
        var b = document.getElementById(uid + '-pjb');
        var n = document.getElementById(uid + '-pjn');
        var d = document.getElementById(uid + '-pjd');
        var c = document.getElementById(uid + '-pjc');
        var table = document.getElementById(uid + '-pjt');
        function update() {
            var pc = num(range.value) || 0;
            var s = scenario(state.base, state.rb, state.el, pc);
            if (out) out.textContent = fmtPct(pc, 0, true, state.loc);
            if (b) b.textContent = fmtMoney(s.presupuesto, state.moneda, 0, state.loc);
            if (n) n.textContent = fmtNum(s.resultado, 0, state.loc);
            if (d) d.textContent = fmtPct(s.varRes, 1, true, state.loc);
            if (c) c.textContent = s.cpr === null ? '—' : fmtMoney(s.cpr, state.moneda, 2, state.loc);
            if (table) {
                var trs = table.querySelectorAll('tbody tr');
                for (var i = 0; i < trs.length; i++) {
                    trs[i].classList.toggle('is-sel', num(trs[i].getAttribute('data-pct')) === pc);
                }
            }
        }
        range.addEventListener('input', update);
        update();
    }

    function renderFindings(list) {
        if (!Array.isArray(list) || !list.length) return '';
        var hasObjs = list.some(isObj);
        if (!hasObjs) {
            return '<h3 class="rep-h">Hallazgos</h3><ul class="rep-list">' +
                list.map(function (h) { return '<li><i class="fas fa-magnifying-glass-chart"></i><span>' + esc(h) + '</span></li>'; }).join('') + '</ul>';
        }
        var TAG = { positivo: 'Logro', oportunidad: 'Oportunidad', atencion: 'Punto de atención' };
        var ICON = { positivo: 'fa-circle-check', oportunidad: 'fa-lightbulb', atencion: 'fa-triangle-exclamation' };
        var cards = list.map(function (h) {
            if (!isObj(h)) return '<div class="rep-finding"><p>' + esc(h) + '</p></div>';
            var tipo = Object.prototype.hasOwnProperty.call(TAG, h.tipo) ? h.tipo : 'oportunidad';
            return '<div class="rep-finding ' + tipo + '">' +
                '<span class="f-tag"><i class="fas ' + ICON[tipo] + '"></i> ' + TAG[tipo] + '</span>' +
                (h.titulo ? '<h4>' + esc(h.titulo) + '</h4>' : '') +
                '<p>' + esc(h.descripcion) + '</p></div>';
        }).join('');
        return '<h3 class="rep-h">Hallazgos</h3><div class="rep-findings">' + cards + '</div>';
    }

    function renderRecos(list) {
        if (!Array.isArray(list) || !list.length) return '';
        var hasObjs = list.some(isObj);
        if (!hasObjs) {
            return '<h3 class="rep-h">Recomendaciones</h3><ul class="rep-list reco">' +
                list.map(function (r) { return '<li><i class="fas fa-circle-check"></i><span>' + esc(r) + '</span></li>'; }).join('') + '</ul>';
        }
        var PRIO = { alta: 'Prioridad alta', media: 'Prioridad media', baja: 'Prioridad baja' };
        var items = list.map(function (r) {
            if (!isObj(r)) return '<div class="rep-reco baja"><span class="r-prio">Sugerencia</span><h4>' + esc(r) + '</h4></div>';
            var prio = Object.prototype.hasOwnProperty.call(PRIO, r.prioridad) ? r.prioridad : 'media';
            return '<div class="rep-reco ' + prio + '">' +
                '<span class="r-prio">' + PRIO[prio] + '</span>' +
                '<h4>' + esc(r.accion) + '</h4>' +
                (r.justificacion ? '<p><strong>Por qué:</strong> ' + esc(r.justificacion) + '</p>' : '') +
                (r.impacto_esperado ? '<p><strong>Impacto esperado:</strong> ' + esc(r.impacto_esperado) + '</p>' : '') +
                '</div>';
        }).join('');
        return '<h3 class="rep-h">Recomendaciones</h3><div class="rep-recos">' + items + '</div>';
    }

    function renderNotes(list) {
        var items = (Array.isArray(list) ? list : []).filter(function (n) { return n != null && String(n).trim(); });
        if (!items.length) return '';
        return '<div class="rep-notes"><h5>Notas sobre los datos</h5><ul>' +
            items.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></div>';
    }

    function renderChips(rep) {
        var chips = (Array.isArray(rep.plataformas) ? rep.plataformas : []).filter(Boolean).map(function (p) {
            return '<span class="rep-chip">' + esc(p) + '</span>';
        });
        if (rep.moneda) chips.push('<span class="rep-chip">Moneda: ' + esc(rep.moneda) + '</span>');
        return chips.length ? '<div class="rep-chips">' + chips.join('') + '</div>' : '';
    }

    /* ───────── Gráficas ───────── */

    function drawCharts(list, uid, shell, monedaRep, loc) {
        (list || []).filter(isObj).forEach(function (g, i) {
            try {
                drawChart(g, i, uid, shell, monedaRep, loc);
            } catch (e) {
                if (window.console) console.error('[MotorReport] gráfica ' + i + ' no se pudo pintar:', e);
            }
        });
    }

    function drawChart(g, i, uid, shell, monedaRep, loc) {
        var ctx = document.getElementById(uid + '-' + i);
        if (!ctx || !window.Chart) return;
        var tipo = (g.tipo === 'line' || g.tipo === 'doughnut') ? g.tipo : 'bar';
        var labels = (Array.isArray(g.etiquetas) ? g.etiquetas : []).map(function (x) { return x == null ? '' : String(x); });
        var series = Array.isArray(g.series) ? g.series.filter(isObj) : [];
        var formato = g.formato_valor;
        // null se conserva: Chart.js omite el punto/barra en vez de pintar un 0 falso.
        var toNums = function (arr) { return (Array.isArray(arr) ? arr : []).map(function (x) { return num(x); }); };
        var fmt = function (v) { return fmtVal(v, formato, monedaRep, loc); };
        var datasets;
        if (tipo === 'doughnut') {
            var data = toNums(series[0] && series[0].datos);
            var tot = data.reduce(function (a, b) { return a + (b || 0); }, 0);
            // El porcentaje de cada segmento va en la leyenda: visible sin hover y en PDF.
            if (tot > 0) {
                labels = labels.map(function (l, j) { return l + ' · ' + fmtNum((data[j] || 0) / tot * 100, 1, loc) + ' %'; });
            }
            datasets = [{
                data: data,
                backgroundColor: PALETTE.slice(0, Math.max(labels.length, 1)),
                borderColor: '#0b0d10',
                borderWidth: 3
            }];
        } else {
            datasets = series.map(function (s, j) {
                var col = PALETTE[j % PALETTE.length];
                return {
                    label: String(s.nombre || ''),
                    data: toNums(s.datos),
                    backgroundColor: tipo === 'bar' ? col + 'cc' : col + '33',
                    borderColor: col,
                    borderWidth: 2,
                    borderRadius: tipo === 'bar' ? 6 : 0,
                    tension: 0.35,
                    fill: tipo === 'line',
                    spanGaps: true,
                    pointBackgroundColor: col
                };
            });
        }
        var yTitle = (tipo !== 'doughnut' && g.eje_y) ? { display: true, text: String(g.eje_y), color: '#9ca3af', font: { size: 10 } } : { display: false };
        shell._motorCharts.push(new Chart(ctx, {
            type: tipo,
            data: { labels: labels, datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: tipo === 'doughnut' || series.length > 1,
                        position: 'bottom',
                        labels: { color: '#9ca3af', boxWidth: 12, font: { size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (c) {
                                var v = tipo === 'doughnut' ? c.parsed : (c.parsed && c.parsed.y);
                                var prefix = tipo === 'doughnut' ? (c.label ? c.label + ': ' : '') : (c.dataset.label ? c.dataset.label + ': ' : '');
                                return prefix + (v == null ? '—' : fmt(v));
                            }
                        }
                    }
                },
                scales: tipo === 'doughnut' ? {} : {
                    x: { ticks: { color: '#9ca3af', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,.05)' } },
                    y: {
                        ticks: { color: '#9ca3af', font: { size: 10 }, callback: function (v) { return fmt(v); } },
                        grid: { color: 'rgba(255,255,255,.07)' },
                        title: yTitle
                    }
                }
            }
        }));
    }

    // Chart.js no se redimensiona solo al imprimir: se fuerza en beforeprint/afterprint
    // (y vía matchMedia para navegadores que no disparan esos eventos).
    function allCharts() {
        var out = [];
        var shells = document.querySelectorAll('.rep-shell');
        for (var i = 0; i < shells.length; i++) out = out.concat(shells[i]._motorCharts || []);
        return out;
    }
    function resizeAll() {
        allCharts().forEach(function (c) { try { c.resize(); } catch (e) {} });
    }
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('beforeprint', resizeAll);
        window.addEventListener('afterprint', resizeAll);
        if (typeof window.matchMedia === 'function') {
            var mq = window.matchMedia('print');
            if (mq && mq.addEventListener) mq.addEventListener('change', resizeAll);
            else if (mq && mq.addListener) mq.addListener(resizeAll);
        }
    }

    /* ───────── Render principal ───────── */

    function render(shell, rep, meta) {
        meta = meta || {};
        rep = isObj(rep) ? rep : {};

        // Destruir gráficas del render anterior en este mismo shell.
        (shell._motorCharts || []).forEach(function (c) { try { c.destroy(); } catch (e) {} });
        shell._motorCharts = [];

        var uid = 'rc' + Math.random().toString(36).slice(2, 8);
        var loc = detectLocale(rep);
        var estado = meta.estado === 'borrador'
            ? '<span class="rep-draft"><i class="fas fa-pen-ruler"></i> Borrador</span>'
            : '';
        var cliente = meta.cliente || rep.cliente || '';
        var proj = renderProjection(rep.proyeccion_presupuesto, uid, rep.moneda, loc);

        shell.innerHTML =
            '<div class="rep-brand">' +
                '<div class="rb-logo">// Motor <span>Advertising</span></div>' +
                '<div class="rb-meta">' + esc(cliente) + '<br>Generado el ' + esc(meta.fecha || '') + (estado ? '<br>' + estado : '') + '</div>' +
            '</div>' +
            '<h2 class="rep-title">' + esc(rep.titulo || 'Reporte de pauta') + '</h2>' +
            '<p class="rep-period">' + esc(rep.periodo || meta.periodo || '') + '</p>' +
            renderChips(rep) +
            (rep.resumen_ejecutivo ? '<p class="rep-summary">' + esc(rep.resumen_ejecutivo) + '</p>' : '') +
            renderKpis(rep.kpis) +
            renderChartBoxes(rep.graficas, uid) +
            renderTable(rep.tabla_rendimiento) +
            proj.html +
            renderFindings(rep.hallazgos) +
            renderRecos(rep.recomendaciones) +
            (rep.conclusion ? '<p class="rep-conclusion">' + esc(rep.conclusion) + '</p>' : '') +
            renderNotes(rep.notas) +
            '<p class="rep-footer">Motor Advertising · Agencia de alto rendimiento · motoradvertising.co</p>';

        // Cada bloque interactivo se enlaza por separado: un fallo en uno no anula el otro.
        try { drawCharts(rep.graficas, uid, shell, rep.moneda, loc); } catch (e) { if (window.console) console.error('[MotorReport] gráficas:', e); }
        try { bindProjection(proj.state, uid); } catch (e) { if (window.console) console.error('[MotorReport] proyección:', e); }
    }

    window.MotorReport = { render: render };
})();
