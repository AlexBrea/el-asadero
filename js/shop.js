'use strict';
/* shop.js — Monedas, misiones diarias, pase de batalla, tienda y "Mi gallina" (+ tabbar) */
const SH_TOP=20,PX_TIER=300;
let SH={c:0,own:{},eq:{},dq:null,ps:'',px:0,bp:0,ts:0};
let tabCur='game',shSub='shop',shSlot='hat',hnSlot='hat';
const cosOf=()=>SH.eq;
const shN=(v,m)=>Math.max(0,Math.min(m||1e9,Math.floor(+v||0)));
const dayKey=()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();};
const seasonKey=()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1);};
/* misiones posibles (progreso = estadística actual − la de inicio del día) */
const MPOOL=[
 {id:'r8',f:'r',t:8,g:8,n:'Supera 8 rondas'},{id:'r15',f:'r',t:15,g:18,n:'Supera 15 rondas'},{id:'r25',f:'r',t:25,g:35,n:'Supera 25 rondas'},
 {id:'k80',f:'k',t:80,g:8,n:'Derrota a 80 enemigos'},{id:'k200',f:'k',t:200,g:18,n:'Derrota a 200 enemigos'},{id:'k400',f:'k',t:400,g:35,n:'Derrota a 400 enemigos'},
 {id:'g3',f:'g',t:3,g:8,n:'Empieza 3 partidas'},{id:'g6',f:'g',t:6,g:16,n:'Empieza 6 partidas'},
 {id:'b1',f:'b',t:1,g:20,n:'Derrota a un jefe'},{id:'b2',f:'b',t:2,g:40,n:'Derrota a 2 jefes'},
 {id:'rl3',f:'rl',t:3,g:12,n:'Consigue 3 reliquias'},{id:'rl6',f:'rl',t:6,g:25,n:'Consigue 6 reliquias'}
];
const mDef=id=>MPOOL.find(x=>x.id===id);
function seedRng(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return()=>{h^=h<<13;h^=h>>>17;h^=h<<5;return((h>>>0)%100000)/100000;};}
function newDaily(){
  const rnd=seedRng(dayKey()+'|'+UID),fs=['r','k','g','b','rl'].sort(()=>rnd()-0.5).slice(0,3),m=[];
  fs.forEach(f=>{const c=MPOOL.filter(x=>x.f===f);m.push({id:c[Math.floor(rnd()*c.length)].id,cl:0});});
  const b={};['k','b','r','g','rl'].forEach(f=>b[f]=stN(ST[f]));
  return{d:dayKey(),b,m};
}
function shopClean(o){
  const r={c:shN(o&&o.c),own:{},eq:{},dq:null,ps:String((o&&o.ps)||'').slice(0,10),px:shN(o&&o.px),bp:shN(o&&o.bp,SH_TOP),ts:shN(o&&o.ts,1e15)};
  if(o&&o.own)CAT.forEach(x=>{if(o.own[x.id])r.own[x.id]=1;});
  if(o&&o.eq)['hat','shoes','suit'].forEach(s=>{const x=catOf(o.eq[s]);if(x&&x.slot===s&&r.own[x.id])r.eq[s]=x.id;});
  const q=o&&o.dq;
  if(q&&typeof q.d==='string'&&q.b&&Array.isArray(q.m)){
    r.dq={d:q.d.slice(0,12),b:{},m:q.m.slice(0,3).filter(x=>x&&mDef(x.id)).map(x=>({id:x.id,cl:x.cl?1:0}))};
    ['k','b','r','g','rl'].forEach(f=>r.dq.b[f]=stN(q.b[f]));
  }
  return r;
}
function shopRoll(){
  if(!SH.dq||SH.dq.d!==dayKey()||!SH.dq.m.length)SH.dq=newDaily();
  if(SH.ps!==seasonKey()){SH.ps=seasonKey();SH.px=0;SH.bp=0;}
}
function shopLoad(cloud){
  const a=pj(lsGet('asadero_sh_'+UID)),b=cloud&&typeof cloud==='object'?cloud:null;
  const pick=(b&&(!a||(+b.ts||0)>(+a.ts||0)))?b:a;
  SH=shopClean(pick);shopRoll();
}
function shopSave(){SH.ts=Date.now();lsSet('asadero_sh_'+UID,JSON.stringify(SH));cloudProfile();}
/* progreso */
const mProg=m=>{const d=mDef(m.id);return Math.min(d.t,Math.max(0,stN(ST[d.f])-stN(SH.dq.b[d.f])));};
const mDone=m=>mProg(m)>=mDef(m.id).t;
const bpTier=()=>Math.min(SH_TOP,Math.floor(SH.px/PX_TIER));
const bpRew=t=>5+2*t+(t%5?0:25);
function claimables(){
  if(!SH.dq)return 0;shopRoll();
  let n=0;SH.dq.m.forEach(m=>{if(!m.cl&&mDone(m))n++;});
  n+=Math.max(0,bpTier()-SH.bp)>0?1:0;return n;
}
let lastClaimable=0;
function shopRound(pw,boss){
  shopRoll();
  if(pw)SH.px+=boss?25:5;
  shopSave();
  const n=claimables();
  if(n>lastClaimable)toast('🎁 ¡Tienes recompensas por recoger en <b>Jugar</b>!');
  lastClaimable=n;
}
function claimMission(i){
  const m=SH.dq.m[i];if(!m||m.cl||!mDone(m))return;
  m.cl=1;SH.c+=mDef(m.id).g;SH.px+=30;snd.win&&snd.win();shopSave();toast('🪙 +'+mDef(m.id).g+' monedas');claimAfter();
}
function claimPass(){
  const t=bpTier();let g=0;
  for(let i=SH.bp+1;i<=t;i++)g+=bpRew(i);
  if(!g)return;SH.bp=t;SH.c+=g;shopSave();toast('🪙 +'+g+' monedas del pase');claimAfter();
}
function buyItem(id){
  const x=catOf(id);if(!x||SH.own[id])return;
  if(SH.c<x.price){toast('🪙 Te faltan <b>'+(x.price-SH.c)+'</b> monedas');return;}
  SH.c-=x.price;SH.own[id]=1;
  if(x.slot==='skin'){SKIN=id;saveProfile();}else SH.eq[x.slot]=id;
  shopSave();toast('✅ «'+x.n+'» comprado y puesto');showShop();
}
/* ---- vistas previas 3D ---- */
function cosPrev(x){
  const cs=x.slot==='skin'?null:{[x.slot]:x.id};
  const mo=getModel('chicken',0,false,x.slot==='skin'?x.id:'classic',null,cs);
  return [Object.assign({},boundsOf(mo.parts),{robot:false,rbw:mo.rbw})];
}
function heroPrev(){const mo=getModel('chicken',0,false,SKIN,null,SH.eq);return [Object.assign({},boundsOf(mo.parts),{robot:false,rbw:mo.rbw})];}
/* ---- tabbar ---- */
function tabSync(){
  const tb=$('tabbar');if(!tb)return;
  const hm=$('home'),on=mode==='menu'&&!!USER&&(!$('modal').classList.contains('off')||!!(hm&&hm.classList.contains('on')));
  tb.style.display=on?'flex':'none';document.body.classList.toggle('hastab',on);
  if(!on)return;
  tb.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.t===tabCur));
  const dot=tb.querySelector('[data-t=shop] i');if(dot)dot.style.display=claimables()?'block':'none';
}
function tabGo(t){
  ensureAudio();snd.click();
  if(t==='game')showMenu();else if(t==='shop')showShop();else showHen();
}
const wrapFn=(name,after)=>{const f=window[name];window[name]=function(){const r=f.apply(this,arguments);after();return r;};};
wrapFn('setModal',tabSync);wrapFn('hideScreens',()=>{const h=$('home');if(h)h.classList.remove('on');passOpen=false;tabSync();});
const coinChip=()=>'<div class="coin">🪙 <b>'+SH.c+'</b></div>';
function menuShopHTML(){
  const n=claimables();
  return '<div class="coin">🪙 <b>'+SH.c+'</b>'+(n?' · <span style="color:#7bed9f">🎁 '+n+' por recoger</span>':'')+'</div>';
}
/* ---- Tienda ---- */
function showShop(){
  tabCur='shop';hideScreens();closeStats();shopRoll();
  let h='<div class="tabv"><h1>🛍️ Tienda</h1>'+coinChip()+'<p class="sm">Las monedas se consiguen con las misiones y el pase de batalla (pantalla Jugar).</p>'
   +'<div class="stabs sl">'+SLOTS.map(s=>'<button data-sl="'+s.id+'" class="'+(shSlot===s.id?'on':'')+'">'+s.e+' '+s.n+'</button>').join('')+'</div><div class="skg" id="shg"></div></div>';
  $('mbox').classList.remove('hn');
  setModal(h,[]);
  $('mbox').querySelectorAll('[data-sl]').forEach(b=>b.onclick=()=>{ensureAudio();snd.click();shSlot=b.dataset.sl;showShop();});
  const box=$('shg');
  CAT.filter(x=>x.slot===shSlot).forEach(x=>{
    const own=!!SH.own[x.id],d=document.createElement('div');
    d.className='sk'+(own?' sel':'');d.style.borderColor=own?'':RAR[x.rar].c;
    d.innerHTML='<canvas class="ic"></canvas><div class="nm">'+x.n+'</div><div class="rar" style="color:'+RAR[x.rar].c+'">'+RAR[x.rar].n+'</div><div class="ds">'+x.d+'</div><div class="pr">'+(own?'✅ Tuyo':'🪙 '+x.price)+'</div>';
    if(!own)d.onclick=()=>{ensureAudio();snd.click();buyItem(x.id);};
    box.appendChild(d);icons.push({cv:d.querySelector('canvas'),spec:()=>cosPrev(x)});
  });
}
/* ---- Pase de batalla (detalle) ---- */
let passOpen=false;
function passGain(){let g=0;for(let i=SH.bp+1;i<=bpTier();i++)g+=bpRew(i);return g;}
function showPass(){
  tabCur='game';hideScreens();shopRoll();passOpen=true;
  const t=bpTier(),pend=t-SH.bp,pc=t>=SH_TOP?100:Math.round((SH.px%PX_TIER)/PX_TIER*100);
  const h='<div class="tabv"><h1>🎟️ Pase de batalla</h1>'+coinChip()+'<p class="sm">Temporada <b>'+SH.ps+'</b> · Nivel <b>'+t+'/'+SH_TOP+'</b><br>Ronda superada: +5 · Jefe: +25 · Misión: +30 puntos (300 por nivel)</p><div class="xpbar" style="max-width:380px;margin:0 auto 10px"><i style="width:'+pc+'%"></i></div>'+(pend>0?'<button class="btn" id="bpclaim" style="margin-bottom:10px">🎁 Recoger '+pend+' (+'+passGain()+' 🪙)</button>':'')+'<div class="skg bp" id="shl"></div></div>';
  $('mbox').classList.remove('hn');
  setModal(h,[{t:'Volver',cls:'alt',f:showMenu}]);
  const box=$('shl');
  for(let i=1;i<=SH_TOP;i++){
    const d=document.createElement('div');d.className='sk'+(i<=SH.bp?' sel':'')+(i>t?' lock':'');
    d.style.cursor='default';
    d.innerHTML='<div class="nm">Nivel '+i+'</div><div class="pr">'+(i%5?'':'⭐ ')+'🪙 '+bpRew(i)+'</div><div class="ds">'+(i<=SH.bp?'✅ Recogido':i<=t?'🎁 Listo':'🔒')+'</div>';
    box.appendChild(d);
  }
  const bc=$('bpclaim');if(bc)bc.onclick=()=>{ensureAudio();snd.click();claimPass();};
}
function claimAfter(){if(passOpen)showPass();else{const h=$('home');if(h&&h.classList.contains('on'))showHome();}}
/* ---- Pantalla Jugar a pantalla completa ---- */
(function(){
  const st=document.createElement('style');
  st.textContent='#home{position:fixed;inset:0;z-index:5;display:none;flex-direction:column;align-items:center;gap:8px;padding:calc(10px + env(safe-area-inset-top)) 14px calc(84px + env(safe-area-inset-bottom));background:radial-gradient(ellipse at 50% 40%,#4d3796 0%,#291c55 55%,#130c2b 100%);overflow-y:auto}'
  +'#home.on{display:flex}'
  +'#home .hr{display:flex;width:100%;max-width:560px;align-items:center;justify-content:space-between;gap:10px;flex:none}'
  +'#home .hb{width:50px;height:50px;border-radius:16px;background:linear-gradient(#ffd24a,#ff9d1e);border:3px solid #fff6;font-size:26px;cursor:pointer;box-shadow:0 4px 0 #a35b00;font-family:inherit;color:#2a1448}'
  +'#home .hb.alt{background:linear-gradient(#6fd3ff,#2d8fe0);box-shadow:0 4px 0 #145a9a}'
  +'#home .hb:active{transform:translateY(3px)}'
  +'#home .ttl{font-weight:900;font-size:clamp(20px,5vw,30px);color:#ffe08a;text-shadow:0 3px 0 #0008;letter-spacing:1px;text-align:center;line-height:1}'
  +'#home .ttl small{display:block;font-size:11px;color:#c9bff0;letter-spacing:0;text-shadow:none;margin-top:3px}'
  +'#home .hpass{width:100%;max-width:560px;flex:none;display:flex;align-items:center;gap:10px;background:#ffffff16;border:2px solid #ffd24a;border-radius:16px;padding:7px 12px;cursor:pointer;text-align:left}'
  +'#home .hpass .pm{flex:1;min-width:0;font-weight:900;font-size:14px}#home .hpass .pm small{color:#c9bff0;font-size:11px;font-weight:700}'
  +'#home .hpass .xpbar{margin:4px 0 0;height:9px}'
  +'#home .go{background:linear-gradient(#7bed9f,#2ec866);color:#07381a;border:none;border-radius:12px;padding:7px 12px;font-weight:900;font-size:13px;font-family:inherit;box-shadow:0 3px 0 #17803d;cursor:pointer;white-space:nowrap}'
  +'#home .hhen{flex:1 1 150px;min-height:110px;width:100%;max-width:520px;position:relative}#home .hhen canvas{position:absolute;inset:0;width:100%;height:100%}'
  +'#home .hname{flex:none;text-align:center;font-weight:900;font-size:clamp(18px,4.5vw,26px);text-shadow:0 3px 0 #0008}'
  +'#home .hname small{display:block;font-size:12px;color:#ffe08a}'
  +'#home .hmis{width:100%;max-width:560px;flex:none;display:flex;flex-direction:column;gap:5px}'
  +'#home .hm{display:flex;align-items:center;gap:8px;background:#ffffff12;border:2px solid #6a58b8;border-radius:12px;padding:4px 8px}'
  +'#home .hm.cl{opacity:.5}#home .hm .mt{flex:1;min-width:0;font-weight:800;font-size:12.5px}#home .hm .xpbar{margin:3px 0 0;height:7px}'
  +'#home .hm .go.dis{background:#ffffff1c;color:#d9ceff;box-shadow:none;cursor:default}'
  +'#home .hplay{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;flex:none}';
  document.head.appendChild(st);
  const d=document.createElement('div');d.id='home';document.body.appendChild(d);
})();
function showHome(){
  const el=$('home');if(!el)return;
  shopRoll();tabCur='game';
  const rn=getRun(),hasRun=!!(rn&&!rn.x&&rn.tm),t=bpTier(),pend=t-SH.bp,pc=t>=SH_TOP?100:Math.round((SH.px%PX_TIER)/PX_TIER*100);
  let h='<div class="hr">'+(ONLINE?'<button class="hb" id="hrank" aria-label="Ranking">🏆</button>':'<span style="width:50px"></span>')+'<div class="ttl">EL ASADERO<small>Rondas infinitas</small></div>'+coinChip()+'</div>'
   +'<div class="hpass" id="hpass"><span style="font-size:26px">🎟️</span><div class="pm">Pase de batalla · Nivel '+t+'/'+SH_TOP+'<div class="xpbar"><i style="width:'+pc+'%"></i></div><small>'+(t>=SH_TOP?'¡Completado!':SH.px%PX_TIER+' / '+PX_TIER+' puntos')+'</small></div>'+(pend>0?'<button class="go" id="hpclaim">🎁 Recoger +'+passGain()+' 🪙</button>':'<span class="go dis" style="padding:7px 10px">Ver</span>')+'</div>'
   +'<div class="hhen"><canvas id="hcv2"></canvas></div>'
   +'<div class="hname">'+(CNAME?esc(CNAME):'Tu gallina')+'<small>⭐ Nivel '+lvOf(XP)+' · '+titleOf(lvOf(XP))+(ONLINE?' · 🏆 '+(BEST||0):'')+'</small></div>'
   +'<div class="hmis" id="hmis"></div>'
   +'<div class="hplay">'+(hasRun?'<button class="btn" id="hcont">▶ Continuar · ronda '+rn.n+'</button>':'')+'<button class="btn" id="hnew">'+(hasRun?'🆕 Nueva partida':'¡JUGAR!')+'</button><button class="btn alt" id="hach">🏅 Logros</button>'+(ONLINE?'<button class="btn alt" id="hout">Salir</button>':'')+'</div>';
  el.innerHTML=h;
  $('modal').classList.add('off');el.classList.add('on');
  const box=$('hmis');
  SH.dq.m.forEach((m,i)=>{
    const d=mDef(m.id),p=mProg(m),ok=p>=d.t,r=document.createElement('div');
    r.className='hm'+(m.cl?' cl':'');
    r.innerHTML='<div class="mt">'+d.n+'<div class="xpbar"><i style="width:'+Math.round(p/d.t*100)+'%"></i></div></div><span style="font-size:11px;color:#c9bff0;font-weight:800">'+p+'/'+d.t+'</span>';
    const b=document.createElement('button');b.className='go'+(ok&&!m.cl?'':' dis');b.textContent=m.cl?'✅':ok?'🪙 +'+d.g:'🪙 '+d.g;
    if(ok&&!m.cl)b.onclick=()=>{ensureAudio();snd.click();claimMission(i);};
    r.appendChild(b);box.appendChild(r);
  });
  const on=(id,f)=>{const e=$(id);if(e)e.onclick=ev=>{ev.stopPropagation();ensureAudio();snd.click();f();};};
  on('hrank',showRanking);on('hpclaim',claimPass);on('hcont',resumeRun);on('hnew',newGame);on('hach',showAch);on('hout',doSignOut);
  $('hpass').onclick=()=>{ensureAudio();snd.click();showPass();};
  icons.push({cv:$('hcv2'),spec:heroPrev});
  coinify(el);tabSync();
}
const showMenuBase=showMenu;
showMenu=function(){showMenuBase();showHome();};
/* ---- Mi gallina ---- */
function showHen(){
  tabCur='hen';hideScreens();closeStats();
  const L=lvOf(XP);
  let h='<div class="tabv"><h1>🐔 Mi gallina</h1>'+profHTML()+'<input class="inp" id="cname" maxlength="12" placeholder="Ponle nombre a tu pollo" autocomplete="off" spellcheck="false" value="'+CNAME+'" style="margin-bottom:8px"><canvas class="ic hen" id="hcv"></canvas>'
   +'<div class="stabs sl">'+SLOTS.map(s=>'<button data-sl="'+s.id+'" class="'+(hnSlot===s.id?'on':'')+'">'+s.e+' '+s.n+'</button>').join('')+'</div><div class="skg" id="hng"></div></div>';
  setModal(h,[]);
  $('mbox').classList.add('hn');
  $('cname').oninput=e=>{CNAME=cleanName(e.target.value);lsSet('asadero_name_'+UID,CNAME);cloudProfile();};
  $('mbox').querySelectorAll('[data-sl]').forEach(b=>b.onclick=()=>{ensureAudio();snd.click();hnSlot=b.dataset.sl;showHen();});
  icons.push({cv:$('hcv'),spec:heroPrev});
  const box=$('hng');
  const add=(name,sub,sel,ok,fn,prev)=>{
    const d=document.createElement('div');d.className='sk'+(sel?' sel':'')+(ok?'':' lock');
    d.innerHTML=(prev?'<canvas class="ic"></canvas>':'<div class="ic none">∅</div>')+'<div class="nm">'+name+'</div><div class="ds">'+sub+'</div>';
    if(ok)d.onclick=()=>{ensureAudio();snd.click();fn();};
    box.appendChild(d);if(prev)icons.push({cv:d.querySelector('canvas'),spec:prev});
  };
  if(hnSlot==='skin'){
    SKINS.forEach(sk=>{
      const lvl=sk.lvl<9999,ok=lvl?L>=sk.lvl:!!SH.own[sk.id];
      if(!lvl&&!ok)return;
      add(sk.n,ok?(sk.id===SKIN?'✅ Puesta':sk.d):'🔒 Nivel '+sk.lvl,sk.id===SKIN,ok,()=>{SKIN=sk.id;saveProfile();showHen();},()=>skinSpec(sk.id));
    });
    const nx=SKINS.find(x=>x.lvl>L&&x.lvl<9999);
    if(nx)add(nx.n,'🔒 Nivel '+nx.lvl,false,false,null,()=>skinSpec(nx.id));
  }else{
    add('Ninguno','Quitar',!SH.eq[hnSlot],true,()=>{delete SH.eq[hnSlot];shopSave();showHen();},null);
    const own=CAT.filter(x=>x.slot===hnSlot&&SH.own[x.id]);
    own.forEach(x=>add(x.n,SH.eq[hnSlot]===x.id?'✅ Puesto':RAR[x.rar].n,SH.eq[hnSlot]===x.id,true,()=>{SH.eq[hnSlot]=x.id;shopSave();showHen();},()=>cosPrev(x)));
    if(!own.length){const p=document.createElement('p');p.className='sm';p.style.gridColumn='1/-1';p.innerHTML='Aún no tienes nada de esto. ¡Pásate por la 🛍️ Tienda!';box.appendChild(p);}
  }
}
/* showProfile (menú antiguo) ahora lleva a "Mi gallina" */
showProfile=function(){showHen();};
/* ---- moneda 3D dorada ---- */
(function(){const st=document.createElement('style');st.textContent='.c3{display:inline-block;width:1.7em;height:1.7em;vertical-align:-0.5em;margin:0 1px}';document.head.appendChild(st);})();
/* moneda dorada redonda: cilindro girando, dibujado en 2D con perspectiva */
const coins=[];
function drawCoin(cv){
  const dpr=Math.min(2,window.devicePixelRatio||1),w=cv.clientWidth||24,h=cv.clientHeight||24;
  if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);}
  const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  if(cv._p===undefined)cv._p=Math.random()*6.28;
  const a=TT*2.4+cv._p,cs=Math.cos(a),sn=Math.sin(a);
  const r=Math.min(w,h)*0.45,th=r*0.3,cx=w/2,cy=h/2;
  const rx=Math.max(r*Math.abs(cs),r*0.05),sg=cs>=0?1:-1;
  const nx=cx+sg*sn*th/2,fx=cx-sg*sn*th/2;
  /* cara lejana */
  c.fillStyle='#a56a00';c.beginPath();c.ellipse(fx,cy,rx,r,0,0,7);c.fill();
  /* canto */
  const g=c.createLinearGradient(0,cy-r,0,cy+r);g.addColorStop(0,'#ffe27a');g.addColorStop(0.5,'#d99a0a');g.addColorStop(1,'#8f5a00');
  c.fillStyle=g;c.beginPath();c.moveTo(fx,cy-r);c.lineTo(nx,cy-r);c.lineTo(nx,cy+r);c.lineTo(fx,cy+r);c.closePath();c.fill();
  /* cara cercana */
  const fg=c.createRadialGradient(nx-rx*0.35,cy-r*0.4,r*0.05,nx,cy,r*1.05);
  fg.addColorStop(0,'#fff6b0');fg.addColorStop(0.35,'#ffd23a');fg.addColorStop(1,'#d08c00');
  c.fillStyle=fg;c.beginPath();c.ellipse(nx,cy,rx,r,0,0,7);c.fill();
  c.lineWidth=Math.max(1,r*0.07);c.strokeStyle='#a86b00';c.stroke();
  /* aro interior y brillo */
  c.lineWidth=Math.max(1,r*0.06);c.strokeStyle='rgba(150,90,0,.75)';c.beginPath();c.ellipse(nx,cy,rx*0.74,r*0.74,0,0,7);c.stroke();
  c.fillStyle='rgba(255,255,255,.45)';c.beginPath();c.ellipse(nx-rx*0.32,cy-r*0.4,rx*0.18,r*0.1,-0.5,0,7);c.fill();
  c.fillStyle='rgba(60,30,0,'+((1-Math.abs(cs))*0.28).toFixed(3)+')';c.beginPath();c.ellipse(nx,cy,rx,r,0,0,7);c.fill();
}
function drawCoins(){
  for(let i=coins.length-1;i>=0;i--){if(!coins[i].isConnected){coins.splice(i,1);continue;}drawCoin(coins[i]);}
}
document.addEventListener('DOMContentLoaded',()=>{const base=renderIcons;renderIcons=function(){base.apply(this,arguments);drawCoins();};});
function coinify(root){
  if(!root)return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),L=[];
  let n;while((n=w.nextNode()))if(n.nodeValue.indexOf('🪙')>=0)L.push(n);
  L.forEach(n=>{
    const parts=n.nodeValue.split('🪙'),f=document.createDocumentFragment();
    parts.forEach((s,i)=>{
      if(i>0){const cv=document.createElement('canvas');cv.className='c3';f.appendChild(cv);coins.push(cv);}
      if(s)f.appendChild(document.createTextNode(s));
    });
    n.parentNode.replaceChild(f,n);
  });
  for(let i=icons.length-1;i>=0;i--)if(icons[i].cv&&!icons[i].cv.isConnected)icons.splice(i,1);
}
wrapFn('setModal',()=>coinify($('mbox')));
wrapFn('toast',()=>coinify($('toast')));
