'use strict';
/* stats.js — Estadísticas y paneles de plantilla */
/* ============ estadísticas ============ */
const f1=n=>(Math.round(n*10)/10).toString().replace('.',',');
let drawerOpen=false,statsShown=false,statsT=0,homeArm=0;
function statsHTML(){
  if(mode!=='inf'||!team.length)return '<div class="note">Empieza una partida para ver tus estadísticas.</div>';
  let h='<div class="note">Valores reales, se actualizan en directo. El juego sigue corriendo.</div>';
  const rk=Object.keys(RL).filter(k=>RL[k]&&REL[k]);
  if(rk.length)h+='<div class="sc"><h3>🏺 Reliquias</h3>'+rk.map(k=>'<div class="sr"><span>'+REL[k].e+' '+REL[k].n+(RL[k]>1?' ×'+RL[k]:'')+'</span><b>'+REL[k].d+'</b></div>').join('')+'</div>';
  team.forEach(m=>{
    const s=memberStats(m),g=k=>m.l[k]||0,R=(a,b)=>'<div class="sr"><span>'+a+'</span><b>'+b+'</b></div>';
    h+='<div class="sc"><h3>'+memberName(m)+(m.hero?' ⭐':'')+(m.t?' · '+(m.t===1?'🤖 Robot':'👑 Titán'):'')+'</h3>';
    h+=specStatsHTML(m,R);
    h+=R('❤️ Vida',Math.round(s.hp));
    h+=R('⚔️ Daño por segundo',f1(s.atk)+'  ('+f1(s.atk*s.rate)+' por golpe)');
    h+=R('💨 Velocidad de ataque','x'+f1(0.7/s.rate));
    h+=R('🏃 Velocidad al correr','x'+f1(s.spd/3.6));
    if(m.t)h+=R('Bonus de cuerpo','vida x'+HM[m.t]+' · daño x'+AM[m.t]);
    if(g('power'))h+=R('💪 Músculos ('+g('power')+')','daño x'+f1(Math.pow(1.3,g('power'))));
    if(g('vit'))h+=R('❤️ Súper plumaje ('+g('vit')+')','vida x'+f1(Math.pow(1.35,g('vit'))));
    if(g('armor'))h+=R('🛡️ Plumas de acero ('+g('armor')+')','-'+Math.round((1-s.dmgMul)*100)+'% daño recibido');
    if(g('gold'))h+=R('🪙 Pico de oro ('+g('gold')+')',Math.round(s.crit*100)+'% críticos · x3 daño');
    if(g('fire'))h+=R('🔥 Pico de fuego ('+g('fire')+')',f1(s.fireDps)+' daño/s durante 3 s');
    if(g('vamp'))h+=R('🧛 Pico vampiro ('+g('vamp')+')','roba '+Math.round(s.vamp*100)+'% del daño');
    if(s.laser)h+=R('🔴 Láser ('+g('laser')+')',s.laser.n+(s.laser.n>1?' rayos':' rayo')+' de '+Math.round(s.laser.dmg)+' · cada '+f1(s.laser.cd)+' s');
    if(s.egg)h+=R('🥚 Huevos ('+g('egg')+')',Math.round(s.egg.dmg)+' de daño · radio '+f1(s.egg.rad)+' · cada '+f1(s.egg.cd)+' s');
    if(s.storm)h+=R('🪶 Tormenta ('+g('storm')+')',Math.round(s.storm.dmg)+' de daño · radio '+f1(s.storm.rad)+' · cada '+f1(s.storm.cd)+' s');
    if(g('phoenix'))h+=R('🌅 Huevo fénix','x'+g('phoenix')+' · revive con toda la vida');
    if(m.hero&&g('flock'))h+=R('🐥 La bandada','nivel '+g('flock'));
    h+='</div>';
  });
  return h;
}
function refreshStats(){if(drawerOpen&&statsShown)$('dstats').innerHTML=statsHTML();}
function refreshDrawer(){
  $('d-stats').classList.toggle('hide',mode!=='inf');
  if(mode!=='inf'){statsShown=false;$('dstats').classList.remove('on');}
  $('d-rank').classList.toggle('hide',!(ONLINE&&mode==='menu'));
  $('d-home').classList.toggle('hide',mode==='menu');
  $('d-out').classList.toggle('hide',!ONLINE);
  $('d-mus').classList.toggle('off',!musicOn);$('d-snd').classList.toggle('off',muted);
  $('d-snd').textContent=muted?'🔇 Sonido':'🔊 Sonido';
  $('spd').textContent='x'+speed;
  $('d-home').textContent='🏠 Menú principal';homeArm=0;
  refreshStats();
}
function openDrawer(){drawerOpen=true;$('drawer').classList.add('open');refreshDrawer();}
function closeDrawer(){drawerOpen=false;$('drawer').classList.remove('open');}
function closeStats(){closeDrawer();}
