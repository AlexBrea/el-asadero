import { icon } from './metadata.js';
/** @module features/flow */

/**
 * Install flow capabilities into one isolated game session.
 * Cross-feature dependencies are explicit properties; no globals or inline scripts are required.
 * @param {object} game Mutable session and service registry, owned by the application root.
 * @returns {void}
 */
export function installFlow(game) {
  game.startInf = function startInf() {
    game.resetBattle();
    game.mode = 'inf';
    game.runXP0 = game.XP;
    game.infN = 1;
    game.runT = 0;
    game.picksLeft = 1;
    game.prize = 0;
    game.RL = {};
    game.ST.g++;
    game.team = [game.newMember(true)];
    game.hideScreens();
    game.$('rosL').style.display = game.$('rosR').style.display = '';
    game.nextInfRound();
  };
  game.nextInfRound = function nextInfRound() {
    game.bteam = game.genInfEnemy(game.infN);
    game.offers = game.genUpgrades();
    game.TH = game.THEMES[(((game.infN - 1) / 5) | 0) % 5];
    game.st = 'choose';
    game.buildArena();
    if (game.needSpec()) {
      game.showSpecPick();
    } else {
      game.showCards();
    }
    game.updatePips();
    if (game.infN % 10 === 0) {
      game.banner(icon('skull') + ' ¡JEFE! RONDA ' + game.infN, '#ff6b6b');
    } else {
      game.banner('RONDA ' + game.infN, '#ffe08a');
    }
    game.snapRun('choose');
  };
  game.showCards = function showCards() {
    game.icons.length = 0;
    game.$('ptitle').innerHTML = game.prize
      ? icon('gift') +
        ' Premio del jefe (' +
        (game.prize - game.picksLeft + 1) +
        '/' +
        game.prize +
        ') · ¡Elige una mejora!'
      : 'Ronda ' + game.infN + (game.infN % 10 === 0 ? ' · ¡JEFE!' : '') + ' · ¡Elige una mejora!';
    const box = game.$('cards');
    box.innerHTML = '';
    box.classList.remove('tgt');
    game.offers.forEach((o, i) => {
      const u = game.UPG[o.id],
        d = document.createElement('div');
      d.className = 'card' + (o.id === 'robot' || o.id === 'titan' ? ' up' : '');
      d.innerHTML =
        '<canvas class="ic"></canvas>' +
        '<div class="nm">' +
        u.n +
        '</div><div class="ds">' +
        u.d +
        '</div>' +
        (u.sp
          ? '<div class="lv">' +
            game.SPECS[u.sp].n +
            ' · nivel ' +
            ((game.heroOf().l[o.id] || 0) + 1) +
            '/' +
            u.max +
            '</div>' +
            ((game.heroOf().l[o.id] || 0) + 1 >= u.max
              ? '<div class="ult">★ DEFINITIVA: ' +
                game.ULT[o.id].n +
                '<small>' +
                game.ULT[o.id].d +
                '</small></div>'
              : '')
          : '');
      if (u.sp) {
        d.style.borderColor = game.SPECS[u.sp].col;
      }
      const isU = !!(u.sp && (game.heroOf().l[o.id] || 0) + 1 >= u.max);
      if (isU) {
        d.classList.add('ultc');
      }
      d.onclick = () => game.pick(i);
      box.appendChild(d);
      game.icons.push({
        cv: d.querySelector('canvas'),
        spec: () => (isU ? game.ultSpec(o.id) : game.objSpec(o.id)),
      });
    });
    game.$('panel').classList.add('on');
  };
  game.pick = function pick(i) {
    if (game.st !== 'choose') {
      return;
    }
    game.ensureAudio();
    game.snd.click();
    const k = game.offers[i].id;
    const targets =
      k === 'flock' ? [game.team.find((m) => m.hero)] : game.team.filter((m) => game.canUpg(m, k));
    if (targets.length === 1) {
      game.applyTo(targets[0], k);
      game.proceed();
      return;
    }
    game.st = 'target';
    game.icons.length = 0;
    game.$('ptitle').innerHTML = '¿A quién le das «' + game.UPG[k].n + '»?';
    const box = game.$('cards');
    box.innerHTML = '';
    box.classList.add('tgt');
    box.scrollTop = 0;
    targets.forEach((m) => {
      const d = document.createElement('div');
      d.className = 'card';
      d.innerHTML =
        '<canvas class="ic"></canvas><div class="nm">' +
        game.memberName(m) +
        (m.hero ? ' ' + icon('star') : '') +
        '</div><div class="ds">' +
        game.memberDesc(m) +
        '</div>';
      d.onclick = () => {
        if (game.st !== 'target') {
          return;
        }
        game.ensureAudio();
        game.snd.click();
        game.applyTo(m, k);
        game.proceed();
      };
      box.appendChild(d);
      game.icons.push({ cv: d.querySelector('canvas'), spec: () => game.memberSpec(m) });
    });
  };
  game.proceed = function proceed() {
    if (game.picksLeft > 1) {
      game.picksLeft--;
      game.offers = game.genUpgrades();
      game.st = 'choose';
      game.icons.length = 0;
      game.showCards();
      game.snapRun('choose');
      return;
    }
    game.prize = 0;
    game.picksLeft = 1;
    game.snapRun('fight');
    game.st = 'intro';
    game.$('panel').classList.remove('on');
    game.icons.length = 0;
    game.buildArena();
    game.later(() => {
      if (game.st === 'intro') {
        game.startFight();
      }
    }, 1500);
  };
  game.startFight = function startFight() {
    game.phoenixLost = [];
    game.st = 'fight';
    game.fightT = 0;
    game.fightEnd = false;
    game.endT = 0;
    game.units.forEach((u) => {
      u.state = 'idle';
      u.cd = Math.random() * 0.5;
      u.spawnT = 1;
      u.y = 0;
      u.alpha = 1;
    });
    game.banner('¡PELEA!', '#ff6b6b');
    game.tone(200, 400, 0.2, 'sawtooth', 0.05);
  };
  game.panelButton = function panelButton(title, label, fn) {
    game.icons.length = 0;
    game.$('ptitle').innerHTML = title;
    game.$('cards').innerHTML = '';
    game.$('cards').classList.remove('tgt');
    const b = document.createElement('button');
    b.className = 'btn';
    b.innerHTML = label;
    b.onclick = () => {
      game.ensureAudio();
      game.snd.click();
      game.$('panel').classList.remove('on');
      fn();
    };
    game.$('cards').appendChild(b);
    game.$('panel').classList.add('on');
  };
  game.roundOver = function roundOver(pw) {
    game.st = 'rounddone';
    if (pw) {
      game.snd.win();
      game.banner(
        game.infN % 10 === 0 ? '¡JEFE DERROTADO!' : '¡RONDA ' + game.infN + ' SUPERADA!',
        '#7bed9f',
      );
      if (game.infN > game.BEST) {
        game.BEST = game.infN;
      }
      game.saveProg();
      game.awardXP(1 + game.rl('xp'), true);
      game.ST.r++;
      if (game.infN % 10 === 0) {
        game.ST.b++;
      }
      game.achCheck();
      game.saveStats();
      game.shopRound(true, game.infN % 10 === 0);
      game.snapRun('won');
      game.advance();
    } else {
      game.snd.lose();
      game.banner('¡HAS CAÍDO!', '#ff6b6b');
      game.saveProg();
      game.clearRun();
      game.saveStats();
      game.shopRound(false);
      game.later(() => {
        game.st = 'levelend';
        const rs = game.infN - 1;
        game.setModal(
          '<div class="big">' +
            icon('chicken') +
            icon('skull') +
            '</div><h1>Fin de la partida</h1><p>Superaste <b>' +
            rs +
            '</b> ' +
            (rs === 1 ? 'ronda' : 'rondas') +
            (rs > 0 && rs >= game.BEST ? ' · ¡NUEVO RÉCORD! ' + icon('trophy') : '') +
            '<br>Récord: ' +
            game.BEST +
            '</p>' +
            game.xpEndHTML(),
          [{ t: 'Jugar otra vez', f: game.startInf }]
            .concat(
              game.ONLINE
                ? [{ t: icon('trophy') + ' Ranking', cls: 'alt', f: game.showRanking }]
                : [],
            )
            .concat([{ t: 'Menú', cls: 'alt', f: game.showMenu }]),
        );
      }, 2200);
    }
  };
  game.phoenixLost = [];
}
