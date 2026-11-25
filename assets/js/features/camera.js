/** @module features/camera */

/**
 * Install camera capabilities into one isolated game session.
 * Cross-feature dependencies are explicit properties; no globals or inline scripts are required.
 * @param {object} game Mutable session and service registry, owned by the application root.
 * @returns {void}
 */
export function installCamera(game) {
  game.resize = function resize() {
    game.DPR = Math.min(2, window.devicePixelRatio || 1);
    game.W = window.innerWidth;
    game.H = window.innerHeight;
    game.cv.width = Math.round(game.W * game.DPR);
    game.cv.height = Math.round(game.H * game.DPR);
    game.ctx.setTransform(game.DPR, 0, 0, game.DPR, 0, 0);
    game.PORT = game.W < game.H * 0.85; /* móvil en vertical: arena girada, equipos arriba/abajo */
    if (game.PORT) {
      game.CAM.y = 16;
      game.CAM.z = 26;
      game.CAM.pitch = 0.6;
      game.FB = game.W * 1.95;
      game.YF = 0.64;
    } else {
      game.CAM.y = 6;
      game.CAM.z = 12;
      game.CAM.pitch = 0.45;
      game.FB = Math.min(game.W * 0.8, game.H * 1.6);
      game.YF = 0.56;
    }
    game.cpt = Math.cos(game.CAM.pitch);
    game.spt = Math.sin(game.CAM.pitch);
    game.F = game.FB;
  };
  game.setCam = function setCam(T) {
    const sx = (Math.random() - 0.5) * game.shake,
      sy = (Math.random() - 0.5) * game.shake,
      sw = Math.sin(T * 0.22) * 1.5 + sx;
    const hero = game.fp ? game.units.find((u) => u.hero && !u.dead) : null;
    if (hero) {
      /* primera persona: ojos de la gallina de la estrella */
      game.fpYaw = game.turnTo(game.fpYaw, hero.yaw, 0.3);
      if (!game.looking) {
        game.lookY *= 0.9;
        game.lookP *= 0.9;
      }
      const la = game.fpYaw - game.lookY,
        dx = Math.cos(la),
        dz = -Math.sin(la),
        bob = hero.state === 'walk' ? Math.sin(hero.gait * 16) * 0.05 : 0;
      game.CX = hero.x + dx * 0.05 + sx * 0.3;
      game.CZ = hero.z + dz * 0.05 + sx * 0.3;
      game.CYc = hero.top * 0.55 + hero.y + bob + sy * 0.3;
      const yw = Math.atan2(-dx, -dz);
      game.cyw = Math.cos(yw);
      game.syw = Math.sin(yw);
      const pp = 0.02 + game.lookP;
      game.cpt = Math.cos(pp);
      game.spt = Math.sin(pp);
      game.YF = 0.5;
      game.F = (game.PORT ? game.W * 0.75 : Math.min(game.W * 0.5, game.H * 1.1)) * game.zoom;
      return;
    }
    game.cpt = Math.cos(game.CAM.pitch);
    game.spt = Math.sin(game.CAM.pitch);
    game.YF = game.PORT ? 0.64 : 0.56;
    game.F = game.FB * game.zoom;
    game.CYc = game.CAM.y + sy;
    if (game.PORT) {
      game.CX = -game.CAM.z;
      game.CZ = sw + game.panH;
    } else {
      game.CX = game.panH + sw;
      game.CZ = game.CAM.z;
    }
    const yw = Math.atan2(game.PORT ? -game.CAM.z : sw, game.PORT ? sw : game.CAM.z);
    game.cyw = Math.cos(yw);
    game.syw = Math.sin(yw);
  };
  game.proj = function proj(x, y, z) {
    x -= game.CX;
    y -= game.CYc;
    z -= game.CZ;
    const x1 = x * game.cyw - z * game.syw,
      z1 = x * game.syw + z * game.cyw;
    const y2 = y * game.cpt - z1 * game.spt,
      z2 = y * game.spt + z1 * game.cpt;
    const d = -z2;
    if (d < 0.3) {
      return null;
    }
    return [game.W / 2 + (x1 / d) * game.F, game.H * game.YF - (y2 / d) * game.F, d];
  };
  game.cv = document.getElementById('c');
  game.ctx = game.cv.getContext('2d');
  game.W = 0;
  game.H = 0;
  game.DPR = 1;
  game.F = 800;
  game.FB = 800;
  game.PORT = false;
  game.YF = 0.42;
  game.CAM = { y: 7, z: 14.5, pitch: 0.45 };
  game.fp = false;
  game.fpYaw = 0;
  game.lookY = 0;
  game.lookP = 0;
  game.looking = false;
  game.camTx = 0;
  game.panH = 0;
  game.zoom = 1;
  game.CX = 0;
  game.CYc = 7;
  game.CZ = 14.5;
  game.cyw = 1;
  game.syw = 0;
  game.cpt = Math.cos(game.CAM.pitch);
  game.spt = Math.sin(game.CAM.pitch);
  game.shake = 0;
  window.addEventListener('resize', game.resize);
  game.resize();
  game.C = (h) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  game.B = (c, s, col, role, x) => {
    const p = { c, s, col: game.C(col), role };
    if (x) {
      Object.assign(p, x);
    }
    return p;
  };
}
