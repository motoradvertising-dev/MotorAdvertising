/**
 * generate-report — Supabase Edge Function (Deno)
 * ----------------------------------------------------------------------------
 * Genera un reporte profesional de pauta a partir de métricas en texto libre,
 * usando la API de OpenAI (ChatGPT). Se invoca desde Gestión → Perfil de
 * usuario (solo superadmin) con supabase.functions.invoke('generate-report').
 *
 * Seguridad:
 *   - El gateway exige JWT válido (verify_jwt = true, default).
 *   - La función re-verifica que el usuario sea superadmin leyendo su perfil
 *     con SU PROPIO token (RLS aplica).
 *   - OPENAI_API_KEY vive SOLO en Supabase Secrets, nunca en el repo/frontend.
 *   - El reporte se guarda en pauta_reports con el token del usuario (RLS:
 *     solo superadmin puede insertar).
 *
 * Config (Dashboard → Edge Functions → Secrets):
 *   OPENAI_API_KEY  = sk-...            (obligatoria)
 *   OPENAI_MODEL    = gpt-4o-mini       (opcional; default gpt-4o-mini)
 *
 * Deploy: npx supabase functions deploy generate-report --project-ref seeaexvmdvmlbbezuosm --use-api
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set<string>([
  "https://motoradvertising.co",
  "https://www.motoradvertising.co",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const h: Record<string, string> = {
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
    "Access-Control-Max-Age": "86400",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
  }
  return h;
}

const SYSTEM_PROMPT = `Eres un analista senior de paid media de Motor Advertising, una agencia de marketing digital. Recibirás las métricas de pauta de un cliente correspondientes a un período: pueden venir como CAPTURAS DE PANTALLA de los administradores de anuncios (Meta Ads, Google Ads, TikTok, etc.) y/o como texto libre. Lee y extrae con precisión TODOS los datos visibles en las imágenes (tablas, cifras, gráficos, nombres de campañas, fechas).

Tu tarea: producir un reporte ejecutivo profesional en ESPAÑOL, y responder EXCLUSIVAMENTE con un objeto JSON válido (sin markdown, sin texto extra) con EXACTAMENTE esta estructura:

{
  "titulo": "string — título del reporte, ej: 'Reporte de Pauta — Abril 2026'",
  "periodo": "string — el período reportado",
  "resumen_ejecutivo": "string — 3 a 5 frases con la lectura estratégica del mes, en tono profesional y claro para un dueño de negocio",
  "kpis": [
    { "label": "string corto, ej 'Inversión total'", "valor": "string con formato, ej '$2.450.000' o '3.2%'", "delta": "string opcional vs período anterior, ej '+12%' (vacío si no hay dato)", "tendencia": "up | down | flat" }
  ],
  "graficas": [
    { "tipo": "bar | line | doughnut", "titulo": "string", "etiquetas": ["string"], "series": [ { "nombre": "string", "datos": [number] } ] }
  ],
  "hallazgos": ["string — 3 a 5 hallazgos concretos basados en los datos"],
  "recomendaciones": ["string — 3 a 5 recomendaciones accionables para el próximo período"],
  "conclusion": "string — cierre de 2 a 3 frases"
}

Reglas:
- Usa SOLO los datos presentes en las métricas; nunca inventes cifras. Si un dato no está, omite ese KPI o gráfica.
- Entre 4 y 6 KPIs, entre 2 y 4 gráficas. En "doughnut" usa una sola serie.
- Conserva la moneda y el formato numérico del input.
- Los números de "datos" deben ser numéricos puros (sin símbolos).
- Si las métricas comparan campañas/anuncios/plataformas, aprovecha eso en las gráficas.
- Tono: profesional, directo, orientado a resultados; sin tecnicismos innecesarios.`;

Deno.serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("Origin");
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  const json = (status: number, obj: Record<string, unknown>): Response =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
    });

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json(403, { error: "Origen no permitido." });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Método no permitido." });
  }

  // ── Auth: usuario con sesión y rol superadmin ─────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json(401, { error: "Sesión requerida." });
  }

  const supa = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userErr } = await supa.auth.getUser();
  if (userErr || !userData?.user) {
    return json(401, { error: "Sesión inválida o vencida." });
  }

  const { data: me, error: meErr } = await supa
    .from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
  if (meErr || !me || me.role !== "superadmin") {
    return json(403, { error: "Solo Motor Advertising puede generar reportes." });
  }

  // ── Body ──────────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    // Las capturas viajan como data-URLs base64: cuerpo grande permitido.
    if (raw.length > 18_000_000) return json(413, { error: "Las capturas pesan demasiado. Sube máximo 6 imágenes." });
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: "Cuerpo inválido." });
  }

  const profileId = String(body.profile_id ?? "").trim();
  const periodo = String(body.periodo ?? "").trim();
  const metricas = String(body.metricas ?? "").trim().slice(0, 20_000);
  const imagenes = Array.isArray(body.imagenes) ? body.imagenes : [];
  if (!/^[0-9a-f-]{36}$/i.test(profileId)) return json(400, { error: "profile_id inválido." });
  if (!periodo) return json(400, { error: "Indica el período del reporte." });
  if (imagenes.length === 0 && metricas.length < 30) {
    return json(400, { error: "Pega al menos una captura de las métricas o escribe los datos del mes." });
  }
  if (imagenes.length > 6) return json(400, { error: "Máximo 6 capturas por reporte." });
  for (const img of imagenes) {
    if (typeof img !== "string" || !/^data:image\/(png|jpe?g|webp);base64,/.test(img)) {
      return json(400, { error: "Formato de imagen no válido (usa PNG, JPG o WebP)." });
    }
    if (img.length > 6_000_000) return json(413, { error: "Una de las capturas pesa demasiado (máx ~4MB cada una)." });
  }

  // Nombre del cliente para el título del reporte.
  const { data: target } = await supa
    .from("profiles").select("full_name, email").eq("id", profileId).maybeSingle();
  if (!target) return json(404, { error: "Ese perfil no existe." });
  const clientName = target.full_name || target.email || "Cliente";

  // ── OpenAI ────────────────────────────────────────────────────────────────
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
  if (!OPENAI_API_KEY) {
    return json(500, { error: "Falta configurar OPENAI_API_KEY en los Secrets de Supabase." });
  }
  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

  // Contenido multimodal: texto + capturas de pantalla (si las hay).
  const userContent: Array<Record<string, unknown>> = [{
    type: "text",
    text: `Cliente: ${clientName}\nPeríodo: ${periodo}\n\n` +
      (imagenes.length
        ? `Adjunto ${imagenes.length} captura(s) de pantalla con las métricas del período. Extrae los datos de las imágenes.` +
          (metricas ? `\n\nDatos/notas adicionales en texto:\n${metricas}` : "")
        : `Métricas del período:\n${metricas}`),
  }];
  for (const img of imagenes) {
    userContent.push({ type: "image_url", image_url: { url: img, detail: "high" } });
  }

  let report: Record<string, unknown>;
  try {
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 3500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text();
      console.error("[generate-report] OpenAI HTTP", aiRes.status, detail.slice(0, 400));
      if (aiRes.status === 401) return json(502, { error: "La clave de OpenAI es inválida o fue revocada." });
      if (aiRes.status === 429) return json(502, { error: "OpenAI está limitando las peticiones (sin crédito o demasiadas seguidas). Intenta en un minuto." });
      return json(502, { error: `OpenAI respondió con error ${aiRes.status}.` });
    }

    const ai = await aiRes.json();
    const content = ai?.choices?.[0]?.message?.content ?? "";
    report = JSON.parse(content);
  } catch (e) {
    console.error("[generate-report] fallo IA:", String(e).slice(0, 300));
    return json(502, { error: "No se pudo interpretar la respuesta de la IA. Intenta de nuevo." });
  }

  // Validación mínima de forma.
  if (typeof report !== "object" || report === null ||
      typeof report.titulo !== "string" || !Array.isArray(report.kpis) ||
      !Array.isArray(report.graficas)) {
    return json(502, { error: "La IA devolvió un formato inesperado. Intenta de nuevo." });
  }

  // ── Guardar (RLS: solo superadmin inserta) ────────────────────────────────
  const { data: saved, error: saveErr } = await supa
    .from("pauta_reports")
    .insert({
      profile_id: profileId,
      periodo,
      // Las imágenes no se almacenan (pesan mucho); queda constancia de cuántas fueron.
      metricas_raw: (imagenes.length ? `[${imagenes.length} captura(s) de pantalla adjunta(s)]\n` : "") + metricas,
      report,
      created_by: userData.user.id,
    })
    .select("id, created_at")
    .single();

  if (saveErr) {
    console.error("[generate-report] no se guardó:", saveErr.message);
    // El reporte se devuelve igual aunque no se haya podido guardar.
    return json(200, { report, saved: false });
  }

  return json(200, { report, saved: true, id: saved.id, created_at: saved.created_at });
});
