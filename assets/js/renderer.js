/** @module renderer */
import { B, bird, getModel, SP } from './models.js';
import { turnTo } from './math.js';
import { icon } from './icons.js';

/**
 * Evaluate the attack animation across its 0.6-second lifetime.
 * @param {number} a Attack time in seconds.
 * @returns {[number,number,number,number]} Body pitch, lunge, head and arm rotations.
 */
function atkCurve(a) {
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
}

export { atkCurve };

/**
 * Own camera state, canvas projection, cached models and pointer gestures.
 * Render methods read a live session view and never advance combat.
 * @param {object} options Rendering dependencies.
 * @param {HTMLCanvasElement} options.canvas Main arena canvas.
 * @param {object[]} options.icons Mutable registry of visible 3D preview canvases.
 * @param {function():object} options.getState Read-only live session view.
 * @param {function():void} options.onPress User interaction audio callback.
 * @returns {object} Arena/preview rendering, camera feedback and view updates.
 */
export function createRenderer({ canvas, icons, getState, onPress }) {
  const $ = (id) => document.getElementById(id);
  let previousViewVisibility;
  /* ============ canvas / cámara ============ */
  const cv = canvas,
    ctx = cv.getContext('2d');
  let W = 0,
    H = 0,
    DPR = 1,
    F = 800,
    FB = 800,
    PORT = false,
    YF = 0.42;
  const CAM = { y: 7, z: 14.5, pitch: 0.45 };
  let fp = false,
    fpYaw = 0,
    lookY = 0,
    lookP = 0,
    looking = false,
    panH = 0,
    zoom = 1,
    CX = 0,
    CYc = 7,
    CZ = 14.5,
    cyw = 1,
    syw = 0,
    cpt = Math.cos(CAM.pitch),
    spt = Math.sin(CAM.pitch),
    shake = 0;
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    PORT = W < H * 0.85; /* móvil en vertical: arena girada, equipos arriba/abajo */
    if (PORT) {
      CAM.y = 16;
      CAM.z = 26;
      CAM.pitch = 0.6;
      FB = W * 1.95;
      YF = 0.64;
    } else {
      CAM.y = 6;
      CAM.z = 12;
      CAM.pitch = 0.45;
      FB = Math.min(W * 0.8, H * 1.6);
      YF = 0.56;
    }
    cpt = Math.cos(CAM.pitch);
    spt = Math.sin(CAM.pitch);
    F = FB;
  }
  window.addEventListener('resize', resize);
  resize();
  function setCam(T) {
    const { units } = getState();
    const sx = (Math.random() - 0.5) * shake,
      sy = (Math.random() - 0.5) * shake,
      sw = Math.sin(T * 0.22) * 1.5 + sx;
    const hero = fp ? units.find((u) => u.hero && !u.dead) : null;
    if (hero) {
      /* primera persona: ojos de la gallina de la estrella */
      fpYaw = turnTo(fpYaw, hero.yaw, 0.3);
      if (!looking) {
        lookY *= 0.9;
        lookP *= 0.9;
      }
      const la = fpYaw - lookY,
        dx = Math.cos(la),
        dz = -Math.sin(la),
        bob = hero.state === 'walk' ? Math.sin(hero.gait * 16) * 0.05 : 0;
      CX = hero.x + dx * 0.05 + sx * 0.3;
      CZ = hero.z + dz * 0.05 + sx * 0.3;
      CYc = hero.top * 0.55 + hero.y + bob + sy * 0.3;
      const yw = Math.atan2(-dx, -dz);
      cyw = Math.cos(yw);
      syw = Math.sin(yw);
      const pp = 0.02 + lookP;
      cpt = Math.cos(pp);
      spt = Math.sin(pp);
      YF = 0.5;
      F = (PORT ? W * 0.75 : Math.min(W * 0.5, H * 1.1)) * zoom;
      return;
    }
    cpt = Math.cos(CAM.pitch);
    spt = Math.sin(CAM.pitch);
    YF = PORT ? 0.64 : 0.56;
    const entranceProgress = getState().entranceProgress;
    F =
      FB *
      zoom *
      (entranceProgress === null || entranceProgress === undefined
        ? 1
        : 0.88 + 0.12 * entranceProgress);
    CYc = CAM.y + sy;
    if (PORT) {
      CX = -CAM.z;
      CZ = sw + panH;
    } else {
      CX = panH + sw;
      CZ = CAM.z;
    }
    const yw = Math.atan2(PORT ? -CAM.z : sw, PORT ? sw : CAM.z);
    cyw = Math.cos(yw);
    syw = Math.sin(yw);
  }
  function proj(x, y, z) {
    x -= CX;
    y -= CYc;
    z -= CZ;
    const x1 = x * cyw - z * syw,
      z1 = x * syw + z * cyw;
    const y2 = y * cpt - z1 * spt,
      z2 = y * spt + z1 * cpt;
    const d = -z2;
    if (d < 0.3) {
      return null;
    }
    return [W / 2 + (x1 / d) * F, H * YF - (y2 / d) * F, d];
  }
  /* ============ render 3D por caras ============ */
  const FA = [
    [0, 2, 6, 4],
    [1, 5, 7, 3],
    [0, 4, 5, 1],
    [2, 3, 7, 6],
    [0, 1, 3, 2],
    [4, 6, 7, 5],
  ];
  const LX = 0.45,
    LY = 0.85,
    LZ = 0.35,
    LN = Math.hypot(LX, LY, LZ);
  const V = new Float64Array(24),
    SX = new Float64Array(8),
    SY = new Float64Array(8),
    SD = new Float64Array(8);
  let TT = 0;
  function partRot(p, e) {
    switch (p.an) {
      case 'leg':
        return [2, Math.sin(e.gait * 8 + p.ph) * 0.75 * e.wk];
      case 'arm':
        if (e.state === 'attack') {
          return [2, atkCurve(e.atkT)[3]];
        }
        if (e.win) {
          return [2, 2.4 + Math.sin(TT * 10 + (p.ph || 0)) * 0.4];
        }
        return [2, Math.sin(e.gait * 8 + p.ph) * 0.6 * e.wk + Math.sin(TT * 2 + e.seed) * 0.04];
      case 'head':
        if (e.state === 'attack') {
          return [2, atkCurve(e.atkT)[2]];
        }
        return [2, Math.sin(TT * 2 + e.seed) * 0.05 + Math.sin(e.gait * 8) * 0.1 * e.wk];
      case 'tail':
        return [1, Math.sin(TT * (4 + e.wk * 6) + e.seed) * 0.45];
      case 'wing': {
        let fl = 0.08;
        if (e.state === 'walk') {
          fl += 0.6 * Math.abs(Math.sin(e.gait * 14));
        }
        if (e.state === 'attack') {
          fl += 0.9 * Math.abs(Math.sin(e.atkT * 18));
        }
        if (e.win) {
          fl += 0.9 * Math.abs(Math.sin(TT * 16));
        }
        return [0, -p.sg * fl];
      }
    }
    return [0, 0];
  }
  function rb(h) {
    h = (((h % 360) + 360) % 360) / 60;
    const x = 1 - Math.abs((h % 2) - 1),
      i = h | 0,
      R = [1, x, 0, 0, x, 1],
      G = [x, 1, 1, x, 0, 0],
      Bl = [0, 0, x, 1, 1, x];
    return [(40 + 215 * R[i]) | 0, (40 + 215 * G[i]) | 0, (40 + 215 * Bl[i]) | 0];
  }
  function entFaces(e, out) {
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
        const r = partRot(p, e);
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
        V[i * 3] = wx;
        V[i * 3 + 1] = wy;
        V[i * 3 + 2] = wz;
        const rx = wx - CX,
          ry = wy - CYc,
          rz = wz - CZ,
          x1 = rx * cyw - rz * syw,
          z1 = rx * syw + rz * cyw,
          y2 = ry * cpt - z1 * spt,
          z2 = ry * spt + z1 * cpt,
          d = -z2;
        if (d > 0.3) {
          SD[i] = d;
          SX[i] = W / 2 + (x1 / d) * F;
          SY[i] = H * YF - (y2 / d) * F;
        } else {
          SD[i] = -1;
        }
      }
      let bx = 0,
        by = 0,
        bz = 0;
      for (let i = 0; i < 8; i++) {
        bx += V[i * 3];
        by += V[i * 3 + 1];
        bz += V[i * 3 + 2];
      }
      bx /= 8;
      by /= 8;
      bz /= 8;
      const col =
          rbw && p.role !== 'eye' && p.role !== 'acc' && p.an !== 'leg'
            ? rb(TT * 80 + pi * 14)
            : p.col,
        glow = p.glow || (rob && p.role === 'eye');
      for (let f = 0; f < 6; f++) {
        const q = FA[f],
          i0 = q[0],
          i1 = q[1],
          i2 = q[2],
          i3 = q[3];
        if (SD[i0] < 0 || SD[i1] < 0 || SD[i2] < 0 || SD[i3] < 0) {
          continue;
        }
        const ax_ = V[i1 * 3] - V[i0 * 3],
          ay_ = V[i1 * 3 + 1] - V[i0 * 3 + 1],
          az_ = V[i1 * 3 + 2] - V[i0 * 3 + 2];
        const bx_ = V[i3 * 3] - V[i0 * 3],
          by_ = V[i3 * 3 + 1] - V[i0 * 3 + 1],
          bz_ = V[i3 * 3 + 2] - V[i0 * 3 + 2];
        let nx = ay_ * bz_ - az_ * by_,
          ny = az_ * bx_ - ax_ * bz_,
          nz = ax_ * by_ - ay_ * bx_;
        const fx = (V[i0 * 3] + V[i2 * 3]) / 2,
          fy = (V[i0 * 3 + 1] + V[i2 * 3 + 1]) / 2,
          fz = (V[i0 * 3 + 2] + V[i2 * 3 + 2]) / 2;
        if (nx * (fx - bx) + ny * (fy - by) + nz * (fz - bz) < 0) {
          nx = -nx;
          ny = -ny;
          nz = -nz;
        }
        if (nx * (fx - CX) + ny * (fy - CYc) + nz * (fz - CZ) >= 0) {
          continue;
        }
        const nl = Math.hypot(nx, ny, nz) || 1;
        const sh = glow
          ? 1.15
          : 0.42 + 0.62 * Math.max(0, (nx * LX + ny * LY + nz * LZ) / (nl * LN));
        let r = col[0] * sh,
          g = col[1] * sh,
          b = col[2] * sh;
        if (fl) {
          r += (255 - r) * fl;
          g += (255 - g) * fl;
          b += (255 - b) * fl;
        }
        out.push({
          d: (SD[i0] + SD[i1] + SD[i2] + SD[i3]) / 4,
          p: [SX[i0], SY[i0], SX[i1], SY[i1], SX[i2], SY[i2], SX[i3], SY[i3]],
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
  }

  /* ============ escenario ============ */
  const decor = [];
  (function () {
    const post = (x, z) =>
      decor.push({
        model: [
          B([0, 0.75, 0], [0.34, 1.5, 0.34], '#c9c2dd', 'body'),
          B([0, 1.6, 0], [0.5, 0.2, 0.5], '#e94b5b', 'acc'),
        ],
        x,
        y: 0,
        z,
        yaw: 0,
      });
    [
      [-10, -6],
      [10, -6],
      [-10, 6],
      [10, 6],
    ].forEach((a) => post(a[0], a[1]));
    const rope = (x, z, sx, sz) =>
      decor.push({ model: [B([0, 1.0, 0], [sx, 0.12, sz], '#e94b5b', 'acc')], x, y: 0, z, yaw: 0 });
    rope(0, -6, 20, 0.12);
    rope(-10, 0, 0.12, 12);
    rope(10, 0, 0.12, 12);
    decor.push({
      model: [B([0, 0.7, 0], [40, 1.4, 2], '#2a2146', 'body')],
      x: 0,
      y: 0,
      z: -8.2,
      yaw: 0,
    });
    decor.push({
      model: [B([0, 3.2, 0], [40, 3.6, 0.6], '#352a5c', 'body')],
      x: 0,
      y: 0,
      z: -10,
      yaw: 0,
    });
    const pal = [
      '#ff6b6b',
      '#ffd24a',
      '#4ecdc4',
      '#a78bfa',
      '#ff9f43',
      '#6ec1ff',
      '#ff7eb6',
      '#7bed9f',
    ];
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < 26; i++) {
        const x = -12.5 + i * 1.0 + (r ? 0.5 : 0),
          sk = ['#f1c9a0', '#c68e62', '#8d5a3a', '#f7d9b5'][(i * 7 + r * 3) % 4];
        decor.push({
          model: [
            B([0, 0.3, 0], [0.5, 0.6, 0.4], pal[(i * 5 + r * 3) % pal.length], 'body'),
            B([0, 0.75, 0], [0.36, 0.36, 0.36], sk, 'head'),
          ],
          x,
          y: 1.4 + r * 0.0,
          z: -7.6 - r * 0.9,
          yaw: 0,
          seed: i * 1.7 + r,
          bob: true,
        });
      }
    }
  })();
  function drawSky() {
    const { TH } = getState();
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.5);
    g.addColorStop(0, TH.sky[0]);
    g.addColorStop(0.6, TH.sky[1]);
    g.addColorStop(1, TH.sky[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffe9a0';
    ctx.beginPath();
    ctx.arc(W * 0.8, H * 0.16, Math.min(W, H) * 0.07, 0, 7);
    ctx.fill();
    ctx.fillStyle = TH.hill;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.3);
    for (let i = 0; i <= 8; i++) {
      ctx.lineTo((W * i) / 8, H * (0.2 + 0.08 * Math.sin(i * 1.7) + 0.03 * (i % 2)));
    }
    ctx.lineTo(W, H * 0.45);
    ctx.lineTo(0, H * 0.45);
    ctx.fill();
  }
  function drawFloor() {
    const { TH } = getState();
    const z0 = PORT ? -26 : -12,
      z1 = PORT ? 28 : 14,
      x0 = PORT ? -40 : -18,
      x1 = PORT ? 20 : 18;
    for (let tz = z0; tz < z1; tz += 2) {
      for (let tx = x0; tx < x1; tx += 2) {
        const a = proj(tx, 0, tz),
          b = proj(tx + 2, 0, tz),
          c = proj(tx + 2, 0, tz + 2),
          d = proj(tx, 0, tz + 2);
        if (!a || !b || !c || !d) {
          continue;
        }
        const inA = tx >= -10 && tx < 10 && tz >= -6 && tz < 6,
          chk = ((tx + tz) / 2) & 1;
        ctx.fillStyle = inA ? (chk ? TH.fa : TH.fb) : chk ? TH.oa : TH.ob;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.lineTo(c[0], c[1]);
        ctx.lineTo(d[0], d[1]);
        ctx.closePath();
        ctx.fill();
      }
    }
    const a = proj(-0.08, 0.01, -6),
      b = proj(0.08, 0.01, -6),
      c = proj(0.08, 0.01, 6),
      d = proj(-0.08, 0.01, 6);
    if (a && b && c && d) {
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(c[0], c[1]);
      ctx.lineTo(d[0], d[1]);
      ctx.fill();
    }
  }

  /* ============ iconos 3D de las tarjetas ============ */

  const ocache = {};
  const G = (c, s, col) => B(c, s, col, 'acc', { glow: true });
  const sh = (arr, dx, dy, dz) =>
    arr.map((p) =>
      Object.assign({}, p, {
        c: [p.c[0] + dx, p.c[1] + dy, p.c[2] + (dz || 0)],
        pv: p.pv ? [p.pv[0] + dx, p.pv[1] + dy, p.pv[2] + (dz || 0)] : undefined,
      }),
    );
  function boundsOf(ps) {
    let top = 0,
      w = 0;
    ps.forEach((p) => {
      top = Math.max(top, p.c[1] + p.s[1] / 2);
      w = Math.max(w, Math.abs(p.c[0]) + p.s[0] / 2, Math.abs(p.c[2]) + p.s[2] / 2);
    });
    return { parts: ps, top: Math.max(0.3, top), size: Math.max(0.3, w * 2) };
  }
  const OBJ = {
    gold: () => [
      G([0, 0.58, 0], [0.95, 0.22, 0.5], '#ffd700'),
      G([0.08, 0.33, 0], [0.75, 0.2, 0.45], '#e6b800'),
      B([-0.38, 0.46, 0], [0.2, 0.5, 0.42], '#c99a00', 'acc'),
      G([0.55, 1.0, 0.3], [0.13, 0.13, 0.13], '#fff3a0'),
      G([-0.4, 1.05, -0.25], [0.1, 0.1, 0.1], '#fff3a0'),
      G([0.1, 1.1, 0], [0.08, 0.08, 0.08], '#ffffff'),
    ],
    laser: () =>
      sh(
        [
          B([0, 0.45, 0], [0.7, 0.32, 0.3], '#7d869a', 'body'),
          B([0.55, 0.5, 0], [0.5, 0.14, 0.14], '#454b5c', 'body'),
          G([0.85, 0.5, 0], [0.14, 0.22, 0.22], '#ff3aa0'),
          G([1.1, 0.5, 0], [0.35, 0.06, 0.06], '#ff9ae0'),
          B([-0.15, 0.15, 0], [0.2, 0.4, 0.22], '#454b5c', 'body'),
          B([0.05, 0.7, 0], [0.2, 0.1, 0.2], '#a7b0c4', 'body'),
        ],
        -0.45,
        0,
        0,
      ),
    egg: () => [
      B([0, 0.25, 0], [0.55, 0.25, 0.55], '#f6ecd2', 'body'),
      B([0, 0.5, 0], [0.72, 0.3, 0.72], '#f6ecd2', 'body'),
      B([0, 0.78, 0], [0.58, 0.28, 0.58], '#f6ecd2', 'body'),
      B([0, 0.98, 0], [0.32, 0.14, 0.32], '#f6ecd2', 'body'),
      B([0, 0.5, 0], [0.76, 0.1, 0.76], '#d8262b', 'acc'),
      B([0.04, 1.15, 0], [0.07, 0.2, 0.07], '#3b3b3b', 'body'),
      G([0.04, 1.3, 0], [0.16, 0.16, 0.16], '#ff8a1a'),
    ],
    storm: () => [
      B([0, 0.2, 0], [0.9, 0.1, 0.3], '#b7a8f0', 'acc'),
      B([-0.4, 0.6, 0], [0.22, 0.8, 0.06], '#d9ceff', 'body'),
      B([0, 0.7, 0], [0.24, 1.0, 0.06], '#ffffff', 'body'),
      B([0.4, 0.6, 0], [0.22, 0.8, 0.06], '#d9ceff', 'body'),
      B([-0.4, 0.6, 0], [0.05, 0.9, 0.1], '#8f7fe0', 'acc'),
      B([0, 0.7, 0], [0.05, 1.1, 0.1], '#8f7fe0', 'acc'),
      B([0.4, 0.6, 0], [0.05, 0.9, 0.1], '#8f7fe0', 'acc'),
    ],
    fire: () => [
      G([0, 0.2, 0], [0.7, 0.35, 0.7], '#ff3d1a'),
      G([0, 0.5, 0], [0.52, 0.4, 0.52], '#ff8a1a'),
      G([0, 0.84, 0], [0.34, 0.36, 0.34], '#ffd23a'),
      G([0, 1.1, 0], [0.16, 0.2, 0.16], '#fff3a0'),
      G([0.3, 0.45, 0.3], [0.18, 0.3, 0.18], '#ff8a1a'),
      G([-0.3, 0.4, -0.3], [0.18, 0.26, 0.18], '#ff5a1a'),
    ],
    vamp: () => [
      B([0, 0.55, 0], [1.0, 0.16, 0.4], '#b3122a', 'body'),
      B([-0.28, 0.3, 0], [0.16, 0.45, 0.16], '#ffffff', 'body'),
      B([0.28, 0.3, 0], [0.16, 0.45, 0.16], '#ffffff', 'body'),
      G([0.28, -0.05, 0], [0.1, 0.14, 0.1], '#ff2a4a'),
      B([0, 0.72, 0], [0.8, 0.1, 0.3], '#7a0c1c', 'body'),
    ],
    armor: () => [
      B([0, 0.6, 0], [0.85, 0.95, 0.14], '#8d98b3', 'body'),
      B([0, 0.2, 0], [0.5, 0.3, 0.14], '#8d98b3', 'body'),
      B([0, 0.6, 0.1], [0.16, 0.7, 0.1], '#ffd24a', 'acc'),
      B([0, 0.65, 0.1], [0.55, 0.14, 0.1], '#ffd24a', 'acc'),
      B([0, 1.1, 0], [0.95, 0.1, 0.18], '#5f687c', 'body'),
    ],
    speed: () => [
      G([0.15, 1.0, 0], [0.4, 0.3, 0.14], '#ffe14d'),
      G([0, 0.75, 0], [0.4, 0.3, 0.14], '#ffd21a'),
      G([-0.12, 0.5, 0], [0.4, 0.3, 0.14], '#ffe14d'),
      G([0.05, 0.25, 0], [0.22, 0.3, 0.14], '#ffb81a'),
    ],
    power: () => [
      B([0, 0.5, 0], [1.1, 0.12, 0.12], '#9aa3b5', 'body'),
      B([-0.38, 0.5, 0], [0.18, 0.7, 0.7], '#c43b3b', 'body'),
      B([0.38, 0.5, 0], [0.18, 0.7, 0.7], '#c43b3b', 'body'),
      B([-0.55, 0.5, 0], [0.14, 0.5, 0.5], '#8f2a2a', 'body'),
      B([0.55, 0.5, 0], [0.14, 0.5, 0.5], '#8f2a2a', 'body'),
    ],
    vit: () => [
      B([-0.22, 0.85, 0], [0.38, 0.38, 0.28], '#ff3a5a', 'body'),
      B([0.22, 0.85, 0], [0.38, 0.38, 0.28], '#ff3a5a', 'body'),
      B([0, 0.55, 0], [0.85, 0.38, 0.28], '#ff3a5a', 'body'),
      B([0, 0.28, 0], [0.5, 0.25, 0.28], '#e02548', 'body'),
      B([0, 0.08, 0], [0.2, 0.2, 0.28], '#c8183a', 'body'),
      G([-0.25, 0.9, 0.15], [0.12, 0.12, 0.06], '#ffd0d8'),
    ],
    flock: () => sh(SP.chick.mk(), -0.35, 0, 0.0).concat(sh(SP.chick.mk(), 0.4, 0, 0.1)),
    phoenix: () =>
      bird({
        L: 0.7,
        leg: 0.25,
        col: '#ff7a1a',
        hcol: '#ff9a2a',
        breast: '#ffb81a',
        wing: '#ffcf3a',
        tailc: ['#ff3d1a', '#ffb81a', '#ffe36a'],
        tailN: 3,
      }).concat([G([0, 1.5, 0], [0.2, 0.2, 0.2], '#ffe36a')]),
  };
  function objSpec(id) {
    if (id === 'robot') {
      return [Object.assign({}, boundsOf(getModel('chicken', 1).parts), { robot: true })];
    }
    if (id === 'titan') {
      return [Object.assign({}, boundsOf(getModel('chicken', 2).parts), { robot: true })];
    }
    if (!ocache[id]) {
      ocache[id] = boundsOf(OBJ[id]());
    }
    return [ocache[id]];
  }
  function skinSpec(id) {
    const mo = getModel('chicken', 0, false, id);
    return [Object.assign({}, boundsOf(mo.parts), { robot: false, rbw: mo.rbw })];
  }
  function memberSpec(m) {
    const mo = getModel(m.k, m.t, m.l.gold > 0, m.hero ? m.skin : null);
    return [Object.assign({}, boundsOf(mo.parts), { robot: m.t > 0, rbw: mo.rbw })];
  }
  function renderIcons() {
    if (!icons.length) {
      return;
    }
    const sv = [W, H, F, CX, CYc, CZ, cyw, syw, cpt, spt, YF],
      dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const ic of icons) {
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
      YF = 0.42;
      W = w;
      H = h;
      F = h * 2.4;
      CX = 0;
      CYc = 1.65;
      CZ = 3.5;
      cyw = 1;
      syw = 0;
      const pit = Math.atan(1.1 / 3.5);
      cpt = Math.cos(pit);
      spt = Math.sin(pit);
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
          yaw = TT * 1.1 + i * 0.7;
        entFaces(
          {
            model: e.parts,
            x,
            z,
            y: 0,
            yaw,
            sc: fit,
            robot: e.robot,
            rbw: e.rbw,
            gait: TT * 2,
            wk: 0,
            state: 'idle',
            seed: i,
            hw: 0.3,
          },
          faces,
        );
        const p = proj(x, 0, z);
        if (p) {
          c.fillStyle = 'rgba(0,0,0,.35)';
          c.beginPath();
          c.ellipse(
            p[0],
            p[1],
            (e.size * fit * 0.55 * F) / p[2],
            (e.size * fit * 0.2 * F) / p[2],
            0,
            0,
            7,
          );
          c.fill();
        }
      });
      drawFaces(c, faces);
    }
    [W, H, F, CX, CYc, CZ, cyw, syw, cpt, spt, YF] = sv;
  }
  function drawFaces(c, faces) {
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
      c.strokeStyle = 'rgba(15,8,30,.35)';
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  function render() {
    const { units, parts, floaters, fx, CNAME, st } = getState();
    TT = getState().TT;
    decor.forEach((d) => {
      if (d.bob) {
        d.y =
          1.4 +
          Math.max(0, Math.sin(TT * (st === 'fight' ? 7 : 2.5) + d.seed)) *
            (st === 'fight' ? 0.35 : 0.08);
      }
    });
    setCam(TT);
    drawSky();
    drawFloor();
    for (const u of units) {
      if (u.alpha <= 0.01) {
        continue;
      }
      if (fp && u.hero) {
        continue;
      }
      const p = proj(u.x, 0.02, u.z);
      if (!p) {
        continue;
      }
      const rx = (u.size * 0.55 * F) / p[2],
        k = 1 - Math.min(1, u.y / 6);
      ctx.fillStyle = 'rgba(20,10,40,' + 0.35 * k * u.alpha + ')';
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], rx, rx * 0.4, 0, 0, 7);
      ctx.fill();
      ctx.strokeStyle = u.side
        ? 'rgba(255,84,104,' + 0.9 * k * u.alpha + ')'
        : 'rgba(82,168,255,' + 0.9 * k * u.alpha + ')';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    // anillos en el suelo
    for (const f of fx) {
      if (f.k !== 'ring') {
        continue;
      }
      const p = proj(f.x, 0.03, f.z);
      if (!p) {
        continue;
      }
      const k = f.t / f.max,
        rr = (f.r * Math.min(1, k * 1.6) * F) / p[2];
      ctx.strokeStyle = 'rgba(' + f.c + ',' + (1 - k) + ')';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], rr, rr * 0.4, 0, 0, 7);
      ctx.stroke();
    }
    const faces = [];
    for (const d of decor) {
      entFaces(d, faces);
    }
    for (const u of units) {
      if (fp && u.hero) {
        continue;
      }
      entFaces(u, faces);
    }
    faces.sort((a, b) => b.d - a.d);
    drawFaces(ctx, faces);
    // proyectiles y rayos
    for (const f of fx) {
      if (f.k === 'egg') {
        const k = Math.min(1, f.t / f.dur),
          x = f.x0 + (f.x1 - f.x0) * k,
          z = f.z0 + (f.z1 - f.z0) * k,
          y = 0.6 + Math.sin(k * Math.PI) * 3.2;
        const q = proj(x, y, z),
          g = proj(x, 0.03, z);
        if (g) {
          ctx.fillStyle = 'rgba(20,10,40,.35)';
          ctx.beginPath();
          ctx.ellipse(g[0], g[1], (0.35 * F) / g[2], (0.14 * F) / g[2], 0, 0, 7);
          ctx.fill();
        }
        if (q) {
          const r = (0.28 * F) / q[2];
          ctx.fillStyle = '#fff8e0';
          ctx.strokeStyle = '#caa24a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(q[0], q[1], r * 0.8, r, 0, 0, 7);
          ctx.fill();
          ctx.stroke();
        }
      } else if (f.k === 'laser') {
        const a = proj(f.x1, f.y1, f.z1),
          b = proj(f.x2, f.y2, f.z2);
        if (!a || !b) {
          continue;
        }
        const k = 1 - f.t / f.max;
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(255,60,160,' + 0.35 * k + ')';
        ctx.lineWidth = 16 * k + 4;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,120,220,' + k + ')';
        ctx.lineWidth = 8 * k + 2;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,' + k + ')';
        ctx.lineWidth = 3 * k + 1;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
    }
    for (const p of parts) {
      const q = proj(p.x, p.y, p.z);
      if (!q) {
        continue;
      }
      const r = Math.max(1.5, (p.s * F) / q[2]),
        k = Math.max(0, p.life / p.max);
      if (p.k === 'p') {
        ctx.globalAlpha = k * 0.7;
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(q[0], q[1], r * (1.6 - k), 0, 7);
        ctx.fill();
      } else {
        ctx.globalAlpha = Math.min(1, k * 1.5);
        ctx.fillStyle = p.c;
        ctx.fillRect(q[0] - r, q[1] - r, r * 2, r * 2);
      }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    const bars = [];
    for (const u of units) {
      if (u.dying || u.dead || u.spawnT < 1) {
        continue;
      }
      if (fp && u.hero) {
        continue;
      }
      const mk = u.hero ? CNAME || 'Tu gallina' : u.boss ? 'JEFE' : '';
      if (mk) {
        const q = proj(u.x, u.top + 0.85 + u.y, u.z);
        if (q) {
          const fs = Math.max(14, Math.min(30, (F / q[2]) * 0.5));
          ctx.font = '900 ' + fs + 'px sans-serif';
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#1b1330';
          ctx.strokeText(mk, q[0], q[1] - 26);
          ctx.fillStyle = '#ffd24a';
          ctx.fillText(mk, q[0], q[1] - 26);
        }
      }
      const q = proj(u.x, u.top + 0.3 + u.y, u.z);
      if (!q) {
        continue;
      }
      bars.push({
        u,
        x: q[0],
        y: q[1],
        d: q[2],
        w: Math.max(36, Math.min(86, (u.size * 1.0 * F) / q[2])),
      });
    }
    bars.sort((a, b) => a.d - b.d);
    const placed = [];
    for (const b of bars) {
      let y = b.y,
        t = 0;
      while (
        t < 8 &&
        placed.some((p) => Math.abs(p.x - b.x) < (p.w + b.w) / 2 + 2 && Math.abs(p.y - y) < 21)
      ) {
        y -= 21;
        t++;
      }
      placed.push({ x: b.x, y, w: b.w });
      const u = b.u,
        w = b.w,
        h = 8,
        x = b.x - w / 2,
        pc = Math.max(0, u.hp / u.max);
      ctx.fillStyle = 'rgba(10,5,25,.9)';
      ctx.fillRect(x - 2, y - h - 2, w + 4, h + 4);
      ctx.fillStyle = u.side ? '#ff5468' : '#52a8ff';
      ctx.fillRect(x, y - h, w * pc, h);
      const fs = Math.max(11, Math.min(14, w * 0.2)),
        tx = Math.ceil(u.hp) + '';
      ctx.font = '900 ' + fs + 'px Trebuchet MS,sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#1b1330';
      ctx.strokeText(tx, b.x, y - h - 4);
      ctx.fillStyle = '#fff';
      ctx.fillText(tx, b.x, y - h - 4);
    }
    for (const f of floaters) {
      const q = proj(f.x, f.y, f.z);
      if (!q) {
        continue;
      }
      const fs = Math.max(12, Math.min(34, (F / q[2]) * 0.32));
      ctx.globalAlpha = Math.min(1, f.life * 2);
      ctx.font = '900 ' + fs + 'px Trebuchet MS,system-ui';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#1b1330';
      ctx.strokeText(f.t, q[0], q[1]);
      ctx.fillStyle = f.c;
      ctx.fillText(f.t, q[0], q[1]);
    }
    ctx.globalAlpha = 1;
  }
  const fpBtn = $('fpv');
  function setFp(v) {
    fp = v;
    fpBtn.classList.toggle('on', fp);
    fpBtn.innerHTML = fp ? icon('chicken') : icon('eye');
    fpBtn.setAttribute('aria-label', fp ? 'Volver a la vista general' : 'Vista en primera persona');
    lookY = lookP = 0;
    looking = false;
    if (fp) {
      const h = getState().units.find((u) => u.hero);
      if (h) {
        fpYaw = h.yaw;
      }
    }
  }
  fpBtn.onclick = () => {
    onPress();
    setFp(!fp);
  };
  let lkX = 0,
    lkY = 0;
  const ptrs = new Map();
  let pinchD = 0;
  const clampCam = () => {
    zoom = Math.max(0.45, Math.min(2.6, zoom));
    panH = Math.max(-16, Math.min(16, panH));
  };
  cv.addEventListener('pointerdown', (e) => {
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    try {
      cv.setPointerCapture(e.pointerId);
    } catch (_) {}
    if (fp) {
      looking = true;
      lkX = e.clientX;
      lkY = e.clientY;
      return;
    }
    lkX = e.clientX;
    if (ptrs.size === 2) {
      const p = [...ptrs.values()];
      pinchD = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);
    }
  });
  cv.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) {
      return;
    }
    if (fp) {
      if (!looking) {
        return;
      }
      lookY = Math.max(-2.9, Math.min(2.9, lookY + (e.clientX - lkX) * 0.008));
      lookP = Math.max(-0.5, Math.min(0.5, lookP + (e.clientY - lkY) * 0.004));
      lkX = e.clientX;
      lkY = e.clientY;
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      return;
    }
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size >= 2) {
      const p = [...ptrs.values()],
        d = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);
      if (pinchD > 10 && d > 10) {
        zoom *= d / pinchD;
      }
      pinchD = d;
      clampCam();
      return;
    }
    panH -= ((e.clientX - lkX) * CAM.z) / F;
    lkX = e.clientX;
    clampCam();
  });
  cv.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      zoom *= Math.exp(-e.deltaY * 0.0012);
      clampCam();
    },
    { passive: false },
  );
  const endLook = (e) => {
    ptrs.delete(e.pointerId);
    looking = false;
    pinchD = 0;
    const p = [...ptrs.values()];
    if (p.length) {
      lkX = p[0][0];
    }
  };
  cv.addEventListener('pointerup', endLook);
  cv.addEventListener('pointercancel', endLook);

  return {
    render,
    renderIcons,
    objSpec,
    skinSpec,
    memberSpec,
    get shake() {
      return shake;
    },
    set shake(value) {
      shake = value;
    },
    update(dt) {
      const { mode, st } = getState();
      const visible = mode === 'inf' && st !== 'entrance';
      if (visible !== previousViewVisibility) {
        fpBtn.classList.toggle('hide', !visible);
        previousViewVisibility = visible;
      }
      if (fp && !visible) {
        setFp(false);
      }
      shake *= Math.exp(-dt * 6);
    },
  };
}
