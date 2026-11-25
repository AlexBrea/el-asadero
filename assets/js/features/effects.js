/** @module features/effects */

/**
 * Install effects capabilities into one isolated game session.
 * Cross-feature dependencies are explicit properties; no globals or inline scripts are required.
 * @param {object} game Mutable session and service registry, owned by the application root.
 * @returns {void}
 */
export function installEffects(game) {
  game.burst = function burst(x, y, z, n, cols, sp, sz, life) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28,
        e = Math.random() * 0.8 + 0.2;
      game.parts.push({
        x,
        y,
        z,
        vx: Math.cos(a) * sp * e,
        vy: (Math.random() * 0.8 + 0.3) * sp,
        vz: Math.sin(a) * sp * e,
        life: life * (0.6 + Math.random() * 0.6),
        max: life,
        c: cols[(Math.random() * cols.length) | 0],
        s: sz,
        k: 's',
      });
    }
  };
  game.puff = function puff(x, z, n, s) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28;
      game.parts.push({
        x: x + Math.cos(a) * 0.2,
        y: 0.2 + Math.random() * 0.3,
        z: z + Math.sin(a) * 0.2,
        vx: Math.cos(a) * 1.4,
        vy: 0.8 + Math.random(),
        vz: Math.sin(a) * 1.4,
        life: 0.7,
        max: 0.7,
        c: '#e9e3f5',
        s: s,
        k: 'p',
      });
    }
  };
  game.floater = function floater(x, y, z, t, c) {
    if (game.floaters.length < 60) {
      game.floaters.push({ x, y, z, t, c, life: 0.9 });
    }
  };
}
