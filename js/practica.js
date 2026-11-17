// 1 BACH · Temas de un examen, práctica, apuntes, ficha de examen
// (parte del antiguo script de index.html; los archivos js/ se cargan en orden y comparten las variables)
const PANEL="https://claude.ai/artifact/Np3XpCt8KZ7UtnWXBBqbsE";
function temasDe(e){const ids=Array.isArray(e.temas)?e.temas:[];return ids.map(id=>S.temas.find(t=>t.id===id)).filter(Boolean)}
function fechaLarga(f){const d=parseF(f);return d?d.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"}):"sin fecha"}
function promptDe(e){const ts=temasDe(e),d=dias(e.fecha),fal=S.fallos.filter(f=>f.asig===e.asig).slice(0,12);
  const L=[`Vamos a estudiar para mi examen de ${NOM[e.asig]||e.asig}: ${e.titulo}.`,
    `Es el ${fechaLarga(e.fecha)}${d!=null&&d>=0?` (quedan ${d} día${d===1?"":"s"})`:""}.`, e.alcance?`Entra: ${e.alcance}.`:"", ""];
  if(ts.length){L.push("Temas del examen:");ts.forEach(t=>{L.push(`- ${t.titulo}${t.nota?`: ${t.nota}`:""} (estado: ${ESTN[t.estado]||"Sin ver"})`);(t.puntos||[]).forEach(pt=>L.push(`    · ${pt}`))});L.push("")}
  if(fal.length){L.push("Fallos que ya he tenido en esta asignatura:");fal.forEach(f=>L.push(`- ${f.texto}`));L.push("")}
  L.push(`Todo mi material (temario, apuntes, exámenes anteriores) está en mi panel 1 BACH: ${PANEL} . Léelo con tus herramientas si lo necesitas.`);
  if(hrs(e))L.push(`Calculamos unas ${hrs(e)} h de estudio.`);
  L.push("Proponme un plan para los días que quedan y pregúntame por qué tema quiero empezar.");
  return L.filter((x,i,a)=>!(x===""&&a[i-1]==="")).join("\n")}
const barajar=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const P={id:null,test:[],resp:{},corregido:false,defs:[],ejer:[],corr:{},chat:[],busy:{}};
function prepararPractica(id){const d=S.practica.find(x=>x.id===id||x.examen===id);if(!d)return null;
  if(P.id!==id){P.id=id;P.chat=[];nuevaTanda(d,"todo")}return d}
function nuevaTanda(d,parte){const n=d.n||{test:10,defs:3,ejer:2};
  if(parte==="todo"||parte==="test"){P.test=barajar(d.test.map((q,i)=>i)).slice(0,n.test);P.resp={};P.corregido=false}
  if(parte==="todo"||parte==="defs"){P.defs=barajar(d.defs.map((q,i)=>i)).slice(0,n.defs);Object.keys(P.corr).filter(k=>k.startsWith("d")).forEach(k=>delete P.corr[k])}
  if(parte==="todo"||parte==="ejer"){const t1=d.ejer.map((q,i)=>i).filter(i=>d.ejer[i].t===1),t2=d.ejer.map((q,i)=>i).filter(i=>d.ejer[i].t===2);
    P.ejer=[barajar(t1)[0],barajar(t2)[0]].filter(x=>x!=null).slice(0,n.ejer);Object.keys(P.corr).filter(k=>k.startsWith("e")).forEach(k=>delete P.corr[k])}}
let sampleFn=undefined;
function renderPractica(id){const d=prepararPractica(id);
  if(!d)return `<div class="sheet"><b>Todavía no hay práctica para este examen.</b><span class="muted">Pronto estará.</span><button class="back" data-go="resumen">← Volver</button></div>`;
  const e=S.examenes.find(x=>x.id===d.examen),dd=e?dias(e.fecha):null;
  const test=P.test.map((qi,k)=>{const q=d.test[qi],r=P.resp[qi];
    return `<div class="pq"><b>${k+1}. ${esc(q.q)}</b>${q.o.map((o,j)=>{const cls=P.corregido?(j===q.a?"ok":(r===j?"ko":"")):"";
      return `<label class="${cls}"><input type="radio" name="q${qi}" data-tq="${qi}" value="${j}" ${r===j?"checked":""} ${P.corregido?"disabled":""}><span>${"abcd"[j]}) ${esc(o)}</span></label>`}).join("")}
      ${P.corregido?`<span class="exp">${r===q.a?"Bien.":r==null?"Sin contestar.":"Fallo."} ${esc(q.e)}</span>`:""}</div>`}).join("");
  const ac=P.test.filter(qi=>P.resp[qi]===d.test[qi].a).length,fa=P.test.filter(qi=>P.resp[qi]!=null&&P.resp[qi]!==d.test[qi].a).length;
  const defs=P.defs.map((di,k)=>{const x=d.defs[di],c=P.corr["d"+di];
    return `<div class="pq"><b>${k+1}. Define o explica: ${esc(x.c)}</b><textarea id="ta-d${di}" placeholder="Escribe tu respuesta como en el examen">${esc(c?.resp||"")}</textarea>
      <div class="fila-b">${sampleFn===null?"":`<button class="btn-p" data-corr="d${di}" ${P.busy["d"+di]?"disabled":""}>${P.busy["d"+di]?"Corrigiendo…":"Corregir con Claude"}</button>`}<button class="btn-sec" data-ver="d${di}">Ver la respuesta del temario</button></div>
      <div id="out-d${di}">${correcHTML(c)}</div><div class="ref" id="ref-d${di}" hidden>${esc(x.ref)}</div></div>`}).join("");
  const ejer=P.ejer.map((ei,k)=>{const x=d.ejer[ei],c=P.corr["e"+ei];
    return `<div class="pq"><b>${k+1}. ${esc(x.tipo)}</b><div class="enun">${esc(x.enun)}</div><textarea id="ta-e${ei}" placeholder="Escribe tu resolución paso a paso">${esc(c?.resp||"")}</textarea>
      <div class="fila-b">${sampleFn===null?"":`<button class="btn-p" data-corr="e${ei}" ${P.busy["e"+ei]?"disabled":""}>${P.busy["e"+ei]?"Corrigiendo…":"Corregir con Claude"}</button>`}<button class="btn-sec" data-ver="e${ei}">Ver la solución</button></div>
      <div id="out-e${ei}">${correcHTML(c)}</div><div class="ref" id="ref-e${ei}" hidden>${esc(x.sol)}</div></div>`}).join("");
  return `<div class="prac" data-a="${d.asig}">
    <button class="back" data-go="${d.asig}">← ${esc(AN[d.asig]||"Volver")}</button>
    <div class="prac-head"><div><span class="chip-asig" data-a="${d.asig}">Practicar · ${esc(AN[d.asig]||"")}</span><h2>${esc(d.titulo)}</h2><div class="formato">${esc(d.formato||"")}${dd!=null&&dd>=0?` · examen ${dd===0?"hoy":dd===1?"mañana":`en ${dd} días`}`:""}</div></div>
      <button class="btn-sec" data-tanda="todo">Nuevo simulacro</button></div>
    <section class="parte"><header><h3>Parte 1 · Test<small>${P.test.length} preguntas</small></h3>${P.corregido?`<span class="score">${ac} / ${P.test.length}</span>`:""}</header>${test}
      <div class="fila-b">${P.corregido?`<span class="note">${ac} ${ac===1?"acierto":"aciertos"} y ${fa} ${fa===1?"fallo":"fallos"}.</span><button class="btn-p" data-tanda="test">Otro test</button>`:`<button class="btn-p" data-corrtest>Corregir el test</button>`}</div></section>
    <section class="parte"><header><h3>Parte 2 · Definiciones y conceptos<small>${P.defs.length} preguntas</small></h3><button class="btn-sec" data-tanda="defs">Otras</button></header>${defs}</section>
    <section class="parte"><header><h3>Parte 3 · Ejercicios<small>${P.ejer.length} ejercicios</small></h3><button class="btn-sec" data-tanda="ejer">Otros</button></header>${ejer}</section>
    ${sampleFn===null?`<p class="sin-claude">La corrección con Claude no está disponible en esta vista. Puedes comparar con la respuesta del temario.</p>`:`<section class="parte chat"><header><h3>Pregúntale a Claude<small>sabe qué entra en este examen</small></h3></header>
      <div class="msgs2" id="msgs2">${P.chat.map(m=>`<div class="msg ${m.role==="user"?"yo":"cl"}">${esc(m.content)}</div>`).join("")||`<div class="note">Por ejemplo: «explícame el coste de oportunidad con un ejemplo» o «ponme otro ejercicio de oferta y demanda».</div>`}</div>
      <form id="fchat"><input id="qchat" placeholder="Escribe tu pregunta" autocomplete="off"><button class="btn-p" type="submit" ${P.busy.chat?"disabled":""}>${P.busy.chat?"…":"Enviar"}</button></form></section>`}
  </div>`}
function correcHTML(c){if(!c||!c.res)return c&&c.err?`<p class="sin-claude">${esc(c.err)}</p>`:"";const r=c.res;
  return `<div class="correc"><span class="nota">${esc(String(r.nota??""))} / 10</span>${r.bien?.length?`<div><b>Bien:</b><ul>${r.bien.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`:""}${r.falta?.length?`<div><b>Te falta o está mal:</b><ul>${r.falta.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`:""}${r.consejo?`<div>${esc(r.consejo)}</div>`:""}</div>`}
function contextoPractica(d){return `Examen de ${AN[d.asig]}: ${d.titulo}. Formato: ${d.formato}\nConceptos del temario:\n`+d.defs.map(x=>`- ${x.c}: ${x.ref}`).join("\n")}
function errSample(e){return e?.code==="not_granted"?"No has permitido que el panel use Claude. Puedes activarlo en los permisos del artefacto.":e?.code==="rate_limited"?"Demasiadas correcciones seguidas. Espera un momento.":"No se ha podido corregir ahora. Inténtalo de nuevo."}
async function corregir(key){const d=prepararPractica(P.id);if(!d||!sampleFn)return;const ta=$("#ta-"+key),resp=(ta?.value||"").trim();
  if(!resp){toast("Escribe primero tu respuesta.");return}
  const esDef=key[0]==="d",x=esDef?d.defs[+key.slice(1)]:d.ejer[+key.slice(1)];
  const prompt=`Eres el profesor de ${AN[d.asig]} de 1.º de Bachillerato de un alumno español. Corrige su respuesta de examen comparándola con la del temario, en español y con tono cercano.
${esDef?`Pregunta: define o explica «${x.c}».\nRespuesta del temario: ${x.ref}`:`Ejercicio:\n${x.enun}\nSolución correcta:\n${x.sol}`}
Respuesta del alumno:
${resp}
Responde solo con JSON: {"nota": número de 0 a 10 con medios puntos, "bien": [frases cortas de lo que está bien], "falta": [frases cortas de lo que falta o está mal, con el dato correcto], "consejo": "una frase para mejorar"}`;
  P.corr[key]={resp};P.busy[key]=true;render();
  try{const res=await sampleFn.json(prompt,{modelTier:"default"});P.corr[key]={resp,res};const ns=Object.values(P.corr).filter(c=>c&&c.res&&typeof c.res.nota==='number').map(c=>c.res.nota/10);if(ns.length)guardarPractica(d.examen,{redac:ns.reduce((a,b)=>a+b,0)/ns.length})}
  catch(e){P.corr[key]={resp,err:errSample(e)}}
  finally{P.busy[key]=false;render()}}
async function preguntar(q){const d=prepararPractica(P.id);if(!d||!sampleFn||!q.trim())return;
  P.chat.push({role:"user",content:q.trim()});P.busy.chat=true;render();
  const reglas=`Eres un profesor ayudando a un alumno de 1.º de Bachillerato a preparar un examen. Responde en español, claro y breve, basándote en este temario y sin salirte de él salvo que lo pida.\n${contextoPractica(d)}`;
  const turns=[{role:"user",content:reglas},{role:"assistant",content:"Entendido. ¿Qué quieres repasar?"},...P.chat.slice(-10)];
  const m={role:"assistant",content:"Pensando…"};P.chat.push(m);render();
  try{const {text}=await sampleFn(turns,{cache:false,onText:({text})=>{m.content=text;const b=document.querySelectorAll(".msg.cl");if(b.length)b[b.length-1].textContent=text}});m.content=text}
  catch(e){m.content=e?.text||errSample(e)}
  finally{P.busy.chat=false;render();const l=$("#msgs2");if(l)l.scrollTop=l.scrollHeight;setTimeout(()=>$("#qchat")?.focus(),0)}}
function aptsHTML(e){const ts=temasDe(e).filter(t=>(t.apuntes||[]).filter(esDoc).length);if(!ts.length)return "";
  return `<div class="apts"><span class="apts-l">Apuntes de este examen</span><div class="docs">${ts.map(t=>{const p=t.apuntes.filter(esDoc);
    return `<button class="doc" data-a="${t.asig}" data-apt="${esc(t.id)}" aria-label="Leer los apuntes de ${esc(t.titulo)}"><span class="paper ${p.length>1?"stack":""}"><img src="${esc(p[0])}" alt="" loading="lazy"><span class="pages">${p.length} pág.</span></span><span class="doc-meta"><b>${esc(t.titulo)}</b><span>Apuntes</span></span></button>`}).join("")}</div></div>`}
function abrirApuntes(id){const t=S.temas.find(x=>x.id===id);if(!t)return;const p=(t.apuntes||[]).filter(esDoc);if(!p.length)return;
  abrirVisor(`${NOM[t.asig]||t.asig} · ${t.titulo}`,`Apuntes · ${p.length} páginas`,p)}
let fichaActual=null;
function abrirFicha(id){const e=S.examenes.find(x=>x.id===id);if(!e)return;fichaActual=e;const ts=temasDe(e),d=dias(e.fecha),rec=S.recursos.filter(r=>r.asig===e.asig&&(ts.some(t=>t.id===r.tema)||r.tri===0||r.destacado));
  const cuando=d==null?"Sin fecha":d<0?"Ya pasó":d===0?"Hoy":d===1?"Mañana":`En ${d} días`;
  const idx=ts.length?`<ol class="indice">${ts.map(t=>`<li><b>${esc(t.titulo)}</b>${t.nota?`<p>${esc(t.nota)}</p>`:""}${(t.puntos||[]).length?`<ul>${t.puntos.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}<span class="st" data-s="${esc(t.estado||"sin")}" style="cursor:default">${esc(ESTN[t.estado]||"Sin ver")}</span></li>`).join("")}</ol>`
    :`<div class="empty">${esc(e.alcance||"Todavía no se sabe qué entra.")}</div>`;
  $("#ficha").innerHTML=`<div class="ficha" data-a="${e.asig}" role="dialog" aria-modal="true" aria-labelledby="ftit">
    <button class="cerrar volver" id="fcerrar" aria-label="Volver">← Volver</button>
    <div><span class="chip-asig" data-a="${e.asig}">${esc(NOM[e.asig]||e.asig)}</span><h2 id="ftit">${esc(e.titulo)}</h2></div>
    <div class="meta"><span class="pill ${d!=null&&d>=0&&d<5?"urge":""}">${cuando}</span><span>${esc(fechaLarga(e.fecha))}</span>${hrs(e)?`<span>· ≈${hrs(e)} h de estudio</span>`:""}</div>
    ${e.alcance&&ts.length?`<p class="note" style="margin:0">${esc(e.alcance)}</p>`:""}
    <div style="display:flex;flex-direction:column;gap:8px"><h3>Qué entra</h3>${idx}</div>
    ${aptsHTML(e)}
    ${rec.length?`<div style="display:flex;flex-direction:column;gap:8px"><h3>Material para estudiarlo</h3><div class="res">${rec.map(link).join("")}</div></div>`:""}
    <div class="acciones">${S.practica.some(x=>x.examen===e.id)?`<button class="btn-empezar" data-practicar="${esc(e.id)}">Practicar el examen aquí</button>`:""}<a class="btn-sec" href="#prep-${esc(e.id)}" data-fcierra>🎯 Mapa de qué entra y examen de prueba con IA</a></div></div>`;
  $("#ficha").hidden||history.pushState({modal:"f"},"");$("#ficha").hidden=false;admDecorar();document.body.style.overflow="hidden";$("#fcerrar").focus()}
function cerrarFicha(pop){if(pop!==true&&!$("#ficha").hidden&&history.state&&history.state.modal==="f"){history.back();return}$("#ficha").hidden=true;$("#ficha").innerHTML="";document.body.style.overflow="";fichaActual=null}
let enfocar=null;



document.addEventListener("click",ev=>{if(ev.target.closest&&ev.target.closest("[data-fcierra]"))cerrarFicha(true)},true);
