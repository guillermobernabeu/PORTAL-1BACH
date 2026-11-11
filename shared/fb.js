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
// Guarda el resumen de una app en progreso/{uid}.apps[app] = {ok, total}
export function guardarProgreso(app, ok, total) {
  const u = auth.currentUser; if (!u) return Promise.resolve();
  return fs.setDoc(fs.doc(db, "progreso", u.uid), { apps: { [app]: { ok, total, t: Date.now() } } }, { merge: true }).catch(() => {});
}
