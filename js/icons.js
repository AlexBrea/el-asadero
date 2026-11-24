'use strict';
/* icons.js — Iconos 3D de las tarjetas */
/* ============ iconos 3D de las tarjetas ============ */
const icons=[];
const ocache={};
const G=(c,s,col)=>B(c,s,col,'acc',{glow:true});
const sh=(arr,dx,dy,dz)=>arr.map(p=>Object.assign({},p,{c:[p.c[0]+dx,p.c[1]+dy,p.c[2]+(dz||0)],pv:p.pv?[p.pv[0]+dx,p.pv[1]+dy,p.pv[2]+(dz||0)]:undefined}));
function boundsOf(ps){let top=0,w=0;ps.forEach(p=>{top=Math.max(top,p.c[1]+p.s[1]/2);w=Math.max(w,Math.abs(p.c[0])+p.s[0]/2,Math.abs(p.c[2])+p.s[2]/2);});return{parts:ps,top:Math.max(0.3,top),size:Math.max(0.3,w*2)};}
const OBJ={
 gold:()=>[G([0,0.58,0],[0.95,0.22,0.5],'#ffd700'),G([0.08,0.33,0],[0.75,0.2,0.45],'#e6b800'),B([-0.38,0.46,0],[0.2,0.5,0.42],'#c99a00','acc'),G([0.55,1.0,0.3],[0.13,0.13,0.13],'#fff3a0'),G([-0.4,1.05,-0.25],[0.1,0.1,0.1],'#fff3a0'),G([0.1,1.1,0],[0.08,0.08,0.08],'#ffffff')],
 laser:()=>sh([B([0,0.45,0],[0.7,0.32,0.3],'#7d869a','body'),B([0.55,0.5,0],[0.5,0.14,0.14],'#454b5c','body'),G([0.85,0.5,0],[0.14,0.22,0.22],'#ff3aa0'),G([1.1,0.5,0],[0.35,0.06,0.06],'#ff9ae0'),B([-0.15,0.15,0],[0.2,0.4,0.22],'#454b5c','body'),B([0.05,0.7,0],[0.2,0.1,0.2],'#a7b0c4','body')],-0.45,0,0),
 egg:()=>[B([0,0.25,0],[0.55,0.25,0.55],'#f6ecd2','body'),B([0,0.5,0],[0.72,0.3,0.72],'#f6ecd2','body'),B([0,0.78,0],[0.58,0.28,0.58],'#f6ecd2','body'),B([0,0.98,0],[0.32,0.14,0.32],'#f6ecd2','body'),B([0,0.5,0],[0.76,0.1,0.76],'#d8262b','acc'),B([0.04,1.15,0],[0.07,0.2,0.07],'#3b3b3b','body'),G([0.04,1.3,0],[0.16,0.16,0.16],'#ff8a1a')],
 storm:()=>[B([0,0.2,0],[0.9,0.1,0.3],'#b7a8f0','acc'),B([-0.4,0.6,0],[0.22,0.8,0.06],'#d9ceff','body'),B([0,0.7,0],[0.24,1.0,0.06],'#ffffff','body'),B([0.4,0.6,0],[0.22,0.8,0.06],'#d9ceff','body'),B([-0.4,0.6,0],[0.05,0.9,0.1],'#8f7fe0','acc'),B([0,0.7,0],[0.05,1.1,0.1],'#8f7fe0','acc'),B([0.4,0.6,0],[0.05,0.9,0.1],'#8f7fe0','acc')],
 fire:()=>[G([0,0.2,0],[0.7,0.35,0.7],'#ff3d1a'),G([0,0.5,0],[0.52,0.4,0.52],'#ff8a1a'),G([0,0.84,0],[0.34,0.36,0.34],'#ffd23a'),G([0,1.1,0],[0.16,0.2,0.16],'#fff3a0'),G([0.3,0.45,0.3],[0.18,0.3,0.18],'#ff8a1a'),G([-0.3,0.4,-0.3],[0.18,0.26,0.18],'#ff5a1a')],
 vamp:()=>[B([0,0.55,0],[1.0,0.16,0.4],'#b3122a','body'),B([-0.28,0.3,0],[0.16,0.45,0.16],'#ffffff','body'),B([0.28,0.3,0],[0.16,0.45,0.16],'#ffffff','body'),G([0.28,-0.05,0],[0.1,0.14,0.1],'#ff2a4a'),B([0,0.72,0],[0.8,0.1,0.3],'#7a0c1c','body')],
 armor:()=>[B([0,0.6,0],[0.85,0.95,0.14],'#8d98b3','body'),B([0,0.2,0],[0.5,0.3,0.14],'#8d98b3','body'),B([0,0.6,0.1],[0.16,0.7,0.1],'#ffd24a','acc'),B([0,0.65,0.1],[0.55,0.14,0.1],'#ffd24a','acc'),B([0,1.1,0],[0.95,0.1,0.18],'#5f687c','body')],
 speed:()=>[G([0.15,1.0,0],[0.4,0.3,0.14],'#ffe14d'),G([0,0.75,0],[0.4,0.3,0.14],'#ffd21a'),G([-0.12,0.5,0],[0.4,0.3,0.14],'#ffe14d'),G([0.05,0.25,0],[0.22,0.3,0.14],'#ffb81a')],
 power:()=>[B([0,0.5,0],[1.1,0.12,0.12],'#9aa3b5','body'),B([-0.38,0.5,0],[0.18,0.7,0.7],'#c43b3b','body'),B([0.38,0.5,0],[0.18,0.7,0.7],'#c43b3b','body'),B([-0.55,0.5,0],[0.14,0.5,0.5],'#8f2a2a','body'),B([0.55,0.5,0],[0.14,0.5,0.5],'#8f2a2a','body')],
 vit:()=>[B([-0.22,0.85,0],[0.38,0.38,0.28],'#ff3a5a','body'),B([0.22,0.85,0],[0.38,0.38,0.28],'#ff3a5a','body'),B([0,0.55,0],[0.85,0.38,0.28],'#ff3a5a','body'),B([0,0.28,0],[0.5,0.25,0.28],'#e02548','body'),B([0,0.08,0],[0.2,0.2,0.28],'#c8183a','body'),G([-0.25,0.9,0.15],[0.12,0.12,0.06],'#ffd0d8')],
 flock:()=>sh(SP.chick.mk(),-0.35,0,0.0).concat(sh(SP.chick.mk(),0.4,0,0.1)),
 phoenix:()=>bird({L:0.7,leg:0.25,col:'#ff7a1a',hcol:'#ff9a2a',breast:'#ffb81a',wing:'#ffcf3a',tailc:['#ff3d1a','#ffb81a','#ffe36a'],tailN:3}).concat([G([0,1.5,0],[0.2,0.2,0.2],'#ffe36a')])
};
function objSpec(id){
  if(id==='robot')return [Object.assign({},boundsOf(getModel('chicken',1).parts),{robot:true})];
  if(id==='titan')return [Object.assign({},boundsOf(getModel('chicken',2).parts),{robot:true})];
  if(!ocache[id])ocache[id]=boundsOf(OBJ[id]());
  return [ocache[id]];
}
function skinSpec(id){const mo=getModel('chicken',0,false,id);return [Object.assign({},boundsOf(mo.parts),{robot:false,rbw:mo.rbw})];}
function memberSpec(m){const mo=getModel(m.k,m.t,m.l.gold>0,m.hero?m.skin:null,m.hero?m.spec:null);return [Object.assign({},boundsOf(mo.parts),{robot:m.t>0,rbw:mo.rbw})];}
function renderIcons(){
  if(!icons.length)return;
  const sv=[W,H,F,CX,CYc,CZ,cyw,syw,cpt,spt,YF],dpr=Math.min(2,window.devicePixelRatio||1);
  for(const ic of icons){
    const cv2=ic.cv;if(!cv2||!cv2.isConnected)continue;
    const w=cv2.clientWidth||150,h=cv2.clientHeight||90;
    if(cv2.width!==Math.round(w*dpr)||cv2.height!==Math.round(h*dpr)){cv2.width=Math.round(w*dpr);cv2.height=Math.round(h*dpr);}
    const c=cv2.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
    YF=0.42;W=w;H=h;F=h*2.4;CX=0;CYc=1.65;CZ=3.5;cyw=1;syw=0;const pit=Math.atan(1.1/3.5);cpt=Math.cos(pit);spt=Math.sin(pit);
    const ents=ic.spec();let mx=0,sz=0;ents.forEach(e=>{mx=Math.max(mx,e.top);sz=Math.max(sz,e.size);});
    const fit=Math.min(1.05/mx,1.5/sz);
    const faces=[];
    ents.forEach((e,i)=>{
      const x=0,z=0,yaw=TT*1.1+i*0.7;
      entFaces({model:e.parts,x,z,y:0,yaw,sc:fit,robot:e.robot,rbw:e.rbw,gait:TT*2,wk:0,state:'idle',seed:i,hw:0.3},faces);
      const p=proj(x,0,z);if(p){c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(p[0],p[1],e.size*fit*0.55*F/p[2],e.size*fit*0.2*F/p[2],0,0,7);c.fill();}
    });
    drawFaces(c,faces);
  }
  [W,H,F,CX,CYc,CZ,cyw,syw,cpt,spt,YF]=sv;
}
function drawFaces(c,faces){
  faces.sort((a,b)=>b.d-a.d);
  c.lineJoin='round';c.lineWidth=1;
  for(const f of faces){
    const p=f.p;c.globalAlpha=f.a;c.fillStyle=f.c;
    c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(p[2],p[3]);c.lineTo(p[4],p[5]);c.lineTo(p[6],p[7]);c.closePath();c.fill();
    c.strokeStyle='rgba(15,8,30,.35)';c.stroke();
  }
  c.globalAlpha=1;
}
