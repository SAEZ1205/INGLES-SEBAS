const MODEL = "gemini-3.8-flash";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function json(res, status, body) {
  cors(res);
  res.status(status).json(body);
}

function cleanJson(text) {
  const raw = String(text || "").trim().replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/i, "");
  return JSON.parse(raw);
}

async function gemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY_NOT_CONFIGURED");
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 1800
      }
    })
  });
  const data = await r.json();
  if (!r.ok) {
    const msg = data?.error?.message || `Gemini HTTP ${r.status}`;
    throw new Error(msg);
  }
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
  if (!text) throw new Error("Gemini respondió vacío");
  return cleanJson(text);
}

function compactHistory(history) {
  return Array.isArray(history)
    ? history.slice(-14).map(x => ({ role: x.role === "assistant" ? "assistant" : "user", text: String(x.text || "").slice(0, 700) }))
    : [];
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET") {
    return json(res, 200, {
      ok: true,
      service: "Inglés Sebas AI",
      model: MODEL,
      configured: Boolean(process.env.GEMINI_API_KEY)
    });
  }
  if (req.method !== "POST") return json(res, 405, { error: "Método no permitido" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const mode = String(body.mode || "");
    const text = String(body.text || "").trim();
    const profile = body.profile || {};

    if (!text && mode !== "chat") return json(res, 400, { error: "Falta texto" });

    if (mode === "translate") {
      const out = await gemini(`
Eres el motor de traducción de una app peruana para aprender inglés.
Convierte el mensaje del usuario a inglés NATURAL, no traducción literal. Conserva intención, humor, jerga y nivel de vulgaridad.
Si el texto ya está en inglés, corrígelo solo si hace falta y tradúcelo al español.
La pronunciación debe ser una guía sencilla para un hispanohablante peruano, NO IPA. Usa sílabas fáciles, mayúsculas solo para marcar el acento fuerte.
No inventes explicaciones largas.

Texto: ${JSON.stringify(text)}

Devuelve SOLO JSON válido con este esquema exacto:
{
  "english": "frase final en inglés",
  "pronunciation": "guía simple de pronunciación",
  "spanish": "significado natural en español",
  "tone": "neutral|informal|slang|formal|rude",
  "note": "nota breve de uso, máximo 18 palabras",
  "keywords": [
    {"en":"palabra o expresión útil","es":"significado","pronunciation":"pronunciación sencilla"}
  ]
}
Máximo 4 keywords.
`);
      return json(res, 200, out);
    }

    if (mode === "enrich") {
      const out = await gemini(`
Ayuda a crear una tarjeta de vocabulario inglés-español para un estudiante peruano.
Entrada del usuario: ${JSON.stringify(text)}
Puede ser inglés, español o una frase. Elige la equivalencia MÁS útil y natural.
La pronunciación es una aproximación clara para hispanohablante, no IPA.
Devuelve SOLO JSON:
{
  "en":"inglés",
  "es":"español",
  "pronunciation":"pronunciación sencilla",
  "example":"ejemplo corto y natural en inglés",
  "exampleEs":"traducción del ejemplo"
}
`);
      return json(res, 200, out);
    }

    if (mode === "chat") {
      if (!text) return json(res, 400, { error: "Escribe o di algo para conversar" });
      const history = compactHistory(body.history);
      const vocab = Array.isArray(profile.vocab) ? profile.vocab.slice(0, 35) : [];
      const memory = String(profile.memory || "").slice(0, 1800);
      const stats = profile.stats || {};

      const out = await gemini(`
Eres "Buddy", el compañero de inglés de una app llamada Inglés Sebas.
Tu usuario es un estudiante universitario peruano. Tu personalidad: pata cercano, relajado, curioso, nada infantil y nada de profesor robótico.

OBJETIVO:
- Conversa principalmente EN INGLÉS.
- Responde de forma natural, 1 a 4 frases normalmente, y continúa la conversación.
- Adáptate a aproximadamente A2-B1, pero sube gradualmente si el usuario mejora.
- Si el usuario escribe en español, entiéndelo y responde en inglés sencillo; puedes aclarar una frase corta en español si ayuda.
- Corrige SOLO errores que valgan la pena. No interrumpas cada frase por detalles mínimos.
- Usa de vez en cuando vocabulario de sus tarjetas para reforzarlo de forma natural, sin que parezca forzado.
- Recuerda únicamente la memoria que se te proporciona. Actualízala con hechos estables o preferencias útiles que el usuario comparta. No guardes secretos, contraseñas, claves ni datos financieros.
- No digas "como IA". Eres Buddy dentro de la app.
- Si hay una corrección, la explicación va en español y es breve.

MEMORIA ACTUAL:
${memory || "(vacía)"}

DATOS DE APRENDIZAJE:
${JSON.stringify(stats)}

VOCABULARIO DEL USUARIO:
${JSON.stringify(vocab)}

HISTORIAL RECIENTE:
${JSON.stringify(history)}

MENSAJE NUEVO:
${JSON.stringify(text)}

Devuelve SOLO JSON válido:
{
  "reply": "respuesta natural de Buddy en inglés",
  "correction": null o {
    "corrected":"versión corregida del mensaje en inglés",
    "explanation":"explicación breve en español"
  },
  "memory":"resumen actualizado de datos estables útiles sobre el usuario, máximo 900 caracteres",
  "newWords":[
    {"en":"expresión útil que salió en la charla","es":"significado","pronunciation":"pronunciación sencilla"}
  ]
}
newWords: máximo 3 y solo si realmente vale la pena guardar algo.
`);
      return json(res, 200, out);
    }

    return json(res, 400, { error: "Modo desconocido" });
  } catch (e) {
    console.error(e);
    const code = e.message === "GEMINI_API_KEY_NOT_CONFIGURED" ? 503 : 500;
    return json(res, code, {
      error: e.message === "GEMINI_API_KEY_NOT_CONFIGURED"
        ? "Gemini todavía no está configurado en Vercel."
        : "No pude conectar con Gemini.",
      detail: process.env.NODE_ENV === "development" ? e.message : undefined
    });
  }
};
