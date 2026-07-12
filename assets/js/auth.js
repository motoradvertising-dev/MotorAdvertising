/**
 * auth.js — Autenticación de Motor Advertising (Supabase Auth)
 * ----------------------------------------------------------------------------
 * Módulo compartido de autenticación. Se carga en toda página que tenga el
 * icono de perfil en el nav (#nav-profile) y en la página de login.
 *
 * Requiere que ANTES se cargue el SDK de Supabase v2 vía CDN:
 *   <script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script defer src="/assets/js/auth.js"></script>
 *
 * Métodos soportados:
 *   - Google OAuth        → MotorAuth.signInWithGoogle()
 *   - Email + contraseña  → MotorAuth.signUpEmail() / MotorAuth.signInEmail()
 *
 * La clave usada es la PUBLISHABLE key de Supabase (pública por diseño).
 * La seguridad real vive en Supabase (RLS, verificación de email, OAuth).
 */
(function () {
    'use strict';

    var SUPABASE_URL = 'https://seeaexvmdvmlbbezuosm.supabase.co';
    var SUPABASE_KEY = 'sb_publishable_zxgQiR6EV3uWV_SCdlmz4w_A8XYtS9r';

    // El SDK CDN expone window.supabase.createClient
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        console.warn('[MotorAuth] SDK de Supabase no disponible; auth deshabilitado.');
        return;
    }

    var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    /* ── API pública ─────────────────────────────────────────────────────── */

    var _profileCache = null;   // solo se guarda un resultado EXITOSO
    var _profilePromise = null; // dedupe de llamadas concurrentes en vuelo

    var MotorAuth = {
        client: client,

        signInWithGoogle: function (redirectPath) {
            return client.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + (redirectPath || '/paginas/perfil/')
                }
            });
        },

        signUpEmail: function (email, password, fullName, requestedRole) {
            return client.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName || '',
                        requested_role: (requestedRole === 'empresa' || requestedRole === 'empleado') ? requestedRole : null
                    },
                    emailRedirectTo: window.location.origin + '/paginas/perfil/'
                }
            });
        },

        signInEmail: function (email, password) {
            return client.auth.signInWithPassword({ email: email, password: password });
        },

        signOut: function () {
            _profileCache = null;
            return client.auth.signOut();
        },

        getSession: function () {
            return client.auth.getSession();
        },

        /**
         * Perfil del usuario actual (tabla public.profiles).
         * Resuelve {data, error}; data = null si no hay sesión.
         * Si el perfil no existe aún (cuenta anterior al trigger), lo crea.
         *
         * - Solo cachea resultados EXITOSOS: un error de red no envenena la
         *   página; el siguiente intento vuelve a consultar.
         * - Deduplica llamadas concurrentes (nav + guardia de página) para no
         *   disparar dos INSERT en paralelo que chocarían por PK.
         */
        getProfile: function (force) {
            if (force) { _profileCache = null; _profilePromise = null; }
            if (_profileCache) return Promise.resolve(_profileCache);
            if (_profilePromise) return _profilePromise;

            function reselect(id) {
                return client.from('profiles').select('*').eq('id', id).maybeSingle()
                    .then(function (r3) {
                        if (!r3.error && r3.data) _profileCache = r3;
                        return r3;
                    });
            }

            _profilePromise = client.auth.getSession().then(function (res) {
                var session = res && res.data ? res.data.session : null;
                if (!session) return { data: null, error: null };
                var u = session.user;
                return client.from('profiles').select('*').eq('id', u.id).maybeSingle()
                    .then(function (r) {
                        if (r.error) return r;              // NO cachear errores
                        if (r.data) { _profileCache = r; return r; }
                        // No hay fila todavía: crearla (cuenta previa al trigger).
                        var meta = u.user_metadata || {};
                        return client.from('profiles').insert({
                            id: u.id,
                            email: u.email || '',
                            full_name: meta.full_name || meta.name || '',
                            requested_role: (meta.requested_role === 'empresa' || meta.requested_role === 'empleado') ? meta.requested_role : null
                        }).select().single().then(function (r2) {
                            // Si otra llamada (o el trigger) ya la creó, re-leer.
                            if (r2.error) return reselect(u.id);
                            _profileCache = r2;
                            return r2;
                        });
                    });
            });

            // Pase lo que pase, liberar el candado de "en vuelo".
            _profilePromise = _profilePromise.then(function (r) {
                _profilePromise = null;
                return r;
            }, function (err) {
                _profilePromise = null;
                return { data: null, error: err };
            });
            return _profilePromise;
        }
    };

    window.MotorAuth = MotorAuth;

    /* ── UI del icono de perfil en el nav ────────────────────────────────── */

    function displayName(user) {
        if (!user) return '';
        var meta = user.user_metadata || {};
        return meta.full_name || meta.name || (user.email ? user.email.split('@')[0] : 'Usuario');
    }

    function initial(user) {
        var n = displayName(user);
        return n ? n.charAt(0).toUpperCase() : '?';
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function renderProfile(user) {
        var wrap = document.getElementById('nav-profile');
        if (!wrap) return;
        var btn = document.getElementById('nav-profile-btn');
        var menu = document.getElementById('nav-profile-menu');
        if (!btn || !menu) return;

        if (user) {
            btn.classList.add('is-logged');
            btn.innerHTML = '<span class="nav-profile-initial">' + esc(initial(user)) + '</span>';
            menu.innerHTML =
                '<div class="nav-profile-info">' +
                    '<span class="nav-profile-name">' + esc(displayName(user)) + '</span>' +
                    '<span class="nav-profile-email">' + esc(user.email || '') + '</span>' +
                '</div>' +
                '<a href="/paginas/perfil/" class="nav-profile-item"><i class="fas fa-gauge-high"></i> Mi panel</a>' +
                '<a href="/paginas/planes/" class="nav-profile-item"><i class="fas fa-layer-group"></i> Ver planes</a>' +
                '<button type="button" class="nav-profile-item nav-profile-logout" id="nav-profile-logout"><i class="fas fa-arrow-right-from-bracket"></i> Cerrar sesión</button>';

            // El enlace de Gestión solo aparece para el superadmin.
            MotorAuth.getProfile().then(function (r) {
                var p = r && r.data;
                if (p && p.role === 'superadmin' && !document.getElementById('nav-profile-gestion')) {
                    var info = menu.querySelector('.nav-profile-info');
                    if (info) {
                        info.insertAdjacentHTML('afterend',
                            '<a href="/paginas/gestion/" class="nav-profile-item" id="nav-profile-gestion"><i class="fas fa-users-gear"></i> Gestión</a>');
                    }
                }
            });

            var logoutBtn = document.getElementById('nav-profile-logout');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function () {
                    MotorAuth.signOut().then(function () {
                        // En páginas protegidas (panel/gestión) el contenido
                        // ya cargado seguiría visible: salir al inicio.
                        var path = window.location.pathname || '';
                        if (path.indexOf('/paginas/perfil') === 0 || path.indexOf('/paginas/gestion') === 0) {
                            window.location.href = '/';
                            return;
                        }
                        closeMenu();
                        renderProfile(null);
                    });
                });
            }
        } else {
            btn.classList.remove('is-logged');
            btn.innerHTML = '<i class="fas fa-user"></i>';
            menu.innerHTML =
                '<a href="/paginas/login/" class="nav-profile-item"><i class="fas fa-arrow-right-to-bracket"></i> Iniciar sesión</a>' +
                '<a href="/paginas/login/#registro" class="nav-profile-item"><i class="fas fa-user-plus"></i> Crear cuenta</a>';
        }
    }

    function closeMenu() {
        var btn = document.getElementById('nav-profile-btn');
        var menu = document.getElementById('nav-profile-menu');
        if (menu) menu.hidden = true;
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    function bindMenuToggle() {
        var wrap = document.getElementById('nav-profile');
        var btn = document.getElementById('nav-profile-btn');
        var menu = document.getElementById('nav-profile-menu');
        if (!wrap || !btn || !menu) return;

        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var willOpen = menu.hidden;
            menu.hidden = !willOpen;
            btn.setAttribute('aria-expanded', String(willOpen));
        });

        document.addEventListener('click', function (e) {
            if (!wrap.contains(e.target)) closeMenu();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeMenu();
        });
    }

    function init() {
        bindMenuToggle();
        client.auth.getSession().then(function (res) {
            var session = res && res.data ? res.data.session : null;
            renderProfile(session ? session.user : null);
        });
        client.auth.onAuthStateChange(function (_event, session) {
            renderProfile(session ? session.user : null);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
