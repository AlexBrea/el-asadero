'use strict';
/* data.js — Datos base (especies, temas, generador mulberry) y estado global del juego */
/* ============ datos ============ */
const KEYS=['chicken','rooster','cat','dog','wolf','puma','lion','bear','gorilla','elephant','dino'];
const HM=[1,2,4],AM=[1,1.6,2.8],SM=[1,1.12,1.3],TIERN=['','🤖','👑'],TIERW=['','Robots','Titanes'];
const THEMES=[
 {sky:['#2a1b5c','#7b3fa0','#ff9a6b'],hill:'#4b2f7a',fa:'#dcbd7c',fb:'#d0b06c',oa:'#3f8f4a',ob:'#3a8544'},
 {sky:['#10304a','#2c6a63','#9bd3a0'],hill:'#1d4a3a',fa:'#9a7a4a',fb:'#8c6b3f',oa:'#2d6b3a',ob:'#285f33'},
 {sky:['#5b2a86','#e0662f','#ffd27a'],hill:'#8a4a2f',fa:'#e5c070',fb:'#d9b45f',oa:'#b9a14a',ob:'#ae9642'},
 {sky:['#1c2c5a','#5a7fc0','#cfe6ff'],hill:'#6b7fa8',fa:'#a9b2c2',fb:'#9aa3b3',oa:'#e8eef7',ob:'#dbe4f0'},
 {sky:['#1a0f2e','#6a1b4d','#ff5e5e'],hill:'#3a1d4a',fa:'#5a4a80',fb:'#4a3b6b',oa:'#2a2146',ob:'#251c3c'}
];
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function S(list){let h=0,a=0;for(const e of list){const sp=SP[e.k];h+=sp.hp*HM[e.t||0]*(e.f||1);a+=sp.atk*AM[e.t||0]*(e.f||1);}return h*a;}
function minTier(list,k){let m=9;for(const e of list)if(e.k===k)m=Math.min(m,e.t||0);return m;}
function upSpecies(list,k,mark){
  const m=minTier(list,k);if(m>=2)return false;
  list.forEach(e=>{if(e.k===k&&(e.t||0)===m){e.t=m+1;if(mark)e.fresh=true;}});return true;
}
function pickUp(list,rng,cap){
  const m={};list.forEach(e=>{m[e.k]=(m[e.k]||0)+1;});
  const ks=Object.keys(m).filter(k=>m[k]>=2&&minTier(list,k)<cap);
  if(!ks.length)return null;return ks[Math.floor(rng()*ks.length)];
}
/* ============ estado ============ */
let mode='menu',st='menu',team=[],bteam=[],offers=[],units=[],fightT=0,fightEnd=false,endT=0,speed=1,runId=0,infN=1,pendingUpg=null,TH=THEMES[0];
const parts=[],floaters=[];let fx=[];
const $=id=>document.getElementById(id);
let BEST=0,runT=0,pend=0,picksLeft=1,prize=0;
const saveProg=()=>{if(typeof cloudSave==='function')cloudSave();};
const timers=[];
const later=(fn,ms)=>{timers.push({t:ms/1000,fn,id:runId});};
function runTimers(dt){for(let i=0;i<timers.length;i++){const x=timers[i];x.t-=dt;if(x.t<=0){timers.splice(i,1);i--;if(x.id===runId)x.fn();}}}
