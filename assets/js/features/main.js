import { removeExpired } from '../simulation.js';
import { icon } from './metadata.js';
/** @module features/main */

/**
 * Install main capabilities into one isolated game session.
 * Cross-feature dependencies are explicit properties; no globals or inline scripts are required.
 * @param {object} game Mutable session and service registry, owned by the application root.
 * @returns {void}
 */
export function installMain(game) {
  game.update = function update(dt) {
    try {
      game.musicTick();
    } catch (e) {}
    game.fpBtn.classList.toggle('hide', game.mode !== 'inf');
    if (game.fp && game.mode !== 'inf') {
      game.setFp(false);
    }
    if (game.drawerOpen && game.statsShown) {
      game.statsT -= dt;
      if (game.statsT <= 0) {
        game.statsT = 0.5;
        game.refreshStats();
      }
    }
    game.runTimers(dt);
    const sdt = dt * game.speed;
    if (
      game.mode === 'inf' &&
      game.st !== 'levelend' &&
      (!document.hidden || game.st === 'fight' || game.st === 'intro' || game.st === 'rounddone0')
    ) {
      game.runT += dt;
      game.pend += dt;
    }
    if (game.st === 'fight') {
      if (!game.fightEnd) {
        const n = Math.ceil(sdt / 0.025);
        for (let i = 0; i < n; i++) {
          game.stepFight(sdt / n);
        }
      } else {
        game.endT += sdt;
        if (game.endT > 2.0) {
          const pw = game.fightEnd === 1;
          game.st = 'rounddone0';
          game.roundOver(pw);
        }
      }
    }
    game.updateFx(sdt);
    game.units.forEach((u) => game.updateAnim(u, sdt));
    game.bossFlames(sdt);
    if (game.units.some((u) => u.dead)) {
      game.units = game.units.filter((u) => !u.dead);
    }
    for (const p of game.parts) {
      p.life -= sdt;
      p.x += p.vx * sdt;
      p.y += p.vy * sdt;
      p.z += p.vz * sdt;
      if (p.k === 's') {
        p.vy -= 12 * sdt;
      } else {
        p.vx *= 0.95;
        p.vz *= 0.95;
      }
      if (p.y < 0 && p.k === 's') {
        p.y = 0;
        p.vy *= -0.3;
      }
    }
    removeExpired(game.parts);
    for (const f of game.floaters) {
      f.life -= sdt;
      f.y += 1.3 * sdt;
    }
    removeExpired(game.floaters);
    game.shake *= Math.exp(-dt * 6);
    game.decor.forEach((d) => {
      if (d.bob) {
        d.y =
          1.4 +
          Math.max(0, Math.sin(game.TT * (game.st === 'fight' ? 7 : 2.5) + d.seed)) *
            (game.st === 'fight' ? 0.35 : 0.08);
      }
    });
  };
  game.bossFlames = function bossFlames(dt) {
    if (game.simming) {
      return;
    }
    const C = ['#ff1a2a', '#ff3a1a', '#e0102a', '#ff5a1a'];
    for (const u of game.units) {
      if (!u.boss || u.dying || u.dead || u.spawnT < 1) {
        continue;
      }
      if (Math.random() < dt * 55) {
        const a = Math.random() * 6.28,
          r = u.size * (0.3 + Math.random() * 0.35);
        game.parts.push({
          x: u.x + Math.cos(a) * r,
          y: 0.1 + Math.random() * u.top * 0.95 + u.y,
          z: u.z + Math.sin(a) * r,
          vx: (Math.random() - 0.5) * 0.5,
          vy: 1.1 + Math.random() * 1.3,
          vz: (Math.random() - 0.5) * 0.5,
          life: 0.8,
          max: 0.8,
          c: C[(Math.random() * C.length) | 0],
          s: 0.13 + Math.random() * 0.14,
          k: Math.random() < 0.75 ? 'bf' : 'p',
        });
      }
    }
  };
  game.render = function render() {
    game.setCam(game.TT);
    game.drawSky();
    game.drawFloor();
    for (const u of game.units) {
      if (u.alpha <= 0.01) {
        continue;
      }
      if (game.fp && u.hero) {
        continue;
      }
      const p = game.proj(u.x, 0.02, u.z);
      if (!p) {
        continue;
      }
      const rx = (u.size * 0.55 * game.F) / p[2],
        k = 1 - Math.min(1, u.y / 6);
      game.ctx.fillStyle = 'rgba(20,10,40,' + 0.35 * k * u.alpha + ')';
      game.ctx.beginPath();
      game.ctx.ellipse(p[0], p[1], rx, rx * 0.4, 0, 0, 7);
      game.ctx.fill();
      game.ctx.strokeStyle = u.side
        ? 'rgba(255,84,104,' + 0.9 * k * u.alpha + ')'
        : 'rgba(82,168,255,' + 0.9 * k * u.alpha + ')';
      game.ctx.lineWidth = 3;
      game.ctx.stroke();
      if (u.boss) {
        /* aura roja en llamas de los jefes */
        const pl = 0.8 + 0.2 * Math.sin(game.TT * 5 + u.seed),
          c0 = game.proj(u.x, u.top * 0.5 + u.y, u.z);
        if (c0) {
          const R = (u.size * 1.2 * game.F) / c0[2],
            g = game.ctx.createRadialGradient(c0[0], c0[1], R * 0.15, c0[0], c0[1], R);
          g.addColorStop(0, 'rgba(230,20,40,' + 0.7 * pl * u.alpha + ')');
          g.addColorStop(0.6, 'rgba(200,10,30,' + 0.38 * pl * u.alpha + ')');
          g.addColorStop(1, 'rgba(180,0,20,0)');
          game.ctx.fillStyle = g;
          game.ctx.beginPath();
          game.ctx.arc(c0[0], c0[1], R, 0, 7);
          game.ctx.fill();
        }
        game.ctx.strokeStyle = 'rgba(255,40,50,' + 0.55 * pl * k * u.alpha + ')';
        game.ctx.lineWidth = 4;
        game.ctx.beginPath();
        game.ctx.ellipse(p[0], p[1], rx * 1.12, rx * 0.45, 0, 0, 7);
        game.ctx.stroke();
      }
    }
    for (const p of game.parts) {
      /* llamas de jefe, detrás del cuerpo */
      if (p.k !== 'bf') {
        continue;
      }
      const q = game.proj(p.x, p.y, p.z);
      if (!q) {
        continue;
      }
      const r = Math.max(2, ((p.s * game.F) / q[2]) * 1.5),
        k = Math.max(0, p.life / p.max);
      game.ctx.globalAlpha = k * 0.85;
      game.ctx.fillStyle = p.c;
      game.ctx.beginPath();
      game.ctx.arc(q[0], q[1], r * (1.5 - 0.6 * k), 0, 7);
      game.ctx.fill();
    }
    game.ctx.globalAlpha = 1;
    // anillos en el suelo
    for (const f of game.fx) {
      if (f.k !== 'ring') {
        continue;
      }
      const p = game.proj(f.x, 0.03, f.z);
      if (!p) {
        continue;
      }
      const k = f.t / f.max,
        rr = (f.r * Math.min(1, k * 1.6) * game.F) / p[2];
      game.ctx.strokeStyle = 'rgba(' + f.c + ',' + (1 - k) + ')';
      game.ctx.lineWidth = 6;
      game.ctx.beginPath();
      game.ctx.ellipse(p[0], p[1], rr, rr * 0.4, 0, 0, 7);
      game.ctx.stroke();
    }
    for (const f of game.fx) {
      if (f.k !== 'lava') {
        continue;
      }
      const p = game.proj(f.x, 0.025, f.z);
      if (!p) {
        continue;
      }
      const k = f.t / f.max,
        rr = (f.r * Math.min(1, f.t * 4) * game.F) / p[2],
        pl = 0.5 + 0.5 * Math.sin(game.TT * 8);
      game.ctx.globalAlpha = Math.min(1, (1 - k) * 2.2);
      game.ctx.fillStyle = 'rgba(255,' + ((70 + pl * 50) | 0) + ',20,.55)';
      game.ctx.beginPath();
      game.ctx.ellipse(p[0], p[1], rr, rr * 0.4, 0, 0, 7);
      game.ctx.fill();
      game.ctx.fillStyle = 'rgba(255,200,60,.5)';
      game.ctx.beginPath();
      game.ctx.ellipse(p[0], p[1], rr * 0.6, rr * 0.24, 0, 0, 7);
      game.ctx.fill();
      game.ctx.globalAlpha = 1;
    }
    const faces = [];
    for (const d of game.decor) {
      game.entFaces(d, faces);
    }
    for (const u of game.units) {
      if (game.fp && u.hero) {
        continue;
      }
      game.entFaces(u, faces);
    }
    for (const f of game.fx) {
      if (f.k === 'bat') {
        game.entFaces(game.batEnt(f), faces);
      }
    }
    faces.sort((a, b) => b.d - a.d);
    game.drawFaces(game.ctx, faces);
    // proyectiles y rayos
    for (const f of game.fx) {
      if (f.k === 'egg') {
        const k = Math.min(1, f.t / f.dur),
          x = f.x0 + (f.x1 - f.x0) * k,
          z = f.z0 + (f.z1 - f.z0) * k,
          y = 0.6 + Math.sin(k * Math.PI) * 3.2;
        const q = game.proj(x, y, z),
          g = game.proj(x, 0.03, z);
        if (g) {
          game.ctx.fillStyle = 'rgba(20,10,40,.35)';
          game.ctx.beginPath();
          game.ctx.ellipse(g[0], g[1], (0.35 * game.F) / g[2], (0.14 * game.F) / g[2], 0, 0, 7);
          game.ctx.fill();
        }
        if (q) {
          const r = ((0.28 * game.F) / q[2]) * (f.big ? 2.3 : 1);
          game.ctx.fillStyle = '#fff8e0';
          game.ctx.strokeStyle = '#caa24a';
          game.ctx.lineWidth = 2;
          game.ctx.beginPath();
          game.ctx.ellipse(q[0], q[1], r * 0.8, r, 0, 0, 7);
          game.ctx.fill();
          game.ctx.stroke();
        }
      } else if (f.k === 'laser') {
        const a = game.proj(f.x1, f.y1, f.z1),
          b = game.proj(f.x2, f.y2, f.z2);
        if (!a || !b) {
          continue;
        }
        const k = 1 - f.t / f.max;
        game.ctx.lineCap = 'round';
        const L1 = f.c1 || '255,60,160',
          L2 = f.c2 || '255,120,220';
        game.ctx.strokeStyle = 'rgba(' + L1 + ',' + 0.35 * k + ')';
        game.ctx.lineWidth = 16 * k + 4;
        game.ctx.beginPath();
        game.ctx.moveTo(a[0], a[1]);
        game.ctx.lineTo(b[0], b[1]);
        game.ctx.stroke();
        game.ctx.strokeStyle = 'rgba(' + L2 + ',' + k + ')';
        game.ctx.lineWidth = 8 * k + 2;
        game.ctx.beginPath();
        game.ctx.moveTo(a[0], a[1]);
        game.ctx.lineTo(b[0], b[1]);
        game.ctx.stroke();
        game.ctx.strokeStyle = 'rgba(255,255,255,' + k + ')';
        game.ctx.lineWidth = 3 * k + 1;
        game.ctx.beginPath();
        game.ctx.moveTo(a[0], a[1]);
        game.ctx.lineTo(b[0], b[1]);
        game.ctx.stroke();
      }
    }
    for (const p of game.parts) {
      if (p.k === 'bf') {
        continue;
      }
      const q = game.proj(p.x, p.y, p.z);
      if (!q) {
        continue;
      }
      const r = Math.max(1.5, (p.s * game.F) / q[2]),
        k = Math.max(0, p.life / p.max);
      if (p.k === 'p') {
        game.ctx.globalAlpha = k * 0.7;
        game.ctx.fillStyle = p.c;
        game.ctx.beginPath();
        game.ctx.arc(q[0], q[1], r * (1.6 - k), 0, 7);
        game.ctx.fill();
      } else {
        game.ctx.globalAlpha = Math.min(1, k * 1.5);
        game.ctx.fillStyle = p.c;
        game.ctx.fillRect(q[0] - r, q[1] - r, r * 2, r * 2);
      }
    }
    game.ctx.globalAlpha = 1;
    game.ctx.textAlign = 'center';
    game.ctx.lineJoin = 'round';
    const bars = [];
    for (const u of game.units) {
      if (u.dying || u.dead || u.spawnT < 1) {
        continue;
      }
      if (game.fp && u.hero) {
        continue;
      }
      const mk = u.hero
        ? (u.ref && u.ref.spec ? game.SPECS[u.ref.spec].n + ' · ' : '') +
          (game.CNAME || 'Tu gallina')
        : '';
      if (mk) {
        const q = game.proj(u.x, u.top + 0.85 + u.y, u.z);
        if (q) {
          const fs = Math.max(14, Math.min(30, (game.F / q[2]) * 0.5));
          game.ctx.font = '900 ' + fs + 'px sans-serif';
          game.ctx.lineWidth = 4;
          game.ctx.strokeStyle = '#1b1330';
          game.ctx.strokeText(mk, q[0], q[1] - 26);
          game.ctx.fillStyle = '#ffd24a';
          game.ctx.fillText(mk, q[0], q[1] - 26);
        }
      }
      const q = game.proj(u.x, u.top + 0.3 + u.y, u.z);
      if (!q) {
        continue;
      }
      bars.push({
        u,
        x: q[0],
        y: q[1],
        d: q[2],
        w: Math.max(36, Math.min(86, (u.size * 1.0 * game.F) / q[2])),
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
      game.ctx.fillStyle = 'rgba(10,5,25,.9)';
      game.ctx.fillRect(x - 2, y - h - 2, w + 4, h + 4);
      game.ctx.fillStyle = u.side ? '#ff5468' : '#52a8ff';
      game.ctx.fillRect(x, y - h, w * pc, h);
      const fs = Math.max(11, Math.min(14, w * 0.2)),
        tx = Math.ceil(u.hp) + '';
      game.ctx.font = '900 ' + fs + 'px Trebuchet MS,sans-serif';
      game.ctx.lineWidth = 3;
      game.ctx.strokeStyle = '#1b1330';
      game.ctx.strokeText(tx, b.x, y - h - 4);
      game.ctx.fillStyle = '#fff';
      game.ctx.fillText(tx, b.x, y - h - 4);
    }
    for (const f of game.floaters) {
      const q = game.proj(f.x, f.y, f.z);
      if (!q) {
        continue;
      }
      const fs = Math.max(12, Math.min(34, (game.F / q[2]) * 0.32));
      game.ctx.globalAlpha = Math.min(1, f.life * 2);
      game.ctx.font = '900 ' + fs + 'px Trebuchet MS,system-ui';
      game.ctx.lineWidth = 4;
      game.ctx.strokeStyle = '#1b1330';
      game.ctx.strokeText(f.t, q[0], q[1]);
      game.ctx.fillStyle = f.c;
      game.ctx.fillText(f.t, q[0], q[1]);
    }
    game.ctx.globalAlpha = 1;
  };
  game.setFp = function setFp(v) {
    game.fp = v;
    game.fpBtn.classList.toggle('on', game.fp);
    game.fpBtn.innerHTML = game.fp ? icon('chicken') : icon('eye');
    game.fpBtn.setAttribute(
      'aria-label',
      game.fp ? 'Volver a la vista general' : 'Vista en primera persona',
    );
    game.lookY = game.lookP = 0;
    game.looking = false;
    if (game.fp) {
      const h = game.units.find((u) => u.hero);
      if (h) {
        game.fpYaw = h.yaw;
      }
    }
  };
  game.$('spd').onclick = () => {
    game.speed = game.speed === 1 ? 2 : game.speed === 2 ? 3 : 1;
    game.$('spd').innerHTML = 'x' + game.speed;
  };
  game.toggleSnd = () => {
    game.muted = !game.muted;
    game.refreshDrawer();
  };
  game.toggleMus = () => {
    game.ensureAudio();
    game.musicOn = !game.musicOn;
    game.refreshDrawer();
  };
  game.fpBtn = game.$('fpv');
  game.fpBtn.onclick = () => {
    game.ensureAudio();
    game.snd.click();
    game.setFp(!game.fp);
  };
  game.lkX = 0;
  game.lkY = 0;
  game.ptrs = new Map();
  game.pinchD = 0;
  game.clampCam = () => {
    game.zoom = Math.max(0.45, Math.min(2.6, game.zoom));
    game.panH = Math.max(-16, Math.min(16, game.panH));
  };
  game.cv.addEventListener('pointerdown', (e) => {
    game.ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    try {
      game.cv.setPointerCapture(e.pointerId);
    } catch (_) {}
    if (game.fp) {
      game.looking = true;
      game.lkX = e.clientX;
      game.lkY = e.clientY;
      return;
    }
    game.lkX = e.clientX;
    if (game.ptrs.size === 2) {
      const p = [...game.ptrs.values()];
      game.pinchD = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);
    }
  });
  game.cv.addEventListener('pointermove', (e) => {
    if (!game.ptrs.has(e.pointerId)) {
      return;
    }
    if (game.fp) {
      if (!game.looking) {
        return;
      }
      game.lookY = Math.max(-2.9, Math.min(2.9, game.lookY + (e.clientX - game.lkX) * 0.008));
      game.lookP = Math.max(-0.5, Math.min(0.5, game.lookP + (e.clientY - game.lkY) * 0.004));
      game.lkX = e.clientX;
      game.lkY = e.clientY;
      game.ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      return;
    }
    game.ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (game.ptrs.size >= 2) {
      const p = [...game.ptrs.values()],
        d = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);
      if (game.pinchD > 10 && d > 10) {
        game.zoom *= d / game.pinchD;
      }
      game.pinchD = d;
      game.clampCam();
      return;
    }
    game.panH -= ((e.clientX - game.lkX) * game.CAM.z) / game.F;
    game.lkX = e.clientX;
    game.clampCam();
  });
  game.cv.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      game.zoom *= Math.exp(-e.deltaY * 0.0012);
      game.clampCam();
    },
    { passive: false },
  );
  game.endLook = (e) => {
    game.ptrs.delete(e.pointerId);
    game.looking = false;
    game.pinchD = 0;
    const p = [...game.ptrs.values()];
    if (p.length) {
      game.lkX = p[0][0];
    }
  };
  game.cv.addEventListener('pointerup', game.endLook);
  game.cv.addEventListener('pointercancel', game.endLook);
  game.$('menu').onclick = () => {
    game.ensureAudio();
    game.drawerOpen ? game.closeDrawer() : game.openDrawer();
  };
  game.$('dclose').onclick = game.closeDrawer;
  game.$('d-stats').onclick = () => {
    game.statsShown = !game.statsShown;
    game.$('dstats').classList.toggle('on', game.statsShown);
    game.$('d-stats').querySelector('.ar').innerHTML = game.statsShown ? '▴' : '▾';
    game.refreshStats();
  };
  game.$('d-mus').onclick = game.toggleMus;
  game.$('d-snd').onclick = game.toggleSnd;
  game.$('d-rank').onclick = () => {
    game.closeDrawer();
    game.showRanking();
  };
  game.$('d-home').onclick = () => {
    if (!game.homeArm) {
      game.homeArm = 1;
      game.$('d-home').innerHTML = icon('alert') + ' ¿Seguro? Pulsa otra vez';
      setTimeout(() => {
        if (game.homeArm) {
          game.homeArm = 0;
          game.$('d-home').innerHTML = icon('home') + ' Menú principal';
        }
      }, 3000);
      return;
    }
    game.closeDrawer();
    game.showMenu();
  };
  game.$('d-out').onclick = () => {
    game.closeDrawer();
    game.doSignOut();
  };
}
