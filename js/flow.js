'use strict';
/* flow.js — Flujo del modo infinito: rondas, mejoras y premios */
/* ============ flujo infinito ============ */
function startInf(){
  resetBattle();mode='inf';runXP0=XP;infN=1;runT=0;picksLeft=1;prize=0;RL={};ST.g++;team=[newMember(true)];
  hideScreens();$('rosL').style.display=$('rosR').style.display='';nextInfRound();
}
function nextInfRound(){
  bteam=genInfEnemy(infN);offers=genUpgrades();TH=THEMES[(((infN-1)/5)|0)%5];
  st='choose';buildArena();if(needSpec())showSpecPick();else showCards();updatePips();
  if(infN%10===0)banner('👹 ¡JEFE! RONDA '+infN,'#ff6b6b');else banner('RONDA '+infN,'#ffe08a');snapRun('choose');
}
function showCards(){
  icons.length=0;
  $('ptitle').textContent=prize?'🎁 Premio del jefe ('+(prize-picksLeft+1)+'/'+prize+') · ¡Elige una mejora!':'Ronda '+infN+(infN%10===0?' · ¡JEFE!':'')+' · ¡Elige una mejora!';
  const box=$('cards');box.innerHTML='';box.classList.remove('tgt');
  offers.forEach((o,i)=>{
    const u=UPG[o.id],d=document.createElement('div');d.className='card'+(o.id==='robot'||o.id==='titan'?' up':'');
    d.innerHTML='<canvas class="ic"></canvas>'+'<div class="nm">'+u.n+'</div><div class="ds">'+u.d+'</div>'+(u.sp?'<div class="lv">'+SPECS[u.sp].n+' · nivel '+(((heroOf().l[o.id])||0)+1)+'/'+u.max+'</div>'+((((heroOf().l[o.id])||0)+1)>=u.max?'<div class="ult">★ DEFINITIVA: '+ULT[o.id].n+'<small>'+ULT[o.id].d+'</small></div>':''):'');
    if(u.sp)d.style.borderColor=SPECS[u.sp].col;
    const isU=!!(u.sp&&((heroOf().l[o.id]||0)+1)>=u.max);if(isU)d.classList.add('ultc');
    d.onclick=()=>pick(i);box.appendChild(d);
    icons.push({cv:d.querySelector('canvas'),spec:()=>isU?ultSpec(o.id):objSpec(o.id)});
  });
  $('panel').classList.add('on');
}
function pick(i){
  if(st!=='choose')return;
  ensureAudio();snd.click();
  const k=offers[i].id;
  const targets=k==='flock'?[team.find(m=>m.hero)]:team.filter(m=>canUpg(m,k));
  if(targets.length===1){applyTo(targets[0],k);proceed();return;}
  st='target';icons.length=0;
  $('ptitle').textContent='¿A quién le das «'+UPG[k].n+'»?';
  const box=$('cards');box.innerHTML='';box.classList.add('tgt');box.scrollTop=0;
  targets.forEach(m=>{
    const d=document.createElement('div');d.className='card';
    d.innerHTML='<canvas class="ic"></canvas><div class="nm">'+memberName(m)+(m.hero?' ⭐':'')+'</div><div class="ds">'+memberDesc(m)+'</div>';
    d.onclick=()=>{if(st!=='target')return;ensureAudio();snd.click();applyTo(m,k);proceed();};
    box.appendChild(d);icons.push({cv:d.querySelector('canvas'),spec:()=>memberSpec(m)});
  });
}
function proceed(){
  if(picksLeft>1){picksLeft--;offers=genUpgrades();st='choose';icons.length=0;showCards();snapRun('choose');return;}
  prize=0;picksLeft=1;snapRun('fight');
  st='intro';$('panel').classList.remove('on');icons.length=0;buildArena();
  later(()=>{if(st==='intro')startFight();},1500);
}
let phoenixLost=[];
function startFight(){
  phoenixLost=[];st='fight';fightT=0;fightEnd=false;endT=0;
  units.forEach(u=>{u.state='idle';u.cd=Math.random()*0.5;u.spawnT=1;u.y=0;u.alpha=1;});
  banner('¡PELEA!','#ff6b6b');tone(200,400,0.2,'sawtooth',0.05);
}
function panelButton(title,label,fn){
  icons.length=0;$('ptitle').textContent=title;$('cards').innerHTML='';$('cards').classList.remove('tgt');
  const b=document.createElement('button');b.className='btn';b.textContent=label;
  b.onclick=()=>{ensureAudio();snd.click();$('panel').classList.remove('on');fn();};
  $('cards').appendChild(b);$('panel').classList.add('on');
}
function roundOver(pw){
  st='rounddone';
  if(pw){
    snd.win();banner(infN%10===0?'¡JEFE DERROTADO!':'¡RONDA '+infN+' SUPERADA!','#7bed9f');
    if(infN>BEST)BEST=infN;saveProg();awardXP(1+rl('xp'),true);ST.r++;if(infN%10===0)ST.b++;achCheck();saveStats();snapRun('won');
    later(()=>winPanel(phoenixLost.length?'¡Ganaste! Pero perdiste el Huevo fénix de '+[...new Set(phoenixLost)].map(memberName).join(' y '):null),1800);
  }else{
    snd.lose();banner('¡HAS CAÍDO!','#ff6b6b');saveProg();clearRun();saveStats();
    later(()=>{
      st='levelend';const rs=infN-1;
      setModal('<div class="big">🐔💀</div><h1>Fin de la partida</h1><p>Superaste <b>'+rs+'</b> '+(rs===1?'ronda':'rondas')+(rs>0&&rs>=BEST?' · ¡NUEVO RÉCORD! 🏆':'')+'<br>Récord: '+BEST+'</p>'+xpEndHTML(),[{t:'Jugar otra vez',f:startInf}].concat(ONLINE?[{t:'🏆 Ranking',cls:'alt',f:showRanking}]:[]).concat([{t:'Menú',cls:'alt',f:showMenu}]));
    },2200);
  }
}
