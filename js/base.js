// 1 BACH · Constantes, estado S, utilidades de fechas, enlaces y rutas
// (parte del antiguo script de index.html; los archivos js/ se cargan en orden y comparten las variables)
const ASIG=[
 {id:"filosofia",n:"Filosofía"},{id:"lengua",n:"Lengua y Literatura"},{id:"fyq",n:"Física y Química"},
 {id:"mates",n:"Matemáticas"},{id:"economia",n:"Economía"},{id:"ingles",n:"Inglés"},
 {id:"bio",n:"Biología y Geología"},{id:"ef",n:"Educación Física"},{id:"tic",n:"TIC"}];
const AN=Object.fromEntries(ASIG.map(a=>[a.id,a.n]));
const NOM={...AN,global:"Globales"};
const EST=[["sin","Sin ver"],["visto","Visto"],["repasado","Repasado"],["dominado","Dominado"]];
const ESTN=Object.fromEntries(EST), PESO={sin:0,visto:.34,repasado:.67,dominado:1};
const TIPO={chat:"Chat",app:"App",doc:"Doc",archivo:"Archivo",web:"Web"};
const S={rkModo:(()=>{try{return localStorage.getItem("rkModo")||"hoy"}catch(e){return "hoy"}})(),ocultos:[],temas:[],recursos:[],examenes:[],fallos:[],vocab:[],practica:[],loaded:false,error:null,canWrite:true};
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let tri={}; try{tri=JSON.parse(localStorage.getItem("tri")||"{}")}catch(e){}

function hoy(){const d=new Date();d.setHours(0,0,0,0);return d}
function parseF(f){if(!f)return null;const[y,m,d]=f.split("-").map(Number);return new Date(y,m-1,d)}
function dias(f){const d=parseF(f);return d?Math.round((d-hoy())/864e5):null}
// Cuándo se abre cada trimestre (aprox.: el 2.º tras la semana de globales; el 3.º a mediados de marzo)
const ABRE_TRI={2:new Date(2026,11,2),3:new Date(2027,2,15)};
const triAbierto=n=>!ABRE_TRI[n]||Date.now()>=ABRE_TRI[n].getTime();
function triActual(){return triAbierto(3)?3:triAbierto(2)?2:1}
const MES=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
function fechaCorta(f){const d=parseF(f);return d?{d:d.getDate(),m:MES[d.getMonth()]}:null}
function link(r){const x=link0(r);return S.canWrite?`<span class="rw" data-rid="${esc(r.id)}">${x}<button class="rx-del" type="button" data-ocultar="${esc(r.id)}" title="Quitar de aquí" aria-label="Quitar ${esc(r.titulo)}">×</button></span>`:x}
function link0(r){const pg=(r.paginas||[]).filter(esDoc);
  if(pg.length)return `<button class="r ${r.claude?"hc":""}" data-doc="${esc(r.id)}" title="${esc(r.nota||r.titulo)}">${r.claude?'<span class="cb" title="Hecho por Bernabéu">Bernabéu</span>':""}<span class="k">${esc(r.cat||TIPO[r.tipo]||r.tipo)}</span><span class="n">${esc(r.titulo)}</span></button>`;
  if(r.examen)return `<button class="r ${r.claude?"hc":""}" data-exam="${esc(r.examen)}" title="${esc(r.nota||r.titulo)}">${r.claude?'<span class="cb" title="Hecho por Bernabéu">Bernabéu</span>':""}<span class="k">${esc(r.cat||"Examen")}</span><span class="n">${esc(r.titulo)}</span></button>`;
  const interno=/^[a-z0-9-]+\/([a-z0-9-]+\.html)?(#[a-z0-9-]+)?$/.test(r.url||"");const safe=/^https:\/\//.test(r.url||"")||esDoc(r.url)||interno?r.url:null;
  const inner=`<span class="k">${esc(r.cat||TIPO[r.tipo]||r.tipo)}</span><span class="n">${esc(r.titulo)}</span>`;
  const cb=r.claude?'<span class="cb" title="Hecho por Bernabéu">Bernabéu</span>':"",hc=r.claude?" hc":"";
  return safe?`<a class="r${hc}" href="${esc(safe)}" ${interno?"":`target="_blank" rel="noopener"`} title="${esc(r.nota||r.titulo)}">${cb}${inner}</a>`:`<span class="r${hc}" title="${esc(r.nota||"")}">${cb}${inner}</span>`}
const esDoc=u=>/^docs\/[\w.-]+(\/[\w.-]+)*$/.test(u||"");
const hojas=e=>(e.paginas||[]).filter(esDoc);
function progreso(list){if(!list.length)return null;return list.reduce((s,t)=>s+pTema(t),0)/list.length}
function toast(t){const el=$("#toast");el.textContent=t;el.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>el.hidden=true,2200)}

function route(){const h=location.hash.slice(1);return AN[h]||h==="apuntes"||h==="subir-apunte"||/^apunte-[A-Za-z0-9]+$/.test(h)||h==="mipanel"||/^mipanel-[a-z]+$/.test(h)||h==="companeros"||h==="amigos"||h==="perfil"||h==="chat"||h==="privados"||/^privado-[A-Za-z0-9]+$/.test(h)||/^practica-[a-z0-9]+$/.test(h)||/^prep-[A-Za-z0-9_-]+$/.test(h)?h:"resumen"}


function limite(e){const d=parseF(e.fecha);return d?new Date(d.getFullYear(),d.getMonth(),d.getDate()-1,23,59,59):null}
function fmtCd(ms){if(ms<=0)return "Tiempo terminado";const s=Math.floor(ms/1000),d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60),x=s%60,q=n=>String(n).padStart(2,"0");return (d?d+" d ":"")+`${q(h)}:${q(m)}:${q(x)}`}
function hechosDe(t){const n=(t.puntos||[]).length;if(t.estado==="dominado"&&!(t.hechos||[]).length)return [...Array(n).keys()];return (t.hechos||[]).filter(i=>i<n)}
function pTema(t){const n=(t.puntos||[]).length;return n?hechosDe(t).length/n:(PESO[t.estado]??0)}
function pPractica(e){const q=e.practica;if(!q)return null;const v=[q.test,q.redac].filter(x=>typeof x==="number");return v.length?v.reduce((a,b)=>a+b,0)/v.length:null}
function pExamen(e){const ts=temasDe(e),a=ts.length?ts.reduce((s,t)=>s+pTema(t),0)/ts.length:null,b=pPractica(e);
  if(a==null&&b==null)return {tot:0,a,b};return {tot:a==null?b:b==null?a:a*.6+b*.4,a,b}}
