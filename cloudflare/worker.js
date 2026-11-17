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


// =====================================================================
// Firestore y FCM con la cuenta de servicio (secreto FIREBASE_SA = contenido del json de Firebase)
// =====================================================================
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
let tokenCache = { t: 0, v: "" };
async function tokenServicio(env) {
  if (!env.FIREBASE_SA) throw new Error("Falta el secreto FIREBASE_SA en Cloudflare.");
  if (tokenCache.v && Date.now() < tokenCache.t) return tokenCache.v;
  const sa = JSON.parse(env.FIREBASE_SA), ahora = Math.floor(Date.now() / 1000);
  const cab = b64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const cuerpo = b64url(new TextEncoder().encode(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: ahora, exp: ahora + 3600 })));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const clave = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(pem), c => c.charCodeAt(0)), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const firma = b64url(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", clave, new TextEncoder().encode(cab + "." + cuerpo)));
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${cab}.${cuerpo}.${firma}` });
  const d = await r.json(); if (!d.access_token) throw new Error("No se pudo entrar con la cuenta de servicio: " + (d.error_description || d.error || r.status));
  tokenCache = { t: Date.now() + 50 * 60000, v: d.access_token }; return d.access_token;
}
const FS = `https://firestore.googleapis.com/v1/projects/${PROYECTO}/databases/(default)/documents`;
// conversión de valores de Firestore REST <-> JS
const deFS = (v) => { if (!v) return null; if ("stringValue" in v) return v.stringValue; if ("integerValue" in v) return Number(v.integerValue); if ("doubleValue" in v) return v.doubleValue; if ("booleanValue" in v) return v.booleanValue; if ("nullValue" in v) return null; if ("timestampValue" in v) return v.timestampValue; if ("mapValue" in v) return docDeFS(v.mapValue); if ("arrayValue" in v) return (v.arrayValue.values || []).map(deFS); return null; };
const docDeFS = (m) => { const o = {}; for (const k in (m.fields || {})) o[k] = deFS(m.fields[k]); return o; };
const aFS = (x) => x === null || x === undefined ? { nullValue: null } : typeof x === "string" ? { stringValue: x } : typeof x === "boolean" ? { booleanValue: x } : typeof x === "number" ? (Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x }) : Array.isArray(x) ? { arrayValue: { values: x.map(aFS) } } : { mapValue: { fields: Object.fromEntries(Object.entries(x).map(([k, v]) => [k, aFS(v)])) } };
async function fsGet(env, ruta) { const r = await fetch(`${FS}/${ruta}`, { headers: { Authorization: "Bearer " + await tokenServicio(env) } }); if (r.status === 404) return null; const d = await r.json(); if (!r.ok) throw new Error(d.error?.message || "Firestore " + r.status); return docDeFS(d); }
async function fsList(env, coleccion) { const out = []; let tok = ""; do { const r = await fetch(`${FS}/${coleccion}?pageSize=300${tok ? "&pageToken=" + tok : ""}`, { headers: { Authorization: "Bearer " + await tokenServicio(env) } }); const d = await r.json(); if (!r.ok) throw new Error(d.error?.message || "Firestore " + r.status); (d.documents || []).forEach(x => out.push({ id: x.name.split("/").pop(), ...docDeFS(x) })); tok = d.nextPageToken || ""; } while (tok); return out; }
async function fsSet(env, ruta, datos, merge = true) { const campos = Object.keys(datos); const q = merge ? "?" + campos.map(k => "updateMask.fieldPaths=" + encodeURIComponent(k)).join("&") : ""; const r = await fetch(`${FS}/${ruta}${q}`, { method: "PATCH", headers: { Authorization: "Bearer " + await tokenServicio(env), "Content-Type": "application/json" }, body: JSON.stringify({ fields: aFS(datos).mapValue.fields }) }); if (!r.ok) throw new Error("Firestore " + r.status + " " + (await r.text()).slice(0, 200)); }
async function fsAdd(env, coleccion, datos) { const r = await fetch(`${FS}/${coleccion}`, { method: "POST", headers: { Authorization: "Bearer " + await tokenServicio(env), "Content-Type": "application/json" }, body: JSON.stringify({ fields: aFS(datos).mapValue.fields }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error?.message || "Firestore " + r.status); return d.name.split("/").pop(); }

// ---------- notificaciones push (FCM HTTP v1) ----------
const TEXTOS = {
  adelanto: (de) => ({ title: "🏃 Te han adelantado", body: `${de} te ha pasado en el ranking de hoy. ¡A estudiar!`, url: "#amigos" }),
  mencion: (de) => ({ title: "📣 Te han mencionado", body: `${de} te ha mencionado en el chat de la clase.`, url: "#chat" }),
  privado: (de) => ({ title: "🔒 Mensaje privado", body: `${de} te ha escrito.`, url: "#privados" }),
  apunte: (de, x) => ({ title: "✅ Apunte aprobado", body: `Tu apunte «${x || ""}» ya lo ve toda la clase. ¡+50 puntos!`, url: "#apuntes" }),
  mejora: (de, x) => ({ title: "✏️ Mejora propuesta", body: `${de} propone una mejora en tu apunte «${x || ""}».`, url: "#apuntes" }),
  examen: (de, x) => ({ title: "📅 Examen mañana", body: x || "Mañana tienes examen. Repasa un poco hoy.", url: "#" }),
  aviso: (de, x) => ({ title: "📢 1 BACH", body: x || "", url: "#" }),
};
async function enviarFCM(env, token, n, url, tag) {
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${PROYECTO}/messages:send`, { method: "POST", headers: { Authorization: "Bearer " + await tokenServicio(env), "Content-Type": "application/json" },
    body: JSON.stringify({ message: { token, data: { title: n.title, body: n.body, url, tag: tag || "1bach" }, webpush: { headers: { TTL: "86400", Urgency: "normal" } } } }) });
  if (r.ok) return true;
  const d = await r.json().catch(() => ({}));
  return d.error?.details?.some(x => x.errorCode === "UNREGISTERED") ? "caducado" : false;
}
async function pushA(env, uids, n, url, tag) {
  let enviados = 0;
  for (const uid of uids) {
    const u = await fsGet(env, "usuarios/" + uid).catch(() => null);
    if (!u || !u.pushToken || u.push === false || u.baneado) continue;
    const ok = await enviarFCM(env, u.pushToken, n, url, tag);
    if (ok === "caducado") await fsSet(env, "usuarios/" + uid, { push: false }).catch(() => {});
    else if (ok) enviados++;
  }
  return enviados;
}
// quién manda (nombre para el texto) y límite: 60 avisos por persona y día
async function remitente(env, uid) { const u = await fsGet(env, "usuarios/" + uid).catch(() => null); return { nombre: (u && (u.nombre || u.nombreGoogle)) || "Alguien", baneado: !!(u && u.baneado) }; }
async function cupo(env, uid, clave, max) {
  const dia = new Date().toISOString().slice(0, 10), ruta = "cupos/" + uid, c = (await fsGet(env, ruta).catch(() => null)) || {};
  const k = clave + "_" + dia, n = Number(c[k] || 0); if (n >= max) return false;
  await fsSet(env, ruta, { [k]: n + 1, dia }); return true;
}
async function rutaPush(req, env, origen) {
  let uid; try { uid = await verificarToken((req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "")); } catch (e) { return responder({ error: "Sin sesión." }, 401, origen); }
  if (!env.FIREBASE_SA) return responder({ ok: false, motivo: "push no configurado" }, 200, origen);
  const m = await req.json().catch(() => ({})); const plantilla = TEXTOS[m.tipo]; if (!plantilla) return responder({ error: "Tipo no válido." }, 400, origen);
  const a = [...new Set((m.a || []).filter(x => typeof x === "string" && x !== uid))].slice(0, 40); if (!a.length) return responder({ ok: true, enviados: 0 }, 200, origen);
  const r = await remitente(env, uid); if (r.baneado) return responder({ error: "No puedes enviar avisos." }, 403, origen);
  if (m.tipo === "examen" || m.tipo === "aviso") { const sa = await esAdmin(req); if (!sa) return responder({ error: "Solo el administrador." }, 403, origen); }
  if (!(await cupo(env, uid, "push", 60))) return responder({ error: "Has enviado demasiados avisos hoy." }, 429, origen);
  const n = plantilla(r.nombre, String(m.extra || "").slice(0, 120));
  const enviados = await pushA(env, a, n, m.url && /^#?[\w-]*$/.test(m.url) ? m.url : n.url, m.tipo + "-" + uid);
  return responder({ ok: true, enviados }, 200, origen);
}
const ADMIN_EMAILS = ["guillee.bs15@gmail.com", "guillermobernabeu@gmail.com"];
async function esAdmin(req) { try { const p = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").split(".")[1]; const d = json64(p); return ADMIN_EMAILS.includes(String(d.email || "").toLowerCase()); } catch (e) { return false; } }

// ---------- recordatorio automático: a las 19:00 (hora de España) avisa a toda la clase de los exámenes de mañana ----------
async function recordatorioExamenes(env) {
  if (!env.FIREBASE_SA) return "sin FIREBASE_SA";
  const base = await (await fetch("https://guillermobernabeu.github.io/PORTAL-1BACH/data/clase.json", { cf: { cacheTtl: 300 } })).json().catch(() => ({ examenes: [] }));
  const cambios = (await fsGet(env, "clase/cambios").catch(() => null)) || {};
  const m = new Map((base.examenes || []).map(e => [e.id, { ...e }]));
  for (const id in (cambios.examenes || {})) { const c = cambios.examenes[id]; if (m.has(id)) Object.assign(m.get(id), c); else if (c && c.nuevo) m.set(id, { id, ...c }); }
  const hoyES = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" })); const man = new Date(hoyES); man.setDate(man.getDate() + 1);
  const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const manana = iso(man);
  const NOM = { filosofia: "Filosofía", lengua: "Lengua", fyq: "Física y Química", mates: "Matemáticas", economia: "Economía", ingles: "Inglés", bio: "Biología", ef: "Educación Física", tic: "TIC", global: "Globales" };
  const ex = [...m.values()].filter(e => !e.borrado && !e.hecho && ((Array.isArray(e.dias) && e.dias.includes(manana)) || e.fecha === manana));
  if (!ex.length) return "mañana no hay exámenes";
  const texto = ex.length === 1 ? `Mañana: ${NOM[ex[0].asig] || ex[0].asig} · ${ex[0].titulo}. Repasa un poco hoy.` : `Mañana tienes ${ex.length} exámenes: ${ex.map(e => NOM[e.asig] || e.asig).join(", ")}.`;
  const us = await fsList(env, "usuarios"); const n = TEXTOS.examen("", texto);
  const enviados = await pushA(env, us.filter(u => u.pushToken && u.push !== false && !u.baneado).map(u => u.id), n, "#", "examen-" + manana);
  return `avisados ${enviados}`;
}

export default {
  async scheduled(ev, env, ctx) { ctx.waitUntil(recordatorioExamenes(env)); },
  async fetch(req, env) {
    const origen = req.headers.get("Origin") || "", ruta = new URL(req.url).pathname.replace(/\/+$/, "") || "/";
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(origen) });
    if (req.method === "GET") {
      if (ruta === "/recordatorio" && (await esAdmin(req))) return new Response(await recordatorioExamenes(env).catch(e => "error: " + e.message), { headers: { "Content-Type": "text/plain; charset=utf-8", ...cors(origen) } });
      return new Response("✅ Conversor de apuntes de 1 BACH funcionando." + (env.GEMINI_KEY ? "" : " ⚠️ Falta el secreto GEMINI_KEY.") + (env.FIREBASE_SA ? " 🔔 Push y exámenes IA listos." : " ⚠️ Falta el secreto FIREBASE_SA (push y exámenes de prueba)."), { headers: { "Content-Type": "text/plain; charset=utf-8", ...cors(origen) } });
    }
    if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405, origen);
    if (!ORIGENES.includes(origen)) return responder({ error: "Solo se puede usar desde el portal de 1 BACH." }, 403, origen);
    try {
      if (ruta === "/push") return await rutaPush(req, env, origen);
      if (ruta === "/examen" || ruta === "/corregir") return await rutaExamen(ruta, req, env, origen);
      return await rutaConvertir(req, env, origen);
    } catch (e) { return responder({ error: e.message || "Error" }, 500, origen); }
  },
};

async function rutaConvertir(req, env, origen) {
    if (!env.GEMINI_KEY) return responder({ error: "Falta el secreto GEMINI_KEY en Cloudflare." }, 500, origen);
    let uid; try { uid = await verificarToken((req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "")); }
    catch (e) { return responder({ error: "Entra en el portal con tu cuenta para convertir apuntes." }, 401, origen); }
    // límites: cuerpo de 6 MB como mucho y cada foto hasta 600 KB (el portal las reduce a ~330 KB); 20 conversiones por persona y día
    const tam = Number(req.headers.get("Content-Length") || 0); if (tam > 6e6) return responder({ error: "Demasiadas fotos o demasiado grandes." }, 413, origen);
    if (env.FIREBASE_SA && !(await cupo(env, uid, "conv", 20).catch(() => true))) return responder({ error: "Has hecho 20 conversiones hoy. Mañana podrás seguir." }, 429, origen);
    let cuerpo;
    try { cuerpo = await req.json(); } catch (e) { return responder({ error: "Petición no válida." }, 400, origen); }
    const imagenes = (cuerpo.imagenes || []).filter((i) => i && typeof i.data === "string" && i.data.length <= 820000 && /^image\/(jpeg|png|webp)$/.test(i.mime || "image/jpeg")).slice(0, MAX_FOTOS);
    if (!imagenes.length) return responder({ error: "No hay fotos." }, 400, origen);
    try {
      const r = await convertir(env, imagenes, String(cuerpo.contexto || "").slice(0, 300));
      return responder(r, 200, origen);
    } catch (e) { return responder({ error: e.message }, 502, origen); }
}

// =====================================================================
// Exámenes de prueba con IA: /examen (generar) y /corregir
// Con FIREBASE_SA: el examen (con soluciones) se guarda en examenesIA/{uid}/items, al alumno le llega SIN soluciones,
// se corrige aquí y los puntos los pone este Worker (nadie se los puede inventar).
// Sin FIREBASE_SA: el examen llega con soluciones, se corrige en el navegador y no da puntos.
// =====================================================================
const FORMATO = {
  economia: "Tres partes como en el examen real: A) tipo test (4 opciones, una correcta), B) definiciones y conceptos (respuesta corta), C) ejercicios numéricos con su planteamiento.",
  mates: "Ejercicios de cálculo y problemas, pidiendo el desarrollo paso a paso. Alguna pregunta tipo test de conceptos.",
  fyq: "Formulación y nomenclatura química (SIEMPRE nomenclatura tradicional/clásica, nunca IUPAC), preguntas de teoría y problemas numéricos con unidades.",
  ingles: "Todo en inglés: vocabulary (translate/define), word formation (form the right word), grammar (fill in the gaps, rewrite the sentence), y alguna pregunta tipo test.",
  filosofia: "Definiciones de conceptos, preguntas cortas sobre autores y una pregunta de desarrollo.",
  lengua: "Teoría de lengua y literatura con preguntas cortas, alguna de análisis sintáctico (pide el análisis) y comentario breve.",
  bio: "Preguntas cortas, de relacionar conceptos y alguna tipo test.",
  ef: "Tipo test y preguntas cortas.",
  tic: "Tipo test y preguntas cortas.",
};
const TIPOS_P = ["test", "vf", "corta", "desarrollo", "ejercicio"];
async function gemini(env, partes, json, temp = 0.4) {
  let ultimo = "";
  for (const modelo of (env.MODELO ? [env.MODELO] : MODELOS)) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_KEY },
      body: JSON.stringify({ contents: [{ role: "user", parts: partes }], generationConfig: { temperature: temp, ...(json ? { responseMimeType: "application/json" } : {}) } }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { const t = (d.candidates?.[0]?.content?.parts || []).map(x => x.text || "").join("").trim(); if (t) return t; ultimo = "La IA no ha respondido."; }
    else { ultimo = d.error?.message || "Error " + r.status; if (r.status === 429) throw new Error("Se ha gastado el cupo gratis de la IA por hoy. Prueba mañana."); if (r.status === 400 && /API key/i.test(ultimo)) throw new Error("La clave de Gemini no es válida (GEMINI_KEY)."); }
  }
  throw new Error(ultimo || "La IA no responde.");
}
const leerJSON = (t) => { try { return JSON.parse(t); } catch (e) { const m = String(t).match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); throw new Error("La IA ha devuelto algo raro. Prueba otra vez."); } };
const corta = (s, n) => String(s ?? "").slice(0, n);
function limpiarExamen(x) {
  const P = (Array.isArray(x.preguntas) ? x.preguntas : []).slice(0, 25).map(q => {
    const tipo = TIPOS_P.includes(q.tipo) ? q.tipo : "corta";
    const o = { tipo, enunciado: corta(q.enunciado, 1500), puntos: Math.max(0.25, Math.min(10, Number(q.puntos) || 1)), solucion: corta(q.solucion, 2500), criterios: corta(q.criterios, 800), tema: corta(q.tema, 120) };
    if (tipo === "test") { o.opciones = (q.opciones || []).slice(0, 6).map(s => corta(s, 300)); o.correcta = Math.max(0, Math.min(o.opciones.length - 1, Number(q.correcta) || 0)); }
    if (tipo === "vf") o.correcta = q.correcta === true || q.correcta === "true" || q.correcta === "V" || q.correcta === "Verdadero";
    return o;
  }).filter(q => q.enunciado && (q.tipo !== "test" || q.opciones.length >= 2));
  if (!P.length) throw new Error("La IA no ha hecho preguntas. Prueba otra vez.");
  const total = P.reduce((s, q) => s + q.puntos, 0); P.forEach(q => { q.puntos = Math.round(q.puntos / total * 10 * 100) / 100; });  // siempre sobre 10
  return { titulo: corta(x.titulo || "Examen de prueba", 140), preguntas: P };
}
const sinSoluciones = (ex) => ({ ...ex, preguntas: ex.preguntas.map(({ solucion, criterios, correcta, ...q }) => q) });
const memCupo = new Map();   // sin FIREBASE_SA: límite aproximado en memoria
async function cupoExamen(env, uid, clave, max) {
  if (env.FIREBASE_SA) return cupo(env, uid, clave, max).catch(() => true);
  const k = uid + clave + new Date().toISOString().slice(0, 10), n = memCupo.get(k) || 0; if (n >= max) return false; memCupo.set(k, n + 1); return true;
}
async function generarExamen(env, c) {
  const asig = String(c.asig || ""), mapa = (c.mapa || []).slice(0, 30).map(m => `- ${corta(m.texto, 160)} (${Math.round((Number(m.p) || 0) * 100)}%)`).join("\n");
  const temario = (c.temario || []).slice(0, 20).map(t => "- " + corta(t, 200)).join("\n");
  const material = corta((c.material || []).map(m => corta(m, 9000)).join("\n\n---\n\n"), 24000);
  const pide = corta(c.especificaciones, 600).trim();
  const prompt = `Eres profesor de 1.º de Bachillerato en España (asignatura: ${asig}). Prepara un EXAMEN DE PRUEBA en español${asig === "ingles" ? " (las preguntas en inglés)" : ""}.
Examen real: «${corta(c.titulo, 140)}».
${pide ? `El alumno pide: ${pide}\n(Respeta lo que pide: número y tipo de preguntas, temas…)` : "No hay especificaciones: haz un examen como el real, de unos 45-60 minutos, centrado en lo más probable."}
Formato típico de esta asignatura: ${FORMATO[asig] || "mezcla de tipo test, preguntas cortas y alguna de desarrollo."}
Lo que es más probable que entre (con su probabilidad), da más peso a lo de arriba:
${mapa || "(sin datos)"}
Temario del examen:
${temario || "(sin datos)"}
Apuntes de la clase (úsalos como fuente; no inventes contenidos que no estén en el temario o los apuntes):
${material || "(no hay apuntes)"}

Responde SOLO con JSON con esta forma:
{"titulo": "...", "preguntas": [{"tipo": "test|vf|corta|desarrollo|ejercicio", "enunciado": "...", "opciones": ["..."] (solo test), "correcta": número de la opción empezando en 0 (test) o true/false (vf), "solucion": "respuesta modelo completa", "criterios": "cómo se puntúa (para corregir)", "puntos": número, "tema": "contenido que evalúa"}]}
Las fórmulas en LaTeX entre $...$. Los puntos deben sumar 10.`;
  return limpiarExamen(leerJSON(await gemini(env, [{ text: prompt }], true, 0.5)));
}
// corrige las preguntas abiertas con la IA; las de test y V/F se corrigen solas
async function corregirExamen(env, ex, respuestas) {
  const res = ex.preguntas.map((q, i) => {
    const r = respuestas[i];
    if (q.tipo === "test") return { i, puntos: Number(r) === q.correcta ? q.puntos : 0, bien: Number(r) === q.correcta, comentario: Number(r) === q.correcta ? "Correcta." : `La correcta era: ${q.opciones[q.correcta]}` };
    if (q.tipo === "vf") { const ok = (r === true || r === "true") === q.correcta; return { i, puntos: ok ? q.puntos : 0, bien: ok, comentario: ok ? "Correcta." : `Era ${q.correcta ? "verdadero" : "falso"}.` }; }
    return null;
  });
  const abiertas = ex.preguntas.map((q, i) => ({ q, i })).filter(({ q }) => q.tipo !== "test" && q.tipo !== "vf");
  const conTexto = abiertas.filter(({ i }) => String(respuestas[i] || "").trim());
  abiertas.filter(({ i }) => !String(respuestas[i] || "").trim()).forEach(({ i }) => { res[i] = { i, puntos: 0, bien: false, comentario: "Sin responder." }; });
  if (conTexto.length) {
    const prompt = `Corrige estas respuestas de un examen de 1.º de Bachillerato (España). Sé justo pero exigente, como un profesor; acepta respuestas correctas aunque estén dichas con otras palabras. En química, la nomenclatura tradicional es válida.
${conTexto.map(({ q, i }) => `### Pregunta ${i} (${q.puntos} puntos, tipo ${q.tipo})
Enunciado: ${q.enunciado}
Respuesta modelo: ${q.solucion}
Criterios: ${q.criterios || "-"}
Respuesta del alumno: ${corta(respuestas[i], 3000)}`).join("\n\n")}

Responde SOLO con JSON: {"resultados": [{"i": número de pregunta, "puntos": nota de esa pregunta (de 0 a sus puntos), "comentario": "qué está bien, qué falta y cómo mejorarla (2-3 frases)"}]}`;
    const d = leerJSON(await gemini(env, [{ text: prompt }], true, 0.1));
    for (const r of d.resultados || []) { const q = ex.preguntas[r.i]; if (!q || res[r.i]) continue; const p = Math.max(0, Math.min(q.puntos, Number(r.puntos) || 0)); res[r.i] = { i: r.i, puntos: Math.round(p * 100) / 100, bien: p >= q.puntos * 0.7, comentario: corta(r.comentario, 600) }; }
    conTexto.forEach(({ i }) => { if (!res[i]) res[i] = { i, puntos: 0, bien: false, comentario: "No se ha podido corregir esta pregunta." }; });
  }
  const nota = Math.round(res.reduce((s, r) => s + (r ? r.puntos : 0), 0) * 100) / 100;
  return { nota: Math.min(10, nota), resultados: res, soluciones: ex.preguntas.map(q => ({ solucion: q.solucion, correcta: q.correcta })) };
}
const PTS_EXAMEN = (nota) => Math.round(Math.max(0, Math.min(10, nota)) * 3);  // hasta 30 puntos por examen
const MAX_EXAMENES_DIA = 5, MAX_CON_PUNTOS = 3;
async function sumarBonus(env, uid, pts) {
  const dia = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" })), h = dia.getFullYear() + "-" + String(dia.getMonth() + 1).padStart(2, "0") + "-" + String(dia.getDate()).padStart(2, "0");
  const p = (await fsGet(env, "progreso/" + uid).catch(() => null)) || {}, b = (p.bonus && Number(p.bonus[h])) || 0;
  const r = await fetch(`${FS}/progreso/${uid}?updateMask.fieldPaths=${encodeURIComponent("bonus.`" + h + "`")}`, { method: "PATCH", headers: { Authorization: "Bearer " + await tokenServicio(env), "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { bonus: { mapValue: { fields: { [h]: { integerValue: String(b + pts) } } } } } }) });
  if (!r.ok) throw new Error("No se han podido guardar los puntos.");
  return b + pts;
}
async function rutaExamen(ruta, req, env, origen) {
  if (!env.GEMINI_KEY) return responder({ error: "Falta el secreto GEMINI_KEY en Cloudflare." }, 500, origen);
  let uid; try { uid = await verificarToken((req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "")); } catch (e) { return responder({ error: "Entra en el portal con tu cuenta." }, 401, origen); }
  if (Number(req.headers.get("Content-Length") || 0) > 200000) return responder({ error: "Demasiado texto." }, 413, origen);
  const c = await req.json().catch(() => ({}));
  if (env.FIREBASE_SA) { const r = await remitente(env, uid); if (r.baneado) return responder({ error: "No tienes acceso." }, 403, origen); }
  if (ruta === "/examen") {
    if (!(await cupoExamen(env, uid, "examen", MAX_EXAMENES_DIA))) return responder({ error: `Ya has hecho ${MAX_EXAMENES_DIA} exámenes de prueba hoy (es el límite para no gastar el cupo gratis de la IA). Mañana más.` }, 429, origen);
    const ex = await generarExamen(env, c);
    if (env.FIREBASE_SA) {
      const id = await fsAdd(env, `examenesIA/${uid}/items`, { ...ex, examen: corta(c.examen, 60), asig: corta(c.asig, 30), estado: "abierto", t: Date.now(), pide: corta(c.especificaciones, 600) });
      return responder({ id, examen: sinSoluciones(ex), puntos: true }, 200, origen);
    }
    return responder({ examen: ex, puntos: false }, 200, origen);
  }
  // /corregir
  const respuestas = Array.isArray(c.respuestas) ? c.respuestas.slice(0, 25).map(r => typeof r === "string" ? corta(r, 3000) : r) : [];
  if (!(await cupoExamen(env, uid, "corregir", MAX_EXAMENES_DIA + 3))) return responder({ error: "Has corregido muchos exámenes hoy. Mañana más." }, 429, origen);
  if (env.FIREBASE_SA && c.id) {
    const ruta2 = `examenesIA/${uid}/items/${encodeURIComponent(String(c.id))}`, ex = await fsGet(env, ruta2);
    if (!ex) return responder({ error: "No encuentro ese examen." }, 404, origen);
    if (ex.estado === "corregido") return responder({ error: "Este examen ya está corregido." }, 409, origen);
    const r = await corregirExamen(env, ex, respuestas);
    const hechosHoy = Number(((await fsGet(env, "cupos/" + uid).catch(() => null)) || {})["puntosEx_" + new Date().toISOString().slice(0, 10)] || 0);
    let puntos = 0;
    if (hechosHoy < MAX_CON_PUNTOS) { puntos = PTS_EXAMEN(r.nota); await cupo(env, uid, "puntosEx", MAX_CON_PUNTOS).catch(() => {}); await sumarBonus(env, uid, puntos); }
    await fsSet(env, ruta2, { estado: "corregido", respuestas, nota: r.nota, resultados: r.resultados, puntos, tc: Date.now() });
    return responder({ ...r, puntos }, 200, origen);
  }
  // sin cuenta de servicio: el examen viene del navegador (con soluciones) y no da puntos
  const ex = limpiarExamen({ titulo: c.titulo, preguntas: c.preguntas || [] });
  return responder({ ...(await corregirExamen(env, ex, respuestas)), puntos: 0 }, 200, origen);
}
