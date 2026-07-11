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

    var MotorAuth = {
        client: client,

        signInWithGoogle: function (redirectPath) {
            return client.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + (redirectPath || '/paginas/planes/')
                }
            });
        },

        signUpEmail: function (email, password, fullName) {
            return client.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: { full_name: fullName || '' },
                    emailRedirectTo: window.location.origin + '/paginas/planes/'
                }
            });
        },

        signInEmail: function (email, password) {
            return client.auth.signInWithPassword({ email: email, password: password });
        },

        signOut: function () {
            return client.auth.signOut();
        },

        getSession: function () {
            return client.auth.getSession();
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
                '<a href="/paginas/planes/" class="nav-profile-item"><i class="fas fa-layer-group"></i> Ver planes</a>' +
                '<button type="button" class="nav-profile-item nav-profile-logout" id="nav-profile-logout"><i class="fas fa-arrow-right-from-bracket"></i> Cerrar sesión</button>';

            var logoutBtn = document.getElementById('nav-profile-logout');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function () {
                    MotorAuth.signOut().then(function () {
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
