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
/* ===== apuesta de reliquias (tras cada jefe: rondas 10, 20, 30...): 50% ganas una más, 50% pierdes todas ===== */
const isGambleRound=()=>infN>=10&&infN%10===0;
const relTxt=n=>n===1?'tu reliquia':'tus '+n+' reliquias';
const relCount=()=>Object.keys(REL).reduce((t,k)=>t+rl(k),0);
const gambleOK=()=>relCount()>=1&&Object.keys(REL).some(k=>rl(k)<REL[k].max);
function afterBoss(){if(isGambleRound()&&gambleOK()){startGamble();}else toNext();}
function startGamble(){st='gamble';snapRun('gamble');showGamble();}
function resumeGamble(){if(isGambleRound()&&gambleOK()){buildArena();updatePips();startGamble();}else toNext();}
function showGamble(){
  icons.length=0;const n=relCount();
  $('ptitle').textContent='🎲 ¡Apuesta! Juégate '+relTxt(n)+' para conseguir 1 más';
  const box=$('cards');box.innerHTML='';box.classList.remove('tgt');
  const mk=(e,nm,ds,fn,cls)=>{const d=document.createElement('div');d.className='card '+cls;d.innerHTML='<div class="em" style="height:clamp(54px,11vh,92px);display:grid;place-items:center;font-size:clamp(38px,9vw,60px)">'+e+'</div><div class="nm">'+nm+'</div><div class="ds">'+ds+'</div>';d.onclick=fn;box.appendChild(d);};
  mk('🎲','Apostar','50%: ganas 1 reliquia al azar ('+(n+1)+' en total)<br>50%: pierdes '+(n===1?'la que tienes':'las '+n+' que tienes'),betRelics,'up');
  mk('✋','Quedármelas','Sigues con '+relTxt(n)+' y continúas la partida',()=>{if(st!=='gamble')return;ensureAudio();snd.click();$('panel').classList.remove('on');toNext();},'');
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
  icons.length=0;$('ptitle').textContent='🎰 ¡Gira la ruleta! Verde = ganas · Rojo = lo pierdes todo';
  /* ruleta: 10 sectores que alternan verde/rojo (50% cada color); el puntero está arriba */
  const N=10,sg=360/N,box=$('cards');box.classList.remove('tgt');
  const seg=[];for(let i=0;i<N;i++)if((i%2===0)===win)seg.push(i);
  const idx=seg[(Math.random()*seg.length)|0],off=sg*(0.18+Math.random()*0.64),turns=5+((Math.random()*2)|0);
  const R=360*turns-(idx*sg+off);
  let paths='';
  for(let i=0;i<N;i++){
    const a0=(i*sg-90)*Math.PI/180,a1=((i+1)*sg-90)*Math.PI/180,am=((i+0.5)*sg-90)*Math.PI/180,r=100;
    paths+='<path d="M0 0 L'+(r*Math.cos(a0)).toFixed(2)+' '+(r*Math.sin(a0)).toFixed(2)+' A'+r+' '+r+' 0 0 1 '+(r*Math.cos(a1)).toFixed(2)+' '+(r*Math.sin(a1)).toFixed(2)+'Z" fill="'+(i%2===0?'#2fbf5a':'#e0414f')+'" stroke="#1b1330" stroke-width="2.5"/>';
  }
  box.innerHTML='<div style="display:flex;flex-direction:column;align-items:center;gap:8px"><div id="wheelw" style="position:relative;width:min(36vh,230px);height:min(36vh,230px)">'
    +'<svg id="wheel" viewBox="-104 -104 208 208" style="width:100%;height:100%;transform:rotate(0deg);filter:drop-shadow(0 5px 6px #0009)">'+paths+'<circle r="14" fill="#ffd24a" stroke="#1b1330" stroke-width="3"/></svg>'
    +'<svg viewBox="-104 -104 208 208" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"><path d="M-9 -110 L9 -110 L0 -88Z" fill="#ffd24a" stroke="#1b1330" stroke-width="3" stroke-linejoin="round"/></svg></div><div id="wres" style="min-height:48px"></div></div>';
  const wh=$('wheel');void wh.getBoundingClientRect();
  wh.style.transition='transform 3.4s cubic-bezier(.12,.62,.08,1)';wh.style.transform='rotate('+R+'deg)';
  let lastK=-1;
  const iv=setInterval(()=>{const w=$('wheel');if(!w)return;const m=getComputedStyle(w).transform.match(/matrix\(([^)]+)\)/);if(!m)return;const v=m[1].split(',').map(Number),ang=((Math.atan2(v[1],v[0])*180/Math.PI)%360+360)%360,k=Math.floor((((360-ang)%360))/sg);if(k!==lastK){lastK=k;tone(700+(k%2)*160,600,0.04,'square',0.04);}},40);
  const runId0=runId;
  later(()=>{
    clearInterval(iv);if(runId!==runId0)return;
    st='gambleres';
    const done=(title,label,fn,bn,col)=>{banner(bn,col);$('ptitle').textContent=title;const b=document.createElement('button');b.className='btn';b.textContent=label;b.onclick=()=>{ensureAudio();snd.click();$('panel').classList.remove('on');fn();};const r=$('wres');if(r)r.appendChild(b);};
    if(win){
      snd.win();
      done('🎉 ¡Has ganado '+REL[got].e+' '+REL[got].n+'!  Ahora tienes '+relCount()+' reliquias',gambleOK()?'Seguir ▶':'Continuar ▶',()=>{if(gambleOK()){st='gamble';snapRun('gamble');$('panel').classList.add('on');showGamble();}else toNext();},'¡VERDE!','#7bed9f');
    }else{
      snd.lose();
      done('💥 Has perdido '+relTxt(n),'Continuar ▶',toNext,'¡ROJO!','#ff6b6b');
    }
  },3600);
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
