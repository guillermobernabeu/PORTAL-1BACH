// 1 BACH · Puntos diarios/semanales, clasificación, avatares
// (parte del antiguo script de index.html; los archivos js/ se cargan en orden y comparten las variables)
const APPS=[["vocab","Vocabulary"],["plur","Plurales"],["verbos","Verbos"],["afijos","Afijos"],["wf","Word formation"],["idioms","Idioms"],["def","Definitions"],["trad","Translate"],["past","Past simple"],["preg","Make questions"],["gi","Gerund & infinitive"]];
const enLinea=u=>!!u&&Date.now()-(u.visto||0)<150000;
function pctApp(p,k){const a=p&&p.apps&&p.apps[k];return a&&a.total?Math.min(1,a.ok/a.total):0}
function hoyStr(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
// Topes (contra trampas editando la base de datos): como mucho 100 por app y día, 500 al día en total.
const TOPE_DIA=100*APPS.length;
function ganadoHoy(p,h){return Math.max(0,Math.round(APPS.reduce((s,[k])=>{const a=p&&p.apps&&p.apps[k];if(!a||a.dia!==h||!a.total)return s;return s+Math.min(1,Math.max(0,(a.ok-(a.ok0||0))/a.total))*100},0)))}
const TOPE_BONUS=90,bonusDe=(p,h)=>Math.min(TOPE_BONUS,Math.max(0,Number(((p&&p.bonus)||{})[h])||0));
function puntosHoy(p,h=hoyStr()){return Math.min(TOPE_DIA,Math.max(ganadoHoy(p,h),Math.min(TOPE_DIA,Number(((p&&p.dias)||{})[h])||0)))+bonusDe(p,h)}
function isoD(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function diasSemana(atras=0){const n=new Date(),l=new Date(n.getFullYear(),n.getMonth(),n.getDate());l.setDate(l.getDate()-((l.getDay()+6)%7)-7*atras);return Array.from({length:7},(_,i)=>{const d=new Date(l);d.setDate(l.getDate()+i);return isoD(d)})}
// Semana en la que empezaron los puntos diarios: se suman también los puntos que ya tenías antes (no se pierden)
const SEM0="2026-11-09";
function legado(p){if(p&&typeof p.legado==="number")return Math.min(TOPE_DIA,Math.max(0,p.legado));const h=hoyStr();if(h<SEM0)return 0;
  const base=Math.round(APPS.reduce((s,[k])=>{const a=p&&p.apps&&p.apps[k];if(!a||!a.total)return s;return s+Math.min(1,(a.dia===h?(a.ok0||0):a.ok)/a.total)*100},0));
  const prev=diasSemana(0)[0]===SEM0?diasSemana(0).filter(f=>f<h).reduce((s,f)=>s+puntosHoy(p,f),0):0;return Math.max(0,base-prev)}
function puntosSemana(p,atras=0){const d=diasSemana(atras),v=d.reduce((s,f)=>s+puntosHoy(p,f),0);if(d[0]!==SEM0)return v;
  // primera semana: como mínimo, todo lo que llevas conseguido (no se pierde nada de antes)
  return Math.max(v+legado(p),puntos(p))}
function ganadorSemana(atras){const us=S.amigos||{},pr=S.rank||{};const L=Object.keys(us).filter(id=>!us[id].baneado).map(id=>({id,v:puntosSemana(pr[id],atras)})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v);return L[0]||null}
function fechaSem(f){const [y,m,d]=f.split("-").map(Number);return new Date(y,m-1,d).toLocaleDateString("es-ES",{day:"numeric",month:"short"})}
function renderLider(){if(!S.uid)return "";const us=S.amigos||{},pr=S.rank||{};
  const hoy=Object.keys(us).map(id=>({id,v:puntosHoy(pr[id])})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v);
  const sem=ganadorSemana(0),g=hoy[0]||sem;if(!g)return "";
  return `<span class="lider" title="${hoy.length?"Va primero en el ranking de hoy":"Va primero esta semana"}">🏆 ${esc(g.id===S.uid?"Tú":(nombreDe(g.id)||"Alguien"))} en cabeza${hoy.length?" hoy":" esta semana"}</span>`}
function puntos(p){return Math.round(APPS.reduce((s,[k])=>s+pctApp(p,k)*100,0))}
function nombreDe(id){const u=(S.amigos||{})[id]||{};return u.nombre||u.nombreGoogle||(id===S.uid?S.nombreCompleto:"")||""}
function fotoDe(id){const u=(S.amigos||{})[id]||{};return u.fotoPropia||u.fotoGoogle||(id===S.uid?S.foto:"")||""}
function avatar(id,px){const f=fotoDe(id),n=nombreDe(id)||"?";
  return f?`<img class="ava" src="${esc(f)}" alt="" referrerpolicy="no-referrer" style="width:${px}px;height:${px}px">`:`<span class="ava av0" style="width:${px}px;height:${px}px;font-size:${Math.round(px*.42)}px">${esc(n[0].toUpperCase())}</span>`}
function clasificacion(modo=S.rkModo||"hoy"){const us=S.amigos||{},pr=S.rank||{},f=modo==="semana"?p=>puntosSemana(p):modo==="dominio"?puntos:p=>puntosHoy(p);
  return Object.keys(us).filter(id=>!us[id].baneado).map(id=>({id,u:us[id],p:pr[id]||{},pts:f(pr[id]||{})})).sort((a,b)=>b.pts-a.pts||nombreDe(a.id).localeCompare(nombreDe(b.id)))}
function barrasApps(p){return `<div class="rk-apps">${APPS.map(([k,t])=>{const v=Math.round(pctApp(p,k)*100),a=p&&p.apps&&p.apps[k];
  return `<span title="${t}: ${a?a.ok+" de "+a.total:"sin empezar"}"><i style="width:${v}%"></i><em>${t} ${v}%</em></span>`}).join("")}</div>`}

