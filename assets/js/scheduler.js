/**
 * scheduler.js — Agendamiento de citas de Motor Advertising
 * ----------------------------------------------------------------------------
 * Renderiza un calendario (mes navegable) + franjas horarias dentro de cada
 * contenedor [data-scheduler]. Al elegir día y hora, llena los inputs ocultos
 * fecha_cita (YYYY-MM-DD) y hora_cita (HH:MM) del <form> contenedor, de modo
 * que el envío existente (handleFormSubmit → Edge Function) los incluye solo.
 *
 * Reglas de agenda:
 *   - Lunes a viernes; sábados y domingos deshabilitados.
 *   - Desde mañana hasta 60 días adelante.
 *   - Franjas: 09:00–17:00 (hora Colombia), sin 13:00 (almuerzo).
 *
 * Sin dependencias. Idioma: usa window._currentLang ('es'|'en') si existe.
 */
(function () {
    'use strict';

    var SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
    var MAX_DAYS_AHEAD = 60;

    var TEXTS = {
        es: {
            pickDay: 'Elige un día disponible',
            pickSlot: 'Ahora elige la hora',
            selected: 'Cita seleccionada:',
            tz: 'Hora de Colombia (GMT-5)',
            change: 'Cambiar',
            prevMonth: 'Mes anterior',
            nextMonth: 'Mes siguiente',
            weekdays: ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do']
        },
        en: {
            pickDay: 'Pick an available day',
            pickSlot: 'Now pick a time',
            selected: 'Selected slot:',
            tz: 'Colombia time (GMT-5)',
            change: 'Change',
            prevMonth: 'Previous month',
            nextMonth: 'Next month',
            weekdays: ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su']
        }
    };

    function lang() {
        return (window._currentLang === 'en') ? 'en' : 'es';
    }
    function t(key) {
        return TEXTS[lang()][key];
    }

    function pad(n) { return n < 10 ? '0' + n : String(n); }

    function isoDate(d) {
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    function startOfDay(d) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    function prettyDate(iso) {
        var d = new Date(iso + 'T12:00:00');
        var locale = lang() === 'en' ? 'en-US' : 'es-CO';
        return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }

    function monthLabel(year, month) {
        var locale = lang() === 'en' ? 'en-US' : 'es-CO';
        var s = new Date(year, month, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    /** ¿Es un día agendable? (lun-vie, entre mañana y +60 días) */
    function isSelectable(d) {
        var today = startOfDay(new Date());
        var min = new Date(today); min.setDate(min.getDate() + 1);
        var max = new Date(today); max.setDate(max.getDate() + MAX_DAYS_AHEAD);
        var dow = d.getDay(); // 0=domingo, 6=sábado
        return d >= min && d <= max && dow !== 0 && dow !== 6;
    }

    function build(container) {
        var form = container.closest('form');
        if (!form) return;
        var fechaInput = form.querySelector('input[name="fecha_cita"]');
        var horaInput = form.querySelector('input[name="hora_cita"]');
        if (!fechaInput || !horaInput) return;

        var today = startOfDay(new Date());
        var view = { year: today.getFullYear(), month: today.getMonth() };
        var picked = { fecha: '', hora: '' };

        var maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + MAX_DAYS_AHEAD);

        function commit() {
            fechaInput.value = picked.fecha;
            horaInput.value = picked.hora;
        }

        /**
         * @param {string} [focusSel] — selector a enfocar tras re-render, para no
         * perder el foco de teclado (el render destruye el botón activo).
         */
        function render(focusSel) {
            var frag = document.createDocumentFragment();
            container.innerHTML = '';

            /* — Resumen cuando ya hay selección completa — */
            if (picked.fecha && picked.hora) {
                var summary = document.createElement('div');
                summary.className = 'sched-summary';
                summary.innerHTML =
                    '<i class="fas fa-calendar-check" aria-hidden="true"></i>' +
                    '<div><strong>' + t('selected') + '</strong> ' +
                    prettyDate(picked.fecha) + ' · ' + picked.hora +
                    '<span class="sched-tz">' + t('tz') + '</span></div>';
                var changeBtn = document.createElement('button');
                changeBtn.type = 'button';
                changeBtn.className = 'sched-change';
                changeBtn.textContent = t('change');
                changeBtn.addEventListener('click', function () {
                    picked.hora = '';
                    commit();
                    render('.sched-day.is-selected');
                });
                summary.appendChild(changeBtn);
                frag.appendChild(summary);
                container.appendChild(frag);
                if (focusSel) {
                    var fEl0 = container.querySelector(focusSel);
                    if (fEl0) fEl0.focus();
                }
                return;
            }

            /* — Cabecera del mes — */
            var head = document.createElement('div');
            head.className = 'sched-head';

            var prev = document.createElement('button');
            prev.type = 'button';
            prev.className = 'sched-nav';
            prev.setAttribute('aria-label', t('prevMonth'));
            prev.innerHTML = '<i class="fas fa-chevron-left" aria-hidden="true"></i>';
            var canPrev = new Date(view.year, view.month, 1) > new Date(today.getFullYear(), today.getMonth(), 1);
            prev.disabled = !canPrev;
            prev.addEventListener('click', function () {
                view.month--;
                if (view.month < 0) { view.month = 11; view.year--; }
                render('.sched-head .sched-nav:first-child');
            });

            var title = document.createElement('span');
            title.className = 'sched-month';
            title.textContent = monthLabel(view.year, view.month);

            var next = document.createElement('button');
            next.type = 'button';
            next.className = 'sched-nav';
            next.setAttribute('aria-label', t('nextMonth'));
            next.innerHTML = '<i class="fas fa-chevron-right" aria-hidden="true"></i>';
            var canNext = new Date(view.year, view.month + 1, 1) <= new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
            next.disabled = !canNext;
            next.addEventListener('click', function () {
                view.month++;
                if (view.month > 11) { view.month = 0; view.year++; }
                render('.sched-head .sched-nav:last-child');
            });

            head.appendChild(prev);
            head.appendChild(title);
            head.appendChild(next);

            /* — Días de la semana (lunes primero) — */
            var week = document.createElement('div');
            week.className = 'sched-weekdays';
            t('weekdays').forEach(function (w) {
                var s = document.createElement('span');
                s.textContent = w;
                week.appendChild(s);
            });

            /* — Rejilla de días — */
            var grid = document.createElement('div');
            grid.className = 'sched-grid';
            var firstDow = new Date(view.year, view.month, 1).getDay(); // 0=domingo
            var lead = (firstDow + 6) % 7; // convertir a lunes-primero
            for (var i = 0; i < lead; i++) {
                var empty = document.createElement('span');
                empty.className = 'sched-day is-empty';
                grid.appendChild(empty);
            }
            var daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
            for (var day = 1; day <= daysInMonth; day++) {
                var date = new Date(view.year, view.month, day);

                // Los días ya pasados no se muestran (celda vacía, sin número).
                if (date < today) {
                    var past = document.createElement('span');
                    past.className = 'sched-day is-empty';
                    grid.appendChild(past);
                    continue;
                }

                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'sched-day';
                btn.textContent = String(day);
                if (isSelectable(date)) {
                    var iso = isoDate(date);
                    if (picked.fecha === iso) btn.classList.add('is-selected');
                    btn.addEventListener('click', (function (isoVal) {
                        return function () {
                            picked.fecha = isoVal;
                            picked.hora = '';
                            commit();
                            render('.sched-slot');
                        };
                    })(iso));
                } else {
                    btn.disabled = true;
                }
                grid.appendChild(btn);
            }

            /* — Columna izquierda: calendario — */
            var cal = document.createElement('div');
            cal.className = 'sched-cal';
            cal.appendChild(head);
            cal.appendChild(week);
            cal.appendChild(grid);
            frag.appendChild(cal);

            /* — Columna derecha: franjas horarias — */
            var side = document.createElement('div');
            side.className = 'sched-side';
            var hint = document.createElement('p');
            hint.className = 'sched-hint';
            if (picked.fecha) {
                hint.textContent = t('pickSlot') + ' — ' + prettyDate(picked.fecha);
                side.appendChild(hint);

                var slots = document.createElement('div');
                slots.className = 'sched-slots';
                SLOTS.forEach(function (slot) {
                    var b = document.createElement('button');
                    b.type = 'button';
                    b.className = 'sched-slot';
                    b.textContent = slot;
                    b.addEventListener('click', function () {
                        picked.hora = slot;
                        commit();
                        render('.sched-change');
                    });
                    slots.appendChild(b);
                });
                side.appendChild(slots);

                var tz = document.createElement('p');
                tz.className = 'sched-tz-note';
                tz.textContent = t('tz');
                side.appendChild(tz);
            } else {
                hint.textContent = t('pickDay');
                hint.classList.add('sched-hint-empty');
                side.appendChild(hint);
            }
            frag.appendChild(side);

            container.appendChild(frag);
            if (focusSel) {
                var fEl = container.querySelector(focusSel);
                if (fEl && !fEl.disabled) fEl.focus();
            }
        }

        render();

        // Si el formulario se resetea (p.ej. al cerrar el modal), limpiar también
        // la selección del calendario para que UI e inputs queden sincronizados.
        form.addEventListener('reset', function () {
            picked.fecha = '';
            picked.hora = '';
            setTimeout(render, 0); // tras el reset nativo de los inputs
        });

        // Re-render al cambiar de idioma (los botones ES/EN disparan click)
        document.querySelectorAll('.lang-btn').forEach(function (b) {
            b.addEventListener('click', function () {
                setTimeout(function () { render(); }, 0);
            });
        });
    }

    function init() {
        document.querySelectorAll('[data-scheduler]').forEach(build);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
