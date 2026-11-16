// 1 BACH · Chat de clase, privados, bloqueos y tarjeta de perfil
// (parte del antiguo script de index.html; los archivos js/ se cargan en orden y comparten las variables)
function renderEntra(r){const t={amigos:"Amigos y ranking",perfil:"Tu perfil",chat:"Chat"}[r]||(AN[r]?AN[r]:"Contenido del curso");
  return `<div class="vista"><button class="back" data-go="resumen">← Inicio</button><section class="sheet entra"><header><h2>${t}</h2></header>
   <p>🔒 Para acceder a los contenidos, inicia sesión con Google. Solo la primera vez: se queda guardado.</p>
   <button class="btn-p" data-login style="--cf:var(--accent);align-self:flex-start">Entrar con Google</button></section></div>`}
const MAXF=3;window.ADJ=window.ADJ||[];
function pintarAdj(){const a=document.getElementById("chatAdj");if(!a)return;a.innerHTML=window.ADJ.map((u,i)=>`<span class="adj"><img src="${u}" alt=""><button type="button" data-quitaadj="${i}" aria-label="Quitar foto">×</button></span>`).join("")}
const ETQ={general:"💬 General",mal:"❌ Pregunta o respuesta mal",fecha:"📅 Fecha mal",noentra:"📚 Qué entra",idea:"💡 Idea"};
const BLQ={chat:"💬 Chat de la clase",privados:"✉️ Mensajes privados"};
function bloqueado(c){return !!((S.bloq||{})[c])}
function avisoBloqueo(c){const m=(S.bloq||{}).motivo;return `<div class="bloq-c"><span class="bloq-i">🔇</span><b>El administrador te ha bloqueado ${c==="chat"?"el chat de la clase":"los mensajes privados"}.</b>${m?`<p>${esc(m)}</p>`:""}<span class="note">Si crees que es un error, habla con él.</span></div>`}
function tabsChat(){const p=S.sinLeerPriv||0,g=route()==="chat"?0:(S.sinLeer||0),r=route();
  return `<div class="ctabs2" id="ctabs2" role="tablist"><button data-go="chat" aria-pressed="${r==="chat"}">👥 Clase${S.mencNuevas&&r!=="chat"?`<span class="badge-m">@</span>`:""}${g?`<span class="badge">${g}</span>`:""}</button><button data-go="privados" aria-pressed="${r!=="chat"}">🔒 Privados${p?`<span class="badge">${p}</span>`:""}</button></div>`}
function pintarTabsChat(){const t=document.getElementById("ctabs2");if(t)t.outerHTML=tabsChat()}
function renderChat(){
  return `<div class="vista chatv"><button class="back" data-go="resumen">← Inicio</button>${tabsChat()}
   <section class="sheet"><header><h2>Chat de la clase</h2><span class="note">Lo leen todos los que han entrado</span></header>
   <p class="note" style="margin:0">Avisa aquí si una pregunta está mal, si algo no entra en el examen o si una fecha no es la buena.</p>
   ${bloqueado("chat")?avisoBloqueo("chat")+"</section></div>":`<div class="chatlist" id="chatlist"><div class="empty">Cargando mensajes…</div></div>
   <form class="chatform" id="chatform" data-ruta="chat"><select id="chatTag" aria-label="Tipo de mensaje">${Object.entries(ETQ).map(([k,v])=>`<option value="${k}">${v}</option>`).join("")}</select>
     <div class="chatadj" id="chatAdj"></div>
     <div class="menc-box" id="menc" hidden></div><div class="chatin"><button class="clip" type="button" data-adjuntar title="Adjuntar fotos (hasta ${MAXF})" aria-label="Adjuntar fotos">📷</button><textarea id="chatTxt" rows="2" maxlength="800" placeholder="Escribe un mensaje para la clase… (usa @ para mencionar a alguien)"></textarea><button class="btn-p" style="--cf:var(--accent)" type="submit">Enviar</button></div>
     <p class="note" style="margin:0">Puedes adjuntar hasta ${MAXF} fotos por mensaje; se reducen solas para que no pesen.</p></form>
   </section></div>`}`}
function horaChat(t){const d=new Date(t),h=new Date();const mismo=d.toDateString()===h.toDateString();
  return (mismo?"":d.toLocaleDateString("es-ES",{day:"numeric",month:"short"})+" · ")+d.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}
function pintarChat(abajo){const L=document.getElementById("chatlist");if(!L)return;const priv=route().startsWith("privado-"),ms=(priv?S.privMsgs:S.chat)||[];
  const pegado=abajo||L.scrollHeight-L.scrollTop-L.clientHeight<60;
  if(priv&&S.privError){L.innerHTML=`<div class="empty">${esc(S.privError)}</div>`;return}
  if(!priv&&S.chatError){L.innerHTML=`<div class="empty">${esc(S.chatError)}</div>`;return}
  L.innerHTML=ms.length?ms.map(m=>{const yo=m.uid===S.uid;
    return `<div class="msg ${yo?"mio":""} ${(m.menc||[]).includes(S.uid)?"mencionado":""} ${m.tag&&m.tag!=="general"?"t-"+esc(m.tag):""}"><button class="ava-b" data-perfil="${esc(m.uid)}" aria-label="Ver perfil">${avatar(m.uid,32)}</button><div class="bur"><div class="mh"><b class="nombre-b" data-perfil="${esc(m.uid)}">${esc(nombreDe(m.uid)||m.nombre||"Alguien")}</b><span>${horaChat(m.t||0)}</span>${m.tag&&m.tag!=="general"?`<em>${esc(ETQ[m.tag]||"")}</em>`:""}</div>${m.texto?`<p>${conMenciones(m.texto,m.menc)}</p>`:""}${Array.isArray(m.fotos)&&m.fotos.length?`<div class="mfotos">${m.fotos.filter(u=>/^data:image\/(jpeg|png|webp);base64,/.test(u)).map(u=>`<img src="${u}" alt="Foto" loading="lazy" data-verfoto>`).join("")}</div>`:""}${yo||(S.esAdmin&&!priv)?`<button class="mdel" data-delmsg="${esc(m.id)}">Borrar</button>`:""}${!yo&&!priv?`<button class="mrep" data-reportar="${esc(m.uid)}" data-msgtxt="${esc((m.texto||"").slice(0,200))}">🚩 Reportar</button>`:""}</div></div>`}).join(""):'<div class="empty">Todavía no hay mensajes. Escribe el primero.</div>';
  if(pegado)L.scrollTop=L.scrollHeight;
  if(ms.length&&!priv){try{localStorage.setItem("chatVisto",String(ms[ms.length-1].t||0))}catch(e){}S.sinLeer=0;S.mencNuevas=0}
  if(ms.length&&priv&&window.marcarLeido)window.marcarLeido()}

const convId=(a,b)=>[a,b].sort().join("_");
const otroDe=c=>(c.miembros||[]).find(x=>x!==S.uid)||"";
function noLeido(c){const u=c.ultimo||{};return !!u.t&&u.uid!==S.uid&&u.t>((c.leido||{})[S.uid]||0)}
function renderPrivados(){if(bloqueado("privados"))return `<div class="vista chatv"><button class="back" data-go="resumen">← Inicio</button>${tabsChat()}<section class="sheet"><header><h2>Chats privados</h2></header>${avisoBloqueo("privados")}</section></div>`;const cs=(S.privs||[]).filter(c=>c.ultimo&&c.ultimo.t).sort((a,b)=>(b.ultimo.t||0)-(a.ultimo.t||0));
  const ya=new Set(cs.map(otroDe));
  const otros=Object.keys(S.amigos||{}).filter(id=>id!==S.uid&&!(S.amigos[id]||{}).baneado).sort((a,b)=>nombreDe(a).localeCompare(nombreDe(b)));
  return `<div class="vista chatv"><button class="back" data-go="resumen">← Inicio</button>${tabsChat()}
   <section class="sheet"><header><h2>Chats privados</h2><span class="note">Solo los ves tú y la otra persona</span></header>
   <div class="convs">${cs.length?cs.map(c=>{const o=otroDe(c),u=c.ultimo||{},nl=noLeido(c);
     return `<a class="conv ${nl?"nl":""}" href="#privado-${esc(o)}">${avatar(o,44)}<span class="conv-t"><b>${esc(nombreDe(o)||"Alguien")}</b><span>${u.uid===S.uid?"Tú: ":""}${esc(u.texto||"")}</span></span><span class="conv-h">${horaChat(u.t)}${nl?'<i class="punto" aria-label="Sin leer"></i>':""}</span></a>`}).join(""):'<div class="empty">Todavía no tienes chats privados. Empieza uno con alguien de la clase.</div>'}</div></section>
   <section class="sheet"><header><h2>Empezar un chat</h2><span class="note">Toca a alguien para ver su perfil y escribirle</span></header>
   <div class="gente">${otros.length?otros.map(id=>`<button class="persona" data-perfil="${esc(id)}">${avatar(id,52)}<span>${esc((nombreDe(id)||"Alguien").split(" ")[0])}</span>${ya.has(id)?"":""}${enLinea((S.amigos||{})[id])?'<i class="on-dot" aria-label="Conectado"></i>':""}</button>`).join(""):'<div class="empty">Aún no ha entrado nadie más.</div>'}</div></section></div>`}
function renderPrivado(o){if(bloqueado("privados"))return renderPrivados();const n=nombreDe(o)||"Alguien",u=(S.amigos||{})[o];
  return `<div class="vista chatv"><button class="back" data-go="privados">← Privados</button>
   <section class="sheet"><header class="priv-h"><button class="priv-p" data-perfil="${esc(o)}">${avatar(o,40)}<span><b>${esc(n)}</b><small class="${enLinea(u)?"on":""}">${enLinea(u)?"● conectado ahora":"chat privado"}</small></span></button></header>
   <div class="chatlist" id="chatlist"><div class="empty">Cargando mensajes…</div></div>
   <form class="chatform" id="chatform" data-ruta="privado-${esc(o)}">
     <div class="chatadj" id="chatAdj"></div>
     <div class="chatin"><button class="clip" type="button" data-adjuntar title="Adjuntar fotos (hasta ${MAXF})" aria-label="Adjuntar fotos">📷</button><textarea id="chatTxt" rows="2" maxlength="800" placeholder="Escribe a ${esc(n.split(" ")[0])}…"></textarea><button class="btn-p" style="--cf:var(--accent)" type="submit">Enviar</button></div></form>
   </section></div>`}
// tarjeta de perfil de cualquiera (foto grande, puntos y mensaje privado)
function abrirPerfil(id){if(!id)return;const lista=clasificacion("hoy"),pos=lista.findIndex(x=>x.id===id),p=(S.rank||{})[id]||{},u=(S.amigos||{})[id]||{},f=fotoDe(id),n=nombreDe(id)||"Alguien";
  $("#pfm").innerHTML=`<div class="pfm-c" role="dialog" aria-modal="true" aria-label="Perfil de ${esc(n)}"><button class="pfm-x" data-pfmcerrar aria-label="Cerrar">← Volver</button>
    ${f?`<img class="pfm-f" src="${esc(f)}" alt="" referrerpolicy="no-referrer" data-verfoto>`:`<span class="pfm-f av0">${esc(n[0].toUpperCase())}</span>`}
    <h2>${esc(n)}${id===S.uid?" (tú)":""}</h2>${window.AP?AP.nivelHTML(id):""}<span class="pfm-on ${enLinea(u)?"on":""}">${enLinea(u)?"● conectado ahora":"última vez "+new Date(u.visto||0).toLocaleDateString("es-ES")}</span>
    <div class="pfm-n"><span><b>${puntosHoy(p)}</b><small>puntos hoy</small></span><span><b>${puntosSemana(p)}</b><small>esta semana</small></span><span><b>${pos<0?"—":pos+1+"º"}</b><small>hoy en la clase</small></span></div>
    ${barrasApps(p)}
    ${id===S.uid?`<button class="btn-sec" data-go="perfil" data-pfmcerrar>Ir a mi perfil</button>`:`${bloqueado("privados")?"":`<button class="btn-p" style="--cf:var(--accent)" data-privado="${esc(id)}">💬 Enviar mensaje privado</button>`}<button class="btn-sec" data-reportar="${esc(id)}">🚩 Reportar</button>`}
    ${S.esAdmin&&id!==S.uid?(()=>{const b=(S.bloqueos||{})[id]||{},act=Object.keys(BLQ).filter(k=>b[k]);return `${act.length?`<span class="bloq-tag">🔇 Bloqueado: ${act.map(k=>BLQ[k]).join(", ")}</span>`:""}<button class="btn-sec" data-bloquear="${esc(id)}">🔇 Bloquear acciones…</button>`})():""}
    ${S.esAdmin&&id!==S.uid?(u.baneado?`<button class="btn-sec" data-readmitir="${esc(id)}">✅ Readmitir</button>`:`<button class="btn-p" style="--cf:#d4231c" data-expulsar="${esc(id)}">🚫 Expulsar</button>`):""}</div>`;
  $("#pfm").hidden=false;history.pushState({modal:"p"},"")}
function cerrarPerfil(pop){if($("#pfm").hidden)return;if(pop!==true&&history.state&&history.state.modal==="p"){history.back();return}$("#pfm").hidden=true;$("#pfm").innerHTML=""}

