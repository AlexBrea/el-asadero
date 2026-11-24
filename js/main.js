'use strict';
/* main.js — Bucle principal, interfaz y arranque */
/* ============ bucle ============ */
function update(dt){
  try{musicTick();}catch(e){}
  fpBtn.classList.toggle('hide',mode!=='inf');
  if(fp&&mode!=='inf')setFp(false);
  if(drawerOpen&&statsShown){statsT-=dt;if(statsT<=0){statsT=0.5;refreshStats();}}
  runTimers(dt);
  const sdt=dt*speed;
  if(mode==='inf'&&st!=='levelend'&&(!document.hidden||st==='fight'||st==='intro'||st==='rounddone0')){runT+=dt;pend+=dt;}
  if(st==='fight'){
    if(!fightEnd){const n=Math.ceil(sdt/0.025);for(let i=0;i<n;i++)stepFight(sdt/n);}
    else{
      endT+=sdt;
      if(endT>2.0){const pw=fightEnd===1;st='rounddone0';roundOver(pw);}
    }
  }
  updateFx(sdt);
  units.forEach(u=>updateAnim(u,sdt));
  if(units.some(u=>u.dead))units=units.filter(u=>!u.dead);
  for(const p of parts){p.life-=sdt;p.x+=p.vx*sdt;p.y+=p.vy*sdt;p.z+=p.vz*sdt;if(p.k==='s')p.vy-=12*sdt;else{p.vx*=0.95;p.vz*=0.95;}if(p.y<0&&p.k==='s'){p.y=0;p.vy*=-0.3;}}
  for(let i=parts.length-1;i>=0;i--)if(parts[i].life<=0)parts.splice(i,1);
  for(const f of floaters){f.life-=sdt;f.y+=1.3*sdt;}
  for(let i=floaters.length-1;i>=0;i--)if(floaters[i].life<=0)floaters.splice(i,1);
  shake*=Math.exp(-dt*6);
  decor.forEach(d=>{if(d.bob)d.y=1.4+Math.max(0,Math.sin(TT*(st==='fight'?7:2.5)+d.seed))*(st==='fight'?0.35:0.08);});
}
function render(){
  setCam(TT);
  drawSky();drawFloor();
  for(const u of units){
    if(u.alpha<=0.01)continue;
    if(fp&&u.hero)continue;
    const p=proj(u.x,0.02,u.z);if(!p)continue;
    const rx=u.size*0.55*F/p[2],k=1-Math.min(1,u.y/6);
    ctx.fillStyle='rgba(20,10,40,'+(0.35*k*u.alpha)+')';
    ctx.beginPath();ctx.ellipse(p[0],p[1],rx,rx*0.4,0,0,7);ctx.fill();
    ctx.strokeStyle=u.side?'rgba(255,84,104,'+(0.9*k*u.alpha)+')':'rgba(82,168,255,'+(0.9*k*u.alpha)+')';ctx.lineWidth=3;ctx.stroke();
  }
  // anillos en el suelo
  for(const f of fx){
    if(f.k!=='ring')continue;
    const p=proj(f.x,0.03,f.z);if(!p)continue;const k=f.t/f.max,rr=f.r*Math.min(1,k*1.6)*F/p[2];
    ctx.strokeStyle='rgba('+f.c+','+(1-k)+')';ctx.lineWidth=6;ctx.beginPath();ctx.ellipse(p[0],p[1],rr,rr*0.4,0,0,7);ctx.stroke();
  }
  const faces=[];
  for(const d of decor)entFaces(d,faces);
  for(const u of units){if(fp&&u.hero)continue;entFaces(u,faces);}
  faces.sort((a,b)=>b.d-a.d);
  drawFaces(ctx,faces);
  // proyectiles y rayos
  for(const f of fx){
    if(f.k==='egg'){
      const k=Math.min(1,f.t/f.dur),x=f.x0+(f.x1-f.x0)*k,z=f.z0+(f.z1-f.z0)*k,y=0.6+Math.sin(k*Math.PI)*3.2;
      const q=proj(x,y,z),g=proj(x,0.03,z);
      if(g){ctx.fillStyle='rgba(20,10,40,.35)';ctx.beginPath();ctx.ellipse(g[0],g[1],0.35*F/g[2],0.14*F/g[2],0,0,7);ctx.fill();}
      if(q){const r=0.28*F/q[2]*(f.big?2.3:1);ctx.fillStyle='#fff8e0';ctx.strokeStyle='#caa24a';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(q[0],q[1],r*0.8,r,0,0,7);ctx.fill();ctx.stroke();}
    }else if(f.k==='laser'){
      const a=proj(f.x1,f.y1,f.z1),b=proj(f.x2,f.y2,f.z2);if(!a||!b)continue;
      const k=1-f.t/f.max;ctx.lineCap='round';
      const L1=f.c1||'255,60,160',L2=f.c2||'255,120,220';ctx.strokeStyle='rgba('+L1+','+(0.35*k)+')';ctx.lineWidth=16*k+4;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
      ctx.strokeStyle='rgba('+L2+','+k+')';ctx.lineWidth=8*k+2;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,'+k+')';ctx.lineWidth=3*k+1;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
    }
  }
  for(const p of parts){
    const q=proj(p.x,p.y,p.z);if(!q)continue;const r=Math.max(1.5,p.s*F/q[2]),k=Math.max(0,p.life/p.max);
    if(p.k==='p'){ctx.globalAlpha=k*0.7;ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(q[0],q[1],r*(1.6-k),0,7);ctx.fill();}
    else{ctx.globalAlpha=Math.min(1,k*1.5);ctx.fillStyle=p.c;ctx.fillRect(q[0]-r,q[1]-r,r*2,r*2);}
  }
  ctx.globalAlpha=1;
  ctx.textAlign='center';ctx.lineJoin='round';
  const bars=[];
  for(const u of units){
    if(u.dying||u.dead||u.spawnT<1)continue;
    if(fp&&u.hero)continue;
    const mk=u.hero?((u.ref&&u.ref.spec?SPECS[u.ref.spec].n+' · ':'')+(CNAME||'⭐')):u.boss?'👹':'';if(mk){const q=proj(u.x,u.top+0.85+u.y,u.z);if(q){const fs=Math.max(14,Math.min(30,F/q[2]*0.5));ctx.font='900 '+fs+'px sans-serif';ctx.lineWidth=4;ctx.strokeStyle='#1b1330';ctx.strokeText(mk,q[0],q[1]-26);ctx.fillStyle='#ffd24a';ctx.fillText(mk,q[0],q[1]-26);}}
    const q=proj(u.x,u.top+0.3+u.y,u.z);if(!q)continue;
    bars.push({u,x:q[0],y:q[1],d:q[2],w:Math.max(36,Math.min(86,u.size*1.0*F/q[2]))});
  }
  bars.sort((a,b)=>a.d-b.d);
  const placed=[];
  for(const b of bars){
    let y=b.y,t=0;
    while(t<8&&placed.some(p=>Math.abs(p.x-b.x)<(p.w+b.w)/2+2&&Math.abs(p.y-y)<21)){y-=21;t++;}
    placed.push({x:b.x,y,w:b.w});
    const u=b.u,w=b.w,h=8,x=b.x-w/2,pc=Math.max(0,u.hp/u.max);
    ctx.fillStyle='rgba(10,5,25,.9)';ctx.fillRect(x-2,y-h-2,w+4,h+4);
    ctx.fillStyle=u.side?'#ff5468':'#52a8ff';ctx.fillRect(x,y-h,w*pc,h);
    const fs=Math.max(11,Math.min(14,w*0.2)),tx=Math.ceil(u.hp)+'';
    ctx.font='900 '+fs+'px Trebuchet MS,sans-serif';ctx.lineWidth=3;ctx.strokeStyle='#1b1330';ctx.strokeText(tx,b.x,y-h-4);ctx.fillStyle='#fff';ctx.fillText(tx,b.x,y-h-4);
  }
  for(const f of floaters){
    const q=proj(f.x,f.y,f.z);if(!q)continue;
    const fs=Math.max(12,Math.min(34,F/q[2]*0.32));
    ctx.globalAlpha=Math.min(1,f.life*2);ctx.font='900 '+fs+'px Trebuchet MS,system-ui';
    ctx.lineWidth=4;ctx.strokeStyle='#1b1330';ctx.strokeText(f.t,q[0],q[1]);ctx.fillStyle=f.c;ctx.fillText(f.t,q[0],q[1]);
  }
  ctx.globalAlpha=1;
}
let last=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000);last=now;TT+=dt;
  try{update(dt);render();renderIcons();}catch(err){console.error(err);}
  requestAnimationFrame(frame);
}
/* con la pestaña oculta el navegador para requestAnimationFrame: un Worker mantiene la pelea en marcha */
let bgLast=performance.now();
try{
  const wk=new Worker(URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},100)'],{type:'text/javascript'})));
  wk.onmessage=()=>{
    const n=performance.now();let d=(n-bgLast)/1000;bgLast=n;
    if(!document.hidden)return;
    d=Math.min(d,5);
    try{while(d>0.0001){const s=Math.min(0.05,d);TT+=s;update(s);d-=s;}}catch(e){console.error(e);}
  };
}catch(e){console.warn('Sin worker: el juego se pausará en segundo plano',e);}
$('spd').onclick=()=>{speed=speed===1?2:speed===2?3:1;$('spd').textContent='x'+speed;};
const toggleSnd=()=>{muted=!muted;refreshDrawer();};
const toggleMus=()=>{ensureAudio();musicOn=!musicOn;refreshDrawer();};
const fpBtn=$('fpv');
function setFp(v){fp=v;fpBtn.classList.toggle('on',fp);fpBtn.textContent=fp?'🐔':'👁️';fpBtn.setAttribute('aria-label',fp?'Volver a la vista general':'Vista en primera persona');lookY=lookP=0;looking=false;if(fp){const h=units.find(u=>u.hero);if(h)fpYaw=h.yaw;}}
fpBtn.onclick=()=>{ensureAudio();snd.click();setFp(!fp);};
let lkX=0,lkY=0;const ptrs=new Map();let pinchD=0;
const clampCam=()=>{zoom=Math.max(0.45,Math.min(2.6,zoom));panH=Math.max(-16,Math.min(16,panH));};
cv.addEventListener('pointerdown',e=>{
  ptrs.set(e.pointerId,[e.clientX,e.clientY]);try{cv.setPointerCapture(e.pointerId);}catch(_){}
  if(fp){looking=true;lkX=e.clientX;lkY=e.clientY;return;}
  lkX=e.clientX;if(ptrs.size===2){const p=[...ptrs.values()];pinchD=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);}
});
cv.addEventListener('pointermove',e=>{
  if(!ptrs.has(e.pointerId))return;
  if(fp){if(!looking)return;lookY=Math.max(-2.9,Math.min(2.9,lookY+(e.clientX-lkX)*0.008));lookP=Math.max(-0.5,Math.min(0.5,lookP+(e.clientY-lkY)*0.004));lkX=e.clientX;lkY=e.clientY;ptrs.set(e.pointerId,[e.clientX,e.clientY]);return;}
  ptrs.set(e.pointerId,[e.clientX,e.clientY]);
  if(ptrs.size>=2){const p=[...ptrs.values()],d=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);if(pinchD>10&&d>10)zoom*=d/pinchD;pinchD=d;clampCam();return;}
  panH-=(e.clientX-lkX)*CAM.z/F;lkX=e.clientX;clampCam();
});
cv.addEventListener('wheel',e=>{e.preventDefault();zoom*=Math.exp(-e.deltaY*0.0012);clampCam();},{passive:false});
const endLook=e=>{ptrs.delete(e.pointerId);looking=false;pinchD=0;const p=[...ptrs.values()];if(p.length)lkX=p[0][0];};
cv.addEventListener('pointerup',endLook);cv.addEventListener('pointercancel',endLook);
$('menu').onclick=()=>{ensureAudio();drawerOpen?closeDrawer():openDrawer();};
$('dclose').onclick=closeDrawer;
$('d-stats').onclick=()=>{statsShown=!statsShown;$('dstats').classList.toggle('on',statsShown);$('d-stats').querySelector('.ar').textContent=statsShown?'▴':'▾';refreshStats();};
$('d-mus').onclick=toggleMus;$('d-snd').onclick=toggleSnd;
$('d-rank').onclick=()=>{closeDrawer();showRanking();};
$('d-home').onclick=()=>{
  if(!homeArm){homeArm=1;$('d-home').textContent='⚠️ ¿Seguro? Pulsa otra vez';setTimeout(()=>{if(homeArm){homeArm=0;$('d-home').textContent='🏠 Menú principal';}},3000);return;}
  closeDrawer();showMenu();
};
$('d-out').onclick=()=>{closeDrawer();doSignOut();};
boot();
requestAnimationFrame(frame);
