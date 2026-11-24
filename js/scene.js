'use strict';
/* scene.js — Escenario: decorado, cielo y suelo */
/* ============ escenario ============ */
const decor=[];
(function(){
  const post=(x,z)=>decor.push({model:[B([0,0.75,0],[0.34,1.5,0.34],'#c9c2dd','body'),B([0,1.6,0],[0.5,0.2,0.5],'#e94b5b','acc')],x,y:0,z,yaw:0});
  [[-10,-6],[10,-6],[-10,6],[10,6]].forEach(a=>post(a[0],a[1]));
  const rope=(x,z,sx,sz)=>decor.push({model:[B([0,1.0,0],[sx,0.12,sz],'#e94b5b','acc')],x,y:0,z,yaw:0});
  rope(0,-6,20,0.12);rope(-10,0,0.12,12);rope(10,0,0.12,12);
  decor.push({model:[B([0,0.7,0],[40,1.4,2],'#2a2146','body')],x:0,y:0,z:-8.2,yaw:0});
  decor.push({model:[B([0,3.2,0],[40,3.6,0.6],'#352a5c','body')],x:0,y:0,z:-10,yaw:0});
  const pal=['#ff6b6b','#ffd24a','#4ecdc4','#a78bfa','#ff9f43','#6ec1ff','#ff7eb6','#7bed9f'];
  for(let r=0;r<2;r++)for(let i=0;i<26;i++){
    const x=-12.5+i*1.0+(r?0.5:0),sk=['#f1c9a0','#c68e62','#8d5a3a','#f7d9b5'][(i*7+r*3)%4];
    decor.push({model:[B([0,0.3,0],[0.5,0.6,0.4],pal[(i*5+r*3)%pal.length],'body'),B([0,0.75,0],[0.36,0.36,0.36],sk,'head')],x,y:1.4+r*0.0,z:-7.6-r*0.9,yaw:0,seed:i*1.7+r,bob:true});
  }
})();
function drawSky(){
  const g=ctx.createLinearGradient(0,0,0,H*0.5);g.addColorStop(0,TH.sky[0]);g.addColorStop(0.6,TH.sky[1]);g.addColorStop(1,TH.sky[2]);
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#ffe9a0';ctx.beginPath();ctx.arc(W*0.8,H*0.16,Math.min(W,H)*0.07,0,7);ctx.fill();
  ctx.fillStyle=TH.hill;ctx.beginPath();ctx.moveTo(0,H*0.3);
  for(let i=0;i<=8;i++)ctx.lineTo(W*i/8,H*(0.2+0.08*Math.sin(i*1.7)+0.03*(i%2)));
  ctx.lineTo(W,H*0.45);ctx.lineTo(0,H*0.45);ctx.fill();
}
function drawFloor(){
  const z0=PORT?-26:-12,z1=PORT?28:14,x0=PORT?-40:-18,x1=PORT?20:18;
  for(let tz=z0;tz<z1;tz+=2)for(let tx=x0;tx<x1;tx+=2){
    const a=proj(tx,0,tz),b=proj(tx+2,0,tz),c=proj(tx+2,0,tz+2),d=proj(tx,0,tz+2);
    if(!a||!b||!c||!d)continue;
    const inA=tx>=-10&&tx<10&&tz>=-6&&tz<6,chk=((tx+tz)/2)&1;
    ctx.fillStyle=inA?(chk?TH.fa:TH.fb):(chk?TH.oa:TH.ob);
    ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(c[0],c[1]);ctx.lineTo(d[0],d[1]);ctx.closePath();ctx.fill();
  }
  const a=proj(-0.08,0.01,-6),b=proj(0.08,0.01,-6),c=proj(0.08,0.01,6),d=proj(-0.08,0.01,6);
  if(a&&b&&c&&d){ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(c[0],c[1]);ctx.lineTo(d[0],d[1]);ctx.fill();}
}

