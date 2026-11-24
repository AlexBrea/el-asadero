'use strict';
/* medals.js — Logros: medallas por niveles (bronce, plata, oro, diamante) */
/* logros: medallas por niveles (bronce, plata, oro, diamante) */
const TIERS=[{n:'Bronce',xp:2,d:'#5a3414',l:'#f0bd88'},{n:'Plata',xp:5,d:'#46505d',l:'#f4f7fa'},{n:'Oro',xp:12,d:'#6b4a00',l:'#fff1a0'},{n:'Diamante',xp:30,d:'#0b4a6e',l:'#eafcff'}];
const TG=[['#f0b57a','#b06a2c','#7a4216','#8a4e1e','#c98446','#e9ac70'],['#ffffff','#aab4c0','#6b7682','#7d8896','#c5cdd6','#f1f4f7'],['#fff2a8','#e0a91a','#9a6a00','#a87400','#e8b92d','#fff0a0'],['#f4ffff','#5fd6f2','#2b7fc7','#2a79b8','#73dcf5','#eaffff'],['#8a8f96','#555a61','#3a3e44','#3a3e44','#5a5f66','#7a7f86']];
(function(){
  let h='<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>';
  TG.forEach((g,i)=>{h+='<linearGradient id="mo'+i+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+g[0]+'"/><stop offset=".5" stop-color="'+g[1]+'"/><stop offset="1" stop-color="'+g[2]+'"/></linearGradient><linearGradient id="mi'+i+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+g[3]+'"/><stop offset=".5" stop-color="'+g[4]+'"/><stop offset="1" stop-color="'+g[5]+'"/></linearGradient>';});
  h+='<radialGradient id="mgl" cx=".3" cy=".25" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".45" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs></svg>';
  document.body.insertAdjacentHTML('beforeend',h);
})();
/* emblemas dibujados a mano, uno por logro (D = color grabado, L = color claro) */
const EM={
  r:(D,L)=>`<rect x="-12" y="-18" width="3.5" height="36" rx="1" fill="${D}"/><path d="M-8.5 -17 L17 -9 L-8.5 1Z" fill="${D}"/><path d="M-8.5 -17 L17 -9 L-8.5 -12Z" fill="${L}" opacity=".5"/><rect x="-18" y="16" width="16" height="3" rx="1.5" fill="${D}"/>`,
  b:(D,L)=>`<path d="M-13 -6 Q-22 -8 -21 -19 Q-11 -15 -9 -9Z" fill="${D}"/><path d="M13 -6 Q22 -8 21 -19 Q11 -15 9 -9Z" fill="${D}"/><path d="M-13 -8 Q-13 -15 0 -15 Q13 -15 13 -8 L11 6 L6 17 L-6 17 L-11 6Z" fill="${D}"/><path d="M-9 -4 L-2 -1 L-8 3Z" fill="${L}"/><path d="M9 -4 L2 -1 L8 3Z" fill="${L}"/><path d="M-4 17 V11 M0 17 V11 M4 17 V11" stroke="${L}" stroke-width="1.6"/>`,
  k:(D,L)=>['45','-45'].map(a=>`<g transform="rotate(${a})"><path d="M-2.5 -19 L0 -22 L2.5 -19 V8 H-2.5Z" fill="${D}"/><rect x="-8" y="8" width="16" height="3.5" rx="1.5" fill="${D}"/><rect x="-1.8" y="11" width="3.6" height="8" fill="${D}"/></g>`).join(''),
  q:(D,L)=>`<path d="M-13 3 A13 13 0 0 1 12 -6" fill="none" stroke="${D}" stroke-width="4" stroke-linecap="round"/><path d="M13 -3 A13 13 0 0 1 -12 6" fill="none" stroke="${D}" stroke-width="4" stroke-linecap="round"/><path d="M16 -14 L17 -1 L5 -6Z" fill="${D}"/><path d="M-16 14 L-17 1 L-5 6Z" fill="${D}"/>`,
  g:(D,L)=>`<circle r="15" fill="none" stroke="${D}" stroke-width="3.5"/><path d="M-5 -9 L10 0 L-5 9Z" fill="${D}"/>`,
  l:(D,L)=>`<path d="M-6 -17 H6 L5.5 -11 Q15 -5 13 6 Q11 16 0 17.5 Q-11 16 -13 6 Q-15 -5 -5.5 -11Z" fill="${D}"/><path d="M-13 -4 Q-21 -2 -18 6 M13 -4 Q21 -2 18 6" fill="none" stroke="${D}" stroke-width="2.5"/><path d="M-9 0 H9" stroke="${L}" stroke-width="1.6"/><path d="M-8 6 H8" stroke="${L}" stroke-width="1.6" stroke-dasharray="2 2"/>`,
  chicken:(D,L)=>`<circle cy="4" r="12" fill="${D}"/><path d="M-6 -7 Q-6 -15 -2 -10 Q0 -17 3 -10 Q7 -14 6 -7Z" fill="${D}"/><path d="M10 2 L19 6 L10 9Z" fill="${D}"/><path d="M7 12 Q10 19 4 18Z" fill="${D}"/><circle cx="3" cy="1" r="2" fill="${L}"/>`,
  rooster:(D,L)=>`<path d="M-12 6 Q-22 -4 -18 -16 Q-10 -6 -8 0Z" fill="${D}"/><circle cy="4" r="12" fill="${D}"/><path d="M-8 -6 Q-9 -17 -4 -12 Q-3 -20 1 -13 Q4 -20 6 -12 Q11 -15 8 -6Z" fill="${D}"/><path d="M10 2 L19 6 L10 9Z" fill="${D}"/><path d="M7 12 Q11 20 4 19Z" fill="${D}"/><circle cx="3" cy="1" r="2" fill="${L}"/><path d="M-1 -3 L7 -1" stroke="${L}" stroke-width="1.4"/>`,
  cat:(D,L)=>`<path d="M-13 -2 L-12 -17 L-3 -8Z" fill="${D}"/><path d="M13 -2 L12 -17 L3 -8Z" fill="${D}"/><ellipse cy="4" rx="14" ry="12" fill="${D}"/><ellipse cx="-5.5" cy="1" rx="2.4" ry="1.5" fill="${L}"/><ellipse cx="5.5" cy="1" rx="2.4" ry="1.5" fill="${L}"/><path d="M-2 7 H2 L0 9.5Z" fill="${L}"/><path d="M-6 10 L-17 8 M-6 12 L-16 14 M6 10 L17 8 M6 12 L16 14" stroke="${L}" stroke-width="1"/>`,
  dog:(D,L)=>`<path d="M-10 -6 Q-21 -2 -17 13 Q-10 12 -9 2Z" fill="${D}"/><path d="M10 -6 Q21 -2 17 13 Q10 12 9 2Z" fill="${D}"/><ellipse cy="2" rx="11" ry="12.5" fill="${D}"/><ellipse cy="9" rx="6.5" ry="5" fill="${L}"/><circle cy="7" r="2.3" fill="${D}"/><circle cx="-4.5" cy="-2" r="1.8" fill="${L}"/><circle cx="4.5" cy="-2" r="1.8" fill="${L}"/>`,
  wolf:(D,L)=>`<path d="M-13 -4 L-12 -19 L-4 -9 L4 -9 L12 -19 L13 -4 L8 8 L3 17 L-3 17 L-8 8Z" fill="${D}"/><path d="M-9 -3 L-3 0 L-8 3Z" fill="${L}"/><path d="M9 -3 L3 0 L8 3Z" fill="${L}"/><path d="M-2.5 13 H2.5 L0 16Z" fill="${L}"/>`,
  puma:(D,L)=>`<circle cx="-10" cy="-8" r="5" fill="${D}"/><circle cx="10" cy="-8" r="5" fill="${D}"/><ellipse cy="4" rx="14" ry="12" fill="${D}"/><circle cx="-5.5" cy="0" r="1.9" fill="${L}"/><circle cx="5.5" cy="0" r="1.9" fill="${L}"/><ellipse cy="10" rx="5" ry="3.5" fill="${L}"/><path d="M-2 7.5 H2 L0 10Z" fill="${D}"/><path d="M-14 3 H-9 M14 3 H9 M-13 7 H-9 M13 7 H9" stroke="${L}" stroke-width="1.3"/>`,
  lion:(D,L)=>Array.from({length:12},(_,i)=>`<circle cx="${(Math.cos(i*Math.PI/6)*15).toFixed(1)}" cy="${(Math.sin(i*Math.PI/6)*15).toFixed(1)}" r="5.5" fill="${D}"/>`).join('')+`<circle r="16" fill="${D}"/><circle r="10.5" fill="${L}"/><circle cx="-4" cy="-2" r="1.7" fill="${D}"/><circle cx="4" cy="-2" r="1.7" fill="${D}"/><path d="M-3 3 H3 L0 6.5Z" fill="${D}"/><path d="M-4 9.5 Q0 12 4 9.5" fill="none" stroke="${D}" stroke-width="1.3"/>`,
  bear:(D,L)=>`<circle cx="-11" cy="-11" r="5.5" fill="${D}"/><circle cx="11" cy="-11" r="5.5" fill="${D}"/><circle cx="-11" cy="-11" r="2.4" fill="${L}"/><circle cx="11" cy="-11" r="2.4" fill="${L}"/><circle cy="3" r="14" fill="${D}"/><ellipse cy="8" rx="7" ry="5.5" fill="${L}"/><ellipse cy="6" rx="2.8" ry="2" fill="${D}"/><circle cx="-5.5" cy="-1" r="1.8" fill="${L}"/><circle cx="5.5" cy="-1" r="1.8" fill="${L}"/>`,
  gorilla:(D,L)=>`<path d="M-15 8 Q-17 -14 0 -16 Q17 -14 15 8 Q14 17 0 17 Q-14 17 -15 8Z" fill="${D}"/><path d="M-9 0 Q-9 -4 0 -4 Q9 -4 9 0 Q11 12 0 14 Q-11 12 -9 0Z" fill="${L}"/><path d="M-10 -3 H10" stroke="${D}" stroke-width="3.2"/><circle cx="-4" cy="1" r="1.5" fill="${D}"/><circle cx="4" cy="1" r="1.5" fill="${D}"/><circle cx="-1.8" cy="7" r="1.1" fill="${D}"/><circle cx="1.8" cy="7" r="1.1" fill="${D}"/><path d="M-5 11 Q0 13 5 11" fill="none" stroke="${D}" stroke-width="1.2"/>`,
  elephant:(D,L)=>`<circle cx="-14" r="9" fill="${D}"/><circle cx="14" r="9" fill="${D}"/><circle cy="-1" r="11" fill="${D}"/><path d="M-3 4 Q-3 17 4 17 Q8 17 8 13" fill="none" stroke="${D}" stroke-width="5" stroke-linecap="round"/><circle cx="-5" cy="-3" r="1.7" fill="${L}"/><circle cx="5" cy="-3" r="1.7" fill="${L}"/><path d="M-7 8 Q-11 14 -7 17 M7 8 Q11 14 7 17" fill="none" stroke="${L}" stroke-width="2"/>`,
  dino:(D,L)=>`<path d="M-16 10 L-16 -4 Q-16 -14 -5 -14 L11 -14 Q20 -14 20 -5 L20 1 L-1 1 L-1 11Z" fill="${D}"/><path d="M-1 4 L20 4 L17 11 L-1 13Z" fill="${D}" opacity=".8"/><path d="M4 1 L6 6 L8 1ZM10 1 L12 6 L14 1ZM16 1 L17.5 5 L19 1Z" fill="${L}"/><circle cx="6" cy="-6" r="2.4" fill="${L}"/><path d="M-12 -13 L-9 -19 L-6 -13ZM-5 -14 L-2 -20 L1 -14Z" fill="${D}"/>`
};
/* medalla en SVG con relieve: t = 0 bronce, 1 plata, 2 oro, 3 diamante, -1 bloqueada */
function medal(c,t,px){
  const lock=t<0,i=lock?4:t,D=lock?'#2a2d32':TIERS[t].d,L=lock?'#6c7178':TIERS[t].l,rb=lock?'#4b4f55':c.col;
  let s='<svg class="med" viewBox="0 0 100 124" width="'+px+'" height="'+Math.round(px*1.24)+'">';
  s+='<path d="M28 0H46L58 50H40Z" fill="'+rb+'"/><path d="M72 0H54L42 50H60Z" fill="'+rb+'"/><path d="M72 0H54L42 50H60Z" fill="#000" opacity=".3"/>';
  s+='<circle cx="50" cy="78" r="40" fill="url(#mo'+i+')"/><circle cx="50" cy="78" r="34" fill="url(#mi'+i+')" stroke="#000" stroke-opacity=".3" stroke-width="1.2"/>';
  s+='<circle cx="50" cy="78" r="30" fill="none" stroke="'+D+'" stroke-opacity=".3" stroke-dasharray="1.5 2.6"/>';
  if(t===3)for(let k=0;k<12;k++){const a=k*Math.PI/6;s+='<path d="M'+(50+Math.cos(a)*34).toFixed(1)+' '+(78+Math.sin(a)*34).toFixed(1)+'L'+(50+Math.cos(a)*40).toFixed(1)+' '+(78+Math.sin(a)*40).toFixed(1)+'" stroke="#fff" stroke-opacity=".7" stroke-width="1"/>';}
  const e=EM[c.em];
  s+='<g transform="translate(50 78) scale(1.3)"><g transform="translate(.9 1)" opacity=".6">'+e(L,L)+'</g>'+e(D,L)+'</g>';
  s+='<circle cx="50" cy="78" r="40" fill="url(#mgl)"/>';
  if(t===3)s+='<path d="M80 40L82 48L90 50L82 52L80 60L78 52L70 50L78 48Z" fill="#fff"/>';
  return s+'</svg>';
}
const CATS=[],ACH=[];
(function(){
  const c=(id,n,em,col,get,tiers,desc)=>CATS.push({id,n,em,col,get,tiers,desc});
  c('r','Llegar lejos','r','#e8a33d',()=>BEST,[5,15,50,100],g=>'Llega a la ronda '+g);
  c('b','Cazajefes','b','#c0392b',()=>ST.b,[1,3,10,25],g=>'Derrota a '+g+(g===1?' jefe':' jefes'));
  c('k','Carnicero','k','#7f8c8d',()=>ST.k,[50,200,1000,5000],g=>'Derrota a '+g+' enemigos en total');
  c('q','Incansable','q','#27ae60',()=>ST.r,[10,50,250,1000],g=>'Supera '+g+' rondas en total');
  c('g','Adicto al corral','g','#2980b9',()=>ST.g,[3,10,50,200],g=>'Juega '+g+' partidas');
  c('l','Coleccionista','l','#8e44ad',()=>ST.rl,[3,10,25,50],g=>'Consigue '+g+' reliquias');
  const T1=[3,10,50,200],T2=[2,8,30,100],T3=[1,5,15,50],T4=[1,3,10,25];
  [['chicken',T1],['rooster',T1],['cat',T1],['dog',T1],['wolf',T2],['puma',T2],['lion',T3],['bear',T3],['gorilla',T3],['elephant',T4],['dino',T4]].forEach(a=>{
    const k=a[0],pl=SP[k].es[1].toLowerCase();
    c('s'+k,'Cazador de '+pl,k,'#d35400',()=>ST.kb[k]||0,a[1],g=>'Derrota a '+g+' '+(g===1?SP[k].es[0].toLowerCase():pl));
  });
  CATS.forEach(ct=>ct.tiers.forEach((g,t)=>ACH.push({id:ct.id+'_'+t,c:ct,t,goal:g,get:ct.get,xp:TIERS[t].xp,n:ct.n,d:ct.desc(g)})));
})();
function achSet(){const o={};ACH.forEach(a=>{if(a.get()>=a.goal)o[a.id]=1;});return o;}
function achCheck(){
  const now=achSet();
  if(achPrev){
    const nw=ACH.filter(a=>now[a.id]&&!achPrev[a.id]);
    if(nw.length){
      const xp=nw.reduce((t,a)=>t+a.xp,0),top=nw[nw.length-1];
      awardXP(xp,true);
      toast('<span style="display:inline-block;vertical-align:middle;margin-right:8px">'+medal(top.c,top.t,38)+'</span><span style="display:inline-block;vertical-align:middle;text-align:left"><b>Medalla de '+TIERS[top.t].n.toLowerCase()+'</b><br>'+top.n+(nw.length>1?' (+'+(nw.length-1)+' más)':'')+'<br><small>+'+xp+' XP</small></span>');
    }
  }
  achPrev=now;
}
function showAch(){
  hideScreens();closeStats();
  const done=ACH.filter(a=>a.get()>=a.goal).length;
  let h='<h1>Logros</h1><p style="margin-bottom:8px">'+done+' / '+ACH.length+' medallas · bronce, plata, oro y diamante · dan XP de cuenta</p><div class="rank" style="max-height:56vh">';
  CATS.forEach(c=>{
    const v=c.get(),r=c.tiers.filter(g=>v>=g).length-1,nx=c.tiers[r+1];
    h+='<div class="ac"><div class="medw">'+medal(c,r,64)+'</div><div class="acb"><b>'+c.n+(r>=0?' · '+TIERS[r].n:'')+'</b><span class="tm" style="display:block;margin:0">'+(nx!=null?c.desc(nx)+' · '+v+'/'+nx:'¡Todas las medallas conseguidas!')+'</span>';
    if(nx!=null){const lo=r>=0?c.tiers[r]:0;h+='<div class="pb"><i style="width:'+Math.max(3,Math.min(100,(v-lo)/(nx-lo)*100))+'%"></i></div>';}
    h+='<div class="mm">'+c.tiers.map((g,t)=>'<span class="mi">'+medal(c,v>=g?t:-1,26)+'<small>'+g+'</small></span>').join('')+'</div></div></div>';
  });
  setModal(h+'</div>',[{t:'Volver',cls:'alt',f:showMenu}]);
}
