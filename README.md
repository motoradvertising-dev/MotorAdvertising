# Motor Advertising — motoradvertising.co

Sitio web oficial de **Motor Advertising**, agencia de crecimiento digital (performance ads, desarrollo web y automatizaciones con IA).

**Producción:** https://motoradvertising.co · Sitio estático servido por **GitHub Pages** con formularios y autenticación en **Supabase**.

---

## Arquitectura

```
┌─────────────────────┐     fetch (CORS)      ┌──────────────────────────┐
│   GitHub Pages      │ ───────────────────►  │  Supabase                 │
│   (sitio estático)  │                       │  · Edge Function          │
│   motoradvertising.co│                      │    contact-form → Resend  │
│                     │ ◄───────────────────  │  · Auth (Google + email)  │
└─────────────────────┘      supabase-js      └──────────────────────────┘
         ▲
         │ DNS (A records + CNAME www)
   Hostinger (solo DNS del dominio)
```

- **Hosting:** GitHub Pages, rama `principal`, carpeta raíz. Cada `git push` despliega automáticamente (1-2 min). Sin build step.
- **Dominio:** registrado en Hostinger; DNS apunta el apex y `www` a GitHub Pages. Ver [DEPLOY.md](DEPLOY.md).
- **Formularios:** POST a la Edge Function `contact-form` de Supabase, que envía el correo vía **Resend** a la bandeja del equipo. La API key de Resend vive en Supabase Secrets (nunca en el repo).
- **Autenticación:** Supabase Auth con **Google OAuth** y **email/contraseña**. La clave usada en el frontend es la *publishable key* (pública por diseño).

## Estructura del repositorio

```
├── index.html              # Home (hero con video, casos, showcase, testimonios, contacto)
├── styles.css              # Estilos globales (design tokens en :root)
├── script.js               # JS global: nav, i18n es/en, modales, showcase, partículas
├── robots.txt / sitemap.xml
├── CNAME                   # Dominio custom para GitHub Pages
├── assets/
│   ├── js/auth.js          # Módulo de autenticación (Supabase) + UI del icono de perfil
│   └── *.png               # Imágenes del sitio
├── paginas/
│   ├── services/           # Página de servicios
│   ├── pauta/              # Dashboard de paid media (React vía CDN — ver REFACTOR.md F3)
│   ├── contacto/           # Formulario de contacto (empresa / profesional)
│   ├── planes/             # 💳 Planes Inicial / Crecimiento / Elite
│   ├── login/              # 🔐 Iniciar sesión / crear cuenta (Google + email)
│   ├── creacion-de-cuenta/ # Onboarding de clientes de pauta
│   ├── propuesta*/         # Propuestas comerciales por cliente (noindex)
│   └── reporte*/           # Reportes de clientes (noindex)
├── supabase/
│   ├── config.toml         # verify_jwt=false para contact-form
│   └── functions/contact-form/index.ts   # Edge Function de formularios
├── DEPLOY.md               # Guía completa de despliegue (DNS, GH Pages, Supabase, Resend)
└── REFACTOR.md             # Auditoría del sitio + plan de refactor por fases
```

## Funcionalidades

### Navegación
- Nav compartido (copiado por página — unificación pendiente, ver REFACTOR.md F5) con botón **Planes** e **icono de perfil**.
- El icono de perfil muestra: *Iniciar sesión / Crear cuenta* (sin sesión) o *nombre, email, Ver planes, Cerrar sesión* (con sesión).
- i18n ES/EN con `data-i18n` + diccionario en `script.js`; idioma persistido en `localStorage` (`motor_lang`).

### Planes (`/paginas/planes/`)
Tres planes con precios de setup + mensualidad:

| Plan | Setup | Mensual | Para |
|---|---|---|---|
| **Inicial** | $1,000 | $97/mes | Pequeños negocios y startups |
| **Crecimiento** ★ | $2,000 | $197/mes | Negocios en expansión |
| **Elite** | $3,000 | $697/mes | Marcas de alto rendimiento |

El botón "Elegir plan" abre WhatsApp y guarda el plan elegido en `localStorage` (`motor_plan_elegido`) para futuros flujos de pago.

### Autenticación (`/paginas/login/`)
- **Google OAuth** y **email/contraseña** (registro con confirmación por correo).
- Implementada en [assets/js/auth.js](assets/js/auth.js) sobre `supabase-js` v2 (CDN).
- Con sesión iniciada, el login redirige a `/paginas/planes/`.

#### ⚙️ Configuración requerida en Supabase (una sola vez)

1. **Google OAuth**: Supabase → *Authentication → Providers → Google* → habilitar, pegando el **Client ID/Secret** creado en [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (OAuth 2.0, tipo Web). En Google añade como *Authorized redirect URI* la que muestra Supabase (`https://<ref>.supabase.co/auth/v1/callback`).
2. **URLs**: Supabase → *Authentication → URL Configuration* → **Site URL** = `https://motoradvertising.co` y añadir `https://motoradvertising.co/**` a *Redirect URLs* (incluye `/paginas/planes/`).
3. **Email**: el registro por email usa la plantilla de confirmación de Supabase; personalizable en *Authentication → Email Templates*.

> Sin el paso 1, el botón "Continuar con Google" devolverá `provider is not enabled`. El registro por email funciona sin configuración extra.

### Formularios → correo
- Modal del home (empresa/profesional) y onboarding de `creacion-de-cuenta` hacen POST a la Edge Function con la publishable key.
- La función valida, aplica honeypot/rate-limit y envía el correo vía Resend (dominio verificado con DKIM/SPF).
- Detalle completo del flujo y su despliegue: [DEPLOY.md](DEPLOY.md).

## Desarrollo local

```bash
npm run dev        # http-server en http://localhost:8080
```

No hay build: lo que está en el repo es exactamente lo que se publica.

**Convenciones:**
- Cache-busting manual: al tocar `styles.css` o `script.js`, subir la versión `?v=` **en todas las páginas que los cargan** (index, services, pauta, contacto, creacion-de-cuenta, planes).
- Texto visible: si tiene `data-i18n`, actualizar también el diccionario `translations` (es **y** en) en `script.js`.
- Páginas de propuestas de clientes: siempre con `<meta name="robots" content="noindex">`.
- Enlaces externos: siempre `target="_blank" rel="noopener"`.

## Despliegue

```bash
git add -A && git commit -m "..." && git push origin principal
```

GitHub Pages publica automáticamente. La Edge Function se despliega aparte:

```bash
supabase functions deploy contact-form   # (--use-api si no hay Docker)
```

## Estado del código y hoja de ruta

El sitio pasó una **auditoría integral multi-agente** (rendimiento, seguridad, calidad, SEO/accesibilidad). Resultados, quick wins ya aplicados y el plan de mejora en 6 fases: **[REFACTOR.md](REFACTOR.md)**.

Lo más urgente pendiente:
1. 🔴 Eliminar la captura de contraseñas del onboarding (Fase 1 del plan).
2. 🟠 Optimizar el video hero de 24 MB y los PNG grandes (requiere recomprimir assets).
3. 🟠 Reescribir `/pauta` sin React/Babel por CDN (~5 MB → <300 KB).

---

© Motor Advertising · *Your brand. Our engine.*
