'use strict';
/* spec.js — Ramas de evolución de la gallina: especializaciones y sus habilidades exclusivas */
const SPEC_ROUND=5,SPEC_OFFER=2;
const SPECS={
 war:{n:'Guerrera',col:'#ff7b3d',d:'Cuerpo a cuerpo: +65% de vida, +30% de daño y empieza con plumas de acero (menos daño recibido).',hp:1.65,atk:1.3,dmg:0.85,spd:1,vamp:0,cd:1,dodge:0,
   start:['armor'],allow:['power','vit','armor','speed','gold','fire'],up:['rage','cleave','warcry','thorns']},
 art:{n:'Artillera',col:'#ff7be0',d:'A distancia: empieza con rayos láser y todas sus habilidades recargan un 15% más rápido, pero con un 10% menos de vida.',hp:0.9,atk:1,dmg:1,spd:1,vamp:0,cd:0.85,dodge:0,
   start:['laser'],allow:['laser','egg','storm','power','vit','speed'],up:['focus','barrage','mega','overclock']},
 vam:{n:'Vampira',col:'#d0102e',d:'Roba vida: empieza con pico vampiro, +12% de robo de vida base, +25% de vida y +15% de daño.',hp:1.25,atk:1.15,dmg:1,spd:1,vamp:0.12,cd:1,dodge:0,
   start:['vamp'],allow:['vamp','power','vit','speed','gold','armor'],up:['drain','bats','lust','mist']},
 pyr:{n:'Pirómana',col:'#ff9a3d',d:'Todo arde: empieza con pico de fuego y +35% de daño y +20% de vida. Sus mejoras son de fuego y explosiones.',hp:1.2,atk:1.35,dmg:1,spd:1,vamp:0,cd:1,dodge:0,
   start:['fire'],allow:['fire','egg','power','vit','speed','armor'],up:['ember','spread','volcano','ashes']},
 sto:{n:'Tormentosa',col:'#b7a8ff',d:'Veloz y escurridiza: empieza con tormenta de plumas, +15% de velocidad, +10% de vida y daño, y 5% de esquiva.',hp:1.1,atk:1.1,dmg:1,spd:1.15,vamp:0,cd:1,dodge:0.05,
   start:['storm'],allow:['storm','laser','speed','power','vit','gold'],up:['cyclone','breeze','bolt','eye']},
 bru:{n:'Brujo',col:'#a855f7',d:'Hechicero oscuro: empieza con 2 polluelos (La bandada). Cada aliado que cae le da más daño, velocidad y vida (Pacto de sangre). Sus mejoras: espíritus, maldiciones y explosiones.',hp:1,atk:1.1,dmg:1,spd:1,vamp:0,cd:1,dodge:0,
   start:['flock'],allow:['egg','storm','power','vit','speed','armor'],up:['summon','curse','pact','nova']}
};
const SUPG={
 rage:{sp:'war',n:'Furia de gallina',max:4,d:'Cuanta menos vida te queda, más rápido picoteas (hasta +80%)',v:l=>'hasta +'+20*l+'% vel. de ataque con poca vida'},
 cleave:{sp:'war',n:'Picotazo en arco',max:4,d:'Tus golpes dañan también a los enemigos cercanos',v:l=>25*l+'% del golpe a los cercanos'},
 warcry:{sp:'war',n:'Grito de guerra',max:4,d:'Cada pocos segundos, todo tu equipo pega más fuerte durante 4 s',v:l=>'+'+(30+12*l)+'% daño · cada '+f1(Math.max(4,10-1.5*l))+' s'},
 thorns:{sp:'war',n:'Espolones de acero',max:4,d:'Devuelves parte del daño que recibes',v:l=>'devuelve el '+18*l+'% del daño'},
 focus:{sp:'art',n:'Mira telescópica',max:4,d:'Tus rayos láser hacen mucho más daño',v:l=>'láser +'+30*l+'% de daño'},
 barrage:{sp:'art',n:'Lluvia de huevos',max:4,d:'Lanza una salva de huevos explosivos',v:l=>(2+l)+' huevos cada '+f1(Math.max(3,7.5-0.6*l))+' s'},
 mega:{sp:'art',n:'Mega huevo',max:4,d:'Cada pocos segundos lanza un huevo gigante devastador',v:l=>'radio '+f1(4+0.3*l)+' · cada '+f1(Math.max(5,12-1.3*l))+' s'},
 overclock:{sp:'art',n:'Recarga turbo',max:4,d:'Todas tus habilidades se recargan más rápido',v:l=>'recarga -'+10*l+'%'},
 drain:{sp:'vam',n:'Aura de sangre',max:4,d:'Un aura roja daña a los enemigos cercanos y te cura',v:l=>'radio '+f1(3+0.15*l)+' · daño continuo'},
 bats:{sp:'vam',n:'Murciélagos',max:4,d:'Envía murciélagos que vuelan hasta los enemigos y los muerden',v:l=>(2+l)+' murciélagos cada '+f1(Math.max(3,6.5-0.6*l))+' s'},
 lust:{sp:'vam',n:'Sed de sangre',max:4,d:'Al derrotar a un enemigo recuperas vida',v:l=>'+'+12*l+'% de vida por KO'},
 mist:{sp:'vam',n:'Forma de niebla',max:4,d:'Esquivas parte de los golpes',v:l=>8*l+'% de esquiva'},
 ember:{sp:'pyr',n:'Brasas eternas',max:4,d:'La quemadura dura más y quema más fuerte',v:l=>'quema +'+50*l+'% · +'+f1(0.5*l)+' s'},
 spread:{sp:'pyr',n:'Contagio',max:3,d:'Los enemigos que mueren ardiendo incendian a sus vecinos',v:l=>'radio '+f1(2.4+0.8*l)},
 volcano:{sp:'pyr',n:'Erupción',max:4,d:'Cada pocos segundos, una explosión de fuego a tu alrededor',v:l=>'radio '+f1(3.2+0.3*l)+' · cada '+f1(Math.max(4,8.5-0.8*l))+' s'},
 ashes:{sp:'pyr',n:'Cenizas ardientes',max:4,d:'Los enemigos en llamas reciben más daño tuyo',v:l=>'+'+25*l+'% contra enemigos ardiendo'},
 cyclone:{sp:'sto',n:'Ciclón',max:4,d:'Tu tormenta es más grande, pega más y empuja a los enemigos',v:l=>'radio +'+f1(0.8*l)+' · daño +'+20*l+'%'},
 breeze:{sp:'sto',n:'Brisa esquiva',max:4,d:'Esquivas golpes y corres más rápido',v:l=>6*l+'% esquiva · +'+6*l+'% velocidad'},
 bolt:{sp:'sto',n:'Rayo del cielo',max:4,d:'Cada pocos segundos caen rayos sobre los enemigos',v:l=>(1+Math.ceil(l/2))+' rayos cada '+f1(Math.max(2.5,6-0.6*l))+' s'},
 eye:{sp:'sto',n:'Ojo del huracán',max:4,d:'Atacas y corres más rápido',v:l=>'+'+15*l+'% velocidad de ataque y carrera'},
 summon:{sp:'bru',n:'Invocar espíritus',max:4,d:'Cada pocos segundos invocas polluelos espectrales que pelean por ti unos segundos',v:l=>(1+Math.ceil(l/2))+' espíritus cada '+f1(Math.max(5,11-1.2*l))+' s'},
 curse:{sp:'bru',n:'Maldición',max:4,d:'Maldices a enemigos: reciben más daño de todo tu equipo durante 6 s',v:l=>'+'+(15+5*l)+'% daño recibido · '+(l>=3?2:1)+' objetivo(s) cada '+f1(Math.max(4,8.5-0.9*l))+' s'},
 pact:{sp:'bru',n:'Pacto profundo',max:4,d:'Refuerza el Pacto de sangre: cada aliado caído te potencia mucho más',v:l=>{const c=pactCfg(l,false);return '+'+f1(c.dmg*100)+'% daño y +'+f1(c.haste*100)+'% vel. por aliado caído (máx. '+c.cap+')';}},
 nova:{sp:'bru',n:'Muerte explosiva',max:4,d:'Tus polluelos y espíritus explotan al caer y dañan a los enemigos cercanos',v:l=>'explosión del '+Math.round((0.9+0.4*l)*100)+'% de tu daño · radio '+f1(2.4+0.2*l)}
};
/* Pacto de sangre del brujo: bonos por cada aliado caído (se reinician cada combate) */
function pactCfg(l,ult){const pm=(1+0.35*l)*(ult?1.5:1);return{dmg:0.04*pm,haste:0.03*pm,heal:0.04,cap:ult?14:8};}
/* habilidades definitivas: se desbloquean al llegar al nivel máximo de cada habilidad exclusiva */
const ULT={
 rage:{n:'Furia berserker',d:'Con menos del 35% de vida pegas un 50% más fuerte'},
 cleave:{n:'Torbellino',d:'El arco llega mucho más lejos y pega un 50% más'},
 warcry:{n:'Himno de guerra',d:'Recarga un 25% más rápida y además cura un 15% al equipo'},
 thorns:{n:'Armadura de pinchos',d:'Devuelves el doble de daño'},
 focus:{n:'Ojo de águila',d:'Tus láseres disparan 2 rayos más y pegan un 40% más'},
 barrage:{n:'Bombardeo',d:'3 huevos más por salva y explosiones más grandes'},
 mega:{n:'Huevo nuclear',d:'Explota más grande y vuelve a explotar poco después'},
 overclock:{n:'Sobrecarga',d:'Todas tus habilidades recargan un 20% más rápido'},
 drain:{n:'Aura carmesí',d:'Aura más grande que te cura mucho más'},
 bats:{n:'Murciélagos explosivos',d:'Al morder, el murciélago explota y daña a los de alrededor'},
 lust:{n:'Banquete de sangre',d:'Curas el doble por KO y pegas un 30% más durante 3 s'},
 mist:{n:'Niebla densa',d:'+15% de esquiva y te curas un 5% al esquivar'},
 ember:{n:'Infierno',d:'La quemadura dura 2 s más y quema casi el doble'},
 spread:{n:'Pandemia',d:'Tus golpes incendian también a los enemigos de alrededor'},
 volcano:{n:'Lava',d:'La erupción deja un charco de lava que quema durante 4 s'},
 ashes:{n:'Cenizas explosivas',d:'Los enemigos ardiendo reciben +50% más y explotan al morir'},
 cyclone:{n:'Tornado',d:'La tormenta atrae a los enemigos y se recarga un 30% antes'},
 breeze:{n:'Viento a favor',d:'+10% de esquiva y +10% de velocidad'},
 bolt:{n:'Tormenta eléctrica',d:'Cada rayo salta a 2 enemigos cercanos'},
 eye:{n:'Vórtice',d:'Cada 9 s un torbellino te rodea y destruye a los cercanos'},
 summon:{n:'Ejército fantasma',d:'Invocas 3 espíritus más, duran más y son un 30% más fuertes'},
 curse:{n:'Plaga maldita',d:'Los malditos sufren daño continuo y la maldición salta a otro enemigo al morir'},
 pact:{n:'Pacto oscuro',d:'Los bonos del pacto valen un 50% más y el tope sube a 14 aliados caídos'},
 nova:{n:'Supernova',d:'Explosión mucho mayor (+80% daño, +1.5 radio) y te cura un 8% al explotar'}
};
Object.assign(UPG,SUPG);
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
  const U={};sp.up.forEach(k=>{if(g(k)>=SUPG[k].max)U[k]=1;});sk.ult=U;
  const cdm=sp.cd*(1-0.1*g('overclock'))*(U.overclock?0.8:1);
  sk.dodge=Math.min(0.6,sp.dodge+0.08*g('mist')+0.06*g('breeze')+(U.mist?0.15:0)+(U.breeze?0.1:0));
  ['rage','cleave','thorns','lust','drain','ember','spread','ashes','cyclone','eye'].forEach(k=>{sk[k]=g(k);});
  o.spd*=(1+0.15*g('eye'))*(1+0.06*g('breeze'))*(U.breeze?1.1:1);
  if(g('warcry')){const l=g('warcry');sk.warcry={cd:Math.max(4,10-1.5*l)*cdm*(U.warcry?0.75:1),mul:1.3+0.12*l,heal:U.warcry?0.15:0};}
  if(g('barrage')){const l=g('barrage');sk.barrage={cd:Math.max(3,7.5-0.6*l)*cdm,n:2+l+(U.barrage?3:0),dmg:o.egg?o.egg.dmg*0.55:atk*1.6,rad:(o.egg?o.egg.rad:2.2)+(U.barrage?0.8:0)};}
  if(g('mega')){const l=g('mega');sk.mega={cd:Math.max(5,12-1.3*l)*cdm,dmg:atk*5*(1+0.35*(l-1)),rad:4+0.3*l+(U.mega?1.5:0),twice:!!U.mega};}
  if(g('drain')){const l=g('drain');sk.drainA={dps:atk*0.4*(1+0.3*(l-1)),rad:3+0.15*l+(U.drain?1.5:0),heal:U.drain?0.5:0.2};}
  if(g('bats')){const l=g('bats');sk.bats={cd:Math.max(3,6.5-0.6*l)*cdm,n:2+l,dmg:atk*1.6*(1+0.2*(l-1)),boom:!!U.bats};}
  if(g('volcano')){const l=g('volcano');sk.volcano={cd:Math.max(4,8.5-0.8*l)*cdm,dmg:atk*2.2*(1+0.3*(l-1)),rad:3.2+0.3*l,lava:!!U.volcano};}
  if(g('bolt')){const l=g('bolt');sk.bolt={cd:Math.max(2.5,6-0.6*l)*cdm,n:1+Math.ceil(l/2),dmg:atk*4.5*(1+0.3*(l-1)),chain:!!U.bolt};}
  if(o.laser){o.laser.cd*=cdm;o.laser.dmg*=1+0.3*g('focus');if(U.focus){o.laser.n+=2;o.laser.dmg*=1.4;}}
  if(o.egg)o.egg.cd*=cdm;
  if(o.storm){o.storm.cd*=cdm;o.storm.rad+=0.8*g('cyclone');o.storm.dmg*=1+0.2*g('cyclone');if(U.cyclone)o.storm.cd*=0.7;}
  sk.pull=!!U.cyclone;
  if(U.eye)sk.eyeUlt={cd:9*cdm,dmg:atk*1.8,rad:3};
  if(m.spec==='bru'){
    const lp=g('pact'),ls=g('summon'),lc=g('curse'),ln=g('nova');
    sk.pact=pactCfg(lp,!!U.pact);
    if(ls)sk.summon={cd:Math.max(5,11-1.2*ls)*cdm,n:1+Math.ceil(ls/2)+(U.summon?3:0),hp:o.hp*0.2*(1+0.15*(ls-1))*(U.summon?1.3:1),atk:atk*0.3*(1+0.15*(ls-1))*(U.summon?1.3:1),life:10+(U.summon?4:0),cap:U.summon?12:8};
    if(lc)sk.curse={cd:Math.max(4,8.5-0.9*lc)*cdm,n:lc>=3?2:1,mul:0.15+0.05*lc,dps:U.curse?atk*1.0:0,jump:!!U.curse};
    if(ln)sk.nova={dmg:atk*(0.9+0.4*ln)*(U.nova?1.8:1),rad:2.4+0.2*ln+(U.nova?1.5:0),heal:U.nova?0.08:0};
  }
  o.sk=sk;
}
function specHaste(u){const s=u.sk;return s?(1+s.rage*0.2*(1-u.hp/u.max)+0.15*s.eye)*(1+(u.pact||0)*(s.pact?s.pact.haste:0)):1;}
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
  if(!simming){u.auT=(u.auT||0)-dt;if(u.auT<=0){u.auT=Object.keys(s.ult||{}).length?0.07:0.14;const a=Math.random()*6.28;parts.push({x:u.x+Math.cos(a)*0.75,y:0.15,z:u.z+Math.sin(a)*0.75,vx:0,vy:1.7,vz:0,life:0.6,max:0.6,c:u.specCol,s:0.07,k:'p'});}}
  const en=alive.filter(e=>e.side!==u.side&&!e.dying&&!e.dead);if(!en.length)return;
  const rnd=a=>a[(Math.random()*a.length)|0];
  if(s.warcry&&skTick(u,'w',s.warcry.cd,dt)){
    fx.push({k:'ring',x:u.x,z:u.z,r:5,t:0,max:0.6,c:'255,150,60'});burst(u.x,1,u.z,18,['#ff9a3d','#ffd24a','#fff'],4,0.1,0.6);
    alive.forEach(e=>{if(e.side===u.side&&!e.dying){e.buf=4;e.bufMul=s.warcry.mul;if(s.warcry.heal)e.hp=Math.min(e.max,e.hp+e.max*s.warcry.heal);}});tone(150,320,0.3,'sawtooth',0.06);
    floater(u.x,u.top+1.2,u.z,'¡GRITO DE GUERRA!','#ff9a3d');
  }
  if(s.barrage&&skTick(u,'b',s.barrage.cd,dt)){
    for(let i=0;i<s.barrage.n;i++){const t=rnd(en);fx.push({k:'egg',x0:u.x,z0:u.z,x1:t.x+(Math.random()-0.5)*1.5,z1:t.z+(Math.random()-0.5)*1.5,t:0,dur:0.6+i*0.13,dmg:s.barrage.dmg,rad:s.barrage.rad,side:u.side,src:u});}
  }
  if(s.mega&&skTick(u,'m',s.mega.cd,dt)){
    const t=rnd(en);fx.push({k:'egg',x0:u.x,z0:u.z,x1:t.x,z1:t.z,t:0,dur:1,dmg:s.mega.dmg,rad:s.mega.rad,side:u.side,src:u,big:true});
    if(s.mega.twice)fx.push({k:'egg',x0:t.x,z0:t.z,x1:t.x,z1:t.z,t:0,dur:1.8,dmg:s.mega.dmg*0.6,rad:s.mega.rad,side:u.side,src:u,big:true});
  }
  if(s.drainA){
    if(skTick(u,'d',0.5,dt)){
      let tot=0;fx.push({k:'ring',x:u.x,z:u.z,r:s.drainA.rad,t:0,max:0.4,c:'208,16,46'});
      en.forEach(e=>{if(Math.hypot(e.x-u.x,e.z-u.z)<s.drainA.rad+e.size*0.4){const d=s.drainA.dps*0.5;tot+=d;hurt(u,e,d,{quiet:true});}});
      if(tot&&u.hp>0)u.hp=Math.min(u.max,u.hp+tot*s.drainA.heal);
    }
  }
  if(s.bats&&skTick(u,'t',s.bats.cd,dt)){
    const pool=en.slice();
    burst(u.x,u.top*0.9,u.z,10,['#2a1530','#d0102e','#4a1f3d'],3,0.08,0.5);
    for(let i=0;i<s.bats.n&&pool.length;i++){
      const t=pool.splice((Math.random()*pool.length)|0,1)[0];
      fx.push({k:'bat',x0:u.x+(Math.random()-0.5)*0.7,y0:u.top*0.9+u.y,z0:u.z+(Math.random()-0.5)*0.7,tgt:t,tx:t.x,tz:t.z,ty:t.top*0.55,t:0,fly:0.5+0.07*i,max:1.25+0.07*i,dmg:s.bats.dmg,src:u,seed:Math.random()*6.28,px:u.x,pz:u.z,yaw:0,bt:0,hit:false,boom:s.bats.boom});
    }
    snd.laser();
  }
  if(s.volcano&&skTick(u,'v',s.volcano.cd,dt)){
    fx.push({k:'ring',x:u.x,z:u.z,r:s.volcano.rad,t:0,max:0.5,c:'255,110,30'});burst(u.x,0.8,u.z,24,['#ff5a1a','#ffb83d','#ffe36a'],6,0.13,0.7);snd.boom();
    en.forEach(e=>{if(Math.hypot(e.x-u.x,e.z-u.z)<s.volcano.rad+e.size*0.4){hurt(u,e,s.volcano.dmg,{egg:true});if(!e.dying)e.burn={t:3+0.5*s.ember,dps:(u.fireDps||u.atk*0.3)*(1+0.4*s.ember),tick:0.5,sp:s.spread>0,by:u};}});
    if(s.volcano.lava)fx.push({k:'lava',x:u.x,z:u.z,r:s.volcano.rad*0.9,t:0,max:4,tick:0.3,dps:s.volcano.dmg*0.12,src:u,side:u.side});
  }
  if(s.bolt&&skTick(u,'o',s.bolt.cd,dt)){
    const pool=en.slice();
    for(let i=0;i<s.bolt.n&&pool.length;i++){const t=pool.splice((Math.random()*pool.length)|0,1)[0];skBeam(u,t,'255,210,60','255,245,150',true);burst(t.x,t.top*0.55,t.z,10,['#ffe36a','#ffffff','#b7a8ff'],4,0.1,0.5);hurt(u,t,s.bolt.dmg,{laser:true});
      if(s.bolt.chain)en.filter(e=>e!==t&&!e.dying&&!e.dead).sort((a,b)=>Math.hypot(a.x-t.x,a.z-t.z)-Math.hypot(b.x-t.x,b.z-t.z)).slice(0,2).forEach(e=>{fx.push({k:'laser',x1:t.x,y1:t.top*0.55,z1:t.z,x2:e.x,y2:e.top*0.55,z2:e.z,t:0,max:0.32,c1:'255,210,60',c2:'255,245,150'});burst(e.x,e.top*0.55,e.z,6,['#ffe36a','#ffffff'],3,0.09,0.4);hurt(u,e,s.bolt.dmg*0.5,{laser:true});});}
    snd.laser();
  }
  if(s.summon&&skTick(u,'s',s.summon.cd,dt))summonSpirits(u,s.summon);
  if(s.curse&&skTick(u,'c',s.curse.cd,dt)){
    const pool=en.filter(e=>!e.curse);
    for(let i=0;i<s.curse.n&&pool.length;i++){
      const t=pool.splice((Math.random()*pool.length)|0,1)[0];
      t.curse={t:6,mul:s.curse.mul,dps:s.curse.dps,jump:s.curse.jump,by:u,tk:0.5};
      fx.push({k:'ring',x:t.x,z:t.z,r:1.6,t:0,max:0.5,c:'168,85,247'});burst(t.x,t.top*0.6,t.z,16,['#a855f7','#e0b0ff','#3b1a6b'],4,0.1,0.6);
      floater(t.x,t.top+0.9,t.z,'¡MALDITO!','#c77dff');
    }
    tone(120,60,0.35,'sawtooth',0.06);
  }
  if(s.eyeUlt&&skTick(u,'y',s.eyeUlt.cd,dt)){
    fx.push({k:'ring',x:u.x,z:u.z,r:s.eyeUlt.rad,t:0,max:0.6,c:'183,168,255'});burst(u.x,0.8,u.z,28,['#b7a8ff','#ffffff','#d9ceff'],6,0.12,0.7);snd.boom();
    en.forEach(e=>{const dx=e.x-u.x,dz=e.z-u.z,d=Math.hypot(dx,dz)||1;if(d<s.eyeUlt.rad+e.size*0.4){hurt(u,e,s.eyeUlt.dmg,{egg:true});e.kx+=dx/d*4;e.kz+=dz/d*4;}});
  }
}
/* ====== brujo: espíritus y pacto de sangre ====== */
function summonSpirits(u,c){
  const cnt=units.filter(e=>e.spirit&&!e.dying&&!e.dead).length,n=Math.min(c.n,c.cap-cnt);
  for(let i=0;i<n;i++){
    const sp=mkUnit(0,{k:'ghost',t:0,fresh:false}),a=Math.random()*6.28,r=1.1+Math.random()*0.9;
    sp.x=Math.max(-9.6,Math.min(9.6,u.x+Math.cos(a)*r));sp.z=Math.max(-5.6,Math.min(5.6,u.z+Math.sin(a)*r));sp.hx=sp.x;sp.hz=sp.z;
    sp.hp=sp.max=c.hp;sp.atk=c.atk;sp.spd=4.6;sp.spirit=true;sp.life=c.life;sp.yaw=u.yaw;
    units.push(sp);
    fx.push({k:'ring',x:sp.x,z:sp.z,r:1.1,t:0,max:0.4,c:'200,160,255'});
    if(!simming)burst(sp.x,0.6,sp.z,12,['#c9a4ff','#ffffff','#a855f7'],3.5,0.09,0.6);
  }
  if(n>0){floater(u.x,u.top+1.2,u.z,'¡ESPÍRITUS!','#c9a4ff');tone(500,180,0.35,'sine',0.07);}
}
/* un aliado (polluelo o espíritu) cae: el brujo se fortalece y, si tiene la habilidad, el aliado explota */
function allyDied(t){
  const h=units.find(x=>x.hero&&!x.dying&&!x.dead&&x.sk&&x.sk.pact);if(!h)return;
  const s=h.sk,pc=s.pact;
  h.pact=Math.min(pc.cap,(h.pact||0)+1);
  h.hp=Math.min(h.max,h.hp+h.max*pc.heal);
  fx.push({k:'ring',x:h.x,z:h.z,r:2.2,t:0,max:0.45,c:'168,85,247'});
  if(!simming)burst(h.x,h.top*0.6,h.z,18,['#a855f7','#e0b0ff','#d0102e'],4.5,0.1,0.7);
  floater(h.x,h.top+1.3,h.z,'¡PACTO! ×'+h.pact,'#c77dff');tone(180,520,0.3,'triangle',0.07);
  if(s.nova){
    const nv=s.nova;
    fx.push({k:'ring',x:t.x,z:t.z,r:nv.rad,t:0,max:0.45,c:'200,120,255'});
    if(!simming)burst(t.x,t.top*0.5,t.z,24,['#a855f7','#e0b0ff','#ffffff','#ff7be0'],6,0.13,0.7);
    snd.boom();shake=Math.min(0.6,shake+0.25);
    units.forEach(e=>{if(e.side!==t.side&&!e.dying&&!e.dead&&Math.hypot(e.x-t.x,e.z-t.z)<nv.rad+e.size*0.4)hurt(h,e,nv.dmg,{egg:true});});
    if(nv.heal&&!h.dying)h.hp=Math.min(h.max,h.hp+h.max*nv.heal);
  }
}
/* ====== murciélagos 3D (habilidad de la vampira) ====== */
const BATM=(()=>{const d='#5a2a6e',P=[];
  P.push(B([0,0,0],[0.22,0.16,0.16],d,'body'),B([0.15,0.03,0],[0.14,0.14,0.14],d,'head'));
  [1,-1].forEach(z=>{
    P.push(B([0.14,0.13,z*0.05],[0.04,0.08,0.04],d,'acc'),B([0.225,0.06,z*0.04],[0.02,0.04,0.04],'#ff2a4a','eye',{glow:true}),B([0.225,-0.03,z*0.03],[0.02,0.05,0.02],'#ffffff','acc'));
    P.push(B([0,0,z*0.2],[0.26,0.03,0.24],'#8a2f9e','limb',{an:'wing',sg:z,pv:[0,0,z*0.1]}),B([-0.04,0,z*0.42],[0.22,0.03,0.2],'#c0449a','limb',{an:'wing',sg:z,pv:[0,0,z*0.1]}));
  });
  return P;})();
/* entidad dibujable de un murciélago: vuela hacia el enemigo y revolotea mordiéndolo */
function batEnt(f){
  const t=f.tgt;if(t&&!t.dying&&!t.dead){f.tx=t.x;f.tz=t.z;f.ty=t.top*0.55+t.y;}
  let x,y,z;
  if(f.t<f.fly){
    const k=f.t/f.fly,e=k*k*(3-2*k),w=Math.sin(k*Math.PI*2+f.seed)*0.5*(1-k);
    const dx=f.tx-f.x0,dz=f.tz-f.z0,l=Math.hypot(dx,dz)||1;
    x=f.x0+dx*e-dz/l*w;z=f.z0+dz*e+dx/l*w;y=f.y0+(f.ty-f.y0)*e+Math.sin(k*Math.PI)*1.1;
  }else{
    const a=TT*9+f.seed,b=Math.max(0,Math.sin(TT*17+f.seed)),r=0.55*(1-0.8*b);
    x=f.tx+Math.cos(a)*r;z=f.tz+Math.sin(a)*r;y=f.ty+0.15+Math.sin(TT*13+f.seed)*0.2;
  }
  if(Math.hypot(x-f.px,z-f.pz)>1e-4)f.yaw=Math.atan2(-(z-f.pz),x-f.px);
  f.px=x;f.pz=z;
  return{model:BATM,x,y,z,yaw:f.yaw,sc:2.8,state:'attack',atkT:f.t,gait:0,wk:0,seed:f.seed,alpha:1,flash:0,hw:0.4};
}
/* ====== elección de especialización ====== */
function showSpecPick(){
  st='spec';icons.length=0;$('panel').classList.remove('on');
  const ids=Object.keys(SPECS).sort(()=>Math.random()-0.5).slice(0,SPEC_OFFER); /* solo 2 especializaciones al azar */
  const rows=ids.map(id=>{const s=SPECS[id];
    return '<div class="spc" data-id="'+id+'" style="--c:'+s.col+'"><canvas class="ic"></canvas><div class="spt"><b>'+s.n+'</b><span>'+s.d+'</span><small>'+s.up.map(k=>UPG[k].n).join(' · ')+'</small></div></div>';}).join('');
  let sel=null;
  setModal('<h1>¡Tu gallina evoluciona!</h1><p>Elige una especialización <b>para toda la partida</b>: cambia cómo juegas y las mejoras que te salgan serán de ese estilo.</p><div class="spl">'+rows+'</div>',[{t:'Elige una especialización',f:()=>{
    if(!sel)return;
    const h=heroOf();chooseSpec(h,sel);hideScreens();
    offers=genUpgrades();st='choose';updateRosters();showCards();snapRun('choose');
    banner(SPECS[sel].n.toUpperCase(),SPECS[sel].col);tone(300,900,0.4,'triangle',0.08);
  }}]);
  document.querySelectorAll('.spc').forEach(r=>{icons.push({cv:r.querySelector('canvas'),spec:()=>specSpec(r.dataset.id)});});
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
  const sp=SPECS[m.spec];let h=R('Especialización',sp.n);
  if(m.spec==='bru'){const c=pactCfg(m.l.pact||0,(m.l.pact||0)>=SUPG.pact.max);h+=R('🩸 Pacto de sangre','+'+f1(c.dmg*100)+'% daño · +'+f1(c.haste*100)+'% vel. · cura '+Math.round(c.heal*100)+'% por aliado caído (máx. '+c.cap+')');}
  sp.up.forEach(k=>{const l=m.l[k]||0;if(l)h+=R(SUPG[k].n+' ('+l+')',SUPG[k].v(l));if(l>=SUPG[k].max)h+=R('★ '+ULT[k].n,ULT[k].d);});
  return h;
}
