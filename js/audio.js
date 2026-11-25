'use strict';
/* audio.js — Sonido y música procedural */
/* sonido */
let AC=null,muted=false,lastHit=0;
function tone(f1,f2,d,type,v){
  if(muted||!AC)return;
  try{const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type=type||'square';o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,f2),t+d);g.gain.setValueAtTime(v||0.05,t);g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d+0.02);}catch(e){}
}
const snd={
  hit(big){const n=performance.now();if(n-lastHit<45)return;lastHit=n;tone(big?160:260,big?50:80,0.1,'square',0.05);},
  ko(){tone(420,70,0.35,'sawtooth',0.05);},
  drop(){tone(300,700,0.12,'sine',0.06);},
  win(){ /* gallina: po-koo, po-koo */
    const c=(d)=>{setTimeout(()=>{tone(520,330,0.07,'triangle',0.12);tone(1040,660,0.05,'sine',0.04);},d);
      setTimeout(()=>{tone(380,900,0.07,'sawtooth',0.07);tone(900,520,0.16,'sawtooth',0.07);tone(760,1040,0.05,'sine',0.04);},d+110);};
    c(0);c(520);c(1040);},
  lose(){[400,330,260,200].forEach((f,i)=>setTimeout(()=>tone(f,f*0.98,0.22,'sawtooth',0.05),i*160));},
  click(){tone(500,800,0.08,'triangle',0.06);},
  laser(){tone(1100,200,0.25,'sawtooth',0.04);},
  boom(){tone(140,35,0.3,'square',0.07);}
};
function ensureAudio(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();}

/* ============ música procedural (sin archivos) ============ */
let musicOn=true,MG=null,NB=null;const mus={next:0,step:0,mode:''};
const NF=n=>440*Math.pow(2,(n-69)/12);
const CHS={
 fight:[[45,[0,3,7]],[41,[0,4,7]],[48,[0,4,7]],[43,[0,4,7]]],
 boss:[[38,[0,3,7]],[34,[0,4,7]],[43,[0,3,7]],[33,[0,4,7]]],
 calm:[[48,[0,4,7]],[45,[0,3,7]],[41,[0,4,7]],[43,[0,4,7]]]
};
const MEL=[0,-1,2,-1,1,-1,0,-1,1,-1,2,3,2,-1,1,-1];
function mNote(t,f,dur,type,v,glide){
  const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);
  if(glide)o.frequency.exponentialRampToValueAtTime(glide,t+dur);
  g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(v,t+0.012);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g);g.connect(MG);o.start(t);o.stop(t+dur+0.03);
}
function mNoise(t,dur,v,hp){
  const s=AC.createBufferSource();s.buffer=NB;const f=AC.createBiquadFilter();f.type='highpass';f.frequency.value=hp;
  const g=AC.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  s.connect(f);f.connect(g);g.connect(MG);s.start(t);s.stop(t+dur+0.03);
}
function playStep(t,mode,step,sp){
  const bar=((step/16)|0)%4,s=step%16,ch=CHS[mode][bar],r=ch[0],tn=ch[1];
  if(mode==='calm'){
    if(s===0)tn.forEach(x=>mNote(t,NF(r+12+x),sp*15,'triangle',0.05));
    if(s===0||s===8)mNote(t,NF(r),sp*7,'sine',0.2);
    if(s%2===0)mNote(t,NF(r+24+tn[(s/2)%3]),sp*3,'triangle',0.05);
    if(s%4===2)mNoise(t,0.05,0.03,8000);
    return;
  }
  const boss=mode==='boss';
  if(s%4===0)mNote(t,boss?170:150,0.16,'sine',0.9,40);
  if(s===4||s===12){mNoise(t,0.13,0.32,1800);mNote(t,190,0.08,'triangle',0.25,110);}
  if(s%2===0)mNoise(t,s%4===2?0.09:0.04,s%4===2?0.1:0.06,7000);
  if(s%2===0)mNote(t,NF(r+(s%4===2?12:0)),sp*1.8,'sawtooth',0.13);
  mNote(t,NF(r+24+tn[s%3]+(s%8>=4?12:0)),sp*1.4,'triangle',0.05);
  const m=MEL[s];
  if(m>=0)mNote(t,NF(r+(boss?24:36)+(m===3?tn[0]+12:tn[m])),sp*2.4,'square',0.04);
}
function musicWant(){
  if(mode!=='inf')return 'calm';
  if(st==='fight'||st==='intro')return infN%10===0?'boss':'fight';
  return 'calm';
}
function musicTick(){
  if(!AC||!musicOn||muted||AC.state!=='running')return;
  if(!MG){MG=AC.createGain();MG.gain.value=0.35;MG.connect(AC.destination);const L=AC.sampleRate>>1;NB=AC.createBuffer(1,L,AC.sampleRate);const d=NB.getChannelData(0);for(let i=0;i<L;i++)d[i]=Math.random()*2-1;}
  const w=musicWant(),now=AC.currentTime;
  if(w!==mus.mode||mus.next<now-0.5){mus.mode=w;mus.step=0;mus.next=now+0.05;}
  const sp=w==='calm'?60/84/4:w==='boss'?60/165/4:60/150/4;
  while(mus.next<now+0.7){playStep(mus.next,w,mus.step,sp);mus.next+=sp;mus.step++;}
}
