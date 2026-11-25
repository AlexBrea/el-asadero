'use strict';
/* chests.js — Cofres, llaves, skins con niveles y bonos de los cosméticos */
/* ---- skins que salen de cofres (las 5 de antes + 4 nuevas) ---- */
const NEWSKINS=[
 {id:'sakura',n:'Sakura',lvl:9999,d:'Pétalos de cerezo',rar:'rare',price:0,pal:{body:'#ffd0e0',head:'#ffe1ec',wing:'#ff8fb8',tail:'#ff8fb8'}},
 {id:'noche',n:'Noche estrellada',lvl:9999,d:'Vuela de madrugada',rar:'rare',price:0,pal:{body:'#16183a',head:'#1e2250',wing:'#3b3f9c',tail:'#3b3f9c',glow:['tail']}},
 {id:'cristal',n:'Cristal',lvl:9999,d:'Plumas de gema',rar:'epic',price:0,pal:{body:'#7fe8ff',head:'#b6f4ff',wing:'#b48bff',tail:'#b48bff',glow:['wing','tail']}},
 {id:'solar',n:'Solar',lvl:9999,d:'Brilla como el sol',rar:'legend',price:0,pal:{body:'#fff3b0',head:'#ffffff',wing:'#ffd24a',tail:'#ff9d1e',glow:['body','wing','tail']}}
];
NEWSKINS.forEach(s=>{SKINS.push(s);SHOPSKINS.push(s);CAT.push({id:s.id,slot:'skin',n:s.n,rar:s.rar,price:0,d:s.d});});
const CS=SHOPSKINS;                                   /* lista de skins de cofre */
const chestSkin=id=>CS.find(s=>s.id===id)||null;
const MAXL=5,NEED=[1,2,4,8,16];                       /* copias necesarias para el nivel 1..5 */
const CB=[0,0,400,900,1800,3600],CM={rare:1,epic:1.4,legend:2};
const costFor=(id,L)=>Math.round(CB[L]*CM[catOf(id).rar]/10)*10;   /* precio de subir al nivel L */
const maxByCopies=c=>{let l=0;NEED.forEach((n,i)=>{if(c>=n)l=i+1;});return l;};
const skLvl=id=>Math.max(1,SH.sl&&SH.sl[id]||1);
const skCopies=id=>SH.sc&&SH.sc[id]||0;
/* ---- llaves y estado extra de SH ---- */
function ensureSh(){
  if(!SH.ky)SH.ky={n:0,e:0};if(!SH.sc)SH.sc={};if(!SH.sl)SH.sl={};
  CS.forEach(s=>{if(SH.own[s.id]&&!SH.sc[s.id])SH.sc[s.id]=1;if(SH.own[s.id]&&!SH.sl[s.id])SH.sl[s.id]=1;});
}
const _shopClean=shopClean;
shopClean=function(o){
  const r=_shopClean(o);
  r.ky={n:shN(o&&o.ky&&o.ky.n,999),e:shN(o&&o.ky&&o.ky.e,999)};r.sc={};r.sl={};
  CS.forEach(s=>{
    if(!r.own[s.id])return;
    const c=Math.max(1,shN(o&&o.sc&&o.sc[s.id],9999));r.sc[s.id]=c;
    r.sl[s.id]=Math.max(1,Math.min(shN(o&&o.sl&&o.sl[s.id],MAXL)||1,maxByCopies(c)));
  });
  return r;
};
SH=shopClean(SH);
function addKey(t,n){ensureSh();SH.ky[t]+=n;shopSave();}
/* ---- bonos de los cosméticos y de la skin ---- */
const BV={common:0.015,rare:0.03,epic:0.045,legend:0.07};
const BTX={dmg:'daño',hp:'vida',crit:'prob. crítico',def:'defensa',spd:'velocidad',vamp:'robo de vida'};
const hashId=s=>{let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h;};
const pct=v=>(Math.round(v*1000)/10).toString().replace('.',',');
const SLOTB={hat:['crit','dmg'],shoes:['spd','hp'],suit:['def','hp']};
function cosBuff(x){const t=SLOTB[x.slot][hashId(x.id)%2];return{t,v:BV[x.rar]*(t==='spd'?0.8:1)};}
function skinBuff(id,L){const x=catOf(id),t=['dmg','hp','crit','vamp','def'][hashId(id)%5];return{t,v:BV[x.rar]*0.4*L*(t==='vamp'?0.6:1)};}
function heroBuffs(){
  ensureSh();
  const b={dmg:0,hp:0,crit:0,def:0,spd:0,vamp:0};
  ['hat','shoes','suit'].forEach(s=>{const x=catOf(SH.eq[s]);if(x&&SLOTB[x.slot]){const c=cosBuff(x);b[c.t]+=c.v;}});
  const k=curSkinBuff();if(k)b[k.t]+=k.v;
  return b;
}
const buffTxt=b=>{const a=Object.keys(b).filter(k=>b[k]>0).map(k=>'+'+pct(b[k])+'% '+BTX[k]);return a.length?a.join(' · '):'ninguno (equipa cosméticos o una skin de cofre)';};
CAT.forEach(x=>{if(SLOTB[x.slot]){const c=cosBuff(x);x.d+=' · +'+pct(c.v)+'% '+BTX[c.t];}});
/* skins de nivel (no de cofre): bono fijo según lo difícil de conseguir */
const lvRar=l=>l<=6?'common':l<=15?'rare':l<=25?'epic':'legend';
function lvSkinBuff(id){const sk=SKINS.find(x=>x.id===id);if(!sk||sk.lvl>=9999||id==='classic')return null;const t=['dmg','hp','crit','spd','def'][hashId(id)%5];return{t,v:BV[lvRar(sk.lvl)]*0.8*(t==='spd'?0.8:1)};}
function curSkinBuff(){
  if(chestSkin(SKIN)&&SH.own[SKIN])return skinBuff(SKIN,skLvl(SKIN));
  return lvSkinBuff(SKIN);
}
SKINS.forEach(sk=>{const b=lvSkinBuff(sk.id);if(b)sk.d+=' · +'+pct(b.v)+'% '+BTX[b.t];});
/* panel de estadísticas extra en \"Mi gallina\" */
function buffPanel(){
  ensureSh();const rows=[];
  const sk=SKINS.find(x=>x.id===SKIN),kb=curSkinBuff();
  if(sk&&kb)rows.push(['🎨 Skin '+sk.n+(chestSkin(SKIN)?' (nv '+skLvl(SKIN)+')':''),kb]);
  [['hat','🎩'],['shoes','👟'],['suit','🧥']].forEach(([sl,ic])=>{const x=catOf(SH.eq[sl]);if(x&&SLOTB[x.slot])rows.push([ic+' '+x.n,cosBuff(x)]);});
  let h='<b>📊 Estadísticas extra</b>';
  if(!rows.length)h+='<span class="bnr">Sin bonos todavía: equipa cosméticos o una skin.</span>';
  else{rows.forEach(r=>{h+='<span class="bnr"><i>'+r[0]+'</i><em>+'+pct(r[1].v)+'% '+BTX[r[1].t]+'</em></span>';});
    h+='<span class="bnr tot"><i>Total</i><em>'+buffTxt(heroBuffs())+'</em></span>';}
  return h;
}
const _showHen=showHen;
showHen=function(){_showHen.apply(this,arguments);const cv=$('hcv');if(!cv)return;const d=document.createElement('div');d.className='bnp';d.innerHTML=buffPanel();cv.insertAdjacentElement('afterend',d);};
const _memberStats=memberStats;
memberStats=function(m){
  const o=_memberStats.apply(this,arguments);
  if(m&&m.hero){
    const b=heroBuffs(),dm=1+b.dmg;
    o.hp*=1+b.hp;o.atk*=dm;o.crit=Math.min(0.8,(o.crit||0)+b.crit);o.dmgMul*=Math.max(0.3,1-b.def);o.spd*=1+b.spd;o.vamp+=b.vamp;
    o.fireDps*=dm;if(o.laser)o.laser.dmg*=dm;if(o.egg)o.egg.dmg*=dm;if(o.storm)o.storm.dmg*=dm;
  }
  return o;
};
/* ---- cómo se consiguen las llaves ---- */
const _shopRound=shopRound;
shopRound=function(pw,boss){
  _shopRound.apply(this,arguments);
  if(pw&&boss){
    const n=infN;
    if(n>=40){if(Math.random()<0.2){addKey('e',1);toast('🗝️ ¡El jefe soltaba una <b>llave épica</b>!');}}
    else if(n>=10){if(Math.random()<0.25){addKey('n',1);toast('🔑 ¡El jefe soltaba una <b>llave</b>!');}}
  }
};
const _claimMission=claimMission;
claimMission=function(i){
  const m=SH.dq&&SH.dq.m[i],d=m&&mDef(m.id),hit=!!(m&&!m.cl&&mDone(m)&&d.g>=35&&Math.random()<0.25);
  _claimMission.apply(this,arguments);
  if(hit&&m.cl){addKey('n',1);toast('🪙 +'+d.g+' monedas · 🔑 ¡y una llave!');}
};
const _claimPass=claimPass;
claimPass=function(){
  const t0=SH.bp,t1=bpTier();
  _claimPass.apply(this,arguments);
  if(SH.bp>t0){
    let n=0,e=0;for(let i=t0+1;i<=t1;i++){if(i===10||i===15)n++;if(i===20)e++;}
    if(n||e){ensureSh();SH.ky.n+=n;SH.ky.e+=e;shopSave();toast('🔑 ¡Llaves del pase! +'+n+' normal'+(e?' y +'+e+' épica':''));}
  }
};
const _showPass=showPass;
showPass=function(){_showPass.apply(this,arguments);const p=$('mbox').querySelector('.sm');if(p)p.innerHTML+='<br>🔑 Llaves: nivel 10 y 15 (normal) · nivel 20 (épica)';};
/* las skins ya no se venden: salen de los cofres */
const _buyItem=buyItem;
buyItem=function(id){const x=catOf(id);if(x&&x.slot==='skin'){toast('🎁 Las skins salen de los cofres');return;}return _buyItem.apply(this,arguments);};
const _showShop=showShop;
showShop=function(){if(shSlot==='skin')shSlot='hat';_showShop.apply(this,arguments);const b=$('mbox').querySelector('[data-sl=skin]');if(b)b.remove();};
/* ---- pestaña Cofres ---- */
(function(){
  const st=document.createElement('style');
  st.textContent='.chrow{display:flex;gap:10px;justify-content:center;margin:6px 0 10px}'
  +'.chb{flex:1;max-width:210px;background:linear-gradient(160deg,#4b3a86,#2c2152);border:3px solid #6a58b8;border-radius:16px;padding:8px 6px 10px;display:flex;flex-direction:column;align-items:center;gap:3px}'
  +'.chb.ep{border-color:#c77dff;box-shadow:0 0 14px #c77dff66}'
  +'.chb b{font-size:15px}.chb small{font-size:11px;color:#d9ceff;font-weight:700;line-height:1.25}'
  +'.chc{width:140px;height:110px;display:block}.chc.big{width:220px;height:172px;margin:6px auto}'
  +'.cbt{background:linear-gradient(#ffd24a,#ff9d1e);color:#2a1448;border:none;border-radius:12px;padding:7px 12px;font-weight:900;font-size:13px;font-family:inherit;box-shadow:0 3px 0 #a35b00;cursor:pointer;margin-top:4px}'
  +'.cbt:active{transform:translateY(2px)}.cbt.dis{background:#ffffff1c;color:#d9ceff;box-shadow:none;cursor:default}.cbt.gr{background:linear-gradient(#7bed9f,#2ec866);box-shadow:0 3px 0 #17803d;color:#07381a}'
  +'.spc.lock{opacity:.5;filter:grayscale(.8)}.spb{display:flex;flex-direction:column;gap:4px;flex:none}'
  +'.bnp{background:#ffffff14;border:2px solid #6a58b8;border-radius:12px;padding:6px 10px;margin:0 0 8px;text-align:left;font-size:12px}.bnp b{display:block;color:#ffe08a;font-size:13px;margin-bottom:3px}'
  +'.bnr{display:flex;justify-content:space-between;gap:8px;padding:1px 0;color:#ece6ff;font-weight:700}.bnr i{font-style:normal}.bnr em{font-style:normal;color:#7bed9f;font-weight:900;text-align:right}.bnr.tot{border-top:1px solid #ffffff22;margin-top:3px;padding-top:3px}'
  +'#tabbar button{min-width:0}#tabbar button span{white-space:nowrap}';
  document.head.appendChild(st);
})();
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function drawChest(cv,kind,o){
  const S=2,W=140,H=110;if(cv.width!==W*S){cv.width=W*S;cv.height=H*S;}
  const c=cv.getContext('2d');c.setTransform(S,0,0,S,0,0);c.clearRect(0,0,W,H);
  const ep=kind==='e',wood=ep?'#5b2a9c':'#9a6330',dark=ep?'#3a176e':'#6b4119',band=ep?'#ffd24a':'#c8ccd8',bandD=ep?'#c9941a':'#8f95a6',bx=20,bw=100,by=58,bh=42;
  if(o>0){const g=c.createRadialGradient(70,56,4,70,56,62);g.addColorStop(0,(ep?'rgba(210,150,255,':'rgba(255,230,140,')+(0.95*o)+')');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,W,H);}
  c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(70,102,52,8,0,0,7);c.fill();
  c.fillStyle=wood;rr(c,bx,by,bw,bh,5);c.fill();
  c.fillStyle=dark;c.fillRect(bx,by+14,bw,2);c.fillRect(bx,by+28,bw,2);
  if(o>0){c.fillStyle=ep?'#ffe9ff':'#fff3b0';c.fillRect(bx+5,by-1,bw-10,3+7*o);}
  [38,96].forEach(x=>{c.fillStyle=band;c.fillRect(x,by,8,bh);c.fillStyle=bandD;c.fillRect(x+6,by,2,bh);});
  const lh=30*(1-0.85*o),ly=by-lh-14*o+ (o>0?0:0);
  c.fillStyle=ep?'#6d34b8':'#b27838';rr(c,bx-2,ly,bw+4,lh+4,8);c.fill();
  [38,96].forEach(x=>{c.fillStyle=band;c.fillRect(x,ly,8,lh+2);});
  if(o<0.3){c.fillStyle=ep?'#ffe27a':'#e8c04a';rr(c,62,by-8,16,17,3);c.fill();c.fillStyle='#3a2a10';c.beginPath();c.arc(70,by-1,2.6,0,7);c.fill();c.fillRect(69,by-1,2,6);}
  if(o>0.2){c.fillStyle='rgba(255,255,255,'+(0.9*o)+')';for(let i=0;i<6;i++){const a=i*1.05+TT*2,r=14+(i%3)*10+o*16;c.fillRect(70+Math.cos(a)*r*1.3,44-Math.abs(Math.sin(a))*r*0.9,2.4,2.4);}}
}
function skinRarW(kind){return kind==='e'?{rare:20,epic:55,legend:25}:{rare:70,epic:26,legend:4};}
function rollSkin(kind){
  const w=skinRarW(kind);let r=Math.random()*100,rar='rare';
  for(const k of ['rare','epic','legend']){if(r<w[k]){rar=k;break;}r-=w[k];}
  const pool=CS.filter(s=>s.rar===rar);return pool[(Math.random()*pool.length)|0];
}
function showChests(){
  tabCur='chest';hideScreens();closeStats();ensureSh();
  const k=SH.ky;
  const h='<div class="tabv"><h1>🎁 Cofres</h1>'+coinChip()+' <div class="coin">🔑 <b>'+k.n+'</b> · 🗝️ <b>'+k.e+'</b></div>'
   +'<p class="sm">Las llaves caen de los jefes (poca probabilidad), de misiones difíciles y del pase de batalla.</p>'
   +'<div class="chrow"><div class="chb"><canvas class="chc" id="chN"></canvas><b>Cofre normal</b><small>Raro 70% · Épico 26% · Legendario 4%</small><button class="cbt'+(k.n?'':' dis')+'" id="oN">Abrir · 🔑 1</button></div>'
   +'<div class="chb ep"><canvas class="chc" id="chE"></canvas><b>Cofre épico</b><small>Raro 20% · Épico 55% · Legendario 25%</small><button class="cbt'+(k.e?'':' dis')+'" id="oE">Abrir · 🗝️ 1</button></div></div>'
   +'<p class="sm">Bonos activos: <b>'+buffTxt(heroBuffs())+'</b></p>'
   +'<p class="sm">Si te toca una skin repetida, sube de nivel con monedas: nivel 2 con 2 copias, 3 con 4, 4 con 8, 5 con 16.</p>'
   +'<div class="spl" id="skl"></div></div>';
  $('mbox').classList.remove('hn');
  setModal(h,[]);
  drawChest($('chN'),'n',0);drawChest($('chE'),'e',0);
  $('oN').onclick=()=>{ensureAudio();snd.click();openChest('n');};
  $('oE').onclick=()=>{ensureAudio();snd.click();openChest('e');};
  const box=$('skl');
  CS.slice().sort((a,b)=>['rare','epic','legend'].indexOf(a.rar)-['rare','epic','legend'].indexOf(b.rar)).forEach(s=>{
    const own=!!SH.own[s.id],L=skLvl(s.id),c=skCopies(s.id),x=catOf(s.id),d=document.createElement('div');
    d.className='spc'+(own?'':' lock');d.style.setProperty('--c',RAR[x.rar].c);
    let info='<b>'+s.n+'</b><span style="color:'+RAR[x.rar].c+';font-weight:900">'+RAR[x.rar].n+'</span>';
    let btn='';
    if(!own){info+='<small>🔒 Sin conseguir · sale de los cofres</small>';}
    else{
      const bf=skinBuff(s.id,L);
      info+='<span>Nivel '+L+'/'+MAXL+' · copias '+c+'</span><small>Bono: +'+pct(bf.v)+'% '+BTX[bf.t]+'</small>';
      if(L<MAXL){const need=NEED[L],cost=costFor(s.id,L+1),ok=c>=need;info+='<small>Nivel '+(L+1)+': '+Math.min(c,need)+'/'+need+' copias · 🪙 '+cost+'</small>';
        btn+='<button class="cbt'+(ok&&SH.c>=cost?' gr':' dis')+'" data-up="'+s.id+'">Mejorar</button>';}
      else info+='<small>⭐ Nivel máximo</small>';
      btn+='<button class="cbt'+(SKIN===s.id?' dis':'')+'" data-eq="'+s.id+'">'+(SKIN===s.id?'✅ Puesta':'Equipar')+'</button>';
    }
    d.innerHTML='<canvas class="ic"></canvas><div class="spt">'+info+'</div><div class="spb">'+btn+'</div>';
    box.appendChild(d);icons.push({cv:d.querySelector('canvas'),spec:()=>skinSpec(s.id)});
  });
  box.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>upgradeSkin(b.dataset.up));
  box.querySelectorAll('[data-eq]').forEach(b=>b.onclick=()=>{ensureAudio();snd.click();SKIN=b.dataset.eq;saveProfile();showChests();});
  coinify($('mbox'));
}
function upgradeSkin(id){
  ensureSh();const L=skLvl(id);if(L>=MAXL||!SH.own[id])return;
  const need=NEED[L],cost=costFor(id,L+1);
  if(skCopies(id)<need){toast('🎁 Te faltan copias: '+skCopies(id)+'/'+need);return;}
  if(SH.c<cost){toast('🪙 Te faltan <b>'+(cost-SH.c)+'</b> monedas');return;}
  ensureAudio();snd.win&&snd.win();
  SH.c-=cost;SH.sl[id]=L+1;shopSave();toast('⭐ «'+catOf(id).n+'» sube al nivel '+(L+1));showChests();
}
function openChest(kind){
  ensureSh();const key=kind==='e'?'e':'n';
  if(SH.ky[key]<1){toast('🔑 Te falta una llave'+(key==='e'?' épica':''));return;}
  SH.ky[key]--;
  const sk=rollSkin(kind),had=!!SH.own[sk.id];
  SH.own[sk.id]=1;SH.sc[sk.id]=(SH.sc[sk.id]||0)+1;if(!SH.sl[sk.id])SH.sl[sk.id]=1;
  shopSave();
  setModal('<div class="tabv"><h1>Abriendo…</h1><canvas class="chc big" id="chA"></canvas></div>',[]);
  const cv=$('chA'),t0=performance.now();snd.click&&snd.click();
  const step=now=>{
    if(!cv.isConnected)return;
    const k=Math.min(1,(now-t0)/1200),open=k<0.45?0:(k-0.45)/0.55;
    cv.style.transform='translateX('+(k<0.45?Math.sin(k*120)*4*(1-k/0.45):0)+'px)';
    drawChest(cv,kind,open);
    if(k<1)requestAnimationFrame(step);else{snd.win&&snd.win();showReveal(sk,had,kind);}
  };
  requestAnimationFrame(step);
}
function showReveal(sk,had,kind){
  ensureSh();
  const x=catOf(sk.id),c=skCopies(sk.id),L=skLvl(sk.id),nl=maxByCopies(c),bf=skinBuff(sk.id,L);
  const h='<div class="tabv"><h1>'+(had?'¡Skin repetida!':'¡Skin nueva!')+'</h1><canvas class="ic hen" id="rvc"></canvas>'
   +'<div style="font-weight:900;font-size:22px;color:'+RAR[x.rar].c+'">'+sk.n+'</div>'
   +'<p class="sm">'+RAR[x.rar].n+' · copias: <b>'+c+'</b> · Nivel <b>'+L+'</b>'+(nl>L?'<br>¡Ya puedes mejorarla al nivel '+(L+1)+'!':'')+'<br>Bono: +'+pct(bf.v)+'% '+BTX[bf.t]+'</p></div>';
  const btns=[{t:'Aceptar',f:showChests}];
  setModal(h,btns);
  icons.push({cv:$('rvc'),spec:()=>skinSpec(sk.id)});
}
/* pestaña en la barra inferior */
const _tabGo=tabGo;
tabGo=function(t){if(t==='chest'){ensureAudio();snd.click();showChests();return;}return _tabGo.apply(this,arguments);};
const _tabSync=tabSync;
tabSync=function(){_tabSync.apply(this,arguments);const d=document.querySelector('#tabbar [data-t=chest] i');if(d){ensureSh();d.style.display=(SH.ky.n+SH.ky.e)>0?'block':'none';}};
const _dotSync=()=>{const d=document.querySelector('#tabbar [data-t=chest] i');if(d){ensureSh();d.style.display=(SH.ky.n+SH.ky.e)>0?'block':'none';}};
wrapFn('setModal',_dotSync);wrapFn('hideScreens',_dotSync);
