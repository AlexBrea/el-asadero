'use strict';
/* models.js — Modelos de animales hechos con cajas, skins de la gallina y getModel() */
/* ============ modelos de animales (cajitas) ============ */
function quad(o){
  const P=[],lg=o.leg,lw=o.lw||Math.max(0.1,o.W*0.25),yb=lg+o.H/2,L=o.L,Wd=o.W,hs=o.head;
  P.push(B([0,yb,0],[L,o.H,Wd],o.col,'body'));
  if(o.belly)P.push(B([0,yb-o.H*0.32,0],[L*0.94,o.H*0.4,Wd*1.04],o.belly,'body'));
  [[1,1,0],[1,-1,Math.PI],[-1,1,Math.PI],[-1,-1,0]].forEach(([sx,sz,ph])=>{
    const x=sx*(L/2-lw/2),z=sz*(Wd/2-lw/2);
    P.push(B([x,lg/2,z],[lw,lg,lw],o.legc||o.col,'limb',{an:'leg',pv:[x,lg,z],ph}));
  });
  const hx=L/2+hs*0.25,hy=yb+o.H*0.3+(o.hup||0),hd={an:'head',pv:[L/2-0.1,yb+o.H*0.1,0]};
  P.push(B([hx,hy,0],[hs,hs,hs*1.05],o.hcol||o.col,'head',hd));
  if(o.sn)P.push(B([hx+hs/2+o.sn/2-0.03,hy-hs*0.17,0],[o.sn,hs*0.42,hs*0.55],o.snc||o.hcol||o.col,'head',hd));
  if(o.nose)P.push(B([hx+hs/2+(o.sn||0)-0.01,hy-hs*0.08,0],[0.06,0.07,0.1],'#1a1a1a','head',hd));
  const es=Math.max(0.045,hs*0.13);
  [1,-1].forEach(s=>P.push(B([hx+hs/2-0.01,hy+hs*0.14,s*hs*0.27],[0.04,es,es],'#111111','eye',hd)));
  if(o.ear)[1,-1].forEach(s=>{
    const ec=o.earc||o.hcol||o.col,t=o.ear;
    if(t==='point')P.push(B([hx-hs*0.1,hy+hs/2+hs*0.2,s*hs*0.3],[hs*0.2,hs*0.4,hs*0.2],ec,'acc',hd));
    if(t==='floppy')P.push(B([hx-hs*0.05,hy+hs*0.02,s*(hs/2+0.03)],[hs*0.3,hs*0.6,0.06],ec,'acc',hd));
    if(t==='round')P.push(B([hx-hs*0.1,hy+hs/2+hs*0.08,s*hs*0.35],[hs*0.25,hs*0.25,hs*0.22],ec,'acc',hd));
    if(t==='big')P.push(B([hx-hs*0.15,hy+hs*0.1,s*(hs/2+0.06)],[hs*0.2,hs*0.9,hs*0.8],ec,'acc',hd));
  });
  if(o.mane)P.push(B([hx-hs*0.3,hy,0],[hs*0.7,hs*1.5,hs*1.55],o.mane,'acc',hd));
  if(o.trunk){
    const tx=hx+hs/2+0.08;
    P.push(B([tx,hy-hs*0.35,0],[0.28,hs*0.9,0.28],o.col,'head',hd));
    P.push(B([tx+0.17,hy-hs*0.85,0],[0.4,0.26,0.26],o.col,'head',hd));
    [1,-1].forEach(s=>P.push(B([tx-0.05,hy-hs*0.5,s*0.26],[0.55,0.1,0.1],'#f4efe0','acc',hd)));
  }
  const tl=o.tail||0.3,tc=o.tailc||o.col;
  if(o.tailUp)P.push(B([-L/2-0.04,yb+tl/2,0],[0.08,tl,0.08],tc,'tail',{an:'tail',pv:[-L/2,yb,0]}));
  else P.push(B([-L/2-tl/2,yb+o.H*0.15,0],[tl,o.tailh||0.1,o.tailh||0.1],tc,'tail',{an:'tail',pv:[-L/2,yb+o.H*0.15,0]}));
  P.head={x:hx,y:hy+hs/2,s:hs,hd};P.size=L;return P;
}
function bird(o){
  const P=[],L=o.L,lg=o.leg,yb=lg+L*0.45;
  P.push(B([0,yb,0],[L,L*0.85,L*0.8],o.col,'body'));
  if(o.breast)P.push(B([L*0.15,yb-L*0.1,0],[L*0.75,L*0.6,L*0.84],o.breast,'body'));
  const hs=L*0.5,hx=L*0.55,hy=yb+L*0.6,hd={an:'head',pv:[L*0.3,yb+L*0.3,0]};
  P.push(B([hx,hy,0],[hs,hs,hs*0.85],o.hcol||o.col,'head',hd));
  P.push(B([hx+hs/2+L*0.1,hy-hs*0.1,0],[L*0.25,L*0.13,L*0.16],'#f2a31b','acc',Object.assign({beak:true},hd)));
  P.push(B([hx+hs*0.25,hy-hs*0.5,0],[L*0.08,L*0.2,L*0.12],'#d8262b','acc',hd));
  P.push(B([hx,hy+hs/2+L*0.1,0],[hs*0.5,L*0.22,L*0.1],'#d8262b','acc',hd));
  const es=Math.max(0.04,L*0.08);
  [1,-1].forEach(s=>P.push(B([hx+hs/2-0.01,hy+hs*0.12,s*hs*0.28],[0.04,es,es],'#111111','eye',hd)));
  [1,-1].forEach(s=>{
    const z=s*(L*0.4+0.04);
    P.push(B([-L*0.05,yb,z],[L*0.55,L*0.5,0.07],o.wing||o.col,'limb',{an:'wing',pv:[-L*0.05,yb+L*0.25,z],sg:s}));
    P.push(B([0,lg/2,s*L*0.2],[L*0.1,lg,L*0.1],'#f2a31b','limb',{an:'leg',pv:[0,lg,s*L*0.2],ph:s>0?0:Math.PI}));
  });
  const n=o.tailN||1;
  for(let i=0;i<n;i++)P.push(B([-L/2-L*0.12-i*L*0.08,yb+L*0.25+i*L*0.18,0],[L*0.2,L*0.5,L*0.1],o.tailc[i%o.tailc.length],'tail',{an:'tail',pv:[-L/2,yb,0]}));
  P.head={x:hx,y:hy+hs/2,s:hs,hd};P.size=L;return P;
}
function gorilla(){
  const P=[],lg=0.55,dk='#2c2c33';
  P.push(B([0,lg+0.55,0],[0.8,1.1,0.95],dk,'body'));
  P.push(B([0.41,lg+0.7,0],[0.04,0.6,0.7],'#4a4a55','body'));
  [1,-1].forEach((s,i)=>{
    const z=s*0.24;
    P.push(B([0,lg/2,z],[0.34,lg,0.34],'#24242a','limb',{an:'leg',pv:[0,lg,z],ph:i?Math.PI:0}));
    const az=s*0.68,pv=[0.05,lg+1.3,az],ph=i?0:Math.PI;
    P.push(B([0.05,lg+0.7,az],[0.3,1.15,0.3],dk,'limb',{an:'arm',pv,ph}));
    P.push(B([0.05,lg+0.12,az],[0.38,0.3,0.38],'#1d1d22','limb',{an:'arm',pv,ph}));
  });
  const hd={an:'head',pv:[0.2,lg+1.2,0]};
  P.push(B([0.3,lg+1.45,0],[0.5,0.5,0.5],dk,'head',hd));
  P.push(B([0.56,lg+1.4,0],[0.05,0.3,0.34],'#6b5a4a','acc',hd));
  P.push(B([0.52,lg+1.62,0],[0.1,0.1,0.5],'#1d1d22','acc',hd));
  [1,-1].forEach(s=>P.push(B([0.56,lg+1.5,s*0.12],[0.04,0.06,0.06],'#ffffff','eye',hd)));
  P.head={x:0.3,y:lg+1.72,s:0.5,hd};P.size=1.15;return P;
}
const HPM=1.6;
const SP={
 chicken:{es:['Gallina','Gallinas'],e:'🐔',hp:10,atk:2,rate:0.7,spd:3.4,mk:()=>bird({L:0.5,leg:0.22,col:'#f7f4ea',tailc:['#e9e4d2'],tailN:1})},
 rooster:{es:['Gallo','Gallos'],e:'🐓',hp:14,atk:3,rate:0.75,spd:3.5,mk:()=>bird({L:0.7,leg:0.3,col:'#b5531c',hcol:'#c96a22',breast:'#7a2f10',wing:'#8e3b12',tailc:['#1d6b4a','#2b3fa0','#b5531c'],tailN:3})},
 cat:{es:['Gato','Gatos'],e:'🐱',hp:30,atk:6,rate:0.65,spd:4.4,mk:()=>quad({L:0.6,H:0.3,W:0.26,leg:0.25,lw:0.1,head:0.28,sn:0.05,col:'#f0912e',belly:'#fff1d8',ear:'point',tailUp:1,tail:0.5,nose:1})},
 dog:{es:['Perro','Perros'],e:'🐶',hp:60,atk:20,rate:0.85,spd:4.1,mk:()=>quad({L:0.95,H:0.5,W:0.4,leg:0.4,lw:0.15,head:0.4,sn:0.22,col:'#a8703a',hcol:'#b97d44',snc:'#e6c69a',ear:'floppy',earc:'#5b3515',tail:0.35,tailh:0.12,nose:1,belly:'#e6c69a'})},
 wolf:{es:['Lobo','Lobos'],e:'🐺',hp:80,atk:30,rate:0.85,spd:4.5,mk:()=>quad({L:1.2,H:0.55,W:0.4,leg:0.55,lw:0.16,head:0.42,sn:0.35,col:'#8a8f98',belly:'#c9ced6',ear:'point',earc:'#5d626b',tail:0.5,tailh:0.2,nose:1})},
 puma:{es:['Puma','Pumas'],e:'🐆',hp:100,atk:30,rate:0.8,spd:4.9,mk:()=>quad({L:1.4,H:0.5,W:0.4,leg:0.5,lw:0.15,head:0.38,sn:0.16,col:'#c99b5c',belly:'#ecd9b8',ear:'round',tail:0.95,tailh:0.13,nose:1})},
 lion:{es:['León','Leones'],e:'🦁',hp:180,atk:60,rate:0.95,spd:3.7,mk:()=>quad({L:1.5,H:0.8,W:0.65,leg:0.62,lw:0.22,head:0.52,sn:0.16,col:'#d9a441',hcol:'#e2b25a',mane:'#7a4a1e',ear:'round',earc:'#7a4a1e',tail:0.9,tailh:0.12,tailc:'#7a4a1e',nose:1,hup:0.1})},
 bear:{es:['Oso','Osos'],e:'🐻',hp:240,atk:55,rate:1.1,spd:3.1,mk:()=>quad({L:1.6,H:1.0,W:0.95,leg:0.5,lw:0.4,head:0.62,sn:0.25,col:'#5a3a22',hcol:'#6b4529',snc:'#c9a77f',ear:'round',earc:'#3d2514',tail:0.18,tailh:0.2,nose:1})},
 gorilla:{es:['Gorila','Gorilas'],e:'🦍',hp:260,atk:65,rate:1.0,spd:3.1,mk:gorilla},
 chick:{es:['Pollito','Pollitos'],e:'🐥',hp:10,atk:2,rate:0.7,spd:3.6,mk:()=>bird({L:0.38,leg:0.16,col:'#ffe066',hcol:'#ffe97a',wing:'#ffd23a',tailc:['#ffd23a'],tailN:1})},
 elephant:{es:['Elefante','Elefantes'],e:'🐘',hp:500,atk:70,rate:1.3,spd:2.5,mk:()=>quad({L:2.1,H:1.5,W:1.15,leg:0.95,lw:0.48,head:0.95,col:'#8f9aa8',hcol:'#9ba6b4',ear:'big',earc:'#7b8695',trunk:1,tail:0.5,tailh:0.1,hup:-0.05})}
};
const TP=[null,{body:'#8b95aa',head:'#aeb8cc',limb:'#5f687c',acc:'#2ec8ff',tail:'#5f687c',eye:'#ff3050'},{body:'#e0b020',head:'#ffd84d',limb:'#a8780c',acc:'#ff4f2e',tail:'#c58f12',eye:'#4df0ff'}];
const SKINS=[
 {id:'classic',n:'Clásica',lvl:1,d:'La gallina de siempre'},
 {id:'cap',n:'Gorra roja',lvl:3,d:'Una gorra muy molona'},
 {id:'black',n:'Gallina negra',lvl:6,d:'Plumas negras y cresta roja',pal:{body:'#26232b',head:'#2f2b35',wing:'#1b1920',tail:'#1b1920'}},
 {id:'pirate',n:'Pirata',lvl:10,d:'Pañuelo y parche en el ojo',pal:{body:'#8a5a3a',head:'#9b6a46',wing:'#6e4529',tail:'#5a3820'}},
 {id:'ninja',n:'Ninja',lvl:15,d:'Sigilo y estilo',pal:{body:'#1e2a4a',head:'#26345c',wing:'#141c33',tail:'#141c33'}},
 {id:'royal',n:'Gallina real',lvl:20,d:'Corona y capa de reina',pal:{body:'#fff6e0',head:'#fffaf0',wing:'#f1e2b8',tail:'#f1e2b8'}},
 {id:'rainbow',n:'Arcoíris',lvl:25,d:'Colores que no paran de cambiar',rbw:1},
 {id:'fire',n:'Gallina de fuego',lvl:30,d:'Ardiente y brillante',pal:{body:'#ff6a1a',head:'#ff8a2a',wing:'#ffb81a',tail:'#ff3d1a',glow:['wing','tail']}},
 {id:'galaxy',n:'Galaxia',lvl:40,d:'Un cielo lleno de estrellas',pal:{body:'#2a1b5c',head:'#3a2680',wing:'#1c1240',tail:'#7b3fa0'}},
 {id:'legend',n:'Legendaria',lvl:50,d:'Oro puro, halo y corona',pal:{body:'#ffd24a',head:'#ffe38a',wing:'#ffb81a',tail:'#ffd24a',glow:['wing','tail']}}
];
function skinAcc(id,base,parts){
  const h=base.head,hd=h.hd,hs=h.s,L=base.size,yb=base[0].c[1],T=h.y;
  const hb=(c,s,col,role,x)=>parts.push(B(c,s,col,role,Object.assign({},hd,x||{})));
  if(id==='cap'){
    hb([h.x-0.01,T+0.035,0],[hs*1.08,0.08,hs*0.92],'#d8262b','acc');
    hb([h.x+hs*0.62,T-0.005,0],[hs*0.45,0.03,hs*0.75],'#9e1a1f','acc');
    hb([h.x-0.01,T+0.095,0],[0.05,0.03,0.05],'#ffffff','acc');
  }else if(id==='pirate'){
    hb([h.x,T-0.03,0],[hs*1.1,0.06,hs*0.96],'#c42b2b','acc');
    hb([h.x-hs*0.62,T-0.05,0],[0.1,0.05,0.05],'#c42b2b','acc');
    hb([h.x+hs*0.1,T-0.03,hs*0.49],[0.04,0.035,0.02],'#ffffff','acc');
    hb([h.x+hs/2+0.005,T-hs*0.38,hs*0.28],[0.035,0.08,0.08],'#111111','eye');
  }else if(id==='ninja'){
    hb([h.x,T-0.045,0],[hs*1.1,0.055,hs*0.96],'#d8262b','acc');
    hb([h.x-hs*0.62,T-0.05,0],[0.13,0.03,0.05],'#d8262b','acc');
    hb([h.x-hs*0.74,T-0.09,0.03],[0.1,0.03,0.04],'#d8262b','acc');
    hb([h.x+hs/2+0.004,T-0.045,0],[0.02,0.05,hs*0.9],'#c9ced6','acc');
  }else if(id==='royal'){
    hb([h.x,T+0.03,0],[hs*1.02,0.06,hs*0.9],'#ffd700','acc',{glow:true});
    [-0.3,0,0.3].forEach(z=>hb([h.x,T+0.085,z*hs],[0.045,0.07,0.045],'#ffd700','acc',{glow:true}));
    hb([h.x+hs*0.5,T+0.035,0],[0.02,0.035,0.035],'#ff3a5a','acc',{glow:true});
    parts.push(B([-L*0.5-0.03,yb,0],[0.04,L*0.85,L*0.8],'#7b2fbf','body'));
    parts.push(B([-L*0.5-0.05,yb+L*0.4,0],[0.04,0.05,L*0.82],'#fff0a0','body'));
  }else if(id==='fire'){
    hb([h.x-0.02,T+0.09,0],[0.08,0.13,0.08],'#ff3d1a','acc',{glow:true});
    hb([h.x-0.02,T+0.17,0.02],[0.05,0.09,0.05],'#ffb81a','acc',{glow:true});
    hb([h.x-0.04,T+0.22,-0.01],[0.03,0.06,0.03],'#fff3a0','acc',{glow:true});
    parts.push(B([-L/2-0.1,yb+0.2,0],[0.1,0.2,0.1],'#ffd23a','tail',{an:'tail',pv:[-L/2,yb,0],glow:true}));
  }else if(id==='galaxy'){
    const cl=['#ffffff','#8fe9ff','#ffd0ff','#fff3a0'];
    [[0.1,0.1],[-0.12,0.06],[0.0,-0.12],[-0.05,0.14],[0.16,-0.08]].forEach((a,i)=>parts.push(B([a[0],yb+L*0.43+0.006,a[1]],[0.045,0.012,0.045],cl[i%4],'acc',{glow:true})));
    [[0.12,0.12],[-0.1,-0.05],[0.02,0.0],[-0.15,0.09]].forEach((a,i)=>[1,-1].forEach(sg=>parts.push(B([a[0],yb+a[1],sg*(L*0.4+0.006)],[0.045,0.045,0.012],cl[(i+(sg>0?1:3))%4],'acc',{glow:true}))));
    hb([h.x+hs*0.05,T+0.006,0.0],[0.05,0.012,0.05],'#ffffff','acc',{glow:true});
  }else if(id==='legend'){
    hb([h.x,T+0.04,0],[hs*1.1,0.07,hs*0.96],'#ffd700','acc',{glow:true});
    [-0.35,-0.12,0.12,0.35].forEach((z,i)=>hb([h.x,T+0.1+(i===1||i===2?0.02:0),z*hs],[0.045,0.09,0.045],'#fff3a0','acc',{glow:true}));
    hb([h.x+hs*0.55,T+0.04,0],[0.02,0.04,0.04],'#ff3a5a','acc',{glow:true});
    hb([h.x,T+0.27,0],[hs*1.25,0.025,hs*1.25],'#fff3a0','acc',{glow:true});
  }
}
const mcache={};
function getModel(k,tier,gold,skin,spec){
  const sk=(k==='chicken'&&skin&&skin!=='classic')?SKINS.find(x=>x.id===skin):null;
  const sp=(k==='chicken'&&spec)?spec:null,id=k+tier+(gold?'G':'')+(sk?sk.id:'')+(sp?'S'+sp:'');if(mcache[id])return mcache[id];
  const base=SP[k].mk(),pal=TP[tier];
  const parts=base.map(p=>{const q=Object.assign({},p);q.col=pal?C(pal[p.role]||pal.body):p.col;if(gold&&p.beak){q.col=C('#ffd700');q.glow=true;}return q;});
  if(sk&&tier===0&&sk.pal){
    const pl=sk.pal;
    parts.forEach(q=>{
      let c=null,key=null;
      if(q.an==='wing'){c=pl.wing;key='wing';}
      else if(q.role==='body'){c=pl.body;key='body';}
      else if(q.role==='head'&&!q.beak){c=pl.head;key='head';}
      else if(q.role==='tail'){c=pl.tail;key='tail';}
      if(c){q.col=C(c);if(pl.glow&&pl.glow.indexOf(key)>=0)q.glow=true;}
    });
  }
  if(sk)skinAcc(sk.id,base,parts);
  if(sp)specAcc(sp,base,parts);
  if(tier>0){
    const h=base.head,hd=h.hd;
    parts.push(B([h.x-h.s*0.1,h.y+0.12,0],[0.05,0.24,0.05],tier>1?'#a8780c':'#5f687c','limb',hd));
    parts.push(B([h.x-h.s*0.1,h.y+0.3,0],[0.11,0.11,0.11],tier>1?'#ff4f2e':'#2ec8ff','eye',hd));
    if(tier>1)parts.push(B([h.x-h.s*0.05,h.y+0.04,0],[h.s*0.85,0.1,h.s*0.85],'#fff0a0','eye',hd));
  }
  let top=0,hw=0;
  parts.forEach(p=>{top=Math.max(top,p.c[1]+p.s[1]/2);hw=Math.max(hw,Math.abs(p.c[2])+p.s[2]/2);});
  return mcache[id]={parts,size:base.size,top,hw,rbw:!!(sk&&sk.rbw&&tier===0)};
}
