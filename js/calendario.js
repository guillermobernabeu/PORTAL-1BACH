// 1 BACH · Calendario por parejas de meses y leyenda
// (parte del antiguo script de index.html; los archivos js/ se cargan en orden y comparten las variables)
const ABR={filosofia:"Filo",lengua:"Len",fyq:"Quí",mates:"Mat",economia:"Eco",ingles:"Ing",bio:"Bio",ef:"EF",tic:"TIC",global:"Glob"};
const ABRL={filosofia:"Filosofía",lengua:"Lengua",fyq:"Química",mates:"Mates",economia:"Economía",ingles:"Inglés",bio:"Bio",ef:"EF",tic:"TIC",global:"Globales"};
const MESL=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const TRIS={1:{n:"1.er trimestre",m:[[2026,8],[2026,9],[2026,10],[2026,11]]},2:{n:"2.º trimestre",m:[[2027,0],[2027,1],[2027,2]]},3:{n:"3.er trimestre",m:[[2027,3],[2027,4],[2027,5]]}};
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const fechasDe=e=>{const f=Array.isArray(e.dias)&&e.dias.length?e.dias:(e.fecha?[e.fecha]:[]);return f.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x))};
function porDia(){const m={};S.examenes.forEach(e=>fechasDe(e).forEach(f=>(m[f]=m[f]||[]).push(e)));return m}
function mesHTML(y,mo,M){const first=new Date(y,mo,1),off=(first.getDay()+6)%7,n=new Date(y,mo+1,0).getDate(),hoyI=iso(hoy());
  let cells="";for(let i=0;i<off;i++)cells+=`<div class="dia vacio"></div>`;
  for(let d=1;d<=n;d++){const dt=new Date(y,mo,d),k=iso(dt),ev=M[k]||[],wd=(dt.getDay()+6)%7;
    const cls=["dia",wd>4?"we":"",k<hoyI?"past":"",k===hoyI?"hoy":"",ev.length?"ex":"",ev.length&&ev.every(e=>e.hecho)?"hecho":""].filter(Boolean).join(" ");
    const pen=ev.length?`style="--pen:${penDe(ev.find(e=>!e.hecho)||ev[0])}"`:"";
    const tip=ev.map(e=>`${NOM[e.asig]||e.asig}: ${e.titulo}`).join(" · ");
    cells+=`<div class="${cls}" ${pen} ${ev.length?`data-dia="${k}" role="button" tabindex="0" title="${esc(tip)}"`:""}><span class="n">${d}</span>${ev.slice(0,2).map(e=>`<span class="mk" style="--pen:${penDe(e)}">${esc(ABR[e.asig]||e.asig)}</span>`).join("")}</div>`}
  return `<div class="mes"><h3>${MESL[mo]}<span>${y}</span></h3><div class="dow">${["L","M","X","J","V","S","D"].map(x=>`<span>${x}</span>`).join("")}</div><div class="dias">${cells}</div></div>`}
const HUE={filosofia:295,lengua:190,fyq:222,mates:258,economia:155,ingles:55,bio:125,ef:90};
const penDe=e=>e.asig==="tic"?"oklch(.42 .03 260)":e.asig==="global"?"#2f5bd3":`oklch(.5 .14 ${HUE[e.asig]??260})`;
function enTri(e,t){return fechasDe(e).some(f=>TRIS[t].m.some(([y,m])=>f.startsWith(`${y}-${String(m+1).padStart(2,"0")}`)))}
// curso de septiembre a junio en parejas de meses; se ve una pareja y se desliza a las demás
const PARES=[[[2026,8],[2026,9]],[[2026,10],[2026,11]],[[2027,0],[2027,1]],[[2027,2],[2027,3]],[[2027,4],[2027,5]]];
function parActual(){const h=hoy(),k=h.getFullYear()*12+h.getMonth();const i=PARES.findIndex(p=>p.some(([y,m])=>y*12+m===k));return i<0?(k<2026*12+8?0:PARES.length-1):i}
let calPar=parActual();
const enPar=(e,i)=>fechasDe(e).some(f=>PARES[i].some(([y,m])=>f.startsWith(`${y}-${String(m+1).padStart(2,"0")}`)));
function cabeceraPar(i){const pr=PARES[i],exP=S.examenes.filter(e=>enPar(e,i)),pend=exP.filter(e=>!e.hecho).length,[a,b]=pr;
  return {t:`${MESL[a[1]]} – ${MESL[b[1]]}`,y:a[0]===b[0]?`${a[0]}`:`${a[0]}–${b[0]}`,sub:exP.length?`${exP.length} ${exP.length===1?"examen":"exámenes"} · ${pend} por hacer`:"Sin exámenes en estos meses"}}
function renderCal(){const M=porDia(),c=cabeceraPar(calPar);
  return `<section class="cal" aria-label="Calendario del curso"><div class="holes" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="cal-head"><div><h2 id="calTit">${c.t} <span class="calY" id="calY">${c.y}</span></h2><div class="sub" id="calSub">${c.sub}</div></div>
      <div class="ctabs" role="group" aria-label="Cambiar de meses"><button data-calmov="-1" aria-label="Meses anteriores">▲</button><button data-calhoy title="Volver a los meses de hoy">Hoy</button><button data-calmov="1" aria-label="Meses siguientes">▼</button></div></div>
    <div class="mscroll" id="mscroll" tabindex="0" aria-label="Meses del curso. Desliza arriba o abajo">${PARES.map((pr,i)=>`<div class="par" data-par="${i}">${pr.map(([y,m])=>mesHTML(y,m,M)).join("")}</div>`).join("")}</div>
    <div class="cal-key"><span><i class="k-hoy"></i>Hoy</span><span><i class="k-ex"></i>Examen (color de la asignatura)</span><span><i class="k-hecho"></i>Ya hecho</span><span>Desliza arriba o abajo para cambiar de meses</span></div></section>`}
function montarCal(){const sc=$("#mscroll");if(!sc)return;if(matchMedia("(max-width:600px)").matches){calPar=parActual();const c=cabeceraPar(calPar);$("#calTit").firstChild.textContent=c.t+" ";$("#calY").textContent=c.y;$("#calSub").textContent=c.sub;sc.querySelectorAll(".par").forEach((p,i)=>p.hidden=i!==calPar);sc.style.height="";sc.onscroll=null;return}sc.querySelectorAll(".par").forEach(p=>p.hidden=false);const pars=[...sc.querySelectorAll(".par")];
  const h=Math.max(...pars.map(p=>{p.style.minHeight="";return p.offsetHeight}));pars.forEach(p=>p.style.minHeight=h+"px");sc.style.height=h+"px";
  sc.scrollTop=calPar*h;
  let t=null;sc.onscroll=()=>{clearTimeout(t);t=setTimeout(()=>{const i=Math.round(sc.scrollTop/h);if(i!==calPar&&PARES[i]){calPar=i;const c=cabeceraPar(i);
    $("#calTit").firstChild.textContent=c.t+" ";$("#calY").textContent=c.y;$("#calSub").textContent=c.sub}},90)}}
function irPar(i){const sc=$("#mscroll");if(!sc)return;i=Math.max(0,Math.min(PARES.length-1,i));const h=sc.clientHeight;
  sc.scrollTo({top:i*h,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"})}
// las horas de estudio estimadas se han quitado (no eran fiables): sin horas no sale "Lo que más te va a costar" ni el ritmo por día
const hrs=e=>null;
function renderLeyenda(){
  const up=S.examenes.filter(e=>!e.hecho&&e.fecha&&dias(e.fecha)>=0).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const sinF=S.examenes.filter(e=>!e.hecho&&!e.fecha);
  const fila=(e,i)=>{const d=dias(e.fecha),f=fechaCorta(e.fecha),h=hrs(e);
    const u=d<=3?"u1":d<=7?"u2":"lejos";
    const ritmo=h?` · ≈${h} h${d>0?`, unas ${(Math.round(h/d*10)/10).toString().replace(".",",")} h/día`:""}`:"";
    return `<div class="ce ${u} ${d<5?"urge":""}" data-exid="${esc(e.id)}" data-a="${e.asig}" ${AN[e.asig]?`data-ir="${e.asig}" data-ex="${esc(e.id)}" role="button" tabindex="0" title="Ir a ${esc(AN[e.asig])}"`:""}><div class="num">${d===0?"HOY":d}<small>${d===0?"":d===1?"día":"días"}</small></div>
      <div class="info"><span class="chip-asig" data-a="${e.asig}">${esc(NOM[e.asig]||e.asig)}</span><b>${esc(e.titulo)}</b><span class="m">${f.d} ${f.m}${ritmo}</span></div></div>`};
  const carga=up.filter(hrs).sort((a,b)=>hrs(b)-hrs(a)),max=Math.max(1,...carga.map(hrs));
  const total=up.filter(e=>dias(e.fecha)<=14).reduce((s,e)=>s+(hrs(e)||0),0);
  return `<div class="leyenda">
    <section class="sheet"><header><h2>Próximos exámenes</h2><span class="note">${up.length} con fecha</span></header>
      ${up.length?`<div class="cuenta">${up.map(fila).join("")}</div>`:`<div class="empty">No tienes exámenes con fecha. Cuando haya fechas aparecerán aquí y en el calendario.</div>`}
      ${sinF.length?`<div class="note">Sin fecha todavía: ${sinF.map(e=>`${esc(NOM[e.asig]||e.asig)} (${esc(e.titulo)})`).join(", ")}.</div>`:""}
    </section>
    ${carga.length?`<section class="sheet"><header><h2>Lo que más te va a costar</h2></header>
      <div class="carga">${carga.map(e=>`<div class="cg" data-a="${e.asig}"><span class="lab">${esc(ABRL[e.asig]||e.asig)} · ${esc(e.titulo)}</span><span class="bar2"><i style="width:${Math.round(hrs(e)/max*100)}%"></i></span><span class="h">${hrs(e)} h</span></div>`).join("")}</div>
      <p class="ritmo">En las próximas dos semanas suman <b>${total} h</b> de estudio. Horas estimadas según el temario de cada examen.</p></section>`:""}
  </div>`}
