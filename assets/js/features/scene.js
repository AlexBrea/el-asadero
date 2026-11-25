/** @module features/scene */

/**
 * Install scene capabilities into one isolated game session.
 * Cross-feature dependencies are explicit properties; no globals or inline scripts are required.
 * @param {object} game Mutable session and service registry, owned by the application root.
 * @returns {void}
 */
export function installScene(game) {
  game.drawSky = function drawSky() {
    const g = game.ctx.createLinearGradient(0, 0, 0, game.H * 0.5);
    g.addColorStop(0, game.TH.sky[0]);
    g.addColorStop(0.6, game.TH.sky[1]);
    g.addColorStop(1, game.TH.sky[2]);
    game.ctx.fillStyle = g;
    game.ctx.fillRect(0, 0, game.W, game.H);
    game.ctx.fillStyle = '#ffe9a0';
    game.ctx.beginPath();
    game.ctx.arc(game.W * 0.8, game.H * 0.16, Math.min(game.W, game.H) * 0.07, 0, 7);
    game.ctx.fill();
    game.ctx.fillStyle = game.TH.hill;
    game.ctx.beginPath();
    game.ctx.moveTo(0, game.H * 0.3);
    for (let i = 0; i <= 8; i++) {
      game.ctx.lineTo((game.W * i) / 8, game.H * (0.2 + 0.08 * Math.sin(i * 1.7) + 0.03 * (i % 2)));
    }
    game.ctx.lineTo(game.W, game.H * 0.45);
    game.ctx.lineTo(0, game.H * 0.45);
    game.ctx.fill();
  };
  game.drawFloor = function drawFloor() {
    const z0 = game.PORT ? -26 : -12,
      z1 = game.PORT ? 28 : 14,
      x0 = game.PORT ? -40 : -18,
      x1 = game.PORT ? 20 : 18;
    for (let tz = z0; tz < z1; tz += 2) {
      for (let tx = x0; tx < x1; tx += 2) {
        const a = game.proj(tx, 0, tz),
          b = game.proj(tx + 2, 0, tz),
          c = game.proj(tx + 2, 0, tz + 2),
          d = game.proj(tx, 0, tz + 2);
        if (!a || !b || !c || !d) {
          continue;
        }
        const inA = tx >= -10 && tx < 10 && tz >= -6 && tz < 6,
          chk = ((tx + tz) / 2) & 1;
        game.ctx.fillStyle = inA ? (chk ? game.TH.fa : game.TH.fb) : chk ? game.TH.oa : game.TH.ob;
        game.ctx.beginPath();
        game.ctx.moveTo(a[0], a[1]);
        game.ctx.lineTo(b[0], b[1]);
        game.ctx.lineTo(c[0], c[1]);
        game.ctx.lineTo(d[0], d[1]);
        game.ctx.closePath();
        game.ctx.fill();
      }
    }
    const a = game.proj(-0.08, 0.01, -6),
      b = game.proj(0.08, 0.01, -6),
      c = game.proj(0.08, 0.01, 6),
      d = game.proj(-0.08, 0.01, 6);
    if (a && b && c && d) {
      game.ctx.fillStyle = 'rgba(255,255,255,.35)';
      game.ctx.beginPath();
      game.ctx.moveTo(a[0], a[1]);
      game.ctx.lineTo(b[0], b[1]);
      game.ctx.lineTo(c[0], c[1]);
      game.ctx.lineTo(d[0], d[1]);
      game.ctx.fill();
    }
  };
  game.decor = [];
  (function () {
    const post = (x, z) =>
      game.decor.push({
        model: [
          game.B([0, 0.75, 0], [0.34, 1.5, 0.34], '#c9c2dd', 'body'),
          game.B([0, 1.6, 0], [0.5, 0.2, 0.5], '#e94b5b', 'acc'),
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
      game.decor.push({
        model: [game.B([0, 1.0, 0], [sx, 0.12, sz], '#e94b5b', 'acc')],
        x,
        y: 0,
        z,
        yaw: 0,
      });
    rope(0, -6, 20, 0.12);
    rope(-10, 0, 0.12, 12);
    rope(10, 0, 0.12, 12);
    game.decor.push({
      model: [game.B([0, 0.7, 0], [40, 1.4, 2], '#2a2146', 'body')],
      x: 0,
      y: 0,
      z: -8.2,
      yaw: 0,
    });
    game.decor.push({
      model: [game.B([0, 3.2, 0], [40, 3.6, 0.6], '#352a5c', 'body')],
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
        game.decor.push({
          model: [
            game.B([0, 0.3, 0], [0.5, 0.6, 0.4], pal[(i * 5 + r * 3) % pal.length], 'body'),
            game.B([0, 0.75, 0], [0.36, 0.36, 0.36], sk, 'head'),
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
}
