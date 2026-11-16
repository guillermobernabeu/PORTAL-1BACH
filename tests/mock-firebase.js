// Firebase simulado para las pruebas: sustituye a los módulos de gstatic.
// Guarda todo en localStorage.st (un objeto { coleccion: { id: datos } }) y localStorage.u (usuario con sesión).
// Soporta lo que usa el portal: doc/collection (con subcolecciones), get/set/update/delete/add, query+where, onSnapshot, batch, arrayUnion/Remove, deleteField.
module.exports = {
  "firebase-app.js": `export const initializeApp=()=>({});`,

  "firebase-auth.js": `let cbs=[];const A={currentUser:null};
const leer=()=>{const u=localStorage.u?JSON.parse(localStorage.u):null;if(u){u.getIdToken=async()=>"tok.en.x";u.email=u.email||"x@x"}return u};
export const getAuth=()=>A;export const getRedirectResult=async()=>null;export class GoogleAuthProvider{};
export const onAuthStateChanged=(a,f)=>{cbs.push(f);setTimeout(()=>{const u=leer();A.currentUser=u;f(u)},20);return()=>{cbs=cbs.filter(x=>x!==f)}};
export const signInWithPopup=async()=>{const u={uid:"u1",displayName:"Guillermo Bernabéu",email:"guillee.bs15@gmail.com",photoURL:""};localStorage.u=JSON.stringify(u);A.currentUser=leer();cbs.forEach(f=>f(A.currentUser))};
export const signInWithRedirect=async()=>{};
export const signOut=async()=>{delete localStorage.u;A.currentUser=null;cbs.forEach(f=>f(null))};`,

  "firebase-firestore.js": `const store=JSON.parse(localStorage.st||'{}');const col=n=>store[n]=store[n]||{};const save=()=>localStorage.st=JSON.stringify(store);const subs=[];const fire=()=>subs.forEach(s=>s());
const clon=x=>JSON.parse(JSON.stringify(x));
// Reglas simuladas (como las de Firestore): solo el administrador escribe en clase/*, baneos, bloqueos, compartidos, adminpriv
const ADMINS=['guillee.bs15@gmail.com','guillermobernabeu@gmail.com'];const soyAdmin=()=>{const u=localStorage.u?JSON.parse(localStorage.u):null;return !!u&&ADMINS.includes(u.email)};
const SOLO_ADMIN=/^(clase|baneos|bloqueos|compartidos|adminpriv)(\\/|$)/;const permiso=(n)=>{if(SOLO_ADMIN.test(n)&&!soyAdmin())throw Object.assign(new Error('Missing or insufficient permissions.'),{code:'permission-denied'})};
const merge=(a,b)=>{for(const k in b){const v=b[k];if(v&&v.__del){delete a[k];continue}if(v&&v.__au){a[k]=[...new Set([...(a[k]||[]),...v.__au])];continue}if(v&&v.__ar){a[k]=(a[k]||[]).filter(x=>!v.__ar.includes(x));continue}if(v&&v.__inc){a[k]=(a[k]||0)+v.__inc;continue}if(v&&typeof v==='object'&&!Array.isArray(v)&&a[k]&&typeof a[k]==='object'&&!Array.isArray(a[k]))merge(a[k],v);else a[k]=v}return a};
export const deleteField=()=>({__del:1});export const arrayUnion=(...v)=>({__au:v});export const arrayRemove=(...v)=>({__ar:v});export const increment=(n)=>({__inc:n});export const serverTimestamp=()=>Date.now();
export const getFirestore=()=>({});
export const doc=(db,...p)=>{if(p.length===1&&typeof p[0]==='object'&&p[0].n){const c=p[0];return{n:c.n,id:'x'+Math.random().toString(36).slice(2)}}return{n:p.slice(0,-1).join('/'),id:p[p.length-1]}};
export const collection=(db,...p)=>({n:p.join('/')});
export const where=(f,op,v)=>({w:[f,op,v]});export const orderBy=(f,d)=>({o:[f,d]});export const limit=(n)=>({l:n});export const limitToLast=(n)=>({ll:n});
export const query=(c,...q)=>({n:c.n,ws:[...(c.ws||[]),...q.filter(x=>x.w).map(x=>x.w)],o:q.find(x=>x.o)?.o||c.o,l:q.find(x=>x.l)?.l||c.l});
const filtra=(r)=>{let docs=Object.entries(col(r.n));for(const [k,op,v] of (r.ws||[]))docs=docs.filter(([id,d])=>{const x=k.split('.').reduce((a,b)=>a&&a[b],d);return op==='array-contains'?(x||[]).includes(v):op==='in'?v.includes(x):op==='!='?x!==v:op==='>'?x>v:op==='>='?x>=v:op==='<'?x<v:op==='<='?x<=v:x===v});
  const [f,dir]=r.o||['t','asc'];docs=docs.sort((a,b)=>{const x=a[1][f]||0,y=b[1][f]||0;return (x>y?1:x<y?-1:0)*(dir==='desc'?-1:1)});if(r.l)docs=docs.slice(0,r.l);return docs.map(([id,d])=>({id,data:()=>clon(d),exists:()=>true}))};
export const getDoc=async(r)=>{const d=col(r.n)[r.id];return{id:r.id,exists:()=>!!d,data:()=>d&&clon(d)}};
export const getDocs=async(r)=>{const docs=filtra(r);return{docs,empty:!docs.length,size:docs.length}};
export const setDoc=async(r,d,o)=>{permiso(r.n);const c=col(r.n);c[r.id]=o&&o.merge?merge(c[r.id]||{},clon(d)):merge({},clon(d));save();fire()};
export const updateDoc=async(r,d)=>{permiso(r.n);const c=col(r.n);if(!c[r.id])throw Object.assign(new Error('not-found'),{code:'not-found'});c[r.id]=merge(c[r.id],clon(d));save();fire()};
export const deleteDoc=async(r)=>{permiso(r.n);delete col(r.n)[r.id];save();fire()};
export const addDoc=async(c,d)=>{permiso(c.n);const id='x'+Math.random().toString(36).slice(2);col(c.n)[id]=merge({},clon(d));save();fire();return{id}};
export const onSnapshot=(r,f,err)=>{const s=()=>{if(r.id!==undefined){const d=col(r.n)[r.id];f({id:r.id,exists:()=>!!d,data:()=>d&&clon(d),metadata:{fromCache:false,hasPendingWrites:false}})}else{const docs=filtra(r);f({empty:!docs.length,docs,size:docs.length,metadata:{fromCache:false,hasPendingWrites:false},docChanges:()=>docs.map(d=>({type:'added',doc:d}))})}};subs.push(s);setTimeout(s,5);return()=>{const i=subs.indexOf(s);if(i>=0)subs.splice(i,1)}};
export const writeBatch=()=>{const ops=[];return{set:(r,d,o)=>ops.push(['s',r,d,o]),update:(r,d)=>ops.push(['u',r,d]),delete:(r)=>ops.push(['d',r]),commit:async()=>{for(const[t,r,d,o] of ops){const c=col(r.n);if(t==='s')c[r.id]=o&&o.merge?merge(c[r.id]||{},clon(d)):merge({},clon(d));else if(t==='u')c[r.id]=merge(c[r.id]||{},clon(d));else delete c[r.id]}save();fire()}}};
export const runTransaction=async(db,fn)=>fn({get:getDoc,set:(r,d,o)=>setDoc(r,d,o),update:(r,d)=>updateDoc(r,d)});`,

  "firebase-messaging.js": `export const getMessaging=()=>({});export const getToken=async()=>"fcm-token-prueba";export const onMessage=()=>{};export const isSupported=async()=>true;`,
};
