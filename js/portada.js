// 1 BACH · Portada: pestañas del admin, compañeros, novedades, recomendaciones, resumen
// (parte del antiguo script de index.html; los archivos js/ se cargan en orden y comparten las variables)
// ---------- portal del administrador: Mi panel · Clase · Compañeros ----------
function cargarApuntes(){if(window.__apCargando)return;window.__apCargando=1;import("../shared/apuntes.js?v=1795010136").then(()=>render()).catch(()=>{window.__apCargando=0})}
function cargarPrep(){if(window.__prCargando)return;window.__prCargando=1;import("../shared/prep.js?v=1795010136").then(()=>render()).catch(()=>{window.__prCargando=0;toast("No se ha podido abrir.")})}
function cargarMiPanel(){if(!S.esAdmin||window.__mpCargando)return;window.__mpCargando=1;import("../shared/mipanel.js?v=1795010136").then(()=>render()).catch(()=>{window.__mpCargando=0;toast("No se ha podido abrir tu panel.")})}
function admTabs(r){document.querySelector(".admtabs")?.remove();if(!S.esAdmin||!S.uid)return;const v=$("#view"),a=r.startsWith("mipanel")?"mp":r==="companeros"?"co":"cl";
  v.insertAdjacentHTML("afterbegin",`<nav class="admtabs" aria-label="Portal del administrador"><a href="#mipanel" aria-current="${a==="mp"}">🗂 Mi panel</a><a href="#" data-go="resumen" aria-current="${a==="cl"}">👥 Clase</a><a href="#companeros" aria-current="${a==="co"}">🧑‍🤝‍🧑 Compañeros</a></nav>`)}
function renderCompaneros(){if(!S.esAdmin)return `<div class="sheet"><b>Esto es solo para el administrador.</b></div>`;
  const us=S.amigos||{},bl=S.bloqueos||{},L=Object.keys(us).filter(id=>id!==S.uid).sort((a,b)=>(us[b].visto||0)-(us[a].visto||0));
  return `<div class="vista"><button class="back" data-go="resumen">← Inicio</button><section class="sheet"><header><h2>🧑‍🤝‍🧑 Compañeros</h2><span class="note">${L.length} en la clase · ${L.filter(id=>enLinea(us[id])).length} conectados ahora</span></header>
   <ul class="co-l">${L.map(id=>{const u=us[id],p=(S.rank||{})[id]||{},b=bl[id]||{},marcas=[u.baneado?"🚫 Expulsado":"",b.chat?"🔇 Sin chat":"",b.privados?"🔇 Sin privados":""].filter(Boolean);
     return `<li class="co-it" data-perfil="${esc(id)}" role="button" tabindex="0">${avatar(id,44)}<div class="co-t"><b>${esc(nombreDe(id)||"Sin nombre")}</b><span class="${enLinea(u)?"on":""}">${enLinea(u)?"● conectado ahora":"última vez "+new Date(u.visto||0).toLocaleDateString("es-ES")}</span>${marcas.length?`<span class="co-m">${marcas.join(" · ")}</span>`:""}</div><div class="co-p"><b>${puntosHoy(p)}</b><small>hoy</small></div><div class="co-p"><b>${puntosSemana(p)}</b><small>semana</small></div></li>`}).join("")||'<li class="empty">Todavía no ha entrado nadie.</li>'}</ul>
   <p class="note" style="margin:0">Toca a alguien para ver su perfil, escribirle, bloquearle acciones o expulsarle.</p></section></div>`}
function renderNovedades(){if(!S.uid)return "";const lim=Date.now()-14*864e5;
  const L=[...((window.AP&&AP.lista)||[]).map(x=>["apuntes",{...x,pub:x.aprobadoT,nota:"de "+(nombreDe(x.autor)||"un compañero")}]),...S.recursos.map(x=>["recursos",x]),...S.examenes.map(x=>["examenes",x]),...S.temas.map(x=>["temas",x])].filter(([,x])=>x.pub&&x.pub>lim).sort((a,b)=>b[1].pub-a[1].pub).slice(0,6);
  if(!L.length)return "";
  return `<section class="recos novs" aria-label="Novedades"><h2 class="recos-t">📌 Novedades de la clase</h2><div class="nov-l">${L.map(([t,x])=>{const que=t==="apuntes"?"📚 Apuntes de la clase":t==="recursos"?(x.url&&x.url.startsWith("apuntes/")?"Apuntes":"Material"):t==="examenes"?"Examen":"Tema";
    const href=t==="apuntes"?"#apunte-"+x.id:t==="recursos"?x.url:t==="examenes"?"#"+x.asig:"#"+x.asig;
    return `<a class="nov" href="${esc(href||"#"+x.asig)}"><span class="nov-c">${que} · ${esc(NOM[x.asig]||x.asig)}${t==="examenes"&&x.fecha?" · "+fechaSem(x.fecha):""}</span><b>${esc(x.titulo)}</b>${x.nota||x.alcance?`<span class="nov-d">${esc(x.nota||x.alcance)}</span>`:""}<span class="nov-go" aria-hidden="true">→</span></a>`}).join("")}</div></section>`}
function renderRecos(){if(!S.uid)return "";
  const ex=S.examenes.filter(e=>!e.hecho&&e.fecha&&dias(e.fecha)>=0&&dias(e.fecha)<=7&&e.asig!=="global").sort((a,b)=>a.fecha.localeCompare(b.fecha)).slice(0,3);
  if(!ex.length)return "";const mio=(S.rank||{})[S.uid]||{};
  const tarjetas=ex.map(e=>{const d=dias(e.fecha),ts=temasDe(e).map(t=>t.id);
    const rec=S.recursos.filter(r=>r.asig===e.asig&&r.url&&ts.includes(r.tema)).sort((a,b)=>(b.app?1:0)-(a.app?1:0));if(!rec.length)return "";
    const apps=rec.filter(r=>r.app).map(r=>({r,p:Math.round(pctApp(mio,r.app)*100)}));
    const peor=apps.slice().sort((a,b)=>a.p-b.p)[0];
    const cuando=d===0?"Hoy":d===1?"Mañana":`En ${d} días`;
    const consejo=peor?(peor.p>=90?"¡Lo llevas genial! Repasa un poco para no olvidarlo.":`Te recomendamos empezar por <b>${esc(peor.r.titulo.split(" · ")[0])}</b>: es donde menos llevas (${peor.p}%).`):"Repasa el material antes del examen.";
    return `<article class="reco ${d<=1?"urge":""}"><div class="reco-h"><span class="reco-i" aria-hidden="true">📣</span><div><span class="reco-c">${cuando} · ${esc(NOM[e.asig]||e.asig)}</span><b>${esc(e.titulo)}</b></div></div>
      <p class="reco-t">${consejo}</p>
      <div class="reco-l">${rec.map(r=>{const a=r.app?Math.round(pctApp(mio,r.app)*100):null;
        return `<a class="reco-a${a==null?" sin":""}" href="${esc(r.url)}"><span class="reco-n">${esc(r.titulo)}</span>${a!=null?`<span class="reco-p"><i style="width:${a}%"></i></span><span class="reco-v">${a}%</span>`:`<span class="reco-v">Abrir</span>`}<span class="reco-go" aria-hidden="true">→</span></a>`}).join("")}</div></article>`}).join("");
  return tarjetas?`<section class="recos" aria-label="Recomendaciones"><h2 class="recos-t">Recomendaciones para ti</h2><div class="recos-g">${tarjetas}</div></section>`:""}
function renderResumen(){
  const tiles=ASIG.map(a=>{const t=S.temas.filter(x=>x.asig===a.id),p=progreso(t.filter(x=>x.tri===triActual()));
    const pe=S.examenes.filter(e=>e.asig===a.id&&!e.hecho&&e.fecha&&dias(e.fecha)>=0).sort((x,y)=>x.fecha.localeCompare(y.fecha))[0];
    const sub=pe?(dias(pe.fecha)===0?"Examen hoy":dias(pe.fecha)===1?"Examen mañana":`Examen en ${dias(pe.fecha)} días`):`${t.length} tema${t.length===1?"":"s"}`;
    const urg=pe&&dias(pe.fecha)<5;
    return `<button class="tile ${urg?"urge":""}" data-a="${a.id}" data-go="${a.id}"><b>${esc(a.n)}</b><span class="cuando">${sub}</span><span class="tb" aria-hidden="true"><i style="width:${p==null?0:Math.round(p*100)}%"></i></span></button>`}).join("");
  return `<div class="home">${S.uid?"":`<div class="aviso-cuenta"><span>🔒 Estás viendo 1 BACH sin cuenta. <b>Para acceder a los contenidos, inicia sesión con Google.</b></span><button class="btn-p" data-login style="--cf:var(--accent)">Entrar con Google</button></div>`}<div class="amibar"><div class="amis"><button class="amigos-btn" data-go="amigos">👥 Amigos y ranking${S.conectados?` · <b>${S.conectados}</b> conectado${S.conectados===1?"":"s"}`:""}${renderLider()}</button><a class="amigos-btn" href="#apuntes">📚 Apuntes${window.AP&&S.esAdmin&&AP.pend.length?`<span class="badge">${AP.pend.length}</span>`:""}</a><button class="amigos-btn chat-btn" data-go="chat" aria-label="Chat${S.sinLeer?`, ${S.sinLeer} mensajes nuevos`:""}">${bloqueado("chat")?"🔒":"💬"} Chat${S.mencNuevas?`<span class="badge-m" title="Te han mencionado">@</span>`:""}${(S.sinLeer||0)+(S.sinLeerPriv||0)?`<span class="badge">${(S.sinLeer||0)+(S.sinLeerPriv||0)>99?"99+":(S.sinLeer||0)+(S.sinLeerPriv||0)}</span>`:""}</button></div>${S.uid?`<button class="yo" data-go="perfil" title="Tu perfil">${avatar(S.uid,34)}<span>${esc(nombreDe(S.uid)||"Mi perfil")}</span><b class="mispts">${puntosHoy((S.rank||{})[S.uid])} pts hoy</b></button>`:`<button class="yo" data-login title="Entrar con tu cuenta de Google"><span class="ava av0" style="width:34px;height:34px;font-size:15px">G</span><span>Entrar con Google</span></button>`}</div><nav class="tiles" aria-label="Asignaturas">${tiles}</nav>${renderNovedades()}${renderRecos()}<div class="agenda">${renderCal()}${renderLeyenda()}</div></div>`}

/* ---------- amigos, ranking y perfil ---------- */
