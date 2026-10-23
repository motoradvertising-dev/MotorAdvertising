/**
 * generate-proposal — Supabase Edge Function (Deno)
 * ----------------------------------------------------------------------------
 * Genera una propuesta comercial de Motor Advertising (JSON que pinta
 * /assets/js/proposal-render.js) a partir del nombre del cliente, los precios
 * y los apuntes del superadmin, tomando como referencia propuestas anteriores.
 * También aplica correcciones a una propuesta existente.
 *
 * Prompt: PROMPT.md (en esta carpeta) es el prompt del sistema, legible y
 * editable; prompt.ts se GENERA desde él con `node tools/sync-prompt.js
 * generate-proposal` antes de desplegar.
 *
 * Se invoca desde Gestión (solo superadmin) con
 * supabase.functions.invoke('generate-proposal', { body }).
 *
 *   modo 'crear':    { cliente, slug?, tipo, idioma, precios, apuntes,
 *                      referencias: [slug…], datos: { marca, nit, sector, ciudad,
 *                      web, contacto, moneda, trm, fecha, vigencia, tono } }
 *   modo 'corregir': { propuesta_id, instruccion }
 *
 * Seguridad:
 *   - El gateway exige JWT válido (verify_jwt = true).
 *   - La función re-verifica el rol superadmin leyendo el perfil con el
 *     propio token del usuario (RLS aplica).
 *   - Guarda con las funciones SQL crear_propuesta / guardar_propuesta
 *     (regla de una versión por día) usando el token del usuario.
 *   - OPENAI_API_KEY vive SOLO en Supabase Secrets.
 *
 * Config (Secrets):
 *   OPENAI_API_KEY          (obligatoria)
 *   OPENAI_PROPOSAL_MODEL   (opcional; default gpt-4.1)
 *
 * Deploy: node tools/sync-prompt.js generate-proposal &&
 *         npx supabase functions deploy generate-proposal --project-ref seeaexvmdvmlbbezuosm --use-api
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { SYSTEM_PROMPT, EJEMPLO } from "./prompt.ts";

// Prompt del sistema + (si hay ejemplo.json) una propuesta real completa como ejemplo de forma.
const SYSTEM = SYSTEM_PROMPT + (EJEMPLO
  ? "\n\n## 10. Ejemplo completo\n\nAsí es una propuesta terminada de la casa (web + closer para una IPS). Es un ejemplo de FORMA: " +
    "estructura, longitud de los textos, tono, uso de los bloques y formato de precios. No copies sus textos, precios, cifras ni datos: " +
    "cada propuesta se escribe desde cero con los apuntes y precios del cliente actual.\n\n" + EJEMPLO
  : "");

const SITE = "https://motoradvertising.co";
const ALLOWED_ORIGINS = new Set<string>([
  "https://motoradvertising.co",
  "https://www.motoradvertising.co",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
]);
const TIPOS = new Set(["web", "marketing", "automatizacion", "comercial", "mixta", "otro"]);
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_REFS = 4;
const MAX_REF_CHARS = 9000;
// El gateway de Supabase corta toda petición a los 150 s. La llamada a OpenAI se
// cancela antes para responder con un mensaje claro (y no guardar nada a medias).
const PRESUPUESTO_MS = 130_000;
const MIN_OPENAI_MS = 25_000;
// Propuestas que sirven de referencia cuando no se indica ninguna.
const REFS_POR_TIPO: Record<string, string[]> = {
  web: ["propuestaflaminioangulo", "propuestarenueva"],
  marketing: ["propuestapauta", "propuestaflaminioangulo"],
  automatizacion: ["juanpaproject", "propuestajfcomerciouniversal"],
  comercial: ["propuestarenueva"],
  mixta: ["propuestaflaminioangulo", "propuestapauta"],
  otro: ["propuestarenueva", "propuestaflaminioangulo"],
};

function corsHeaders(origin: string | null): Record<string, string> {
  const h: Record<string, string> = {
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
    "Access-Control-Max-Age": "86400",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

/* ── Utilidades ─────────────────────────────────────────────────────────── */

function str(v: unknown, max = 500): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// "IPS y CRC Renueva" → "ips-y-crc-renueva"
export function slugify(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/&/g, " y ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

// HTML de una propuesta hecha a mano → texto plano para dárselo al modelo como referencia.
export function htmlATexto(html: string): string {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "";
  const body = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|ul|ol|table|footer)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#0?39;/g, "'")
    .replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return (title ? `TÍTULO: ${title.trim()}\n` : "") + body;
}

// Nombre de cliente de un título "Propuesta · Motor Advertising × Club Gate" → "Club Gate"
function clienteDeTitulo(t: string): string {
  const m = /[×→]\s*(.+)$/.exec(t);
  if (m) return m[1].trim();
  const parts = t.split("·");
  return (parts.length > 1 ? parts.slice(1).join("·") : parts[0]).trim();
}

async function fetchConTimeout(url: string, ms = 10_000): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "MotorAdvertising-generate-proposal" } });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

type Catalogo = { slug: string; titulo: string; cliente: string; origen: "pagina" | "db"; contenido?: unknown };

// Propuestas conocidas: las páginas del sitio (paginas.json) + las de la base de datos.
async function catalogo(supa: ReturnType<typeof createClient>): Promise<Catalogo[]> {
  const out: Catalogo[] = [];
  const res = await fetchConTimeout(`${SITE}/paginas/gestion/paginas.json`, 8_000);
  if (res && res.ok) {
    try {
      const j = await res.json();
      for (const p of (j?.paginas ?? []) as Array<Record<string, unknown>>) {
        if (p.grupo === "propuestas" && typeof p.slug === "string") {
          const titulo = String(p.titulo ?? p.slug);
          out.push({ slug: p.slug, titulo, cliente: clienteDeTitulo(titulo), origen: "pagina" });
        }
      }
    } catch { /* sin catálogo de páginas */ }
  }
  const { data } = await supa.from("propuestas").select("slug, titulo, cliente, contenido").order("created_at", { ascending: false }).limit(60);
  for (const p of (data ?? []) as Array<Record<string, unknown>>) {
    out.push({ slug: String(p.slug), titulo: String(p.titulo || p.cliente), cliente: String(p.cliente), origen: "db", contenido: p.contenido });
  }
  return out;
}

async function textoDeReferencia(c: Catalogo): Promise<string> {
  if (c.origen === "db") {
    return `PROPUESTA (JSON, misma estructura que debes producir) · ${c.titulo}\n` + JSON.stringify(c.contenido).slice(0, MAX_REF_CHARS);
  }
  const res = await fetchConTimeout(`${SITE}/paginas/${c.slug}/`);
  if (!res || !res.ok) return "";
  const html = await res.text();
  if (/http-equiv\s*=\s*["']refresh["']/i.test(html)) return "";
  return `PROPUESTA (texto de la página) · ${c.titulo}\n` + htmlATexto(html).slice(0, MAX_REF_CHARS);
}

function hoyColombia(): { iso: string; largo: string } {
  const d = new Date();
  const iso = d.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  const largo = d.toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "long", year: "numeric" });
  return { iso, largo };
}

// Validación mínima de forma del JSON que devuelve el modelo.
function propuestaValida(p: unknown): p is Record<string, unknown> {
  if (typeof p !== "object" || p === null || Array.isArray(p)) return false;
  const o = p as Record<string, unknown>;
  return typeof o.cliente === "string" && Array.isArray(o.secciones) && o.secciones.length > 0 &&
    typeof o.cierre === "object" && o.cierre !== null;
}

/* ── Servidor ───────────────────────────────────────────────────────────── */

Deno.serve(async (req: Request): Promise<Response> => {
  const inicio = Date.now();
  const origin = req.headers.get("Origin");
  const cors = corsHeaders(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  const json = (status: number, obj: Record<string, unknown>): Response =>
    new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });

  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(403, { error: "Origen no permitido." });
  if (req.method !== "POST") return json(405, { error: "Método no permitido." });

  // ── Auth: sesión válida y rol superadmin ─────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Sesión requerida." });

  const supa = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userErr } = await supa.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: "Sesión inválida o vencida." });
  const { data: me } = await supa.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
  if (!me || me.role !== "superadmin") return json(403, { error: "Solo Motor Advertising puede generar propuestas." });

  // ── Body ─────────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 400_000) return json(413, { error: "Los apuntes son demasiado largos." });
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return json(400, { error: "Cuerpo inválido." });
    body = parsed as Record<string, unknown>;
  } catch {
    return json(400, { error: "Cuerpo inválido." });
  }
  const modo = str(body.modo, 20) || "crear";

  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
  if (!OPENAI_API_KEY) return json(500, { error: "Falta configurar OPENAI_API_KEY en los Secrets de Supabase." });
  const model = Deno.env.get("OPENAI_PROPOSAL_MODEL") || "gpt-4.1";
  const isReasoning = /^(o\d|gpt-5)/i.test(model);

  async function pedirJSON(userText: string): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; res: Response }> {
    // Tiempo que queda antes de que el gateway corte la petición.
    const restante = Math.max(MIN_OPENAI_MS, PRESUPUESTO_MS - (Date.now() - inicio));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), restante);
    const tardo = (): { ok: false; res: Response } => {
      console.error("[generate-proposal] OpenAI: tiempo agotado tras", restante, "ms");
      return { ok: false, res: json(504, { error: `La IA tardó más de ${Math.round(restante / 1000)} segundos y se canceló la generación (no se guardó nada). Intenta de nuevo; si se repite, acorta los apuntes o pide una propuesta más breve.` }) };
    };
    try {
      let aiRes: Response;
      try {
        aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          signal: ctrl.signal,
          headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            ...(isReasoning ? {} : { temperature: 0.4 }),
            // Una propuesta completa ronda los 5.000 tokens; el tope solo frena respuestas desbocadas.
            max_completion_tokens: isReasoning ? 20000 : 10000,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: userText },
            ],
          }),
        });
      } catch (e) {
        if (ctrl.signal.aborted) return tardo();
        console.error("[generate-proposal] red OpenAI:", String(e).slice(0, 200));
        return { ok: false, res: json(502, { error: "No se pudo contactar a OpenAI. Intenta de nuevo." }) };
      }
      if (!aiRes.ok) {
        let detail = "";
        try { detail = await aiRes.text(); } catch { /* sin detalle */ }
        console.error("[generate-proposal] OpenAI HTTP", aiRes.status, detail.slice(0, 400));
        if (aiRes.status === 401) return { ok: false, res: json(502, { error: "La clave de OpenAI es inválida o fue revocada." }) };
        if (aiRes.status === 429) return { ok: false, res: json(502, { error: "OpenAI está limitando las peticiones (sin crédito o demasiadas seguidas). Intenta en un minuto." }) };
        if (aiRes.status === 404 || /model_not_found|does not exist/i.test(detail)) {
          return { ok: false, res: json(502, { error: `El modelo "${model}" no está disponible en tu cuenta de OpenAI. Configura OPENAI_PROPOSAL_MODEL en los Secrets de Supabase.` }) };
        }
        let why = "";
        try { why = String(JSON.parse(detail)?.error?.message ?? "").slice(0, 200); } catch { /* sin detalle */ }
        return { ok: false, res: json(502, { error: `OpenAI respondió con error ${aiRes.status}${why ? `: ${why}` : "."}` }) };
      }
      let parsed: unknown;
      try {
        const ai = await aiRes.json();
        const choice = ai?.choices?.[0];
        if (choice?.finish_reason === "length") {
          return { ok: false, res: json(502, { error: "La respuesta de la IA se cortó por longitud. Acorta los apuntes o pide una propuesta más breve." }) };
        }
        parsed = JSON.parse(choice?.message?.content ?? "");
      } catch (e) {
        if (ctrl.signal.aborted) return tardo();
        console.error("[generate-proposal] JSON IA:", String(e).slice(0, 200));
        return { ok: false, res: json(502, { error: "No se pudo interpretar la respuesta de la IA. Intenta de nuevo." }) };
      }
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        const o = parsed as Record<string, unknown>;
        if (typeof o.error === "string" && !Array.isArray(o.secciones)) {
          return { ok: false, res: json(422, { error: `Falta información para la propuesta: ${o.error.slice(0, 400)}` }) };
        }
      }
      if (!propuestaValida(parsed)) return { ok: false, res: json(502, { error: "La IA devolvió un formato inesperado. Intenta de nuevo." }) };
      return { ok: true, data: parsed };
    } finally {
      clearTimeout(timer);
    }
  }

  const hoy = hoyColombia();

  /* ── Corregir ──────────────────────────────────────────────────────────── */
  if (modo === "corregir") {
    const propuestaId = str(body.propuesta_id, 40);
    const instruccion = str(body.instruccion, 4000);
    if (!/^[0-9a-f-]{36}$/i.test(propuestaId)) return json(400, { error: "propuesta_id inválido." });
    if (instruccion.length < 3) return json(400, { error: "Escribe qué quieres corregir." });

    const { data: p, error: pErr } = await supa.from("propuestas").select("id, slug, cliente, idioma, contenido").eq("id", propuestaId).maybeSingle();
    if (pErr || !p) return json(404, { error: "Esa propuesta no existe." });

    const userText =
      `MODO: CORRECCIÓN de una propuesta existente.\nFecha de hoy (Colombia): ${hoy.largo}.\n` +
      `Devuelve la propuesta COMPLETA con la misma estructura JSON, aplicando únicamente lo que se pide y manteniendo intacto todo lo demás (textos, precios, orden de secciones), salvo lo que haya que ajustar para que la propuesta siga siendo coherente con el cambio (p. ej. un precio que aparece en varias partes).\n\n` +
      `CORRECCIÓN PEDIDA:\n${instruccion}\n\n` +
      `PROPUESTA ACTUAL (JSON):\n${JSON.stringify(p.contenido)}`;

    const r = await pedirJSON(userText);
    if (!r.ok) return r.res;
    // El cliente y el idioma no cambian por una corrección de texto.
    r.data.cliente = typeof r.data.cliente === "string" && r.data.cliente ? r.data.cliente : p.cliente;
    r.data.idioma = p.idioma;

    const { data: v, error: vErr } = await supa.rpc("guardar_propuesta", { p_id: p.id, p_contenido: r.data, p_cambio: instruccion });
    if (vErr) {
      console.error("[generate-proposal] guardar:", vErr.message);
      return json(500, { error: "La corrección se generó pero no se pudo guardar: " + vErr.message });
    }
    return json(200, { propuesta_id: p.id, slug: p.slug, contenido: r.data, version: v });
  }

  /* ── Crear ─────────────────────────────────────────────────────────────── */
  if (modo !== "crear") return json(400, { error: "Modo no reconocido." });

  const cliente = str(body.cliente, 140);
  const tipo = TIPOS.has(str(body.tipo, 20)) ? str(body.tipo, 20) : "otro";
  const idioma = str(body.idioma, 2) === "en" ? "en" : "es";
  const precios = str(body.precios, 6000);
  const apuntes = str(body.apuntes, 24000);
  const datosIn = (typeof body.datos === "object" && body.datos !== null) ? body.datos as Record<string, unknown> : {};
  const datos = {
    marca: str(datosIn.marca, 60), nit: str(datosIn.nit, 40), sector: str(datosIn.sector, 200), ciudad: str(datosIn.ciudad, 80),
    web: str(datosIn.web, 200), contacto: str(datosIn.contacto, 120), moneda: str(datosIn.moneda, 10) || "COP", trm: str(datosIn.trm, 20),
    fecha: str(datosIn.fecha, 40) || hoy.largo, vigencia: str(datosIn.vigencia, 60) || (idioma === "en" ? "two (2) weeks" : "dos (2) semanas"),
    tono: str(datosIn.tono, 600),
  };
  let slug = str(body.slug, 60).toLowerCase() || slugify(cliente);
  if (!cliente) return json(400, { error: "Indica el nombre del cliente." });
  if (!slug) return json(400, { error: "No se pudo formar el enlace a partir del nombre del cliente. Escribe uno en «Más datos › Enlace» (letras minúsculas, números y guiones)." });
  if (!SLUG_RE.test(slug)) return json(400, { error: "El enlace (slug) solo puede llevar letras minúsculas, números y guiones." });
  // Misma regla que el CHECK de la tabla (2 a 60): se valida ANTES de pagar la llamada a OpenAI.
  if (slug.length < 2) return json(400, { error: "El enlace (slug) debe tener al menos 2 letras o números. Ajústalo en «Más datos › Enlace»." });
  if (apuntes.length < 40) return json(400, { error: "Pega tus apuntes de la propuesta (al menos unas líneas): qué se ofrece, alcance y condiciones." });
  if (!precios) return json(400, { error: "Indica los precios (y cómo se pagan)." });

  const refsPedidas = (Array.isArray(body.referencias) ? body.referencias : [])
    .map((s) => str(s, 60).toLowerCase()).filter((s) => SLUG_RE.test(s)).slice(0, MAX_REFS);

  // Referencias: las elegidas + las mencionadas en los apuntes + las de su tipo si no hay ninguna.
  const cat = await catalogo(supa);
  const porSlug = new Map(cat.map((c) => [c.slug, c]));
  const elegidas: string[] = [...refsPedidas];
  const apuntesLow = apuntes.toLowerCase();
  for (const c of cat) {
    if (elegidas.length >= MAX_REFS) break;
    const nombre = c.cliente.toLowerCase();
    if (nombre.length >= 4 && apuntesLow.includes(nombre) && !elegidas.includes(c.slug)) elegidas.push(c.slug);
  }
  if (!elegidas.length) {
    for (const s of REFS_POR_TIPO[tipo] ?? []) if (porSlug.has(s) && elegidas.length < 2) elegidas.push(s);
    if (idioma === "en" && porSlug.has("atlanticcoastproposal") && !elegidas.includes("atlanticcoastproposal")) elegidas.unshift("atlanticcoastproposal");
  }
  const textos = (await Promise.all(elegidas.map((s) => porSlug.has(s) ? textoDeReferencia(porSlug.get(s)!) : Promise.resolve("")))).filter(Boolean);

  // Evitar chocar con una propuesta ya existente: páginas del sitio + TODAS las de la
  // base (el catálogo solo trae las recientes). El sufijo respeta el máximo de 60.
  const ocupados = new Set<string>(cat.map((c) => c.slug));
  const { data: slugsDb, error: slugsErr } = await supa.from("propuestas").select("slug");
  if (slugsErr) return json(500, { error: "No se pudo consultar las propuestas existentes: " + slugsErr.message });
  for (const fila of (slugsDb ?? []) as Array<{ slug: string }>) ocupados.add(fila.slug);
  if (ocupados.has(slug)) {
    let n = 2;
    let candidato = "";
    do {
      const suf = `-${n++}`;
      candidato = slug.slice(0, 60 - suf.length).replace(/-+$/, "") + suf;
    } while (ocupados.has(candidato));
    slug = candidato;
  }

  const userText =
    `MODO: CREAR una propuesta nueva.\nFecha de hoy (Colombia): ${hoy.largo}.\n\n` +
    `DATOS DEL FORMULARIO\n` +
    `- Cliente: ${cliente}\n` +
    (datos.marca ? `- Nombre corto para el titular (× ...): ${datos.marca}\n` : "") +
    (datos.nit ? `- NIT / identificación: ${datos.nit}\n` : "") +
    (datos.sector ? `- Sector / a qué se dedica: ${datos.sector}\n` : "") +
    (datos.ciudad ? `- Ciudad / país: ${datos.ciudad}\n` : "") +
    (datos.web ? `- Sitio web actual: ${datos.web}\n` : "") +
    (datos.contacto ? `- Persona de contacto: ${datos.contacto}\n` : "") +
    `- Tipo de propuesta: ${tipo}\n- Idioma: ${idioma === "en" ? "inglés" : "español"}\n- Moneda principal: ${datos.moneda}${datos.trm ? ` (TRM de referencia ${datos.trm})` : ""}\n` +
    `- Fecha de emisión: ${datos.fecha}\n- Vigencia: ${datos.vigencia}\n` +
    (datos.tono ? `- Tono / enfoque pedido: ${datos.tono}\n` : "") +
    `\nPRECIOS Y CONDICIONES DE PAGO\n${precios}\n\nAPUNTES DE LA PROPUESTA\n${apuntes}\n\n` +
    (textos.length
      ? `PROPUESTAS DE REFERENCIA (${textos.length}) — toma de ellas la estructura, el tono, el nivel de detalle y las condiciones habituales; NO copies precios ni datos de otros clientes:\n\n${textos.join("\n\n-----\n\n")}`
      : `No hay propuestas de referencia disponibles: sigue la estructura y el tono descritos en tus instrucciones.`);

  const r = await pedirJSON(userText);
  if (!r.ok) return r.res;
  r.data.cliente = typeof r.data.cliente === "string" && r.data.cliente ? r.data.cliente : cliente;
  r.data.idioma = idioma;

  const entrada = { cliente, tipo, idioma, precios, apuntes, datos, referencias: elegidas, modelo: model };
  const { data: fila, error: cErr } = await supa.rpc("crear_propuesta", {
    p_slug: slug, p_cliente: cliente, p_tipo: tipo, p_idioma: idioma,
    p_contenido: r.data, p_entrada: entrada, p_referencias: elegidas,
  });
  if (cErr) {
    console.error("[generate-proposal] crear:", cErr.message);
    if (/duplicate|unique/i.test(cErr.message)) return json(409, { error: `Ya existe una propuesta con el enlace "${slug}". Cambia el enlace e intenta de nuevo.`, contenido: r.data });
    if (/propuestas_slug_check/i.test(cErr.message)) return json(400, { error: `El enlace "${slug}" no cumple las reglas (2 a 60 caracteres, minúsculas, números y guiones). Cambia el enlace e intenta de nuevo.`, contenido: r.data });
    return json(500, { error: "La propuesta se generó pero no se pudo guardar: " + cErr.message, contenido: r.data });
  }
  return json(200, { propuesta: fila, contenido: r.data, referencias: elegidas });
});
