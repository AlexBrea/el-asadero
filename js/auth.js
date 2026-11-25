'use strict';
/* auth.js — Login, registro y ranking (Firebase) */
/* ============ login, registro y ranking (Firebase) ============ */
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let fbAuth=null,fbDb=null,USER=null;
const FBOK=(typeof firebase!=='undefined')&&(typeof FIREBASE_CONFIG!=='undefined')&&FIREBASE_CONFIG&&FIREBASE_CONFIG.apiKey&&FIREBASE_CONFIG.apiKey.indexOf('PEGA')<0;
if(FBOK){try{firebase.initializeApp(FIREBASE_CONFIG);fbAuth=firebase.auth();fbDb=firebase.firestore();}catch(e){console.error(e);}}
const ONLINE=!!fbAuth;
const mailOf=u=>u+'@elasadero.game';
const cleanUser=u=>(u||'').trim().toLowerCase();
const validUser=u=>/^[a-z0-9_]{3,16}$/.test(u);
function authError(e){
  const c=(e&&e.code)||'';
  if(c==='auth/email-already-in-use')return 'Ese usuario ya existe. Prueba con otro nombre.';
  if(c==='auth/weak-password')return 'La contraseña es muy débil (mínimo 6 caracteres).';
  if(c==='auth/user-not-found'||c==='auth/wrong-password'||c==='auth/invalid-credential'||c==='auth/invalid-login-credentials')return 'Usuario o contraseña incorrectos.';
  if(c==='auth/too-many-requests')return 'Demasiados intentos. Espera un momento y prueba otra vez.';
  if(c==='auth/network-request-failed')return 'Sin conexión. Revisa tu internet.';
  if(c==='auth/operation-not-allowed')return 'Falta activar Email/Contraseña en Firebase Authentication.';
  return 'Ha ocurrido un error ('+(c||'desconocido')+').';
}
function formModal(title,sub,fields,btns,msg){
  let h='<div class="big">🐔</div><h1>'+title+'</h1><p>'+sub+'</p>';
  fields.forEach(f=>{h+='<input class="inp" id="'+f.id+'" type="'+(f.pw?'password':'text')+'" placeholder="'+f.ph+'" autocomplete="'+f.ac+'" maxlength="'+(f.pw?64:16)+'" autocapitalize="none" spellcheck="false">';});
  h+='<div class="err" id="ferr">'+(msg?esc(msg):'')+'</div>';
  setModal(h,btns);
  const first=btns[0];
  fields.forEach(f=>{$(f.id).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();first.f();}});});
  setTimeout(()=>{try{$(fields[0].id).focus();}catch(e){}},50);
}
const ferr=t=>{const e=$('ferr');if(e)e.textContent=t;};
function showLogin(msg){
  resetBattle();mode='menu';hideScreens();closeStats();$('rosL').style.display=$('rosR').style.display='none';$('pips').innerHTML='';
  formModal('EL ASADERO','Inicia sesión para jugar y aparecer en el ranking.',[{id:'fu',ph:'Usuario',ac:'username'},{id:'fp',ph:'Contraseña',ac:'current-password',pw:1}],[
    {t:'Entrar',f:doLogin},{t:'Crear cuenta',cls:'alt',f:()=>showRegister()}],msg);
}
function showRegister(msg){
  formModal('Crear cuenta','Elige un nombre de usuario (3-16 letras, números o _) y una contraseña.',[{id:'fu',ph:'Usuario',ac:'username'},{id:'fp',ph:'Contraseña (mín. 6)',ac:'new-password',pw:1},{id:'fp2',ph:'Repite la contraseña',ac:'new-password',pw:1}],[
    {t:'Registrarme',f:doRegister},{t:'Ya tengo cuenta',cls:'alt',f:()=>showLogin()}],msg);
}
function doLogin(){
  const u=cleanUser($('fu').value),p=$('fp').value;
  if(!validUser(u)||!p)return ferr('Escribe tu usuario y tu contraseña.');
  ferr('Entrando…');
  fbAuth.signInWithEmailAndPassword(mailOf(u),p).catch(e=>ferr(authError(e)));
}
function doRegister(){
  const u=cleanUser($('fu').value),p=$('fp').value,p2=$('fp2').value;
  if(!validUser(u))return ferr('El usuario debe tener 3-16 caracteres: letras, números o _.');
  if(p.length<6)return ferr('La contraseña debe tener al menos 6 caracteres.');
  if(p!==p2)return ferr('Las contraseñas no coinciden.');
  ferr('Creando cuenta…');
  fbAuth.createUserWithEmailAndPassword(mailOf(u),p).catch(e=>ferr(authError(e)));
}
function buildStr(){
  const nm=m=>m.hero?'Gallina':'Pollito';
  const parts=team.map(m=>{
    const a=Object.keys(m.l).filter(k=>m.l[k]&&UPG[k]).map(k=>UPG[k].n+' '+m.l[k]);
    if(m.t)a.unshift(m.t===1?'Robot':'Titán');
    return nm(m)+(a.length?': '+a.join(', '):'');
  });
  return parts.join(' | ').slice(0,380);
}
function cloudSave(){
  if(!ONLINE||!fbAuth.currentUser||!USER||BEST<1)return;
  const ref=fbDb.collection('ranking').doc(fbAuth.currentUser.uid),ts=firebase.firestore.FieldValue.serverTimestamp(),best=BEST;
  const add=Math.floor(pend),run=Math.round(runT),bs=buildStr();
  ref.get().then(d=>{
    if(!d.exists)return ref.set({username:USER,best:best,updatedAt:ts,playSec:add,runSec:run,build:bs}).then(()=>{pend-=add;});
    const o=d.data(),u={playSec:(o.playSec||0)+add};
    if(o.best<best){u.best=best;u.updatedAt=ts;u.runSec=run;u.build=bs;}
    return ref.update(u).then(()=>{pend-=add;});
  }).catch(e=>console.error('No se pudo guardar el ranking',e));
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){cloudProfile(true);if(mode==='inf')cloudSave();}});
const fmtT=s=>{s=Math.round(s||0);if(s<60)return s+' s';const m=Math.floor(s/60);if(m<60)return m+' min';return Math.floor(m/60)+' h '+(m%60)+' min';};
function showRanking(){
  hideScreens();
  setModal('<div class="big">🏆</div><h1>Ranking</h1><div class="rank" id="rk">Cargando…</div>',[{t:'Cerrar',cls:'alt',f:showMenu}]);
  fbDb.collection('ranking').orderBy('best','desc').limit(25).get().then(snap=>{
    if(snap.empty){$('rk').textContent='Todavía no hay nadie. ¡Sé el primero!';return;}
    let h='',i=0;const me=fbAuth.currentUser&&fbAuth.currentUser.uid;
    snap.forEach(d=>{const x=d.data();if(!x.best)return;i++;
      h+='<div class="rk'+(d.id===me?' me':'')+'"><span>'+(i===1?'🥇':i===2?'🥈':i===3?'🥉':'#'+i)+'</span><span class="nmu">'+esc(x.username)+(x.xp?'<span class="tm">⭐ Nv '+lvOf(x.xp)+'</span>':'')+(x.playSec?'<span class="tm">⏱ '+fmtT(x.playSec)+'</span>':'')+'</span><b>Ronda '+esc(x.best)+'</b>'
       +'<div class="rkd">'+(x.runSec?'Llegó a la ronda '+esc(x.best)+' en <b>'+fmtT(x.runSec)+'</b> de partida.<br>':'')+(x.build?esc(x.build):'<i>Sin datos de mejoras (partida anterior).</i>')+'</div></div>';});
    $('rk').innerHTML=h||'Todavía no hay nadie. ¡Sé el primero!';
    document.querySelectorAll('#rk .rk').forEach(el=>el.onclick=()=>el.classList.toggle('open'));
  }).catch(e=>{$('rk').textContent='No se pudo cargar el ranking.';console.error(e);});
}
function boot(){
  if(!ONLINE){USER='Invitado';loadProfile('guest',null);showMenu();return;}
  fbAuth.onAuthStateChanged(user=>{
    if(!user){USER=null;BEST=0;XP=0;SKIN='classic';showLogin();return;}
    USER=(user.email||'').split('@')[0];
    Promise.all([fbDb.collection('ranking').doc(user.uid).get(),fbDb.collection('players').doc(user.uid).get().catch(()=>null)]).then(([d,pl])=>{BEST=d.exists?(d.data().best||0):0;loadProfile(user.uid,d.exists?d.data():null,pl&&pl.exists?pl.data():null);}).catch(()=>{BEST=0;loadProfile(user.uid,null);}).then(showMenu);
  });
}
