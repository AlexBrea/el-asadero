'use strict';
/* cosgfx.js — Catálogo de la tienda (cosméticos y skins exclusivas) y sus modelos 3D */
const RAR={common:{n:'Común',c:'#9fb4d6'},rare:{n:'Raro',c:'#4fa8ff'},epic:{n:'Épico',c:'#c77dff'},legend:{n:'Legendario',c:'#ffd24a'}};
const SLOTS=[{id:'hat',n:'Gorro',e:'🎩'},{id:'shoes',n:'Zapatillas',e:'👟'},{id:'suit',n:'Traje',e:'🧥'},{id:'skin',n:'Skin',e:'🎨'}];
/* skins exclusivas de la tienda (no se desbloquean por nivel) */
const SHOPSKINS=[
 {id:'neon',n:'Neón',lvl:9999,d:'Brilla en la oscuridad',rar:'rare',price:450,pal:{body:'#0b1d2a',head:'#10303f',wing:'#20f0ff',tail:'#20f0ff',glow:['wing','tail']}},
 {id:'candy',n:'Algodón de azúcar',lvl:9999,d:'Dulce y esponjosa',rar:'rare',price:450,pal:{body:'#ff9ecb',head:'#ffc2e0',wing:'#9ee7ff',tail:'#9ee7ff'}},
 {id:'zombie',n:'Zombi',lvl:9999,d:'Vuelve de la sartén',rar:'epic',price:600,pal:{body:'#7fa86a',head:'#93c27c',wing:'#5c7d4c',tail:'#5c7d4c'}},
 {id:'ice',n:'Hielo',lvl:9999,d:'Fría como el invierno',rar:'epic',price:700,pal:{body:'#bfefff',head:'#dff8ff',wing:'#8fd8ff',tail:'#8fd8ff',glow:['tail']}},
 {id:'magma',n:'Magma',lvl:9999,d:'Roca ardiente',rar:'legend',price:1000,pal:{body:'#2a1c1c',head:'#3a2424',wing:'#ff6a1a',tail:'#ffb81a',glow:['wing','tail']}}
];
/* cosméticos: gorros, zapatillas y trajes */
const CAT=[
 {id:'paja',slot:'hat',n:'Sombrero de paja',rar:'common',price:150,d:'Para el sol del corral'},
 {id:'cocinero',slot:'hat',n:'Gorro de cocinero',rar:'common',price:150,d:'La gallina chef'},
 {id:'fiesta',slot:'hat',n:'Gorro de fiesta',rar:'rare',price:250,d:'¡Cumpleaños!'},
 {id:'chistera',slot:'hat',n:'Chistera',rar:'rare',price:300,d:'Elegancia de mago'},
 {id:'vikingo',slot:'hat',n:'Casco vikingo',rar:'epic',price:500,d:'Con cuernos y todo'},
 {id:'halo',slot:'hat',n:'Aureola',rar:'legend',price:900,d:'Una gallina celestial'},
 {id:'deportivas',slot:'shoes',n:'Deportivas rojas',rar:'common',price:150,d:'Corren que se las pelan'},
 {id:'botas',slot:'shoes',n:'Botas de agua',rar:'common',price:150,d:'Que llueva'},
 {id:'oro',slot:'shoes',n:'Zapatos dorados',rar:'epic',price:500,d:'Brillan al andar'},
 {id:'cohete',slot:'shoes',n:'Zapatillas cohete',rar:'legend',price:800,d:'Con propulsores'},
 {id:'peto',slot:'suit',n:'Peto vaquero',rar:'common',price:200,d:'Para trabajar en la granja'},
 {id:'delantal',slot:'suit',n:'Delantal de chef',rar:'common',price:200,d:'Cuidado con la sartén'},
 {id:'capa',slot:'suit',n:'Capa de superheroína',rar:'rare',price:350,d:'¡Gallina al rescate!'},
 {id:'esmoquin',slot:'suit',n:'Esmoquin',rar:'rare',price:400,d:'Con pajarita'},
 {id:'armadura',slot:'suit',n:'Armadura dorada',rar:'epic',price:650,d:'Placas de oro'},
 {id:'jetpack',slot:'suit',n:'Mochila cohete',rar:'legend',price:1000,d:'Despega en cada pelea'}
];
SHOPSKINS.forEach(s=>SKINS.push(s));
SHOPSKINS.forEach(s=>CAT.push({id:s.id,slot:'skin',n:s.n,rar:s.rar,price:s.price,d:s.d}));
const catOf=id=>CAT.find(x=>x.id===id);
const skinDef=id=>SKINS.find(x=>x.id===id)||SHOPSKINS.find(x=>x.id===id)||null;
/* accesorios 3D sobre el modelo de la gallina (se llama desde getModel) */
function cosAcc(cs,base,parts){
  const h=base.head,hd=h.hd,hs=h.s,L=base.size,yb=base[0].c[1],T=h.y;
  const hb=(c,s,col,role,x)=>parts.push(B(c,s,col,role,Object.assign({},hd,x||{})));
  const bd=(c,s,col,role,x)=>parts.push(B(c,s,col,role||'body',x));
  const lg=(base.find(p=>p.an==='leg')||{s:[0,0.2]}).s[1];
  const hx=h.x;
  /* gorros */
  switch(cs.hat){
    case 'paja':
      hb([hx,T+0.02,0],[hs*2.0,0.035,hs*1.8],'#e8c76a','acc');
      hb([hx,T+0.035+hs*0.2,0],[hs*0.9,hs*0.42,hs*0.78],'#f0d680','acc');
      hb([hx,T+0.07,0],[hs*0.94,0.05,hs*0.82],'#c0392b','acc');break;
    case 'cocinero':
      hb([hx-0.01,T+hs*0.13,0],[hs*0.95,hs*0.3,hs*0.85],'#ffffff','acc');
      hb([hx-0.01,T+hs*0.43,0],[hs*1.2,hs*0.36,hs*1.05],'#f4f4f4','acc');break;
    case 'chistera':
      hb([hx,T+0.02,0],[hs*1.4,0.03,hs*1.25],'#1b1b22','acc');
      hb([hx,T+0.03+hs*0.45,0],[hs*0.85,hs*0.9,hs*0.75],'#26262e','acc');
      hb([hx,T+0.1,0],[hs*0.9,0.07,hs*0.8],'#8e44ff','acc');break;
    case 'vikingo':
      hb([hx,T+hs*0.1,0],[hs*1.08,hs*0.32,hs*0.95],'#9aa3b5','acc');
      hb([hx+hs*0.3,T-hs*0.1,0],[0.03,hs*0.12,hs*0.5],'#5f687c','acc');
      [1,-1].forEach(s=>{hb([hx,T+hs*0.28,s*hs*0.58],[0.05,hs*0.34,0.05],'#f4ecd0','acc');hb([hx,T+hs*0.52,s*hs*0.7],[0.05,hs*0.22,0.05],'#f4ecd0','acc');});break;
    case 'halo':{
      const y=T+hs*0.75;
      [1,-1].forEach(s=>{hb([hx,y,s*hs*0.5],[hs*1.0,0.03,0.04],'#ffe36a','acc',{glow:true});hb([hx+s*hs*0.5,y,0],[0.04,0.03,hs*1.0],'#ffe36a','acc',{glow:true});});break;}
    case 'fiesta':
      hb([hx-0.01,T+0.05,0],[hs*0.7,0.1,hs*0.6],'#ff4fa0','acc');
      hb([hx-0.01,T+0.15,0],[hs*0.5,0.1,hs*0.42],'#ffd24a','acc');
      hb([hx-0.01,T+0.25,0],[hs*0.3,0.1,hs*0.25],'#4fd0ff','acc');
      hb([hx-0.01,T+0.33,0],[0.07,0.07,0.07],'#ffffff','acc',{glow:true});break;
  }
  /* zapatillas: siguen la animación de las patas */
  const foot=(col,sole,tall,glow)=>[1,-1].forEach(s=>{
    const z=s*L*0.2,an={an:'leg',pv:[0,lg,z],ph:s>0?0:Math.PI};
    if(tall)bd([0,lg*0.3,z],[L*0.17,lg*0.6,L*0.17],col,'limb',Object.assign({glow:glow},an));
    bd([L*0.06,0.045,z],[L*0.3,0.09,L*0.19],col,'limb',Object.assign({glow:glow},an));
    if(sole)bd([L*0.06,0.012,z],[L*0.32,0.025,L*0.2],sole,'limb',an);
  });
  switch(cs.shoes){
    case 'deportivas':foot('#d8262b','#ffffff',false,false);break;
    case 'botas':foot('#f2c21b','#3a3a3a',true,false);break;
    case 'oro':foot('#ffd24a','#fff3a0',false,true);break;
    case 'cohete':
      foot('#8d98b3','#454b5c',false,false);
      [1,-1].forEach(s=>{const z=s*L*0.2,an={an:'leg',pv:[0,lg,z],ph:s>0?0:Math.PI};bd([-L*0.12,0.03,z],[0.1,0.07,0.1],'#ff8a1a','limb',Object.assign({glow:true},an));bd([-L*0.2,0.03,z],[0.08,0.05,0.07],'#fff3a0','limb',Object.assign({glow:true},an));});break;
  }
  /* trajes */
  const fr=L*0.5+0.015;
  switch(cs.suit){
    case 'peto':
      bd([-L*0.1,yb-L*0.02,0],[L*0.4,L*0.87,L*0.84],'#2f6bd8');
      bd([fr,yb-L*0.05,0],[0.035,L*0.5,L*0.55],'#3b7cf0');
      [1,-1].forEach(s=>bd([fr+0.02,yb+L*0.2,s*L*0.22],[0.03,0.05,0.05],'#ffd24a','acc'));break;
    case 'delantal':
      bd([fr,yb-L*0.08,0],[0.035,L*0.7,L*0.6],'#ffffff');
      bd([L*0.0,yb+L*0.05,0],[L*0.12,0.03,L*0.86],'#f1f1f1');
      bd([fr+0.02,yb-L*0.02,0],[0.02,L*0.16,L*0.2],'#e6e6e6');break;
    case 'capa':
      bd([-L*0.5-0.03,yb-L*0.05,0],[0.04,L*1.0,L*0.9],'#d8262b');
      bd([-L*0.5-0.05,yb+L*0.45,0],[0.05,0.06,L*0.92],'#ffd24a','acc');
      bd([-L*0.5-0.06,yb-L*0.05,0],[0.03,L*0.3,L*0.3],'#ffe36a','acc',{glow:true});break;
    case 'esmoquin':
      bd([-L*0.1,yb-L*0.02,0],[L*0.5,L*0.88,L*0.84],'#15151c');
      bd([fr,yb-L*0.02,0],[0.03,L*0.52,L*0.3],'#ffffff');
      bd([fr+0.03,yb+L*0.36,0],[0.05,0.05,0.05],'#d8262b','acc');
      [1,-1].forEach(s=>bd([fr+0.025,yb+L*0.36,s*0.065],[0.04,0.07,0.07],'#d8262b','acc'));break;
    case 'armadura':
      bd([fr+0.01,yb,0],[0.05,L*0.62,L*0.7],'#d4a82a');
      bd([fr+0.04,yb,0],[0.02,L*0.2,L*0.5],'#fff0a0','acc',{glow:true});
      [1,-1].forEach(s=>bd([0,yb+L*0.3,s*(L*0.4+0.09)],[L*0.32,0.09,0.09],'#d4a82a'));
      bd([-L*0.5-0.03,yb,0],[0.05,L*0.62,L*0.7],'#b88a1a');break;
    case 'jetpack':
      [1,-1].forEach(s=>{
        bd([-L*0.5-0.1,yb,s*L*0.2],[L*0.2,L*0.55,L*0.2],'#8d98b3');
        bd([-L*0.5-0.1,yb+L*0.3,s*L*0.2],[L*0.2,0.05,L*0.2],'#d8262b','acc');
        bd([-L*0.5-0.1,yb-L*0.34,s*L*0.2],[L*0.12,0.12,L*0.12],'#ff8a1a','acc',{glow:true});
        bd([-L*0.5-0.1,yb-L*0.44,s*L*0.2],[L*0.07,0.1,L*0.07],'#fff3a0','acc',{glow:true});
      });break;
  }
}
