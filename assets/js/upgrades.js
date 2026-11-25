/** @module upgrades */
import { drawUpgradeOffers } from './rarity.js';

/**
 * Create progression rules independently of the DOM and combat entities.
 * Getter dependencies keep the rules valid when a new run replaces the team array.
 * @param {object} options Rule dependencies.
 * @param {import('./types.js').GameCatalog} options.data Immutable balance catalog.
 * @param {function():import('./types.js').GameMember[]} options.getTeam Current roster.
 * @param {function():string} options.getSkin Selected hero cosmetic.
 * @returns {object} Member creation, eligibility, stats, offers and upgrade commands.
 */
export function createUpgradeSystem({ data, getTeam, getSkin }) {
  const UPG = data.upgrades,
    HPM = data.balance.healthMultiplier,
    HM = data.balance.healthTiers,
    AM = data.balance.attackTiers;
  function newMember(hero) {
    return {
      k: hero ? 'chicken' : 'chick',
      hero: !!hero,
      t: 0,
      l: {},
      base: hero ? 1 : 0.55,
      fresh: true,
      skin: hero ? getSkin() : null,
    };
  }
  /**
   * Check the member cap and team-wide prerequisites without changing progression.
   * @param {import('./types.js').GameMember} m Candidate member.
   * @param {string} k Upgrade identifier.
   * @returns {boolean} Whether the upgrade can be applied now.
   */
  function canUpg(m, k) {
    const team = getTeam();
    const l = m.l[k] || 0;
    if (k === 'robot') {
      return m.t === 0;
    }
    if (k === 'titan') {
      return m.t === 1;
    }
    if (k === 'phoenix') {
      return !team.some((x) => (x.l.phoenix || 0) > 0);
    }
    if (k === 'flock') {
      return m.hero && l < UPG.flock.max;
    }
    return l < UPG[k].max;
  }
  /**
   * Derive combat stats from saved progression without mutating the roster.
   * @param {import('./types.js').GameMember} m Member with acquired upgrade levels.
   * @returns {object} Fully calculated stats and optional active abilities.
   */
  function memberStats(m) {
    const g = (k) => m.l[k] || 0,
      t = m.t,
      b = m.base;
    const hp = 30 * b * Math.pow(1.35, g('vit')) * HM[t] * HPM,
      atk = 6 * b * Math.pow(1.3, g('power')) * AM[t];
    const o = {
      hp,
      atk,
      rate: 0.7 * Math.pow(0.9, g('speed')),
      spd: 3.6 * Math.pow(1.12, g('speed')),
      dmgMul: Math.pow(0.8, g('armor')),
      vamp: 0.12 * g('vamp'),
      fireDps: g('fire') ? atk * 0.35 * (1 + 0.3 * (g('fire') - 1)) : 0,
      crit: g('gold') ? Math.min(0.8, 0.15 + 0.12 * g('gold')) : 0,
      phoenix: g('phoenix'),
      laser: null,
      egg: null,
      storm: null,
    };
    if (g('laser')) {
      const l = g('laser');
      o.laser = {
        cd: Math.max(1.5, 4.2 - 0.5 * l),
        n: 1 + Math.floor(l / 2),
        dmg: atk * 2.6 * (1 + 0.25 * (l - 1)),
      };
    }
    if (g('egg')) {
      const l = g('egg');
      o.egg = {
        cd: Math.max(2.2, 5 - 0.5 * l),
        dmg: atk * 2.2 * (1 + 0.3 * (l - 1)),
        rad: 2 + 0.2 * l,
      };
    }
    if (g('storm')) {
      const l = g('storm');
      o.storm = { cd: Math.max(2.5, 6 - 0.7 * l), dmg: atk * 1.3 * (1 + 0.3 * (l - 1)), rad: 3 };
    }
    return o;
  }
  function genUpgrades() {
    return drawUpgradeOffers(UPG, data.rarities, (k) => getTeam().some((m) => canUpg(m, k)));
  }
  /**
   * Apply one eligible upgrade and add allies when selecting the flock.
   * @param {import('./types.js').GameMember} m Member to mutate.
   * @param {string} k Eligible upgrade identifier.
   * @returns {void}
   */
  function applyTo(m, k) {
    const team = getTeam();
    if (k === 'robot') {
      m.t = 1;
    } else if (k === 'titan') {
      m.t = 2;
    } else {
      m.l[k] = (m.l[k] || 0) + 1;
    }
    m.fresh = true;
    if (k === 'flock') {
      team.push(newMember(false), newMember(false));
    }
  }

  return { newMember, canUpg, memberStats, genUpgrades, applyTo };
}
