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
  if(bz){const ro=relOffer();if(ro.length){startRelic(ro);return;}}
  infN++;prize=bz?2:0;picksLeft=bz?2:1;nextInfRound();
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
  infN++;prize=2;picksLeft=2;nextInfRound();
}
