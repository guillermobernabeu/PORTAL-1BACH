// Conversor de apuntes de 1 BACH (Cloudflare Worker) · Bernabéu
// Recibe fotos de apuntes desde el portal y devuelve el apunte pasado a limpio con Gemini.
// La clave de Gemini se guarda en Cloudflare como secreto con el nombre GEMINI_KEY (nunca en este código).

const PROYECTO = "portal-1bach-6c1eb";               // proyecto de Firebase: solo entran los de la clase
const ORIGENES = ["https://guillermobernabeu.github.io", "http://localhost:8766"];
const MODELOS = ["gemini-flash-latest", "gemini-3.6-flash", "gemini-3.5-flash-lite"]; // se prueban en este orden
const MAX_FOTOS = 10;

const PROMPT = `Eres un asistente que pasa a limpio apuntes de 1.º de Bachillerato (España).
Te doy fotos de apuntes escritos a mano o fotocopias. Devuelve SOLO el apunte en Markdown, en español, limpio y ordenado:
- Copia fielmente el contenido: no inventes nada ni añadas temas que no estén. Si una palabra no se lee, escribe [ilegible].
- Ordena con títulos (#, ##, ###), listas y tablas cuando ayuden.
- Fórmulas matemáticas y químicas en LaTeX entre $...$ (en línea) o $$...$$ (aparte). En química orgánica usa la nomenclatura tradicional que aparezca en los apuntes.
- Si hay dibujos o esquemas, descríbelos en una línea en cursiva: *Esquema: ...*.
- Si ves un error claro en los apuntes, déjalo como está y añade al final una sección "## Revisar" con lo que parece mal.
- No pongas introducciones ni despedidas: empieza directamente por el título del apunte.`;

const cors = (origen) => ({
  "Access-Control-Allow-Origin": ORIGENES.includes(origen) ? origen : ORIGENES[0],
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
});
const responder = (datos, estado, origen) => new Response(JSON.stringify(datos), { status: estado, headers: { "Content-Type": "application/json", ...cors(origen) } });

const b64u = (s) => { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };
const json64 = (s) => JSON.parse(new TextDecoder().decode(b64u(s)));

// Comprueba que quien pide la conversión ha entrado en el portal con su cuenta de Google (token de Firebase).
async function verificarToken(token) {
  const [h, p, s] = (token || "").split(".");
  if (!h || !p || !s) throw new Error("sin sesión");
  const cab = json64(h), dat = json64(p), ahora = Date.now() / 1000;
  if (dat.aud !== PROYECTO || dat.iss !== "https://securetoken.google.com/" + PROYECTO || !(dat.exp > ahora) || !dat.sub) throw new Error("sesión no válida");
  const r = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com", { cf: { cacheTtl: 3600 } });
  const jwk = (await r.json()).keys.find((k) => k.kid === cab.kid);
  if (!jwk) throw new Error("sesión no válida");
  const clave = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", clave, b64u(s), new TextEncoder().encode(h + "." + p));
  if (!ok) throw new Error("sesión no válida");
  return dat.sub;
}

async function convertir(env, imagenes, contexto) {
  const partes = [{ text: PROMPT + (contexto ? `\n\nContexto: ${contexto}` : "") }, ...imagenes.map((i) => ({ inline_data: { mime_type: i.mime || "image/jpeg", data: i.data } }))];
  let ultimo = "";
  for (const modelo of (env.MODELO ? [env.MODELO] : MODELOS)) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_KEY },
      body: JSON.stringify({ contents: [{ role: "user", parts: partes }], generationConfig: { temperature: 0.2 } }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok) {
      const texto = (d.candidates?.[0]?.content?.parts || []).map((x) => x.text || "").join("").trim();
      if (texto) return { texto, modelo };
      ultimo = "La IA no ha devuelto texto (puede que la foto no se lea).";
    } else {
      ultimo = d.error?.message || "Error " + r.status;
      if (r.status === 429) throw new Error("Se ha gastado el cupo gratis de hoy. Prueba mañana.");
      if (r.status === 400 && /API key/i.test(ultimo)) throw new Error("La clave de Gemini no es válida. Revísala en Cloudflare (GEMINI_KEY).");
    }
  }
  throw new Error(ultimo || "No se ha podido convertir.");
}

export default {
  async fetch(req, env) {
    const origen = req.headers.get("Origin") || "";
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(origen) });
    if (req.method === "GET") return new Response("✅ Conversor de apuntes de 1 BACH funcionando." + (env.GEMINI_KEY ? "" : " ⚠️ Falta el secreto GEMINI_KEY."), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405, origen);
    if (!ORIGENES.includes(origen)) return responder({ error: "Solo se puede usar desde el portal de 1 BACH." }, 403, origen);
    if (!env.GEMINI_KEY) return responder({ error: "Falta el secreto GEMINI_KEY en Cloudflare." }, 500, origen);
    try { await verificarToken((req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "")); }
    catch (e) { return responder({ error: "Entra en el portal con tu cuenta para convertir apuntes." }, 401, origen); }
    let cuerpo;
    try { cuerpo = await req.json(); } catch (e) { return responder({ error: "Petición no válida." }, 400, origen); }
    const imagenes = (cuerpo.imagenes || []).filter((i) => i && typeof i.data === "string").slice(0, MAX_FOTOS);
    if (!imagenes.length) return responder({ error: "No hay fotos." }, 400, origen);
    try {
      const r = await convertir(env, imagenes, String(cuerpo.contexto || "").slice(0, 300));
      return responder(r, 200, origen);
    } catch (e) { return responder({ error: e.message }, 502, origen); }
  },
};
