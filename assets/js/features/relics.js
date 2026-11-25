import { icon } from './metadata.js';
/** @module features/relics */
import { hydrate } from './metadata.js';

/**
 * Install relics capabilities into one isolated game session.
 * Cross-feature dependencies are explicit properties; no globals or inline scripts are required.
 * @param {object} game Mutable session and service registry, owned by the application root.
 * @returns {void}
 */
export function installRelics(game) {
  game.relOffer = function relOffer() {
    const av = Object.keys(game.REL).filter((k) => game.rl(k) < game.REL[k].max);
    for (let i = av.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [av[i], av[j]] = [av[j], av[i]];
    }
    return av.slice(0, 3);
  };
  game.winPanel = function winPanel(msg) {
    const bz = game.infN % 10 === 0,
      hr = bz && game.relOffer().length > 0;
    game.panelButton(
      msg || '¡Bien! Sigue mejorando a tu equipo',
      bz
        ? hr
          ? 'Reclamar reliquia ' + icon('egg')
          : 'Reclamar 2 mejoras ' + icon('gift')
        : 'Elegir mejora ' + icon('arrow-right'),
      game.advance,
    );
  };
  game.advance = function advance() {
    const bz = game.infN % 10 === 0;
    if (bz) {
      const ro = game.relOffer();
      if (ro.length) {
        game.startRelic(ro);
        return;
      }
      game.afterBoss();
      return;
    }
    game.infN++;
    game.prize = 0;
    game.picksLeft = 1;
    game.nextInfRound();
  };
  game.toNext = function toNext() {
    game.infN++;
    game.prize = 2;
    game.picksLeft = 2;
    game.nextInfRound();
  };
  game.afterBoss = function afterBoss() {
    if (game.isGambleRound() && game.gambleOK()) {
      game.startGamble();
    } else {
      game.toNext();
    }
  };
  game.startGamble = function startGamble() {
    game.st = 'gamble';
    game.snapRun('gamble');
    game.showGamble();
  };
  game.resumeGamble = function resumeGamble() {
    if (game.isGambleRound() && game.gambleOK()) {
      game.buildArena();
      game.updatePips();
      game.startGamble();
    } else {
      game.toNext();
    }
  };
  game.showGamble = function showGamble() {
    game.icons.length = 0;
    const n = game.relCount();
    game.$('ptitle').innerHTML =
      icon('diamond') + ' ¡Apuesta! Juégate ' + game.relTxt(n) + ' para conseguir 1 más';
    const box = game.$('cards');
    box.innerHTML = '';
    box.classList.remove('tgt');
    const mk = (e, nm, ds, fn, cls) => {
      const d = document.createElement('div');
      d.className = 'card ' + cls;
      d.innerHTML =
        '<div class="em" style="height:clamp(54px,11vh,92px);display:grid;place-items:center;font-size:clamp(38px,9vw,60px)">' +
        e +
        '</div><div class="nm">' +
        nm +
        '</div><div class="ds">' +
        ds +
        '</div>';
      d.onclick = fn;
      box.appendChild(d);
    };
    mk(
      icon('diamond'),
      'Apostar',
      '50%: ganas 1 reliquia al azar (' +
        (n + 1) +
        ' en total)<br>50%: pierdes ' +
        (n === 1 ? 'la que tienes' : 'las ' + n + ' que tienes'),
      game.betRelics,
      'up',
    );
    mk(
      icon('shield'),
      'Quedármelas',
      'Sigues con ' + game.relTxt(n) + ' y continúas la partida',
      () => {
        if (game.st !== 'gamble') {
          return;
        }
        game.ensureAudio();
        game.snd.click();
        game.$('panel').classList.remove('on');
        game.toNext();
      },
      '',
    );
    game.$('panel').classList.add('on');
  };
  game.betRelics = function betRelics() {
    if (game.st !== 'gamble') {
      return;
    }
    game.ensureAudio();
    game.snd.click();
    game.st = 'gambling';
    const n = game.relCount(),
      win = Math.random() < 0.5;
    let got = null;
    /* el resultado se decide y se guarda ya, para que recargar la página no sirva de nada */
    if (win) {
      const av = Object.keys(game.REL).filter((k) => game.rl(k) < game.REL[k].max);
      got = av[(Math.random() * av.length) | 0];
      game.RL[got] = game.rl(got) + 1;
      game.ST.rl++;
      if (got === 'chick') {
        game.team.push(game.newMember(false));
      }
    } else {
      for (let i = game.rl('chick'); i > 0; i--) {
        const j = game.team.map((m) => m.hero).lastIndexOf(false);
        if (j >= 0) {
          game.team.splice(j, 1);
        }
      }
      game.RL = {};
    }
    game.achCheck();
    game.saveStats();
    game.snapRun('gamble');
    game.updateRosters();
    game.icons.length = 0;
    game.$('ptitle').innerHTML =
      icon('diamond') + ' ¡Gira la ruleta! Verde = ganas · Rojo = lo pierdes todo';
    /* ruleta: 10 sectores que alternan verde/rojo (50% cada color); el puntero está arriba */
    const N = 10,
      sg = 360 / N,
      box = game.$('cards');
    box.classList.remove('tgt');
    const seg = [];
    for (let i = 0; i < N; i++) {
      if ((i % 2 === 0) === win) {
        seg.push(i);
      }
    }
    const idx = seg[(Math.random() * seg.length) | 0],
      off = sg * (0.18 + Math.random() * 0.64),
      turns = 5 + ((Math.random() * 2) | 0);
    const R = 360 * turns - (idx * sg + off);
    let paths = '';
    for (let i = 0; i < N; i++) {
      const a0 = ((i * sg - 90) * Math.PI) / 180,
        a1 = (((i + 1) * sg - 90) * Math.PI) / 180,
        r = 100;
      paths +=
        '<path d="M0 0 L' +
        (r * Math.cos(a0)).toFixed(2) +
        ' ' +
        (r * Math.sin(a0)).toFixed(2) +
        ' A' +
        r +
        ' ' +
        r +
        ' 0 0 1 ' +
        (r * Math.cos(a1)).toFixed(2) +
        ' ' +
        (r * Math.sin(a1)).toFixed(2) +
        'Z" fill="' +
        (i % 2 === 0 ? '#2fbf5a' : '#e0414f') +
        '" stroke="#1b1330" stroke-width="2.5"/>';
    }
    box.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;gap:8px"><div id="wheelw" style="position:relative;width:min(36vh,230px);height:min(36vh,230px)">' +
      '<svg id="wheel" viewBox="-104 -104 208 208" style="width:100%;height:100%;transform:rotate(0deg);filter:drop-shadow(0 5px 6px #0009)">' +
      paths +
      '<circle r="14" fill="#ffd24a" stroke="#1b1330" stroke-width="3"/></svg>' +
      '<svg viewBox="-104 -104 208 208" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"><path d="M-9 -110 L9 -110 L0 -88Z" fill="#ffd24a" stroke="#1b1330" stroke-width="3" stroke-linejoin="round"/></svg></div><div id="wres" style="min-height:48px"></div></div>';
    const wh = game.$('wheel');
    void wh.getBoundingClientRect();
    wh.style.transition = 'transform 3.4s cubic-bezier(.12,.62,.08,1)';
    wh.style.transform = 'rotate(' + R + 'deg)';
    let lastK = -1;
    const iv = setInterval(() => {
      const w = game.$('wheel');
      if (!w) {
        return;
      }
      const m = getComputedStyle(w).transform.match(/matrix\(([^)]+)\)/);
      if (!m) {
        return;
      }
      const v = m[1].split(',').map(Number),
        ang = ((((Math.atan2(v[1], v[0]) * 180) / Math.PI) % 360) + 360) % 360,
        k = Math.floor(((360 - ang) % 360) / sg);
      if (k !== lastK) {
        lastK = k;
        game.tone(700 + (k % 2) * 160, 600, 0.04, 'square', 0.04);
      }
    }, 40);
    const runId0 = game.runId;
    game.later(() => {
      clearInterval(iv);
      if (game.runId !== runId0) {
        return;
      }
      game.st = 'gambleres';
      const done = (title, label, fn, bn, col) => {
        game.banner(bn, col);
        game.$('ptitle').innerHTML = title;
        const b = document.createElement('button');
        b.className = 'btn';
        b.innerHTML = label;
        b.onclick = () => {
          game.ensureAudio();
          game.snd.click();
          game.$('panel').classList.remove('on');
          fn();
        };
        const r = game.$('wres');
        if (r) {
          r.appendChild(b);
        }
      };
      if (win) {
        game.snd.win();
        done(
          icon('party') +
            ' ¡Has ganado ' +
            game.REL[got].e +
            ' ' +
            game.REL[got].n +
            '!  Ahora tienes ' +
            game.relCount() +
            ' reliquias',
          game.gambleOK() ? 'Seguir ' + icon('arrow-right') : 'Continuar ' + icon('arrow-right'),
          () => {
            if (game.gambleOK()) {
              game.st = 'gamble';
              game.snapRun('gamble');
              game.$('panel').classList.add('on');
              game.showGamble();
            } else {
              game.toNext();
            }
          },
          '¡VERDE!',
          '#7bed9f',
        );
      } else {
        game.snd.lose();
        done(
          icon('flame') + ' Has perdido ' + game.relTxt(n),
          'Continuar ' + icon('arrow-right'),
          game.toNext,
          '¡ROJO!',
          '#ff6b6b',
        );
      }
    }, 3600);
  };
  game.showRelics = function showRelics(ids) {
    game.icons.length = 0;
    game.$('ptitle').innerHTML =
      icon('egg') + ' ¡Reliquia del jefe! Elige una (dura toda la partida)';
    const box = game.$('cards');
    box.innerHTML = '';
    box.classList.remove('tgt');
    ids.forEach((id) => {
      const r = game.REL[id],
        lv = game.rl(id),
        d = document.createElement('div');
      d.className = 'card up';
      d.innerHTML =
        '<div class="em" style="height:clamp(54px,11vh,92px);display:grid;place-items:center;font-size:clamp(38px,9vw,60px)">' +
        r.e +
        '</div><div class="nm">' +
        r.n +
        '</div><div class="ds">' +
        r.d +
        '</div>' +
        (lv ? '<div class="lv">Ya tienes ×' + lv + '</div>' : '');
      d.onclick = () => game.pickRelic(id);
      box.appendChild(d);
    });
    game.$('panel').classList.add('on');
  };
  game.startRelic = function startRelic(ids) {
    game.st = 'relic';
    game.snapRun('relic', { ro: ids });
    game.showRelics(ids);
  };
  game.pickRelic = function pickRelic(id) {
    if (game.st !== 'relic') {
      return;
    }
    game.ensureAudio();
    game.snd.click();
    game.RL[id] = game.rl(id) + 1;
    game.ST.rl++;
    if (id === 'chick') {
      game.team.push(game.newMember(false));
    }
    game.toast(
      icon('egg') +
        ' ' +
        game.REL[id].e +
        ' ' +
        game.REL[id].n +
        (game.RL[id] > 1 ? ' ×' + game.RL[id] : ''),
    );
    game.achCheck();
    game.saveStats();
    game.$('panel').classList.remove('on');
    game.icons.length = 0;
    game.afterBoss();
  };
  game.REL = hydrate(game.catalog.relics);
  game.isGambleRound = () => game.infN >= 10 && game.infN % 10 === 0;
  game.relTxt = (n) => (n === 1 ? 'tu reliquia' : 'tus ' + n + ' reliquias');
  game.relCount = () => Object.keys(game.REL).reduce((t, k) => t + game.rl(k), 0);
  game.gambleOK = () =>
    game.relCount() >= 1 && Object.keys(game.REL).some((k) => game.rl(k) < game.REL[k].max);
}
