'use strict';
/* account.js — Nivel de cuenta, XP, skins y perfil */
/* ============ nivel de cuenta ============ */
let XP=0,SKIN='classic',UID='guest',runXP0=0,CNAME='';
let RL={},ST={k:0,b:0,r:0,g:0,rl:0,kb:{}},achPrev=null,simming=false;
const rl=k=>RL[k]||0;
function pj(x){try{const o=JSON.parse(x);return o&&typeof o==='object'?o:null;}catch(e){return null;}}
const stN=v=>Math.max(0,Math.min(1e9,Math.floor(+v||0)));
function stClean(o){const r={k:stN(o&&o.k),b:stN(o&&o.b),r:stN(o&&o.r),g:stN(o&&o.g),rl:stN(o&&o.rl),kb:{}};KEYS.forEach(k=>{r.kb[k]=stN(o&&o.kb&&o.kb[k]);});return r;}
function stMax(a,b){const x=stClean(a),y=stClean(b);['k','b','r','g','rl'].forEach(f=>{x[f]=Math.max(x[f],y[f]);});KEYS.forEach(k=>{x.kb[k]=Math.max(x.kb[k],y.kb[k]);});return x;}
const cleanName=v=>String(v||'').replace(/[<>&"'`\\]/g,'').replace(/\s+/g,' ').slice(0,12).trim();
const lvNeed=L=>Math.round(4+1.5*L+0.12*L*L);
function lvInfo(xp){let L=1;xp=Math.max(0,Math.floor(+xp||0));while(xp>=lvNeed(L)){xp-=lvNeed(L);L++;}return{L,cur:xp,need:lvNeed(L)};}
const lvOf=xp=>lvInfo(xp).L;
const TITLES=[[1,'Polluelo'],[3,'Pollo valiente'],[6,'Gallina brava'],[10,'Gallo de pelea'],[15,'Campeón del corral'],[20,'Gran maestro'],[30,'Leyenda del Asadero'],[40,'Mito emplumado'],[50,'Dios del Asadero']];
function titleOf(L){let t=TITLES[0][1];TITLES.forEach(a=>{if(L>=a[0])t=a[1];});return t;}
function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function lsSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}
function loadProfile(uid,data,pd){
  UID=uid;CNAME=cleanName(pd&&typeof pd.name==='string'&&pd.name?pd.name:lsGet('asadero_name_'+uid));
  ST=stMax(pj(lsGet('asadero_st_'+uid)),pd&&pd.st);
  shopLoad(pd&&pd.st&&pd.st.sh);
  {const a=pj(lsGet('asadero_run_'+uid)),b=pj(pd&&pd.run);if(b&&(!a||(b.ts||0)>(a.ts||0)))lsSet('asadero_run_'+uid,JSON.stringify(b));}
  const lx=Math.floor(+lsGet('asadero_xp_'+uid)||0),cx=Math.floor(+(data&&data.xp)||0);
  XP=Math.max(lx,cx);
  const sk=(data&&data.skin)||lsGet('asadero_skin_'+uid)||'classic',L=lvOf(XP);
  SKIN=SKINS.some(x=>x.id===sk&&(L>=x.lvl||SH.own[x.id]))?sk:'classic';
  achPrev=achSet();
}
function saveProfile(){
  lsSet('asadero_xp_'+UID,XP);lsSet('asadero_skin_'+UID,SKIN);lsSet('asadero_name_'+UID,CNAME);
  if(!ONLINE||!fbAuth.currentUser||BEST<1)return;
  fbDb.collection('ranking').doc(fbAuth.currentUser.uid).update({xp:XP,skin:SKIN}).catch(e=>console.warn('Perfil no guardado en la nube',e&&e.code));
}
function toast(t){const e=$('toast');e.innerHTML=t;e.classList.add('show');clearTimeout(toast.h);toast.h=setTimeout(()=>e.classList.remove('show'),4200);}
function unlocksBetween(a,b){
  const g=[];
  for(let l=a+1;l<=b;l++){
    SKINS.forEach(x=>{if(x.lvl===l)g.push('🎨 Skin «'+x.n+'»');});
    TITLES.forEach(t=>{if(t[0]===l)g.push('🏅 Título «'+t[1]+'»');});
  }
  return g;
}
function awardXP(n,silent){
  const a=lvOf(XP);XP+=n;const b=lvInfo(XP);
  if(silent){lsSet('asadero_xp_'+UID,XP);setTimeout(saveProfile,1500);return;}
  if(b.L>a){
    const g=[];
    for(let l=a+1;l<=b.L;l++){
      SKINS.forEach(x=>{if(x.lvl===l)g.push('🎨 Skin «'+x.n+'»');});
      TITLES.forEach(t=>{if(t[0]===l)g.push('🏅 Título «'+t[1]+'»');});
    }
    toast('🎉 ¡NIVEL '+b.L+'!'+(g.length?'<br><small>'+g.join(' · ')+'</small>':''));
  }else toast('⭐ +'+n+' XP · Nivel '+b.L+' ('+b.cur+'/'+b.need+')');
  lsSet('asadero_xp_'+UID,XP);
  setTimeout(saveProfile,1500);
}
function xpEndHTML(){
  const gained=XP-runXP0,l0=lvOf(runXP0),l1=lvOf(XP),g=unlocksBetween(l0,l1);
  let h='<div class="lvbox" style="margin-bottom:14px">⭐ Experiencia ganada: <em>+'+gained+' XP</em>';
  if(l1>l0)h+='<br>🎉 ¡Subes al nivel <em>'+l1+'</em>!'+(g.length?'<br><small>'+g.join(' · ')+'</small>':'');
  return h+'<div class="xpbar"><i style="width:'+Math.round(lvInfo(XP).cur/lvInfo(XP).need*100)+'%"></i></div><small>Nivel '+l1+' · '+lvInfo(XP).cur+' / '+lvInfo(XP).need+' XP</small></div>';
}
function profHTML(){
  const i=lvInfo(XP),pc=Math.round(i.cur/i.need*100);
  return '<div class="lvbox">⭐ Nivel <em>'+i.L+'</em> · '+titleOf(i.L)+'<div class="xpbar"><i style="width:'+pc+'%"></i></div><small>'+i.cur+' / '+i.need+' XP para el nivel '+(i.L+1)+'</small></div>';
}
function showProfile(){
  hideScreens();closeStats();
  const L=lvOf(XP),nx=SKINS.find(x=>x.lvl>L);
  setModal('<div class="big">👤</div><h1>Tu perfil</h1>'+profHTML()+'<p style="margin-bottom:8px">Cada ronda que superas = <b>1 XP</b>.'+(nx?'<br>Próxima skin: <b>'+nx.n+'</b> (nivel '+nx.lvl+')':'<br>¡Tienes todas las skins!')+'</p><input class="inp" id="cname" maxlength="12" placeholder="Ponle nombre a tu pollo" autocomplete="off" spellcheck="false" value="'+CNAME+'" style="margin-bottom:10px"><div class="skg" id="skg"></div>',[{t:'Volver',cls:'alt',f:showMenu}]);
  $('cname').oninput=e=>{CNAME=cleanName(e.target.value);lsSet('asadero_name_'+UID,CNAME);cloudProfile();};
  const box=$('skg');
  SKINS.forEach(sk=>{
    const ok=L>=sk.lvl,d=document.createElement('div');
    d.className='sk'+(sk.id===SKIN?' sel':'')+(ok?'':' lock');
    d.innerHTML='<canvas class="ic"></canvas><div class="nm">'+sk.n+'</div><div class="ds">'+(ok?(sk.id===SKIN?'✅ Puesta':sk.d):'🔒 Nivel '+sk.lvl)+'</div>';
    if(ok)d.onclick=()=>{ensureAudio();snd.click();SKIN=sk.id;saveProfile();showProfile();};
    box.appendChild(d);icons.push({cv:d.querySelector('canvas'),spec:()=>skinSpec(sk.id)});
  });
}
