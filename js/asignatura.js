// 1 BACH · Vista de asignatura, vocabulario del panel, papelera, sugerencias de @
// (parte del antiguo script de index.html; los archivos js/ se cargan en orden y comparten las variables)
const V={q:"",f:"t1",tapar:false};
function renderVocab(id){const doc=S.vocab.find(v=>v.asig===id);if(!doc||!Array.isArray(doc.items))return "";
  const it=doc.items,nt1=it.filter(x=>x.term===1).length,nojo=it.filter(x=>x.ojo).length,ncl=it.filter(x=>x.origen==="claude").length;
  const fb=(k,t)=>`<button class="fchip" data-vf="${k}" aria-pressed="${V.f===k}">${t}</button>`;
  return `<section class="sheet" id="vocab"><header><h2>${esc(doc.titulo||"Vocabulario")}</h2><span class="note mono" id="vcount">${it.length} palabras</span></header>
    <div class="vtools"><input id="vq" type="search" placeholder="Buscar en inglés o en español" value="${esc(V.q)}" aria-label="Buscar vocabulario">
      ${nt1?fb("t1",`1st term · examen (${nt1})`):""}${fb("todas","Todas")}${fb("ojo",`Ojo con la traducción (${nojo})`)}${fb("claude",`Añadidas por Claude (${ncl})`)}
      <button class="fchip" id="vtapar" aria-pressed="${V.tapar}">Tapar español</button></div>
    <div class="vlist ${V.tapar?"tapar":""}" id="vlist">${it.map((x,i)=>`<div class="vrow" data-i="${i}" data-s="${esc((x.en+" "+x.es).toLowerCase())}" data-k="${x.term===1?"t1 ":""}${x.ojo?"ojo ":""}${x.origen==="claude"?"claude":""}">
      <span class="en">${esc(x.en)}${x.term===1?'<span class="tagc">1st term</span>':""}${x.origen==="claude"?'<span class="tagc">Bernabéu</span>':""}</span><span class="es">${esc(x.es)}</span>
      ${x.ojo?`<span class="ojo">Ojo: ${esc(x.ojo)}</span>`:""}${x.nota?`<span class="nv">${esc(x.nota)}</span>`:""}</div>`).join("")}</div>
    <p class="note">Para practicarla, entra en <a href="vocabulary/"><b>Vocabulary 1st Term</b></a>. Las marcadas con «Ojo» tienen una traducción que conviene revisar.</p></section>`}
function filtrarVocab(){const l=$("#vlist");if(!l)return;const q=V.q.trim().toLowerCase();let n=0;
  l.querySelectorAll(".vrow").forEach(r=>{const ok=(!q||r.dataset.s.includes(q))&&(V.f==="todas"||r.dataset.k.includes(V.f));r.hidden=!ok;if(ok)n++});
  const c=$("#vcount");if(c)c.textContent=`${n} palabra${n===1?"":"s"}`}
function renderAsig(id){
  const tr=triAbierto(tri[id])&&tri[id]?tri[id]:triActual();
  const temasAll=S.temas.filter(t=>t.asig===id);
  const temas=temasAll.filter(t=>t.tri===tr).sort((a,b)=>(a.orden??0)-(b.orden??0));
  const rec=S.recursos.filter(r=>r.asig===id&&r.tri===tr);
  const sueltos=rec.filter(r=>!r.tema||!temas.some(t=>t.id===r.tema)).sort((a,b)=>(a.orden??999)-(b.orden??999)||(b.destacado?1:0)-(a.destacado?1:0));
  const ex=S.examenes.filter(e=>e.asig===id||e.asig==="global").sort((a,b)=>(a.fecha||"9999").localeCompare(b.fecha||"9999"));
  const fal=S.fallos.filter(f=>f.asig===id);
  const curso=S.recursos.filter(r=>r.asig===id&&r.tri===0);
  const prox=ex.filter(e=>!e.hecho),hech=ex.filter(e=>e.hecho).sort((a,b)=>(b.fecha||"").localeCompare(a.fecha||""));
  const p=progreso(temas);
  const seg=[1,2,3].map(n=>triAbierto(n)?`<button data-tri="${n}" aria-pressed="${n===tr}">${n}.º trimestre</button>`:`<button class="tri-cerrado" data-tricerrado="${n}" aria-disabled="true" title="Se abre hacia el ${ABRE_TRI[n].toLocaleDateString("es-ES",{day:"numeric",month:"long"})}">${n}.º trimestre <span class="candado" aria-hidden="true">🔒</span></button>`).join("");
  const lista=temas.length?`<div class="temas">${temas.map(t=>{const rs=rec.filter(r=>r.tema===t.id).sort((a,b)=>(a.orden??999)-(b.orden??999));
     return `<div class="tema" data-tid="${esc(t.id)}"><button class="st" data-s="${esc(t.estado||"sin")}" data-tema="${esc(t.id)}" ${S.canWrite?"":"disabled"} title="Toca para cambiar el estado">${esc(ESTN[t.estado]||"Sin ver")}</button>
      <div class="body"><b>${esc(t.titulo)}</b>${t.nota?`<p>${esc(t.nota)}</p>`:""}${rs.length?`<div class="res">${rs.map(link).join("")}</div>`:""}</div></div>`}).join("")}</div>`
    :`<div class="empty">De momento no hay nada de ${esc(AN[id])} en el ${tr}.º trimestre. Irá apareciendo aquí.</div>`;
  const main=prox.find(e=>e.fecha&&dias(e.fecha)>=0&&e.asig===id)||prox.find(e=>e.fecha&&dias(e.fecha)>=0),otros=prox.filter(e=>e!==main);
  return `<div data-a="${id}" style="display:flex;flex-direction:column;gap:16px">
    <button class="back" data-go="resumen">← Todas las asignaturas</button>
    <div class="subj-head"><div><div class="eyebrow">${temasAll.length} temas en el curso</div><h2>${esc(AN[id])}</h2></div><div class="seg" role="group" aria-label="Trimestre">${seg}</div></div>
    ${main?heroExamen(main):""}
    <section class="sheet"><header><h2>Exámenes</h2><span class="note">${prox.length} próximo${prox.length===1?"":"s"} · ${hech.length} realizado${hech.length===1?"":"s"}</span></header>
      ${main&&!otros.length?"":`<div class="exsub"><h3>${main?"Otros próximos":"Próximos"}</h3>${otros.length?`<div class="exams">${otros.map(e=>examRow(e)+aptsHTML(e)).join("")}</div>`:`<div class="empty">No tienes exámenes próximos de ${esc(AN[id])}.</div>`}</div>`}
      <div class="exsub"><h3>Realizados</h3>${hech.length?`<div class="docs">${hech.map(docCard).join("")}</div>`:`<div class="empty">Aquí irán los exámenes ya hechos.</div>`}</div>
    </section>
    <section class="sheet"><header><h2>Temas</h2><span class="note mono">${p==null?"":Math.round(p*100)+"% del trimestre"}</span></header>
      ${lista}
      ${temas.length?`<div class="legend">Toca el estado para avanzarlo: ${EST.map(([k,v])=>`<span class="st" data-s="${k}" style="cursor:default;min-width:0">${v}</span>`).join("")}</div>`:""}
    </section>
    <section class="sheet"><header><h2>Material del trimestre</h2></header>
      ${sueltos.length?`<div class="res">${sueltos.map(link).join("")}</div>`:`<div class="empty">Aquí irán los apuntes y las apps que no son de un tema concreto.</div>`}</section>
    ${renderVocab(id)}
    ${fal.length?`<section class="sheet"><header><h2>Mis fallos</h2><span class="note">Para repasar antes del examen</span></header><ul class="fallos">${fal.map(f=>`<li>${esc(f.texto)}</li>`).join("")}</ul></section>`:""}
    ${curso.length?`<section class="sheet"><header><h2>Documentos de la asignatura</h2><span class="note">Valen para todo el curso</span></header><div class="res">${curso.map(link).join("")}</div></section>`:""}
    ${papelera(id)}
  </div>`}
function papelera(id){const o=(S.ocultos||[]).filter(r=>r.asig===id);if(!o.length)return "";
  return `<details class="papelera" ${abiertaPap?"open":""}><summary>Documentos eliminados (${o.length})</summary><ul>${o.map(r=>`<li><span>${esc(r.titulo)}</span><button type="button" data-restaurar="${esc(r.id)}">Restaurar</button></li>`).join("")}</ul></details>`}
let abiertaPap=false;
async function marcarOculto(id,v){const lista=v?S.recursos:S.ocultos,r=lista.find(x=>x.id===id);if(!r||!db)return;
  if(v){S.recursos=S.recursos.filter(x=>x!==r);r.oculto=true;S.ocultos.push(r)}else{S.ocultos=S.ocultos.filter(x=>x!==r);r.oculto=false;S.recursos.push(r)}
  render();toast(v?"Quitado. Lo puedes restaurar abajo del todo, en «Documentos eliminados».":"Restaurado en su sitio.");
  try{await db.collection("recursos").doc(id).update({oculto:v})}catch(e){toast("No se ha guardado el cambio. Inténtalo otra vez.")}}
document.addEventListener("input",ev=>{if(ev.target.id==="chatTxt"&&route()==="chat")sugerir(ev.target)});
document.addEventListener("keydown",ev=>{if(ev.target.id!=="chatTxt")return;const box=document.getElementById("menc");if(!box||box.hidden)return;
  const bs=[...box.querySelectorAll("button")],i=bs.findIndex(b=>b.classList.contains("sel"));
  if(ev.key==="ArrowDown"||ev.key==="ArrowUp"){ev.preventDefault();const j=(i+(ev.key==="ArrowDown"?1:-1)+bs.length)%bs.length;bs.forEach((b,k)=>b.classList.toggle("sel",k===j))}
  else if(ev.key==="Enter"||ev.key==="Tab"){ev.preventDefault();ev.stopImmediatePropagation();ponerMencion(bs[Math.max(0,i)].dataset.mencid)}
  else if(ev.key==="Escape")box.hidden=true},true);
