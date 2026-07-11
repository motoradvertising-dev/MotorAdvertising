/**
 * contact-form  —  Supabase Edge Function (Deno)
 * ----------------------------------------------------------------------------
 * Manejador unico de formularios para Motor Advertising.
 * Sustituye al backend Node/Express de Railway. Corre en Supabase Edge Functions
 * y se invoca desde el sitio estatico (GitHub Pages):
 *   POST https://<TU-PROYECTO>.supabase.co/functions/v1/contact-form
 *
 * Soporta tres tipos de formulario (campo "type" en el body JSON):
 *   - "empresa"     -> contacto de empresa (name, email, company, message)
 *   - "profesional" -> contacto profesional (name, email, role, portfolio, experience)
 *   - "cuenta"      -> creacion de cuenta (negocio, gmail, contrasena_gmail, ...)
 *
 * Envia el correo via Resend a motoradvertisingservice@gmail.com.
 * La API key NUNCA va en el repo ni en el frontend: se lee de un SECRET de
 * Supabase (RESEND_API_KEY). Ver DEPLOY.md.
 *
 * Seguridad incluida:
 *   - CORS cross-origin con allowlist (apex + www) y manejo de preflight OPTIONS.
 *   - Honeypot anti-spam (campo oculto "_gotcha").
 *   - Validacion de campos requeridos por tipo + email/URL (http/https).
 *   - Escapado HTML de TODO valor que entra al correo.
 *   - Rate-limit por IP best-effort en memoria (30 envios / 10 min).
 *   - Limite de tamano del body (64 KB).
 *   - Las contrasenas llegan SOLO en el body POST sobre HTTPS; nunca se loguean.
 *
 * NOTA: esta funcion NO guarda datos en base de datos (email-only), por lo que
 * las contrasenas del formulario "cuenta" no se persisten.
 * ----------------------------------------------------------------------------
 */

const ALLOWED_ORIGINS = new Set<string>([
  "https://motoradvertising.co",
  "https://www.motoradvertising.co",
  // Desarrollo local (opcional; quitar en produccion si se desea).
  "http://localhost:8080",
  "http://127.0.0.1:8080",
]);

const NOTIFY_TO = "motoradvertisingservice@gmail.com";

// ── CORS ──────────────────────────────────────────────────────────────────
function corsHeaders(origin: string | null): Record<string, string> {
  const h: Record<string, string> = {
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    // "apikey" es necesario: el gateway de Supabase exige la anon key (publica)
    // en cada peticion; el navegador la incluye en el preflight.
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
    "Access-Control-Max-Age": "86400",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
  }
  return h;
}

// ── Rate limit best-effort (en memoria del isolate) ─────────────────────────
const RL_WINDOW = 600_000; // 10 min en ms
const RL_MAX = 30;
const rlMap = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (rlMap.get(ip) ?? []).filter((t) => now - t < RL_WINDOW);
  if (arr.length >= RL_MAX) {
    rlMap.set(ip, arr);
    return true;
  }
  arr.push(now);
  rlMap.set(ip, arr);
  return false;
}

// ── Helpers de validacion / escape ──────────────────────────────────────────
function validEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
function validUrl(u: string): boolean {
  try {
    const proto = new URL(u).protocol.toLowerCase();
    return proto === "http:" || proto === "https:";
  } catch {
    return false;
  }
}
function esc(s: string): string {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

Deno.serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("Origin");
  const cors = corsHeaders(origin);

  // Preflight: responder SIN logica de correo.
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  const json = (status: number, obj: Record<string, unknown>): Response =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
    });

  // Origen presente pero NO permitido: cortar (defensa en profundidad).
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json(403, { success: false, message: "Origen no permitido." });
  }
  if (req.method !== "POST") {
    return json(405, { success: false, message: "Metodo no permitido." });
  }

  // Rate-limit por IP (best-effort; el isolate puede reciclarse).
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (rateLimited(ip)) {
    return json(429, { success: false, message: "Demasiadas solicitudes, por favor intenta mas tarde." });
  }

  // Parseo del body con limite de tamano (corte temprano por Content-Length
  // y verificacion real por bytes UTF-8, no por unidades UTF-16).
  const MAX_BODY = 65536;
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY) {
    return json(413, { success: false, message: "Cuerpo demasiado grande." });
  }
  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY) {
      return json(413, { success: false, message: "Cuerpo demasiado grande." });
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("not an object");
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return json(400, { success: false, message: "Cuerpo de la solicitud invalido." });
  }

  // Honeypot: si viene relleno, es un bot. Exito falso (no revelar la trampa).
  if (body._gotcha) {
    return json(200, { success: true, message: "Informacion recibida." });
  }

  const type = typeof body.type === "string" ? body.type.trim() : "";
  const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));

  let typeLabel = "";
  let fields: Record<string, string> = {};

  // Cita agendada (opcional, formularios empresa/profesional).
  // Solo se acepta con formato estricto para evitar basura en el correo.
  function citaSolicitada(): string {
    const f = str(body.fecha_cita).trim();
    const h = str(body.hora_cita).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(h)) return "";
    const d = new Date(f + "T12:00:00");
    if (isNaN(d.getTime())) return "";
    // Rechazar rollover del motor de fechas (p.ej. 2026-02-31 -> 3 de marzo).
    const [yy, mm, dd] = f.split("-").map(Number);
    if (d.getFullYear() !== yy || d.getMonth() + 1 !== mm || d.getDate() !== dd) return "";
    const pretty = d.toLocaleDateString("es-CO", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    return `${pretty} a las ${h} (hora Colombia)`;
  }

  if (type === "empresa") {
    typeLabel = "Empresa";
    const name = str(body.name).trim();
    const email = str(body.email).trim();
    const company = str(body.company).trim();
    const message = str(body.message).trim();
    if (!name || !email || !company || !message) {
      return json(400, { success: false, message: "Todos los campos son obligatorios." });
    }
    if (!validEmail(email)) {
      return json(400, { success: false, message: "Email invalido." });
    }
    fields = { name, email, company, message };
    const cita = citaSolicitada();
    if (cita) fields.cita_solicitada = cita;
  } else if (type === "profesional") {
    typeLabel = "Profesional";
    const name = str(body.name).trim();
    const email = str(body.email).trim();
    const role = str(body.role).trim();
    const portfolio = str(body.portfolio).trim();
    const experience = str(body.experience).trim();
    if (!name || !email || !role || !portfolio || !experience) {
      return json(400, { success: false, message: "Todos los campos son obligatorios." });
    }
    if (!validEmail(email)) {
      return json(400, { success: false, message: "Email invalido." });
    }
    if (!validUrl(portfolio)) {
      return json(400, { success: false, message: "URL de portafolio invalida." });
    }
    fields = { name, email, role, portfolio, experience };
    const cita = citaSolicitada();
    if (cita) fields.cita_solicitada = cita;
  } else if (type === "cuenta") {
    typeLabel = "Creacion de Cuenta";
    const negocio = str(body.negocio).trim();
    if (!negocio || negocio === "No especificado") {
      return json(400, { success: false, message: "El nombre del negocio es obligatorio." });
    }
    fields = {
      negocio,
      gmail: str(body.gmail ?? "No especificado").trim(),
      contrasena_gmail: str(body.contrasena_gmail ?? "No especificado"),
      celular: str(body.celular ?? "No especificado").trim(),
      instagram: str(body.instagram ?? "No especificado").trim(),
      contrasena_instagram: str(body.contrasena_instagram ?? "No especificado"),
      pagina_facebook: str(body.pagina_facebook ?? "No especificado").trim(),
      sitio_web: str(body.sitio_web ?? "No especificado").trim(),
    };
  } else {
    return json(400, { success: false, message: "Tipo de formulario no valido." });
  }

  // ── Construccion del correo ───────────────────────────────────────────────
  const requestId = crypto.randomUUID();
  const subject = fields.cita_solicitada
    ? `[Motor Contact] Nueva CITA · ${typeLabel}`
    : `[Motor Contact] Nuevo perfil: ${typeLabel}`;
  const fecha = new Date().toISOString();

  let rowsHtml = "";
  const textLines: string[] = [
    `Nueva solicitud de contacto: ${typeLabel}`,
    `ID de solicitud: ${requestId}`,
    `Fecha: ${fecha}`,
    "-".repeat(40),
  ];
  for (const [key, value] of Object.entries(fields)) {
    rowsHtml += `<p><strong>${esc(key)}:</strong> ${esc(value)}</p>`;
    textLines.push(`${key}: ${value}`);
  }
  const html = `
        <h2>Nueva solicitud de contacto: ${esc(typeLabel)}</h2>
        <p><strong>ID de solicitud:</strong> ${esc(requestId)}</p>
        <p><strong>Fecha:</strong> ${esc(fecha)}</p>
        <hr>
        ${rowsHtml}
    `;
  const text = textLines.join("\n");

  const replyTo = fields.email && validEmail(fields.email) ? fields.email : "";

  // ── Envio via Resend ──────────────────────────────────────────────────────
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
  const RESEND_FROM = Deno.env.get("RESEND_FROM_EMAIL") ??
    "Motor Advertising <no-reply@motoradvertising.co>";

  let emailSent = false;
  let emailError = "";
  if (RESEND_API_KEY !== "") {
    const payload: Record<string, unknown> = {
      from: RESEND_FROM, // DEBE ser de un dominio VERIFICADO en Resend.
      to: [NOTIFY_TO],
      subject,
      html,
      text,
    };
    if (replyTo) payload.reply_to = replyTo;

    for (let attempt = 0; attempt < 2 && !emailSent; attempt++) {
      try {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (r.ok) {
          emailSent = true;
        } else {
          // 403 tipico = dominio NO verificado en Resend.
          emailError = `HTTP ${r.status} ${await r.text()}`;
          if (attempt === 0) await new Promise((res) => setTimeout(res, 2000));
        }
      } catch (e) {
        emailError = String(e);
        if (attempt === 0) await new Promise((res) => setTimeout(res, 2000));
      }
    }
  } else {
    emailError = "RESEND_API_KEY no configurada";
  }

  // Log de respaldo SIN contrasenas.
  if (!emailSent) {
    console.error(`[Motor Contact] Email NO enviado (${emailError}) tipo=${typeLabel} id=${requestId}`);
  }

  // ── Respuesta al cliente (fire-and-forget para el form de cuenta) ──────────
  const message = (type === "cuenta")
    ? "Informacion recibida. Tu asesor ha sido notificado."
    : "Informacion recibida. Nuestro equipo te contactara pronto.";
  return json(200, { success: true, message, requestId });
});
