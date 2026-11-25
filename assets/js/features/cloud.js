import { icon } from './metadata.js';
/** @module features/cloud */

/**
 * Install cloud capabilities into one isolated game session.
 * Cross-feature dependencies are explicit properties; no globals or inline scripts are required.
 * @param {object} game Mutable session and service registry, owned by the application root.
 * @returns {void}
 */
export function installCloud(game) {
  game.saveStats = function saveStats() {
    game.lsSet('asadero_st_' + game.UID, JSON.stringify(game.ST));
    game.cloudProfile();
  };
  game.cloudProfile = function cloudProfile(now) {
    if (!game.ONLINE || !game.fbAuth.currentUser) {
      return Promise.resolve();
    }
    clearTimeout(game.cpT);
    const go = () =>
      game.fbDb
        .collection('players')
        .doc(game.fbAuth.currentUser.uid)
        .set({
          name: game.CNAME,
          st: Object.assign({}, game.ST, { sh: game.SH }),
          run: game.lsGet('asadero_run_' + game.UID) || '',
          ts: Date.now(),
        })
        .catch((e) => console.warn('Datos no guardados en la nube', e && e.code));
    if (now) {
      return go();
    }
    game.cpT = setTimeout(() => {
      if (game.fbAuth.currentUser) {
        go();
      }
    }, 2500);
    return Promise.resolve();
  };
  game.doSignOut = function doSignOut() {
    if (!game.ONLINE) {
      return;
    }
    Promise.race([game.cloudProfile(true), new Promise((r) => setTimeout(r, 2500))]).then(() =>
      game.fbAuth.signOut(),
    );
  };
  game.getRun = function getRun() {
    return game.pj(game.lsGet('asadero_run_' + game.UID));
  };
  game.snapRun = function snapRun(ph, extra) {
    if (game.mode !== 'inf') {
      return;
    }
    const o = {
      v: 1,
      ts: Date.now(),
      ph,
      n: game.infN,
      rt: Math.round(game.runT),
      pk: game.picksLeft,
      pz: game.prize,
      rl: game.RL,
      tm: game.team.map((m) => ({ hero: m.hero ? 1 : 0, t: m.t, l: m.l, sp: m.spec || '' })),
    };
    if (extra) {
      Object.assign(o, extra);
    }
    game.lsSet('asadero_run_' + game.UID, JSON.stringify(o));
    game.cloudProfile();
  };
  game.clearRun = function clearRun() {
    game.lsSet('asadero_run_' + game.UID, JSON.stringify({ ts: Date.now(), x: 1 }));
    game.cloudProfile();
  };
  game.newGame = function newGame() {
    const r = game.getRun();
    if (
      r &&
      !r.x &&
      r.tm &&
      !confirm('Tienes una partida guardada. Si empiezas una nueva se perderá. ¿Seguro?')
    ) {
      return;
    }
    game.startInf();
  };
  game.resumeRun = function resumeRun() {
    const s = game.getRun();
    if (!s || s.x || !Array.isArray(s.tm) || !s.tm.some((m) => m && m.hero) || !(s.n >= 1)) {
      return game.startInf();
    }
    game.resetBattle();
    game.mode = 'inf';
    game.runXP0 = game.XP;
    game.infN = Math.min(9999, s.n | 0);
    game.runT = Math.max(0, +s.rt || 0);
    game.picksLeft = s.pk === 2 ? 2 : 1;
    game.prize = s.pz === 2 ? 2 : 0;
    game.RL = {};
    Object.keys(game.REL).forEach((k) => {
      const v = Math.max(0, Math.min(game.REL[k].max, (s.rl && s.rl[k]) | 0));
      if (v) {
        game.RL[k] = v;
      }
    });
    let hero = false;
    game.team = s.tm
      .slice(0, 40)
      .filter((m) => m && (m.hero ? !hero && (hero = true) : true))
      .map((m) => {
        const l = {};
        Object.keys(game.UPG).forEach((k) => {
          const v = Math.max(0, Math.min(game.UPG[k].max, (m.l && m.l[k]) | 0));
          if (v) {
            l[k] = v;
          }
        });
        const o = {
          k: m.hero ? 'chicken' : 'chick',
          hero: !!m.hero,
          t: Math.max(0, Math.min(2, m.t | 0)),
          l,
          base: m.hero ? 1 : 0.55,
          fresh: true,
          skin: m.hero ? game.SKIN : null,
        };
        if (m.hero && game.SPECS[m.sp]) {
          o.spec = m.sp;
        } else {
          Object.keys(l).forEach((k) => {
            if (game.UPG[k].sp) {
              delete l[k];
            }
          });
        }
        return o;
      });
    game.hideScreens();
    game.$('rosL').style.display = game.$('rosR').style.display = '';
    game.TH = game.THEMES[(((game.infN - 1) / 5) | 0) % 5];
    game.bteam = game.genInfEnemy(game.infN);
    const ro = Array.isArray(s.ro)
      ? s.ro.filter((k) => game.REL[k] && game.rl(k) < game.REL[k].max)
      : [];
    if (s.ph === 'gamble') {
      game.resumeGamble();
    } else if (s.ph === 'relic' && ro.length) {
      game.buildArena();
      game.updatePips();
      game.startRelic(ro);
    } else if (s.ph === 'won' || s.ph === 'relic') {
      game.st = 'rounddone';
      game.buildArena();
      game.updatePips();
      game.winPanel();
    } else if (s.ph === 'fight') {
      game.st = 'intro';
      game.buildArena();
      game.updatePips();
      game.banner('RONDA ' + game.infN, '#ffe08a');
      game.later(() => {
        if (game.st === 'intro') {
          game.startFight();
        }
      }, 1500);
    } else {
      game.offers = game.genUpgrades();
      game.st = 'choose';
      game.buildArena();
      if (game.needSpec()) {
        game.showSpecPick();
      } else {
        game.showCards();
      }
      game.updatePips();
      game.banner(
        game.infN % 10 === 0 ? icon('skull') + ' ¡JEFE! RONDA ' + game.infN : 'RONDA ' + game.infN,
        game.infN % 10 === 0 ? '#ff6b6b' : '#ffe08a',
      );
    }
  };
  game.showMenu = function showMenu() {
    if (game.mode === 'inf') {
      game.cloudSave();
    }
    game.resetBattle();
    game.mode = 'menu';
    game.tabCur = 'game';
    game.TH = game.THEMES[0];
    game.hideScreens();
    game.closeStats();
    game.$('lvl').innerHTML = 'EL ASADERO<small>Rondas infinitas</small>';
    game.$('pips').innerHTML = '';
    game.$('rosL').style.display = game.$('rosR').style.display = 'none';
    const a = game.newMember(true);
    a.fresh = false;
    game.team = [a];
    game.bteam = [
      { k: 'gorilla', t: 0 },
      { k: 'cat', t: 0 },
    ];
    game.buildArena();
    game.units.forEach((u) => (u.spawnT = 1));
    game.team = [];
    game.bteam = [];
    const rn = game.getRun(),
      hasRun = !!(rn && !rn.x && rn.tm),
      btns = [
        ...(hasRun
          ? [{ t: icon('arrow-right') + ' Continuar · ronda ' + rn.n, f: game.resumeRun }]
          : []),
        { t: hasRun ? icon('sparkles') + ' Nueva partida' : '¡JUGAR!', f: game.newGame },
        { t: icon('medal') + ' Logros', cls: 'alt', f: game.showAch },
      ];
    if (game.ONLINE) {
      btns.push({ t: icon('trophy') + ' Ranking', cls: 'alt', f: game.showRanking });
      btns.push({ t: 'Salir', cls: 'alt', f: game.doSignOut });
    }
    game.setModal(
      '<div class="big">' +
        icon('chicken') +
        icon('sword') +
        icon('gorilla') +
        '</div><h1>EL ASADERO</h1>' +
        game.profHTML() +
        game.menuShopHTML() +
        '<p>Empiezas con <b>una sola gallina</b>. Cada ronda eliges una mejora: ataques especiales como el pico de oro, rayos láser o huevos explosivos.<br>Los pollitos que te ayudan también se pueden mejorar. ¿Hasta qué ronda llegas?<br><br>' +
        (game.ONLINE
          ? 'Jugador: <b>' +
            game.esc(game.USER) +
            '</b>' +
            (game.BEST ? ' · ' + icon('trophy') + ' récord: <b>' + game.BEST + '</b>' : '')
          : '<small>Modo sin conexión: no se guarda el ranking</small>') +
        '</p>',
      btns,
    );
  };
  game.goHome = function goHome() {
    game.showMenu();
  };
  game.cpT = 0;
}
