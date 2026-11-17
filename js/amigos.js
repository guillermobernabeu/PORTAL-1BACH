// 1 BACH · Vistas de ranking (Amigos) y perfil propio
// (parte del antiguo script de index.html; los archivos js/ se cargan en orden y comparten las variables)
function renderAmigos(){const modo=S.rkModo||"hoy",lista=clasificacion(modo);
  const filas=lista.map((x,i)=>{const otro=modo==="semana"?puntosHoy(x.p):puntosSemana(x.p);
    return `<div class="rk ${x.id===S.uid?"yo-fila":""}" data-perfil="${esc(x.id)}" role="button" tabindex="0" title="Ver perfil"><span class="pos">${x.pts>0&&i<3?["🥇","🥈","🥉"][i]:i+1}</span>
    ${avatar(x.id,42)}
    <div class="rk-n"><b>${esc(nombreDe(x.id)||"Sin nombre")}${x.id===S.uid?" (tú)":""}</b><span class="${enLinea(x.u)?"on":""}">${enLinea(x.u)?"● conectado ahora":"última vez "+new Date(x.u.visto||0).toLocaleDateString("es-ES")}</span>
    ${barrasApps(x.p)}</div>
    <button type="button" class="pts" data-rkmodo="${modo==="hoy"?"semana":"hoy"}" title="${modo==="hoy"?"Ver los puntos de la semana":"Ver los puntos de hoy"}">${x.pts}<small>${modo==="semana"?"pts semana":modo==="dominio"?"pts":"pts hoy"}</small>${modo!=="dominio"?`<em class="hoy-p">${modo==="semana"?`${otro} hoy`:`${otro} esta semana`}</em>`:""}</button></div>`}).join("");
  const sp=ganadorSemana(1),sa=ganadorSemana(0),d1=diasSemana(1),d0=diasSemana(0);
  const gan=`<div class="semana">
     <div class="sem-c pasada">${sp?`${avatar(sp.id,46)}<div><span class="eyebrow">Ganador de la semana pasada · ${fechaSem(d1[0])}–${fechaSem(d1[6])}</span><b>🏆 ${esc(sp.id===S.uid?"¡Tú!":nombreDe(sp.id)||"Alguien")}</b><span>con <b>${sp.v}</b> puntos</span></div>`:`<div><span class="eyebrow">Ganador de la semana pasada</span><b>Nadie todavía</b><span>El primer recuento sale el lunes</span></div>`}</div>
     <div class="sem-c">${sa?`${avatar(sa.id,46)}<div><span class="eyebrow">Esta semana · hasta el domingo ${fechaSem(d0[6])}</span><b>${esc(sa.id===S.uid?"Vas tú":"Va ganando "+(nombreDe(sa.id)||"alguien"))}</b><span>con <b>${sa.v}</b> puntos</span></div>`:`<div><span class="eyebrow">Esta semana</span><b>Aún nadie ha sumado</b><span>¡Empieza tú!</span></div>`}</div></div>`;
  return `<div class="vista"><button class="back" data-go="resumen">← Inicio</button>
   <section class="sheet"><header><h2>Amigos y ranking</h2><span class="note">${lista.length} en la clase · ${lista.filter(x=>enLinea(x.u)).length} conectados ahora</span></header>
   ${gan}
   <div class="rk-modos" role="tablist"><button type="button" data-rkmodo="hoy" aria-pressed="${modo==="hoy"}">Hoy</button><button type="button" data-rkmodo="semana" aria-pressed="${modo==="semana"}">Esta semana</button><button type="button" data-rkmodo="dominio" aria-pressed="${modo==="dominio"}">Dominio total</button></div>
   <p class="note" style="margin:0">${modo==="hoy"?"Los puntos de hoy vuelven a 0 cada noche a las 00:00. Toca los puntos de alguien para ver los de la semana.":modo==="semana"?"Suma de los puntos de cada día, de lunes a domingo. El lunes se anuncia el ganador.":"Lo que tiene dominado cada uno en las apps de Inglés: 100 por app, máximo 500."}</p>
   <div class="ranking">${filas||'<div class="empty">Todavía no ha entrado nadie.</div>'}</div></section></div>`}
function renderPerfil(){const lista=clasificacion("hoy"),pos=lista.findIndex(x=>x.id===S.uid),p=(S.rank||{})[S.uid]||{},pts=puntos(p);
  const u=(S.amigos||{})[S.uid]||{};
  return `<div class="vista"><button class="back" data-go="resumen">← Inicio</button>
   <section class="sheet perfil"><div class="pf-top">
     <div class="pf-foto">${avatar(S.uid,120)}<button class="pf-cam" data-foto title="Cambiar foto">📷</button></div>
     <div class="pf-datos"><div class="eyebrow">Tu perfil</div><h2>${esc(nombreDe(S.uid)||"Sin nombre")}</h2>
       <div class="pf-big"><span><b>${puntosHoy(p)}</b><small>puntos hoy</small></span><span><b>${puntosSemana(p)}</b><small>esta semana</small></span><span><b>${pos<0?"—":pos+1+"º"}</b><small>hoy, de ${lista.length}</small></span></div></div></div>
     <div class="pf-acc"><button class="btn-p" data-foto style="--cf:var(--accent)">Subir foto de mi galería</button>${u.fotoPropia?'<button class="btn-sec" data-quitafoto>Volver a la foto de Google</button>':""}</div>
     ${pushHTML()}
     <p class="note" style="margin:0">Has entrado con la cuenta <b>${esc(S.email||"(sin correo)")}</b>. Solo la ves tú.${S.email&&/guille|bernab/i.test(S.email)?` · Administrador: <b>${window.__esAdmin1b?"sí ✅":"no ❌"}</b>`:""}</p>
     <div class="pf-nom"><label for="nomIn">Nombre que ven los demás</label><div><input id="nomIn" maxlength="30" value="${esc(nombreDe(S.uid))}"><button class="btn-sec" data-guardanombre>Guardar</button></div></div>
   </section>
   <section class="sheet"><header><h2>Tus puntos por app</h2><span class="note">100 por app · máximo 500</span></header>
     <div class="pf-apps">${APPS.map(([k,t])=>{const a=p.apps&&p.apps[k],v=Math.round(pctApp(p,k)*100);
       return `<div class="pf-app"><div><b>${t}</b><span>${a?a.ok+" de "+a.total+" dominados":"Sin empezar"}</span></div><div class="barra"><i style="width:${v}%"></i></div><b class="mono">${v} pts</b></div>`}).join("")}</div>
   </section>
   <section class="sheet"><header><h2>Ranking de la clase</h2><button class="btn-sec" data-go="amigos">Ver con detalle</button></header>
     <div class="mini-rk">${lista.slice(0,10).map((x,i)=>`<div class="${x.id===S.uid?"yo-fila":""}" data-perfil="${esc(x.id)}" role="button" tabindex="0"><span>${i+1}</span>${avatar(x.id,26)}<b>${esc(nombreDe(x.id)||"Sin nombre")}</b><em>${x.pts} pts</em></div>`).join("")}</div>
   </section>
   <button class="btn-sec" data-salir style="align-self:center">Cerrar sesión</button></div>`}


// ---------- notificaciones push e instalar la app (en el perfil) ----------
let instalarEv=null;addEventListener("beforeinstallprompt",ev=>{ev.preventDefault();instalarEv=ev;if(route()==="perfil"||route()==="resumen")render()});
const yaInstalada=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const esIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)&&!window.MSStream;
function pushHTML(){const e=window.push1b?window.push1b.estado():{soportado:false};
  const push=!e.soportado?`<span class="note">Este navegador no admite notificaciones${esIOS()&&!yaInstalada()?" hasta que añadas 1 BACH a la pantalla de inicio (Compartir → Añadir a pantalla de inicio)":""}.</span>`
    :!e.configurado?`<span class="note">Las notificaciones push se activarán en cuanto el administrador las configure.</span>`
    :e.permiso==="denied"?`<span class="note">Tienes las notificaciones bloqueadas en el navegador. Actívalas en los ajustes del sitio.</span>`
    :e.activo?`<span class="ok-p">🔔 Notificaciones activadas</span><button class="btn-sec" data-pushoff>Desactivar</button>`
    :`<button class="btn-p" style="--cf:var(--accent)" data-pushon>🔔 Activar notificaciones</button><span class="note">Exámenes de mañana, menciones, privados, apuntes aprobados y adelantos en el ranking, aunque tengas el portal cerrado.</span>`;
  const inst=yaInstalada()?`<span class="note">📲 Tienes 1 BACH instalada como app.</span>`:instalarEv?`<button class="btn-sec" data-instalar>📲 Instalar 1 BACH como app</button>`:esIOS()?`<span class="note">📲 Para tenerla como app: Compartir → «Añadir a pantalla de inicio».</span>`:"";
  return `<div class="push-c">${push}${inst}</div>`}
document.addEventListener("click",async ev=>{if(!ev.target.closest)return;
  if(ev.target.closest("[data-pushon]")){ev.preventDefault();const ok=await window.push1b.pedir();toast(ok?"¡Notificaciones activadas!":"No se han podido activar.");render();return}
  if(ev.target.closest("[data-pushoff]")){ev.preventDefault();await window.push1b.quitar();toast("Notificaciones desactivadas.");render();return}
  if(ev.target.closest("[data-instalar]")&&instalarEv){ev.preventDefault();const e=instalarEv;instalarEv=null;e.prompt();try{await e.userChoice}catch(x){}render();return}
  if(ev.target.closest("[data-admpush]")){ev.preventDefault();const e=window.push1b?window.push1b.estado():{};
    admModal(`<h2>🔔 Notificaciones push</h2><p>Pega la clave pública VAPID de Firebase (Configuración del proyecto → Cloud Messaging → Certificados push web → Generar par de claves). Con ella, cada compañero podrá activar las notificaciones desde su perfil.</p><form id="vapidForm" class="ap-form"><label class="rep-l">Clave VAPID<input name="k" autocomplete="off" spellcheck="false" value="${esc((window.__pushCfg1b||{}).vapid||"")}" placeholder="B…"></label><p class="note">Para que se envíen hace falta además el secreto FIREBASE_SA en Cloudflare.${e.configurado?" ✅ Clave guardada.":""}</p><div class="adm-b"><button type="submit" class="btn-p" style="--cf:var(--accent)">Guardar</button><button type="button" class="btn-sec" data-admcerrar>Cancelar</button></div></form>`);return}});
document.addEventListener("submit",ev=>{if(ev.target.id!=="vapidForm")return;ev.preventDefault();window.push1b.guardarVapid(ev.target.elements.k.value).then(()=>{admCerrar();toast("Clave guardada.")}).catch(e=>toast("No se ha podido ("+(e.code||"error")+")."))});
