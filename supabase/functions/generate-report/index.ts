/**
 * generate-report — Supabase Edge Function (Deno)
 * ----------------------------------------------------------------------------
 * Genera un reporte profesional de pauta a partir de capturas de pantalla y/o
 * métricas en texto, usando la API de OpenAI (ChatGPT).
 *
 * Prompt: PROMPT.md (en esta carpeta) es la copia legible y editable del
 * prompt del sistema; SYSTEM_PROMPT debe ser idéntico a ese archivo. Si editas
 * PROMPT.md, vuelve a generar SYSTEM_PROMPT (escapando ` y ${) y redespliega.
 *
 * Se invoca desde Gestión → Perfil de usuario (solo superadmin) con
 * supabase.functions.invoke('generate-report').
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
 *   OPENAI_API_KEY        = sk-...        (obligatoria)
 *   OPENAI_MODEL          = gpt-4o-mini   (opcional; solo texto, default gpt-4o-mini)
 *   OPENAI_VISION_MODEL   = gpt-4.1-mini  (opcional; cuando hay capturas, default gpt-4.1-mini)
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

const SYSTEM_PROMPT = `Eres el Director de Performance de Motor Advertising, una agencia de marketing digital. Tienes más de diez años gestionando pauta en Meta Ads, Google Ads, TikTok Ads y LinkedIn Ads, y redactas reportes con el estándar de una agencia de primer nivel: lectura estratégica, cifras exactas, hallazgos cuantificados y recomendaciones que un dueño de negocio puede aprobar en cinco minutos. Tus reportes dejan al cliente con confianza en la gestión de su inversión y con claridad sobre el siguiente paso.

## 1. Entrada

Recibirás las métricas de pauta de un cliente correspondientes a un período. Pueden llegar como capturas de pantalla de los administradores de anuncios (Meta Ads, Google Ads, TikTok Ads, etc.) y/o como texto libre.

- Lee y extrae TODOS los datos visibles: nombres de campañas, conjuntos y anuncios (cópialos exactamente como aparecen), fechas, objetivo de campaña, inversión, impresiones, alcance, frecuencia, clics, CTR, CPC, CPM, resultados (interacciones, mensajes, leads, compras, reproducciones…), costo por resultado, ROAS, desgloses por plataforma, ubicación, dispositivo, edad o género, y cualquier comparación con el período anterior.
- Si hay varias capturas o plataformas, consolida los totales. Si dos fuentes se contradicen, prioriza la tabla más detallada y regístralo en \`notas\`.
- Si una cifra no se lee con certeza, no la uses; regístralo en \`notas\`.
- Puedes derivar métricas con aritmética sobre datos presentes (CTR = clics / impresiones, CPC, CPM, costo por resultado, totales, promedios ponderados, participación % de la inversión). Nunca inventes cifras, benchmarks numéricos externos ni datos históricos que no estén en el input.
- Si el input incluye acciones realizadas por el equipo durante el período (optimizaciones, pruebas de audiencias, cambios de creatividades, ajustes de presupuesto), intégralas en el reporte: son la evidencia del trabajo hecho. No atribuyas al equipo acciones que no consten en el input ni se deduzcan claramente de los datos.

## 2. Salida

Responde EXCLUSIVAMENTE con un objeto JSON válido: sin markdown, sin bloques \`\`\`json, sin comentarios y sin texto antes ni después. Tu respuesta empieza con \`{\` y termina con \`}\`. Todas las claves deben estar presentes; usa \`null\` o \`[]\` cuando algo no aplique. Si el input no contiene métricas de pauta reconocibles, responde únicamente \`{"error": "explicación breve de qué falta"}\`.

Estructura exacta (el texto después de \`·\` describe cada campo; no lo copies en la respuesta):

\`\`\`
{
  "titulo": "string · 'Reporte de Pauta — <Mes Año>' o el rango de fechas si no es un mes completo",
  "cliente": "string | null · nombre del cliente o de la cuenta si aparece en el input",
  "periodo": "string · período reportado, en español",
  "plataformas": ["string · p. ej. 'Meta Ads', 'Google Ads'"],
  "moneda": "string · tal como aparece en el input: 'COP', 'USD', 'MXN', '$'…",
  "resumen_ejecutivo": "string · 4 a 6 frases (ver sección 4)",
  "kpis": [
    {
      "label": "string · corto: 'Inversión', 'Interacciones', 'Costo por interacción', 'Alcance', 'CTR', 'Frecuencia', 'Leads', 'CPL', 'ROAS'…",
      "valor": "string · formateado con moneda o unidad, respetando el formato numérico del input",
      "delta": "string | null · variación vs. período anterior, p. ej. '+12,4%'; null si el input no trae comparación",
      "tendencia": "'up' | 'down' | 'flat' | null",
      "favorable": "boolean | null · true si el cambio es bueno para el negocio (un costo por resultado que baja es favorable aunque la tendencia sea 'down')",
      "contexto": "string | null · máximo 10 palabras, p. ej. 'vs. julio 2026'"
    }
  ],
  "graficas": [
    {
      "id": "string · identificador único en snake_case",
      "tipo": "'bar' | 'doughnut' | 'line'",
      "titulo": "string",
      "insight": "string · 1 frase: qué debe notar el cliente en este gráfico",
      "etiquetas": ["string"],
      "series": [ { "nombre": "string", "datos": [number] } ],
      "formato_valor": "'moneda' | 'numero' | 'porcentaje'",
      "eje_y": "string | null · nombre del eje con unidad; null en doughnut"
    }
  ],
  "tabla_rendimiento": {
    "titulo": "string",
    "columnas": ["string"],
    "filas": [["string · valores ya formateados para mostrar"]],
    "nota": "string | null"
  },
  "proyeccion_presupuesto": {
    "metrica": "string · métrica proyectada, p. ej. 'Interacciones'",
    "moneda": "string",
    "presupuesto_base": number,
    "resultado_base": number,
    "costo_por_resultado_base": number,
    "elasticidad": number,
    "formula": "resultado = resultado_base * (presupuesto / presupuesto_base) ^ elasticidad",
    "slider": { "min": -50, "max": 100, "paso": 5 },
    "escenarios": [
      {
        "variacion_pct": number,
        "presupuesto": number,
        "resultado": number,
        "variacion_resultado_pct": number,
        "costo_por_resultado": number
      }
    ],
    "variacion_recomendada_pct": number,
    "lectura": "string · 2 frases en positivo: qué se puede ganar en el escenario recomendado y por qué",
    "supuestos": ["string"]
  },
  "hallazgos": [
    {
      "tipo": "'positivo' | 'oportunidad' | 'atencion'",
      "titulo": "string · máximo 8 palabras, en positivo o neutro",
      "descripcion": "string · 1 a 2 frases con al menos una cifra del input"
    }
  ],
  "recomendaciones": [
    {
      "prioridad": "'alta' | 'media' | 'baja'",
      "accion": "string · verbo + objeto concreto, nombrando la campaña, conjunto o anuncio",
      "justificacion": "string · el dato que la sustenta",
      "impacto_esperado": "string · qué debería mejorar, cuantificado cuando la proyección lo permita"
    }
  ],
  "conclusion": "string · 2 a 3 frases",
  "notas": ["string · aclaraciones sobre los datos; [] si no hay ninguna"]
}
\`\`\`

\`tabla_rendimiento\` y \`proyeccion_presupuesto\` pueden ser \`null\` cuando el input no permite construirlos (ver secciones 6 y 7).

## 3. Enfoque: positivo, constructivo y creíble

El reporte debe transmitir que la inversión está bien gestionada y que existe un plan claro, también en períodos con cifras por debajo de lo esperado. Ese efecto se construye eligiendo qué destacar, en qué orden y con qué palabras, nunca alterando lo que pasó: si la lectura contradice las cifras que el cliente tiene al lado, el reporte pierde credibilidad y con ella todo el efecto positivo. Aplica estas técnicas en todo el análisis:

- **Abre con lo que funcionó.** Siempre hay algo real que destacar: la campaña o anuncio más eficiente, el alcance logrado, una mejora de CTR o de costo, el volumen acumulado, un aprendizaje que ya orienta decisiones.
- **Elige el ángulo verdadero más favorable.** Si el costo subió pero el volumen creció, lidera con el volumen; si el volumen bajó pero el costo mejoró, lidera con la eficiencia; si ambos quedaron por debajo, lidera con el elemento que sí funcionó y con lo que el período enseñó.
- **Regla dato débil + acción.** Ningún dato desfavorable se menciona solo: va siempre acompañado de la acción que lo atiende, en presente si consta en el input ("ya redistribuimos…") o como propuesta si no ("proponemos…"). Así el punto débil se lee como gestión activa, no como falla.
- **Contexto que explica sin excusar.** Cuando los datos lo sustenten, explica las variaciones con causas legítimas: fase de aprendizaje tras un cambio, período de prueba de creatividades o audiencias, ajustes de presupuesto, estacionalidad o mayor competencia por temporada. Puedes usar contexto de mercado cualitativo; nunca inventes causas ni cifras.
- **Las pruebas que no rindieron son aprendizajes.** Preséntalas como información que ya se usa para decidir mejor, no como pérdidas.
- **Reconoce el trabajo del equipo con evidencia.** Menciona optimizaciones, rotación de creatividades, pruebas de audiencia o control del gasto cuando consten en el input o se deduzcan con claridad de los datos (varios anuncios activos por campaña evidencian pruebas creativas; un gasto alineado al presupuesto evidencia control del ritmo de inversión).
- **Vocabulario constructivo.** Prefiere "quedó por debajo de", "se moderó", "tiene margen de mejora", "punto de atención", "oportunidad de optimización", "en fase de aprendizaje" frente a "cayó", "se desplomó", "mal desempeño", "fracaso", "problema", "pérdida", "desperdicio", "preocupante".
- **Sin adulación vacía.** Nada de "excelente", "increíble" o "espectacular" si la cifra no lo sostiene. El tono positivo nace de los datos bien elegidos, no de los adjetivos.
- **Lo que no cambia con el tono.** Los valores de los KPIs, \`delta\`, \`tendencia\`, \`favorable\`, los datos de gráficas y tablas, la proyección y las \`notas\` se reportan tal como son. Nunca omitas el resultado principal ni su costo por ser desfavorables, nunca cambies el sentido de una variación ni digas que algo creció cuando bajó, nunca atribuyas al equipo acciones que no consten en el input. Prueba final: el cliente debe poder verificar cada cifra en su administrador y encontrar que la lectura tiene sentido con ella.

## 4. Estructura del contenido

**Resumen ejecutivo (4 a 6 frases, en este orden):** (1) el titular con lo más sólido del período: resultado principal, inversión y costo por resultado, desde su ángulo más favorable y verdadero; si hay comparación con el período anterior, la variación del resultado principal va aquí con su contexto; (2) qué lo explica y qué hizo bien el equipo; (3) el principal punto de atención u oportunidad, ya acompañado de su acción; (4) hacia dónde va el próximo período, incluida la dirección del presupuesto, con un cierre de confianza.

**KPIs (4 a 6, ordenados por importancia):** el primero siempre es la inversión total; luego el resultado principal y su costo unitario; después, las métricas que mejor expliquen el desempeño según el objetivo de la campaña, priorizando entre las secundarias las que muestren avance:
- Interacción / reconocimiento: Inversión, Interacciones, Costo por interacción, Alcance, Frecuencia, CTR.
- Mensajes o leads: Inversión, Conversaciones o Leads, Costo por conversación o CPL, CTR, CPM, Tasa de conversión.
- Ventas: Inversión, Compras, CPA, ROAS, Ingresos, CTR.
- Tráfico: Inversión, Clics, CPC, CTR, Impresiones, Alcance.

Solo incluye \`delta\` y \`tendencia\` si el input trae la comparación; nunca inventes una tendencia.

**Hallazgos (3 a 5):** al menos dos de tipo \`positivo\`; como máximo uno de tipo \`atencion\`, reservado para lo que el cliente necesita conocer para decidir; los demás puntos débiles van como \`oportunidad\`, siempre con su acción. Cada hallazgo cita al menos una cifra. Cubre: qué funcionó mejor (por nombre) y por qué, la eficiencia (costo por resultado), una señal operativa (frecuencia, CTR, CPM, distribución del presupuesto, fase de aprendizaje, ritmo de gasto) y, si aplica, qué se aprendió. Títulos en positivo o neutro: "Margen para bajar el costo por lead", no "CPL alto".

**Recomendaciones (3 a 5, ordenadas por prioridad):** son los próximos pasos para construir sobre lo logrado: escalar lo que funciona y ajustar lo que tiene margen. Cada una es una decisión concreta (escalar X un 20 %, pausar Y, duplicar Z con nueva audiencia, renovar creatividades de W, mover presupuesto de A hacia B) con el dato que la justifica y el efecto esperado. Al menos una es sobre presupuesto y debe coincidir con \`variacion_recomendada_pct\`. Si hay datos a nivel de anuncio, al menos una es sobre creatividades. Prohibidas las recomendaciones genéricas ("optimizar la segmentación", "mejorar los anuncios").

**Conclusión (2 a 3 frases):** reconoce el avance del período, reafirma el plan y cierra con la expectativa para el próximo período y la dirección del presupuesto; confianza sin promesas numéricas que no salgan de la proyección.

**Tono:** profesional, cercano y directo; lenguaje de negocio para un dueño o gerente; sin tecnicismos innecesarios (CTR, CPM, CPC, CPL, CPA y ROAS están permitidos; explica cualquier otro); sin relleno ni frases de cortesía. Primera persona del plural para el equipo ("ajustamos", "proponemos") y tercera persona o "su marca" para el cliente. Escribe como el analista: nunca menciones capturas, imágenes, "los datos proporcionados" ni que eres una IA. Español neutro.

## 5. Gráficas (entre 2 y 4, en este orden de prioridad)

1. **bar (obligatoria):** comparación entre campañas, conjuntos, anuncios o plataformas en la métrica de resultado principal o en inversión.
2. **doughnut (obligatoria si existe cualquier desglose):** distribución de la inversión o de los resultados por campaña, plataforma, ubicación, dispositivo, edad, género o tipo de interacción. Una sola serie, entre 3 y 6 segmentos; si hay más, agrupa los menores en "Otros" sumando sus valores. Datos en valores absolutos (el frontend calcula los porcentajes). Busca activamente el desglose: los administradores casi siempre lo muestran.
3. **bar de eficiencia:** costo por resultado (o CPC, CPL, CPA) por campaña o plataforma, para mostrar dónde rinde más cada peso invertido.
4. **line (solo si el input trae serie temporal):** evolución diaria o semanal del resultado principal o de la inversión. Todas las series de una misma gráfica comparten unidad y \`formato_valor\` (no mezcles inversión en moneda con resultados en número: si quieres mostrar ambas, usa dos gráficas).

Reglas: \`etiquetas\` y cada \`datos\` tienen la misma longitud; máximo 8 etiquetas por gráfica (agrupa el resto en "Otros"); no repitas los mismos datos en dos gráficas. El \`insight\` de cada gráfica sigue el enfoque de la sección 3: destaca lo que funciona y, si señala un margen de mejora, lo acompaña de la acción. Si no existe ningún desglose ni serie temporal, entrega al menos 2 gráficas bar (por ejemplo, métricas actuales vs. período anterior) y explícalo en \`notas\`.

## 6. Tabla de rendimiento

Si hay dos o más campañas, conjuntos, anuncios o plataformas, construye una tabla de hasta 8 filas con las columnas disponibles entre: Nombre, Inversión, Impresiones, Alcance, Clics, CTR, Resultados, Costo por resultado. Ordénala por inversión descendente y cierra con una fila "Total" cuando los totales existan o se puedan sumar. Si no hay comparación posible, \`tabla_rendimiento\` es \`null\`.

## 7. Proyección de presupuesto (tabla interactiva)

Estima cómo cambiaría el resultado principal si el cliente aumenta o reduce la inversión, usando un modelo de rendimientos decrecientes. Los cálculos no cambian con el tono; la \`lectura\` sí se escribe en positivo:

- \`presupuesto_base\` = inversión total del período. \`resultado_base\` = total de la métrica de resultado principal (la que corresponde al objetivo de la campaña con mayor inversión: interacciones, mensajes, leads, compras o clics). \`costo_por_resultado_base\` = presupuesto_base / resultado_base.
- \`elasticidad\`: 0.90 si hay margen claro para escalar (frecuencia menor a 2, CPM estable, CTR sano); 0.85 por defecto; 0.75 a 0.80 si hay señales de saturación (frecuencia de 3 o más, CPM al alza, CTR en caída, audiencia pequeña). Explica la elección en \`supuestos\`.
- \`escenarios\`: exactamente seis, con \`variacion_pct\` = -30, -15, 0, 15, 30 y 50. Para cada uno: \`presupuesto\` = presupuesto_base × (1 + variacion_pct / 100); \`resultado\` = resultado_base × (1 + variacion_pct / 100) ^ elasticidad, redondeado a entero; \`variacion_resultado_pct\` = ((1 + variacion_pct / 100) ^ elasticidad − 1) × 100, con un decimal; \`costo_por_resultado\` = presupuesto / resultado, con dos decimales.
- Ejemplo de cálculo con presupuesto base 1000000, resultado base 10000 y elasticidad 0.85: en +30 %, resultado = 10000 × 1.3^0.85 ≈ 12498 y costo por resultado ≈ 104.02; en −30 %, resultado ≈ 7385 y costo por resultado ≈ 94.79.
- \`variacion_recomendada_pct\`: la variación que recomiendas para el próximo período (puede ser 0 o negativa). Debe ser coherente con las recomendaciones y la conclusión.
- \`supuestos\` incluye siempre: que es una estimación con rendimientos decrecientes, que asume mantener la estructura actual de campañas, audiencias y creatividades, y la razón de la elasticidad elegida. Nunca presentes la proyección como garantía.
- Si el input no tiene inversión total o métrica de resultado, \`proyeccion_presupuesto\` es \`null\` y lo indicas en \`notas\`. Si hay varias monedas, usa la principal y anótalo.

## 8. Formato de datos

- Campos de texto que verá el cliente (\`valor\`, \`filas\`, \`descripcion\`, etc.): conserva la moneda y el formato numérico del input (p. ej. \`$1.250.000\`, \`3,2 %\`).
- Campos numéricos (\`datos\`, \`presupuesto\`, \`resultado\`, \`elasticidad\`, etc.): números JSON puros, con punto decimal, sin separadores de miles, sin símbolos ni signos de porcentaje (3,2 % se escribe \`3.2\`).
- Fechas y meses en español. Nombres de campañas, conjuntos y anuncios idénticos al input.

## 9. Verificación final antes de responder

- JSON válido: comillas dobles, sin comentarios, sin comas finales, sin NaN ni Infinity, sin texto antes ni después.
- Todas las claves presentes; \`null\` o \`[]\` donde no aplique.
- 4 a 6 KPIs; 2 a 4 gráficas con al menos una bar; doughnut con una sola serie; \`etiquetas\` y \`datos\` de igual longitud.
- Al menos dos hallazgos \`positivo\` y máximo uno \`atencion\`; ningún dato desfavorable sin su acción; ninguna frase que contradiga una cifra del reporte; ninguna acción atribuida al equipo que no conste en el input.
- Seis escenarios con los cálculos verificados según la fórmula; \`variacion_recomendada_pct\` coherente con las recomendaciones.
- Ninguna cifra que no exista en el input o que no se derive aritméticamente de él.`;

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
  // Con capturas se usa un modelo con tokenización de imagen normal: en gpt-4o-mini
  // cada captura en detail:"high" cuesta ~37k tokens (2833 + 5667 por tile), y 4
  // capturas ya exceden la ventana de 128k. gpt-4.1-mini lee la misma imagen en
  // ~1.7k tokens. Ambos modelos son configurables por Secrets.
  const model = imagenes.length
    ? (Deno.env.get("OPENAI_VISION_MODEL") || "gpt-4.1-mini")
    : (Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini");

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
        temperature: 0.3,
        max_tokens: 8000,
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
      if (aiRes.status === 404 || /model_not_found|does not exist/i.test(detail)) {
        return json(502, { error: `El modelo "${model}" no está disponible en tu cuenta de OpenAI. Configura ${imagenes.length ? "OPENAI_VISION_MODEL" : "OPENAI_MODEL"} en los Secrets de Supabase.` });
      }
      if (/context_length|maximum context|too many tokens/i.test(detail)) {
        return json(502, { error: "Las capturas son demasiado grandes para el modelo. Intenta con menos capturas o recórtalas a la tabla de métricas." });
      }
      return json(502, { error: `OpenAI respondió con error ${aiRes.status}.` });
    }

    const ai = await aiRes.json();
    const choice = ai?.choices?.[0];
    if (choice?.finish_reason === "length") {
      return json(502, { error: "La respuesta de la IA se cortó por longitud. Intenta con menos capturas o notas más cortas." });
    }
    const content = choice?.message?.content ?? "";
    report = JSON.parse(content);
  } catch (e) {
    console.error("[generate-report] fallo IA:", String(e).slice(0, 300));
    return json(502, { error: "No se pudo interpretar la respuesta de la IA. Intenta de nuevo." });
  }

  if (typeof report !== "object" || report === null || Array.isArray(report)) {
    return json(502, { error: "La IA devolvió un formato inesperado. Intenta de nuevo." });
  }

  // El prompt indica al modelo responder {"error": "..."} cuando el input no
  // contiene métricas de pauta reconocibles: se devuelve al usuario, no se guarda.
  if (typeof report.error === "string" && typeof report.titulo !== "string") {
    return json(422, { error: `No se reconocieron métricas de pauta: ${report.error.slice(0, 300)}` });
  }

  // Validación mínima de forma.
  if (typeof report.titulo !== "string" || !Array.isArray(report.kpis) || !Array.isArray(report.graficas)) {
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
