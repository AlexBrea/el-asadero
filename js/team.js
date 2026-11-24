'use strict';
/* team.js — Equipo infinito: mejoras, estadísticas de miembros, enemigos por ronda y construcción de unidades */
/* unidades */

/* ===== infinito: miembros del equipo ===== */
const UPG={
 gold:{n:'Pico de oro',max:5,d:'Golpes críticos dorados con daño enorme'},
 laser:{n:'Rayos láser',max:5,d:'Dispara rayos láser a los enemigos'},
 egg:{n:'Huevos explosivos',max:5,d:'Lanza huevos que explotan en zona'},
 storm:{n:'Tormenta de plumas',max:5,d:'Remolino de plumas cortantes alrededor'},
 fire:{n:'Pico de fuego',max:5,d:'Los picotazos queman al enemigo'},
 vamp:{n:'Pico vampiro',max:4,d:'Recupera vida al golpear'},
 armor:{n:'Plumas de acero',max:5,d:'Recibe menos daño'},
 speed:{n:'Alas veloces',max:4,d:'Corre y picotea más rápido'},
 power:{n:'Músculos de gallina',max:99,d:'Cada picotazo pega más fuerte'},
 vit:{n:'Súper plumaje',max:99,d:'Aguanta muchos más golpes'},
 flock:{n:'La bandada',max:4,d:'Dos pollitos aliados se unen (y también se pueden mejorar)'},
 phoenix:{n:'Huevo fénix',max:1,d:'Resucita con toda la vida (solo 1 a la vez; se gasta al usarlo)'},
 robot:{n:'Cuerpo robot',max:1,d:'Se convierte en robot: mucho más fuerte'},
 titan:{n:'Titán dorado',max:1,d:'Armadura de oro: enorme y brutal'}
};
const UEM={gold:'🪙',laser:'🔴',egg:'🥚',storm:'🪶',fire:'🔥',vamp:'🧛',armor:'🛡️',speed:'💨',power:'💪',vit:'❤️',flock:'🐥',phoenix:'🌅'};
function newMember(hero){return{k:hero?'chicken':'chick',hero:!!hero,t:0,l:{},base:hero?1:0.55,fresh:true,skin:hero?SKIN:null};}
function canUpg(m,k){
  const l=m.l[k]||0;
  if(UPG[k].sp)return m.hero&&m.spec===UPG[k].sp&&l<UPG[k].max;
  if((k==='laser'||k==='egg'||k==='storm')&&!m.hero)return false;
  if(m.hero&&m.spec&&!specOK(k))return false;
  if(k==='robot')return m.t===0;if(k==='titan')return m.t===1;
  if(k==='phoenix')return !team.some(x=>(x.l.phoenix||0)>0);
  if(k==='flock')return m.hero&&l<UPG.flock.max;
  return l<UPG[k].max;
}
function memberStats(m){
  const g=k=>m.l[k]||0,t=m.t,b=m.base,sp=specMul(m);
  const hp=30*b*Math.pow(1.35,g('vit'))*HM[t]*HPM*(1+0.25*rl('hp'))*sp.hp,atk=6*b*Math.pow(1.3,g('power'))*AM[t]*(1+0.2*rl('dmg'))*sp.atk;
  const o={hp,atk,rate:0.7*Math.pow(0.9,g('speed'))*Math.pow(0.9,rl('spd')),spd:3.6*Math.pow(1.12,g('speed'))*Math.pow(1.1,rl('spd'))*sp.spd,dmgMul:Math.pow(0.8,g('armor'))*sp.dmg,vamp:0.12*g('vamp')+0.08*rl('vamp')+sp.vamp,
    fireDps:g('fire')?atk*0.35*(1+0.3*(g('fire')-1)):0,crit:Math.min(0.8,(g('gold')?0.15+0.12*g('gold'):0)+0.12*rl('crit')),phoenix:g('phoenix'),regen:hp*0.02*rl('regen'),rev:rl('rev'),laser:null,egg:null,storm:null};
  if(g('laser')){const l=g('laser');o.laser={cd:Math.max(1.5,4.2-0.5*l),n:1+Math.floor(l/2),dmg:atk*2.6*(1+0.25*(l-1))};}
  if(g('egg')){const l=g('egg');o.egg={cd:Math.max(2.2,5-0.5*l),dmg:atk*2.2*(1+0.3*(l-1)),rad:2+0.2*l};}
  if(g('storm')){const l=g('storm');o.storm={cd:Math.max(2.5,6-0.7*l),dmg:atk*1.3*(1+0.3*(l-1)),rad:3};}
  if(m.hero&&m.spec)specStats(m,o);
  return o;
}
let INF_BASE=70,INF_G=1.35,INF_E=0.003;
function genInfEnemy(n){
  const rng=mulberry(n*104729+17),top=Math.min(9,Math.floor((n-1)*0.6)),lo=Math.max(0,top-2);
  let target=INF_BASE*Math.pow(INF_G,n-1)*Math.exp(INF_E*n*n);const cap=n>=18?2:n>=9?1:0,t=[];
  if(n%10===0){ /* JEFE: una bestia gigante + escoltas */
    target*=1.2;const bk=['bear','gorilla','elephant'][(n/10-1)%3],bs=SP[bk],raw=bs.hp*HM[2]*bs.atk*AM[2];
    return [{k:bk,t:2,boss:true,f:Math.sqrt(target/raw),fresh:true}];
  }
  let g=0;
  while(S(t)<target&&g++<150){
    if(cap>0&&t.length>=3&&rng()<(t.length>12?0.7:0.25)){const k=pickUp(t,rng,cap);if(k){upSpecies(t,k,true);continue;}}
    t.push({k:KEYS[lo+Math.floor(rng()*(top-lo+1))],t:0,fresh:true});
  }
  return t;
}
function genUpgrades(){
  const av=Object.keys(UPG).filter(k=>specOK(k)&&team.some(m=>canUpg(m,k)));
  const ex=av.filter(k=>UPG[k].sp),pk=[];
  if(ex.length)pk.push(ex[(Math.random()*ex.length)|0]); /* siempre sale 1 de la especialidad */
  const rest=av.filter(k=>!pk.includes(k));
  while(pk.length<3&&rest.length)pk.push(rest.splice((Math.random()*rest.length)|0,1)[0]);
  for(let i=pk.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[pk[i],pk[j]]=[pk[j],pk[i]];}
  return pk.map(k=>({id:k}));
}
function applyTo(m,k){
  if(k==='robot')m.t=1;else if(k==='titan')m.t=2;else m.l[k]=(m.l[k]||0)+1;
  m.fresh=true;
  if(k==='flock'){team.push(newMember(false),newMember(false));}
}
function memberName(m){
  if(m.hero)return CNAME||'Tu gallina';
  let i=0;for(const e of team){if(!e.hero){i++;if(e===m)break;}}
  return 'Pollito '+i;
}
function memberDesc(m){
  const a=Object.keys(m.l).filter(k=>m.l[k]&&k!=='flock').map(k=>UPG[k].n+' '+m.l[k]);
  if(m.t)a.unshift(m.t===1?'Robot':'Titán');
  if(m.hero&&m.spec)a.unshift(SPECS[m.spec].n);
  return a.length?a.join(' · '):'Sin mejoras todavía';
}

/* unidades */
function mkUnit(side,e){
  const sp=SP[e.k],t=e.t||0,gold=!!(e.l&&e.l.gold>0),m=getModel(e.k,t,gold,e.hero?e.skin:null,e.hero?e.spec:null);
  let hp=sp.hp*HM[t]*HPM*(e.f||1),atk=sp.atk*AM[t]*(e.f||1),rate=sp.rate,spd=sp.spd,sc=1.4*SM[t]*(e.boss?(e.k==='elephant'?0.8:1):1);
  const fresh=e.fresh;e.fresh=false;
  const u={side,key:e.k,tier:t,robot:t>0,model:m.parts,sc,hw:m.hw,size:m.size*sc,top:m.top*sc,
    x:0,y:0,z:0,hx:0,hz:0,yaw:side?Math.PI:0,pitch:0,roll:0,lunge:0,state:'idle',gait:Math.random()*6,seed:Math.random()*10,wk:0,cd:Math.random()*0.5,atkT:0,hit:false,flash:0,kx:0,kz:0,alpha:1,dieT:0,
    spawnT:fresh?-Math.random()*0.4:1,landed:!fresh,tgt:null,dead:false,dying:false,win:false,rd:Math.random()<.5?1:-1,dmgMul:1,vamp:0,fireDps:0,crit:0,phoenix:0,burn:null,hero:false,boss:!!e.boss,rbw:m.rbw};
  if(e.l){
    const h=memberStats(e);hp=h.hp;atk=h.atk;rate=h.rate;spd=h.spd;
    if(e.hero){u.sc=sc*1.15;u.size*=1.15;u.top*=1.15;u.hero=true;}
    Object.assign(u,{ref:e,invuln:0,dmgMul:h.dmgMul,vamp:h.vamp,fireDps:h.fireDps,crit:h.crit,phoenix:h.phoenix,regen:h.regen,rev:h.rev,ab:h,laserT:1.2,eggT:2,stormT:2.5,member:true,sk:h.sk||null,specCol:e.hero&&e.spec?SPECS[e.spec].col:null});
  }
  u.hp=hp;u.max=hp;u.atk=atk;u.rate=rate*(t?0.95:1);u.spd=spd;
  return u;
}
function formation(list,sgn){
  const s=[...list].sort((a,b)=>b.size-a.size),cell=u=>u.size*1.05+0.45;
  let colX=1.8,i=0;
  while(i<s.length){
    const col=[];let used=0,mx=0;
    while(i<s.length){const c=cell(s[i]);if(used+c>9.4&&col.length)break;col.push([s[i],c]);used+=c;mx=Math.max(mx,c);i++;}
    let z=-used/2;col.forEach(([u,c])=>{u.hx=sgn*(colX+mx/2);u.hz=z+c/2;z+=c;});colX+=mx;
  }
}
function buildArena(){
  const a=team.map(e=>mkUnit(0,e)),b=bteam.map(e=>mkUnit(1,e));
  formation(a,-1);formation(b,1);
  units=a.concat(b);units.forEach(u=>{u.x=u.hx;u.z=u.hz;});
  updateRosters();
}
const plural=(k,n)=>SP[k].es[n===1?0:1];
function rosterHTML(list){
  if(!list.length)return '<span style="opacity:.7">— nadie —</span>';
  const m={};list.forEach(e=>{const id=e.k+(e.t||0)+(e.boss?'B':'');m[id]=m[id]||{k:e.k,t:e.t||0,n:0,b:!!e.boss};m[id].n++;});
  return Object.values(m).map(g=>'<span class="chip">'+(g.b?'👹':'')+TIERN[g.t]+SP[g.k].e+'×'+g.n+'</span>').join('');
}
function updateRosters(){
  const hero=team.find(m=>m.hero);let h='<b>TU EQUIPO</b>';
  if(hero){h+='<span class="chip">'+TIERN[hero.t]+'⭐🐔</span>'+(hero.spec?'<span class="chip">'+SPECS[hero.spec].n+'</span>':'');Object.keys(hero.l).forEach(k=>{if(UEM[k]&&k!=='flock')h+='<span class="chip">'+UEM[k]+hero.l[k]+'</span>';});}
  Object.keys(RL).forEach(k=>{if(RL[k]&&REL[k])h+='<span class="chip">'+REL[k].e+(RL[k]>1?'×'+RL[k]:'')+'</span>';});const ch=team.filter(e=>!e.hero).length;if(ch)h+='<span class="chip">🐥×'+ch+'</span>';
  $('rosL').innerHTML=h;
  $('rosR').innerHTML='<b>ENEMIGOS · RONDA '+infN+'</b>'+rosterHTML(bteam);
}
function updatePips(){
  $('pips').innerHTML='<div style="font-weight:900;font-size:15px;padding:0 6px">RONDA '+infN+' · récord '+BEST+'</div>';
  $('lvl').innerHTML='♾️ INFINITO<small>Sobrevive todo lo que puedas</small>';
}
function banner(t,color){const b=$('banner');b.textContent=t;b.style.color=color||'#ffe08a';b.classList.remove('show');void b.offsetWidth;b.classList.add('show');}
function setModal(html,btns){
  const m=$('mbox');m.innerHTML=html+'<div class="row" id="mrow"></div>';
  btns.forEach(b=>{const x=document.createElement('button');x.className='btn '+(b.cls||'');x.textContent=b.t;x.onclick=()=>{ensureAudio();snd.click();b.f();};$('mrow').appendChild(x);});
  $('modal').classList.remove('off');
}
function hideScreens(){$('modal').classList.add('off');$('panel').classList.remove('on');icons.length=0;}
function resetBattle(){runId++;units=[];parts.length=0;floaters.length=0;fx=[];st='menu';team=[];bteam=[];}
