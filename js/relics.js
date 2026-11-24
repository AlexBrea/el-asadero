'use strict';
/* relics.js — Reliquias de jefe y menú de reliquias */
/* ============ menú ============ */
/* ============ reliquias de jefe, logros y partida guardada ============ */
const REL={
 dmg:{e:'🦅',n:'Pluma de águila',d:'+20% de daño a todo tu equipo',max:3},
 hp:{e:'🪨',n:'Corazón de piedra',d:'+25% de vida a todo tu equipo',max:3},
 spd:{e:'👟',n:'Espuelas veloces',d:'Atacan y corren un 10% más rápido',max:3},
 crit:{e:'🍀',n:'Trébol de la suerte',d:'+12% de probabilidad de crítico (x3 daño)',max:3},
 vamp:{e:'🦷',n:'Colmillo de lobo',d:'Roban vida: 8% del daño que hacen',max:3},
 regen:{e:'🍲',n:'Caldo de la abuela',d:'Regeneran un 2% de su vida por segundo',max:3},
 rev:{e:'🪽',n:'Segundo aliento',d:'Cada uno revive una vez por ronda con la mitad de vida',max:1},
 xp:{e:'🏆',n:'Copa dorada',d:'+1 XP de cuenta por cada ronda superada',max:3},
 chick:{e:'🥚',n:'Huevo de la suerte',d:'Un pollito aliado más se une al equipo',max:3}
};
function relOffer(){
  const av=Object.keys(REL).filter(k=>rl(k)<REL[k].max);
  for(let i=av.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[av[i],av[j]]=[av[j],av[i]];}
  return av.slice(0,3);
}
function winPanel(msg){
  const bz=infN%10===0,hr=bz&&relOffer().length>0;
  panelButton(msg||'¡Bien! Sigue mejorando a tu equipo',bz?(hr?'Reclamar reliquia 🏺':'Reclamar 2 mejoras 🎁'):'Elegir mejora ▶',advance);
}
function advance(){
  const bz=infN%10===0;
  if(bz){const ro=relOffer();if(ro.length){startRelic(ro);return;}afterBoss();return;}
  infN++;prize=0;picksLeft=1;nextInfRound();
}
function toNext(){infN++;prize=2;picksLeft=2;nextInfRound();}
/* ===== apuesta de reliquias (ronda 20): 50% ganas una más, 50% pierdes todas ===== */
const GAMBLE_AT=20;
const relCount=()=>Object.keys(REL).reduce((t,k)=>t+rl(k),0);
const gambleOK=()=>relCount()>=2&&Object.keys(REL).some(k=>rl(k)<REL[k].max);
function afterBoss(){if(infN===GAMBLE_AT&&gambleOK()){startGamble();}else toNext();}
function startGamble(){st='gamble';snapRun('gamble');showGamble();}
function resumeGamble(){if(infN===GAMBLE_AT&&gambleOK()){buildArena();updatePips();startGamble();}else toNext();}
function showGamble(){
  icons.length=0;const n=relCount();
  $('ptitle').textContent='🎲 ¡Apuesta! Juégate tus '+n+' reliquias para conseguir 1 más';
  const box=$('cards');box.innerHTML='';box.classList.remove('tgt');
  const mk=(e,nm,ds,fn,cls)=>{const d=document.createElement('div');d.className='card '+cls;d.innerHTML='<div class="em" style="height:clamp(54px,11vh,92px);display:grid;place-items:center;font-size:clamp(38px,9vw,60px)">'+e+'</div><div class="nm">'+nm+'</div><div class="ds">'+ds+'</div>';d.onclick=fn;box.appendChild(d);};
  mk('🎲','Apostar','50%: ganas 1 reliquia al azar ('+(n+1)+' en total)<br>50%: pierdes las '+n+' que tienes',betRelics,'up');
  mk('✋','Quedármelas','Sigues con tus '+n+' reliquias y continúas la partida',()=>{if(st!=='gamble')return;ensureAudio();snd.click();$('panel').classList.remove('on');toNext();},'');
  $('panel').classList.add('on');
}
function betRelics(){
  if(st!=='gamble')return;
  ensureAudio();snd.click();st='gambling';
  const n=relCount(),win=Math.random()<0.5;let got=null;
  /* el resultado se decide y se guarda ya, para que recargar la página no sirva de nada */
  if(win){
    const av=Object.keys(REL).filter(k=>rl(k)<REL[k].max);got=av[(Math.random()*av.length)|0];
    RL[got]=rl(got)+1;ST.rl++;if(got==='chick')team.push(newMember(false));
  }else{
    for(let i=rl('chick');i>0;i--){const j=team.map(m=>m.hero).lastIndexOf(false);if(j>=0)team.splice(j,1);}
    RL={};
  }
  achCheck();saveStats();snapRun('gamble');updateRosters();
  icons.length=0;$('ptitle').textContent='🎲 Lanzando...';
  const box=$('cards');box.innerHTML='<div style="font-size:clamp(54px,14vw,96px);line-height:1.1" id="dice">🎲</div>';
  const faces=Object.keys(REL).map(k=>REL[k].e);let f=0;
  const iv=setInterval(()=>{const d=$('dice');if(d)d.textContent=f++%2?'🎲':faces[(Math.random()*faces.length)|0];tone(300+Math.random()*500,500,0.05,'square',0.03);},110);
  const runId0=runId;
  later(()=>{
    clearInterval(iv);if(runId!==runId0)return;
    st='gambleres';
    if(win){
      snd.win();banner('¡GANASTE!','#7bed9f');
      panelButton('🎉 ¡Has ganado '+REL[got].e+' '+REL[got].n+'!  Ahora tienes '+relCount()+' reliquias',gambleOK()?'Seguir ▶':'Continuar ▶',()=>{if(gambleOK()){st='gamble';snapRun('gamble');showGamble();}else toNext();});
    }else{
      snd.lose();banner('¡LO PERDISTE TODO!','#ff6b6b');
      panelButton('💥 Has perdido tus '+n+' reliquias','Continuar ▶',toNext);
    }
  },1700);
}
function showRelics(ids){
  icons.length=0;
  $('ptitle').textContent='🏺 ¡Reliquia del jefe! Elige una (dura toda la partida)';
  const box=$('cards');box.innerHTML='';box.classList.remove('tgt');
  ids.forEach(id=>{
    const r=REL[id],lv=rl(id),d=document.createElement('div');d.className='card up';
    d.innerHTML='<div class="em" style="height:clamp(54px,11vh,92px);display:grid;place-items:center;font-size:clamp(38px,9vw,60px)">'+r.e+'</div><div class="nm">'+r.n+'</div><div class="ds">'+r.d+'</div>'+(lv?'<div class="lv">Ya tienes ×'+lv+'</div>':'');
    d.onclick=()=>pickRelic(id);box.appendChild(d);
  });
  $('panel').classList.add('on');
}
function startRelic(ids){st='relic';snapRun('relic',{ro:ids});showRelics(ids);}
function pickRelic(id){
  if(st!=='relic')return;
  ensureAudio();snd.click();
  RL[id]=rl(id)+1;ST.rl++;if(id==='chick')team.push(newMember(false));
  toast('🏺 '+REL[id].e+' '+REL[id].n+(RL[id]>1?' ×'+RL[id]:''));
  achCheck();saveStats();
  $('panel').classList.remove('on');icons.length=0;
  afterBoss();
}
