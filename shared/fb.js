// Conexión común a Firebase para todo el portal (la sesión se guarda en el navegador: se entra una vez).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import * as fs from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDD6se-GS7Auxxuunj9FDo1JpP929mvWyc",
  authDomain: "portal-1bach-6c1eb.firebaseapp.com",
  projectId: "portal-1bach-6c1eb",
  storageBucket: "portal-1bach-6c1eb.firebasestorage.app",
  messagingSenderId: "946924855723",
  appId: "1:946924855723:web:e3455c6d6b41bfcbc8f2ee"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = fs.getFirestore(app);
export { fs };
getRedirectResult(auth).catch(() => {});

export async function entrar() {
  const p = new GoogleAuthProvider();
  try { await signInWithPopup(auth, p); }
  catch (e) {
    if (["auth/popup-blocked", "auth/operation-not-supported-in-environment", "auth/cancelled-popup-request"].includes(e.code)) return signInWithRedirect(auth, p);
    throw e;
  }
}
export const salir = () => signOut(auth);

let latido = null;
// Avisa cuando cambia la sesión y marca al usuario como conectado (para la lista de la clase).
export function alCambiarSesion(cb) {
  onAuthStateChanged(auth, async (user) => {
    clearInterval(latido);
    if (user) {
      const yo = fs.doc(db, "usuarios", user.uid);
      const datos = { nombreGoogle: user.displayName || "Sin nombre", fotoGoogle: user.photoURL || "", visto: Date.now() };
      try {
        await fs.setDoc(yo, datos, { merge: true });
        await fs.setDoc(fs.doc(db, "privado", user.uid), { email: user.email || "" }, { merge: true });
      } catch (e) { console.warn("No se pudo guardar el usuario", e); }
      latido = setInterval(() => fs.updateDoc(yo, { visto: Date.now() }).catch(() => {}), 60000);
    }
    cb(user);
  });
}
// Escucha la lista de compañeros: cb({uid: {nombre, foto, visto}})
export function alCambiarClase(cb) {
  return fs.onSnapshot(fs.collection(db, "usuarios"), (snap) => {
    const u = {}; snap.docs.forEach(d => u[d.id] = d.data()); cb(u);
  }, (e) => console.warn(e));
}
export const conectado = (u) => Date.now() - (u.visto || 0) < 150000;
export const nombreDe = (u) => (u && (u.nombre || u.nombreGoogle)) || "Sin nombre";
export const fotoDe = (u) => (u && (u.fotoPropia || u.fotoGoogle)) || "";
// Guarda el resumen de una app en progreso/{uid}.apps[app] = {ok, total, dia, ok0}
// ok0 = lo que llevabas al empezar el día (para el ranking de hoy)
export const hoyISO = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
export async function guardarProgreso(app, ok, total) {
  const u = auth.currentUser; if (!u) return;
  const ref = fs.doc(db, "progreso", u.uid), hoy = hoyISO();
  try {
    const snap = await fs.getDoc(ref); const prev = ((snap.exists() && snap.data().apps) || {})[app];
    // en las apps que guardan el progreso en el navegador, los puntos no bajan (p. ej. al cambiar de dirección web)
    if (prev && ["verbos", "afijos", "wf"].includes(app) && (prev.ok || 0) > ok) ok = prev.ok;
    const ok0 = prev && prev.dia === hoy ? (prev.ok0 ?? 0) : (prev ? prev.ok || 0 : (["verbos", "afijos", "wf"].includes(app) ? ok : 0));
    const nuevo = { ok, total, t: Date.now(), dia: hoy, ok0 }, datos = snap.exists() ? snap.data() : {};
    const hoyPts = ptsHoyDe({ apps: { ...(datos.apps || {}), [app]: nuevo }, dias: datos.dias }, hoy), dias = { [hoy]: hoyPts };
    // antes de empezar un día nuevo en esta app, se apuntan los puntos que hiciste el último día que la usaste
    if (prev && prev.dia && prev.dia !== hoy) { const v = ptsHoyDe(datos, prev.dia); if (v > 0) dias[prev.dia] = v; }
    await fs.setDoc(ref, { apps: { [app]: nuevo }, dias }, { merge: true });
  } catch (e) {}
}
// Páginas que solo se ven con cuenta: si no has entrado, te manda a la portada para entrar con Google
// y, al entrar, te devuelve aquí.
export function exigirCuenta() {
  const html = document.documentElement; html.style.visibility = "hidden";
  const raiz = new URL("../", import.meta.url);
  const ir = () => location.replace(raiz.href + "?volver=" + encodeURIComponent(location.pathname + location.search + location.hash));
  // si la sesión tarda en responder (móvil o red lenta), se enseña la página en vez de dejarla en blanco o mandarte a la portada
  const t = setTimeout(() => { html.style.visibility = ""; }, 4000);
  onAuthStateChanged(auth, (u) => { clearTimeout(t); if (u) html.style.visibility = ""; else ir(); });
}
// Se actualiza sola: cuando se publica una versión nueva (version.json cambia), la página se recarga
// (si estás escribiendo algo, espera a que termines).
(() => {
  const url = new URL("../version.json", import.meta.url).href; let v0 = null, pend = false;
  const escribiendo = () => { const a = document.activeElement; return a && /^(TEXTAREA|INPUT|SELECT)$/.test(a.tagName) && a.value; };
  const recargar = () => {
    if (escribiendo()) { setTimeout(recargar, 8000); return; }
    const b = document.createElement("div"); b.textContent = "Hay una versión nueva · actualizando…";
    b.style.cssText = "position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:9999;background:#141a2e;color:#fff;font:700 14px system-ui,sans-serif;padding:10px 16px;border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,.35)";
    document.body.append(b); setTimeout(() => location.reload(), 900);
  };
  const mira = async () => {
    if (pend) return;
    try { const j = await (await fetch(url + "?t=" + Date.now(), { cache: "no-store" })).json();
      if (v0 == null) v0 = j.v; else if (j.v !== v0) { pend = true; recargar(); } } catch (e) {}
  };
  mira(); setInterval(mira, 45000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) mira(); });
})();
// ---------- botón de casa (vuelve al inicio) en todas las páginas ----------
const RAIZ = new URL("../", import.meta.url);
(() => {
  const st = document.createElement("style");
  st.textContent = `.casa-1b{position:fixed;top:10px;left:10px;z-index:95;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.72);color:#8a919e;border:1px solid rgba(0,0,0,.08);box-shadow:0 1px 4px rgba(0,0,0,.12);text-decoration:none;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);transition:color .15s,background .15s}
.casa-1b:hover,.casa-1b:focus-visible{color:#141a2e;background:#fff}.casa-1b svg{width:19px;height:19px}
.casa-1b[hidden]{display:none}
.casa-1b.abajo{top:auto;left:12px;bottom:calc(136px + env(safe-area-inset-bottom,0px));width:40px;height:40px;background:rgba(255,255,255,.85)}
@media (min-width:1024px){.casa-1b.abajo{bottom:66px}}
.aviso-1b{position:fixed;left:50%;top:12px;transform:translate(-50%,-140%);z-index:9998;display:flex;align-items:center;gap:10px;max-width:min(92vw,460px);background:#141a2e;color:#fff;border-radius:16px;padding:11px 14px 11px 12px;box-shadow:0 10px 30px rgba(0,0,0,.4);font:600 14px/1.35 system-ui,sans-serif;cursor:pointer;transition:transform .35s ease}
.aviso-1b.ver{transform:translate(-50%,0)}.aviso-1b b{color:#ffd75e}.aviso-1b .ic{font-size:22px}.aviso-1b img,.aviso-1b .av{width:34px;height:34px;border-radius:50%;object-fit:cover;flex:none;background:#3b4258;display:grid;place-items:center;font-weight:800}`;
  document.head.append(st);
  const a = document.createElement("a"); a.className = "casa-1b"; a.href = RAIZ.href; a.title = "Inicio"; a.setAttribute("aria-label", "Ir al inicio");
  a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/></svg>';
  const enPortal = location.pathname === RAIZ.pathname || location.pathname === RAIZ.pathname + "index.html";
  if (enPortal) {
    a.onclick = (e) => { e.preventDefault(); const f = document.getElementById("pfm"); if (f) f.hidden = true; if (location.hash) location.hash = ""; window.scrollTo({ top: 0 }); };
    const ver = () => { a.hidden = !location.hash || location.hash === "#" || document.body.classList.contains("con-splash"); };
    addEventListener("hashchange", ver); new MutationObserver(ver).observe(document.body, { attributes: true, attributeFilter: ["class"] }); ver();
  }
  if (document.querySelector(".b1-back")) a.classList.add("abajo");
  document.body.append(a);
})();
// ---------- aviso cuando alguien te adelanta en el ranking ----------
function avisar(html, ir, dura = 7000) {
  const d = document.createElement("div"); d.className = "aviso-1b"; d.setAttribute("role", "status"); d.innerHTML = html;
  d.onclick = () => { location.href = RAIZ.href + "#" + ir; d.remove(); };
  document.body.append(d); requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add("ver")));
  setTimeout(() => { d.classList.remove("ver"); setTimeout(() => d.remove(), 400); }, dura);
}
const APPS_R = ["vocab", "plur", "verbos", "afijos", "wf"];
// Puntos del día: lo que has avanzado hoy en cada app (vuelven a 0 cada día). Se guardan en progreso.dias[fecha] y nunca bajan.
const ganadoHoy = (p, hoy) => Math.round(APPS_R.reduce((s, k) => { const a = p && p.apps && p.apps[k]; if (!a || a.dia !== hoy || !a.total) return s; return s + Math.max(0, (a.ok - (a.ok0 || 0)) / a.total) * 100; }, 0));
export const ptsHoyDe = (p, hoy = hoyISO()) => Math.max(ganadoHoy(p, hoy), Number(((p && p.dias) || {})[hoy]) || 0);
const lunes = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export const diasSemana = (atras = 0) => { const l = lunes(new Date()); l.setDate(l.getDate() - 7 * atras); return Array.from({ length: 7 }, (_, i) => { const d = new Date(l); d.setDate(l.getDate() + i); return iso(d); }); };
// Semana en la que empezaron los puntos diarios: lo que ya tenías antes se suma a esa semana y se guarda una vez
const SEM0 = "2026-11-09";
function calcLegado(p) { const h = hoyISO();
  const base = Math.round(APPS_R.reduce((s, k) => { const a = p && p.apps && p.apps[k]; if (!a || !a.total) return s; return s + Math.min(1, (a.dia === h ? (a.ok0 || 0) : a.ok) / a.total) * 100; }, 0));
  const prev = diasSemana(0)[0] === SEM0 ? diasSemana(0).filter(f => f < h).reduce((s, f) => s + ptsHoyDe(p, f), 0) : 0; return Math.max(0, base - prev); }
export const ptsSemanaDe = (p, atras = 0) => { const d = diasSemana(atras), v = d.reduce((s, x) => s + ptsHoyDe(p, x), 0); if (d[0] !== SEM0) return v; return Math.max(v + (typeof (p && p.legado) === "number" ? p.legado : calcLegado(p)), ptsDe(p)); };
onAuthStateChanged(auth, async (u) => {
  if (!u || diasSemana(0)[0] !== SEM0) return;
  try { const ref = fs.doc(db, "progreso", u.uid), s = await fs.getDoc(ref), p = s.exists() ? s.data() : {};
    if (typeof p.legado !== "number") await fs.setDoc(ref, { legado: calcLegado(p) }, { merge: true }); } catch (e) {}
});
export const ptsDe = (p) => Math.round(APPS_R.reduce((s, k) => { const a = p && p.apps && p.apps[k]; return s + (a && a.total ? Math.min(1, a.ok / a.total) * 100 : 0); }, 0));
const escH = (t) => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
let quitarRank = null;
// Guarda quién iba por delante (en tu cuenta, para que funcione en cualquier dispositivo) y te avisa
// de quién te ha adelantado: en directo, o al volver si estabas desconectado o con la pestaña en segundo plano.
const TOP = 5;
let pendiente = null;
async function avisoAdelanto(nuevos, posAntes, posAhora, alVolver) {
  if (concentracion()) return;
  if (document.hidden) { pendiente = { nuevos, posAntes: pendiente ? pendiente.posAntes : posAntes, posAhora, alVolver: true }; return; }
  const datos = await Promise.all(nuevos.slice(0, 3).map(id => fs.getDoc(fs.doc(db, "usuarios", id)).then(s => s.exists() ? s.data() : {}).catch(() => ({}))));
  const nom = d => d.nombre || d.nombreGoogle || "Alguien";
  const n0 = datos[0] || {}, foto = n0.fotoPropia || n0.fotoGoogle || "";
  let quien = datos.map(nom).map(x => `<b>${escH(x)}</b>`);
  quien = nuevos.length === 1 ? quien[0] + " te ha adelantado" : (nuevos.length <= 3 ? quien.slice(0, -1).join(", ") + " y " + quien.slice(-1) : quien.join(", ") + ` y ${nuevos.length - 3} más`) + " te han adelantado";
  const top = posAhora <= TOP ? (posAntes && posAntes <= TOP ? ` Sigues en los ${TOP} primeros.` : "") : (posAntes && posAntes <= TOP ? ` Ya no estás en los ${TOP} primeros.` : "");
  const pos = posAntes && posAntes !== posAhora ? `Bajas del <b>${posAntes}.º</b> al <b>${posAhora}.º</b>.` : `Ahora vas <b>${posAhora}.º</b>.`;
  avisar(`${foto ? `<img src="${escH(foto)}" alt="" referrerpolicy="no-referrer">` : `<span class="av">${escH(nom(n0).charAt(0).toUpperCase())}</span>`}<span>${alVolver ? "👋 Mientras no estabas: " : "⚠️ "}${quien} en el ranking. ${pos}${top} ¡A estudiar!</span>`, "amigos", alVolver ? 11000 : 7000);
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && pendiente) { const p = pendiente; pendiente = null; avisoAdelanto(p.nuevos, p.posAntes, p.posAhora, true); } });
let quitarUsRank = null;
onAuthStateChanged(auth, (u) => {
  if (quitarRank) { quitarRank(); quitarRank = null; }
  if (quitarUsRank) { quitarUsRank(); quitarUsRank = null; }
  if (!u) return;
  const ref = fs.doc(db, "progreso", u.uid);
  // Solo cuenta lo mismo que la gráfica del ranking: personas con perfil, no expulsadas, y datos del servidor (no de la caché)
  let usuarios = null, progreso = null, mio = {}, antes = undefined, guardado = "", espera = null;
  const tabla = () => { const pts = {}; for (const id in usuarios) if (!usuarios[id].baneado) pts[id] = progreso[id] || 0; pts[u.uid] = progreso[u.uid] || 0; return pts; };
  const situacion = (pts) => { const yo = pts[u.uid] || 0, delante = Object.keys(pts).filter(id => id !== u.uid && pts[id] > yo); return { yo, delante, pos: delante.length + 1, pts }; };
  function comprobar() {
    if (!usuarios || !progreso) return;
    const ahora = situacion(tabla());
    const hoy = hoyISO();
    if (antes === undefined) { const r = mio.rankVisto; antes = r && r.pts && typeof r.pts === "object" ? r : null; }
    // el ranking es del día: al cambiar de día todos empiezan en 0
    if (antes && antes.dia !== hoy) antes = { delante: [], pos: null, yo: 0, pts: {}, dia: hoy };
    // alguien te ha adelantado de verdad: antes tenía tus puntos o menos, ahora tiene más, y ha sido porque ha subido él
    const adelantos = (prev) => !prev || !prev.pts ? [] : ahora.delante.filter(id => { const ant = prev.pts[id] || 0; return ant <= (prev.yo || 0) && ahora.pts[id] > ant; });
    const nuevos = adelantos(antes);
    if (nuevos.length) {
      if (espera) return; // ya hay una comprobación en marcha
      const prev = antes;
      // se vuelve a comprobar unos segundos después con los datos frescos, para que el aviso coincida con la gráfica
      espera = setTimeout(() => { const ok = situacion(tabla()), siguen = nuevos.filter(id => ok.delante.includes(id) && ok.pts[id] > ((prev.pts || {})[id] || 0));
        espera = null; if (siguen.length) avisoAdelanto(siguen, prev.pos || null, ok.pos, primeraVez).catch(() => {}); primeraVez = false; guardar(ok); }, 4000);
      return;
    }
    primeraVez = false; guardar(ahora);
  }
  let primeraVez = true;
  function guardar(sit) {
    const dia = hoyISO();
    antes = { delante: sit.delante, pos: sit.pos, yo: sit.yo, pts: sit.pts, dia };
    const firma = JSON.stringify([dia, sit.yo, sit.pos, sit.pts]);
    if (firma !== guardado) { guardado = firma; fs.setDoc(ref, { rankVisto: { delante: sit.delante, pos: sit.pos, yo: sit.yo, pts: sit.pts, dia, t: Date.now() } }, { merge: true }).catch(() => {}); }
  }
  quitarUsRank = fs.onSnapshot(fs.collection(db, "usuarios"), (snap) => {
    if (snap.metadata && snap.metadata.fromCache) return;
    usuarios = {}; snap.docs.forEach(d => { usuarios[d.id] = d.data(); }); comprobar();
  }, () => {});
  quitarRank = fs.onSnapshot(fs.collection(db, "progreso"), (snap) => {
    const pts = {}; snap.docs.forEach(d => { pts[d.id] = ptsHoyDe(d.data()); if (d.id === u.uid) mio = d.data(); });
    window.__rank1b = pts; document.dispatchEvent(new CustomEvent("rank1b", { detail: pts }));
    if (snap.metadata && (snap.metadata.fromCache || snap.metadata.hasPendingWrites)) return;
    progreso = pts; comprobar();
  }, () => {});
});
// ---------- expulsión: mensaje en el centro de la pantalla ----------
let quitarBan = null;
onAuthStateChanged(auth, (u) => {
  if (quitarBan) { quitarBan(); quitarBan = null; }
  document.getElementById("ban1b")?.remove();
  if (!u) return;
  quitarBan = fs.onSnapshot(fs.doc(db, "baneos", u.uid), (s) => {
    document.getElementById("ban1b")?.remove();
    if (!s.exists()) return;
    const m = (s.data() || {}).motivo || "Has sido expulsado de 1 BACH.";
    const d = document.createElement("div"); d.id = "ban1b";
    d.innerHTML = `<style>#ban1b{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:20px;background:rgba(10,14,30,.94);backdrop-filter:blur(6px);font-family:system-ui,sans-serif}
#ban1b .c{max-width:460px;width:100%;background:#fff;color:#14182b;border-radius:18px;padding:30px 26px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5)}
#ban1b .i{font-size:44px;line-height:1}#ban1b h2{margin:10px 0 8px;font-size:22px}#ban1b p{margin:0 0 20px;font-size:17px;line-height:1.4;white-space:pre-wrap;overflow-wrap:anywhere}
#ban1b button{font:700 15px system-ui,sans-serif;border:0;border-radius:999px;padding:10px 20px;background:#14182b;color:#fff;cursor:pointer}</style>
<div class="c" role="alertdialog" aria-modal="true"><div class="i">🚫</div><h2>No puedes entrar en 1 BACH</h2><p>${escH(m)}</p><button type="button">Cerrar sesión</button></div>`;
    d.querySelector("button").onclick = () => signOut(auth).catch(() => {});
    document.body.append(d);
  }, () => {});
});
// ---------- modo concentración y avisos del chat ----------
export const concentracion = () => { try { return localStorage.getItem("concentracion") === "1"; } catch (e) { return false; } };
export function ponerConcentracion(v) { try { localStorage.setItem("concentracion", v ? "1" : "0"); } catch (e) {} document.documentElement.classList.toggle("concentracion-1b", !!v); document.dispatchEvent(new CustomEvent("concentracion1b", { detail: !!v })); }
document.documentElement.classList.toggle("concentracion-1b", concentracion());
const enPortal1b = location.pathname === RAIZ.pathname || location.pathname === RAIZ.pathname + "index.html";
async function quienEs(id) { try { const s = await fs.getDoc(fs.doc(db, "usuarios", id)); return s.exists() ? s.data() : {}; } catch (e) { return {}; } }
async function avisoMensaje(uid, texto, ir, priv, mencion) {
  if (concentracion()) return;
  const h = location.hash.slice(1);
  if (enPortal1b && (h === ir || (ir === "chat" && h === "chat"))) return;
  const u = await quienEs(uid), nom = u.nombre || u.nombreGoogle || "Alguien", foto = u.fotoPropia || u.fotoGoogle || "";
  avisar(`${foto ? `<img src="${escH(foto)}" alt="" referrerpolicy="no-referrer">` : `<span class="av">${escH(nom.charAt(0).toUpperCase())}</span>`}<span>${mencion ? "📣" : priv ? "🔒" : "💬"} <b>${escH(nom)}</b>${mencion ? " te ha mencionado en el chat" : priv ? " te ha escrito" : " en el chat"}: ${escH(String(texto || "📷 Foto").slice(0, 90))}</span>`, ir, mencion ? 10000 : 7000);
}
let quitarAvisos = [];
onAuthStateChanged(auth, (u) => {
  quitarAvisos.forEach(f => f()); quitarAvisos = [];
  if (!u) return;
  const inicio = Date.now(); let ultChat = inicio; const ultPriv = {}; let bloq = {};
  quitarAvisos.push(fs.onSnapshot(fs.doc(db, "bloqueos", u.uid), s => { bloq = s.exists() ? s.data() : {}; }, () => {}));
  quitarAvisos.push(fs.onSnapshot(fs.query(fs.collection(db, "chat"), fs.orderBy("t"), fs.limitToLast(1)), snap => {
    snap.docs.forEach(d => { const m = d.data(); if ((m.t || 0) > ultChat && m.uid !== u.uid && !bloq.chat) { ultChat = m.t; avisoMensaje(m.uid, m.texto, "chat", false, (m.menc || []).includes(u.uid)); } });
  }, () => {}));
  quitarAvisos.push(fs.onSnapshot(fs.query(fs.collection(db, "privados"), fs.where("miembros", "array-contains", u.uid)), snap => {
    snap.docs.forEach(d => { const c = d.data(), m = c.ultimo || {}; if (bloq.privados || !m.t || m.uid === u.uid || m.t <= inicio || m.t <= (ultPriv[d.id] || 0)) return;
      ultPriv[d.id] = m.t; avisoMensaje(m.uid, m.texto, "privado-" + m.uid, true); });
  }, () => {}));
});
// ---------- modo administrador (solo la cuenta de Guillermo) ----------
// SHA-256 en JavaScript por si el navegador no deja usar crypto.subtle (algunos navegadores dentro de apps)
function sha256js(m) {
  const K = [], H = [], p = (n) => { for (let f = 2; f * f <= n; f++) if (n % f === 0) return false; return true; };
  for (let n = 2, i = 0; i < 64; n++) if (p(n)) { if (i < 8) H[i] = (Math.pow(n, 1 / 2) * 2 ** 32) | 0; K[i++] = (Math.pow(n, 1 / 3) * 2 ** 32) | 0; }
  const b = [...new TextEncoder().encode(m)], l = b.length * 8; b.push(0x80); while (b.length % 64 !== 56) b.push(0);
  for (let i = 7; i >= 0; i--) b.push(i > 3 ? 0 : (l >>> (i * 8)) & 255);
  const r = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < b.length; o += 64) {
    const w = []; for (let i = 0; i < 16; i++) w[i] = (b[o + 4 * i] << 24) | (b[o + 4 * i + 1] << 16) | (b[o + 4 * i + 2] << 8) | b[o + 4 * i + 3];
    for (let i = 16; i < 64; i++) { const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
    let [a, bb, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) { const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0; h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0; }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map(x => (x >>> 0).toString(16).padStart(8, "0")).join("");
}
const ADMIN_HS = ["567368fac0b19f0df9590340c50247491ee14e5df1325c518877acbdeabcb98a", "3f2d11649c13eec8cba8a9851c96d40eb6e2b2d2f139939ed667a5001d2c3bb7", "0ae3100b6386404bc796d8a829ec4de9537464551200084507056c389ce17e90"];
let soyAdmin = false;
export const esAdmin = () => soyAdmin;
export const modoAdmin = () => { try { return soyAdmin && localStorage.getItem("modoAdmin") === "1"; } catch (e) { return false; } };
function aplicarAdmin() {
  const on = modoAdmin(); window.__esAdmin1b = soyAdmin; document.documentElement.classList.toggle("admin-1b", on);
  const b = document.querySelector(".adm-1b"); if (b) b.setAttribute("aria-pressed", String(on));
  document.dispatchEvent(new CustomEvent("admin1b", { detail: on }));
}
onAuthStateChanged(auth, async (u) => {
  const correo = String((u && u.email) || "").trim().toLowerCase();
  let h = ""; try { const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(correo)); h = [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, "0")).join(""); } catch (e) { h = sha256js(correo); }
  if (!h) h = sha256js(correo);
  soyAdmin = !!u && ADMIN_HS.includes(h);
  // por si el correo no coincide: si Firebase te deja escribir en clase/ (regla admin()), eres administrador
  if (u && !soyAdmin) {
    let ok = false; try { ok = sessionStorage.getItem("admPing_" + u.uid) === "1"; } catch (e) {}
    if (!ok) ok = await fs.setDoc(fs.doc(db, "clase", "ping"), { t: Date.now() }, { merge: true }).then(() => true).catch(() => false);
    if (ok) { soyAdmin = true; try { sessionStorage.setItem("admPing_" + u.uid, "1"); } catch (e) {} }
  }
  let b = document.querySelector(".adm-1b");
  if (soyAdmin && !b) {
    const st = document.createElement("style");
    st.textContent = `.adm-1b{display:flex;align-items:center;gap:8px;border:1px solid #e3e7ee;background:#fff;color:#3b4258;border-radius:999px;padding:7px 12px 7px 8px;font:700 13px system-ui,sans-serif;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.12);z-index:96}
.adm-1b.suelto{position:fixed;top:10px;right:10px}
.adm-1b .sw{width:30px;height:18px;border-radius:999px;background:#cfd5df;position:relative;transition:background .2s}
.adm-1b .sw::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:transform .2s}
.adm-1b[aria-pressed=true]{background:#141a2e;color:#ffd75e;border-color:#141a2e}.adm-1b[aria-pressed=true] .sw{background:#e5231b}.adm-1b[aria-pressed=true] .sw::after{transform:translateX(12px)}
.adm-1b .t2{font-weight:600;opacity:.7}
@media (max-width:600px){.adm-1b.suelto{top:4px;right:6px;padding:4px 8px 4px 5px;font-size:12px}.adm-1b.suelto .t1{font-size:0}.adm-1b.suelto .t1::before{content:"🛠";font-size:14px}}`;
    document.head.append(st);
    b = document.createElement("button"); b.type = "button"; b.className = "adm-1b"; b.title = "Cambia entre jugador y administrador";
    b.innerHTML = '<span class="sw" aria-hidden="true"></span><span class="t1">🛠 Administrador</span>';
    b.onclick = () => { try { localStorage.setItem("modoAdmin", modoAdmin() ? "0" : "1"); } catch (e) {} aplicarAdmin(); };
    const sitio = () => { const li = document.querySelector(".lat-i"); if (li) { b.classList.remove("suelto"); li.append(b); } else { b.classList.add("suelto"); document.body.append(b); } };
    sitio(); setTimeout(sitio, 1500);
  }
  if (!soyAdmin && b) b.remove();
  aplicarAdmin();
});

// ---------- copia en la nube del progreso que las apps guardan en el navegador ----------
// claves(): lista de claves de localStorage de la app. Si en este navegador no hay nada y en tu cuenta sí, se restaura.
export function copiaEnLaNube(app, claves) {
  let ult = "", t = null;
  const leer = () => { const o = {}; for (const k of claves()) { const v = localStorage.getItem(k); if (v != null) o[k] = v; } return o; };
  const subir = () => { const u = auth.currentUser; if (!u) return; let o; try { o = leer(); } catch (e) { return; } const j = JSON.stringify(o); if (j === ult || j === "{}") return; ult = j;
    fs.setDoc(fs.doc(db, "progreso", u.uid), { copia: { [app]: j } }, { merge: true }).catch(() => {}); };
  onAuthStateChanged(auth, async (u) => {
    clearInterval(t); if (!u) return;
    let local = {}; try { local = leer(); } catch (e) {}
    if (!Object.keys(local).length) {
      try { const s = await fs.getDoc(fs.doc(db, "progreso", u.uid)); const c = s.exists() && s.data().copia && s.data().copia[app];
        if (c) { const o = JSON.parse(c); if (Object.keys(o).length && !sessionStorage.getItem("restaurado_" + app)) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem("restaurado_" + app, "1"); location.reload(); return; } } } catch (e) {}
    }
    subir(); t = setInterval(subir, 15000);
  });
  addEventListener("pagehide", subir); document.addEventListener("visibilitychange", () => { if (document.hidden) subir(); });
}
