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
