# Plan de Refactor — motoradvertising.co

> Generado a partir de una auditoría multi-agente de todo el repositorio
> (rendimiento, seguridad, calidad de código, SEO/accesibilidad y arquitectura i18n/nav),
> con síntesis priorizada por impacto/esfuerzo. Julio 2026.

## Estado actual (notas de la auditoría)

| Dimensión | Nota | Hallazgo más grave |
|---|---|---|
| Rendimiento | 3.5/10 | Video hero de **24,3 MB** desde raw.githubusercontent con preload forzado; /pauta carga ~5 MB de React+Babel+Tailwind por CDN compilando JSX en el navegador |
| Seguridad | 4.5/10 | El formulario de creación de cuenta captura **contraseñas de Gmail/Instagram en texto plano** y las reenvía por email (innecesario: el propio flujo ya usa invitación de Business Manager) |
| Calidad de código | 4/10 | `script.js` monolito de 1.634 líneas con datos hardcodeados; ~15% de CSS muerto; nav/footer duplicados a mano en 4-5 páginas con divergencias |
| SEO / Accesibilidad | 4/10 | Sin meta descriptions ni Open Graph (crítico para compartir por WhatsApp), sin sitemap/robots, jerarquía de headings rota, propuestas de clientes indexables |
| i18n / Nav | 6/10 | Bug activo (`nav_casos` sin traducción — **ya corregido**); language switcher muerto en /services porque no carga script.js |

## ✅ Fase 0 — Quick Wins (APLICADA en este refactor)

Cambios de bajo riesgo y alto impacto ya implementados:

- [x] Eliminado `<link rel="preload" as="video">` del video hero (evita forzar 24 MB con prioridad alta) + `preload="metadata"` en el `<video>`.
- [x] `defer` en Chart.js del reporte CSL.
- [x] Cache-busting unificado: `styles.css?v=4.0` y `script.js?v=5.0` en **todas** las páginas.
- [x] `rel="noopener"` en enlaces `target="_blank"` y en `window.open` del showcase.
- [x] `type="password"` + `autocomplete="new-password"` en los campos de contraseña de creación de cuenta (mitigación temporal — ver Fase 1).
- [x] `<meta name="robots" content="noindex">` en las 10 páginas de propuestas/reportes/creación de cuenta.
- [x] `robots.txt` (bloquea propuestas/reportes) + `sitemap.xml` con las URLs públicas.
- [x] Meta description, Open Graph, Twitter Card y JSON-LD Organization en el home.
- [x] Preconnect a `cdnjs.cloudflare.com` e `images.unsplash.com`.
- [x] Regla global `:focus-visible` (accesibilidad de teclado).
- [x] Fix del 404 en /pauta (`index-contact.html` → `/paginas/contacto`).
- [x] Claves i18n faltantes: `nav_casos` (bug existente) y `nav_planes` en es/en.

**Pendientes de Fase 0 que requieren acción manual** (no automatizables desde código):
- [ ] Recomprimir `motoraddds_4.mp4` a 720p (~2-3 MB) y servirlo desde Cloudinary (cuenta ya en uso).
- [ ] Convertir `assets/gmc_granite_mockup.png` (1,9 MB) y `assets/motor-leadership-characters.png` (836 KB) a WebP: de 2,7 MB a ~250 KB.
- [ ] Reducir `assets/favicon.png` de 40 KB a 32×32 (~2 KB).

## Fase 1 — Eliminar la captura de credenciales (impacto: alto, esfuerzo: medio) 🔴 URGENTE

El hallazgo más grave de seguridad. Orden de despliegue obligatorio: primero frontend, después backend.

1. Eliminar los campos de contraseña de `paginas/creacion-de-cuenta` y del payload; sustituir por instrucciones de **delegación** (invitación a Meta Business Manager — el Paso 7 del propio formulario ya lo hace —, acceso de socio, delegación de Gmail).
2. Actualizar la Edge Function (`supabase/functions/contact-form/index.ts`) para rechazar/ignorar `contrasena_gmail` y `contrasena_instagram`.
3. Corregir `submitAll()`: esperar la respuesta del fetch antes de mostrar éxito (hoy es fire-and-forget y puede perder envíos en silencio).
4. Validación real de cliente (form + required + patterns) y de servidor (hoy solo `negocio` es obligatorio).
5. Operativo: purgar del buzón los correos históricos con contraseñas y pedir rotación de credenciales a los clientes afectados.

## Fase 2 — Higiene de assets y cabeceras (impacto: medio, esfuerzo: medio)

- Mover `Izzyweb.mp4` (11,6 MB) y PNGs grandes a Cloudinary.
- Minificar `styles.css` y `script.js` en el deploy (`npx esbuild --minify`): ~-60 KB.
- Sustituir Font Awesome completo por subset/SVGs de los ~20 iconos usados.
- CSP por meta tag (script-src limitado a CDNs usados, connect-src a `*.supabase.co`) + `referrer` meta en todas las páginas. **Probar consola en todas las páginas antes del deploy.**
- Respetar `prefers-reduced-motion` en three.js y el canvas de partículas.

## Fase 3 — Reescribir /pauta sin React/Babel/Tailwind CDN (impacto: alto, esfuerzo: medio)

- Compilar el JSX una sola vez (`npx babel --presets react`) o reescribir en HTML/CSS plano: de ~5 MB a <300 KB.
- Fijar versiones exactas con SRI en los CDNs que queden.
- Añadir `h1` real y título coherente.
- Comparación visual contra la versión actual + rama de rollback.

## Fase 4 — SEO estructural, accesibilidad e i18n (impacto: medio, esfuerzo: medio)

- Jerarquía de headings (h1 en home y contacto), `menu-toggle` como `<button>` con aria.
- Labels asociados en formularios, contraste del acento `#0F394A` sobre negro (falla WCAG AA).
- Cerrar los `<div class="wa-widget-container">` sin cerrar en contacto y services (markup inválido).
- Llevar i18n funcional a /services (hoy su switcher está muerto).

## Fase 5 — Modularización y componentes compartidos (impacto: medio, esfuerzo: alto)

1. Purgar CSS muerto (~600 líneas, riesgo cero, verificable con grep cruzado).
2. Partir `script.js` en módulos ES (`/assets/js/modules/{navbar,i18n,contact-modal,story-modal,showcase,particles,…}.js`) — cada IIFE se convierte 1:1, sin refactorizar lógica en el mismo commit.
3. Extraer datos a `/assets/data/{translations,cases,projects}.json`.
4. Partir `styles.css` en `base + components/ + pages/` manteniendo el orden de cascada.
5. Nav/footer compartidos (include JS o build estático de parciales) — migrar página a página.
6. CSS base de marca para propuestas nuevas (las 10 existentes quedan congeladas como landings).

**Regla de oro:** nunca mezclar pasos; cada uno es un commit reversible con smoke-test de las 5 páginas principales (navegación, menú móvil, modales, formularios contra Supabase, cambio de idioma).

## Riesgos a vigilar

- Las contraseñas ya recibidas **persisten en el buzón** hasta purgarlo (riesgo histórico independiente del fix).
- GitHub Pages no permite cabeceras HTTP reales (CSP solo por meta; sin X-Frame-Options/HSTS). Si crece la superficie sensible, considerar Cloudflare Pages/Netlify.
- Cache de GH Pages (`max-age=600` fijo): al cambiar styles/script hay que bumpear `?v=` en TODAS las páginas a la vez.
- El diccionario `translations` duplica el copy del HTML: cambios de texto deben hacerse en ambos sitios hasta extraer `translations.json`.
- Las propuestas con precios pueden estar ya indexadas: además del noindex, solicitar retirada en Search Console; valorar rutas con token para futuras propuestas.
- No hay suite de tests: todo descansa en commits pequeños + smoke-test manual. No saltárselo.
