'use strict';
/* cloud.js — Datos en la nube (nombre, estadísticas) y partida guardada */
/* datos en la nube (privados) + partida en curso */
let cpT=0;
function saveStats(){lsSet('asadero_st_'+UID,JSON.stringify(ST));cloudProfile();}
function cloudProfile(now){
  if(!ONLINE||!fbAuth.currentUser)return Promise.resolve();
  clearTimeout(cpT);
  const go=()=>fbDb.collection('players').doc(fbAuth.currentUser.uid).set({name:CNAME,st:ST,run:lsGet('asadero_run_'+UID)||'',ts:Date.now()}).catch(e=>console.warn('Datos no guardados en la nube',e&&e.code));
  if(now)return go();
  cpT=setTimeout(()=>{if(fbAuth.currentUser)go();},2500);
  return Promise.resolve();
}
function doSignOut(){
  if(!ONLINE)return;
  Promise.race([cloudProfile(true),new Promise(r=>setTimeout(r,2500))]).then(()=>fbAuth.signOut());
}
function getRun(){return pj(lsGet('asadero_run_'+UID));}
function snapRun(ph,extra){
  if(mode!=='inf')return;
  const o={v:1,ts:Date.now(),ph,n:infN,rt:Math.round(runT),pk:picksLeft,pz:prize,rl:RL,tm:team.map(m=>({hero:m.hero?1:0,t:m.t,l:m.l,sp:m.spec||''}))};
  if(extra)Object.assign(o,extra);
  lsSet('asadero_run_'+UID,JSON.stringify(o));cloudProfile();
}
function clearRun(){lsSet('asadero_run_'+UID,JSON.stringify({ts:Date.now(),x:1}));cloudProfile();}
function newGame(){
  const r=getRun();
  if(r&&!r.x&&r.tm&&!confirm('Tienes una partida guardada. Si empiezas una nueva se perderá. ¿Seguro?'))return;
  startInf();
}
function resumeRun(){
  const s=getRun();
  if(!s||s.x||!Array.isArray(s.tm)||!s.tm.some(m=>m&&m.hero)||!(s.n>=1))return startInf();
  resetBattle();mode='inf';runXP0=XP;infN=Math.min(9999,s.n|0);runT=Math.max(0,+s.rt||0);
  picksLeft=s.pk===2?2:1;prize=s.pz===2?2:0;
  RL={};Object.keys(REL).forEach(k=>{const v=Math.max(0,Math.min(REL[k].max,(s.rl&&s.rl[k])|0));if(v)RL[k]=v;});
  let hero=false;
  team=s.tm.slice(0,40).filter(m=>m&&(m.hero?!hero&&(hero=true):true)).map(m=>{
    const l={};Object.keys(UPG).forEach(k=>{const v=Math.max(0,Math.min(UPG[k].max,(m.l&&m.l[k])|0));if(v)l[k]=v;});
    const o={k:m.hero?'chicken':'chick',hero:!!m.hero,t:Math.max(0,Math.min(2,m.t|0)),l,base:m.hero?1:0.55,fresh:true,skin:m.hero?SKIN:null};
    if(m.hero&&SPECS[m.sp])o.spec=m.sp;
    else Object.keys(l).forEach(k=>{if(UPG[k].sp)delete l[k];});
    return o;
  });
  hideScreens();$('rosL').style.display=$('rosR').style.display='';
  TH=THEMES[(((infN-1)/5)|0)%5];bteam=genInfEnemy(infN);
  const ro=Array.isArray(s.ro)?s.ro.filter(k=>REL[k]&&rl(k)<REL[k].max):[];
  if(s.ph==='gamble'){resumeGamble();}
  else if(s.ph==='relic'&&ro.length){buildArena();updatePips();startRelic(ro);}
  else if(s.ph==='won'||s.ph==='relic'){st='rounddone';buildArena();updatePips();winPanel();}
  else if(s.ph==='fight'){st='intro';buildArena();updatePips();banner('RONDA '+infN,'#ffe08a');later(()=>{if(st==='intro')startFight();},1500);}
  else{offers=genUpgrades();st='choose';buildArena();if(needSpec())showSpecPick();else showCards();updatePips();banner(infN%10===0?'👹 ¡JEFE! RONDA '+infN:'RONDA '+infN,infN%10===0?'#ff6b6b':'#ffe08a');}
}

function showMenu(){
  if(mode==='inf')cloudSave();
  resetBattle();mode='menu';TH=THEMES[0];hideScreens();closeStats();
  $('lvl').innerHTML='EL ASADERO<small>Rondas infinitas</small>';$('pips').innerHTML='';$('rosL').style.display=$('rosR').style.display='none';
  const a=newMember(true);a.fresh=false;team=[a];bteam=[{k:'gorilla',t:0},{k:'cat',t:0}];buildArena();units.forEach(u=>u.spawnT=1);team=[];bteam=[];
  const rn=getRun(),hasRun=!!(rn&&!rn.x&&rn.tm),btns=[...(hasRun?[{t:'▶ Continuar · ronda '+rn.n,f:resumeRun}]:[]),{t:hasRun?'🆕 Nueva partida':'¡JUGAR!',f:newGame},{t:'🏅 Logros',cls:'alt',f:showAch},{t:'👤 Perfil',cls:'alt',f:showProfile}];
  if(ONLINE){btns.push({t:'🏆 Ranking',cls:'alt',f:showRanking});btns.push({t:'Salir',cls:'alt',f:doSignOut});}
  setModal('<div class="big">🐔⚔️🦍</div><h1>EL ASADERO</h1>'+profHTML()+'<p>Empiezas con <b>una sola gallina</b>. Cada ronda eliges una mejora: ataques especiales como el pico de oro, rayos láser o huevos explosivos.<br>Los pollitos que te ayudan también se pueden mejorar. ¿Hasta qué ronda llegas?<br><br>'+(ONLINE?'Jugador: <b>'+esc(USER)+'</b>'+(BEST?' · 🏆 récord: <b>'+BEST+'</b>':''):'<small>Modo sin conexión: no se guarda el ranking</small>')+'</p>',btns);
}
function goHome(){showMenu();}
