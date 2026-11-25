/** @module enemies */
import { mulberry } from './math.js';

/**
 * Create deterministic difficulty rules independently of combat and presentation.
 * Seeded randomness guarantees the same roster for a given round and catalog.
 * @param {object} options Generation dependencies.
 * @param {import('./types.js').GameCatalog} options.data Balance catalog.
 * @param {Record<string,object>} options.species Species base stats.
 * @returns {{generate:function(number):object[]}} Enemy roster generator.
 */
export function createEnemySystem({ data, species }) {
  const SP = species,
    KEYS = data.balance.enemyOrder;
  const {
    healthTiers: HM,
    attackTiers: AM,
    enemyBase: INF_BASE,
    enemyGrowth: INF_G,
    enemyExponent: INF_E,
  } = data.balance;
  function evaluateRosterPower(list) {
    let h = 0,
      a = 0;
    for (const e of list) {
      const sp = SP[e.k];
      h += sp.hp * HM[e.t || 0] * (e.f || 1);
      a += sp.atk * AM[e.t || 0] * (e.f || 1);
    }
    return h * a;
  }
  function minTier(list, k) {
    let m = 9;
    for (const e of list) {
      if (e.k === k) {
        m = Math.min(m, e.t || 0);
      }
    }
    return m;
  }
  function upSpecies(list, k, mark) {
    const m = minTier(list, k);
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
  }
  function pickUp(list, rng, cap) {
    const m = {};
    list.forEach((e) => {
      m[e.k] = (m[e.k] || 0) + 1;
    });
    const ks = Object.keys(m).filter((k) => m[k] >= 2 && minTier(list, k) < cap);
    if (!ks.length) {
      return null;
    }
    return ks[Math.floor(rng() * ks.length)];
  }
  /**
   * Generate a deterministic enemy roster for a one-based round number.
   * @param {number} n Round number.
   * @returns {object[]} Enemy member definitions, including any boss.
   */
  function genInfEnemy(n) {
    const rng = mulberry(n * 104729 + 17),
      top = Math.min(9, Math.floor((n - 1) * 0.6)),
      lo = Math.max(0, top - 2);
    let target = INF_BASE * Math.pow(INF_G, n - 1) * Math.exp(INF_E * n * n);
    const cap = n >= 18 ? 2 : n >= 9 ? 1 : 0,
      t = [];
    if (n % 10 === 0) {
      /* JEFE: una bestia gigante + escoltas */
      target *= 1.3;
      const bk = ['bear', 'gorilla', 'elephant'][(n / 10 - 1) % 3],
        bs = SP[bk],
        raw = bs.hp * HM[2] * bs.atk * AM[2];
      t.push({ k: bk, t: 2, boss: true, f: Math.sqrt((0.5 * target) / raw), fresh: true });
    }
    let g = 0;
    while (evaluateRosterPower(t) < target && g++ < 150) {
      if (cap > 0 && t.length >= 3 && rng() < (t.length > 12 ? 0.7 : 0.25)) {
        const k = pickUp(t, rng, cap);
        if (k) {
          upSpecies(t, k, true);
          continue;
        }
      }
      t.push({ k: KEYS[lo + Math.floor(rng() * (top - lo + 1))], t: 0, fresh: true });
    }
    return t;
  }

  return { generate: genInfEnemy };
}
