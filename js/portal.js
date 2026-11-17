// 1 BACH · Conexión con Firebase (módulo; antes dentro de index.html)
// Conexión del panel con Firebase: datos de la clase (data/clase.json) para cualquiera con el enlace;
// con cuenta de Google, además: progreso propio, amigos, ranking, perfil y chat.
import { db as fdb, fs, entrar as gEntrar, salir as gSalir, alCambiarSesion, alCambiarClase, conectado, modoAdmin, enviarPush, pedirPush, quitarPush, pushEstado } from "../shared/fb.js?v=1794924278";
let datos = null, prog = {}, quitar = [];
try { datos = await (await fetch("data/clase.json", { cache: "no-store" })).json(); }
catch (e) { S.error = "No se pudieron leer los datos del curso."; render(); }
// Los exámenes son por la mañana: a las 14:00 del día del examen pasa a "hecho".
const caducado = e => { const d = parseF(e.fecha); if (!d) return false; d.setHours(14, 0, 0, 0); return Date.now() >= d.getTime(); };
let firmaCad = "";
// cambios hechos por el administrador desde la web (clase/cambios), encima de data/clase.json
let cambios = {};
function mezclar(base, cb) {
  const out = [], borr = [], vistos = new Set();
  for (const x of base) { vistos.add(x.id); const c = cb[x.id]; const y = c ? { ...x, ...c } : { ...x }; (y.borrado ? borr : out).push(y); }
  for (const id in cb) if (!vistos.has(id) && cb[id] && cb[id].nuevo) { const y = { id, temas: [], ...cb[id] }; (y.borrado ? borr : out).push(y); }
  return [out, borr];
}
fs.onSnapshot(fs.doc(fdb, "clase", "cambios"), snap => { cambios = (snap.exists() && snap.data()) || {}; aplicar(); }, () => {});
window.guardarBloqueo = (uid, d) => Object.keys(d).length ? fs.setDoc(fs.doc(fdb, "bloqueos", uid), { ...d, t: Date.now() }) : fs.deleteDoc(fs.doc(fdb, "bloqueos", uid));
// puente para el código clásico (perfil y barra del administrador)
window.push1b = { pedir: pedirPush, quitar: quitarPush, estado: pushEstado, enviar: enviarPush,
  guardarVapid: (k) => fs.setDoc(fs.doc(fdb, "clase", "config"), { vapid: String(k || "").trim() }, { merge: true }) };
document.addEventListener("push1b", () => { if (route() === "perfil") render(); });
window.reportar = (a, motivo, msg) => fs.addDoc(fs.collection(fdb, "reportes"), { de: S.uid, a, motivo, msg, t: Date.now() });
window.descartarReporte = (id) => fs.deleteDoc(fs.doc(fdb, "reportes", id));
window.expulsar = async (uid, motivo) => { await fs.setDoc(fs.doc(fdb, "baneos", uid), { motivo, t: Date.now() }); await fs.setDoc(fs.doc(fdb, "usuarios", uid), { baneado: true }, { merge: true }); };
window.readmitir = async (uid) => { await fs.deleteDoc(fs.doc(fdb, "baneos", uid)); await fs.setDoc(fs.doc(fdb, "usuarios", uid), { baneado: false }, { merge: true }); };
let quitarRep = null, quitarBloq = null;
function verReportes() { if (quitarRep) { quitarRep(); quitarRep = null; } if (quitarBloq) { quitarBloq(); quitarBloq = null; } if (!S.esAdmin) { S.reportes = []; S.bloqueos = {}; return; }
  quitarBloq = fs.onSnapshot(fs.collection(fdb, "bloqueos"), snap => { const b = {}; snap.docs.forEach(d => b[d.id] = d.data()); S.bloqueos = b; }, () => { S.bloqueos = {}; });
  quitarRep = fs.onSnapshot(fs.collection(fdb, "reportes"), snap => { S.reportes = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.t || 0) - (a.t || 0)); if (S.admin) { document.querySelector(".adm-bar")?.remove(); admDecorar(); } }, () => { S.reportes = []; }); }
window.guardarCambios = (tipo, mapa) => fs.setDoc(fs.doc(fdb, "clase", "cambios"), { [tipo]: mapa }, { merge: true });
window.guardarCambio = (tipo, id, campos) => fs.setDoc(fs.doc(fdb, "clase", "cambios"), { [tipo]: { [id]: campos } }, { merge: true });
S.admin = modoAdmin();
document.addEventListener("admin1b", e => { S.admin = !!e.detail; const era = S.esAdmin; S.esAdmin = !!window.__esAdmin1b; if (S.esAdmin && route().startsWith("mipanel")) cargarMiPanel(); if (era !== S.esAdmin || (S.esAdmin && !quitarRep)) verReportes(); render(); if (!$("#ficha").hidden) admDecorar(); });
function aplicar() {
  if (!datos) return;
  const pt = prog.temas || {}, pp = prog.practica || {}, oc = prog.ocultos || {};
  const [exs, exB] = mezclar(datos.examenes, cambios.examenes || {}), [recs, recB] = mezclar(datos.recursos, cambios.recursos || {});
  S.borradosEx = exB; S.borradosRec = recB;
  const [tms, tmB] = mezclar(datos.temas, cambios.temas || {}); S.borradosTem = tmB;
  S.temas = tms.map(t => ({ ...t, ...(pt[t.id] || {}) }));
  S.examenes = exs.map(e => { const x = pp[e.id] ? { ...e, practica: pp[e.id] } : { ...e }; if (caducado(x)) x.hecho = true; return x; });
  firmaCad = S.examenes.filter(e => e.hecho).map(e => e.id).join();
  S.recursos = recs.filter(r => !oc[r.id]);
  S.ocultos = recs.filter(r => oc[r.id]);
  S.vocab = datos.vocab || []; S.practica = datos.practica || []; S.fallos = [];
  S.loaded = true; S.error = null; render();
}
setInterval(() => { if (!datos) return; const f = (S.examenes || []).filter(e => e.hecho || caducado(e)).map(e => e.id).join(); if (f !== firmaCad) aplicar(); }, 60000);
// Mismo "db" que usaba el panel, pero cada uno guarda SU progreso en progreso/{uid}
function adaptador(uid) {
  const ref = () => fs.doc(fdb, "progreso", uid);
  return { collection: (c) => ({ doc: (id) => ({ update: async (campos) => {
    if (c === "temas") return fs.setDoc(ref(), { temas: { [id]: campos } }, { merge: true });
    if (c === "examenes") return fs.setDoc(ref(), { practica: { [id]: campos.practica || {} } }, { merge: true });
    if (c === "recursos") return fs.setDoc(ref(), { ocultos: { [id]: !!campos.oculto } }, { merge: true });
  } }) }) };
}
function listo() {
  S.listo = true;
  document.getElementById("entrar").hidden = false;
  document.getElementById("gbtn").hidden = true;
  const m = document.getElementById("splmsg"); if (m) m.textContent = "";
  actualizarSplash();
  const volver = new URLSearchParams(location.search).get("volver");
  const valido = volver && /^\/[\w\-./%#?=&]*$/.test(volver) && !volver.startsWith("//");
  if (S.uid && valido) { location.replace(volver); return; }
  let ya = false; try { ya = sessionStorage.getItem("dentro") === "1"; } catch (e) {}
  if (ya || (!S.uid && valido)) entrar(); else setTimeout(() => document.getElementById("entrar")?.focus(), 50);
  if (!S.uid && valido) setTimeout(() => window.pideCuenta && window.pideCuenta(), 500);
}
document.getElementById("gbtn").onclick = () => gEntrar().catch(e => { const m = document.getElementById("splmsg"); if (m) m.textContent = "No se pudo entrar (" + (e.code || "error") + "). Inténtalo otra vez."; });
function primerNombre() { const u = (S.amigos || {})[S.uid] || {}; return String(u.nombre || S.nombreCompleto || "").trim().split(/\s+/)[0] || ""; }
window.entrarGoogle = () => gEntrar().catch(e => toast("No se pudo entrar (" + (e.code || "error") + ")."));
window.salirPortal = async () => { try { sessionStorage.removeItem("dentro"); } catch (e) {} await gSalir(); location.hash = ""; location.reload(); };
const ADMIN = "567368fac0b19f0df9590340c50247491ee14e5df1325c518877acbdeabcb98a";
async function sha(t) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }
const RUTAS_VIVAS = ["amigos", "resumen", "perfil", "companeros", "apuntes"];
alCambiarSesion(async user => {
  quitar.forEach(f => f()); quitar = [];
  if (!user) {
    S.uid = null; S.canWrite = false; S.nombre = ""; S.amigos = {}; S.rank = {}; S.chat = []; S.conectados = 0; S.sinLeer = 0; db = null;
    try { sessionStorage.removeItem("dentro"); } catch (e) {}
    prog = {}; aplicar(); listo(); return;
  }
  S.uid = user.uid; S.canWrite = true;
  S.nombreCompleto = user.displayName || ""; S.email = user.email || ""; S.nombre = primerNombre(); S.foto = user.photoURL || "";
  S.esAdmin = !!window.__esAdmin1b;
  db = adaptador(user.uid);
  listo();
  quitar.push(fs.onSnapshot(fs.doc(fdb, "progreso", user.uid), snap => { prog = snap.data() || {}; aplicar(); }, () => aplicar()));
  quitar.push(alCambiarClase(us => {
    S.amigos = us; S.conectados = Object.values(us).filter(conectado).length;
    S.nombre = primerNombre(); actualizarSplash();
    if (RUTAS_VIVAS.includes(route())) render(); else if (route() === "chat") pintarChat();
  }));
  quitar.push(fs.onSnapshot(fs.collection(fdb, "progreso"), snap => {
    const r = {}; snap.docs.forEach(d => r[d.id] = d.data()); S.rank = r; if (RUTAS_VIVAS.includes(route())) render();
  }, () => {}));
  quitar.push(suscribirPrivados(user.uid));
  cargarApuntes();
  S.bloq = {};
  quitar.push(fs.onSnapshot(fs.doc(fdb, "bloqueos", user.uid), snap => { const antes = JSON.stringify(S.bloq || {}); S.bloq = snap.exists() ? snap.data() : {};
    if (antes !== JSON.stringify(S.bloq)) { const r = route(); if (r === "chat" || r === "privados" || r.startsWith("privado-")) render(); } }, () => { S.bloq = {}; }));
  quitar.push(() => { if (quitarConv) { quitarConv(); quitarConv = null; } convAbierta = null; });
  setTimeout(abrirConv, 0);
  quitar.push(fs.onSnapshot(fs.query(fs.collection(fdb, "chat"), fs.orderBy("t"), fs.limitToLast(80)), snap => {
    S.chatError = null; S.chat = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    let visto = 0; try { visto = +localStorage.getItem("chatVisto") || 0; } catch (e) {}
    if (route() === "chat") pintarChat();
    else { S.sinLeer = S.chat.filter(m => (m.t || 0) > visto && m.uid !== S.uid).length; S.mencNuevas = S.chat.filter(m => (m.t || 0) > visto && m.uid !== S.uid && (m.menc || []).includes(S.uid)).length; if (route() === "resumen") render(); else if (route().startsWith("privado")) pintarTabsChat(); }
  }, (err) => { S.chatError0 = 1; S.chatError = err && err.code === "permission-denied" ? "El chat todavía no tiene permiso en Firebase: hay que pegar las reglas nuevas (Firestore → Reglas)." : "No se puede cargar el chat ahora mismo."; if (route() === "chat") pintarChat(); }));
});
// ---------- chats privados: privados/{uidA_uidB} con mensajes dentro ----------
let quitarConv = null, convAbierta = null;
function suscribirPrivados(uid) {
  return fs.onSnapshot(fs.query(fs.collection(fdb, "privados"), fs.where("miembros", "array-contains", uid)), snap => {
    S.privs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    S.sinLeerPriv = S.privs.filter(noLeido).length;
    const r = route();
    if (r === "privados" || r === "resumen") render(); else if (r === "chat" || r.startsWith("privado-")) pintarTabsChat();
  }, () => { S.privs = []; S.sinLeerPriv = 0; });
}
function abrirConv() {
  const r = route(), o = r.startsWith("privado-") ? r.slice(8) : null;
  const c = o && S.uid ? convId(S.uid, o) : null;
  if (c === convAbierta) return;
  if (quitarConv) { quitarConv(); quitarConv = null; }
  convAbierta = c; S.privMsgs = []; S.privError = null;
  if (!c) return;
  quitarConv = fs.onSnapshot(fs.query(fs.collection(fdb, "privados", c, "mensajes"), fs.orderBy("t"), fs.limitToLast(80)), snap => {
    S.privError = null; S.privMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() })); if (route() === "privado-" + o) pintarChat();
  }, err => { S.privError = err && err.code === "permission-denied" ? "Los chats privados todavía no tienen permiso en Firebase: hay que añadir la regla nueva de «privados»." : "No se puede cargar este chat ahora mismo."; pintarChat(); });
}
addEventListener("hashchange", abrirConv);
let tLeido = null;
window.marcarLeido = () => { if (!convAbierta || !S.uid) return; const c = (S.privs || []).find(x => x.id === convAbierta); if (c && !noLeido(c)) return;
  clearTimeout(tLeido); tLeido = setTimeout(() => fs.setDoc(fs.doc(fdb, "privados", convAbierta), { miembros: convAbierta.split("_"), leido: { [S.uid]: Date.now() } }, { merge: true }).catch(() => {}), 400); };
setInterval(() => { if (route() === "amigos") render(); }, 60000);
// ---------- chat ----------
window.enviarMsg = async (tag, texto, form) => {
  texto = String(texto || "").trim().slice(0, 800); const fotos = window.ADJ.slice(0, MAXF);
  if (bloqueado(route().startsWith("privado-") ? "privados" : "chat")) { toast("El administrador te ha bloqueado esto."); return; }
  if ((!texto && !fotos.length) || !S.uid) return;
  const b = form.querySelector("button[type=submit]"); b.disabled = true;
  const r = route();
  try {
    if (r.startsWith("privado-")) {
      const o = r.slice(8), c = convId(S.uid, o), t = Date.now();
      await fs.addDoc(fs.collection(fdb, "privados", c, "mensajes"), { uid: S.uid, texto, fotos, t });
      await fs.setDoc(fs.doc(fdb, "privados", c), { miembros: c.split("_"), ultimo: { texto: texto ? texto.slice(0, 120) : "📷 Foto", t, uid: S.uid }, leido: { [S.uid]: t } }, { merge: true });
      enviarPush({ tipo: "privado", a: [o], url: "#privado-" + S.uid });
    } else {
      const menc = sacarMenciones(texto);
      await fs.addDoc(fs.collection(fdb, "chat"), { uid: S.uid, nombre: (((S.amigos || {})[S.uid] || {}).nombre) || S.nombreCompleto || "", texto, fotos, menc, tag: ETQ[tag] ? tag : "general", t: Date.now() });
      if (menc.length) enviarPush({ tipo: "mencion", a: menc, url: "#chat" });
    } form.querySelector("textarea").value = ""; window.ADJ = []; pintarAdj(); }
  catch (e) { toast(e && e.code === "permission-denied" ? "Firebase no deja escribir: faltan las reglas nuevas del chat." : e && /size|exceeds|too large/i.test(e.message || "") ? "El mensaje pesa demasiado: quita alguna foto." : "No se ha podido enviar (" + (e.code || "error") + ")."); }
  b.disabled = false; form.querySelector("textarea").focus();
};
window.borrarMsg = async (id, btn) => {
  if (!btn.dataset.c) { btn.dataset.c = 1; btn.textContent = "¿Seguro? Pulsa otra vez"; return; }
  const r = route();
  try { await fs.deleteDoc(r.startsWith("privado-") ? fs.doc(fdb, "privados", convId(S.uid, r.slice(8)), "mensajes", id) : fs.doc(fdb, "chat", id)); } catch (e) { toast("No se ha podido borrar."); }
};
document.addEventListener("submit", ev => { if (ev.target.id !== "chatform") return; ev.preventDefault();
  window.enviarMsg(document.getElementById("chatTag")?.value || "general", document.getElementById("chatTxt").value, ev.target); });
document.addEventListener("keydown", ev => { if (ev.target.id === "chatTxt" && ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); ev.target.form.requestSubmit(); } });
// ---------- fotos: se reducen en el navegador y se guardan como texto (Firebase gratis, sin Storage) ----------
async function cargarImg(file) {
  try { if (window.createImageBitmap) return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch (e) {}
  return await new Promise((ok, ko) => { const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { ok(img); setTimeout(() => URL.revokeObjectURL(url), 1000); }; img.onerror = () => { URL.revokeObjectURL(url); ko(new Error("formato")); }; img.src = url; });
}
// cuadrado = recorte centrado (perfil); si no, se mantiene la proporción. maxB = tamaño máximo aproximado en bytes.
async function reducir(file, lado, cuadrado, maxB) {
  const img = await cargarImg(file), W = img.width, H = img.height;
  let L = lado;
  for (let intento = 0; intento < 6; intento++) {
    const c = document.createElement("canvas"), x = c.getContext("2d");
    if (cuadrado) { const m = Math.min(W, H); c.width = c.height = Math.min(L, m); x.drawImage(img, (W - m) / 2, (H - m) / 2, m, m, 0, 0, c.width, c.height); }
    else { const k = Math.min(1, L / Math.max(W, H)); c.width = Math.round(W * k); c.height = Math.round(H * k); x.drawImage(img, 0, 0, c.width, c.height); }
    for (const q of [0.82, 0.7, 0.58]) { const d = c.toDataURL("image/jpeg", q); if (d.length * 0.75 <= maxB) return d; }
    L = Math.round(L * 0.75);
  }
  throw new Error("grande");
}
window.subirFoto = async (file) => {
  if (!S.uid) { toast("Entra con Google para cambiar la foto."); return; }
  if (file.type && !/^image\//.test(file.type)) { toast("Eso no es una imagen."); return; }
  toast("Subiendo foto…");
  let d;
  try { d = await reducir(file, 320, true, 120000); }
  catch (e) { toast("No se puede leer esa imagen. Prueba con otra (JPG o PNG)."); return; }
  try { await fs.setDoc(fs.doc(fdb, "usuarios", S.uid), { fotoPropia: d }, { merge: true }); toast("¡Foto cambiada!"); }
  catch (e) { toast("Firebase no deja guardarla (" + (e.code || "error") + "). Revisa las reglas."); }
};
window.adjuntarFotos = async (files) => {
  for (const f of files) {
    if (window.ADJ.length >= MAXF) { toast(`Máximo ${MAXF} fotos por mensaje.`); break; }
    if (f.type && !/^image\//.test(f.type)) { toast("Solo se pueden adjuntar fotos."); continue; }
    try { window.ADJ.push(await reducir(f, 1280, false, 230000)); pintarAdj(); }
    catch (e) { toast("No se puede leer una de las fotos."); }
  }
};
window.quitarFoto = async () => {
  try { await fs.updateDoc(fs.doc(fdb, "usuarios", S.uid), { fotoPropia: fs.deleteField() }); toast("Vuelves a tener la foto de Google."); }
  catch (e) { toast("No se ha podido cambiar."); }
};
window.guardarNombre = async (n) => {
  n = String(n || "").trim().slice(0, 30); if (!n) { toast("Escribe un nombre."); return; }
  try { await fs.setDoc(fs.doc(fdb, "usuarios", S.uid), { nombre: n }, { merge: true }); toast("Nombre guardado."); }
  catch (e) { toast("No se ha podido guardar."); }
};
