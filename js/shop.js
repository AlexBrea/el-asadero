'use strict';
/* shop.js — Monedas, misiones diarias, pase de batalla, tienda y "Mi gallina" (+ tabbar) */
const SH_TOP=20,PX_TIER=100;
let SH={c:0,own:{},eq:{},dq:null,ps:'',px:0,bp:0,ts:0};
let tabCur='game',shSub='shop',shSlot='hat',hnSlot='hat';
const cosOf=()=>SH.eq;
const shN=(v,m)=>Math.max(0,Math.min(m||1e9,Math.floor(+v||0)));
const dayKey=()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();};
const seasonKey=()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1);};
/* misiones posibles (progreso = estadística actual − la de inicio del día) */
const MPOOL=[
 {id:'r3',f:'r',t:3,g:30,n:'Supera 3 rondas'},{id:'r6',f:'r',t:6,g:60,n:'Supera 6 rondas'},{id:'r10',f:'r',t:10,g:90,n:'Supera 10 rondas'},
 {id:'k25',f:'k',t:25,g:30,n:'Derrota a 25 enemigos'},{id:'k60',f:'k',t:60,g:60,n:'Derrota a 60 enemigos'},{id:'k120',f:'k',t:120,g:90,n:'Derrota a 120 enemigos'},
 {id:'g2',f:'g',t:2,g:25,n:'Empieza 2 partidas'},{id:'g4',f:'g',t:4,g:50,n:'Empieza 4 partidas'},
 {id:'b1',f:'b',t:1,g:80,n:'Derrota a un jefe'},
 {id:'rl2',f:'rl',t:2,g:40,n:'Consigue 2 reliquias'},{id:'rl4',f:'rl',t:4,g:70,n:'Consigue 4 reliquias'}
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
const bpRew=t=>20+5*t+(t%5?0:100);
function claimables(){
  if(!SH.dq)return 0;shopRoll();
  let n=0;SH.dq.m.forEach(m=>{if(!m.cl&&mDone(m))n++;});
  n+=Math.max(0,bpTier()-SH.bp)>0?1:0;return n;
}
let lastClaimable=0;
function shopRound(pw,boss){
  shopRoll();
  if(pw)SH.px+=boss?60:15;
  shopSave();
  const n=claimables();
  if(n>lastClaimable)toast('🎁 ¡Tienes recompensas por recoger en la <b>Tienda</b>!');
  lastClaimable=n;
}
function claimMission(i){
  const m=SH.dq.m[i];if(!m||m.cl||!mDone(m))return;
  m.cl=1;SH.c+=mDef(m.id).g;SH.px+=30;snd.win&&snd.win();shopSave();toast('🪙 +'+mDef(m.id).g+' monedas');showShop();
}
function claimPass(){
  const t=bpTier();let g=0;
  for(let i=SH.bp+1;i<=t;i++)g+=bpRew(i);
  if(!g)return;SH.bp=t;SH.c+=g;shopSave();toast('🪙 +'+g+' monedas del pase');showShop();
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
  const on=mode==='menu'&&!!USER&&!$('modal').classList.contains('off');
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
wrapFn('setModal',tabSync);wrapFn('hideScreens',tabSync);
const coinChip=()=>'<div class="coin">🪙 <b>'+SH.c+'</b></div>';
function menuShopHTML(){
  const n=claimables();
  return '<div class="coin">🪙 <b>'+SH.c+'</b>'+(n?' · <span style="color:#7bed9f">🎁 '+n+' por recoger</span>':'')+'</div>';
}
/* ---- Tienda ---- */
function subTabs(){
  return '<div class="stabs">'+[['shop','🛍️ Tienda'],['mis','📋 Misiones'],['pass','🎟️ Pase']].map(a=>'<button data-s="'+a[0]+'" class="'+(shSub===a[0]?'on':'')+'">'+a[1]+'</button>').join('')+'</div>';
}
function showShop(){
  tabCur='shop';hideScreens();closeStats();shopRoll();
  let h='<div class="tabv"><h1>🛍️ Tienda</h1>'+coinChip()+subTabs();
  if(shSub==='shop'){
    h+='<div class="stabs sl">'+SLOTS.map(s=>'<button data-sl="'+s.id+'" class="'+(shSlot===s.id?'on':'')+'">'+s.e+' '+s.n+'</button>').join('')+'</div><div class="skg" id="shg"></div>';
  }else if(shSub==='mis'){
    h+='<p class="sm">Se renuevan cada día. Cada misión te da <b>monedas</b> y <b>30 XP de pase</b>.</p><div class="lst" id="shl"></div>';
  }else{
    const t=bpTier(),pend=t-SH.bp,pc=t>=SH_TOP?100:Math.round((SH.px%PX_TIER)/PX_TIER*100);
    h+='<p class="sm">Temporada <b>'+SH.ps+'</b> · Nivel <b>'+t+'/'+SH_TOP+'</b><br>Ronda superada: +15 · Jefe: +60 · Misión: +30 puntos (100 por nivel)</p><div class="xpbar" style="max-width:380px;margin:0 auto 10px"><i style="width:'+pc+'%"></i></div>'+(pend>0?'<button class="btn" id="bpclaim" style="margin-bottom:10px">🎁 Recoger '+pend+' (+'+(function(){let g=0;for(let i=SH.bp+1;i<=t;i++)g+=bpRew(i);return g;})()+' 🪙)</button>':'')+'<div class="skg bp" id="shl"></div>';
  }
  $('mbox').classList.remove('hn');
  setModal(h+'</div>',[]);
  $('mbox').querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{ensureAudio();snd.click();shSub=b.dataset.s;showShop();});
  $('mbox').querySelectorAll('[data-sl]').forEach(b=>b.onclick=()=>{ensureAudio();snd.click();shSlot=b.dataset.sl;showShop();});
  if(shSub==='shop'){
    const box=$('shg');
    CAT.filter(x=>x.slot===shSlot).forEach(x=>{
      const own=!!SH.own[x.id],d=document.createElement('div');
      d.className='sk'+(own?' sel':'');d.style.borderColor=own?'':RAR[x.rar].c;
      d.innerHTML='<canvas class="ic"></canvas><div class="nm">'+x.n+'</div><div class="rar" style="color:'+RAR[x.rar].c+'">'+RAR[x.rar].n+'</div><div class="ds">'+x.d+'</div><div class="pr">'+(own?'✅ Tuyo':'🪙 '+x.price)+'</div>';
      if(!own)d.onclick=()=>{ensureAudio();snd.click();buyItem(x.id);};
      box.appendChild(d);icons.push({cv:d.querySelector('canvas'),spec:()=>cosPrev(x)});
    });
  }else if(shSub==='mis'){
    const box=$('shl');
    SH.dq.m.forEach((m,i)=>{
      const d=mDef(m.id),p=mProg(m),ok=p>=d.t,r=document.createElement('div');
      r.className='ms'+(m.cl?' cl':'');
      r.innerHTML='<div class="mt"><b>'+d.n+'</b><div class="xpbar"><i style="width:'+Math.round(p/d.t*100)+'%"></i></div><small>'+p+' / '+d.t+'</small></div>';
      const b=document.createElement('button');b.className='btn'+(ok&&!m.cl?'':' alt');b.textContent=m.cl?'✅':ok?'🪙 +'+d.g:'🪙 '+d.g;b.disabled=!ok||!!m.cl;
      b.onclick=()=>{ensureAudio();snd.click();claimMission(i);};r.appendChild(b);box.appendChild(r);
    });
  }else{
    const box=$('shl'),t=bpTier();
    for(let i=1;i<=SH_TOP;i++){
      const d=document.createElement('div');d.className='sk'+(i<=SH.bp?' sel':'')+(i>t?' lock':'');
      d.style.cursor='default';
      d.innerHTML='<div class="nm">Nivel '+i+'</div><div class="pr">'+(i%5?'':'⭐ ')+'🪙 '+bpRew(i)+'</div><div class="ds">'+(i<=SH.bp?'✅ Recogido':i<=t?'🎁 Listo':'🔒')+'</div>';
      box.appendChild(d);
    }
    const bc=$('bpclaim');if(bc)bc.onclick=()=>{ensureAudio();snd.click();claimPass();};
  }
}
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
/* ---- moneda 3D dorada con una gallina en el centro ---- */
(function(){const st=document.createElement('style');st.textContent='.c3{display:inline-block;width:1.7em;height:1.7em;vertical-align:-0.5em;margin:0 1px}';document.head.appendChild(st);})();
const COIN_HEN=['.....##..','....####.','.#..#####','.##.###..','.#######.','..######.','...####..','....#.#..','...##.##.'];
let coinCache=null;
const coinYaw=()=>Math.PI/2+Math.sin(TT*1.6)*0.65;
function coinSpec(){
  if(coinCache)return coinCache;
  const P=[],t=0.1,R=0.5,GD='#e8a812',EM='#8a4e00';
  const GL={glow:true};
  P.push(B([0,R,0],[t,R*2,R*1.3],GD,'body',GL));
  P.push(B([0,R,0],[t,R*1.3,R*2],GD,'body',GL));
  P.push(B([0,R,0],[t,R*1.75,R*1.75],GD,'body',GL));
  /* cara elevada, más clara */
  P.push(B([0,R,0],[t+0.05,R*1.3,R*1.5],'#ffc92e','body',GL));
  P.push(B([0,R,0],[t+0.05,R*1.5,R*1.3],'#ffc92e','body',GL));
  const c=0.075;
  COIN_HEN.forEach((row,ri)=>{for(let ci=0;ci<9;ci++)if(row[ci]==='#'){
    const y=R+(4-ri)*c,z=(ci-4)*c;
    P.push(B([t/2+0.04,y,-z],[0.04,c,c],EM,'body'));
    P.push(B([-t/2-0.04,y,z],[0.04,c,c],EM,'body'));
  }});
  const b=boundsOf(P);return coinCache=[Object.assign({},b,{robot:false,rbw:false})];
}
function coinify(root){
  if(!root)return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),L=[];
  let n;while((n=w.nextNode()))if(n.nodeValue.indexOf('🪙')>=0)L.push(n);
  L.forEach(n=>{
    const parts=n.nodeValue.split('🪙'),f=document.createDocumentFragment();
    parts.forEach((s,i)=>{
      if(i>0){const cv=document.createElement('canvas');cv.className='c3';f.appendChild(cv);icons.push({cv,spec:coinSpec,yaw:coinYaw});}
      if(s)f.appendChild(document.createTextNode(s));
    });
    n.parentNode.replaceChild(f,n);
  });
  for(let i=icons.length-1;i>=0;i--)if(icons[i].cv&&!icons[i].cv.isConnected)icons.splice(i,1);
}
wrapFn('setModal',()=>coinify($('mbox')));
wrapFn('toast',()=>coinify($('toast')));
