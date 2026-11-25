/** @module features/models */
import { icon } from './metadata.js';

/**
 * Install models capabilities into one isolated game session.
 * Cross-feature dependencies are explicit properties; no globals or inline scripts are required.
 * @param {object} game Mutable session and service registry, owned by the application root.
 * @returns {void}
 */
export function installModels(game) {
  game.quad = function quad(o) {
    const P = [],
      lg = o.leg,
      lw = o.lw || Math.max(0.1, o.W * 0.25),
      yb = lg + o.H / 2,
      L = o.L,
      Wd = o.W,
      hs = o.head;
    P.push(game.B([0, yb, 0], [L, o.H, Wd], o.col, 'body'));
    if (o.belly) {
      P.push(game.B([0, yb - o.H * 0.32, 0], [L * 0.94, o.H * 0.4, Wd * 1.04], o.belly, 'body'));
    }
    [
      [1, 1, 0],
      [1, -1, Math.PI],
      [-1, 1, Math.PI],
      [-1, -1, 0],
    ].forEach(([sx, sz, ph]) => {
      const x = sx * (L / 2 - lw / 2),
        z = sz * (Wd / 2 - lw / 2);
      P.push(
        game.B([x, lg / 2, z], [lw, lg, lw], o.legc || o.col, 'limb', {
          an: 'leg',
          pv: [x, lg, z],
          ph,
        }),
      );
    });
    const hx = L / 2 + hs * 0.25,
      hy = yb + o.H * 0.3 + (o.hup || 0),
      hd = { an: 'head', pv: [L / 2 - 0.1, yb + o.H * 0.1, 0] };
    P.push(game.B([hx, hy, 0], [hs, hs, hs * 1.05], o.hcol || o.col, 'head', hd));
    if (o.sn) {
      P.push(
        game.B(
          [hx + hs / 2 + o.sn / 2 - 0.03, hy - hs * 0.17, 0],
          [o.sn, hs * 0.42, hs * 0.55],
          o.snc || o.hcol || o.col,
          'head',
          hd,
        ),
      );
    }
    if (o.nose) {
      P.push(
        game.B(
          [hx + hs / 2 + (o.sn || 0) - 0.01, hy - hs * 0.08, 0],
          [0.06, 0.07, 0.1],
          '#1a1a1a',
          'head',
          hd,
        ),
      );
    }
    const es = Math.max(0.045, hs * 0.13);
    [1, -1].forEach((s) =>
      P.push(
        game.B(
          [hx + hs / 2 - 0.01, hy + hs * 0.14, s * hs * 0.27],
          [0.04, es, es],
          '#111111',
          'eye',
          hd,
        ),
      ),
    );
    if (o.ear) {
      [1, -1].forEach((s) => {
        const ec = o.earc || o.hcol || o.col,
          t = o.ear;
        if (t === 'point') {
          P.push(
            game.B(
              [hx - hs * 0.1, hy + hs / 2 + hs * 0.2, s * hs * 0.3],
              [hs * 0.2, hs * 0.4, hs * 0.2],
              ec,
              'acc',
              hd,
            ),
          );
        }
        if (t === 'floppy') {
          P.push(
            game.B(
              [hx - hs * 0.05, hy + hs * 0.02, s * (hs / 2 + 0.03)],
              [hs * 0.3, hs * 0.6, 0.06],
              ec,
              'acc',
              hd,
            ),
          );
        }
        if (t === 'round') {
          P.push(
            game.B(
              [hx - hs * 0.1, hy + hs / 2 + hs * 0.08, s * hs * 0.35],
              [hs * 0.25, hs * 0.25, hs * 0.22],
              ec,
              'acc',
              hd,
            ),
          );
        }
        if (t === 'big') {
          P.push(
            game.B(
              [hx - hs * 0.15, hy + hs * 0.1, s * (hs / 2 + 0.06)],
              [hs * 0.2, hs * 0.9, hs * 0.8],
              ec,
              'acc',
              hd,
            ),
          );
        }
      });
    }
    if (o.mane) {
      P.push(game.B([hx - hs * 0.3, hy, 0], [hs * 0.7, hs * 1.5, hs * 1.55], o.mane, 'acc', hd));
    }
    if (o.trunk) {
      const tx = hx + hs / 2 + 0.08;
      P.push(game.B([tx, hy - hs * 0.35, 0], [0.28, hs * 0.9, 0.28], o.col, 'head', hd));
      P.push(game.B([tx + 0.17, hy - hs * 0.85, 0], [0.4, 0.26, 0.26], o.col, 'head', hd));
      [1, -1].forEach((s) =>
        P.push(
          game.B([tx - 0.05, hy - hs * 0.5, s * 0.26], [0.55, 0.1, 0.1], '#f4efe0', 'acc', hd),
        ),
      );
    }
    const tl = o.tail || 0.3,
      tc = o.tailc || o.col;
    if (o.tailUp) {
      P.push(
        game.B([-L / 2 - 0.04, yb + tl / 2, 0], [0.08, tl, 0.08], tc, 'tail', {
          an: 'tail',
          pv: [-L / 2, yb, 0],
        }),
      );
    } else {
      P.push(
        game.B(
          [-L / 2 - tl / 2, yb + o.H * 0.15, 0],
          [tl, o.tailh || 0.1, o.tailh || 0.1],
          tc,
          'tail',
          { an: 'tail', pv: [-L / 2, yb + o.H * 0.15, 0] },
        ),
      );
    }
    P.head = { x: hx, y: hy + hs / 2, s: hs, hd };
    P.size = L;
    return P;
  };
  game.bird = function bird(o) {
    const P = [],
      L = o.L,
      lg = o.leg,
      yb = lg + L * 0.45;
    P.push(game.B([0, yb, 0], [L, L * 0.85, L * 0.8], o.col, 'body'));
    if (o.breast) {
      P.push(game.B([L * 0.15, yb - L * 0.1, 0], [L * 0.75, L * 0.6, L * 0.84], o.breast, 'body'));
    }
    const hs = L * 0.5,
      hx = L * 0.55,
      hy = yb + L * 0.6,
      hd = { an: 'head', pv: [L * 0.3, yb + L * 0.3, 0] };
    P.push(game.B([hx, hy, 0], [hs, hs, hs * 0.85], o.hcol || o.col, 'head', hd));
    P.push(
      game.B(
        [hx + hs / 2 + L * 0.1, hy - hs * 0.1, 0],
        [L * 0.25, L * 0.13, L * 0.16],
        '#f2a31b',
        'acc',
        Object.assign({ beak: true }, hd),
      ),
    );
    P.push(
      game.B(
        [hx + hs * 0.25, hy - hs * 0.5, 0],
        [L * 0.08, L * 0.2, L * 0.12],
        '#d8262b',
        'acc',
        hd,
      ),
    );
    P.push(
      game.B([hx, hy + hs / 2 + L * 0.1, 0], [hs * 0.5, L * 0.22, L * 0.1], '#d8262b', 'acc', hd),
    );
    const es = Math.max(0.04, L * 0.08);
    [1, -1].forEach((s) =>
      P.push(
        game.B(
          [hx + hs / 2 - 0.01, hy + hs * 0.12, s * hs * 0.28],
          [0.04, es, es],
          '#111111',
          'eye',
          hd,
        ),
      ),
    );
    [1, -1].forEach((s) => {
      const z = s * (L * 0.4 + 0.04);
      P.push(
        game.B([-L * 0.05, yb, z], [L * 0.55, L * 0.5, 0.07], o.wing || o.col, 'limb', {
          an: 'wing',
          pv: [-L * 0.05, yb + L * 0.25, z],
          sg: s,
        }),
      );
      P.push(
        game.B([0, lg / 2, s * L * 0.2], [L * 0.1, lg, L * 0.1], '#f2a31b', 'limb', {
          an: 'leg',
          pv: [0, lg, s * L * 0.2],
          ph: s > 0 ? 0 : Math.PI,
        }),
      );
    });
    const n = o.tailN || 1;
    for (let i = 0; i < n; i++) {
      P.push(
        game.B(
          [-L / 2 - L * 0.12 - i * L * 0.08, yb + L * 0.25 + i * L * 0.18, 0],
          [L * 0.2, L * 0.5, L * 0.1],
          o.tailc[i % o.tailc.length],
          'tail',
          { an: 'tail', pv: [-L / 2, yb, 0] },
        ),
      );
    }
    P.head = { x: hx, y: hy + hs / 2, s: hs, hd };
    P.size = L;
    return P;
  };
  game.gorilla = function gorilla() {
    const P = [],
      lg = 0.55,
      dk = '#2c2c33';
    P.push(game.B([0, lg + 0.55, 0], [0.8, 1.1, 0.95], dk, 'body'));
    P.push(game.B([0.41, lg + 0.7, 0], [0.04, 0.6, 0.7], '#4a4a55', 'body'));
    [1, -1].forEach((s, i) => {
      const z = s * 0.24;
      P.push(
        game.B([0, lg / 2, z], [0.34, lg, 0.34], '#24242a', 'limb', {
          an: 'leg',
          pv: [0, lg, z],
          ph: i ? Math.PI : 0,
        }),
      );
      const az = s * 0.68,
        pv = [0.05, lg + 1.3, az],
        ph = i ? 0 : Math.PI;
      P.push(game.B([0.05, lg + 0.7, az], [0.3, 1.15, 0.3], dk, 'limb', { an: 'arm', pv, ph }));
      P.push(
        game.B([0.05, lg + 0.12, az], [0.38, 0.3, 0.38], '#1d1d22', 'limb', { an: 'arm', pv, ph }),
      );
    });
    const hd = { an: 'head', pv: [0.2, lg + 1.2, 0] };
    P.push(game.B([0.3, lg + 1.45, 0], [0.5, 0.5, 0.5], dk, 'head', hd));
    P.push(game.B([0.56, lg + 1.4, 0], [0.05, 0.3, 0.34], '#6b5a4a', 'acc', hd));
    P.push(game.B([0.52, lg + 1.62, 0], [0.1, 0.1, 0.5], '#1d1d22', 'acc', hd));
    [1, -1].forEach((s) =>
      P.push(game.B([0.56, lg + 1.5, s * 0.12], [0.04, 0.06, 0.06], '#ffffff', 'eye', hd)),
    );
    P.head = { x: 0.3, y: lg + 1.72, s: 0.5, hd };
    P.size = 1.15;
    return P;
  };
  game.skinAcc = function skinAcc(id, base, parts) {
    const h = base.head,
      hd = h.hd,
      hs = h.s,
      L = base.size,
      yb = base[0].c[1],
      T = h.y;
    const hb = (c, s, col, role, x) =>
      parts.push(game.B(c, s, col, role, Object.assign({}, hd, x || {})));
    if (id === 'cap') {
      hb([h.x - 0.01, T + 0.035, 0], [hs * 1.08, 0.08, hs * 0.92], '#d8262b', 'acc');
      hb([h.x + hs * 0.62, T - 0.005, 0], [hs * 0.45, 0.03, hs * 0.75], '#9e1a1f', 'acc');
      hb([h.x - 0.01, T + 0.095, 0], [0.05, 0.03, 0.05], '#ffffff', 'acc');
    } else if (id === 'pirate') {
      hb([h.x, T - 0.03, 0], [hs * 1.1, 0.06, hs * 0.96], '#c42b2b', 'acc');
      hb([h.x - hs * 0.62, T - 0.05, 0], [0.1, 0.05, 0.05], '#c42b2b', 'acc');
      hb([h.x + hs * 0.1, T - 0.03, hs * 0.49], [0.04, 0.035, 0.02], '#ffffff', 'acc');
      hb([h.x + hs / 2 + 0.005, T - hs * 0.38, hs * 0.28], [0.035, 0.08, 0.08], '#111111', 'eye');
    } else if (id === 'ninja') {
      hb([h.x, T - 0.045, 0], [hs * 1.1, 0.055, hs * 0.96], '#d8262b', 'acc');
      hb([h.x - hs * 0.62, T - 0.05, 0], [0.13, 0.03, 0.05], '#d8262b', 'acc');
      hb([h.x - hs * 0.74, T - 0.09, 0.03], [0.1, 0.03, 0.04], '#d8262b', 'acc');
      hb([h.x + hs / 2 + 0.004, T - 0.045, 0], [0.02, 0.05, hs * 0.9], '#c9ced6', 'acc');
    } else if (id === 'royal') {
      hb([h.x, T + 0.03, 0], [hs * 1.02, 0.06, hs * 0.9], '#ffd700', 'acc', { glow: true });
      [-0.3, 0, 0.3].forEach((z) =>
        hb([h.x, T + 0.085, z * hs], [0.045, 0.07, 0.045], '#ffd700', 'acc', { glow: true }),
      );
      hb([h.x + hs * 0.5, T + 0.035, 0], [0.02, 0.035, 0.035], '#ff3a5a', 'acc', { glow: true });
      parts.push(game.B([-L * 0.5 - 0.03, yb, 0], [0.04, L * 0.85, L * 0.8], '#7b2fbf', 'body'));
      parts.push(
        game.B([-L * 0.5 - 0.05, yb + L * 0.4, 0], [0.04, 0.05, L * 0.82], '#fff0a0', 'body'),
      );
    } else if (id === 'fire') {
      hb([h.x - 0.02, T + 0.09, 0], [0.08, 0.13, 0.08], '#ff3d1a', 'acc', { glow: true });
      hb([h.x - 0.02, T + 0.17, 0.02], [0.05, 0.09, 0.05], '#ffb81a', 'acc', { glow: true });
      hb([h.x - 0.04, T + 0.22, -0.01], [0.03, 0.06, 0.03], '#fff3a0', 'acc', { glow: true });
      parts.push(
        game.B([-L / 2 - 0.1, yb + 0.2, 0], [0.1, 0.2, 0.1], '#ffd23a', 'tail', {
          an: 'tail',
          pv: [-L / 2, yb, 0],
          glow: true,
        }),
      );
    } else if (id === 'galaxy') {
      const cl = ['#ffffff', '#8fe9ff', '#ffd0ff', '#fff3a0'];
      [
        [0.1, 0.1],
        [-0.12, 0.06],
        [0.0, -0.12],
        [-0.05, 0.14],
        [0.16, -0.08],
      ].forEach((a, i) =>
        parts.push(
          game.B([a[0], yb + L * 0.43 + 0.006, a[1]], [0.045, 0.012, 0.045], cl[i % 4], 'acc', {
            glow: true,
          }),
        ),
      );
      [
        [0.12, 0.12],
        [-0.1, -0.05],
        [0.02, 0.0],
        [-0.15, 0.09],
      ].forEach((a, i) =>
        [1, -1].forEach((sg) =>
          parts.push(
            game.B(
              [a[0], yb + a[1], sg * (L * 0.4 + 0.006)],
              [0.045, 0.045, 0.012],
              cl[(i + (sg > 0 ? 1 : 3)) % 4],
              'acc',
              { glow: true },
            ),
          ),
        ),
      );
      hb([h.x + hs * 0.05, T + 0.006, 0.0], [0.05, 0.012, 0.05], '#ffffff', 'acc', { glow: true });
    } else if (id === 'legend') {
      hb([h.x, T + 0.04, 0], [hs * 1.1, 0.07, hs * 0.96], '#ffd700', 'acc', { glow: true });
      [-0.35, -0.12, 0.12, 0.35].forEach((z, i) =>
        hb(
          [h.x, T + 0.1 + (i === 1 || i === 2 ? 0.02 : 0), z * hs],
          [0.045, 0.09, 0.045],
          '#fff3a0',
          'acc',
          { glow: true },
        ),
      );
      hb([h.x + hs * 0.55, T + 0.04, 0], [0.02, 0.04, 0.04], '#ff3a5a', 'acc', { glow: true });
      hb([h.x, T + 0.27, 0], [hs * 1.25, 0.025, hs * 1.25], '#fff3a0', 'acc', { glow: true });
    }
  };
  game.getModel = function getModel(k, tier, gold, skin, spec) {
    const sk =
      k === 'chicken' && skin && skin !== 'classic' ? game.SKINS.find((x) => x.id === skin) : null;
    const sp = k === 'chicken' && spec ? spec : null,
      id = k + tier + (gold ? 'G' : '') + (sk ? sk.id : '') + (sp ? 'S' + sp : '');
    if (game.mcache[id]) {
      return game.mcache[id];
    }
    const base = game.SP[k].mk(),
      pal = game.TP[tier];
    const parts = base.map((p) => {
      const q = Object.assign({}, p);
      q.col = pal ? game.C(pal[p.role] || pal.body) : p.col;
      if (gold && p.beak) {
        q.col = game.C('#ffd700');
        q.glow = true;
      }
      return q;
    });
    if (sk && tier === 0 && sk.pal) {
      const pl = sk.pal;
      parts.forEach((q) => {
        let c = null,
          key = null;
        if (q.an === 'wing') {
          c = pl.wing;
          key = 'wing';
        } else if (q.role === 'body') {
          c = pl.body;
          key = 'body';
        } else if (q.role === 'head' && !q.beak) {
          c = pl.head;
          key = 'head';
        } else if (q.role === 'tail') {
          c = pl.tail;
          key = 'tail';
        }
        if (c) {
          q.col = game.C(c);
          if (pl.glow && pl.glow.indexOf(key) >= 0) {
            q.glow = true;
          }
        }
      });
    }
    if (sk) {
      game.skinAcc(sk.id, base, parts);
    }
    if (sp) {
      game.specAcc(sp, base, parts);
    }
    if (tier > 0) {
      const h = base.head,
        hd = h.hd;
      parts.push(
        game.B(
          [h.x - h.s * 0.1, h.y + 0.12, 0],
          [0.05, 0.24, 0.05],
          tier > 1 ? '#a8780c' : '#5f687c',
          'limb',
          hd,
        ),
      );
      parts.push(
        game.B(
          [h.x - h.s * 0.1, h.y + 0.3, 0],
          [0.11, 0.11, 0.11],
          tier > 1 ? '#ff4f2e' : '#2ec8ff',
          'eye',
          hd,
        ),
      );
      if (tier > 1) {
        parts.push(
          game.B(
            [h.x - h.s * 0.05, h.y + 0.04, 0],
            [h.s * 0.85, 0.1, h.s * 0.85],
            '#fff0a0',
            'eye',
            hd,
          ),
        );
      }
    }
    let top = 0,
      hw = 0;
    parts.forEach((p) => {
      top = Math.max(top, p.c[1] + p.s[1] / 2);
      hw = Math.max(hw, Math.abs(p.c[2]) + p.s[2] / 2);
    });
    return (game.mcache[id] = {
      parts,
      size: base.size,
      top,
      hw,
      rbw: !!(sk && sk.rbw && tier === 0),
    });
  };
  game.HPM = game.catalog.balance.healthMultiplier;
  game.SP = Object.fromEntries(
    Object.entries(game.catalog.species).map(([id, spec]) => [
      id,
      { ...spec, e: icon(spec.icon), mk: () => game[spec.model.kind](spec.model.options) },
    ]),
  );
  game.TP = game.catalog.tierPalettes;
  game.SKINS = structuredClone(game.catalog.skins);
  game.mcache = {};
}
