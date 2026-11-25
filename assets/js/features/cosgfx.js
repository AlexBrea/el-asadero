/** @module features/cosgfx */
import { hydrate } from './metadata.js';

/**
 * Install cosgfx capabilities into one isolated game session.
 * Cross-feature dependencies are explicit properties; no globals or inline scripts are required.
 * @param {object} game Mutable session and service registry, owned by the application root.
 * @returns {void}
 */
export function installCosgfx(game) {
  game.cosAcc = function cosAcc(cs, base, parts) {
    const h = base.head,
      hd = h.hd,
      hs = h.s,
      L = base.size,
      yb = base[0].c[1],
      T = h.y;
    const hb = (c, s, col, role, x) =>
      parts.push(game.B(c, s, col, role, Object.assign({}, hd, x || {})));
    const bd = (c, s, col, role, x) => parts.push(game.B(c, s, col, role || 'body', x));
    const lg = (base.find((p) => p.an === 'leg') || { s: [0, 0.2] }).s[1];
    const hx = h.x;
    /* gorros */
    switch (cs.hat) {
      case 'paja':
        hb([hx, T + 0.02, 0], [hs * 2.0, 0.035, hs * 1.8], '#e8c76a', 'acc');
        hb([hx, T + 0.035 + hs * 0.2, 0], [hs * 0.9, hs * 0.42, hs * 0.78], '#f0d680', 'acc');
        hb([hx, T + 0.07, 0], [hs * 0.94, 0.05, hs * 0.82], '#c0392b', 'acc');
        break;
      case 'cocinero':
        hb([hx - 0.01, T + hs * 0.13, 0], [hs * 0.95, hs * 0.3, hs * 0.85], '#ffffff', 'acc');
        hb([hx - 0.01, T + hs * 0.43, 0], [hs * 1.2, hs * 0.36, hs * 1.05], '#f4f4f4', 'acc');
        break;
      case 'chistera':
        hb([hx, T + 0.02, 0], [hs * 1.4, 0.03, hs * 1.25], '#1b1b22', 'acc');
        hb([hx, T + 0.03 + hs * 0.45, 0], [hs * 0.85, hs * 0.9, hs * 0.75], '#26262e', 'acc');
        hb([hx, T + 0.1, 0], [hs * 0.9, 0.07, hs * 0.8], '#8e44ff', 'acc');
        break;
      case 'vikingo':
        hb([hx, T + hs * 0.1, 0], [hs * 1.08, hs * 0.32, hs * 0.95], '#9aa3b5', 'acc');
        hb([hx + hs * 0.3, T - hs * 0.1, 0], [0.03, hs * 0.12, hs * 0.5], '#5f687c', 'acc');
        [1, -1].forEach((s) => {
          hb([hx, T + hs * 0.28, s * hs * 0.58], [0.05, hs * 0.34, 0.05], '#f4ecd0', 'acc');
          hb([hx, T + hs * 0.52, s * hs * 0.7], [0.05, hs * 0.22, 0.05], '#f4ecd0', 'acc');
        });
        break;
      case 'halo': {
        const y = T + hs * 0.75;
        [1, -1].forEach((s) => {
          hb([hx, y, s * hs * 0.5], [hs * 1.0, 0.03, 0.04], '#ffe36a', 'acc', { glow: true });
          hb([hx + s * hs * 0.5, y, 0], [0.04, 0.03, hs * 1.0], '#ffe36a', 'acc', { glow: true });
        });
        break;
      }
      case 'fiesta':
        hb([hx - 0.01, T + 0.05, 0], [hs * 0.7, 0.1, hs * 0.6], '#ff4fa0', 'acc');
        hb([hx - 0.01, T + 0.15, 0], [hs * 0.5, 0.1, hs * 0.42], '#ffd24a', 'acc');
        hb([hx - 0.01, T + 0.25, 0], [hs * 0.3, 0.1, hs * 0.25], '#4fd0ff', 'acc');
        hb([hx - 0.01, T + 0.33, 0], [0.07, 0.07, 0.07], '#ffffff', 'acc', { glow: true });
        break;
    }
    /* zapatillas: siguen la animación de las patas */
    const foot = (col, sole, tall, glow) =>
      [1, -1].forEach((s) => {
        const z = s * L * 0.2,
          an = { an: 'leg', pv: [0, lg, z], ph: s > 0 ? 0 : Math.PI };
        if (tall) {
          bd(
            [0, lg * 0.3, z],
            [L * 0.17, lg * 0.6, L * 0.17],
            col,
            'limb',
            Object.assign({ glow: glow }, an),
          );
        }
        bd(
          [L * 0.06, 0.045, z],
          [L * 0.3, 0.09, L * 0.19],
          col,
          'limb',
          Object.assign({ glow: glow }, an),
        );
        if (sole) {
          bd([L * 0.06, 0.012, z], [L * 0.32, 0.025, L * 0.2], sole, 'limb', an);
        }
      });
    switch (cs.shoes) {
      case 'deportivas':
        foot('#d8262b', '#ffffff', false, false);
        break;
      case 'botas':
        foot('#f2c21b', '#3a3a3a', true, false);
        break;
      case 'oro':
        foot('#ffd24a', '#fff3a0', false, true);
        break;
      case 'cohete':
        foot('#8d98b3', '#454b5c', false, false);
        [1, -1].forEach((s) => {
          const z = s * L * 0.2,
            an = { an: 'leg', pv: [0, lg, z], ph: s > 0 ? 0 : Math.PI };
          bd(
            [-L * 0.12, 0.03, z],
            [0.1, 0.07, 0.1],
            '#ff8a1a',
            'limb',
            Object.assign({ glow: true }, an),
          );
          bd(
            [-L * 0.2, 0.03, z],
            [0.08, 0.05, 0.07],
            '#fff3a0',
            'limb',
            Object.assign({ glow: true }, an),
          );
        });
        break;
    }
    /* trajes */
    const fr = L * 0.5 + 0.015;
    switch (cs.suit) {
      case 'peto':
        bd([-L * 0.1, yb - L * 0.02, 0], [L * 0.4, L * 0.87, L * 0.84], '#2f6bd8');
        bd([fr, yb - L * 0.05, 0], [0.035, L * 0.5, L * 0.55], '#3b7cf0');
        [1, -1].forEach((s) =>
          bd([fr + 0.02, yb + L * 0.2, s * L * 0.22], [0.03, 0.05, 0.05], '#ffd24a', 'acc'),
        );
        break;
      case 'delantal':
        bd([fr, yb - L * 0.08, 0], [0.035, L * 0.7, L * 0.6], '#ffffff');
        bd([L * 0.0, yb + L * 0.05, 0], [L * 0.12, 0.03, L * 0.86], '#f1f1f1');
        bd([fr + 0.02, yb - L * 0.02, 0], [0.02, L * 0.16, L * 0.2], '#e6e6e6');
        break;
      case 'capa':
        bd([-L * 0.5 - 0.03, yb - L * 0.05, 0], [0.04, L * 1.0, L * 0.9], '#d8262b');
        bd([-L * 0.5 - 0.05, yb + L * 0.45, 0], [0.05, 0.06, L * 0.92], '#ffd24a', 'acc');
        bd([-L * 0.5 - 0.06, yb - L * 0.05, 0], [0.03, L * 0.3, L * 0.3], '#ffe36a', 'acc', {
          glow: true,
        });
        break;
      case 'esmoquin':
        bd([-L * 0.1, yb - L * 0.02, 0], [L * 0.5, L * 0.88, L * 0.84], '#15151c');
        bd([fr, yb - L * 0.02, 0], [0.03, L * 0.52, L * 0.3], '#ffffff');
        bd([fr + 0.03, yb + L * 0.36, 0], [0.05, 0.05, 0.05], '#d8262b', 'acc');
        [1, -1].forEach((s) =>
          bd([fr + 0.025, yb + L * 0.36, s * 0.065], [0.04, 0.07, 0.07], '#d8262b', 'acc'),
        );
        break;
      case 'armadura':
        bd([fr + 0.01, yb, 0], [0.05, L * 0.62, L * 0.7], '#d4a82a');
        bd([fr + 0.04, yb, 0], [0.02, L * 0.2, L * 0.5], '#fff0a0', 'acc', { glow: true });
        [1, -1].forEach((s) =>
          bd([0, yb + L * 0.3, s * (L * 0.4 + 0.09)], [L * 0.32, 0.09, 0.09], '#d4a82a'),
        );
        bd([-L * 0.5 - 0.03, yb, 0], [0.05, L * 0.62, L * 0.7], '#b88a1a');
        break;
      case 'jetpack':
        [1, -1].forEach((s) => {
          bd([-L * 0.5 - 0.1, yb, s * L * 0.2], [L * 0.2, L * 0.55, L * 0.2], '#8d98b3');
          bd(
            [-L * 0.5 - 0.1, yb + L * 0.3, s * L * 0.2],
            [L * 0.2, 0.05, L * 0.2],
            '#d8262b',
            'acc',
          );
          bd(
            [-L * 0.5 - 0.1, yb - L * 0.34, s * L * 0.2],
            [L * 0.12, 0.12, L * 0.12],
            '#ff8a1a',
            'acc',
            { glow: true },
          );
          bd(
            [-L * 0.5 - 0.1, yb - L * 0.44, s * L * 0.2],
            [L * 0.07, 0.1, L * 0.07],
            '#fff3a0',
            'acc',
            { glow: true },
          );
        });
        break;
    }
  };
  game.RAR = structuredClone(game.catalog.cosmeticRarities);
  game.SLOTS = hydrate(game.catalog.cosmeticSlots);
  game.SHOPSKINS = structuredClone(game.catalog.shopSkins);
  game.CAT = structuredClone(game.catalog.cosmetics);
  game.SHOPSKINS.forEach((s) => game.SKINS.push(s));
  game.SHOPSKINS.forEach((s) =>
    game.CAT.push({ id: s.id, slot: 'skin', n: s.n, rar: s.rar, price: s.price, d: s.d }),
  );
  game.catOf = (id) => game.CAT.find((x) => x.id === id);
  game.skinDef = (id) =>
    game.SKINS.find((x) => x.id === id) || game.SHOPSKINS.find((x) => x.id === id) || null;
  game.getModelBase = game.getModel;
  game.getModel = function (k, tier, gold, skin, spec, cs) {
    const mo = game.getModelBase(k, tier, gold, skin, spec);
    if (k !== 'chicken' || tier !== 0) {
      return mo;
    }
    if (cs === undefined) {
      cs = skin ? game.cosOf() : null;
    }
    if (!cs || !(cs.hat || cs.shoes || cs.suit)) {
      return mo;
    }
    const id =
      'X' +
      k +
      (gold ? 'G' : '') +
      (skin || '') +
      (spec ? 'S' + spec : '') +
      'C' +
      (cs.hat || '') +
      '.' +
      (cs.shoes || '') +
      '.' +
      (cs.suit || '');
    if (game.mcache[id]) {
      return game.mcache[id];
    }
    const parts = mo.parts.slice();
    game.cosAcc(cs, game.SP[k].mk(), parts);
    let top = 0,
      hw = 0;
    parts.forEach((p) => {
      top = Math.max(top, p.c[1] + p.s[1] / 2);
      hw = Math.max(hw, Math.abs(p.c[2]) + p.s[2] / 2);
    });
    return (game.mcache[id] = { parts, size: mo.size, top, hw, rbw: mo.rbw });
  };
}
