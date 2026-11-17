// 1 BACH · Arranque: cuenta obligatoria, render, visor, gráficas, clics globales, splash
// (parte del antiguo script de index.html; los archivos js/ se cargan en orden y comparten las variables)
// Sin cuenta: se ve la pantalla principal, pero cualquier contenido pide entrar con Google
window.pideCuenta=()=>{$("#pide").hidden=false;$("#pide [data-login]").focus()};
document.addEventListener("click",ev=>{if(S.uid||!ev.target.closest)return;
  if(ev.target.closest("[data-login]")){$("#pide").hidden=true;return}
  if(ev.target.closest("[data-pidecerrar]")||ev.target.id==="pide"){$("#pide").hidden=true;ev.stopPropagation();return}
  if(ev.target.closest("#splash"))return;
  const go=ev.target.closest("[data-go]");if(go&&go.dataset.go==="resumen")return;
  const bloq=ev.target.closest("[data-go],[data-a],[data-det],[data-ir],[data-dia],[data-exam],[data-doc],[data-apt],a[href]:not([href^='#'])");
  if(bloq){ev.preventDefault();ev.stopImmediatePropagation();window.pideCuenta()}},true);
addEventListener("keydown",ev=>{if(ev.key==="Escape"&&!$("#pide").hidden)$("#pide").hidden=true;if(ev.key==="Escape"&&!$("#pfm").hidden)cerrarPerfil();if(ev.key==="Enter"&&ev.target.dataset&&ev.target.dataset.perfil&&ev.target.getAttribute("role")==="button")abrirPerfil(ev.target.dataset.perfil)});
document.addEventListener("click",ev=>{const a=ev.target.closest&&ev.target.closest("[data-ocultar]");if(a){ev.preventDefault();ev.stopPropagation();marcarOculto(a.dataset.ocultar,true);return}
  const b=ev.target.closest&&ev.target.closest("[data-restaurar]");if(b){abiertaPap=true;marcarOculto(b.dataset.restaurar,false)}},true);
document.addEventListener("toggle",ev=>{if(ev.target.classList&&ev.target.classList.contains("papelera"))abiertaPap=ev.target.open},true);

function render(){actualizarSplash();const r=route(),v=$("#view");
  {const f=document.getElementById("chatform");if(S.uid&&S.loaded&&f&&f.dataset.ruta===r&&!bloqueado(r==="chat"?"chat":"privados")){pintarChat();pintarTabsChat();return}}
  if(S.error){v.innerHTML=`<div class="sheet"><b>No se ha podido cargar el curso.</b><span class="muted">${esc(S.error)} Abre la página de nuevo en un rato.</span></div>`;return}
  if(!S.loaded){v.innerHTML=`<div class="sheet"><span class="muted">Cargando temas y exámenes…</span></div>`;return}
  v.innerHTML=r==="resumen"?renderResumen():!S.uid&&r!=="resumen"?renderEntra(r):r==="apuntes"||r==="subir-apunte"||r.startsWith("apunte-")?(window.AP?AP.html(r):(cargarApuntes(),'<div class="sheet"><span class="muted">Cargando apuntes…</span></div>')):r.startsWith("prep-")?(window.PR?PR.html(r):(cargarPrep(),'<div class="sheet"><span class="muted">Preparando el examen…</span></div>')):r.startsWith("mipanel")?(!S.esAdmin?'<div class="vista"><button class="back" data-go="resumen">← Inicio</button><div class="sheet"><b>Esto es solo para el administrador.</b></div></div>':window.MP?MP.html(r):(cargarMiPanel(),'<div class="sheet"><span class="muted">Abriendo tu panel…</span></div>')):r==="companeros"?renderCompaneros():r==="amigos"?renderAmigos():r==="perfil"?renderPerfil():r==="chat"?renderChat():r==="privados"?renderPrivados():r.startsWith("privado-")?renderPrivado(r.slice(8)):r.startsWith("practica-")?renderPractica(r.slice(9)):renderAsig(r);filtrarVocab();if(r==="resumen")montarCal();admDecorar();admTabs(r);if(window.PR&&r.startsWith("prep-"))PR.montar();if(window.AP&&(r==="subir-apunte"||r.startsWith("apunte-")))AP.montar(r);if((r==="chat"||r.startsWith("privado-"))&&S.uid){pintarChat(true);pintarAdj()}
  if(enfocar&&r!=="resumen"){const el=document.querySelector(`[data-det="${CSS.escape(enfocar)}"],[data-exam="${CSS.escape(enfocar)}"]`);enfocar=null;
    if(el){el.scrollIntoView({block:"center",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});el.classList.add("flash")}}}


const RESOL={};
const fm=n=>String(+Number(n).toFixed(2)).replace(".",",");
function grafSVG(g){const W=300,H=g.small?200:230,l=g.small?38:42,r=16,t=14,b=g.small?30:36,pw=W-l-r,ph=H-t-b,X=v=>l+v/g.xm*pw,Y=v=>t+ph-v/g.ym*ph,c=g.small?"sm":"";
  let o=`<svg viewBox="0 0 ${W} ${H}" class="gr" role="img" aria-label="${esc(g.a||"Gráfico")}">`;
  if(g.t)o+=`<text x="${l}" y="11" class="${c}" style="font-weight:800">${esc(g.t)}</text>`;
  for(let k=0;k<=4;k++){const xv=g.xm*k/4,yv=g.ym*k/4;
    o+=`<line x1="${X(xv)}" y1="${t}" x2="${X(xv)}" y2="${t+ph}" stroke="#d8c9c0" stroke-width=".6"/><line x1="${l}" y1="${Y(yv)}" x2="${l+pw}" y2="${Y(yv)}" stroke="#d8c9c0" stroke-width=".6"/>`;
    o+=`<text class="ax ${c}" x="${X(xv)}" y="${t+ph+12}" text-anchor="middle" style="font-size:${g.small?11:9}px">${fm(xv)}</text><text class="ax ${c}" x="${l-4}" y="${Y(yv)+3}" text-anchor="end" style="font-size:${g.small?11:9}px">${fm(yv)}</text>`}
  o+=`<path d="M${l} ${t}V${t+ph}H${l+pw}" fill="none" stroke="#7a1010" stroke-width="1.5"/>`;
  (g.H||[]).forEach(([y,lab])=>{o+=`<line x1="${l}" y1="${Y(y)}" x2="${l+pw}" y2="${Y(y)}" stroke="#c4161c" stroke-width="1" stroke-dasharray="4 3"/><text x="${l+pw-2}" y="${Y(y)-3}" text-anchor="end" style="font-size:10px">${esc(lab)}</text>`});
  (g.L||[]).forEach(([x1,y1,x2,y2,lab,st])=>{o+=`<line x1="${X(x1)}" y1="${Y(y1)}" x2="${X(x2)}" y2="${Y(y2)}" stroke="${st==="b"?"#9b8f89":"#d4231c"}" stroke-width="${st==="b"?1.4:2.2}" ${st==="b"?'stroke-dasharray="4 3"':""} stroke-linecap="round"/>`;
    if(lab){const f=lab==="FPP"?.5:.82,lx=x1+(x2-x1)*f,ly=y1+(y2-y1)*f;o+=`<text x="${X(lx)+6}" y="${Y(ly)-6}">${esc(lab)}</text>`}});
  (g.P||[]).forEach(([x,y,lab])=>{o+=`<circle cx="${X(x)}" cy="${Y(y)}" r="3.2" fill="#d4231c"/><text x="${X(x)+5}" y="${Y(y)-5}">${esc(lab)}</text>`});
  if(g.ic){o+=`<text x="${X(g.ic[0])}" y="${t+ph+(g.small?20:12)}" text-anchor="middle" style="font-size:13px">${fm(g.ic[0])}</text><text x="${l+4}" y="${Y(g.ic[1])-3}" style="font-size:13px">${fm(g.ic[1])}</text>`}
  if(g.xs)o+=`<text class="ax" x="${l+pw}" y="${H-3}" text-anchor="end" style="font-size:10px">${esc(g.xs)}</text>`;
  if(g.ys)o+=`<text class="ax" x="${l+4}" y="${t-3}" style="font-size:10px">${esc(g.ys)}</text>`;
  return o+"</svg>"}
function resItem(it){const[k,v,n]=it;
  if(k==="h")return `<h4>${esc(v)}</h4>`;if(k==="t")return `<p>${esc(v)}</p>`;
  if(k==="g")return `<div class="gw" style="width:${v.w||60}%">${grafSVG(v)}</div>`;
  if(k==="gs")return `<div class="gg" style="--n:${n||3}">${v.map(grafSVG).join("")}</div>`;return ""}
function ovHTML(u){const L=RESOL[u];if(!L)return "";
  return L.map(e=>`<button class="rb" type="button" data-res="${e.id}" aria-pressed="false" style="top:${(e.by/18.71).toFixed(2)}%" title="Ver la resolución">✎ Ver</button>`
    +(e.m||[]).map(([x,y,t,c])=>`<span class="mk ${c||""}" data-resx="${e.id}" style="left:${(x/13.23).toFixed(2)}%;top:${(y/18.71).toFixed(2)}%">${esc(t)}</span>`).join("")
    +`<div class="rc" data-resx="${e.id}" data-top="${(e.cy/18.71).toFixed(2)}" style="top:${(e.cy/18.71).toFixed(2)}%"><span class="cbx">Bernabéu · resolución</span>${e.c.map(resItem).join("")}</div>`).join("")}
document.addEventListener("click",ev=>{const b=ev.target.closest&&ev.target.closest(".rb");if(!b)return;
  const pg=b.closest(".pg"),id=b.dataset.res,abre=b.getAttribute("aria-pressed")!=="true";
  pg.querySelectorAll(".rb").forEach(x=>{const on=abre&&x===b;x.setAttribute("aria-pressed",on);x.textContent=on?"✕":"✎ Ver"});
  pg.querySelectorAll("[data-resx]").forEach(el=>el.classList.toggle("on",abre&&el.dataset.resx===id));
  if(abre){const c=pg.querySelector(`.rc[data-resx="${id}"]`);if(c){const H=pg.offsetHeight,ini=c.dataset.top;c.style.top=ini+"%";
    const fin=c.offsetTop+c.offsetHeight;if(fin>H*.985){c.style.top=Math.max(1,(c.offsetTop-(fin-H*.985))/H*100)+"%"}
    setTimeout(()=>c.scrollIntoView({block:"nearest",behavior:"smooth"}),30)}}});
function abrirVisor(titulo,meta,p){
  $("#vtitle").textContent=titulo;$("#vmeta").textContent=meta;
  $("#vpages").innerHTML=p.map((u,i)=>`<figure><div class="pg"><img src="${esc(u)}" alt="Página ${i+1}" loading="${i<2?"eager":"lazy"}">${ovHTML(u)}</div><figcaption>${i+1} de ${p.length}</figcaption></figure>`).join("");
  if(p.some(u=>RESOL[u]))$("#vmeta").textContent+=" · ✎ resolución en los ejercicios";
  $("#vpages").classList.remove("zoom");$("#vzoom").textContent="Ampliar";$("#vpages").scrollTop=0;
  $("#viewer").hidden||history.pushState({modal:"v"},"");$("#viewer").hidden=false;document.body.style.overflow="hidden";$("#vclose").focus()}
function abrirDoc(id){const r=S.recursos.find(x=>x.id===id);if(!r)return;const p=(r.paginas||[]).filter(esDoc);if(!p.length)return;
  abrirVisor(`${NOM[r.asig]||r.asig} · ${r.titulo}`,[r.cat,`${p.length} ${p.length===1?"página":"páginas"}`].filter(Boolean).join(" · "),p)}
function abrirExamen(id){const e=S.examenes.find(x=>x.id===id);if(!e)return;const p=hojas(e),f=fechaCorta(e.fecha);
  $("#vtitle").textContent=`${NOM[e.asig]||e.asig} · ${e.titulo}`;
  $("#vmeta").textContent=[f?`${f.d} ${f.m}`:"",e.nota!=null&&e.nota!==""?`Nota: ${e.nota}`:"",`${p.length} ${p.length===1?"hoja":"hojas"}`].filter(Boolean).join(" · ");
  $("#vpages").innerHTML=p.map((u,i)=>`<figure><img src="${esc(u)}" alt="Hoja ${i+1} del examen" loading="${i<2?"eager":"lazy"}"><figcaption>Hoja ${i+1} de ${p.length}</figcaption></figure>`).join("");
  $("#vpages").classList.remove("zoom");$("#vzoom").textContent="Ampliar";$("#vpages").scrollTop=0;
  $("#viewer").hidden||history.pushState({modal:"v"},"");$("#viewer").hidden=false;document.body.style.overflow="hidden";$("#vclose").focus()}
addEventListener("popstate",()=>{if(!$("#pfm").hidden){cerrarPerfil(true);return}if(!$("#lb").hidden){$("#lb").hidden=true;return}if(!$("#viewer").hidden)cerrarExamen(true);else if(!$("#ficha").hidden)cerrarFicha(true)});
function cerrarExamen(pop){if(pop!==true&&!$("#viewer").hidden&&history.state&&history.state.modal==="v"){history.back();return}$("#viewer").hidden=true;document.body.style.overflow=$("#ficha").hidden?"":"hidden"}
$("#vclose").addEventListener("click",cerrarExamen);$("#vback").addEventListener("click",cerrarExamen);
$("#vzoom").addEventListener("click",()=>{const z=$("#vpages").classList.toggle("zoom");$("#vzoom").textContent=z?"Ajustar":"Ampliar"});
$("#viewer").addEventListener("click",ev=>{if(ev.target.id==="vpages")cerrarExamen()});
addEventListener("keydown",ev=>{if(ev.key==="Escape"&&!$("#ficha").hidden){cerrarFicha();return}
  if(ev.key==="Escape"&&!$("#viewer").hidden)cerrarExamen();
  const it=ev.target.closest&&ev.target.closest("[data-det],[data-ir],[data-dia]");if(it&&(ev.key==="Enter"||ev.key===" ")){ev.preventDefault();it.click();return}
  const r=ev.target.closest&&ev.target.closest(".exam[data-exam]");if(r&&(ev.key==="Enter"||ev.key===" ")){ev.preventDefault();abrirExamen(r.dataset.exam)}});
document.addEventListener("click",async ev=>{
  if(ev.target.closest("[data-pfmcerrar]")||ev.target.id==="pfm"){const g=ev.target.closest("[data-go]");cerrarPerfil(!!g);if(g){$("#pfm").hidden=true;location.hash=g.dataset.go}return}
  {const pv=ev.target.closest("[data-privado]");if(pv){$("#pfm").hidden=true;$("#pfm").innerHTML="";location.replace("#privado-"+pv.dataset.privado);return}}
  {const rm=ev.target.closest("[data-rkmodo]");if(rm){ev.preventDefault();S.rkModo=rm.dataset.rkmodo;try{localStorage.setItem("rkModo",S.rkModo)}catch(e){}render();return}}
  {const pf=ev.target.closest("[data-perfil]");if(pf&&!ev.target.closest("#pfm")){abrirPerfil(pf.dataset.perfil);return}}
  {const mc=ev.target.closest("[data-mencid]");if(mc){ponerMencion(mc.dataset.mencid);return}}
  if(ev.target.closest("[data-adjuntar]")){if(window.ADJ.length>=MAXF){toast(`Máximo ${MAXF} fotos por mensaje.`);return}document.getElementById("chatFotoIn").click();return}
  {const q=ev.target.closest("[data-quitaadj]");if(q){window.ADJ.splice(+q.dataset.quitaadj,1);pintarAdj();return}}
  {const f=ev.target.closest("[data-verfoto]");if(f){$("#lbImg").src=f.src;history.pushState({modal:"l"},"");$("#lb").hidden=false;return}}
  if(ev.target.closest("#lb")){if(history.state&&history.state.modal==="l")history.back();else $("#lb").hidden=true;return}
  if(ev.target.closest("[data-login]")){window.entrarGoogle&&window.entrarGoogle();return}
  {const d=ev.target.closest("[data-delmsg]");if(d){window.borrarMsg&&window.borrarMsg(d.dataset.delmsg,d);return}}
  if(ev.target.closest("[data-admtoggle]")){document.querySelector(".adm-1b")?.click();return}
  if(ev.target.closest("[data-salir]")){window.salirPortal&&window.salirPortal();return}
  if(ev.target.closest("[data-foto]")){document.getElementById("fotoIn")?.click();return}
  if(ev.target.closest("[data-quitafoto]")){window.quitarFoto&&window.quitarFoto();return}
  if(ev.target.closest("[data-guardanombre]")){const i=document.getElementById("nomIn");window.guardarNombre&&window.guardarNombre(i.value);return}
  const ap=ev.target.closest("[data-apt]");if(ap){abrirApuntes(ap.dataset.apt);return}
  const dc=ev.target.closest("[data-doc]");if(dc&&!ev.target.closest("#viewer")){abrirDoc(dc.dataset.doc);return}
  const op=ev.target.closest("[data-exam]");if(op&&!op.disabled&&!ev.target.closest("#viewer")){abrirExamen(op.dataset.exam);return}
  const go=ev.target.closest("[data-go]");if(go){const g=go.dataset.go;location.hash=g==="resumen"?"":g;if(g==="resumen")render();window.scrollTo({top:0});return}
  if(ev.target.id==="ficha"||ev.target.closest("#fcerrar")){cerrarFicha();return}
  if(ev.target.closest("#fcopiar")){const t=$("#fprompt").value;try{await navigator.clipboard.writeText(t);toast("Instrucciones copiadas. Pégalas en un chat nuevo.")}catch(e){const d=ev.target.closest(".ficha").querySelector("details");d.open=true;$("#fprompt").select();toast("Selecciona el texto y cópialo.")}return}
  const pr=ev.target.closest("[data-practicar]");if(pr){cerrarFicha(true);P.id=null;location.hash="practica-"+pr.dataset.practicar;window.scrollTo({top:0});return}
  const tq=ev.target.closest("[data-tq]");if(tq){P.resp[+tq.dataset.tq]=+tq.value;return}
  if(ev.target.closest("[data-corrtest]")){P.corregido=true;const d=prepararPractica(P.id);if(d&&P.test.length){const ac=P.test.filter(qi=>P.resp[qi]===d.test[qi].a).length;guardarPractica(d.examen,{test:ac/P.test.length,fecha:iso(new Date())})}render();return}
  const tn=ev.target.closest("[data-tanda]");if(tn){const d=prepararPractica(P.id);if(d){nuevaTanda(d,tn.dataset.tanda);render()}return}
  const vr2=ev.target.closest("[data-ver]");if(vr2){const r=$("#ref-"+vr2.dataset.ver);if(r)r.hidden=!r.hidden;return}
  const co=ev.target.closest("[data-corr]");if(co){corregir(co.dataset.corr);return}
  const ir=ev.target.closest("[data-ir]");if(ir){enfocar=ir.dataset.ex;location.hash=ir.dataset.ir;window.scrollTo({top:0});return}
  const dt=ev.target.closest("[data-det]");if(dt){abrirFicha(dt.dataset.det);return}
  const cm=ev.target.closest("[data-calmov]");if(cm){irPar(calPar+Number(cm.dataset.calmov));return}
  if(ev.target.closest("[data-calhoy]")){irPar(parActual());return}
  const dd=ev.target.closest("[data-dia]");if(dd){const ev2=porDia()[dd.dataset.dia]||[],pen=ev2.find(e=>!e.hecho&&AN[e.asig]),hec=ev2.find(e=>e.hecho&&hojas(e).length);
    if(pen){abrirFicha(pen.id);return} if(hec){abrirExamen(hec.id);return}
    toast(ev2.map(e=>`${NOM[e.asig]||e.asig}: ${e.titulo}`).join(" · "));return}
  const vf=ev.target.closest("[data-vf]");if(vf){V.f=vf.dataset.vf;document.querySelectorAll("[data-vf]").forEach(b=>b.setAttribute("aria-pressed",b===vf));filtrarVocab();return}
  if(ev.target.closest("#vtapar")){V.tapar=!V.tapar;$("#vtapar").setAttribute("aria-pressed",V.tapar);$("#vlist").classList.toggle("tapar",V.tapar);document.querySelectorAll(".vrow.ver").forEach(r=>r.classList.remove("ver"));return}
  const vr=ev.target.closest(".vlist.tapar .vrow");if(vr){vr.classList.toggle("ver");return}
  const tc=ev.target.closest("[data-tricerrado]");if(tc){toast(`El ${tc.dataset.tricerrado}.º trimestre todavía no está abierto.`);return}
  const tb=ev.target.closest("[data-tri]");if(tb){tri[route()]=Number(tb.dataset.tri);try{localStorage.setItem("tri",JSON.stringify(tri))}catch(e){}render();return}
  const st=ev.target.closest("button.st[data-tema]");if(st&&!st.disabled){
    const t=S.temas.find(x=>x.id===st.dataset.tema);if(!t||!db)return;
    const i=EST.findIndex(([k])=>k===(t.estado||"sin")),nuevo=EST[(i+1)%EST.length][0],viejo=t.estado;
    t.estado=nuevo;render();
    try{await db.collection("temas").doc(t.id).update({estado:nuevo});toast(`${t.titulo}: ${ESTN[nuevo]}`)}
    catch(e){t.estado=viejo;render();toast("No se ha guardado el cambio. Inténtalo otra vez.")}}
});
document.addEventListener("change",ev=>{if(ev.target.id==="chatFotoIn"&&ev.target.files.length){window.adjuntarFotos&&window.adjuntarFotos([...ev.target.files]);ev.target.value="";return}
if(ev.target.id==="fotoIn"&&ev.target.files[0]){window.subirFoto&&window.subirFoto(ev.target.files[0]);ev.target.value="";return}
const c=ev.target;if(!(c instanceof HTMLInputElement)||!db||!S.canWrite)return;
  if(c.dataset.ptema){const t=S.temas.find(x=>x.id===c.dataset.ptema);if(!t)return;const n=(t.puntos||[]).length;
    guardarTema(t,c.checked?{estado:"dominado",hechos:[...Array(n).keys()]}:{estado:"repasado",hechos:[]});return}
  if(c.dataset.punto){const[id,i]=c.dataset.punto.split(":");const t=S.temas.find(x=>x.id===id);if(!t)return;const n=(t.puntos||[]).length,k=+i;
    let h=new Set(hechosDe(t));c.checked?h.add(k):h.delete(k);const arr=[...h].sort((a,b)=>a-b);
    guardarTema(t,{hechos:arr,estado:arr.length===n?"dominado":(t.estado==="dominado"||t.estado==="sin")&&arr.length?"repasado":t.estado==="dominado"?"repasado":t.estado})}});
addEventListener("hashchange",render);
document.addEventListener("input",ev=>{if(ev.target.id==="vq"){V.q=ev.target.value;filtrarVocab()}
  const m=ev.target.id&&ev.target.id.match(/^ta-([de]\d+)$/);if(m){P.corr[m[1]]={...(P.corr[m[1]]||{}),resp:ev.target.value}}});
document.addEventListener("submit",ev=>{if(ev.target.id==="fchat"){ev.preventDefault();const i=$("#qchat");const q=i.value;i.value="";preguntar(q)}});

function saludo(){const h=new Date().getHours();return h>=6&&h<13?"Buenos días":h>=13&&h<21?"Buenas tardes":"Buenas noches"}
function actualizarSplash(){const el=$("#splash");if(!el||el.hidden)return;$("#hola").textContent=S.nombre?`¡Hola, ${S.nombre}! ${saludo()}.`:`${saludo()}.`}
function entrar(){const el=$("#splash");if(!el||el.hidden||el.classList.contains("out")||!S.listo)return;
  el.classList.add("out");document.body.classList.remove("con-splash");try{sessionStorage.setItem("dentro","1")}catch(e){}
  setTimeout(()=>{el.hidden=true},matchMedia("(prefers-reduced-motion: reduce)").matches?0:460)}
$("#splash").hidden=false;document.body.classList.add("con-splash");actualizarSplash();
$("#entrar").addEventListener("click",entrar);
addEventListener("keydown",ev=>{const el=$("#splash");if(el&&!el.hidden&&!el.classList.contains("out")&&(ev.code==="Space"||ev.key===" "||ev.key==="Enter")){ev.preventDefault();entrar()}});
let db=null;
render();


