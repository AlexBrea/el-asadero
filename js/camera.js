'use strict';
/* camera.js — Canvas, cámara (3ª/1ª persona) y proyección 3D */
/* ============ canvas / cámara ============ */
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
let W=0,H=0,DPR=1,F=800,FB=800,PORT=false,YF=0.42;
const CAM={y:7,z:14.5,pitch:0.45};
let fp=false,fpYaw=0,lookY=0,lookP=0,looking=false,camTx=0,panH=0,zoom=1,CX=0,CYc=7,CZ=14.5,cyw=1,syw=0,cpt=Math.cos(CAM.pitch),spt=Math.sin(CAM.pitch),shake=0;
function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1);W=window.innerWidth;H=window.innerHeight;cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);
  PORT=W<H*0.85; /* móvil en vertical: arena girada, equipos arriba/abajo */
  if(PORT){CAM.y=16;CAM.z=26;CAM.pitch=0.6;FB=W*1.95;YF=0.64;}
  else{CAM.y=6;CAM.z=12;CAM.pitch=0.45;FB=Math.min(W*0.8,H*1.6);YF=0.56;}
  cpt=Math.cos(CAM.pitch);spt=Math.sin(CAM.pitch);F=FB;
}
window.addEventListener('resize',resize);resize();
function setCam(T){
  const sx=(Math.random()-.5)*shake,sy=(Math.random()-.5)*shake,sw=Math.sin(T*0.22)*1.5+sx;
  const hero=fp?units.find(u=>u.hero&&!u.dead):null;
  if(hero){ /* primera persona: ojos de la gallina de la estrella */
    fpYaw=turnTo(fpYaw,hero.yaw,0.3);
    if(!looking){lookY*=0.9;lookP*=0.9;}
    const la=fpYaw-lookY,dx=Math.cos(la),dz=-Math.sin(la),bob=hero.state==='walk'?Math.sin(hero.gait*16)*0.05:0;
    CX=hero.x+dx*0.05+sx*0.3;CZ=hero.z+dz*0.05+sx*0.3;CYc=hero.top*0.55+hero.y+bob+sy*0.3;
    const yw=Math.atan2(-dx,-dz);cyw=Math.cos(yw);syw=Math.sin(yw);
    const pp=0.02+lookP;cpt=Math.cos(pp);spt=Math.sin(pp);YF=0.5;
    F=(PORT?W*0.75:Math.min(W*0.5,H*1.1))*zoom;
    return;
  }
  cpt=Math.cos(CAM.pitch);spt=Math.sin(CAM.pitch);YF=PORT?0.64:0.56;
  F=FB*zoom;CYc=CAM.y+sy;
  if(PORT){CX=-CAM.z;CZ=sw+panH;}else{CX=panH+sw;CZ=CAM.z;}
  const yw=Math.atan2(PORT?-CAM.z:sw,PORT?sw:CAM.z);cyw=Math.cos(yw);syw=Math.sin(yw);
}
function proj(x,y,z){
  x-=CX;y-=CYc;z-=CZ;
  const x1=x*cyw-z*syw,z1=x*syw+z*cyw;
  const y2=y*cpt-z1*spt,z2=y*spt+z1*cpt;
  const d=-z2;if(d<0.3)return null;
  return [W/2+x1/d*F,H*YF-y2/d*F,d];
}
const C=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const B=(c,s,col,role,x)=>{const p={c,s,col:C(col),role};if(x)Object.assign(p,x);return p;};

