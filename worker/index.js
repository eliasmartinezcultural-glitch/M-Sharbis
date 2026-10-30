const SYSTEM_PROMPT = `Sos JARVIS, un asistente personal avanzado. Hablás en español rioplatense claro, con tono masculino cinematográfico: sereno, elegante, preciso, inteligente y discretamente ingenioso. No exageres ni imites literalmente personajes protegidos. Priorizá respuestas útiles, honestas y concretas. Si no sabés algo, decilo. No afirmes haber realizado acciones que no ejecutaste. Cuando la pregunta requiera información actual, explicá que necesitás consultar fuentes o usá las herramientas disponibles en la aplicación. No inventes fuentes, citas, datos ni capacidades. Como esta instancia puede ser compartida, no asumas que el usuario es el propietario del proyecto ni reveles información privada de otras personas.`;

const memory = new Map();
function cors(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGIN || "https://eliasmartinezcultural-glitch.github.io").split(",").map(x => x.trim());
  if (origin && !allowed.includes(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin || allowed[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Jarvis-Access",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
function authorized(request, env) {
  const expected = env.JARVIS_ACCESS_CODE || "";
  const supplied = request.headers.get("X-Jarvis-Access") || "";
  if (!expected || expected.length < 12) return false;
  if (supplied.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  return diff === 0;
}
function limited(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const now = Date.now();
  const bucket = memory.get(ip) || [];
  const recent = bucket.filter(t => now - t < 60_000);
  if (recent.length >= 12) return true;
  recent.push(now); memory.set(ip, recent);
  if (memory.size > 1500) for (const [key, values] of memory) if (!values.length || now - values[values.length - 1] > 120_000) memory.delete(key);
  return false;
}
function cleanMessages(input) {
  if (!Array.isArray(input)) return [];
  return input.slice(-12).filter(m => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
    .map(m => ({ role: m.role, content: m.content.trim().slice(0, 5000) })).filter(m => m.content);
}
async function askGemini(env, messages) {
  const model = env.GEMINI_MODEL || "gemini-2.5-flash";
  const contents = messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(env.GEMINI_API_KEY), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }, contents, generationConfig: { temperature: 0.7, maxOutputTokens: 1200 } })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || "Gemini no pudo responder (" + r.status + ").");
  return data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim() || "No recibí una respuesta de Gemini.";
}
async function askOpenAI(env, messages) {
  const model = env.OPENAI_MODEL || "gpt-4o-mini";
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + env.OPENAI_API_KEY },
    body: JSON.stringify({ model, messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages], temperature: 0.7, max_tokens: 1200 })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || "OpenAI no pudo responder (" + r.status + ").");
  return data.choices?.[0]?.message?.content?.trim() || "No recibí una respuesta de OpenAI.";
}
async function askAnthropic(env, messages) {
  const model = env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest";
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, system: SYSTEM_PROMPT, max_tokens: 1200, messages })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || "Anthropic no pudo responder (" + r.status + ").");
  return data.content?.filter(p => p.type === "text").map(p => p.text).join("").trim() || "No recibí una respuesta de Anthropic.";
}
async function chat(request, env, headers) {
  if (!authorized(request, env)) return json({ error: "Acceso no autorizado. Revisá el código de acceso compartido." }, 401, headers);
  if (limited(request)) return json({ error: "Límite temporal alcanzado. Esperá un minuto antes de volver a consultar." }, 429, headers);
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > 20_000) return json({ error: "La solicitud es demasiado grande." }, 413, headers);
  let body;
  try { body = await request.json(); } catch { return json({ error: "El formato de la solicitud no es válido." }, 400, headers); }
  const messages = cleanMessages(body.messages);
  if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "Falta el mensaje del usuario." }, 400, headers);
  const requested = ["auto", "gemini", "openai", "anthropic"].includes(body.provider) ? body.provider : "auto";
  const providers = requested === "auto" ? ["gemini", "openai", "anthropic"] : [requested];
  const adapters = { gemini: [env.GEMINI_API_KEY, askGemini], openai: [env.OPENAI_API_KEY, askOpenAI], anthropic: [env.ANTHROPIC_API_KEY, askAnthropic] };
  const failures = [];
  for (const name of providers) {
    const [key, fn] = adapters[name];
    if (!key) { failures.push(name + ": no configurado"); continue; }
    try { return json({ reply: await fn(env, messages), provider: name }, 200, headers); }
    catch (e) { failures.push(name + ": " + String(e.message || e).slice(0, 180)); }
  }
  return json({ error: "No hay un motor disponible para responder.", details: failures }, 503, headers);
}
async function speech(request, env, headers) {
  if (!authorized(request, env)) return json({ error: "Acceso no autorizado." }, 401, headers);
  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 1800) : "";
  if (!text) return json({ error: "No hay texto para convertir en voz." }, 400, headers);
  if (!env.OPENAI_API_KEY) return json({ error: "La voz cinematográfica remota todavía no está configurada." }, 503, headers);
  const r = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + env.OPENAI_API_KEY },
    body: JSON.stringify({ model: env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts", voice: env.OPENAI_TTS_VOICE || "onyx", input: text, instructions: "Speak Spanish with a deep, calm, refined, cinematic masculine voice. Neutral Latin American Spanish with a subtle Argentine accent. Controlled pace, warm resonance, articulate diction, understated confidence." , response_format: "mp3" })
  });
  if (!r.ok) return json({ error: "El motor de voz no pudo generar el audio (" + r.status + ")." }, 502, headers);
  return new Response(r.body, { status: 200, headers: { ...headers, "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
}
export default {
  async fetch(request, env) {
    const headers = cors(request, env);
    if (!headers) return new Response("Origin not allowed", { status: 403 });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({ status: "online", version: "1.0.0", providers: { gemini: !!env.GEMINI_API_KEY, openai: !!env.OPENAI_API_KEY, anthropic: !!env.ANTHROPIC_API_KEY }, cinematicVoice: !!env.OPENAI_API_KEY }, 200, headers);
    }
    if (request.method === "POST" && url.pathname === "/api/chat") return chat(request, env, headers);
    if (request.method === "POST" && url.pathname === "/api/speech") return speech(request, env, headers);
    return json({ error: "Ruta no encontrada." }, 404, headers);
  }
};
