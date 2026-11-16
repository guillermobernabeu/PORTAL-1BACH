// 1 BACH · Modo administrador, menciones con @, reportar y expulsar
// (parte del antiguo script de index.html; los archivos js/ se cargan en orden y comparten las variables)
// ---------- modo administrador: editar, borrar y añadir exámenes y materiales ----------
const ADM_CAMPOS={temas:[["asig","Asignatura","asig"],["tri","Trimestre","tri"],["titulo","Título del tema","text"],["nota","Nota (qué entra, páginas…)","area"]],examenes:[["asig","Asignatura","asig"],["titulo","Título","text"],["fecha","Fecha","date"],["alcance","Qué entra","area"],["horas","Horas de estudio (aprox.)","num"],["hecho","Ya hecho","check"]],
  recursos:[["asig","Asignatura","asig"],["tri","Trimestre","tri"],["tema","Tema","tema"],["titulo","Título","text"],["nota","Descripción corta","text"],["url","Enlace (https://… o carpeta del portal, p. ej. verbos/)","text"]]};
function admDecorar(){document.querySelectorAll(".admx,.adm-bar").forEach(x=>x.remove());if(!S.admin)return;
  const pon=(sel,tipo,attr)=>document.querySelectorAll(sel).forEach(el=>{const id=el.getAttribute(attr);const b=document.createElement("span");b.className="admx";
    b.innerHTML=`${tipo!=="examenes"?`<button type="button" data-admmove="${tipo}:${esc(id)}:-1" title="Subir">↑</button><button type="button" data-admmove="${tipo}:${esc(id)}:1" title="Bajar">↓</button>`:""}<button type="button" data-admedit="${tipo}:${esc(id)}" title="Editar">✏️</button><button type="button" data-admdel="${tipo}:${esc(id)}" title="Borrar para todos">🗑</button>`;el.append(b)});
  pon("[data-exid]","examenes","data-exid");pon("[data-rid]","recursos","data-rid");document.querySelectorAll("[data-tid] > .body > b").forEach(b=>{const t=b.closest("[data-tid]");if(t.querySelector(":scope > .admx"))return;const x=document.createElement("span");x.className="admx admx-t";const id=t.dataset.tid;x.innerHTML=`<button type="button" data-admmove="temas:${esc(id)}:-1" title="Subir tema">↑</button><button type="button" data-admmove="temas:${esc(id)}:1" title="Bajar tema">↓</button><button type="button" data-admedit="temas:${esc(id)}">✏️</button><button type="button" data-admdel="temas:${esc(id)}">🗑</button>`;t.append(x)});
  const f=document.querySelector("#ficha .ficha");if(f&&fichaActual){const b=document.createElement("div");b.className="admx admx-f";b.innerHTML=`<button type="button" data-admedit="examenes:${esc(fichaActual.id)}">✏️ Editar examen</button><button type="button" data-admdel="examenes:${esc(fichaActual.id)}">🗑 Borrar examen</button>`;f.insertBefore(b,f.children[1]||null)}
  const v=$("#view");if(v&&!v.querySelector(".adm-bar")){const nb=(S.borradosEx||[]).length+(S.borradosRec||[]).length+(S.borradosTem||[]).length;const bar=document.createElement("div");bar.className="adm-bar";
    bar.innerHTML=`<b>🛠 Administrador</b><span>Lo que cambies lo ven todos al momento.</span><button type="button" data-admnew="examenes">+ Añadir examen</button><button type="button" data-admnew="recursos">+ Añadir material</button><button type="button" data-admnew="temas">+ Añadir tema</button><button type="button" data-admreportes>🚩 Reportes${(S.reportes||[]).length?` (${S.reportes.length})`:""}</button><button type="button" data-admexpulsados>🚫 Expulsados y bloqueos</button>${nb?`<button type="button" data-admpapelera>🗑 Borrados (${nb})</button>`:""}`;v.prepend(bar)}}
function admMover(tipo,id,dir){const L=admLista(tipo),o=L.find(x=>x.id===id);if(!o)return;
  const her=L.filter(x=>x.asig===o.asig&&x.tri===o.tri&&(tipo==="temas"||(x.tema||"")===(o.tema||""))).sort((a,b)=>(a.orden??999)-(b.orden??999)||0);
  const i=her.indexOf(o),j=i+Number(dir);if(j<0||j>=her.length){toast(dir<0?"Ya está el primero.":"Ya está el último.");return}
  [her[i],her[j]]=[her[j],her[i]];const mapa={};her.forEach((x,k)=>mapa[x.id]={orden:k});
  window.guardarCambios(tipo,mapa).then(()=>toast("Movido.")).catch(e=>toast("No se ha podido mover ("+(e.code||"error")+")."))}
function admModal(html){$("#adm").innerHTML=`<div class="adm-c" role="dialog" aria-modal="true">${html}</div>`;$("#adm").hidden=false;$("#adm").querySelector("input,select,textarea,button")?.focus()}
function admCerrar(){$("#adm").hidden=true;$("#adm").innerHTML=""}
const admLista=t=>t==="examenes"?S.examenes:t==="temas"?S.temas:S.recursos;
function admForm(tipo,id){const nuevo=!id,o=nuevo?{asig:route()!=="resumen"&&AN[route()]?route():"ingles",tri:triActual(),hecho:false}:admLista(tipo).find(x=>x.id===id)||{};
  const temasDe2=a=>S.temas.filter(t=>t.asig===a);
  const campo=([k,l,t])=>{const v=o[k]??"";
    if(t==="asig")return `<label>${l}<select name="${k}">${[...ASIG.map(a=>[a.id,a.n]),...(tipo==="examenes"?[["global","Globales"]]:[])].map(([i,n])=>`<option value="${i}" ${i===v?"selected":""}>${esc(n)}</option>`).join("")}</select></label>`;
    if(t==="tri")return `<label>${l}<select name="${k}">${[1,2,3].map(n=>`<option value="${n}" ${n==v?"selected":""}>${n}.º</option>`).join("")}</select></label>`;
    if(t==="tema")return `<label>${l}<select name="${k}"><option value="">(sin tema)</option>${temasDe2(o.asig||"ingles").map(x=>`<option value="${esc(x.id)}" ${x.id===v?"selected":""}>${esc(x.titulo)}</option>`).join("")}</select></label>`;
    if(t==="area")return `<label>${l}<textarea name="${k}" rows="3">${esc(v)}</textarea></label>`;
    if(t==="check")return `<label class="chk"><input type="checkbox" name="${k}" ${v?"checked":""}> ${l}</label>`;
    return `<label>${l}<input name="${k}" type="${t==="num"?"number":t==="date"?"date":"text"}" ${t==="num"?'step="0.5" min="0"':""} value="${esc(v)}"></label>`};
  admModal(`<h2>${nuevo?"Añadir":"Editar"} ${tipo==="examenes"?"examen":tipo==="temas"?"tema":"material"}</h2><form id="admForm" data-tipo="${tipo}" data-id="${esc(id||"")}">${ADM_CAMPOS[tipo].map(campo).join("")}
    <div class="adm-b"><button type="submit" class="btn-p" style="--cf:var(--accent)">Guardar</button><button type="button" class="btn-sec" data-admcerrar>Cancelar</button></div></form>`)}
async function admGuardar(form){const tipo=form.dataset.tipo,id=form.dataset.id||("n"+Date.now().toString(36)),c={};
  for(const [k,,t] of ADM_CAMPOS[tipo]){const el=form.elements[k];if(!el)continue;c[k]=t==="check"?el.checked:t==="num"?(el.value===""?null:Number(el.value)):t==="tri"?Number(el.value):el.value.trim()}
  if(!c.titulo){toast("Pon un título.");return}
  if(tipo==="recursos"&&c.url&&!/^https:\/\//.test(c.url)&&!/^[a-z0-9-]+\/([a-z0-9-]+\.html)?$/.test(c.url)){toast("El enlace tiene que empezar por https:// o ser una carpeta del portal (p. ej. verbos/).");return}
  if(!form.dataset.id)c.nuevo=true;c.borrado=false;
  try{await window.guardarCambio(tipo,id,c);admCerrar();toast("Guardado. Ya lo ven todos.")}catch(e){toast("No se ha podido guardar ("+(e.code||"error")+").")}}
document.addEventListener("click",ev=>{if(!ev.target.closest)return;
  const mv=ev.target.closest("[data-admmove]");if(mv){ev.preventDefault();ev.stopImmediatePropagation();admMover(...mv.dataset.admmove.split(":"));return}
  const ed=ev.target.closest("[data-admedit]"),dl=ev.target.closest("[data-admdel]"),nw=ev.target.closest("[data-admnew]"),pp=ev.target.closest("[data-admpapelera]"),rs=ev.target.closest("[data-admrest]");
  if(ev.target.closest("[data-admcerrar]")||ev.target.id==="adm"){ev.preventDefault();admCerrar();return}
  if(!ed&&!dl&&!nw&&!pp&&!rs)return;ev.preventDefault();ev.stopImmediatePropagation();
  if(ed){const [t,id]=ed.dataset.admedit.split(":");admForm(t,id);return}
  if(nw){admForm(nw.dataset.admnew,null);return}
  if(dl){const [t,id]=dl.dataset.admdel.split(":");const o=admLista(t).find(x=>x.id===id)||{};
    admModal(`<h2>¿Borrar ${t==="examenes"?"el examen":t==="temas"?"el tema":"el material"}?</h2><p>«${esc(o.titulo||id)}» desaparecerá para todos. Lo puedes recuperar luego en «Borrados».</p><div class="adm-b"><button type="button" class="btn-p" style="--cf:#d4231c" data-admok="${t}:${esc(id)}">Sí, borrar</button><button type="button" class="btn-sec" data-admcerrar>Cancelar</button></div>`);return}
  if(pp){const fila=(t,x)=>`<li><span>${t==="examenes"?"📅":t==="temas"?"📚":"📎"} ${esc(x.titulo||x.id)}</span><button type="button" data-admrest="${t}:${esc(x.id)}">Recuperar</button></li>`;
    admModal(`<h2>Borrados</h2><ul class="adm-l">${(S.borradosEx||[]).map(x=>fila("examenes",x)).join("")}${(S.borradosRec||[]).map(x=>fila("recursos",x)).join("")}${(S.borradosTem||[]).map(x=>fila("temas",x)).join("")}</ul><div class="adm-b"><button type="button" class="btn-sec" data-admcerrar>Cerrar</button></div>`);return}
  if(rs){const [t,id]=rs.dataset.admrest.split(":");window.guardarCambio(t,id,{borrado:false}).then(()=>{rs.closest("li").remove();toast("Recuperado.")}).catch(()=>toast("No se ha podido."));return}
},true);
document.addEventListener("click",ev=>{const ok=ev.target.closest&&ev.target.closest("[data-admok]");if(!ok)return;ev.stopImmediatePropagation();const [t,id]=ok.dataset.admok.split(":");
  window.guardarCambio(t,id,{borrado:true}).then(()=>{admCerrar();if(fichaActual&&fichaActual.id===id)cerrarFicha();toast("Borrado.")}).catch(e=>toast("No se ha podido borrar ("+(e.code||"error")+")."))},true);
document.addEventListener("submit",ev=>{if(ev.target.id!=="admForm")return;ev.preventDefault();admGuardar(ev.target)});
document.addEventListener("change",ev=>{if(ev.target.form&&ev.target.form.id==="admForm"&&ev.target.name==="asig"){const sel=ev.target.form.elements.tema;if(sel)sel.innerHTML=`<option value="">(sin tema)</option>`+S.temas.filter(t=>t.asig===ev.target.value).map(x=>`<option value="${esc(x.id)}">${esc(x.titulo)}</option>`).join("")}});

// ---------- menciones con @ ----------
function miembros(){return Object.keys(S.amigos||{}).filter(id=>!(S.amigos[id]||{}).baneado).map(id=>({id,n:nombreDe(id)||""})).filter(x=>x.n)}
function conMenciones(t,menc){let h=esc(t);if(!menc||!menc.length)return h;
  const ns=menc.map(id=>({id,n:nombreDe(id)})).filter(x=>x.n).sort((a,b)=>b.n.length-a.n.length);
  for(const x of ns){const k="@"+esc(x.n);h=h.split(k).join(`<span class="menc ${x.id===S.uid?"yo":""}" data-perfil="${esc(x.id)}">${k}</span>`)}return h}
function sacarMenciones(t){const out=[];let low=t.toLowerCase();const re=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  for(const x of miembros().sort((a,b)=>b.n.length-a.n.length)){const r=new RegExp("@"+re(x.n.toLowerCase())+"(?=$|[\\s.,;:!?¡¿)])","g");if(r.test(low)){if(!out.includes(x.id))out.push(x.id);low=low.replace(r,m=>" ".repeat(m.length))}}return out.slice(0,20)}
function sugerir(ta){const box=document.getElementById("menc");if(!box)return;const pos=ta.selectionStart,antes=ta.value.slice(0,pos),m=antes.match(/@([^\s@]{0,20})$/);
  if(!m){box.hidden=true;return}const q=m[1].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
  const L=miembros().filter(x=>x.id!==S.uid&&x.n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").split(/\s+/).some(w=>w.startsWith(q))).slice(0,6);
  if(!L.length){box.hidden=true;return}
  box.innerHTML=L.map((x,i)=>`<button type="button" class="${i===0?"sel":""}" data-mencid="${esc(x.id)}">${avatar(x.id,24)}<span>${esc(x.n)}</span></button>`).join("");box.hidden=false}
function ponerMencion(id){const ta=document.getElementById("chatTxt");if(!ta)return;const pos=ta.selectionStart,antes=ta.value.slice(0,pos).replace(/@([^\s@]{0,20})$/,"@"+nombreDe(id)+" "),despues=ta.value.slice(pos);
  ta.value=antes+despues;ta.focus();ta.setSelectionRange(antes.length,antes.length);document.getElementById("menc").hidden=true}

// ---------- reportar y expulsar ----------
function cerrarPfm(){if(!$("#pfm").hidden){$("#pfm").hidden=true;$("#pfm").innerHTML=""}}
document.addEventListener("click",ev=>{if(!ev.target.closest)return;
  const bq=ev.target.closest("[data-bloquear]"),qb=ev.target.closest("[data-desbloquear]");
  if(bq){ev.preventDefault();ev.stopImmediatePropagation();const id=bq.dataset.bloquear,b=(S.bloqueos||{})[id]||{};cerrarPfm();
    admModal(`<h2>🔇 Bloquear a ${esc(nombreDe(id)||"esta persona")}</h2><p>Marca lo que no podrá usar. Lo demás del portal le sigue funcionando.</p><form id="bloqForm" data-u="${esc(id)}">${Object.entries(BLQ).map(([k,v])=>`<label class="bloq-op"><input type="checkbox" name="${k}" ${b[k]?"checked":""}> ${v}</label>`).join("")}<label class="rep-l">Mensaje que verá (opcional)<textarea name="motivo" rows="2" maxlength="300">${esc(b.motivo||"")}</textarea></label><div class="adm-b"><button type="submit" class="btn-p" style="--cf:#d4231c">Guardar</button><button type="button" class="btn-sec" data-admcerrar>Cancelar</button></div></form>`);return}
  if(qb){ev.preventDefault();ev.stopImmediatePropagation();window.guardarBloqueo(qb.dataset.desbloquear,{}).then(()=>{qb.closest("li")?.remove();toast("Desbloqueado.")}).catch(e=>toast("No se ha podido ("+(e.code||"error")+")."));return}
  const rp=ev.target.closest("[data-reportar]"),ex=ev.target.closest("[data-expulsar]"),ra=ev.target.closest("[data-readmitir]"),lr=ev.target.closest("[data-admreportes]"),le=ev.target.closest("[data-admexpulsados]"),dr=ev.target.closest("[data-descartar]");
  if(!rp&&!ex&&!ra&&!lr&&!le&&!dr)return;ev.preventDefault();ev.stopImmediatePropagation();
  if(rp){const id=rp.dataset.reportar,txt=rp.dataset.msgtxt||"";cerrarPfm();
    admModal(`<h2>🚩 Reportar a ${esc(nombreDe(id)||"esta persona")}</h2><p>Solo lo verá el administrador.</p>${txt?`<p class="rep-msg">«${esc(txt)}»</p>`:""}<form id="repForm" data-a="${esc(id)}" data-msg="${esc(txt)}"><label class="rep-l">¿Qué ha pasado?<textarea name="motivo" rows="3" maxlength="400" required></textarea></label><div class="adm-b"><button type="submit" class="btn-p" style="--cf:#d4231c">Enviar reporte</button><button type="button" class="btn-sec" data-admcerrar>Cancelar</button></div></form>`);return}
  if(ex){const id=ex.dataset.expulsar;cerrarPfm();
    admModal(`<h2>🚫 Expulsar a ${esc(nombreDe(id)||"esta persona")}</h2><p>No podrá entrar en 1 BACH. Verá este mensaje en el centro de la pantalla:</p><form id="banForm" data-u="${esc(id)}"><label class="rep-l">Mensaje<textarea name="motivo" rows="3" maxlength="300">Has sido expulsado de 1 BACH.</textarea></label><div class="adm-b"><button type="submit" class="btn-p" style="--cf:#d4231c">Expulsar</button><button type="button" class="btn-sec" data-admcerrar>Cancelar</button></div></form>`);return}
  if(ra){const id=ra.dataset.readmitir;window.readmitir(id).then(()=>{cerrarPfm();admCerrar();toast("Readmitido.")}).catch(e=>toast("No se ha podido ("+(e.code||"error")+")."));return}
  if(lr){const L=S.reportes||[];admModal(`<h2>🚩 Reportes</h2>${L.length?`<ul class="adm-l rep-lista">${L.map(r=>`<li><div><b>${esc(nombreDe(r.de)||"Alguien")}</b> reportó a <b>${esc(nombreDe(r.a)||"alguien")}</b> · ${horaChat(r.t||0)}<p>${esc(r.motivo||"")}</p>${r.msg?`<p class="rep-msg">«${esc(r.msg)}»</p>`:""}</div><div class="adm-b"><button type="button" data-perfil="${esc(r.a)}">Ver perfil</button><button type="button" data-expulsar="${esc(r.a)}">🚫 Expulsar</button><button type="button" data-descartar="${esc(r.id)}">Descartar</button></div></li>`).join("")}</ul>`:'<p>No hay reportes.</p>'}<div class="adm-b"><button type="button" class="btn-sec" data-admcerrar>Cerrar</button></div>`);return}
  if(dr){window.descartarReporte(dr.dataset.descartar).then(()=>dr.closest("li").remove()).catch(()=>toast("No se ha podido."));return}
  if(le){const L=Object.keys(S.amigos||{}).filter(id=>(S.amigos[id]||{}).baneado),B=Object.entries(S.bloqueos||{}).filter(([id,b])=>Object.keys(BLQ).some(k=>b[k]));
    admModal(`<h2>🚫 Expulsados</h2>${L.length?`<ul class="adm-l">${L.map(id=>`<li><span>${esc(nombreDe(id)||id)}</span><button type="button" data-readmitir="${esc(id)}">Readmitir</button></li>`).join("")}</ul>`:'<p>No has expulsado a nadie.</p>'}
    <h2>🔇 Bloqueados</h2>${B.length?`<ul class="adm-l">${B.map(([id,b])=>`<li><span><b>${esc(nombreDe(id)||id)}</b> · ${Object.keys(BLQ).filter(k=>b[k]).map(k=>BLQ[k]).join(", ")}</span><span class="adm-b"><button type="button" data-bloquear="${esc(id)}">Cambiar</button><button type="button" data-desbloquear="${esc(id)}">Quitar</button></span></li>`).join("")}</ul>`:'<p>No has bloqueado nada a nadie.</p>'}<div class="adm-b"><button type="button" class="btn-sec" data-admcerrar>Cerrar</button></div>`);return}
},true);
document.addEventListener("submit",ev=>{const f=ev.target;
  if(f.id==="repForm"){ev.preventDefault();const m=f.elements.motivo.value.trim();if(!m){toast("Escribe qué ha pasado.");return}
    window.reportar(f.dataset.a,m,f.dataset.msg||"").then(()=>{admCerrar();toast("Reporte enviado al administrador.")}).catch(e=>toast("No se ha podido enviar ("+(e.code||"error")+")."))}
  if(f.id==="bloqForm"){ev.preventDefault();const d={};Object.keys(BLQ).forEach(k=>{if(f.elements[k].checked)d[k]=true});const m=f.elements.motivo.value.trim();if(m)d.motivo=m;
    window.guardarBloqueo(f.dataset.u,d).then(()=>{admCerrar();toast(Object.keys(BLQ).some(k=>d[k])?"Bloqueo guardado.":"Desbloqueado.")}).catch(e=>toast("No se ha podido guardar ("+(e.code||"error")+")."))}
  if(f.id==="banForm"){ev.preventDefault();window.expulsar(f.dataset.u,f.elements.motivo.value.trim()||"Has sido expulsado de 1 BACH.").then(()=>{admCerrar();toast("Expulsado.")}).catch(e=>toast("No se ha podido expulsar ("+(e.code||"error")+")."))}});
