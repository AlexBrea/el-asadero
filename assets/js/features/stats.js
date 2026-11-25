import { icon } from './metadata.js';
/** @module features/stats */

/**
 * Install stats capabilities into one isolated game session.
 * Cross-feature dependencies are explicit properties; no globals or inline scripts are required.
 * @param {object} game Mutable session and service registry, owned by the application root.
 * @returns {void}
 */
export function installStats(game) {
  game.statsHTML = function statsHTML() {
    if (game.mode !== 'inf' || !game.team.length) {
      return '<div class="note">Empieza una partida para ver tus estadísticas.</div>';
    }
    let h =
      '<div class="note">Valores reales, se actualizan en directo. El juego sigue corriendo.</div>';
    const rk = Object.keys(game.RL).filter((k) => game.RL[k] && game.REL[k]);
    if (rk.length) {
      h +=
        '<div class="sc"><h3>' +
        icon('egg') +
        ' Reliquias</h3>' +
        rk
          .map(
            (k) =>
              '<div class="sr"><span>' +
              game.REL[k].e +
              ' ' +
              game.REL[k].n +
              (game.RL[k] > 1 ? ' ×' + game.RL[k] : '') +
              '</span><b>' +
              game.REL[k].d +
              '</b></div>',
          )
          .join('') +
        '</div>';
    }
    game.team.forEach((m) => {
      const s = game.memberStats(m),
        g = (k) => m.l[k] || 0,
        R = (a, b) => '<div class="sr"><span>' + a + '</span><b>' + b + '</b></div>';
      h +=
        '<div class="sc"><h3>' +
        game.memberName(m) +
        (m.hero ? ' ' + icon('star') : '') +
        (m.t ? ' · ' + (m.t === 1 ? icon('robot') + ' Robot' : icon('crown') + ' Titán') : '') +
        '</h3>';
      h += game.specStatsHTML(m, R);
      h += R(icon('heart') + ' Vida', Math.round(s.hp));
      h += R(
        icon('sword') + ' Daño por segundo',
        game.f1(s.atk) + '  (' + game.f1(s.atk * s.rate) + ' por golpe)',
      );
      h += R(icon('bolt') + ' Velocidad de ataque', 'x' + game.f1(0.7 / s.rate));
      h += R(icon('bolt') + ' Velocidad al correr', 'x' + game.f1(s.spd / 3.6));
      if (m.t) {
        h += R('Bonus de cuerpo', 'vida x' + game.HM[m.t] + ' · daño x' + game.AM[m.t]);
      }
      if (g('power')) {
        h += R(
          icon('sword') + ' Músculos (' + g('power') + ')',
          'daño x' + game.f1(Math.pow(1.3, g('power'))),
        );
      }
      if (g('vit')) {
        h += R(
          icon('heart') + ' Súper plumaje (' + g('vit') + ')',
          'vida x' + game.f1(Math.pow(1.35, g('vit'))),
        );
      }
      if (g('armor')) {
        h += R(
          icon('shield') + ' Plumas de acero (' + g('armor') + ')',
          '-' + Math.round((1 - s.dmgMul) * 100) + '% daño recibido',
        );
      }
      if (g('gold')) {
        h += R(
          '__COIN__ Pico de oro (' + g('gold') + ')',
          Math.round(s.crit * 100) + '% críticos · x3 daño',
        );
      }
      if (g('fire')) {
        h += R(
          icon('flame') + ' Pico de fuego (' + g('fire') + ')',
          game.f1(s.fireDps) + ' daño/s durante 3 s',
        );
      }
      if (g('vamp')) {
        h += R(
          icon('moon') + ' Pico vampiro (' + g('vamp') + ')',
          'roba ' + Math.round(s.vamp * 100) + '% del daño',
        );
      }
      if (s.laser) {
        h += R(
          icon('target') + ' Láser (' + g('laser') + ')',
          s.laser.n +
            (s.laser.n > 1 ? ' rayos' : ' rayo') +
            ' de ' +
            Math.round(s.laser.dmg) +
            ' · cada ' +
            game.f1(s.laser.cd) +
            ' s',
        );
      }
      if (s.egg) {
        h += R(
          icon('egg') + ' Huevos (' + g('egg') + ')',
          Math.round(s.egg.dmg) +
            ' de daño · radio ' +
            game.f1(s.egg.rad) +
            ' · cada ' +
            game.f1(s.egg.cd) +
            ' s',
        );
      }
      if (s.storm) {
        h += R(
          icon('feather') + ' Tormenta (' + g('storm') + ')',
          Math.round(s.storm.dmg) +
            ' de daño · radio ' +
            game.f1(s.storm.rad) +
            ' · cada ' +
            game.f1(s.storm.cd) +
            ' s',
        );
      }
      if (g('phoenix')) {
        h += R(icon('sun') + ' Huevo fénix', 'x' + g('phoenix') + ' · revive con toda la vida');
      }
      if (m.hero && g('flock')) {
        h += R(icon('chick') + ' La bandada', 'nivel ' + g('flock'));
      }
      h += '</div>';
    });
    return h;
  };
  game.refreshStats = function refreshStats() {
    if (game.drawerOpen && game.statsShown) {
      game.$('dstats').innerHTML = game.statsHTML();
    }
  };
  game.refreshDrawer = function refreshDrawer() {
    game.$('d-stats').classList.toggle('hide', game.mode !== 'inf');
    if (game.mode !== 'inf') {
      game.statsShown = false;
      game.$('dstats').classList.remove('on');
    }
    game.$('d-rank').classList.toggle('hide', !(game.ONLINE && game.mode === 'menu'));
    game.$('d-home').classList.toggle('hide', game.mode === 'menu');
    game.$('d-out').classList.toggle('hide', !game.ONLINE);
    game.$('d-mus').classList.toggle('off', !game.musicOn);
    game.$('d-snd').classList.toggle('off', game.muted);
    game.$('d-snd').innerHTML = game.muted
      ? icon('volume-off') + ' Sonido'
      : icon('volume') + ' Sonido';
    game.$('spd').innerHTML = 'x' + game.speed;
    game.$('d-home').innerHTML = icon('home') + ' Menú principal';
    game.homeArm = 0;
    game.refreshStats();
  };
  game.openDrawer = function openDrawer() {
    game.drawerOpen = true;
    game.$('drawer').classList.add('open');
    game.refreshDrawer();
  };
  game.closeDrawer = function closeDrawer() {
    game.drawerOpen = false;
    game.$('drawer').classList.remove('open');
  };
  game.closeStats = function closeStats() {
    game.closeDrawer();
  };
  game.f1 = (n) => (Math.round(n * 10) / 10).toString().replace('.', ',');
  game.drawerOpen = false;
  game.statsShown = false;
  game.statsT = 0;
  game.homeArm = 0;
}
