'use strict';
/* render3d.js — Render 3D por caras (entFaces) y animaciones de partes */
/* ============ render 3D por caras ============ */
const FA=[[0,2,6,4],[1,5,7,3],[0,4,5,1],[2,3,7,6],[0,1,3,2],[4,6,7,5]];
const LX=0.45,LY=0.85,LZ=0.35,LN=Math.hypot(LX,LY,LZ);
const V=new Float64Array(24),SX=new Float64Array(8),SY=new Float64Array(8),SD=new Float64Array(8);
function atkCurve(a){ // 0..0.6 -> [pitch,lunge,head,arm]
  if(a<0.25){const k=a/0.25;return[0.3*k,-0.15*k,0.45*k,2.6*k];}
  if(a<0.4){const k=(a-0.25)/0.15;return[0.3-0.55*k,-0.15+0.75*k,0.45-1.25*k,2.6-2.4*k];}
  const k=Math.min(1,(a-0.4)/0.2);return[-0.25*(1-k),0.6*(1-k),-0.8*(1-k),0.2*(1-k)];
}
let TT=0;
function partRot(p,e){
  switch(p.an){
    case 'leg':return [2,Math.sin(e.gait*8+p.ph)*0.75*e.wk];
    case 'arm':
      if(e.state==='attack')return [2,atkCurve(e.atkT)[3]];
      if(e.win)return [2,2.4+Math.sin(TT*10+(p.ph||0))*0.4];
      return [2,Math.sin(e.gait*8+p.ph)*0.6*e.wk+Math.sin(TT*2+e.seed)*0.04];
    case 'head':
      if(e.state==='attack')return [2,atkCurve(e.atkT)[2]];
      return [2,Math.sin(TT*2+e.seed)*0.05+Math.sin(e.gait*8)*0.1*e.wk];
    case 'tail':return [1,Math.sin(TT*(4+e.wk*6)+e.seed)*0.45];
    case 'wing':{
      let fl=0.08;
      if(e.state==='walk')fl+=0.6*Math.abs(Math.sin(e.gait*14));
      if(e.state==='attack')fl+=0.9*Math.abs(Math.sin(e.atkT*18));
      if(e.win)fl+=0.9*Math.abs(Math.sin(TT*16));
      return [0,-p.sg*fl];
    }
  }
  return [0,0];
}
function rb(h){h=(((h%360)+360)%360)/60;const x=1-Math.abs(h%2-1),i=h|0,R=[1,x,0,0,x,1],G=[x,1,1,x,0,0],Bl=[0,0,x,1,1,x];return [(40+215*R[i])|0,(40+215*G[i])|0,(40+215*Bl[i])|0];}
function entFaces(e,out){
  const al=e.alpha===undefined?1:e.alpha;if(al<=0.01)return;
  const sc=e.sc||1,yaw=e.yaw||0,cw=Math.cos(yaw),sw=Math.sin(yaw);
  const pit=e.pitch||0,cp=Math.cos(pit),sp=Math.sin(pit);
  const rl=e.roll||0,cr=Math.cos(rl),sr=Math.sin(rl),lift=rl?(e.hw||0.3)*Math.abs(sr)*sc:0;
  const lun=e.lunge||0,ox=e.x+Math.cos(yaw)*lun,oz=e.z-Math.sin(yaw)*lun,oy=(e.y||0)+lift;
  const fl=e.flash>0?Math.min(1,e.flash/0.18)*0.75:0,py0=0.45*sc;
  const rob=e.robot,rbw=e.rbw;let pi=0;
  for(const p of e.model){
    pi++;let ax=0,ang=0;
    if(p.an){const r=partRot(p,e);ax=r[0];ang=r[1];}
    const ca=Math.cos(ang),sa=Math.sin(ang),hx=p.s[0]/2,hy=p.s[1]/2,hz=p.s[2]/2;
    for(let i=0;i<8;i++){
      let x=p.c[0]+((i&1)?hx:-hx),y=p.c[1]+((i&2)?hy:-hy),z=p.c[2]+((i&4)?hz:-hz);
      if(ang){
        const pv=p.pv;x-=pv[0];y-=pv[1];z-=pv[2];
        if(ax===2){const nx=x*ca-y*sa,ny=x*sa+y*ca;x=nx;y=ny;}
        else if(ax===1){const nx=x*ca+z*sa,nz=-x*sa+z*ca;x=nx;z=nz;}
        else{const ny=y*ca-z*sa,nz=y*sa+z*ca;y=ny;z=nz;}
        x+=pv[0];y+=pv[1];z+=pv[2];
      }
      x*=sc;y*=sc;z*=sc;
      if(pit){y-=py0;const nx=x*cp-y*sp,ny=x*sp+y*cp;x=nx;y=ny+py0;}
      if(rl){const ny=y*cr-z*sr,nz=y*sr+z*cr;y=ny;z=nz;}
      const wx=ox+x*cw+z*sw,wz=oz-x*sw+z*cw,wy=oy+y;
      V[i*3]=wx;V[i*3+1]=wy;V[i*3+2]=wz;
      const rx=wx-CX,ry=wy-CYc,rz=wz-CZ,x1=rx*cyw-rz*syw,z1=rx*syw+rz*cyw,y2=ry*cpt-z1*spt,z2=ry*spt+z1*cpt,d=-z2;
      if(d>0.3){SD[i]=d;SX[i]=W/2+x1/d*F;SY[i]=H*YF-y2/d*F;}else SD[i]=-1;
    }
    let bx=0,by=0,bz=0;for(let i=0;i<8;i++){bx+=V[i*3];by+=V[i*3+1];bz+=V[i*3+2];}bx/=8;by/=8;bz/=8;
    const col=(rbw&&p.role!=='eye'&&p.role!=='acc'&&p.an!=='leg')?rb(TT*80+pi*14):p.col,glow=p.glow||(rob&&p.role==='eye');
    for(let f=0;f<6;f++){
      const q=FA[f],i0=q[0],i1=q[1],i2=q[2],i3=q[3];
      if(SD[i0]<0||SD[i1]<0||SD[i2]<0||SD[i3]<0)continue;
      const ax_=V[i1*3]-V[i0*3],ay_=V[i1*3+1]-V[i0*3+1],az_=V[i1*3+2]-V[i0*3+2];
      const bx_=V[i3*3]-V[i0*3],by_=V[i3*3+1]-V[i0*3+1],bz_=V[i3*3+2]-V[i0*3+2];
      let nx=ay_*bz_-az_*by_,ny=az_*bx_-ax_*bz_,nz=ax_*by_-ay_*bx_;
      const fx=(V[i0*3]+V[i2*3])/2,fy=(V[i0*3+1]+V[i2*3+1])/2,fz=(V[i0*3+2]+V[i2*3+2])/2;
      if(nx*(fx-bx)+ny*(fy-by)+nz*(fz-bz)<0){nx=-nx;ny=-ny;nz=-nz;}
      if(nx*(fx-CX)+ny*(fy-CYc)+nz*(fz-CZ)>=0)continue;
      const nl=Math.hypot(nx,ny,nz)||1;
      let sh=glow?1.15:0.42+0.62*Math.max(0,(nx*LX+ny*LY+nz*LZ)/(nl*LN));
      let r=col[0]*sh,g=col[1]*sh,b=col[2]*sh;
      if(fl){r+=(255-r)*fl;g+=(255-g)*fl;b+=(255-b)*fl;}
      out.push({d:(SD[i0]+SD[i1]+SD[i2]+SD[i3])/4,p:[SX[i0],SY[i0],SX[i1],SY[i1],SX[i2],SY[i2],SX[i3],SY[i3]],c:'rgb('+(Math.min(255,r)|0)+','+(Math.min(255,g)|0)+','+(Math.min(255,b)|0)+')',a:al});
    }
  }
}
