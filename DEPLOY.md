# Despliegue: Motor Advertising (GitHub Pages + Supabase + Resend)

Esta guía despliega el sitio en GitHub Pages y procesa los formularios con una
**Supabase Edge Function** que envía correos vía **Resend** a
`motoradvertisingservice@gmail.com`.

**Arquitectura final:**
- Sitio estático (HTML/CSS/JS) → GitHub Pages en `motoradvertising.co` (+ `www`).
- Formularios → `POST https://<TU-PROYECTO>.supabase.co/functions/v1/contact-form`.
- Correo → Resend (desde la Edge Function) hacia `motoradvertisingservice@gmail.com`.

Hostinger se usa **solo para el DNS** (tienes el dominio ahí). No necesitas plan de
hosting. No se usa Node, Railway, PHP, Cloudflare, Vercel ni Netlify.

---

## FASE 0 · Subir el código a GitHub (en tu PC)

```bash
git add -A
git commit -m "Migrar formularios a Supabase Edge Function + Resend; sitio a GitHub Pages"
git push origin principal
```

> `RESEND_API_KEY` nunca se sube: vive como *secret* en Supabase (Fase 4).

---

## FASE 1 · Activar GitHub Pages

1. Repo en GitHub → **Settings → Pages**.
2. **Source**: "Deploy from a branch".
3. **Branch**: `principal`, carpeta **`/ (root)`** → **Save**.
4. **Custom domain**: confirma `motoradvertising.co` (lo toma del archivo CNAME).
5. Marca **Enforce HTTPS** (tarda unos minutos en emitir el certificado).

---

## FASE 2 · DNS en Hostinger → apuntar el dominio a GitHub Pages

Hostinger → **Dominios → DNS / Nameservers** (Zona DNS de `motoradvertising.co`).

Primero **borra** los registros A/AAAA/CNAME del apex (`@`) y `www` que apunten a
Railway o al hosting viejo. Luego crea:

**Apex (motoradvertising.co):**

| Tipo | Nombre | Valor             | TTL    |
|------|--------|-------------------|--------|
| A    | @      | 185.199.108.153   | 14400  |
| A    | @      | 185.199.109.153   | 14400  |
| A    | @      | 185.199.110.153   | 14400  |
| A    | @      | 185.199.111.153   | 14400  |

**www:**

| Tipo  | Nombre | Valor                          | TTL   |
|-------|--------|--------------------------------|-------|
| CNAME | www    | `motoradvertising-dev.github.io.` | 14400 |

> Ya NO necesitas crear el subdominio `forms.` — eso era para el PHP. Con Supabase
> no hace falta tocar nada más en el DNS aparte de lo de arriba.

---

## FASE 3 · Crear el proyecto en Supabase

1. Entra a https://supabase.com → **New project** (gratis).
   - Anota el **Project Ref** (la cadena de tu URL, p. ej. `abcd1234efgh`).
   - Tu endpoint será: `https://<PROJECT-REF>.supabase.co/functions/v1/contact-form`.

---

## FASE 4 · Desplegar la Edge Function + configurar el secret

Puedes hacerlo por **CLI** (recomendado) o por **Dashboard**.

### Opción A — CLI (recomendado)

Requiere [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
# 1. Inicia sesión y enlaza el proyecto
supabase login
supabase link --project-ref <PROJECT-REF>

# 2. Guarda la API key de Resend como SECRET (server-side, nunca en el repo)
#    (genera la key primero en Resend — FASE 5, paso 1; puedes re-ejecutar
#     este comando luego sin volver a desplegar)
supabase secrets set RESEND_API_KEY=re_TU_CLAVE_REAL
supabase secrets set RESEND_FROM_EMAIL="Motor Advertising <no-reply@motoradvertising.co>"

# 3. Despliega la función (verify_jwt=false ya está en supabase/config.toml)
supabase functions deploy contact-form
```

> ⚠️ **Docker**: por defecto `functions deploy` empaqueta con Docker (Docker Desktop
> debe estar corriendo). Si no tienes Docker, añade el flag `--use-api` para que el
> empaquetado lo haga el servidor: `supabase functions deploy contact-form --use-api`.

### Opción B — Dashboard (sin CLI)

1. Supabase → **Edge Functions** → **Create a function** → nombre `contact-form`.
2. Pega el contenido de `supabase/functions/contact-form/index.ts`.
3. En la configuración de la función, **desactiva "Verify JWT"** (debe quedar público).
4. Supabase → **Project Settings → Edge Functions → Secrets** (o **Settings → Functions**)
   y añade:
   - `RESEND_API_KEY` = `re_TU_CLAVE_REAL`
   - `RESEND_FROM_EMAIL` = `Motor Advertising <no-reply@motoradvertising.co>`
5. Guarda y despliega.

### Conectar el frontend

En `script.js` y en `paginas/creacion-de-cuenta/index.html` hay DOS constantes en
cada archivo. Reemplaza ambos placeholders:

```js
const FORM_ENDPOINT = 'https://<PROJECT-REF>.supabase.co/functions/v1/contact-form';
const SUPABASE_ANON_KEY = '<TU_ANON_KEY>';
```

- `<PROJECT-REF>`: el ref de tu proyecto (FASE 3).
- `<TU_ANON_KEY>`: Supabase → **Project Settings → API → Project API keys → `anon` `public`**.
  Esta key es **pública por diseño** (viaja en cualquier app con Supabase); NO es secreta.
  El gateway de Supabase la exige para enrutar la petición al endpoint público.

Vuelve a hacer commit y push tras este cambio.

---

## FASE 5 · Verificar el dominio en Resend (clave para que llegue el correo)

⚠️ Sin esto, los formularios dirán "enviado" pero **el correo nunca llega**.

1. Resend → **API Keys**: genera la key que pusiste como secret en Supabase.
2. Resend → **Domains → Add Domain**: agrega `motoradvertising.co`.
3. Copia los registros **DKIM**, **SPF** (y opcional **DMARC**) **exactamente** como los
   muestra Resend, en la Zona DNS de Hostinger, en el host que indique (no asumas `@`).
   - **DKIM es bloqueante**: sin él el dominio no se verifica.
   - **DMARC (recomendado)**: TXT en `_dmarc` →
     `v=DMARC1; p=none; rua=mailto:motoradvertisingservice@gmail.com`.
4. Espera a que el dominio figure **"Verified" (verde)** en Resend antes de producción.

> El `from` debe ser `no-reply@motoradvertising.co` (dominio verificado). **No** uses
> `onboarding@resend.dev` en producción (solo envía al email dueño de la cuenta Resend).

---

## FASE 6 · Probar

1. **Preflight CORS** (debe responder 204):

   ```bash
   curl -i -X OPTIONS https://<PROJECT-REF>.supabase.co/functions/v1/contact-form \
     -H "Origin: https://motoradvertising.co" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type"
   ```

2. **Envío empresa** (debe responder `{"success":true,...}` y llegar el correo). Incluye
   la anon key en el header `apikey`:

   ```bash
   curl -i -X POST https://<PROJECT-REF>.supabase.co/functions/v1/contact-form \
     -H "Origin: https://motoradvertising.co" \
     -H "Content-Type: application/json" \
     -H "apikey: <TU_ANON_KEY>" \
     -d '{"type":"empresa","name":"Test","email":"test@ejemplo.com","company":"ACME","message":"Hola"}'
   ```

   > Si recibes **401 Unauthorized**, la función NO quedó pública: revisa que
   > `verify_jwt = false` esté aplicado (config.toml en deploy por CLI, o el toggle
   > "Verify JWT" desactivado en el Dashboard) y que estés enviando el header `apikey`.

3. **En el sitio real**: abre `https://motoradvertising.co`, envía el modal de contacto
   y el de creación-de-cuenta. En la consola del navegador (F12) NO debe haber error CORS.
4. Revisa la bandeja de `motoradvertisingservice@gmail.com`. Si cae en Spam/Promociones
   las primeras veces (normal en dominio nuevo), márcalo "No es spam" y muévelo a Principal.

---

## ⚠️ Cosas importantes a tener en cuenta

- **El plan free de Supabase pausa el proyecto tras ~7 días sin actividad.** Si los
  formularios quedan callados varios días, el primer envío tras la pausa puede fallar
  hasta reactivar el proyecto. Mitigaciones: un ping/cron periódico al endpoint, o el
  plan de pago ($25/mes). Tenlo presente para un formulario de contacto de negocio.
- **El rate-limit de la función es best-effort** (en memoria del isolate; se reinicia si
  Supabase recicla el isolate). El honeypot + la validación + CORS son la protección
  principal. Si necesitas un límite estricto, habría que persistirlo en la BD de Supabase.
- **Contraseñas del form de cuenta**: esta función es *email-only* (no guarda en BD), así
  que las contraseñas no se persisten; viajan por HTTPS y llegan a Gmail en claro. Trata
  ese buzón como sensible (2FA, acceso restringido). **Recomendación fuerte**: dejar de
  pedir contraseñas y usar accesos delegados (Meta Business Manager, App Passwords de
  Google, OAuth).
- **Tras migrar**: apaga el servicio en Railway, borra sus logs (registraban contraseñas
  en texto plano) y revoca la API key que estuviera en sus variables de entorno.
