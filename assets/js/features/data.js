import { icon } from './metadata.js';
/** @module features/data */

/**
 * Install data capabilities into one isolated game session.
 * Cross-feature dependencies are explicit properties; no globals or inline scripts are required.
 * @param {object} game Mutable session and service registry, owned by the application root.
 * @returns {void}
 */
export function installData(game) {
  game.mulberry = function mulberry(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  game.S = function S(list) {
    let h = 0,
      a = 0;
    for (const e of list) {
      const sp = game.SP[e.k];
      h += sp.hp * game.HM[e.t || 0] * (e.f || 1);
      a += sp.atk * game.AM[e.t || 0] * (e.f || 1);
    }
    return h * a;
  };
  game.minTier = function minTier(list, k) {
    let m = 9;
    for (const e of list) {
      if (e.k === k) {
        m = Math.min(m, e.t || 0);
      }
    }
    return m;
  };
  game.upSpecies = function upSpecies(list, k, mark) {
    const m = game.minTier(list, k);
    if (m >= 2) {
      return false;
    }
    list.forEach((e) => {
      if (e.k === k && (e.t || 0) === m) {
        e.t = m + 1;
        if (mark) {
          e.fresh = true;
        }
      }
    });
    return true;
  };
  game.pickUp = function pickUp(list, rng, cap) {
    const m = {};
    list.forEach((e) => {
      m[e.k] = (m[e.k] || 0) + 1;
    });
    const ks = Object.keys(m).filter((k) => m[k] >= 2 && game.minTier(list, k) < cap);
    if (!ks.length) {
      return null;
    }
    return ks[Math.floor(rng() * ks.length)];
  };
  game.runTimers = function runTimers(dt) {
    for (let i = 0; i < game.timers.length; i++) {
      const x = game.timers[i];
      x.t -= dt;
      if (x.t <= 0) {
        game.timers.splice(i, 1);
        i--;
        if (x.id === game.runId) {
          x.fn();
        }
      }
    }
  };
  game.KEYS = game.catalog.balance.enemyOrder;
  game.HM = game.catalog.balance.healthTiers;
  game.AM = game.catalog.balance.attackTiers;
  game.SM = game.catalog.balance.speedTiers;
  game.TIERN = ['', icon('robot'), icon('crown')];
  game.TIERW = ['', 'Robots', 'Titanes'];
  game.THEMES = game.catalog.themes;
  game.mode = 'menu';
  game.st = 'menu';
  game.team = [];
  game.bteam = [];
  game.offers = [];
  game.units = [];
  game.fightT = 0;
  game.fightEnd = false;
  game.endT = 0;
  game.speed = 1;
  game.runId = 0;
  game.infN = 1;
  game.pendingUpg = null;
  game.TH = game.THEMES[0];
  game.parts = [];
  game.floaters = [];
  game.fx = [];
  game.$ = (id) => document.getElementById(id);
  game.BEST = 0;
  game.runT = 0;
  game.pend = 0;
  game.picksLeft = 1;
  game.prize = 0;
  game.saveProg = () => {
    if (typeof game.cloudSave === 'function') {
      game.cloudSave();
    }
  };
  game.timers = [];
  game.later = (fn, ms) => {
    game.timers.push({ t: ms / 1000, fn, id: game.runId });
  };
}
