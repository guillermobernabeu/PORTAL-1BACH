// 📚 Apuntes: red social de apuntes de la clase.
// Cualquiera sube fotos de sus apuntes, la IA (Gemini, a través del Worker de Cloudflare) los pasa a limpio,
// el administrador los aprueba y todos pueden darles 👍 y proponer mejoras. Puntos y niveles por colaborar.
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { db, fs, auth } from "./fb.js?v=1794517945";

const CONVERSOR = "https://apuntes-1bach.maison-ichie.workers.dev";
const MAX_FOTOS = 10;
const PTS = { apunte: 50, util: 5, mejora: 20, topeDia: 3 };
const NIVELES = [[0, "🌱", "Novato"], [100, "📗", "Colaborador"], [300, "🎓", "Experto"], [700, "🏆", "Leyenda"]];
const H = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const AP = window.AP = { lista: [], mios: [], pend: [], uid: null, borrador: null };
const rerender = () => { const r = route(); if (r === "apuntes" || r.startsWith("apunte-") || r === "resumen") render(); };

// ---------- librerías para mostrar Markdown y fórmulas (se cargan solo cuando hacen falta) ----------
let libs = null;
function cargarLibs() {
  if (libs) return libs;
  const js = (u) => new Promise((ok, ko) => { const s = document.createElement("script"); s.src = u; s.onload = ok; s.onerror = ko; document.head.append(s); });
  const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"; document.head.append(l);
  return libs = Promise.all([js("https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js"), js("https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js"), js("https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js")])
    .then(() => js("https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"));
}
async function pintarMd(el, md) {
  if (!el) return;
  try { await cargarLibs();
    // las fórmulas se protegen para que marked no las rompa
    const f = []; const prot = String(md || "").replace(/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g, m => { f.push(m); return `@@F${f.length - 1}@@`; });
    let html = DOMPurify.sanitize(marked.parse(prot)); html = html.replace(/@@F(\d+)@@/g, (_, i) => H(f[+i]));
    el.innerHTML = html; renderMathInElement(el, { delimiters: [{ left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }], throwOnError: false });
  } catch (e) { el.textContent = md; }
}

// ---------- datos ----------
let quitar = [];
function suscribir(u) {
  quitar.forEach(f => f()); quitar = []; AP.lista = []; AP.mios = []; AP.pend = []; AP.uid = u ? u.uid : null;
  if (!u) return;
  const mapa = s => s.docs.map(d => ({ id: d.id, ...d.data() }));
  quitar.push(fs.onSnapshot(fs.query(fs.collection(db, "apuntes"), fs.where("estado", "==", "aprobado")), s => { AP.lista = mapa(s); rerender(); }, () => {}));
  quitar.push(fs.onSnapshot(fs.query(fs.collection(db, "apuntes"), fs.where("autor", "==", u.uid)), s => { AP.mios = mapa(s); rerender(); }, () => {}));
  verPendientes();
}
function verPendientes() {
  if (AP.qp) { AP.qp(); AP.qp = null; } if (!S.esAdmin || !AP.uid) { AP.pend = []; return; }
  AP.qp = fs.onSnapshot(fs.query(fs.collection(db, "apuntes"), fs.where("estado", "==", "pendiente")), s => { AP.pend = s.docs.map(d => ({ id: d.id, ...d.data() })); rerender(); }, () => {});
}
onAuthStateChanged(auth, suscribir);
document.addEventListener("admin1b", verPendientes);
const todos = () => { const m = new Map(); [...AP.lista, ...AP.mios, ...AP.pend].forEach(a => m.set(a.id, a)); return [...m.values()]; };

// ---------- puntos y niveles (se calculan de los apuntes aprobados: nadie puede inventárselos) ----------
const dia = t => new Date(t || 0).toDateString();
AP.puntos = (uid) => {
  let p = 0; const porDia = {};
  AP.lista.slice().sort((a, b) => (a.aprobadoT || 0) - (b.aprobadoT || 0)).forEach(a => {
    if (a.autor === uid) { const d = dia(a.aprobadoT); porDia[d] = (porDia[d] || 0) + 1; if (porDia[d] <= PTS.topeDia) p += PTS.apunte;
      p += (a.utiles || []).filter(x => x !== uid).length * PTS.util; }
    p += (a.colaboradores || []).filter(x => x === uid).length * PTS.mejora;
  });
  return p;
};
AP.nivel = (uid) => { const p = AP.puntos(uid); let n = NIVELES[0]; NIVELES.forEach(x => { if (p >= x[0]) n = x; }); const sig = NIVELES.find(x => x[0] > p); return { p, ico: n[1], nom: n[2], sig }; };
AP.nivelHTML = (uid) => { const n = AP.nivel(uid); return `<span class="ap-nivel" title="${n.p} puntos de apuntes">${n.ico} ${H(n.nom)} · ${n.p} pts de apuntes</span>`; };

// ---------- vistas ----------
const nomA = a => (typeof NOM !== "undefined" && NOM[a]) || a;
const fecha = t => new Date(t || 0).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
function tarjeta(a) {
  const u = (a.utiles || []).length;
  return `<a class="ap-c" href="#apunte-${H(a.id)}"><span class="ap-k" data-a="${H(a.asig)}">${H(nomA(a.asig))}${a.tema ? " · " + H(a.tema) : ""}</span><b>${H(a.titulo)}</b>
    <span class="ap-m">${avatar(a.autor, 20)} ${H(nombreDe(a.autor) || "Alguien")} · ${fecha(a.aprobadoT || a.t)}${u ? ` · 👍 ${u}` : ""}${(a.colaboradores || []).length ? ` · ✏️ ${(a.colaboradores || []).length}` : ""}${a.estado === "pendiente" ? ' · <i class="ap-p">⏳ Pendiente de aprobar</i>' : a.estado === "rechazado" ? ' · <i class="ap-r">No aprobado</i>' : ""}</span></a>`;
}
function vistaLista() {
  const f = AP.filtro || "", L = AP.lista.filter(a => !f || a.asig === f).sort((a, b) => (b.aprobadoT || 0) - (a.aprobadoT || 0));
  const yo = AP.nivel(AP.uid), top = Object.keys(S.amigos || {}).map(id => ({ id, p: AP.puntos(id) })).filter(x => x.p > 0).sort((a, b) => b.p - a.p).slice(0, 5);
  const mios = AP.mios.filter(a => a.estado !== "aprobado");
  return `<div class="vista"><button class="back" data-go="resumen">← Inicio</button>
   <section class="sheet ap-hero"><header><h2>📚 Apuntes de la clase</h2><span class="note">Entre todos, los apuntes definitivos de cada tema</span></header>
    <div class="ap-yo"><div><span class="ap-ico">${yo.ico}</span><b>${H(yo.nom)}</b><span>${yo.p} puntos de apuntes${yo.sig ? ` · te faltan ${yo.sig[0] - yo.p} para ${yo.sig[1]} ${yo.sig[2]}` : ""}</span></div>
     <a class="btn-p" style="--cf:var(--accent)" href="#subir-apunte">📷 Subir apuntes</a></div>
    <p class="note" style="margin:0">Apunte aprobado +${PTS.apunte} · cada 👍 que recibes +${PTS.util} · mejora aceptada +${PTS.mejora}. Los puntos cuentan cuando el administrador aprueba el apunte.</p></section>
   ${S.esAdmin && AP.pend.length ? `<section class="sheet ap-pend"><header><h2>⏳ Pendientes de aprobar (${AP.pend.length})</h2></header><div class="ap-g">${AP.pend.map(tarjeta).join("")}</div></section>` : ""}
   ${mios.length ? `<section class="sheet"><header><h2>Tus envíos</h2></header><div class="ap-g">${mios.map(tarjeta).join("")}</div></section>` : ""}
   <section class="sheet"><header><h2>Todos los apuntes</h2><select id="apFiltro" aria-label="Asignatura"><option value="">Todas las asignaturas</option>${ASIG.map(s => `<option value="${s.id}" ${f === s.id ? "selected" : ""}>${H(s.n)}</option>`).join("")}</select></header>
    <div class="ap-g">${L.map(tarjeta).join("") || '<div class="empty">Todavía no hay apuntes aquí. ¡Sube los primeros y gana puntos!</div>'}</div></section>
   ${top.length ? `<section class="sheet"><header><h2>🏆 Mejores colaboradores</h2></header><ol class="ap-top">${top.map(x => { const n = AP.nivel(x.id); return `<li data-perfil="${H(x.id)}">${avatar(x.id, 32)}<b>${H(nombreDe(x.id) || "Alguien")}</b><span>${n.ico} ${H(n.nom)}</span><em>${x.p} pts</em></li>`; }).join("")}</ol></section>` : ""}
  </div>`;
}
function vistaSubir() {
  const b = AP.borrador || (AP.borrador = { fotos: [], md: "", asig: "", titulo: "", tema: "", fase: "fotos" });
  return `<div class="vista"><button class="back" data-go="apuntes">← Apuntes</button>
   <section class="sheet"><header><h2>📷 Subir apuntes</h2><span class="note">Paso ${b.fase === "fotos" ? "1 de 2: tus fotos" : "2 de 2: revisa el apunte"}</span></header>
   <form id="apForm" class="ap-form">
    <div class="ap-row"><label class="rep-l">Asignatura<select name="asig" required><option value="">Elige…</option>${ASIG.map(s => `<option value="${s.id}" ${b.asig === s.id ? "selected" : ""}>${H(s.n)}</option>`).join("")}</select></label>
     <label class="rep-l">Tema<input name="tema" value="${H(b.tema)}" maxlength="80" placeholder="p. ej. Tema 2 · Disoluciones"></label></div>
    <label class="rep-l">Título<input name="titulo" value="${H(b.titulo)}" maxlength="120" required placeholder="De qué van estos apuntes"></label>
    <div class="ap-fotos">${b.fotos.map((f, i) => `<figure><img src="${f}" alt="Foto ${i + 1}"><button type="button" data-apquitar="${i}" aria-label="Quitar foto ${i + 1}">×</button></figure>`).join("")}
     ${b.fotos.length < MAX_FOTOS ? `<label class="ap-add">＋<span>Añadir fotos</span><input type="file" accept="image/*" multiple id="apFotos" hidden></label>` : ""}</div>
    <p class="note" style="margin:0">Hasta ${MAX_FOTOS} páginas, en orden. Haz las fotos rectas y con buena luz.</p>
    ${b.fase === "fotos" ? `<button type="button" class="btn-p" style="--cf:var(--accent)" data-apconvertir ${b.fotos.length ? "" : "disabled"}>✨ Convertir a digital</button>`
      : `<div class="ap-ed"><label class="rep-l">Apunte (puedes corregir lo que haya leído mal)<textarea name="md" rows="16">${H(b.md)}</textarea></label><div class="ap-prev ap-md" id="apPrev"></div></div>
       <div class="adm-b"><button type="submit" class="btn-p" style="--cf:var(--accent)">📤 Enviar para aprobar</button><button type="button" class="btn-sec" data-apconvertir>Volver a convertir</button></div>`}
    <div id="apEstado" class="note" aria-live="polite"></div>
   </form></section></div>`;
}
function vistaApunte(id) {
  const a = todos().find(x => x.id === id);
  if (!a) return `<div class="vista"><button class="back" data-go="apuntes">← Apuntes</button><section class="sheet"><div class="empty">${AP.cargando ? "Cargando…" : "Este apunte no existe o ya no está."}</div></section></div>`;
  const yoUtil = (a.utiles || []).includes(AP.uid), mio = a.autor === AP.uid, col = [...new Set(a.colaboradores || [])];
  return `<div class="vista"><button class="back" data-go="apuntes">← Apuntes</button>
   ${a.estado === "pendiente" ? `<div class="ap-aviso">⏳ Pendiente de aprobar. ${S.esAdmin ? "Revísalo y apruébalo o recházalo abajo." : "Lo verá todo el mundo cuando el administrador lo apruebe."}</div>` : ""}
   ${a.estado === "rechazado" ? `<div class="ap-aviso ap-no">No se ha aprobado${a.motivo ? ": " + H(a.motivo) : ""}.</div>` : ""}
   <article class="sheet ap-doc"><header class="ap-dh"><span class="ap-k" data-a="${H(a.asig)}">${H(nomA(a.asig))}${a.tema ? " · " + H(a.tema) : ""}</span><h2>${H(a.titulo)}</h2>
     <span class="ap-m">${avatar(a.autor, 22)} <b data-perfil="${H(a.autor)}">${H(nombreDe(a.autor) || "Alguien")}</b>${col.length ? ` · mejorado por ${col.map(c => H((nombreDe(c) || "alguien").split(" ")[0])).join(", ")}` : ""} · ${fecha(a.aprobadoT || a.t)}</span></header>
    <div class="ap-md" id="apMd"></div>
    <div class="ap-acc">${a.estado === "aprobado" ? `<button type="button" class="ap-util${yoUtil ? " on" : ""}" data-aputil="${H(a.id)}" ${mio ? "disabled title=\"No puedes darte 👍 a ti mismo\"" : ""}>👍 Útil · ${(a.utiles || []).length}</button><button type="button" class="btn-sec" data-apmejorar="${H(a.id)}">✏️ Proponer mejora</button>` : ""}
     <button type="button" class="btn-sec" data-apfotos="${H(a.id)}">📷 Ver fotos originales</button>
     ${S.esAdmin && a.estado !== "aprobado" ? `<button type="button" class="btn-p" style="--cf:#167a3a" data-apaprobar="${H(a.id)}">✅ Aprobar</button>` : ""}
     ${S.esAdmin && a.estado === "pendiente" ? `<button type="button" class="btn-sec" data-aprechazar="${H(a.id)}">Rechazar</button>` : ""}
     ${S.esAdmin || (mio && a.estado !== "aprobado") ? `<button type="button" class="btn-sec" data-apborrar="${H(a.id)}">🗑 Borrar</button>` : ""}</div>
    <div id="apFotosV"></div></article>
   <section class="sheet" id="apMejoras"><header><h2>✏️ Mejoras propuestas</h2></header><div class="empty">Cargando…</div></section></div>`;
}
AP.html = (r) => r === "apuntes" ? vistaLista() : r === "subir-apunte" ? vistaSubir() : vistaApunte(r.slice(7));
AP.montar = (r) => {
  if (r === "subir-apunte" && AP.borrador && AP.borrador.fase === "md") pintarMd(document.getElementById("apPrev"), AP.borrador.md);
  if (r.startsWith("apunte-")) { const a = todos().find(x => x.id === r.slice(7)); if (a) { pintarMd(document.getElementById("apMd"), a.md); verMejoras(a); } }
};

// ---------- mejoras ----------
let quitarMej = null;
function verMejoras(a) {
  if (quitarMej) quitarMej();
  quitarMej = fs.onSnapshot(fs.collection(db, "apuntes", a.id, "mejoras"), s => {
    const el = document.getElementById("apMejoras"); if (!el) { quitarMej(); quitarMej = null; return; }
    const L = s.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => m.estado === "pendiente").sort((x, y) => x.t - y.t), puede = S.esAdmin || a.autor === AP.uid;
    el.innerHTML = `<header><h2>✏️ Mejoras propuestas</h2><span class="note">${puede ? "Acéptala si mejora el apunte: quien la propone gana +" + PTS.mejora : "Si ves algo mal o que falta, propón una mejora"}</span></header>` +
      (L.length ? L.map(m => `<div class="ap-mej"><div class="ap-m">${avatar(m.autor, 22)} <b>${H(nombreDe(m.autor) || "Alguien")}</b> · ${fecha(m.t)}</div>${m.nota ? `<p>${H(m.nota)}</p>` : ""}
        <details><summary>Ver la versión propuesta</summary><div class="ap-md" data-mejmd="${H(m.id)}"></div></details>
        ${puede ? `<div class="adm-b"><button type="button" class="btn-p" style="--cf:#167a3a" data-apaceptar="${H(a.id)}:${H(m.id)}">Aceptar</button><button type="button" class="btn-sec" data-apdescartar="${H(a.id)}:${H(m.id)}">Descartar</button></div>` : ""}</div>`).join("") : '<div class="empty">No hay mejoras pendientes.</div>');
    L.forEach(m => pintarMd(el.querySelector(`[data-mejmd="${m.id}"]`), m.md));
    AP.mejoras = L;
  }, () => {});
}

// ---------- fotos: se reducen en el navegador ----------
async function reducirFoto(file, lado = 1600, maxB = 330000) {
  const img = await new Promise((ok, ko) => { const i = new Image(), u = URL.createObjectURL(file); i.onload = () => ok(i); i.onerror = ko; i.src = u; });
  let L = lado;
  for (let n = 0; n < 6; n++) {
    const k = Math.min(1, L / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    for (const q of [0.8, 0.68, 0.56]) { const d = c.toDataURL("image/jpeg", q); if (d.length * 0.75 <= maxB) return d; }
    L = Math.round(L * 0.8);
  }
  throw new Error("grande");
}
function guardarCampos() { const f = document.getElementById("apForm"); if (!f || !AP.borrador) return; const b = AP.borrador;
  b.asig = f.elements.asig.value; b.titulo = f.elements.titulo.value; b.tema = f.elements.tema.value; if (f.elements.md) b.md = f.elements.md.value; }

async function convertir() {
  const b = AP.borrador; guardarCampos(); const est = document.getElementById("apEstado");
  if (!b.fotos.length) return;
  const btn = document.querySelector("[data-apconvertir]"); if (btn) btn.disabled = true;
  if (est) est.textContent = "✨ Convirtiendo " + b.fotos.length + (b.fotos.length === 1 ? " página" : " páginas") + "… (puede tardar un minuto)";
  try {
    const token = await auth.currentUser.getIdToken();
    const r = await fetch(CONVERSOR, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ imagenes: b.fotos.map(f => ({ mime: "image/jpeg", data: f.split(",")[1] })), contexto: [nomA(b.asig), b.tema, b.titulo].filter(Boolean).join(" · ") }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.texto) throw new Error(d.error || "El conversor no responde.");
    b.md = d.texto; b.fase = "md"; render();
  } catch (e) { if (est) est.textContent = "No se ha podido convertir: " + e.message; if (btn) btn.disabled = false; }
}
async function enviar() {
  guardarCampos(); const b = AP.borrador, est = document.getElementById("apEstado");
  if (!b.asig || !b.titulo.trim() || !b.md.trim()) { toast("Rellena asignatura, título y el apunte."); return; }
  if (est) est.textContent = "Enviando…";
  try {
    const ref = await fs.addDoc(fs.collection(db, "apuntes"), { autor: AP.uid, asig: b.asig, tema: b.tema.trim().slice(0, 80), titulo: b.titulo.trim().slice(0, 120), md: b.md.slice(0, 60000), estado: "pendiente", t: Date.now(), utiles: [], colaboradores: [], nfotos: b.fotos.length });
    for (let i = 0; i < b.fotos.length; i++) await fs.setDoc(fs.doc(db, "apuntes", ref.id, "fotos", String(i)), { d: b.fotos[i], i });
    AP.borrador = null; toast("¡Enviado! Cuando el administrador lo apruebe, ganarás tus puntos."); location.hash = "apunte-" + ref.id;
  } catch (e) { if (est) est.textContent = "No se ha podido enviar (" + (e.code || e.message) + ")."; }
}

// ---------- acciones ----------
document.addEventListener("change", async ev => {
  if (ev.target.id === "apFiltro") { AP.filtro = ev.target.value; render(); return; }
  if (ev.target.id !== "apFotos") return;
  guardarCampos(); const b = AP.borrador, fs0 = [...ev.target.files].slice(0, MAX_FOTOS - b.fotos.length);
  toast("Preparando " + fs0.length + (fs0.length === 1 ? " foto…" : " fotos…"));
  for (const f of fs0) { try { b.fotos.push(await reducirFoto(f)); } catch (e) { toast("Una foto no se ha podido leer."); } }
  if (b.fase === "md") b.fase = "fotos"; render();
});
document.addEventListener("click", async ev => {
  if (!ev.target.closest) return;
  const q = s => ev.target.closest(s);
  let el;
  if ((el = q("[data-apquitar]"))) { guardarCampos(); AP.borrador.fotos.splice(+el.dataset.apquitar, 1); if (!AP.borrador.fotos.length) AP.borrador.fase = "fotos"; render(); return; }
  if (q("[data-apconvertir]")) { ev.preventDefault(); convertir(); return; }
  if ((el = q("[data-aputil]"))) { const a = AP.lista.find(x => x.id === el.dataset.aputil); if (!a) return; const ya = (a.utiles || []).includes(AP.uid);
    fs.updateDoc(fs.doc(db, "apuntes", a.id), { utiles: ya ? fs.arrayRemove(AP.uid) : fs.arrayUnion(AP.uid) }).catch(e => toast("No se ha podido (" + (e.code || "error") + "). ")); return; }
  if ((el = q("[data-apfotos]"))) { const id = el.dataset.apfotos; try { const s = await fs.getDocs(fs.collection(db, "apuntes", id, "fotos")); const urls = s.docs.map(d => d.data()).sort((a, b) => a.i - b.i).map(x => x.d);
      if (!urls.length) { toast("Este apunte no tiene fotos."); return; } const a = todos().find(x => x.id === id) || {}; abrirVisor(`${nomA(a.asig)} · ${a.titulo || "Apunte"}`, "Fotos originales", urls); } catch (e) { toast("No se han podido cargar las fotos."); } return; }
  if ((el = q("[data-apaprobar]"))) { fs.updateDoc(fs.doc(db, "apuntes", el.dataset.apaprobar), { estado: "aprobado", aprobadoT: Date.now(), motivo: "" }).then(() => toast("Aprobado: ya lo ve toda la clase.")).catch(e => toast("No se ha podido (" + (e.code || "error") + ").")); return; }
  if ((el = q("[data-aprechazar]"))) { admModal(`<h2>Rechazar apunte</h2><form id="apRechF" data-id="${H(el.dataset.aprechazar)}" class="ap-form"><label class="rep-l">Motivo (lo verá el autor)<textarea name="m" rows="3" maxlength="300"></textarea></label><div class="adm-b"><button class="btn-p" style="--cf:#d4231c">Rechazar</button><button type="button" class="btn-sec" data-admcerrar>Cancelar</button></div></form>`); return; }
  if ((el = q("[data-apborrar]"))) { if (!el.dataset.c) { el.dataset.c = 1; el.textContent = "¿Seguro? Pulsa otra vez"; return; }
    fs.deleteDoc(fs.doc(db, "apuntes", el.dataset.apborrar)).then(() => { toast("Borrado."); location.hash = "apuntes"; }).catch(e => toast("No se ha podido (" + (e.code || "error") + ").")); return; }
  if ((el = q("[data-apmejorar]"))) { const a = todos().find(x => x.id === el.dataset.apmejorar); if (!a) return;
    admModal(`<h2>✏️ Proponer mejora</h2><p>Corrige o completa el apunte. Si el autor o el administrador la acepta, ganas +${PTS.mejora} puntos.</p><form id="apMejF" data-id="${H(a.id)}" class="ap-form"><label class="rep-l">Qué cambias (resumen corto)<input name="nota" maxlength="200" required placeholder="p. ej. Corrijo la fórmula del ejercicio 3"></label><label class="rep-l">Apunte completo con tu mejora<textarea name="md" rows="14">${H(a.md)}</textarea></label><div class="adm-b"><button class="btn-p" style="--cf:var(--accent)">Enviar mejora</button><button type="button" class="btn-sec" data-admcerrar>Cancelar</button></div></form>`); return; }
  if ((el = q("[data-apaceptar]"))) { const [aid, mid] = el.dataset.apaceptar.split(":"), m = (AP.mejoras || []).find(x => x.id === mid); if (!m) return;
    try { await fs.updateDoc(fs.doc(db, "apuntes", aid), { md: m.md, colaboradores: fs.arrayUnion(m.autor) }); await fs.updateDoc(fs.doc(db, "apuntes", aid, "mejoras", mid), { estado: "aceptada" }); toast("Mejora aceptada."); }
    catch (e) { toast("No se ha podido (" + (e.code || "error") + ")."); } return; }
  if ((el = q("[data-apdescartar]"))) { const [aid, mid] = el.dataset.apdescartar.split(":"); fs.updateDoc(fs.doc(db, "apuntes", aid, "mejoras", mid), { estado: "descartada" }).catch(() => toast("No se ha podido.")); return; }
});
document.addEventListener("submit", ev => {
  const f = ev.target;
  if (f.id === "apForm") { ev.preventDefault(); enviar(); return; }
  if (f.id === "apRechF") { ev.preventDefault(); fs.updateDoc(fs.doc(db, "apuntes", f.dataset.id), { estado: "rechazado", motivo: f.elements.m.value.trim() }).then(() => { admCerrar(); toast("Rechazado."); }).catch(e => toast("No se ha podido (" + (e.code || "error") + ").")); return; }
  if (f.id === "apMejF") { ev.preventDefault(); const md = f.elements.md.value, a = todos().find(x => x.id === f.dataset.id);
    if (a && md.trim() === String(a.md).trim()) { toast("No has cambiado nada."); return; }
    fs.addDoc(fs.collection(db, "apuntes", f.dataset.id, "mejoras"), { autor: AP.uid, nota: f.elements.nota.value.trim(), md: md.slice(0, 60000), estado: "pendiente", t: Date.now() })
      .then(() => { admCerrar(); toast("Mejora enviada. ¡Gracias!"); }).catch(e => toast("No se ha podido (" + (e.code || "error") + ")."));
  }
});
document.addEventListener("input", ev => {
  if (ev.target.name === "md" && ev.target.form && ev.target.form.id === "apForm") { AP.borrador.md = ev.target.value; clearTimeout(AP.tp); AP.tp = setTimeout(() => pintarMd(document.getElementById("apPrev"), AP.borrador.md), 400); }
});
