// 1 BACH · Cabecera de examen, próximos, filas y tarjetas de exámenes
// (parte del antiguo script de index.html; los archivos js/ se cargan en orden y comparten las variables)
function heroExamen(e){const L=limite(e),ms=L?L-new Date():null,pr=pExamen(e),ts=temasDe(e),pct=Math.round(pr.tot*100);
  const urge=ms!=null&&ms>0&&ms<5*864e5,f=fechaCorta(e.fecha),hayP=S.practica.some(x=>x.examen===e.id);
  const desg=[pr.a!=null?`Temas ${Math.round(pr.a*100)}%`:"",pr.b!=null?`Simulacro ${Math.round(pr.b*100)}%`:(hayP?"Simulacro: aún sin hacer":"")].filter(Boolean).join(" · ");
  const lista=ts.map(t=>{const n=(t.puntos||[]).length,h=hechosDe(t),ok=n?h.length===n:t.estado==="dominado";
    return `<div class="tk ${ok?"ok":""}"><label><input type="checkbox" data-ptema="${esc(t.id)}" ${ok?"checked":""} ${S.canWrite?"":"disabled"}><span>${esc(t.titulo)}</span>${n?`<span class="pt">${h.length}/${n}</span>`:""}</label>
      ${n?`<ul>${t.puntos.map((x,i)=>{const d=h.includes(i);return `<li class="${d?"ok":""}"><label><input type="checkbox" data-punto="${esc(t.id)}:${i}" ${d?"checked":""} ${S.canWrite?"":"disabled"}><span>${esc(x)}</span></label></li>`}).join("")}</ul>`:""}</div>`}).join("");
  return `<section class="hero ${urge?"urge":""}" data-a="${e.asig}" data-heroid="${esc(e.id)}"><div class="h-top"><div><div class="eyebrow">Próximo examen${f?` · ${f.d} ${f.m}`:""}</div><h2>${esc(e.titulo)}</h2>${e.alcance?`<div class="note">${esc(e.alcance)}</div>`:""}</div>
    ${L?`<div class="h-cd"><small>Tiempo de estudio hasta las 23:59 del día anterior</small><span class="cdn" data-cd="${L.getTime()}">${fmtCd(ms)}</span></div>`:""}</div>
    <div><div class="h-pct"><span class="big">${pct}%</span><div class="barra" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div></div><div class="desg">${esc(desg)}</div></div>
    ${ts.length?`<div class="chk">${lista}</div>`:""}
    <div class="acciones">${hayP?`<button class="btn-empezar" data-practicar="${esc(e.id)}">Practicar el examen aquí</button>`:""}<button class="btn-sec" data-det="${esc(e.id)}">Qué entra y apuntes</button></div></section>`}
setInterval(()=>{document.querySelectorAll("[data-cd]").forEach(el=>{el.textContent=fmtCd(+el.dataset.cd-Date.now())})},1000);
async function guardarTema(t,campos){const viejo={estado:t.estado,hechos:t.hechos};Object.assign(t,campos);render();
  try{await db.collection("temas").doc(t.id).update(campos)}catch(e){Object.assign(t,viejo);render();toast("No se ha guardado. Inténtalo otra vez.")}}
async function guardarPractica(eid,campos){const e=S.examenes.find(x=>x.id===eid);if(!e||!db||!S.canWrite)return;e.practica={...(e.practica||{}),...campos};
  try{await db.collection("examenes").doc(eid).update({practica:e.practica})}catch(x){}}
function proximos(){return S.examenes.filter(e=>!e.hecho&&e.fecha&&dias(e.fecha)>=0).sort((a,b)=>a.fecha.localeCompare(b.fecha))}
function examRow(e){const f=fechaCorta(e.fecha),d=dias(e.fecha),hp=hojas(e).length;
  let c;if(e.hecho)c=`<span class="count done">${e.nota!=null&&e.nota!==""?"Nota "+esc(e.nota):"Hecho"}${hp?" · Ver":""}</span>`;
  else if(d==null)c=`<span class="count">Sin fecha</span>`;
  else if(d<0)c=`<span class="count">Pasado</span>`;
  else c=`<span class="count ${d<=7?"soon":""}">${d===0?"Hoy":d===1?"Mañana":"En "+d+" días"}</span>`;
  const det=!e.hecho&&!hp?`data-det="${esc(e.id)}" role="button" tabindex="0" title="Ver qué entra"`:"";
  return `<div class="exam" data-exid="${esc(e.id)}" data-a="${e.asig}" ${hp?`data-exam="${esc(e.id)}" role="button" tabindex="0" title="Ver el examen"`:det}><div class="date">${f?`<b>${f.d}</b>${f.m}`:"—"}</div>
   <div class="t"><span class="chip-asig" data-a="${e.asig}">${esc(NOM[e.asig]||e.asig)}</span><b>${esc(e.titulo)}</b><span>${esc(e.alcance||"")}</span></div>${c}</div>`}

function docCard(e){const f=fechaCorta(e.fecha),p=hojas(e);
  const nota=e.nota!=null&&e.nota!==""?`<span class="nota">Nota: ${esc(e.nota)}</span>`:"";
  return `<button class="doc" data-a="${e.asig}" ${p.length?`data-exam="${esc(e.id)}" aria-label="Ver el examen ${esc(e.titulo)}"`:"disabled"}>
    <span class="paper ${p.length>1?"stack":""}">${e.claude?'<span class="cb" title="Hecho por Bernabéu">Bernabéu</span>':""}${p.length?`<img src="${esc(p[0])}" alt="" loading="lazy"><span class="pages">${p.length} ${p.length===1?"hoja":"hojas"}</span>`:`<span class="blank">Sin escanear.<br>Sin fotos todavía.</span>`}</span>
    <span class="doc-meta"><b>${esc(e.titulo)}</b><span>${e.modelo?`Modelo · curso ${esc(e.curso||"")}`:f?f.d+" "+f.m:"Sin fecha"}</span>${nota}</span></button>`}

