'use strict';
/* spec.js — Ramas de evolución de la gallina: especializaciones y sus habilidades exclusivas */
const SPEC_ROUND=5;
const SPECS={
 war:{e:'⚔️',n:'Guerrera',col:'#ff7b3d',d:'Cuerpo a cuerpo: +65% de vida, +30% de daño y empieza con plumas de acero (menos daño recibido).',hp:1.65,atk:1.3,dmg:0.85,spd:1,vamp:0,cd:1,dodge:0,
   start:['armor'],allow:['power','vit','armor','speed','gold','fire'],up:['rage','cleave','warcry','thorns']},
 art:{e:'🎯',n:'Artillera',col:'#ff7be0',d:'A distancia: empieza con rayos láser y todas sus habilidades recargan un 15% más rápido, pero con un 10% menos de vida.',hp:0.9,atk:1,dmg:1,spd:1,vamp:0,cd:0.85,dodge:0,
   start:['laser'],allow:['laser','egg','storm','power','vit','speed'],up:['focus','barrage','mega','overclock']},
 vam:{e:'🧛',n:'Vampira',col:'#d0102e',d:'Roba vida: empieza con pico vampiro, +12% de robo de vida base, +25% de vida y +15% de daño.',hp:1.25,atk:1.15,dmg:1,spd:1,vamp:0.12,cd:1,dodge:0,
   start:['vamp'],allow:['vamp','power','vit','speed','gold','armor'],up:['drain','bats','lust','mist']},
 pyr:{e:'🔥',n:'Pirómana',col:'#ff9a3d',d:'Todo arde: empieza con pico de fuego y +35% de daño y +20% de vida. Sus mejoras son de fuego y explosiones.',hp:1.2,atk:1.35,dmg:1,spd:1,vamp:0,cd:1,dodge:0,
   start:['fire'],allow:['fire','egg','power','vit','speed','armor'],up:['ember','spread','volcano','ashes']},
 sto:{e:'🌪️',n:'Tormentosa',col:'#b7a8ff',d:'Veloz y escurridiza: empieza con tormenta de plumas, +15% de velocidad, +10% de vida y daño, y 5% de esquiva.',hp:1.1,atk:1.1,dmg:1,spd:1.15,vamp:0,cd:1,dodge:0.05,
   start:['storm'],allow:['storm','laser','speed','power','vit','gold'],up:['cyclone','breeze','bolt','eye']}
};
const SUPG={
 rage:{sp:'war',e:'😡',n:'Furia de gallina',max:4,d:'Cuanta menos vida te queda, más rápido picoteas (hasta +80%)',v:l=>'hasta +'+20*l+'% vel. de ataque con poca vida'},
 cleave:{sp:'war',e:'🪓',n:'Picotazo en arco',max:4,d:'Tus golpes dañan también a los enemigos cercanos',v:l=>25*l+'% del golpe a los cercanos'},
 warcry:{sp:'war',e:'📣',n:'Grito de guerra',max:4,d:'Cada pocos segundos, todo tu equipo pega más fuerte durante 4 s',v:l=>'+'+(30+12*l)+'% daño · cada '+f1(Math.max(4,10-1.5*l))+' s'},
 thorns:{sp:'war',e:'🦔',n:'Espolones de acero',max:4,d:'Devuelves parte del daño que recibes',v:l=>'devuelve el '+18*l+'% del daño'},
 focus:{sp:'art',e:'🔭',n:'Mira telescópica',max:4,d:'Tus rayos láser hacen mucho más daño',v:l=>'láser +'+30*l+'% de daño'},
 barrage:{sp:'art',e:'🥚',n:'Lluvia de huevos',max:4,d:'Lanza una salva de huevos explosivos',v:l=>(2+l)+' huevos cada '+f1(Math.max(3,7.5-0.6*l))+' s'},
 mega:{sp:'art',e:'💣',n:'Mega huevo',max:4,d:'Cada pocos segundos lanza un huevo gigante devastador',v:l=>'radio '+f1(4+0.3*l)+' · cada '+f1(Math.max(5,12-1.3*l))+' s'},
 overclock:{sp:'art',e:'⚡',n:'Recarga turbo',max:4,d:'Todas tus habilidades se recargan más rápido',v:l=>'recarga -'+10*l+'%'},
 drain:{sp:'vam',e:'🩸',n:'Aura de sangre',max:4,d:'Un aura roja daña a los enemigos cercanos y te cura',v:l=>'radio '+f1(3+0.15*l)+' · daño continuo'},
 bats:{sp:'vam',e:'🦇',n:'Murciélagos',max:4,d:'Envía murciélagos que muerden a enemigos lejanos',v:l=>(2+l)+' mordiscos cada '+f1(Math.max(3,6.5-0.6*l))+' s'},
 lust:{sp:'vam',e:'💀',n:'Sed de sangre',max:4,d:'Al derrotar a un enemigo recuperas vida',v:l=>'+'+12*l+'% de vida por KO'},
 mist:{sp:'vam',e:'🌫️',n:'Forma de niebla',max:4,d:'Esquivas parte de los golpes',v:l=>8*l+'% de esquiva'},
 ember:{sp:'pyr',e:'♨️',n:'Brasas eternas',max:4,d:'La quemadura dura más y quema más fuerte',v:l=>'quema +'+50*l+'% · +'+f1(0.5*l)+' s'},
 spread:{sp:'pyr',e:'🧨',n:'Contagio',max:3,d:'Los enemigos que mueren ardiendo incendian a sus vecinos',v:l=>'radio '+f1(2.4+0.8*l)},
 volcano:{sp:'pyr',e:'🌋',n:'Erupción',max:4,d:'Cada pocos segundos, una explosión de fuego a tu alrededor',v:l=>'radio '+f1(3.2+0.3*l)+' · cada '+f1(Math.max(4,8.5-0.8*l))+' s'},
 ashes:{sp:'pyr',e:'🌑',n:'Cenizas ardientes',max:4,d:'Los enemigos en llamas reciben más daño tuyo',v:l=>'+'+25*l+'% contra enemigos ardiendo'},
 cyclone:{sp:'sto',e:'🌀',n:'Ciclón',max:4,d:'Tu tormenta es más grande, pega más y empuja a los enemigos',v:l=>'radio +'+f1(0.8*l)+' · daño +'+20*l+'%'},
 breeze:{sp:'sto',e:'🍃',n:'Brisa esquiva',max:4,d:'Esquivas golpes y corres más rápido',v:l=>6*l+'% esquiva · +'+6*l+'% velocidad'},
 bolt:{sp:'sto',e:'🌩️',n:'Rayo del cielo',max:4,d:'Cada pocos segundos caen rayos sobre los enemigos',v:l=>(1+Math.ceil(l/2))+' rayos cada '+f1(Math.max(2.5,6-0.6*l))+' s'},
 eye:{sp:'sto',e:'👀',n:'Ojo del huracán',max:4,d:'Atacas y corres más rápido',v:l=>'+'+15*l+'% velocidad de ataque y carrera'}
};
Object.assign(UPG,SUPG);
Object.keys(SUPG).forEach(k=>{UEM[k]=SUPG[k].e;});
const SPEC_ALWAYS=['robot','titan','phoenix','flock'];

function heroOf(){return team.find(m=>m.hero);}
/* ¿puede aparecer esta mejora según la especialización de la gallina? */
function specOK(k){
  const h=heroOf(),U=UPG[k];
  if(!h||!h.spec)return !U.sp;
  if(U.sp)return U.sp===h.spec;
  return SPEC_ALWAYS.includes(k)||SPECS[h.spec].allow.includes(k);
}
function needSpec(){const h=heroOf();return !!h&&!h.spec&&infN>=SPEC_ROUND;}
function chooseSpec(m,id){
  m.spec=id;
  SPECS[id].start.forEach(k=>{if(canUpg(m,k))applyTo(m,k);});
}
/* ajusta las estadísticas del héroe según su especialización */
function specMul(m){const s=m.hero&&m.spec?SPECS[m.spec]:null;return s||{hp:1,atk:1,dmg:1,spd:1,vamp:0,cd:1,dodge:0};}
function specStats(m,o){
  const sp=SPECS[m.spec],g=k=>m.l[k]||0,sk={},atk=o.atk;
  const cdm=sp.cd*(1-0.1*g('overclock'));
  sk.dodge=Math.min(0.55,sp.dodge+0.08*g('mist')+0.06*g('breeze'));
  ['rage','cleave','thorns','lust','drain','ember','spread','ashes','cyclone','eye'].forEach(k=>{sk[k]=g(k);});
  o.spd*=(1+0.15*g('eye'))*(1+0.06*g('breeze'));
  if(g('warcry')){const l=g('warcry');sk.warcry={cd:Math.max(4,10-1.5*l)*cdm,mul:1.3+0.12*l};}
  if(g('barrage')){const l=g('barrage');sk.barrage={cd:Math.max(3,7.5-0.6*l)*cdm,n:2+l,dmg:o.egg?o.egg.dmg*0.55:atk*1.6,rad:o.egg?o.egg.rad:2.2};}
  if(g('mega')){const l=g('mega');sk.mega={cd:Math.max(5,12-1.3*l)*cdm,dmg:atk*5*(1+0.35*(l-1)),rad:4+0.3*l};}
  if(g('drain')){const l=g('drain');sk.drainA={dps:atk*0.4*(1+0.3*(l-1)),rad:3+0.15*l};}
  if(g('bats')){const l=g('bats');sk.bats={cd:Math.max(3,6.5-0.6*l)*cdm,n:2+l,dmg:atk*1.6*(1+0.2*(l-1))};}
  if(g('volcano')){const l=g('volcano');sk.volcano={cd:Math.max(4,8.5-0.8*l)*cdm,dmg:atk*2.2*(1+0.3*(l-1)),rad:3.2+0.3*l};}
  if(g('bolt')){const l=g('bolt');sk.bolt={cd:Math.max(2.5,6-0.6*l)*cdm,n:1+Math.ceil(l/2),dmg:atk*4.5*(1+0.3*(l-1))};}
  if(o.laser){o.laser.cd*=cdm;o.laser.dmg*=1+0.3*g('focus');}
  if(o.egg)o.egg.cd*=cdm;
  if(o.storm){o.storm.cd*=cdm;o.storm.rad+=0.8*g('cyclone');o.storm.dmg*=1+0.2*g('cyclone');}
  o.sk=sk;
}
function specHaste(u){const s=u.sk;return s?1+s.rage*0.2*(1-u.hp/u.max)+0.15*s.eye:1;}
function skTick(u,key,cd,dt){
  const T=u.skT||(u.skT={});
  if(T[key]===undefined)T[key]=cd*0.6;
  T[key]-=dt;if(T[key]<=0){T[key]=cd;return true;}return false;
}
function skBeam(u,t,c1,c2,fromSky){
  fx.push({k:'laser',x1:fromSky?t.x:u.x,y1:fromSky?7:u.top*0.95,z1:fromSky?t.z:u.z,x2:t.x,y2:t.top*0.55,z2:t.z,t:0,max:0.32,c1:c1,c2:c2});
}
/* habilidades activas de la especialización (se llama cada frame de combate para la gallina) */
function specAbilities(u,alive,dt){
  const s=u.sk;if(!s)return;
  if(!simming){u.auT=(u.auT||0)-dt;if(u.auT<=0){u.auT=0.14;const a=Math.random()*6.28;parts.push({x:u.x+Math.cos(a)*0.75,y:0.15,z:u.z+Math.sin(a)*0.75,vx:0,vy:1.7,vz:0,life:0.6,max:0.6,c:u.specCol,s:0.07,k:'p'});}}
  const en=alive.filter(e=>e.side!==u.side&&!e.dying&&!e.dead);if(!en.length)return;
  const rnd=a=>a[(Math.random()*a.length)|0];
  if(s.warcry&&skTick(u,'w',s.warcry.cd,dt)){
    fx.push({k:'ring',x:u.x,z:u.z,r:5,t:0,max:0.6,c:'255,150,60'});burst(u.x,1,u.z,18,['#ff9a3d','#ffd24a','#fff'],4,0.1,0.6);
    alive.forEach(e=>{if(e.side===u.side&&!e.dying){e.buf=4;e.bufMul=s.warcry.mul;}});tone(150,320,0.3,'sawtooth',0.06);
    floater(u.x,u.top+1.2,u.z,'¡GRITO DE GUERRA!','#ff9a3d');
  }
  if(s.barrage&&skTick(u,'b',s.barrage.cd,dt)){
    for(let i=0;i<s.barrage.n;i++){const t=rnd(en);fx.push({k:'egg',x0:u.x,z0:u.z,x1:t.x+(Math.random()-0.5)*1.5,z1:t.z+(Math.random()-0.5)*1.5,t:0,dur:0.6+i*0.13,dmg:s.barrage.dmg,rad:s.barrage.rad,side:u.side,src:u});}
  }
  if(s.mega&&skTick(u,'m',s.mega.cd,dt)){
    const t=rnd(en);fx.push({k:'egg',x0:u.x,z0:u.z,x1:t.x,z1:t.z,t:0,dur:1,dmg:s.mega.dmg,rad:s.mega.rad,side:u.side,src:u,big:true});
  }
  if(s.drainA){
    if(skTick(u,'d',0.5,dt)){
      let tot=0;fx.push({k:'ring',x:u.x,z:u.z,r:s.drainA.rad,t:0,max:0.4,c:'208,16,46'});
      en.forEach(e=>{if(Math.hypot(e.x-u.x,e.z-u.z)<s.drainA.rad+e.size*0.4){const d=s.drainA.dps*0.5;tot+=d;hurt(u,e,d,{quiet:true});}});
      if(tot&&u.hp>0)u.hp=Math.min(u.max,u.hp+tot*0.2);
    }
  }
  if(s.bats&&skTick(u,'t',s.bats.cd,dt)){
    const pool=en.slice();
    for(let i=0;i<s.bats.n&&pool.length;i++){const t=pool.splice((Math.random()*pool.length)|0,1)[0];skBeam(u,t,'150,10,40','230,50,90');burst(t.x,t.top*0.55,t.z,8,['#d0102e','#3a0a14','#fff'],3.5,0.09,0.5);hurt(u,t,s.bats.dmg,{laser:true});}
    snd.laser();
  }
  if(s.volcano&&skTick(u,'v',s.volcano.cd,dt)){
    fx.push({k:'ring',x:u.x,z:u.z,r:s.volcano.rad,t:0,max:0.5,c:'255,110,30'});burst(u.x,0.8,u.z,24,['#ff5a1a','#ffb83d','#ffe36a'],6,0.13,0.7);snd.boom();
    en.forEach(e=>{if(Math.hypot(e.x-u.x,e.z-u.z)<s.volcano.rad+e.size*0.4){hurt(u,e,s.volcano.dmg,{egg:true});if(!e.dying)e.burn={t:3+0.5*s.ember,dps:(u.fireDps||u.atk*0.3)*(1+0.4*s.ember),tick:0.5,sp:s.spread>0};}});
  }
  if(s.bolt&&skTick(u,'o',s.bolt.cd,dt)){
    const pool=en.slice();
    for(let i=0;i<s.bolt.n&&pool.length;i++){const t=pool.splice((Math.random()*pool.length)|0,1)[0];skBeam(u,t,'255,210,60','255,245,150',true);burst(t.x,t.top*0.55,t.z,10,['#ffe36a','#ffffff','#b7a8ff'],4,0.1,0.5);hurt(u,t,s.bolt.dmg,{laser:true});}
    snd.laser();
  }
}
/* ====== elección de especialización ====== */
function showSpecPick(){
  st='spec';icons.length=0;$('panel').classList.remove('on');
  const rows=Object.keys(SPECS).map(id=>{const s=SPECS[id];
    return '<div class="spc" data-id="'+id+'" style="--c:'+s.col+'"><div class="spe">'+s.e+'</div><div class="spt"><b>'+s.n+'</b><span>'+s.d+'</span><small>'+s.up.map(k=>UPG[k].e+' '+UPG[k].n).join(' · ')+'</small></div></div>';}).join('');
  let sel=null;
  setModal('<div class="big">🌟🐔</div><h1>¡Tu gallina evoluciona!</h1><p>Elige una especialización <b>para toda la partida</b>: cambia cómo juegas y las mejoras que te salgan serán de ese estilo.</p><div class="spl">'+rows+'</div>',[{t:'Elige una especialización',f:()=>{
    if(!sel)return;
    const h=heroOf();chooseSpec(h,sel);hideScreens();
    offers=genUpgrades();st='choose';updateRosters();showCards();snapRun('choose');
    banner(SPECS[sel].e+' '+SPECS[sel].n.toUpperCase(),SPECS[sel].col);tone(300,900,0.4,'triangle',0.08);
  }}]);
  const go=$('mrow').firstChild;go.disabled=true;go.style.opacity=0.5;
  document.querySelectorAll('.spc').forEach(r=>{r.onclick=()=>{
    ensureAudio();snd.click();sel=r.dataset.id;
    document.querySelectorAll('.spc').forEach(x=>x.classList.toggle('sel',x===r));
    go.disabled=false;go.style.opacity=1;go.textContent='✔ Ser '+SPECS[sel].n;
  };});
}
/* filas para el panel de estadísticas */
function specStatsHTML(m,R){
  if(!m.hero||!m.spec)return '';
  const sp=SPECS[m.spec];let h=R(sp.e+' Especialización',sp.n);
  sp.up.forEach(k=>{const l=m.l[k]||0;if(l)h+=R(SUPG[k].e+' '+SUPG[k].n+' ('+l+')',SUPG[k].v(l));});
  return h;
}
