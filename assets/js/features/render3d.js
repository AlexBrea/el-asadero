/** @module features/render3d */

/**
 * Install render3d capabilities into one isolated game session.
 * Cross-feature dependencies are explicit properties; no globals or inline scripts are required.
 * @param {object} game Mutable session and service registry, owned by the application root.
 * @returns {void}
 */
export function installRender3d(game) {
  game.atkCurve = function atkCurve(a) {
    // 0..0.6 -> [pitch,lunge,head,arm]
    if (a < 0.25) {
      const k = a / 0.25;
      return [0.3 * k, -0.15 * k, 0.45 * k, 2.6 * k];
    }
    if (a < 0.4) {
      const k = (a - 0.25) / 0.15;
      return [0.3 - 0.55 * k, -0.15 + 0.75 * k, 0.45 - 1.25 * k, 2.6 - 2.4 * k];
    }
    const k = Math.min(1, (a - 0.4) / 0.2);
    return [-0.25 * (1 - k), 0.6 * (1 - k), -0.8 * (1 - k), 0.2 * (1 - k)];
  };
  game.partRot = function partRot(p, e) {
    switch (p.an) {
      case 'leg':
        return [2, Math.sin(e.gait * 8 + p.ph) * 0.75 * e.wk];
      case 'arm':
        if (e.state === 'attack') {
          return [2, game.atkCurve(e.atkT)[3]];
        }
        if (e.win) {
          return [2, 2.4 + Math.sin(game.TT * 10 + (p.ph || 0)) * 0.4];
        }
        return [
          2,
          Math.sin(e.gait * 8 + p.ph) * 0.6 * e.wk + Math.sin(game.TT * 2 + e.seed) * 0.04,
        ];
      case 'head':
        if (e.state === 'attack') {
          return [2, game.atkCurve(e.atkT)[2]];
        }
        return [2, Math.sin(game.TT * 2 + e.seed) * 0.05 + Math.sin(e.gait * 8) * 0.1 * e.wk];
      case 'tail':
        return [1, Math.sin(game.TT * (4 + e.wk * 6) + e.seed) * 0.45];
      case 'wing': {
        let fl = 0.08;
        if (e.state === 'walk') {
          fl += 0.6 * Math.abs(Math.sin(e.gait * 14));
        }
        if (e.state === 'attack') {
          fl += 0.9 * Math.abs(Math.sin(e.atkT * 18));
        }
        if (e.win) {
          fl += 0.9 * Math.abs(Math.sin(game.TT * 16));
        }
        return [0, -p.sg * fl];
      }
    }
    return [0, 0];
  };
  game.rb = function rb(h) {
    h = (((h % 360) + 360) % 360) / 60;
    const x = 1 - Math.abs((h % 2) - 1),
      i = h | 0,
      R = [1, x, 0, 0, x, 1],
      G = [x, 1, 1, x, 0, 0],
      Bl = [0, 0, x, 1, 1, x];
    return [(40 + 215 * R[i]) | 0, (40 + 215 * G[i]) | 0, (40 + 215 * Bl[i]) | 0];
  };
  game.entFaces = function entFaces(e, out) {
    const al = e.alpha === undefined ? 1 : e.alpha;
    if (al <= 0.01) {
      return;
    }
    const sc = e.sc || 1,
      yaw = e.yaw || 0,
      cw = Math.cos(yaw),
      sw = Math.sin(yaw);
    const pit = e.pitch || 0,
      cp = Math.cos(pit),
      sp = Math.sin(pit);
    const rl = e.roll || 0,
      cr = Math.cos(rl),
      sr = Math.sin(rl),
      lift = rl ? (e.hw || 0.3) * Math.abs(sr) * sc : 0;
    const lun = e.lunge || 0,
      ox = e.x + Math.cos(yaw) * lun,
      oz = e.z - Math.sin(yaw) * lun,
      oy = (e.y || 0) + lift;
    const fl = e.flash > 0 ? Math.min(1, e.flash / 0.18) * 0.75 : 0,
      py0 = 0.45 * sc;
    const rob = e.robot,
      rbw = e.rbw;
    let pi = 0;
    for (const p of e.model) {
      pi++;
      let ax = 0,
        ang = 0;
      if (p.an) {
        const r = game.partRot(p, e);
        ax = r[0];
        ang = r[1];
      }
      const ca = Math.cos(ang),
        sa = Math.sin(ang),
        hx = p.s[0] / 2,
        hy = p.s[1] / 2,
        hz = p.s[2] / 2;
      for (let i = 0; i < 8; i++) {
        let x = p.c[0] + (i & 1 ? hx : -hx),
          y = p.c[1] + (i & 2 ? hy : -hy),
          z = p.c[2] + (i & 4 ? hz : -hz);
        if (ang) {
          const pv = p.pv;
          x -= pv[0];
          y -= pv[1];
          z -= pv[2];
          if (ax === 2) {
            const nx = x * ca - y * sa,
              ny = x * sa + y * ca;
            x = nx;
            y = ny;
          } else if (ax === 1) {
            const nx = x * ca + z * sa,
              nz = -x * sa + z * ca;
            x = nx;
            z = nz;
          } else {
            const ny = y * ca - z * sa,
              nz = y * sa + z * ca;
            y = ny;
            z = nz;
          }
          x += pv[0];
          y += pv[1];
          z += pv[2];
        }
        x *= sc;
        y *= sc;
        z *= sc;
        if (pit) {
          y -= py0;
          const nx = x * cp - y * sp,
            ny = x * sp + y * cp;
          x = nx;
          y = ny + py0;
        }
        if (rl) {
          const ny = y * cr - z * sr,
            nz = y * sr + z * cr;
          y = ny;
          z = nz;
        }
        const wx = ox + x * cw + z * sw,
          wz = oz - x * sw + z * cw,
          wy = oy + y;
        game.V[i * 3] = wx;
        game.V[i * 3 + 1] = wy;
        game.V[i * 3 + 2] = wz;
        const rx = wx - game.CX,
          ry = wy - game.CYc,
          rz = wz - game.CZ,
          x1 = rx * game.cyw - rz * game.syw,
          z1 = rx * game.syw + rz * game.cyw,
          y2 = ry * game.cpt - z1 * game.spt,
          z2 = ry * game.spt + z1 * game.cpt,
          d = -z2;
        if (d > 0.3) {
          game.SD[i] = d;
          game.SX[i] = game.W / 2 + (x1 / d) * game.F;
          game.SY[i] = game.H * game.YF - (y2 / d) * game.F;
        } else {
          game.SD[i] = -1;
        }
      }
      let bx = 0,
        by = 0,
        bz = 0;
      for (let i = 0; i < 8; i++) {
        bx += game.V[i * 3];
        by += game.V[i * 3 + 1];
        bz += game.V[i * 3 + 2];
      }
      bx /= 8;
      by /= 8;
      bz /= 8;
      const col =
          rbw && p.role !== 'eye' && p.role !== 'acc' && p.an !== 'leg'
            ? game.rb(game.TT * 80 + pi * 14)
            : p.col,
        glow = p.glow || (rob && p.role === 'eye');
      for (let f = 0; f < 6; f++) {
        const q = game.FA[f],
          i0 = q[0],
          i1 = q[1],
          i2 = q[2],
          i3 = q[3];
        if (game.SD[i0] < 0 || game.SD[i1] < 0 || game.SD[i2] < 0 || game.SD[i3] < 0) {
          continue;
        }
        const ax_ = game.V[i1 * 3] - game.V[i0 * 3],
          ay_ = game.V[i1 * 3 + 1] - game.V[i0 * 3 + 1],
          az_ = game.V[i1 * 3 + 2] - game.V[i0 * 3 + 2];
        const bx_ = game.V[i3 * 3] - game.V[i0 * 3],
          by_ = game.V[i3 * 3 + 1] - game.V[i0 * 3 + 1],
          bz_ = game.V[i3 * 3 + 2] - game.V[i0 * 3 + 2];
        let nx = ay_ * bz_ - az_ * by_,
          ny = az_ * bx_ - ax_ * bz_,
          nz = ax_ * by_ - ay_ * bx_;
        const fx = (game.V[i0 * 3] + game.V[i2 * 3]) / 2,
          fy = (game.V[i0 * 3 + 1] + game.V[i2 * 3 + 1]) / 2,
          fz = (game.V[i0 * 3 + 2] + game.V[i2 * 3 + 2]) / 2;
        if (nx * (fx - bx) + ny * (fy - by) + nz * (fz - bz) < 0) {
          nx = -nx;
          ny = -ny;
          nz = -nz;
        }
        if (nx * (fx - game.CX) + ny * (fy - game.CYc) + nz * (fz - game.CZ) >= 0) {
          continue;
        }
        const nl = Math.hypot(nx, ny, nz) || 1;
        const sh = glow
          ? 1.15
          : 0.42 +
            0.62 * Math.max(0, (nx * game.LX + ny * game.LY + nz * game.LZ) / (nl * game.LN));
        let r = col[0] * sh,
          g = col[1] * sh,
          b = col[2] * sh;
        if (fl) {
          r += (255 - r) * fl;
          g += (255 - g) * fl;
          b += (255 - b) * fl;
        }
        out.push({
          d: (game.SD[i0] + game.SD[i1] + game.SD[i2] + game.SD[i3]) / 4,
          p: [
            game.SX[i0],
            game.SY[i0],
            game.SX[i1],
            game.SY[i1],
            game.SX[i2],
            game.SY[i2],
            game.SX[i3],
            game.SY[i3],
          ],
          c:
            'rgb(' +
            (Math.min(255, r) | 0) +
            ',' +
            (Math.min(255, g) | 0) +
            ',' +
            (Math.min(255, b) | 0) +
            ')',
          a: al,
        });
      }
    }
  };
  game.FA = [
    [0, 2, 6, 4],
    [1, 5, 7, 3],
    [0, 4, 5, 1],
    [2, 3, 7, 6],
    [0, 1, 3, 2],
    [4, 6, 7, 5],
  ];
  game.LX = 0.45;
  game.LY = 0.85;
  game.LZ = 0.35;
  game.LN = Math.hypot(game.LX, game.LY, game.LZ);
  game.V = new Float64Array(24);
  game.SX = new Float64Array(8);
  game.SY = new Float64Array(8);
  game.SD = new Float64Array(8);
  game.TT = 0;
}
