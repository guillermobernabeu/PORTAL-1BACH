// Mi panel: el proyecto 1 BACH completo de Guillermo, solo para el administrador.
// Los datos y las páginas están cifrados (AES-GCM) en el repositorio público: sin la clave no se pueden leer.
// Cada página tiene su propia clave; al publicar un documento solo se comparten las claves de sus páginas.
import { db, fs, auth } from "./fb.js?v=1794514981";

const BASE = new URL("../", import.meta.url).href;
const b64d = s => { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
async function descifrar(clave, buf) {
  const k = await crypto.subtle.importKey("raw", typeof clave === "string" ? b64d(clave) : clave, "AES-GCM", false, ["decrypt"]);
  const u = new Uint8Array(buf); return crypto.subtle.decrypt({ name: "AES-GCM", iv: u.slice(0, 12) }, k, u.slice(12));
}
const H = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const MP = window.MP = { D: null, estado: "sin", error: "" };
const cacheImg = {};
async function urlPagina(p) {
  if (cacheImg[p]) return cacheImg[p];
  const m = MP.D.pag[p]; if (!m) return "";
  const r = await fetch(BASE + m.f); const plano = await descifrar(m.k, await r.arrayBuffer());
  return cacheImg[p] = URL.createObjectURL(new Blob([plano], { type: "image/jpeg" }));
}

async function cargar(clave) {
  MP.estado = "cargando"; window.render && render();
  try {
    const r = await fetch(BASE + "data/panel.bin?v=" + Date.now());
    if (!r.ok) throw new Error("No se encuentra el panel");
    MP.D = JSON.parse(new TextDecoder().decode(await descifrar(clave, await r.arrayBuffer())));
    MP.estado = "listo"; try { localStorage.setItem("mpClave", clave); } catch (e) {}
    const u = auth.currentUser; if (u) fs.setDoc(fs.doc(db, "adminpriv", "clave"), { k: clave, t: Date.now() }).catch(() => {});
  } catch (e) { MP.estado = "clave"; try { localStorage.removeItem("mpClave"); } catch (x) {}
    MP.error = /encontr|fetch|network/i.test(e.message || "") ? "No se ha podido descargar tu panel. Revisa la conexión." : "Esa clave no es correcta. Cópiala entera, sin espacios."; }
  window.render && render();
}
MP.iniciar = async () => {
  if (MP.estado !== "sin") return;
  let k = ""; try { k = localStorage.getItem("mpClave") || ""; } catch (e) {}
  if (!k) { try { const s = await fs.getDoc(fs.doc(db, "adminpriv", "clave")); if (s.exists()) k = s.data().k || ""; } catch (e) {} }
  if (k) cargar(k); else { MP.estado = "clave"; window.render && render(); }
};

// ---------- qué está publicado (lo que ve la clase) ----------
const pubDe = (tipo, id) => (S[tipo] || []).some(x => x.id === id);
const TIPOS = { examenes: "examen", temas: "tema", recursos: "material" };

function botonPub(tipo, x) {
  if (tipo === "recursos" && x.tipo === "chat") return `<span class="mp-priv" title="Los chats de Claude solo los puedes abrir tú">🔒 Chat privado</span>`;
  return pubDe(tipo, x.id)
    ? `<span class="mp-pub">👥 En la clase</span><button type="button" class="mp-b" data-mpretirar="${tipo}:${H(x.id)}">Retirar</button>`
    : `<button type="button" class="mp-b mp-b1" data-mppub="${tipo}:${H(x.id)}">📤 Publicar en la clase</button>`;
}
const paginasDe = x => (x.paginas || x.apuntes || []).filter(p => MP.D.pag[p]);

// ---------- vistas ----------
const nombreA = id => (typeof NOM !== "undefined" && NOM[id]) || id;
// como en el portal: un examen deja de ser "próximo" a las 14:00 de su día (el último, si dura varios días)
const ultimoDia = e => (Array.isArray(e.dias) && e.dias.length ? e.dias.slice().sort().pop() : e.fecha);
const pasado = e => { const d = parseF(ultimoDia(e)); if (!d) return false; d.setHours(14, 0, 0, 0); return Date.now() >= d.getTime(); };
const pendiente = e => !e.hecho && !!e.fecha && !pasado(e);
const fCorta = f => { const d = f && parseF(f); return d ? d.toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "sin fecha"; };
function filaExamen(e) {
  const d = e.fecha ? dias(e.fecha) : null, hp = paginasDe(e).length, pend = pendiente(e);
  return `<li class="mp-it"><div class="mp-t"><b>${H(e.titulo)}</b><span>${H(nombreA(e.asig))} · ${fCorta(e.fecha)}${pend && d != null ? (d === 0 ? " · hoy" : d === 1 ? " · mañana" : ` · en ${d} días`) : e.fecha ? " · hecho" : ""}${e.nota ? ` · Nota: <b>${H(e.nota)}</b>` : ""}</span>${e.alcance ? `<small>${H(e.alcance)}</small>` : ""}</div>
    <div class="mp-a">${hp ? `<button type="button" class="mp-b" data-mpver="examenes:${H(e.id)}">📄 Ver ${hp} ${hp === 1 ? "hoja" : "hojas"}</button>` : ""}${botonPub("examenes", e)}</div></li>`;
}
function filaRecurso(r) {
  const n = paginasDe(r).length, abrir = n ? `<button type="button" class="mp-b" data-mpver="recursos:${H(r.id)}">📄 Ver ${n} ${n === 1 ? "página" : "páginas"}</button>` : r.url ? `<a class="mp-b" href="${H(r.url)}" target="_blank" rel="noopener">Abrir ↗</a>` : "";
  return `<li class="mp-it${r.oculto ? " mp-oc" : ""}"><div class="mp-t"><b>${r.destacado ? "⭐ " : ""}${H(r.titulo)}</b><span>${H(r.cat || TIPOS.recursos)}${r.oculto ? " · oculto en tu panel" : ""}</span>${r.nota ? `<small>${H(r.nota)}</small>` : ""}</div><div class="mp-a">${abrir}${botonPub("recursos", r)}</div></li>`;
}
const ESTADO = { sin: "Sin ver", visto: "Visto", repasado: "Repasado", dominado: "Dominado" };
function filaTema(t) {
  const n = paginasDe(t).length;
  return `<li class="mp-it"><div class="mp-t"><b>${H(t.titulo)}</b><span>${ESTADO[t.estado] || "Sin ver"}${t.tri ? ` · ${t.tri}.º trimestre` : ""}</span>${t.nota ? `<small>${H(t.nota)}</small>` : ""}</div>
    <div class="mp-a">${n ? `<button type="button" class="mp-b" data-mpver="temas:${H(t.id)}">📄 Apuntes (${n})</button>` : ""}${botonPub("temas", t)}</div></li>`;
}
function cabecera(titulo, extra) {
  return `<div class="vista"><button class="back" data-go="${extra ? "mipanel" : "resumen"}">← ${extra ? "Mi panel" : "Inicio"}</button>
  <section class="sheet mp-head"><header><h2>${titulo}</h2><span class="note">🔒 Privado: solo lo ves tú. Lo que publiques aparece en la pestaña Clase para todos.</span></header></section>`;
}
MP.html = (r) => {
  if (!S.esAdmin) return `<div class="sheet"><b>Esto es solo para el administrador.</b></div>`;
  if (MP.estado === "sin") { MP.iniciar(); return `<div class="sheet"><span class="muted">Abriendo tu panel…</span></div>`; }
  if (MP.estado === "cargando") return `<div class="sheet"><span class="muted">Descifrando tu panel…</span></div>`;
  if (MP.estado === "clave") return `<div class="vista"><section class="sheet mp-clave"><header><h2>🗂 Mi panel</h2></header>
    <p>Tu panel está guardado cifrado para que nadie más pueda verlo. Pega la clave que te dio Claude (solo hace falta una vez: después se recuerda en todos tus dispositivos).</p>
    <form id="mpClaveF"><input name="k" autocomplete="off" spellcheck="false" placeholder="Clave del panel" aria-label="Clave del panel"><button class="btn-p" style="--cf:var(--accent)">Abrir</button></form>
    ${MP.error ? `<p class="mp-err">${H(MP.error)}</p>` : ""}</section></div>`;
  const D = MP.D, a = r.startsWith("mipanel-") ? r.slice(8) : "";
  if (!a) {
    const prox = D.examenes.filter(pendiente).sort((x, y) => x.fecha.localeCompare(y.fecha));
    const tiles = ASIG.map(s => { const n = D.recursos.filter(x => x.asig === s.id).length + D.temas.filter(x => x.asig === s.id).length, pe = prox.find(e => e.asig === s.id);
      return `<a class="tile" data-a="${s.id}" href="#mipanel-${s.id}"><b>${H(s.n)}</b><span class="cuando">${pe ? `Examen ${dias(pe.fecha) === 0 ? "hoy" : `en ${dias(pe.fecha)} días`}` : `${n} cosas`}</span></a>`; }).join("");
    const npub = ["examenes", "temas", "recursos"].reduce((s, t) => s + D[t].filter(x => pubDe(t, x.id)).length, 0);
    return cabecera("🗂 Mi panel") + `<section class="sheet"><header><h2>Asignaturas</h2><span class="note">${D.recursos.length} materiales · ${D.examenes.length} exámenes · ${Object.keys(D.pag).length} páginas · ${npub} publicados en la clase</span></header><div class="tiles mp-tiles">${tiles}</div></section>
      <section class="sheet"><header><h2>Próximos exámenes</h2></header><ul class="mp-l">${prox.map(filaExamen).join("") || '<li class="empty">No hay exámenes próximos.</li>'}</ul></section>
      <p class="note" style="text-align:center"><a href="https://claude.ai/artifact/Np3XpCt8KZ7UtnWXBBqbsE" target="_blank" rel="noopener">Abrir mi panel original en Claude ↗</a> (para practicar con Claude y añadir cosas nuevas)</p></div>`;
  }
  const ex = D.examenes.filter(e => e.asig === a), prox = ex.filter(e => pendiente(e) || (!e.hecho && !e.fecha)).sort((x, y) => (x.fecha || "9").localeCompare(y.fecha || "9")), hech = ex.filter(e => !prox.includes(e)).sort((x, y) => (y.fecha || "").localeCompare(x.fecha || ""));
  const tem = D.temas.filter(t => t.asig === a).sort((x, y) => (x.tri || 0) - (y.tri || 0) || (x.orden ?? 99) - (y.orden ?? 99));
  const rec = D.recursos.filter(x => x.asig === a), fal = D.fallos.filter(f => f.asig === a);
  const grupos = {}; rec.forEach(x => { const g = x.paginas && x.paginas.length ? "Documentos" : x.tipo === "chat" ? "Chats de estudio" : "Apps y enlaces"; (grupos[g] = grupos[g] || []).push(x); });
  const voc = a === "ingles" ? (D.vocab.find(v => v.asig === "ingles" || v.id === "ingles") || {}).items : null;
  return cabecera("🗂 " + H(nombreA(a)), true)
    + `<section class="sheet"><header><h2>Próximos exámenes</h2></header><ul class="mp-l">${prox.map(filaExamen).join("") || '<li class="empty">No tienes exámenes próximos.</li>'}</ul></section>`
    + (hech.length ? `<section class="sheet"><header><h2>Exámenes hechos</h2></header><ul class="mp-l">${hech.map(filaExamen).join("")}</ul></section>` : "")
    + `<section class="sheet"><header><h2>Temas</h2></header><ul class="mp-l">${tem.map(filaTema).join("") || '<li class="empty">Nada todavía.</li>'}</ul></section>`
    + Object.entries(grupos).map(([g, L]) => `<section class="sheet"><header><h2>${g}</h2></header><ul class="mp-l">${L.map(filaRecurso).join("")}</ul></section>`).join("")
    + (fal.length ? `<section class="sheet"><header><h2>Tus fallos</h2><span class="note">Solo para ti</span></header><ul class="mp-fallos">${fal.map(f => `<li>${H(f.texto || f.t || f.fallo || JSON.stringify(f))}</li>`).join("")}</ul></section>` : "")
    + (Array.isArray(voc) ? `<section class="sheet"><header><h2>Vocabulario de tu panel</h2><span class="note">${voc.length} palabras</span></header><p class="note" style="margin:0">La lista de la clase está en la app <a href="vocabulary/">Vocabulary</a>.</p></section>` : "")
    + `</div>`;
};

// ---------- ver páginas cifradas ----------
async function ver(tipo, id) {
  const x = MP.D[tipo].find(y => y.id === id); if (!x) return;
  const P = paginasDe(x); toast("Abriendo " + P.length + (P.length === 1 ? " página…" : " páginas…"));
  try { const urls = await Promise.all(P.map(urlPagina)); abrirVisor(`${nombreA(x.asig)} · ${x.titulo}`, [x.cat, x.nota && tipo === "examenes" ? "Nota: " + x.nota : "", `${P.length} ${P.length === 1 ? "página" : "páginas"}`].filter(Boolean).join(" · "), urls); }
  catch (e) { toast("No se han podido abrir las páginas."); }
}

// ---------- publicar / retirar ----------
function formPub(tipo, x) {
  const desc = tipo === "examenes" ? x.alcance : x.nota, n = paginasDe(x).length;
  return `<h2>📤 Publicar en la clase</h2><p>Lo verán todos tus compañeros en el portal. Revisa el texto antes: quita notas o cosas personales.</p>
  <form id="mpPubF" data-t="${tipo}" data-id="${H(x.id)}" class="mp-form">
   <label class="rep-l">Título<input name="titulo" value="${H(x.titulo)}" maxlength="140" required></label>
   <label class="rep-l">${tipo === "examenes" ? "Qué entra" : "Descripción"}<textarea name="desc" rows="3" maxlength="600">${H(desc || "")}</textarea></label>
   ${tipo === "examenes" ? `<p class="note">Se publica la fecha y lo que entra. ${x.nota ? "<b>Tu nota no se publica.</b> " : ""}${n ? "Tus hojas del examen tampoco." : ""}</p>` : ""}
   ${tipo !== "examenes" && n ? `<p class="note">Se compartirán ${tipo === "temas" ? "también los apuntes del tema: " : "sus "}${n} ${n === 1 ? "página" : "páginas"} (solo con los que entran con cuenta).</p>` : ""}
   ${tipo === "recursos" && /claude\.ai/.test(x.url || "") ? `<p class="note">⚠️ Es un enlace de Claude: para que tus compañeros puedan abrirlo, compártelo también desde Claude.</p>` : ""}
   <div class="adm-b"><button type="submit" class="btn-p" style="--cf:var(--accent)">Publicar</button><button type="button" class="btn-sec" data-admcerrar>Cancelar</button></div></form>`;
}
async function publicar(tipo, id, titulo, desc) {
  const x = MP.D[tipo].find(y => y.id === id); if (!x) return;
  const t = Date.now(), base = { titulo, asig: x.asig, nuevo: true, borrado: false, pub: t };
  let campos;
  if (tipo === "examenes") campos = { ...base, fecha: x.fecha || "", dias: x.dias || [], alcance: desc, horas: x.horas || null, temas: (x.temas || []).filter(id => pubDe("temas", id)), hecho: !!x.hecho, nota: null };
  else if (tipo === "temas") { campos = { ...base, tri: x.tri || 1, orden: x.orden ?? 99, nota: desc, estado: "sin" };
    // los apuntes del tema se comparten como un material más de ese tema
    const P = paginasDe(x);
    if (P.length) { const rid = "ap-" + id;
      await fs.setDoc(fs.doc(db, "compartidos", rid), { titulo: "Apuntes: " + titulo, asig: x.asig, cat: "Apuntes", paginas: P.map(p => MP.D.pag[p]), t });
      await window.guardarCambio("recursos", rid, { titulo: "Apuntes: " + titulo, asig: x.asig, nuevo: true, borrado: false, pub: t, tri: x.tri || 1, tema: id, tipo: "doc", cat: "Apuntes", nota: P.length + " páginas", url: "apuntes/#" + rid }); } }
  else {
    const P = paginasDe(x);
    campos = { ...base, tri: x.tri ?? 1, tema: pubDe("temas", x.tema) ? x.tema : "", tipo: P.length ? "doc" : x.tipo, cat: x.cat || "", nota: desc, claude: !!x.claude, destacado: !!x.destacado, url: P.length ? "apuntes/#" + id : (x.url || "") };
    if (P.length) await fs.setDoc(fs.doc(db, "compartidos", id), { titulo, asig: x.asig, cat: x.cat || "", paginas: P.map(p => MP.D.pag[p]), t });
  }
  await window.guardarCambio(tipo, id, campos);
}
async function retirar(tipo, id) {
  await window.guardarCambio(tipo, id, { borrado: true });
  if (tipo === "recursos") await fs.deleteDoc(fs.doc(db, "compartidos", id)).catch(() => {});
  if (tipo === "temas" && pubDe("recursos", "ap-" + id)) { await window.guardarCambio("recursos", "ap-" + id, { borrado: true }); await fs.deleteDoc(fs.doc(db, "compartidos", "ap-" + id)).catch(() => {}); }
}

document.addEventListener("click", ev => {
  if (!ev.target.closest) return;
  const v = ev.target.closest("[data-mpver]"), p = ev.target.closest("[data-mppub]"), q = ev.target.closest("[data-mpretirar]");
  if (!v && !p && !q) return; ev.preventDefault();
  if (v) { const [t, id] = v.dataset.mpver.split(":"); ver(t, id); return; }
  if (p) { const [t, id] = p.dataset.mppub.split(":"), x = MP.D[t].find(y => y.id === id); if (x) admModal(formPub(t, x)); return; }
  if (q) { if (!q.dataset.c) { q.dataset.c = 1; q.textContent = "¿Seguro? Pulsa otra vez"; return; }
    const [t, id] = q.dataset.mpretirar.split(":"); retirar(t, id).then(() => toast("Retirado de la clase.")).catch(e => toast("No se ha podido (" + (e.code || "error") + ")."));
  }
});
document.addEventListener("submit", ev => {
  const f = ev.target;
  if (f.id === "mpClaveF") { ev.preventDefault(); const k = f.elements.k.value.trim(); if (k) cargar(k); return; }
  if (f.id === "mpPubF") { ev.preventDefault(); const b = f.querySelector("[type=submit]"); b.disabled = true;
    publicar(f.dataset.t, f.dataset.id, f.elements.titulo.value.trim(), f.elements.desc.value.trim())
      .then(() => { admCerrar(); toast("Publicado: ya lo ve toda la clase."); })
      .catch(e => { b.disabled = false; toast("No se ha podido publicar (" + (e.code || e.message || "error") + ")."); }); }
});
MP.iniciar();
