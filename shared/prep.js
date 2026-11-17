// 🎯 Preparar un examen: pistas de la clase, mapa de lo que va a entrar (predicción que aprende sola)
// y exámenes de prueba hechos por la IA (Gemini, a través del Worker de Cloudflare) con corrección y puntos.
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { db, fs, auth, WORKER } from "./fb.js?v=1794922628";
import { predecir, aprender, acierto, FUENTES, NIVELES, parecido } from "./prediccion.js?v=1794922628";

const H = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const PR = window.PR = { pistas: [], modelo: null, historial: [], misEx: [], ex: null, resp: [], res: null, cargando: false, abierto: null };
const NIV = { seguro: "🟢 Seguro", probable: "🟡 Muy probable", posible: "⚪ Puede entrar" };
const MAXL = 5;  // exámenes de prueba al día (también lo limita el Worker)
const esRuta = (r) => r.startsWith("prep-");
const repintar = () => { if (esRuta(route())) render(); };

// ---------- datos ----------
let quitar = [], exActual = null;
function suscribir(id) {
  if (exActual === id) return; quitar.forEach(f => f()); quitar = []; exActual = id; PR.pistas = []; PR.ex = null; PR.res = null; PR.resp = [];
  const u = auth.currentUser; if (!u || !id) return;
  const e = (S.examenes || []).find(x => x.id === id);
  quitar.push(fs.onSnapshot(fs.query(fs.collection(db, "pistas"), fs.where("examen", "==", id)), s => { PR.pistas = s.docs.map(d => ({ id: d.id, ...d.data() })); repintar(); }, () => {}));
  quitar.push(fs.onSnapshot(fs.doc(db, "prediccion", "modelo"), s => { PR.modelo = s.exists() ? s.data() : null; repintar(); }, () => {}));
  if (e) quitar.push(fs.onSnapshot(fs.query(fs.collection(db, "prediccion"), fs.where("asig", "==", e.asig)), s => { PR.historial = s.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.items); repintar(); }, () => {}));
  quitar.push(fs.onSnapshot(fs.collection(db, "examenesIA", u.uid, "items"), s => { PR.misEx = s.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.examen === id).sort((a, b) => b.t - a.t); repintar(); }, () => { PR.misEx = []; }));
}
onAuthStateChanged(auth, () => { exActual = null; if (esRuta(route())) suscribir(route().slice(5)); });
const locales = () => { try { return JSON.parse(localStorage.getItem("exIA") || "[]"); } catch (e) { return []; } };
const guardarLocal = (L) => { try { localStorage.setItem("exIA", JSON.stringify(L.slice(0, 30))); } catch (e) {} };

function apuntesDe(e) { return ((window.AP && AP.lista) || []).filter(a => a.asig === e.asig); }
function mapaDe(e) {
  const admin = (uid) => uid === S.uid ? !!S.esAdmin : false;  // solo se sabe con seguridad quién es admin en su propio navegador
  const pistas = PR.pistas.map(p => ({ ...p, admin: !!p.admin || admin(p.de) }));
  return predecir({ examen: e, temas: temasDe(e), pistas, apuntes: apuntesDe(e), historial: PR.historial, modelo: PR.modelo });
}

// ---------- vista ----------
function vistaMapa(e, M) {
  const g = NIVELES.map(([, n, etiq]) => [n, etiq, M.filter(x => x.nivel === n)]);
  const ac = acierto(PR.historial);
  return `<section class="sheet"><header><h2>🗺️ Mapa del examen</h2><span class="note">${ac != null ? `Aciertos en exámenes anteriores: ${ac}%` : "Aprende de cada examen que marquéis"}</span></header>
    ${M.length ? g.filter(([, , L]) => L.length).map(([n, etiq, L]) => `<div class="pr-g pr-${n}"><h3>${NIV[n] || etiq} <small>(${L.length})</small></h3><ul>${L.map(x => `<li><div class="pr-b" style="--p:${Math.round(x.p * 100)}%"><span>${Math.min(99, Math.round(x.p * 100))}%</span></div><div><b>${H(x.texto)}</b><small>${H(x.razones.join(" · "))}</small></div></li>`).join("")}</ul></div>`).join("")
      : `<div class="empty">Todavía no hay datos. Añade lo que ha dicho el profe abajo.</div>`}
    <p class="note" style="margin:0">Se calcula con lo que dice el profe (pistas), el temario, los apuntes de la clase y lo que salió en exámenes anteriores. Después del examen, ${S.esAdmin ? "marca qué entró" : "el administrador marca qué entró"} y el mapa aprende para la próxima vez.</p></section>`;
}
function vistaPistas(e) {
  const L = PR.pistas.slice().sort((a, b) => (["seguro", "probable", "posible"].indexOf(a.nivel)) - (["seguro", "probable", "posible"].indexOf(b.nivel)) || a.t - b.t);
  return `<section class="sheet"><header><h2>💡 Lo que ha dicho el profe</h2><span class="note">Cada pista cuenta más si la confirma más gente</span></header>
    <ul class="pr-pistas">${L.map(p => { const yo = p.de === S.uid, voto = (p.votos || []).includes(S.uid), n = 1 + (p.votos || []).length;
      return `<li><span class="pr-n pr-${H(p.nivel)}">${NIV[p.nivel] || p.nivel}</span><div><b>${H(p.texto)}</b><small>${H(nombreDe(p.de) || "Alguien")}${p.admin ? " · administrador" : ""}${n > 1 ? ` · lo confirman ${n}` : ""}</small></div>
      ${yo || S.esAdmin ? `<button type="button" class="mp-b" data-prborrar="${H(p.id)}">Quitar</button>` : `<button type="button" class="mp-b${voto ? " mp-b1" : ""}" data-prvoto="${H(p.id)}">${voto ? "✓ Yo también" : "Yo también lo oí"}</button>`}</li>`; }).join("") || '<li class="empty">Nadie ha añadido pistas todavía.</li>'}</ul>
    <form id="prPistaF" class="pr-f"><input name="t" maxlength="200" required placeholder="p. ej. Entra el coste de oportunidad"><select name="n" aria-label="Nivel"><option value="seguro">Seguro</option><option value="probable" selected>Muy probable</option><option value="posible">Puede entrar</option></select><button class="btn-p" style="--cf:var(--accent)">Añadir pista</button></form></section>`;
}
function vistaMarcar(e, M) {
  if (!S.esAdmin) return "";
  const pasado = (dias(e.fecha) ?? 1) < 0 || e.hecho, ya = PR.historial.find(h => h.id === "h_" + e.id);
  if (!pasado && !ya) return "";
  return `<section class="sheet pr-marcar"><header><h2>✅ ¿Qué entró de verdad?</h2><span class="note">${ya ? `Marcado el ${new Date(ya.t).toLocaleDateString("es-ES")}: el mapa ya ha aprendido de este examen.` : "Solo tú: así el mapa aprende"}</span></header>
    ${ya ? `<ul class="pr-hist">${ya.items.map(it => `<li>${it.entro ? "✅" : "❌"} ${H(it.texto)} <small>${typeof it.p === "number" ? Math.round(it.p * 100) + "%" : "no estaba en el mapa"}</small></li>`).join("")}</ul>` :
    `<form id="prMarcarF" class="pr-f2">${M.map((x, i) => `<label class="bloq-op"><input type="checkbox" name="m${i}"> ${H(x.texto)} <small>(${Math.round(x.p * 100)}%)</small></label>`).join("")}
      <label class="rep-l">Otras cosas que entraron y no estaban (una por línea)<textarea name="otras" rows="3"></textarea></label><button class="btn-p" style="--cf:#167a3a">Guardar y que aprenda</button></form>`}</section>`;
}
function pregHTML(q, i, res, sol) {
  const r = PR.resp[i], c = res && res.resultados[i], s = sol && sol[i];
  const cab = `<div class="pq-h"><b>${i + 1}.</b><span>${H(q.tipo === "test" ? "Tipo test" : q.tipo === "vf" ? "Verdadero o falso" : q.tipo === "desarrollo" ? "Desarrollo" : q.tipo === "ejercicio" ? "Ejercicio" : "Respuesta corta")} · ${String(q.puntos).replace(".", ",")} pts</span>${c ? `<em class="${c.bien ? "ok" : "ko"}">${String(c.puntos).replace(".", ",")}</em>` : ""}</div><div class="pq-e ap-md" data-mdq="${i}"></div>`;
  let cuerpo;
  if (q.tipo === "test") cuerpo = `<div class="pq-o">${q.opciones.map((o, k) => `<label class="${res ? (s && k === s.correcta ? "ok" : Number(r) === k ? "ko" : "") : ""}"><input type="radio" name="q${i}" value="${k}" ${Number(r) === k && r !== "" && r != null ? "checked" : ""} ${res ? "disabled" : ""}> <span data-mdo="${i}-${k}">${H(o)}</span></label>`).join("")}</div>`;
  else if (q.tipo === "vf") cuerpo = `<div class="pq-o pq-vf">${[["true", "Verdadero"], ["false", "Falso"]].map(([v, t]) => `<label><input type="radio" name="q${i}" value="${v}" ${String(r) === v ? "checked" : ""} ${res ? "disabled" : ""}> ${t}</label>`).join("")}</div>`;
  else cuerpo = `<textarea name="q${i}" rows="${q.tipo === "corta" ? 3 : 6}" ${res ? "readonly" : ""} placeholder="Tu respuesta">${H(r || "")}</textarea>`;
  return `<div class="pq${c ? (c.bien ? " pq-ok" : " pq-ko") : ""}">${cab}${cuerpo}${c ? `<p class="pq-c">${H(c.comentario || "")}</p>${s && s.solucion && q.tipo !== "test" ? `<details><summary>Ver la respuesta modelo</summary><div class="ap-md" data-mds="${i}"></div></details>` : ""}` : ""}</div>`;
}
function vistaExamen(e, M) {
  if (PR.ex) {
    const ex = PR.ex.examen, res = PR.res, sol = res ? res.soluciones : null;
    return `<section class="sheet pr-ex" id="prEx"><header><h2>📝 ${H(ex.titulo)}</h2><span class="note">${ex.preguntas.length} preguntas · sobre 10${PR.ex.puntos ? " · da puntos para el ranking" : ""}</span></header>
      ${res ? `<div class="pr-nota ${res.nota >= 5 ? "ok" : "ko"}"><b>${String(res.nota).replace(".", ",")}</b><span>${res.nota >= 9 ? "¡Sobresaliente!" : res.nota >= 7 ? "¡Muy bien!" : res.nota >= 5 ? "Aprobado" : "A repasar"}${res.puntos ? ` · +${res.puntos} puntos` : ""}</span></div>
        ${res.resultados.some(x => x && !x.bien) ? `<div class="pr-rep"><b>Repasa:</b><ul>${res.resultados.map((x, i) => x && !x.bien ? `<li>${H(String(ex.preguntas[i].tema || ex.preguntas[i].enunciado.slice(0, 90)).replace(/[*_`$]/g, ""))}</li>` : "").join("")}</ul></div>` : ""}` : ""}
      <form id="prExF" class="pr-ex-f">${ex.preguntas.map((q, i) => pregHTML(q, i, res, sol)).join("")}
      <div class="adm-b">${res ? `<button type="button" class="btn-p" style="--cf:var(--accent)" data-prnuevo>Hacer otro</button><button type="button" class="btn-sec" data-prcerrarex>Cerrar</button>` : `<button type="submit" class="btn-p" style="--cf:#167a3a">✅ Entregar y corregir</button><button type="button" class="btn-sec" data-prcerrarex>Dejarlo</button>`}</div><div id="prEstado" class="note" aria-live="polite"></div></form></section>`;
  }
  const hechos = [...PR.misEx.filter(x => x.estado === "corregido"), ...locales().filter(x => x.examen === e.id && x.nota != null)].sort((a, b) => (b.t || 0) - (a.t || 0)).slice(0, 6);
  return `<section class="sheet"><header><h2>🎯 Examen de prueba con IA</h2><span class="note">Hasta ${MAXL} al día · los 3 primeros dan puntos (hasta 30)</span></header>
    <form id="prGenF" class="pr-gen"><label class="rep-l">¿Cómo lo quieres? (opcional)<textarea name="pide" rows="2" maxlength="600" placeholder="Vacío = como el examen real, centrado en lo más probable. Ej.: «solo el tema 2», «10 preguntas tipo test»"></textarea></label>
      <div class="pr-chips">${["Como el examen real", "10 preguntas tipo test", "Solo lo que es seguro que entra", "Preguntas cortas y rápidas"].map(t => `<button type="button" class="mp-b" data-prchip="${H(t)}">${H(t)}</button>`).join("")}</div>
      <button class="btn-p" style="--cf:var(--accent)">🎯 Generar examen de prueba</button><div id="prEstado" class="note" aria-live="polite"></div></form>
    ${hechos.length ? `<h3 style="margin:6px 0 0">Tus intentos</h3><ul class="pr-int">${hechos.map(x => `<li><b class="${x.nota >= 5 ? "ok" : "ko"}">${String(x.nota).replace(".", ",")}</b><span>${H(x.titulo || "Examen de prueba")}</span><small>${new Date(x.t).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}${x.puntos ? ` · +${x.puntos} pts` : ""}</small></li>`).join("")}</ul>` : ""}</section>`;
}
PR.html = (r) => {
  const id = r.slice(5), e = (S.examenes || []).find(x => x.id === id);
  if (!e) return `<div class="vista"><button class="back" data-go="resumen">← Inicio</button><section class="sheet"><div class="empty">No encuentro ese examen.</div></section></div>`;
  suscribir(id); if (!window.AP && typeof cargarApuntes === "function") cargarApuntes();
  const M = mapaDe(e), d = dias(e.fecha);
  return `<div class="vista"><button class="back" data-go="${H(e.asig)}">← ${H(NOM[e.asig] || e.asig)}</button>
    <section class="sheet pr-head" data-a="${H(e.asig)}"><span class="chip-asig" data-a="${H(e.asig)}">${H(NOM[e.asig] || e.asig)}</span><h2>🎯 ${H(e.titulo)}</h2>
      <span class="note">${d == null ? "Sin fecha" : d < 0 ? "Ya pasó" : d === 0 ? "Es hoy" : d === 1 ? "Es mañana" : `Faltan ${d} días`}${e.alcance ? " · " + H(e.alcance) : ""}</span></section>
    ${vistaExamen(e, M)}${vistaMapa(e, M)}${vistaPistas(e)}${vistaMarcar(e, M)}</div>`;
};
// fórmulas y markdown en las preguntas (si están las librerías de los apuntes)
PR.montar = () => {
  if (!PR.ex || !window.AP || !AP.pintarMd) return;
  const ex = PR.ex.examen, sol = PR.res && PR.res.soluciones;
  document.querySelectorAll("[data-mdq]").forEach(el => AP.pintarMd(el, ex.preguntas[+el.dataset.mdq].enunciado));
  if (sol) document.querySelectorAll("[data-mds]").forEach(el => AP.pintarMd(el, sol[+el.dataset.mds].solucion || ""));
};

// ---------- acciones ----------
async function llamar(ruta, cuerpo) {
  const token = await auth.currentUser.getIdToken();
  const r = await fetch(WORKER + ruta, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify(cuerpo) });
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "El servidor no responde (" + r.status + ")."); return d;
}
function guardarRespuestas() { const f = document.getElementById("prExF"); if (!f || !PR.ex) return;
  PR.resp = PR.ex.examen.preguntas.map((q, i) => { const el = f.elements["q" + i]; if (!el) return ""; if (q.tipo === "test" || q.tipo === "vf") { const c = f.querySelector(`[name="q${i}"]:checked`); return c ? (q.tipo === "vf" ? c.value === "true" : Number(c.value)) : ""; } return el.value; }); }
async function generar(e, pide) {
  const est = document.getElementById("prEstado"), b = document.querySelector("#prGenF button.btn-p");
  const hoyN = locales().filter(x => new Date(x.t).toDateString() === new Date().toDateString()).length + PR.misEx.filter(x => new Date(x.t).toDateString() === new Date().toDateString()).length;
  if (hoyN >= MAXL) { toast(`Ya has hecho ${MAXL} exámenes de prueba hoy. Mañana más.`); return; }
  if (b) b.disabled = true; if (est) est.textContent = "🎯 Preparando tu examen… (puede tardar un minuto)";
  try {
    const M = mapaDe(e);
    const d = await llamar("/examen", { examen: e.id, asig: e.asig, titulo: e.titulo, especificaciones: pide,
      mapa: M.slice(0, 30).map(x => ({ texto: x.texto, p: x.p })), temario: temasDe(e).map(t => t.titulo + ((t.puntos || []).length ? ": " + t.puntos.join(", ") : "")),
      material: apuntesDe(e).sort((a, b) => (b.utiles || []).length - (a.utiles || []).length).slice(0, 6).map(a => `# ${a.titulo}\n${a.md}`) });
    PR.ex = { id: d.id || null, examen: d.examen, puntos: !!d.puntos, t: Date.now() }; PR.resp = []; PR.res = null;
    if (!d.id) { const L = locales(); L.unshift({ lid: "l" + Date.now(), examen: e.id, titulo: d.examen.titulo, t: Date.now(), nota: null }); guardarLocal(L); PR.ex.lid = L[0].lid; }
    render(); document.getElementById("prEx")?.scrollIntoView({ block: "start" });
  } catch (x) { if (est) est.textContent = "No se ha podido: " + x.message; if (b) b.disabled = false; }
}
async function corregir() {
  guardarRespuestas(); const est = document.getElementById("prEstado"), b = document.querySelector("#prExF button[type=submit]");
  if (PR.resp.every(r => r === "" || r == null)) { toast("No has contestado nada."); return; }
  if (b) b.disabled = true; if (est) est.textContent = "✅ Corrigiendo…";
  try {
    const ex = PR.ex.examen;
    const d = PR.ex.id ? await llamar("/corregir", { id: PR.ex.id, respuestas: PR.resp })
      : await llamar("/corregir", { titulo: ex.titulo, preguntas: ex.preguntas, respuestas: PR.resp });
    PR.res = d;
    if (PR.ex.lid) { const L = locales(), x = L.find(y => y.lid === PR.ex.lid); if (x) { x.nota = d.nota; guardarLocal(L); } }
    render(); document.getElementById("prEx")?.scrollIntoView({ block: "start" });
    toast(d.puntos ? `Un ${String(d.nota).replace(".", ",")} · +${d.puntos} puntos` : `Un ${String(d.nota).replace(".", ",")}`);
  } catch (x) { if (est) est.textContent = "No se ha podido corregir: " + x.message; if (b) b.disabled = false; }
}
document.addEventListener("click", ev => {
  if (!ev.target.closest || !esRuta(route())) return;
  const q = s => ev.target.closest(s), e = (S.examenes || []).find(x => x.id === route().slice(5)); let el;
  if ((el = q("[data-prchip]"))) { const t = document.querySelector("#prGenF textarea"); if (t) t.value = el.dataset.prchip === "Como el examen real" ? "" : el.dataset.prchip; return; }
  if ((el = q("[data-prvoto]"))) { const p = PR.pistas.find(x => x.id === el.dataset.prvoto); if (!p) return; const ya = (p.votos || []).includes(S.uid);
    fs.updateDoc(fs.doc(db, "pistas", p.id), { votos: ya ? fs.arrayRemove(S.uid) : fs.arrayUnion(S.uid) }).catch(x => toast("No se ha podido (" + (x.code || "error") + ").")); return; }
  if ((el = q("[data-prborrar]"))) { fs.deleteDoc(fs.doc(db, "pistas", el.dataset.prborrar)).catch(x => toast("No se ha podido (" + (x.code || "error") + ").")); return; }
  if (q("[data-prcerrarex]")) { PR.ex = null; PR.res = null; render(); return; }
  if (q("[data-prnuevo]")) { PR.ex = null; PR.res = null; render(); setTimeout(() => document.querySelector("#prGenF textarea")?.focus(), 50); return; }
});
document.addEventListener("submit", async ev => {
  const f = ev.target; if (!esRuta(route())) return;
  const e = (S.examenes || []).find(x => x.id === route().slice(5)); if (!e) return;
  if (f.id === "prPistaF") { ev.preventDefault(); const t = f.elements.t.value.trim(); if (!t) return;
    // si ya hay una pista igual, se confirma esa en vez de repetirla
    const igual = PR.pistas.find(p => parecido(p.texto, t) >= 0.75 && p.nivel === f.elements.n.value);
    if (igual && igual.de !== S.uid) { fs.updateDoc(fs.doc(db, "pistas", igual.id), { votos: fs.arrayUnion(S.uid) }).then(() => toast("Ya estaba: la has confirmado.")).catch(x => toast("No se ha podido (" + (x.code || "error") + ").")); f.reset(); return; }
    fs.addDoc(fs.collection(db, "pistas"), { examen: e.id, asig: e.asig, texto: t.slice(0, 200), nivel: f.elements.n.value, de: S.uid, admin: !!S.esAdmin, votos: [], t: Date.now() })
      .then(() => { f.reset(); toast("Pista añadida."); }).catch(x => toast("No se ha podido (" + (x.code || "error") + ").")); return; }
  if (f.id === "prGenF") { ev.preventDefault(); generar(e, f.elements.pide.value.trim()); return; }
  if (f.id === "prExF") { ev.preventDefault(); corregir(); return; }
  if (f.id === "prMarcarF") { ev.preventDefault();
    const M = mapaDe(e), items = M.map((x, i) => ({ texto: x.texto, p: x.p, fuentes: x.fuentes, entro: !!(f.elements["m" + i] && f.elements["m" + i].checked) }));
    f.elements.otras.value.split("\n").map(s => s.trim()).filter(Boolean).forEach(t => items.push({ texto: t.slice(0, 200), p: null, fuentes: {}, entro: true }));
    const nuevo = aprender(PR.modelo, e.asig, items);
    try { await fs.setDoc(fs.doc(db, "prediccion", "h_" + e.id), { asig: e.asig, examen: e.id, titulo: e.titulo, items, t: Date.now() });
      await fs.setDoc(fs.doc(db, "prediccion", "modelo"), nuevo); toast("Guardado: el mapa ha aprendido de este examen."); }
    catch (x) { toast("No se ha podido (" + (x.code || "error") + ")."); } }
});
document.addEventListener("change", ev => { if (ev.target.closest && ev.target.closest("#prExF")) guardarRespuestas(); });
document.addEventListener("input", ev => { if (ev.target.closest && ev.target.closest("#prExF") && ev.target.tagName === "TEXTAREA") guardarRespuestas(); });
