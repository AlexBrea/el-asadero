import { icon } from './metadata.js';
/** @module features/icons */

/**
 * Install icons capabilities into one isolated game session.
 * Cross-feature dependencies are explicit properties; no globals or inline scripts are required.
 * @param {object} game Mutable session and service registry, owned by the application root.
 * @returns {void}
 */
export function installIcons(game) {
  game.boundsOf = function boundsOf(ps) {
    let top = 0,
      w = 0;
    ps.forEach((p) => {
      top = Math.max(top, p.c[1] + p.s[1] / 2);
      w = Math.max(w, Math.abs(p.c[0]) + p.s[0] / 2, Math.abs(p.c[2]) + p.s[2] / 2);
    });
    return { parts: ps, top: Math.max(0.3, top), size: Math.max(0.3, w * 2) };
  };
  game.objSpec = function objSpec(id) {
    if (id === 'robot') {
      return [Object.assign({}, game.boundsOf(game.getModel('chicken', 1).parts), { robot: true })];
    }
    if (id === 'titan') {
      return [Object.assign({}, game.boundsOf(game.getModel('chicken', 2).parts), { robot: true })];
    }
    if (!game.ocache[id]) {
      game.ocache[id] = game.boundsOf(game.OBJ[id]());
    }
    return [game.ocache[id]];
  };
  game.skinSpec = function skinSpec(id) {
    const mo = game.getModel('chicken', 0, false, id);
    return [Object.assign({}, game.boundsOf(mo.parts), { robot: false, rbw: mo.rbw })];
  };
  game.memberSpec = function memberSpec(m) {
    const mo = game.getModel(
      m.k,
      m.t,
      m.l.gold > 0,
      m.hero ? m.skin : null,
      m.hero ? m.spec : null,
    );
    return [Object.assign({}, game.boundsOf(mo.parts), { robot: m.t > 0, rbw: mo.rbw })];
  };
  game.renderIcons = function renderIcons() {
    if (!game.icons.length) {
      return;
    }
    const sv = [
        game.W,
        game.H,
        game.F,
        game.CX,
        game.CYc,
        game.CZ,
        game.cyw,
        game.syw,
        game.cpt,
        game.spt,
        game.YF,
      ],
      dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const ic of game.icons) {
      const cv2 = ic.cv;
      if (!cv2 || !cv2.isConnected) {
        continue;
      }
      const w = cv2.clientWidth || 150,
        h = cv2.clientHeight || 90;
      if (cv2.width !== Math.round(w * dpr) || cv2.height !== Math.round(h * dpr)) {
        cv2.width = Math.round(w * dpr);
        cv2.height = Math.round(h * dpr);
      }
      const c = cv2.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, h);
      game.YF = 0.42;
      game.W = w;
      game.H = h;
      game.F = h * 2.4;
      game.CX = 0;
      game.CYc = 1.65;
      game.CZ = 3.5;
      game.cyw = 1;
      game.syw = 0;
      const pit = Math.atan(1.1 / 3.5);
      game.cpt = Math.cos(pit);
      game.spt = Math.sin(pit);
      const ents = ic.spec();
      let mx = 0,
        sz = 0;
      ents.forEach((e) => {
        mx = Math.max(mx, e.top);
        sz = Math.max(sz, e.size);
      });
      const fit = Math.min(1.05 / mx, 1.5 / sz);
      const faces = [];
      ents.forEach((e, i) => {
        const x = 0,
          z = 0,
          yaw = ic.yaw ? ic.yaw() : game.TT * 1.1 + i * 0.7;
        game.entFaces(
          {
            model: e.parts,
            x,
            z,
            y: 0,
            yaw,
            sc: fit,
            robot: e.robot,
            rbw: e.rbw,
            gait: game.TT * 2,
            wk: 0,
            state: 'idle',
            seed: i,
            hw: 0.3,
          },
          faces,
        );
        const p = game.proj(x, 0, z);
        if (p) {
          c.fillStyle = 'rgba(0,0,0,.35)';
          c.beginPath();
          c.ellipse(
            p[0],
            p[1],
            (e.size * fit * 0.55 * game.F) / p[2],
            (e.size * fit * 0.2 * game.F) / p[2],
            0,
            0,
            7,
          );
          c.fill();
        }
      });
      game.drawFaces(c, faces);
    }
    [
      game.W,
      game.H,
      game.F,
      game.CX,
      game.CYc,
      game.CZ,
      game.cyw,
      game.syw,
      game.cpt,
      game.spt,
      game.YF,
    ] = sv;
  };
  game.drawFaces = function drawFaces(c, faces) {
    faces.sort((a, b) => b.d - a.d);
    c.lineJoin = 'round';
    c.lineWidth = 1;
    for (const f of faces) {
      const p = f.p;
      c.globalAlpha = f.a;
      c.fillStyle = f.c;
      c.beginPath();
      c.moveTo(p[0], p[1]);
      c.lineTo(p[2], p[3]);
      c.lineTo(p[4], p[5]);
      c.lineTo(p[6], p[7]);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(15,8,32,.35)';
      c.stroke();
    }
    c.globalAlpha = 1;
  };
  game.icons = [];
  game.ocache = {};
  game.G = (c, s, col) => game.B(c, s, col, 'acc', { glow: true });
  game.sh = (arr, dx, dy, dz) =>
    arr.map((p) =>
      Object.assign({}, p, {
        c: [p.c[0] + dx, p.c[1] + dy, p.c[2] + (dz || 0)],
        pv: p.pv ? [p.pv[0] + dx, p.pv[1] + dy, p.pv[2] + (dz || 0)] : undefined,
      }),
    );
  game.OBJ = {
    gold: () => [
      game.G([0, 0.58, 0], [0.95, 0.22, 0.5], '#ffd700'),
      game.G([0.08, 0.33, 0], [0.75, 0.2, 0.45], '#e6b800'),
      game.B([-0.38, 0.46, 0], [0.2, 0.5, 0.42], '#c99a00', 'acc'),
      game.G([0.55, 1.0, 0.3], [0.13, 0.13, 0.13], '#fff3a0'),
      game.G([-0.4, 1.05, -0.25], [0.1, 0.1, 0.1], '#fff3a0'),
      game.G([0.1, 1.1, 0], [0.08, 0.08, 0.08], '#ffffff'),
    ],
    laser: () =>
      game.sh(
        [
          game.B([0, 0.45, 0], [0.7, 0.32, 0.3], '#7d869a', 'body'),
          game.B([0.55, 0.5, 0], [0.5, 0.14, 0.14], '#454b5c', 'body'),
          game.G([0.85, 0.5, 0], [0.14, 0.22, 0.22], '#ff3aa0'),
          game.G([1.1, 0.5, 0], [0.35, 0.06, 0.06], '#ff9ae0'),
          game.B([-0.15, 0.15, 0], [0.2, 0.4, 0.22], '#454b5c', 'body'),
          game.B([0.05, 0.7, 0], [0.2, 0.1, 0.2], '#a7b0c4', 'body'),
        ],
        -0.45,
        0,
        0,
      ),
    egg: () => [
      game.B([0, 0.25, 0], [0.55, 0.25, 0.55], '#f6ecd2', 'body'),
      game.B([0, 0.5, 0], [0.72, 0.3, 0.72], '#f6ecd2', 'body'),
      game.B([0, 0.78, 0], [0.58, 0.28, 0.58], '#f6ecd2', 'body'),
      game.B([0, 0.98, 0], [0.32, 0.14, 0.32], '#f6ecd2', 'body'),
      game.B([0, 0.5, 0], [0.76, 0.1, 0.76], '#d8262b', 'acc'),
      game.B([0.04, 1.15, 0], [0.07, 0.2, 0.07], '#3b3b3b', 'body'),
      game.G([0.04, 1.3, 0], [0.16, 0.16, 0.16], '#ff8a1a'),
    ],
    storm: () => [
      game.B([0, 0.2, 0], [0.9, 0.1, 0.3], '#b7a8f0', 'acc'),
      game.B([-0.4, 0.6, 0], [0.22, 0.8, 0.06], '#d9ceff', 'body'),
      game.B([0, 0.7, 0], [0.24, 1.0, 0.06], '#ffffff', 'body'),
      game.B([0.4, 0.6, 0], [0.22, 0.8, 0.06], '#d9ceff', 'body'),
      game.B([-0.4, 0.6, 0], [0.05, 0.9, 0.1], '#8f7fe0', 'acc'),
      game.B([0, 0.7, 0], [0.05, 1.1, 0.1], '#8f7fe0', 'acc'),
      game.B([0.4, 0.6, 0], [0.05, 0.9, 0.1], '#8f7fe0', 'acc'),
    ],
    fire: () => [
      game.G([0, 0.2, 0], [0.7, 0.35, 0.7], '#ff3d1a'),
      game.G([0, 0.5, 0], [0.52, 0.4, 0.52], '#ff8a1a'),
      game.G([0, 0.84, 0], [0.34, 0.36, 0.34], '#ffd23a'),
      game.G([0, 1.1, 0], [0.16, 0.2, 0.16], '#fff3a0'),
      game.G([0.3, 0.45, 0.3], [0.18, 0.3, 0.18], '#ff8a1a'),
      game.G([-0.3, 0.4, -0.3], [0.18, 0.26, 0.18], '#ff5a1a'),
    ],
    vamp: () => [
      game.B([0, 0.55, 0], [1.0, 0.16, 0.4], '#b3122a', 'body'),
      game.B([-0.28, 0.3, 0], [0.16, 0.45, 0.16], '#ffffff', 'body'),
      game.B([0.28, 0.3, 0], [0.16, 0.45, 0.16], '#ffffff', 'body'),
      game.G([0.28, -0.05, 0], [0.1, 0.14, 0.1], '#ff2a4a'),
      game.B([0, 0.72, 0], [0.8, 0.1, 0.3], '#7a0c1c', 'body'),
    ],
    armor: () => [
      game.B([0, 0.6, 0], [0.85, 0.95, 0.14], '#8d98b3', 'body'),
      game.B([0, 0.2, 0], [0.5, 0.3, 0.14], '#8d98b3', 'body'),
      game.B([0, 0.6, 0.1], [0.16, 0.7, 0.1], '#ffd24a', 'acc'),
      game.B([0, 0.65, 0.1], [0.55, 0.14, 0.1], '#ffd24a', 'acc'),
      game.B([0, 1.1, 0], [0.95, 0.1, 0.18], '#5f687c', 'body'),
    ],
    speed: () => [
      game.G([0.15, 1.0, 0], [0.4, 0.3, 0.14], '#ffe14d'),
      game.G([0, 0.75, 0], [0.4, 0.3, 0.14], '#ffd21a'),
      game.G([-0.12, 0.5, 0], [0.4, 0.3, 0.14], '#ffe14d'),
      game.G([0.05, 0.25, 0], [0.22, 0.3, 0.14], '#ffb81a'),
    ],
    power: () => [
      game.B([0, 0.5, 0], [1.1, 0.12, 0.12], '#9aa3b5', 'body'),
      game.B([-0.38, 0.5, 0], [0.18, 0.7, 0.7], '#c43b3b', 'body'),
      game.B([0.38, 0.5, 0], [0.18, 0.7, 0.7], '#c43b3b', 'body'),
      game.B([-0.55, 0.5, 0], [0.14, 0.5, 0.5], '#8f2a2a', 'body'),
      game.B([0.55, 0.5, 0], [0.14, 0.5, 0.5], '#8f2a2a', 'body'),
    ],
    vit: () => [
      game.B([-0.22, 0.85, 0], [0.38, 0.38, 0.28], '#ff3a5a', 'body'),
      game.B([0.22, 0.85, 0], [0.38, 0.38, 0.28], '#ff3a5a', 'body'),
      game.B([0, 0.55, 0], [0.85, 0.38, 0.28], '#ff3a5a', 'body'),
      game.B([0, 0.28, 0], [0.5, 0.25, 0.28], '#e02548', 'body'),
      game.B([0, 0.08, 0], [0.2, 0.2, 0.28], '#c8183a', 'body'),
      game.G([-0.25, 0.9, 0.15], [0.12, 0.12, 0.06], '#ffd0d8'),
    ],
    flock: () =>
      game.sh(game.SP.chick.mk(), -0.35, 0, 0.0).concat(game.sh(game.SP.chick.mk(), 0.4, 0, 0.1)),
    phoenix: () =>
      game
        .bird({
          L: 0.7,
          leg: 0.25,
          col: '#ff7a1a',
          hcol: '#ff9a2a',
          breast: '#ffb81a',
          wing: '#ffcf3a',
          tailc: ['#ff3d1a', '#ffb81a', '#ffe36a'],
          tailN: 3,
        })
        .concat([game.G([0, 1.5, 0], [0.2, 0.2, 0.2], '#ffe36a')]),
  };
  (function () {
    const base = game.drawCoin;
    function henShape(c, ox, oy, r) {
      c.beginPath();
      c.ellipse(ox - r * 0.05, oy + r * 0.12, r * 0.42, r * 0.32, -0.12, 0, 7); /* cuerpo */
      c.moveTo(ox + r * 0.42, oy - r * 0.38);
      c.arc(ox + r * 0.3, oy - r * 0.38, r * 0.17, 0, 7); /* cabeza */
      c.moveTo(ox + r * 0.3, oy - r * 0.22);
      c.lineTo(ox + r * 0.18, oy + r * 0.02);
      c.lineTo(ox + r * 0.1, oy - r * 0.12);
      c.closePath(); /* cuello */
      c.moveTo(ox - r * 0.38, oy + r * 0.02);
      c.lineTo(ox - r * 0.66, oy - r * 0.3);
      c.lineTo(ox - r * 0.55, oy + r * 0.12);
      c.lineTo(ox - r * 0.68, oy + r * 0.1);
      c.lineTo(ox - r * 0.42, oy + r * 0.3);
      c.closePath(); /* cola */
      c.moveTo(ox + r * 0.24, oy - r * 0.55);
      c.lineTo(ox + r * 0.3, oy - r * 0.42);
      c.lineTo(ox + r * 0.36, oy - r * 0.56);
      c.lineTo(ox + r * 0.4, oy - r * 0.4);
      c.lineTo(ox + r * 0.2, oy - r * 0.4);
      c.closePath(); /* cresta */
      c.moveTo(ox + r * 0.46, oy - r * 0.4);
      c.lineTo(ox + r * 0.64, oy - r * 0.33);
      c.lineTo(ox + r * 0.46, oy - r * 0.28);
      c.closePath(); /* pico */
      c.fill();
      c.fillRect(ox - r * 0.1, oy + r * 0.38, r * 0.07, r * 0.28);
      c.fillRect(ox + r * 0.06, oy + r * 0.38, r * 0.07, r * 0.28); /* patas */
    }
    game.drawCoin = function (cv) {
      base(cv);
      const w = cv.clientWidth || 24,
        h = cv.clientHeight || 24,
        c = cv.getContext('2d');
      const dpr = cv.width / w,
        a = game.TT * 2.4 + cv._p,
        cs = Math.cos(a),
        sn = Math.sin(a);
      const r = Math.min(w, h) * 0.45,
        th = r * 0.3,
        cx = w / 2,
        cy = h / 2,
        sg = cs >= 0 ? 1 : -1;
      const rx = Math.max(r * Math.abs(cs), r * 0.05),
        nx = cx + (sg * sn * th) / 2;
      if (rx < r * 0.18 || r < 6) {
        return;
      }
      c.save();
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.translate(nx, cy);
      c.scale(rx / r, 1);
      c.beginPath();
      c.arc(0, 0, r * 0.7, 0, 7);
      c.clip(); /* dentro del aro */
      const o = Math.max(0.6, r * 0.05);
      c.fillStyle = 'rgba(255,248,190,.85)';
      henShape(c, o, o, r * 0.95); /* brillo del relieve */
      c.fillStyle = '#9a5f00';
      henShape(c, 0, 0, r * 0.95); /* gallina grabada */
      c.fillStyle = '#fff3a0';
      c.beginPath();
      c.arc(r * 0.95 * 0.34, -r * 0.95 * 0.4, r * 0.045, 0, 7);
      c.fill(); /* ojo */
      c.restore();
    };
  })();
  (function () {
    const baseMk = game.mkUnit;
    game.mkUnit = function (side, e) {
      const u = baseMk(side, e);
      if (!e || !e.l || u.dead) {
        return u;
      }
      const v = e.l.vit || 0,
        gr = 1 + Math.min(0.9, 0.06 * v); /* hasta +90% de tamaño */
      if (gr > 1) {
        u.sc *= gr;
        u.size *= gr;
        u.top *= gr;
      }
      if (v > 0 && Array.isArray(u.model)) {
        /* más esponjosa: cuerpo más ancho */
        const fl = 1 + Math.min(0.5, 0.05 * v);
        u.model = u.model.map((p) =>
          p.role === 'body' ? Object.assign({}, p, { s: [p.s[0], p.s[1], p.s[2] * fl] }) : p,
        );
      }
      const g = e.l.gold || 0;
      if (g > 0 && Array.isArray(u.model)) {
        /* pico dorado más largo y grueso */
        const f = 1 + 0.3 * g;
        u.model = u.model.map((p) => {
          if (!p.beak) {
            return p;
          }
          const s = [p.s[0] * f, p.s[1] * (1 + 0.14 * g), p.s[2] * (1 + 0.14 * g)];
          return Object.assign({}, p, {
            s,
            c: [p.c[0] + (s[0] - p.s[0]) / 2, p.c[1] - (s[1] - p.s[1]) * 0.1, p.c[2]],
          });
        });
      }
      return u;
    };
  })();
  (function () {
    const strip = (t) => String(t).replace(/👹\s?/g, '');
    const rh = game.rosterHTML,
      bn = game.banner;
    game.rosterHTML = function () {
      return strip(rh.apply(this, arguments));
    };
    game.banner = function (t, c) {
      return bn.call(this, strip(t), c);
    };
  })();
}
