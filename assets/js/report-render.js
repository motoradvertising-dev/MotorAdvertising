/**
 * report-render.js — Renderer compartido de reportes de pauta
 * ----------------------------------------------------------------------------
 * Pinta un reporte (JSON generado por la Edge Function generate-report) dentro
 * de un contenedor .rep-shell, incluidas las gráficas con Chart.js.
 *
 * Uso:
 *   MotorReport.render(shellEl, report, { cliente, periodo, fecha, estado })
 *
 * Requiere: Chart.js (UMD) cargado antes, y los estilos .rep-* de styles.css.
 * Toda la salida de la IA pasa por esc() — nunca se inyecta HTML sin escapar.
 */
(function () {
    'use strict';

    var PALETTE = ['#59a8c4', '#0e7490', '#25d366', '#ffce7a', '#ff9c92', '#a78bfa', '#f472b6', '#94a3b8'];

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function render(shell, rep, meta) {
        meta = meta || {};

        // Destruir gráficas del render anterior en este mismo shell.
        (shell._motorCharts || []).forEach(function (c) { try { c.destroy(); } catch (e) {} });
        shell._motorCharts = [];

        var uid = 'rc' + Math.random().toString(36).slice(2, 8);

        var kpis = (rep.kpis || []).map(function (k) {
            var t = (k.tendencia === 'up' || k.tendencia === 'down') ? k.tendencia : 'flat';
            var icon = t === 'up' ? 'fa-arrow-trend-up' : (t === 'down' ? 'fa-arrow-trend-down' : 'fa-minus');
            var delta = k.delta ? '<span class="k-delta ' + t + '"><i class="fas ' + icon + '"></i> ' + esc(k.delta) + '</span>' : '';
            return '<div class="rep-kpi"><div class="k-label">' + esc(k.label) + '</div><div class="k-value">' + esc(k.valor) + '</div>' + delta + '</div>';
        }).join('');

        var chartBoxes = (rep.graficas || []).map(function (g, i) {
            return '<div class="rep-chart"><h4>' + esc(g.titulo) + '</h4><div class="c-box"><canvas id="' + uid + '-' + i + '"></canvas></div></div>';
        }).join('');

        var hallazgos = (rep.hallazgos || []).map(function (h) {
            return '<li><i class="fas fa-magnifying-glass-chart"></i><span>' + esc(h) + '</span></li>';
        }).join('');
        var recos = (rep.recomendaciones || []).map(function (r) {
            return '<li><i class="fas fa-circle-check"></i><span>' + esc(r) + '</span></li>';
        }).join('');

        var estado = meta.estado === 'borrador'
            ? '<span class="rep-draft"><i class="fas fa-pen-ruler"></i> Borrador</span>'
            : '';

        shell.innerHTML =
            '<div class="rep-brand">' +
                '<div class="rb-logo">// Motor <span>Advertising</span></div>' +
                '<div class="rb-meta">' + esc(meta.cliente || '') + '<br>Generado el ' + esc(meta.fecha || '') + (estado ? '<br>' + estado : '') + '</div>' +
            '</div>' +
            '<h2 class="rep-title">' + esc(rep.titulo || 'Reporte de pauta') + '</h2>' +
            '<p class="rep-period">' + esc(rep.periodo || meta.periodo || '') + '</p>' +
            (rep.resumen_ejecutivo ? '<p class="rep-summary">' + esc(rep.resumen_ejecutivo) + '</p>' : '') +
            (kpis ? '<h3 class="rep-h">Indicadores clave</h3><div class="rep-kpis">' + kpis + '</div>' : '') +
            (chartBoxes ? '<h3 class="rep-h">Rendimiento</h3><div class="rep-charts">' + chartBoxes + '</div>' : '') +
            (hallazgos ? '<h3 class="rep-h">Hallazgos</h3><ul class="rep-list">' + hallazgos + '</ul>' : '') +
            (recos ? '<h3 class="rep-h">Recomendaciones</h3><ul class="rep-list reco">' + recos + '</ul>' : '') +
            (rep.conclusion ? '<p class="rep-conclusion">' + esc(rep.conclusion) + '</p>' : '') +
            '<p class="rep-footer">Motor Advertising · Agencia de alto rendimiento · motoradvertising.co</p>';

        (rep.graficas || []).forEach(function (g, i) {
            var ctx = document.getElementById(uid + '-' + i);
            if (!ctx || !window.Chart) return;
            var tipo = (g.tipo === 'line' || g.tipo === 'doughnut') ? g.tipo : 'bar';
            var labels = (g.etiquetas || []).map(String);
            var series = Array.isArray(g.series) ? g.series : [];
            var datasets;
            if (tipo === 'doughnut') {
                datasets = [{
                    data: (series[0] && series[0].datos) || [],
                    backgroundColor: PALETTE.slice(0, Math.max(labels.length, 1)),
                    borderColor: '#0b0d10',
                    borderWidth: 3
                }];
            } else {
                datasets = series.map(function (s, j) {
                    var col = PALETTE[j % PALETTE.length];
                    return {
                        label: String(s.nombre || ''),
                        data: s.datos || [],
                        backgroundColor: tipo === 'bar' ? col + 'cc' : col + '33',
                        borderColor: col,
                        borderWidth: 2,
                        borderRadius: tipo === 'bar' ? 6 : 0,
                        tension: 0.35,
                        fill: tipo === 'line',
                        pointBackgroundColor: col
                    };
                });
            }
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
                        }
                    },
                    scales: tipo === 'doughnut' ? {} : {
                        x: { ticks: { color: '#9ca3af', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,.05)' } },
                        y: { ticks: { color: '#9ca3af', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,.07)' } }
                    }
                }
            }));
        });
    }

    window.MotorReport = { render: render };
})();
