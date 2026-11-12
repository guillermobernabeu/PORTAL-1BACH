// Paneles laterales para las apps en el ordenador: casa, modo Deep Work, cuenta atrás del examen,
// porcentaje de lo que dominas y el ranking (los 3 primeros · … · tú).
import { auth, db, fs, alCambiarClase, nombreDe, fotoDe, concentracion, ponerConcentracion } from "./fb.js?v=1794512924";

const RAIZ = new URL("../", import.meta.url).href;
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const CSS = `
.lat-d{display:none}
.lat-i{position:fixed;top:8px;right:8px;display:flex;flex-direction:row;gap:6px;z-index:96;align-items:center}
@media (max-width:1239px){.lat-i .lat-conc,.lat-i .adm-1b{padding:5px 8px 5px 6px;font-size:0;gap:5px}.lat-i .lat-conc::after{content:"🎯";font-size:14px}.lat-i .adm-1b .t1{font-size:0}.lat-i .adm-1b .t1::before{content:"🛠";font-size:14px}}
@media (min-width:1240px){
  .lat-d{position:fixed;top:22px;right:22px;bottom:22px;width:min(300px,calc((100vw - 800px)/2 - 30px));display:flex;flex-direction:column;gap:14px;z-index:40;overflow-y:auto;scrollbar-width:none}
  .lat-i{top:78px;left:22px;right:auto;flex-direction:column;gap:12px;align-items:flex-start}
  html.con-lateral .casa-1b{top:18px;left:22px;width:52px;height:52px}
  html.con-lateral .casa-1b svg{width:26px;height:26px}
  html.con-lateral .claude{left:86px;top:32px}
}
html.concentracion-1b .lat-d,html.concentracion-1b.con-lateral .casa-1b{display:none!important}
.lat-c{background:#fff;color:#141a2e;border:1px solid #e3e7ee;border-radius:18px;padding:14px 16px;box-shadow:0 2px 10px rgba(20,26,46,.06);font:14px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif}
.lat-c h3{margin:0 0 8px;font-size:12px;letter-spacing:.07em;text-transform:uppercase;color:#6b7383;font-weight:800}
.lat-reloj .ex{font-weight:800;font-size:15px}.lat-reloj .cu{color:#6b7383;font-size:12.5px;margin-top:1px}
.lat-reloj .cd{margin-top:8px;font:800 30px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.02em;color:#e5231b}
.lat-reloj .cd small{display:block;font:600 11px system-ui,sans-serif;color:#6b7383;letter-spacing:.06em;text-transform:uppercase;margin-top:5px}
.lat-reloj .hoy{font:800 20px/1.2 system-ui,sans-serif;color:#e5231b;margin-top:6px}
.lat-dom{display:flex;flex-direction:column;align-items:center;text-align:center}
.lat-dom svg{width:150px;height:150px;display:block}
.lat-dom .big{font:800 34px/1 system-ui,sans-serif;fill:#141a2e}.lat-dom .sm{font:700 11px system-ui,sans-serif;fill:#6b7383;letter-spacing:.06em;text-transform:uppercase}
.lat-dom .ley{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;font-size:12.5px;color:#3b4258;margin-top:6px}
.lat-dom .ley i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;vertical-align:-1px}
.lat-rk ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.lat-rk li{display:grid;grid-template-columns:26px 30px minmax(0,1fr) auto;gap:8px;align-items:center;padding:6px 8px;border-radius:12px}
.lat-rk li.yo{background:#e8efff;box-shadow:inset 0 0 0 1.5px #2156c9}
.lat-rk .pos{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font:800 12px system-ui,sans-serif;color:#3b4258;background:#eef1f5}
.lat-rk .p1{background:#ffd34d;color:#5a4100}.lat-rk .p2{background:#d9dee6;color:#3b4258}.lat-rk .p3{background:#e7a86b;color:#4a2a08}
.lat-rk .av{width:30px;height:30px;border-radius:50%;object-fit:cover;display:grid;place-items:center;background:#dfe6f5;color:#2156c9;font:800 13px system-ui,sans-serif}
.lat-rk .nm{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lat-rk .pt{font:800 13px ui-monospace,Menlo,monospace;color:#2156c9}
.lat-rk .dots{text-align:center;color:#9aa2b1;font-weight:800;letter-spacing:.3em;padding:0}
.lat-rk a{display:block;margin-top:8px;font-size:12.5px;font-weight:700;color:#2156c9;text-decoration:none}
.lat-conc{display:flex;align-items:center;gap:8px;border:1px solid #e3e7ee;background:#fff;color:#3b4258;border-radius:999px;padding:7px 12px 7px 8px;font:700 13px system-ui,sans-serif;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.lat-conc .sw{width:30px;height:18px;border-radius:999px;background:#cfd5df;position:relative;transition:background .2s}
.lat-conc .sw::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:transform .2s}
.lat-conc[aria-pressed=true] .sw{background:#2156c9}.lat-conc[aria-pressed=true] .sw::after{transform:translateX(12px)}
html.concentracion-1b .lat-conc{opacity:.45}html.concentracion-1b .lat-conc:hover{opacity:1}
`;

export async function iniciarLateral({ recurso, stats }) {
  const st = document.createElement("style"); st.textContent = CSS; document.head.append(st);
  document.documentElement.classList.add("con-lateral");
  const d = document.createElement("aside"); d.className = "lat-d"; d.setAttribute("aria-label", "Tu progreso");
  d.innerHTML = `<section class="lat-c lat-reloj" id="latReloj" hidden></section><section class="lat-c lat-dom" id="latDom"></section><section class="lat-c lat-rk" id="latRk"><h3>🏆 Ranking de hoy</h3><ol id="latRkL"><li class="dots">cargando</li></ol><a href="${RAIZ}#amigos">Ver el ranking completo →</a></section>`;
  const i = document.createElement("aside"); i.className = "lat-i";
  i.innerHTML = `<button class="lat-conc" type="button" aria-pressed="${concentracion()}" title="Deep Work: quita todo lo de los lados y los avisos para que te centres solo en estudiar"><span class="sw" aria-hidden="true"></span>🎯 Deep Work</button>`;
  document.body.append(d, i);
  const bt = i.querySelector(".lat-conc");
  bt.onclick = () => { const v = !concentracion(); ponerConcentracion(v); bt.setAttribute("aria-pressed", String(v)); };

  // ---- cuenta atrás del examen al que pertenece esta app ----
  let examen = null;
  try {
    const c = await (await fetch(RAIZ + "data/clase.json", { cache: "no-store" })).json();
    try { const cs = await fs.getDoc(fs.doc(db, "clase", "cambios")); const cb = (cs.exists() && cs.data().examenes) || {};
      c.examenes = c.examenes.map(e => cb[e.id] ? { ...e, ...cb[e.id] } : e).concat(Object.keys(cb).filter(id => cb[id].nuevo && !c.examenes.some(e => e.id === id)).map(id => ({ id, temas: [], ...cb[id] }))).filter(e => !e.borrado);
    } catch (e) {}
    const r = c.recursos.find(x => x.id === recurso), tema = r && r.tema;
    const inicio = e => { const [y, m, dd] = e.fecha.split("-").map(Number); return new Date(y, m - 1, dd, 8, 0, 0); };
    const fin = e => { const t = inicio(e); t.setHours(14); return t; };
    examen = c.examenes.filter(e => !e.hecho && e.fecha && (e.temas || []).includes(tema) && fin(e) > new Date()).sort((a, b) => a.fecha.localeCompare(b.fecha))[0] || null;
    if (examen) { examen._ini = inicio(examen); examen._fin = fin(examen); }
  } catch (e) {}
  const R = document.getElementById("latReloj");
  const dos = n => String(n).padStart(2, "0");
  function reloj() {
    if (!examen) { R.hidden = true; return; }
    R.hidden = false; const ahora = Date.now(), ms = examen._ini - ahora;
    const f = examen._ini.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
    let cd;
    if (ms <= 0) cd = `<div class="hoy">¡Es hoy! Suerte 🍀</div>`;
    else { const s = Math.floor(ms / 1000), dd = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
      cd = `<div class="cd">${dd ? dd + "d " : ""}${dos(h)}:${dos(m)}:${dos(ss)}<small>para el examen</small></div>`; }
    R.innerHTML = `<h3>⏳ Examen</h3><div class="ex">${esc(examen.titulo)}</div><div class="cu">${esc(f)} · 8:00</div>${cd}`;
  }
  reloj(); setInterval(reloj, 1000);

  // ---- porcentaje grande de lo que dominas ----
  const D = document.getElementById("latDom");
  let firma = "";
  function dominio() {
    const s = stats && stats(); if (!s || !s.total) return;
    const k = s.dom + "/" + s.ctrl + "/" + s.total; if (k === firma) return; firma = k;
    const pd = s.dom / s.total, pc = s.ctrl / s.total, R0 = 60, C = 2 * Math.PI * R0;
    const arco = (p, off, col) => `<circle cx="75" cy="75" r="${R0}" fill="none" stroke="${col}" stroke-width="14" stroke-linecap="${p > 0 ? "round" : "butt"}" stroke-dasharray="${Math.max(0, p * C - (p > 0 ? 1 : 0))} ${C}" stroke-dashoffset="${-off * C}" transform="rotate(-90 75 75)"/>`;
    D.innerHTML = `<h3 style="align-self:flex-start">📈 Lo que dominas</h3><svg viewBox="0 0 150 150" role="img" aria-label="${Math.round(pd * 100)}% dominado"><circle cx="75" cy="75" r="${R0}" fill="none" stroke="#eef1f5" stroke-width="14"/>${arco(pc, pd, "#f3c84b")}${arco(pd, 0, "#2fb35f")}<text x="75" y="76" text-anchor="middle" class="big">${Math.round(pd * 100)}%</text><text x="75" y="98" text-anchor="middle" class="sm">dominado</text></svg>
      <div class="ley"><span><i style="background:#2fb35f"></i>${s.dom} dominadas</span><span><i style="background:#f3c84b"></i>${Math.round(pc * 100)}% controlando</span><span><i style="background:#cfd5df"></i>${s.total - s.dom - s.ctrl} sin saber</span></div>`;
  }
  dominio(); setInterval(dominio, 1000);

  // ---- ranking: los 3 primeros · … · tú ----
  const L = document.getElementById("latRkL");
  let us = {}, pts = window.__rank1b || {};
  function rk() {
    const yo = auth.currentUser && auth.currentUser.uid; if (!yo) return;
    const ids = new Set(Object.keys(us).filter(id => !(us[id] || {}).baneado)); ids.add(yo);
    const lista = [...ids].map(id => ({ id, p: pts[id] || 0 })).sort((a, b) => b.p - a.p || nombreDe(us[a.id]).localeCompare(nombreDe(us[b.id])));
    const pos = lista.findIndex(x => x.id === yo);
    const fila = (x, n) => { const u = us[x.id] || {}, f = fotoDe(u), nom = x.id === yo ? "Tú" : nombreDe(u);
      return `<li class="${x.id === yo ? "yo" : ""}"><span class="pos ${n <= 3 ? "p" + n : ""}">${n}</span>${f ? `<img class="av" src="${esc(f)}" alt="" referrerpolicy="no-referrer">` : `<span class="av">${esc((nombreDe(u) || "?").charAt(0).toUpperCase())}</span>`}<span class="nm">${esc(nom)}</span><span class="pt">${x.p}</span></li>`; };
    let h = lista.slice(0, 3).map((x, k) => fila(x, k + 1)).join("");
    if (pos > 3) h += `<li class="dots" aria-hidden="true">···</li>`;
    if (pos >= 3) h += fila(lista[pos], pos + 1);
    L.innerHTML = h || `<li class="dots">sin datos</li>`;
  }
  document.addEventListener("rank1b", e => { pts = e.detail || {}; rk(); });
  let q = null;
  const arrancar = () => { if (q || !auth.currentUser) return; q = alCambiarClase(u => { us = u; rk(); }); rk(); };
  setInterval(arrancar, 1500); arrancar();
}
