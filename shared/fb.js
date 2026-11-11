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
    const ok0 = prev && prev.dia === hoy ? (prev.ok0 ?? 0) : (prev ? prev.ok || 0 : 0);
    await fs.setDoc(ref, { apps: { [app]: { ok, total, t: Date.now(), dia: hoy, ok0: Math.min(ok0, ok) } } }, { merge: true });
  } catch (e) {}
}
// Páginas que solo se ven con cuenta: si no has entrado, te manda a la portada para entrar con Google
// y, al entrar, te devuelve aquí.
export function exigirCuenta() {
  const html = document.documentElement; html.style.visibility = "hidden";
  const raiz = new URL("../", import.meta.url);
  const ir = () => location.replace(raiz.href + "?volver=" + encodeURIComponent(location.pathname + location.search + location.hash));
  const t = setTimeout(ir, 8000);
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
function avisar(html, ir) {
  const d = document.createElement("div"); d.className = "aviso-1b"; d.setAttribute("role", "status"); d.innerHTML = html;
  d.onclick = () => { location.href = RAIZ.href + "#" + ir; d.remove(); };
  document.body.append(d); requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add("ver")));
  setTimeout(() => { d.classList.remove("ver"); setTimeout(() => d.remove(), 400); }, 7000);
}
const APPS_R = ["vocab", "verbos", "afijos", "wf"];
export const ptsDe = (p) => Math.round(APPS_R.reduce((s, k) => { const a = p && p.apps && p.apps[k]; return s + (a && a.total ? Math.min(1, a.ok / a.total) * 100 : 0); }, 0));
const escH = (t) => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
let quitarRank = null;
onAuthStateChanged(auth, (u) => {
  if (quitarRank) { quitarRank(); quitarRank = null; }
  if (!u) return;
  const clave = "rankDelante_" + u.uid;
  quitarRank = fs.onSnapshot(fs.collection(db, "progreso"), async (snap) => {
    const pts = {}; snap.docs.forEach(d => pts[d.id] = ptsDe(d.data()));
    window.__rank1b = pts; document.dispatchEvent(new CustomEvent("rank1b", { detail: pts }));
    const mios = pts[u.uid] || 0;
    const delante = Object.keys(pts).filter(id => id !== u.uid && pts[id] > mios);
    let antes = null; try { antes = JSON.parse(localStorage.getItem(clave) || "null"); } catch (e) {}
    try { localStorage.setItem(clave, JSON.stringify(delante)); } catch (e) {}
    if (!Array.isArray(antes)) return;
    const nuevos = delante.filter(id => !antes.includes(id));
    if (!nuevos.length) return;
    const yo = delante.length + 1;
    const datos = await Promise.all(nuevos.slice(0, 3).map(id => fs.getDoc(fs.doc(db, "usuarios", id)).then(s => s.exists() ? s.data() : {}).catch(() => ({}))));
    const n0 = datos[0] || {}, nom = n0.nombre || n0.nombreGoogle || "Alguien", foto = n0.fotoPropia || n0.fotoGoogle || "";
    const quien = nuevos.length === 1 ? `<b>${escH(nom)}</b> te ha adelantado` : `<b>${escH(nom)}</b> y ${nuevos.length - 1} más te han adelantado`;
    if (concentracion()) return;
    avisar(`${foto ? `<img src="${escH(foto)}" alt="" referrerpolicy="no-referrer">` : `<span class="av">${escH(nom.charAt(0).toUpperCase())}</span>`}<span>⚠️ ${quien} en el ranking. Ahora vas <b>${yo}.º</b> — ¡a estudiar!</span>`, "amigos");
  }, () => {});
});

// ---------- modo concentración y avisos del chat ----------
export const concentracion = () => { try { return localStorage.getItem("concentracion") === "1"; } catch (e) { return false; } };
export function ponerConcentracion(v) { try { localStorage.setItem("concentracion", v ? "1" : "0"); } catch (e) {} document.documentElement.classList.toggle("concentracion-1b", !!v); document.dispatchEvent(new CustomEvent("concentracion1b", { detail: !!v })); }
document.documentElement.classList.toggle("concentracion-1b", concentracion());
const enPortal1b = location.pathname === RAIZ.pathname || location.pathname === RAIZ.pathname + "index.html";
async function quienEs(id) { try { const s = await fs.getDoc(fs.doc(db, "usuarios", id)); return s.exists() ? s.data() : {}; } catch (e) { return {}; } }
async function avisoMensaje(uid, texto, ir, priv) {
  if (concentracion()) return;
  const h = location.hash.slice(1);
  if (enPortal1b && (h === ir || (ir === "chat" && h === "chat"))) return;
  const u = await quienEs(uid), nom = u.nombre || u.nombreGoogle || "Alguien", foto = u.fotoPropia || u.fotoGoogle || "";
  avisar(`${foto ? `<img src="${escH(foto)}" alt="" referrerpolicy="no-referrer">` : `<span class="av">${escH(nom.charAt(0).toUpperCase())}</span>`}<span>${priv ? "🔒" : "💬"} <b>${escH(nom)}</b>${priv ? " te ha escrito" : " en el chat"}: ${escH(String(texto || "📷 Foto").slice(0, 90))}</span>`, ir);
}
let quitarAvisos = [];
onAuthStateChanged(auth, (u) => {
  quitarAvisos.forEach(f => f()); quitarAvisos = [];
  if (!u) return;
  const inicio = Date.now(); let ultChat = inicio; const ultPriv = {};
  quitarAvisos.push(fs.onSnapshot(fs.query(fs.collection(db, "chat"), fs.orderBy("t"), fs.limitToLast(1)), snap => {
    snap.docs.forEach(d => { const m = d.data(); if ((m.t || 0) > ultChat && m.uid !== u.uid) { ultChat = m.t; avisoMensaje(m.uid, m.texto, "chat", false); } });
  }, () => {}));
  quitarAvisos.push(fs.onSnapshot(fs.query(fs.collection(db, "privados"), fs.where("miembros", "array-contains", u.uid)), snap => {
    snap.docs.forEach(d => { const c = d.data(), m = c.ultimo || {}; if (!m.t || m.uid === u.uid || m.t <= inicio || m.t <= (ultPriv[d.id] || 0)) return;
      ultPriv[d.id] = m.t; avisoMensaje(m.uid, m.texto, "privado-" + m.uid, true); });
  }, () => {}));
});
// ---------- modo administrador (solo la cuenta de Guillermo) ----------
const ADMIN_H = "567368fac0b19f0df9590340c50247491ee14e5df1325c518877acbdeabcb98a";
let soyAdmin = false;
export const esAdmin = () => soyAdmin;
export const modoAdmin = () => { try { return soyAdmin && localStorage.getItem("modoAdmin") === "1"; } catch (e) { return false; } };
function aplicarAdmin() {
  const on = modoAdmin(); document.documentElement.classList.toggle("admin-1b", on);
  const b = document.querySelector(".adm-1b"); if (b) b.setAttribute("aria-pressed", String(on));
  document.dispatchEvent(new CustomEvent("admin1b", { detail: on }));
}
onAuthStateChanged(auth, async (u) => {
  let h = ""; try { const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String((u && u.email) || "").toLowerCase())); h = [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, "0")).join(""); } catch (e) {}
  soyAdmin = !!u && h === ADMIN_H;
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
