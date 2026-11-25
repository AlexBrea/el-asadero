import { createBattleIndex } from '../simulation.js';
/** @module features/combat */

/**
 * Install combat capabilities into one isolated game session.
 * Cross-feature dependencies are explicit properties; no globals or inline scripts are required.
 * @param {object} game Mutable session and service registry, owned by the application root.
 * @returns {void}
 */
export function installCombat(game) {
  const battleIndex = createBattleIndex();
  game.turnTo = function turnTo(a, b, k) {
    let d = b - a;
    while (d > Math.PI) {
      d -= 6.2832;
    }
    while (d < -Math.PI) {
      d += 6.2832;
    }
    return a + d * Math.min(1, k);
  };
  game.hurt = function hurt(src, t, dmg, o) {
    if (t.dying || t.dead || t.invuln > 0) {
      return;
    }
    o = o || {};
    const qt = o.burn || o.quiet;
    if (!qt && t.sk && t.sk.dodge && Math.random() < t.sk.dodge) {
      game.floater(t.x, t.top + 0.5, t.z, '¡ESQUIVA!', '#b7f0ff');
      if (t.sk.ult && t.sk.ult.mist) {
        t.hp = Math.min(t.max, t.hp + t.max * 0.05);
      }
      return;
    }
    dmg *= t.dmgMul || 1;
    if (t.curse) {
      dmg *= 1 + t.curse.mul;
    }
    if (src && src.sk && src.sk.ashes && t.burn) {
      dmg *= 1 + 0.25 * src.sk.ashes + (src.sk.ult && src.sk.ult.ashes ? 0.5 : 0);
    }
    t.hp -= dmg;
    t.flash = 0.18;
    if (
      t.sk &&
      t.sk.thorns &&
      src &&
      src !== t &&
      !src.dying &&
      !qt &&
      !o.thorn &&
      !o.laser &&
      !o.egg
    ) {
      game.hurt(t, src, dmg * 0.18 * t.sk.thorns * (t.sk.ult && t.sk.ult.thorns ? 2 : 1), {
        quiet: true,
        thorn: true,
      });
    }
    if (src && src.vamp && src.hp > 0) {
      src.hp = Math.min(src.max, src.hp + dmg * src.vamp);
    }
    const big = dmg > t.max * 0.25 || dmg > 25 || o.crit;
    if (!o.quiet) {
      game.floater(
        t.x + (Math.random() - 0.5) * 0.5,
        t.top + 0.2,
        t.z,
        Math.round(dmg) + '',
        o.crit ? '#ffd24a' : o.burn ? '#ff9a3d' : o.laser ? '#ff7be0' : big ? '#ff7b3d' : '#fff',
      );
    }
    if (!qt) {
      game.burst(
        t.x,
        t.top * 0.6,
        t.z,
        big ? 10 : 5,
        t.robot ? ['#ffb83d', '#fff3a0'] : ['#fff3a0', '#ffffff', '#ffd24a'],
        3.2,
        0.09,
        0.4,
      );
      game.snd.hit(big);
      game.shake = Math.min(0.5, game.shake + (big ? 0.22 : 0.04));
    }
    if (t.hp <= 0) {
      if (t.phoenix > 0) {
        t.phoenix--;
        t.hp = t.max;
        t.flash = 0.8;
        t.burn = null;
        t.invuln = 0.9;
        t.dmgMul = t.dmgMul || 1;
        if (t.ref) {
          const l = t.ref.l;
          l.phoenix = Math.max(0, (l.phoenix || 1) - 1);
          if (!l.phoenix) {
            delete l.phoenix;
          }
          game.phoenixLost.push(t.ref);
        }
        game.burst(
          t.x,
          t.top * 0.6,
          t.z,
          40,
          ['#ffd24a', '#ff9a3d', '#fff', '#ff5a1a'],
          6,
          0.14,
          0.9,
        );
        game.puff(t.x, t.z, 8, 0.6);
        game.fx.push({ k: 'ring', x: t.x, z: t.z, r: 2.6, t: 0, max: 0.6, c: '255,170,40' });
        game.floater(t.x, t.top + 0.9, t.z, '¡HUEVO FÉNIX!', '#ffb83d');
        game.tone(300, 1400, 0.5, 'triangle', 0.09);
        game.shake = Math.min(0.6, game.shake + 0.3);
        return;
      }
      if (t.rev > 0) {
        t.rev--;
        t.hp = t.max * 0.5;
        t.flash = 0.8;
        t.burn = null;
        t.invuln = 1.2;
        game.burst(t.x, t.top * 0.6, t.z, 30, ['#9fe8ff', '#ffffff', '#7bed9f'], 5, 0.13, 0.8);
        game.puff(t.x, t.z, 6, 0.5);
        game.floater(t.x, t.top + 0.9, t.z, '¡SEGUNDO ALIENTO!', '#9fe8ff');
        game.tone(400, 1200, 0.4, 'triangle', 0.08);
        return;
      }
      t.hp = 0;
      t.dying = true;
      t.dieT = 0;
      t.state = 'die';
      if (t.side === 0 && !t.hero && !t.expire) {
        game.allyDied(t);
      }
      if (t.curse && t.curse.jump) {
        const nx = game.units
          .filter((e) => e.side === t.side && e !== t && !e.dying && !e.dead && !e.curse)
          .sort((a, b) => Math.hypot(a.x - t.x, a.z - t.z) - Math.hypot(b.x - t.x, b.z - t.z))[0];
        if (nx) {
          nx.curse = {
            t: 5,
            mul: t.curse.mul,
            dps: t.curse.dps,
            jump: true,
            by: t.curse.by,
            tk: 0.5,
          };
          game.fx.push({
            k: 'laser',
            x1: t.x,
            y1: t.top * 0.55,
            z1: t.z,
            x2: nx.x,
            y2: nx.top * 0.55,
            z2: nx.z,
            t: 0,
            max: 0.32,
            c1: '168,85,247',
            c2: '230,190,255',
          });
          game.floater(nx.x, nx.top + 0.9, nx.z, '¡MALDITO!', '#c77dff');
        }
      }
      if (src && src.sk && src.sk.lust && src.hp > 0) {
        const ul = src.sk.ult && src.sk.ult.lust;
        src.hp = Math.min(src.max, src.hp + src.max * 0.12 * src.sk.lust * (ul ? 2 : 1));
        if (ul) {
          src.buf = 3;
          src.bufMul = 1.3;
        }
      }
      const ab =
        src && src.sk && src.sk.ult && src.sk.ult.ashes
          ? src
          : t.burn &&
              t.burn.by &&
              t.burn.by.sk &&
              t.burn.by.sk.ult &&
              t.burn.by.sk.ult.ashes &&
              !t.burn.by.dying
            ? t.burn.by
            : null;
      if (t.burn && ab) {
        game.fx.push({ k: 'ring', x: t.x, z: t.z, r: 2.2, t: 0, max: 0.4, c: '255,120,30' });
        game.burst(t.x, t.top * 0.5, t.z, 18, ['#ff5a1a', '#ffb83d', '#ffe36a'], 5, 0.12, 0.6);
        game.units.forEach((e) => {
          if (
            e.side === t.side &&
            e !== t &&
            !e.dying &&
            !e.dead &&
            Math.hypot(e.x - t.x, e.z - t.z) < 2.2 + e.size * 0.3
          ) {
            game.hurt(ab, e, ab.atk * 1.2, { egg: true });
          }
        });
      }
      if (t.burn && t.burn.sp) {
        const r = 2.4 + 0.8 * (t.burn.spl || 1);
        game.units.forEach((e) => {
          if (
            e.side === t.side &&
            e !== t &&
            !e.dying &&
            !e.dead &&
            Math.hypot(e.x - t.x, e.z - t.z) < r + e.size * 0.3
          ) {
            e.burn = { t: 3, dps: t.burn.dps, tick: 0.5, sp: true, spl: t.burn.spl, by: t.burn.by };
          }
        });
        game.fx.push({ k: 'ring', x: t.x, z: t.z, r: r, t: 0, max: 0.4, c: '255,120,30' });
      }
      if (t.side === 1 && game.mode === 'inf' && !game.simming) {
        game.ST.k++;
        game.ST.kb[t.key] = (game.ST.kb[t.key] || 0) + 1;
        game.achCheck();
      }
      game.puff(t.x, t.z, 8, 0.5);
      game.burst(t.x, t.top * 0.5, t.z, 14, ['#ffd24a', '#ff6b6b', '#fff'], 4.5, 0.11, 0.7);
      game.floater(t.x, t.top + 0.8, t.z, '¡KO!', '#ffd24a');
      game.snd.ko();
      game.shake = Math.min(0.6, game.shake + 0.3);
    }
  };
  game.strike = function strike(u, t) {
    let dmg = u.atk * u.rate * (0.85 + Math.random() * 0.3),
      crit = false;
    if (u.crit && Math.random() < u.crit) {
      dmg *= 3;
      crit = true;
      game.burst(t.x, t.top * 0.7, t.z, 14, ['#ffd700', '#fff3a0', '#ffffff'], 4, 0.1, 0.6);
    }
    const dx = t.x - u.x,
      dz = t.z - u.z,
      d = Math.hypot(dx, dz) || 1,
      k = Math.min(5, 2 + (dmg / t.max) * 10);
    t.kx += (dx / d) * k;
    t.kz += (dz / d) * k;
    if (u.buf > 0) {
      dmg *= u.bufMul;
    }
    const sk = u.sk,
      UL = (sk && sk.ult) || {};
    if (u.pact && sk && sk.pact) {
      dmg *= 1 + u.pact * sk.pact.dmg;
    }
    if (UL.rage && u.hp < u.max * 0.35) {
      dmg *= 1.5;
    }
    game.hurt(u, t, dmg, { crit });
    if (sk && sk.cleave) {
      const cr = UL.cleave ? 3.6 : 2;
      if (UL.cleave) {
        game.fx.push({ k: 'ring', x: t.x, z: t.z, r: cr, t: 0, max: 0.3, c: '255,123,61' });
      }
      game.units.forEach((e) => {
        if (
          e.side !== u.side &&
          e !== t &&
          !e.dying &&
          !e.dead &&
          Math.hypot(e.x - t.x, e.z - t.z) < cr + e.size * 0.3
        ) {
          game.hurt(u, e, dmg * 0.25 * sk.cleave * (UL.cleave ? 1.5 : 1), { quiet: true });
        }
      });
    }
    if (u.fireDps && !t.dying) {
      t.burn = {
        t: 3 + (sk ? 0.5 * sk.ember : 0) + (UL.ember ? 2 : 0),
        dps: u.fireDps * (1 + (sk ? 0.4 * sk.ember : 0)) * (UL.ember ? 1.8 : 1),
        tick: 0.5,
        sp: !!(sk && sk.spread),
        spl: sk ? sk.spread : 0,
        by: u,
      };
      if (UL.spread) {
        game.units.forEach((e) => {
          if (
            e.side !== u.side &&
            e !== t &&
            !e.dying &&
            !e.dead &&
            Math.hypot(e.x - t.x, e.z - t.z) < 2.2 + e.size * 0.3
          ) {
            e.burn = Object.assign({}, t.burn);
          }
        });
      }
    }
  };
  game.explodeEgg = function explodeEgg(f) {
    game.burst(f.x1, 0.6, f.z1, 26, ['#fff3a0', '#ffb83d', '#ffffff', '#ff7b3d'], 6, 0.14, 0.7);
    game.puff(f.x1, f.z1, 10, 0.6);
    game.fx.push({ k: 'ring', x: f.x1, z: f.z1, r: f.rad, t: 0, max: 0.45, c: '255,200,80' });
    game.snd.boom();
    game.shake = Math.min(0.7, game.shake + 0.35);
    game.units.forEach((e) => {
      if (
        e.side !== f.side &&
        !e.dying &&
        !e.dead &&
        Math.hypot(e.x - f.x1, e.z - f.z1) < f.rad + e.size * 0.4
      ) {
        game.hurt(f.src, e, f.dmg, { egg: true });
      }
    });
  };
  game.heroAbilities = function heroAbilities(u, alive, dt) {
    const ab = u.ab,
      en = alive.filter((e) => e.side !== u.side && !e.dying);
    if (!en.length) {
      return;
    }
    if (ab.laser) {
      u.laserT -= dt;
      if (u.laserT <= 0) {
        u.laserT = ab.laser.cd;
        const pool = en.slice();
        for (let i = 0; i < ab.laser.n && pool.length; i++) {
          const t = pool.splice((Math.random() * pool.length) | 0, 1)[0];
          game.fx.push({
            k: 'laser',
            x1: u.x,
            y1: u.top * 0.95,
            z1: u.z,
            x2: t.x,
            y2: t.top * 0.55,
            z2: t.z,
            t: 0,
            max: 0.32,
          });
          game.burst(t.x, t.top * 0.55, t.z, 10, ['#ff7be0', '#ffffff', '#ff3a8a'], 4, 0.1, 0.5);
          game.hurt(u, t, ab.laser.dmg, { laser: true });
        }
        game.snd.laser();
      }
    }
    if (ab.egg) {
      u.eggT -= dt;
      if (u.eggT <= 0) {
        u.eggT = ab.egg.cd;
        const t = en[(Math.random() * en.length) | 0];
        game.fx.push({
          k: 'egg',
          x0: u.x,
          z0: u.z,
          x1: t.x,
          z1: t.z,
          t: 0,
          dur: 0.7,
          dmg: ab.egg.dmg,
          rad: ab.egg.rad,
          side: u.side,
          src: u,
        });
      }
    }
    if (ab.storm) {
      u.stormT -= dt;
      if (u.stormT <= 0) {
        u.stormT = ab.storm.cd;
        game.fx.push({
          k: 'ring',
          x: u.x,
          z: u.z,
          r: ab.storm.rad,
          t: 0,
          max: 0.5,
          c: '255,255,255',
        });
        for (let i = 0; i < 30; i++) {
          const a = (i / 30) * 6.28;
          game.parts.push({
            x: u.x,
            y: 0.6,
            z: u.z,
            vx: Math.cos(a) * 6,
            vy: 1.5,
            vz: Math.sin(a) * 6,
            life: 0.5,
            max: 0.5,
            c: i % 2 ? '#ffffff' : '#d9ceff',
            s: 0.1,
            k: 's',
          });
        }
        game.snd.laser();
        en.forEach((e) => {
          if (Math.hypot(e.x - u.x, e.z - u.z) < ab.storm.rad + e.size * 0.4) {
            game.hurt(u, e, ab.storm.dmg, {});
            if (u.sk && u.sk.cyclone) {
              const dx = e.x - u.x,
                dz = e.z - u.z,
                d = Math.hypot(dx, dz) || 1;
              const pd = u.sk.pull ? -1 : 1;
              e.kx += (dx / d) * 3 * u.sk.cyclone * pd;
              e.kz += (dz / d) * 3 * u.sk.cyclone * pd;
            }
          }
        });
      }
    }
  };
  game.stepFight = function stepFight(dt) {
    battleIndex.collect(game.units);
    const alive = battleIndex.alive;
    for (const u of alive) {
      if (u.dying) {
        continue;
      }
      u.flash = Math.max(0, u.flash - dt);
      if (u.invuln > 0) {
        u.invuln -= dt;
      }
      if (u.regen && u.hp < u.max) {
        u.hp = Math.min(u.max, u.hp + u.regen * dt);
      }
      if (u.burn) {
        u.burn.t -= dt;
        u.burn.tick -= dt;
        if (u.burn.tick <= 0) {
          u.burn.tick = 0.5;
          game.hurt(null, u, u.burn.dps * 0.5, { burn: true });
          game.burst(u.x, u.top * 0.7, u.z, 3, ['#ff9a3d', '#ffd24a'], 1.6, 0.08, 0.4);
        }
        if (u.burn.t <= 0) {
          u.burn = null;
        }
        if (u.dying) {
          continue;
        }
      }
      if (u.buf > 0) {
        u.buf -= dt;
      }
      if (u.curse) {
        const c = u.curse;
        c.t -= dt;
        if (!game.simming && Math.random() < dt * 7) {
          game.parts.push({
            x: u.x + (Math.random() - 0.5) * u.size * 0.6,
            y: u.top * (0.3 + Math.random() * 0.6),
            z: u.z + (Math.random() - 0.5) * u.size * 0.6,
            vx: 0,
            vy: 1.4,
            vz: 0,
            life: 0.6,
            max: 0.6,
            c: '#a855f7',
            s: 0.07,
            k: 'p',
          });
        }
        if (c.dps) {
          c.tk -= dt;
          if (c.tk <= 0) {
            c.tk = 0.5;
            game.hurt(c.by, u, c.dps * 0.5, { burn: true });
          }
        }
        if (c.t <= 0) {
          u.curse = null;
        }
        if (u.dying) {
          continue;
        }
      }
      if (u.spirit) {
        u.life -= dt;
        if (!game.simming && Math.random() < dt * 10) {
          game.parts.push({
            x: u.x + (Math.random() - 0.5) * 0.5,
            y: u.top * 0.5,
            z: u.z + (Math.random() - 0.5) * 0.5,
            vx: 0,
            vy: 1.2,
            vz: 0,
            life: 0.5,
            max: 0.5,
            c: '#c9a4ff',
            s: 0.06,
            k: 'p',
          });
        }
        if (u.life <= 0) {
          u.expire = true;
          u.hp = 0;
          u.dying = true;
          u.dieT = 0;
          u.state = 'die';
          game.fx.push({ k: 'ring', x: u.x, z: u.z, r: 0.9, t: 0, max: 0.3, c: '200,160,255' });
          if (!game.simming) {
            game.burst(u.x, u.top * 0.5, u.z, 10, ['#c9a4ff', '#ffffff'], 3, 0.08, 0.5);
          }
          continue;
        }
      }
      if (u.hero && u.ab) {
        game.heroAbilities(u, alive, dt);
        game.specAbilities(u, alive, dt);
      }
      if (u.kx || u.kz) {
        u.x += u.kx * dt;
        u.z += u.kz * dt;
        const d = Math.exp(-dt * 7);
        u.kx *= d;
        u.kz *= d;
      }
      let t = u.tgt;
      if (!t || t.dying || t.dead) {
        t = null;
        let bd = 1e9;
        for (const e of alive) {
          if (e.side === u.side || e.dying) {
            continue;
          }
          const d = (e.x - u.x) ** 2 + (e.z - u.z) ** 2;
          if (d < bd) {
            bd = d;
            t = e;
          }
        }
        u.tgt = t;
      }
      if (!t) {
        u.state = 'idle';
        continue;
      }
      const dx = t.x - u.x,
        dz = t.z - u.z,
        dist = Math.hypot(dx, dz) || 0.001,
        reach = (u.size + t.size) * 0.42 + 0.3;
      if (u.state === 'attack') {
        u.atkT += dt;
        u.yaw = game.turnTo(u.yaw, Math.atan2(-dz, dx), dt * 14);
        if (!u.hit && u.atkT >= 0.38) {
          u.hit = true;
          if (!t.dying) {
            game.strike(u, t);
          }
        }
        if (u.atkT >= 0.6) {
          u.state = 'idle';
          u.cd = (u.rate * (0.85 + Math.random() * 0.3)) / game.specHaste(u);
        }
        continue;
      }
      u.cd -= dt;
      if (dist <= reach * 1.15) {
        u.state = 'idle';
        u.yaw = game.turnTo(u.yaw, Math.atan2(-dz, dx), dt * 14);
        if (u.cd <= 0) {
          u.state = 'attack';
          u.atkT = 0;
          u.hit = false;
        }
      } else {
        u.state = 'walk';
        u.yaw = game.turnTo(u.yaw, Math.atan2(-dz, dx), dt * 12);
        u.x += (dx / dist) * u.spd * dt;
        u.z += (dz / dist) * u.spd * dt;
        u.gait += dt * u.spd * 0.9;
      }
    }
    const al2 = alive.filter((u) => !u.dying);
    for (let i = 0; i < al2.length; i++) {
      for (let j = i + 1; j < al2.length; j++) {
        const a = al2[i],
          b = al2[j];
        const dx = b.x - a.x,
          dz = b.z - a.z,
          md = (a.size + b.size) * 0.36 + 0.12,
          d2 = dx * dx + dz * dz;
        if (d2 < md * md && d2 > 1e-6) {
          const d = Math.sqrt(d2),
            p = ((md - d) * 0.5) / d;
          a.x -= dx * p;
          a.z -= dz * p;
          b.x += dx * p;
          b.z += dz * p;
        }
      }
    }
    for (const u of al2) {
      u.x = Math.max(-9.6, Math.min(9.6, u.x));
      u.z = Math.max(-5.6, Math.min(5.6, u.z));
    }
    game.fightT += dt;
    const pl = game.units.filter((u) => u.side === 0 && !u.dying && !u.spirit),
      bl = game.units.filter((u) => u.side === 1 && !u.dying);
    if (!game.fightEnd && (!pl.length || !bl.length || (game.simming && game.fightT > 60))) {
      let pw =
        pl.length > 0 &&
        (bl.length === 0 || pl.reduce((s, u) => s + u.hp, 0) >= bl.reduce((s, u) => s + u.hp, 0));
      if (!pl.length) {
        pw = false;
      }
      game.endT = 0;
      game.units.forEach((u) => {
        if (!u.dying && (u.side === 0) === pw) {
          u.win = true;
          u.state = 'idle';
        }
      });
      game.fightEnd = pw ? 1 : 2;
    }
  };
  game.updateFx = function updateFx(dt) {
    for (const f of game.fx) {
      f.t += dt;
      if (f.k === 'egg' && !f.done && f.t >= f.dur) {
        f.done = true;
        game.explodeEgg(f);
      }
      if (f.k === 'lava') {
        f.tick -= dt;
        if (f.tick <= 0) {
          f.tick = 0.5;
          game.units.forEach((e) => {
            if (
              e.side !== f.side &&
              !e.dying &&
              !e.dead &&
              Math.hypot(e.x - f.x, e.z - f.z) < f.r + e.size * 0.3
            ) {
              game.hurt(f.src, e, f.dps, { burn: true });
              if (!e.dying && !e.burn) {
                e.burn = {
                  t: 2,
                  dps: f.src.fireDps || f.src.atk * 0.3,
                  tick: 0.5,
                  sp: false,
                  by: f.src,
                };
              }
            }
          });
        }
      }
      if (f.k === 'bat') {
        if (!f.hit && f.t >= f.fly) {
          f.hit = true;
          const t = f.tgt;
          if (t && !t.dying && !t.dead) {
            game.hurt(f.src, t, f.dmg, { laser: true });
          }
          if (!game.simming) {
            game.burst(f.tx, f.ty, f.tz, 8, ['#d0102e', '#3a0a14', '#ffffff'], 3.5, 0.09, 0.5);
          }
          if (f.boom) {
            game.fx.push({ k: 'ring', x: f.tx, z: f.tz, r: 2.2, t: 0, max: 0.4, c: '208,16,46' });
            if (!game.simming) {
              game.burst(
                f.tx,
                f.ty,
                f.tz,
                22,
                ['#d0102e', '#ff5a6a', '#3a0a14', '#ffffff'],
                5.5,
                0.12,
                0.6,
              );
            }
            game.units.forEach((e) => {
              if (
                e !== t &&
                e.side !== f.src.side &&
                !e.dying &&
                !e.dead &&
                Math.hypot(e.x - f.tx, e.z - f.tz) < 2.2 + e.size * 0.3
              ) {
                game.hurt(f.src, e, f.dmg * 0.6, { egg: true });
              }
            });
          }
        } else if (f.hit && !game.simming) {
          f.bt += dt;
          if (f.bt >= 0.2) {
            f.bt = 0;
            game.burst(f.tx, f.ty, f.tz, 3, ['#d0102e', '#ff5a6a'], 2.5, 0.07, 0.4);
          }
        }
      }
    }
    game.fx = game.fx.filter((f) => (f.k === 'egg' ? !f.done : f.t < f.max));
  };
  game.updateAnim = function updateAnim(u, dt) {
    u.wk += ((u.state === 'walk' ? 1 : 0) - u.wk) * Math.min(1, dt * 10);
    u.pitch = 0;
    u.lunge = 0;
    u.roll = 0;
    u.y = 0;
    if (u.spawnT < 1) {
      u.spawnT += dt / 0.55;
      if (u.spawnT < 0) {
        u.alpha = 0;
        return;
      }
      u.alpha = 1;
      const k = Math.min(1, u.spawnT);
      u.y = (1 - k) * (1 - k) * 9;
      if (u.spawnT >= 1 && !u.landed) {
        u.landed = true;
        game.puff(u.x, u.z, 5, 0.35);
        game.snd.drop();
      }
      return;
    }
    if (u.dying) {
      u.dieT += dt;
      const k = Math.min(1, u.dieT / 0.45);
      u.roll = (u.rd * k * Math.PI) / 2;
      u.y = Math.sin(k * Math.PI) * 0.7;
      if (u.dieT > 1.0) {
        u.alpha = Math.max(0, 1 - (u.dieT - 1.0) / 0.5);
      }
      if (u.dieT > 1.5) {
        u.dead = true;
        game.puff(u.x, u.z, 6, 0.45);
      }
      return;
    }
    if (u.state === 'attack') {
      const c = game.atkCurve(u.atkT);
      u.pitch = c[0];
      u.lunge = c[1];
    } else if (u.state === 'walk') {
      u.y = Math.abs(Math.sin(u.gait * 8)) * 0.07;
      u.pitch = -0.05;
    } else {
      u.y = Math.sin(game.TT * 3 + u.seed) * 0.02;
    }
    if (u.win) {
      u.y = Math.abs(Math.sin(game.TT * 9 + u.seed)) * 0.5;
    }
  };
  game.simBattle = function simBattle(pt, bt) {
    game.simming = true;
    const sa = game.units,
      sf = game.fightEnd,
      sft = game.fightT;
    const a = pt.map((e) => game.mkUnit(0, Object.assign({}, e, { fresh: false }))),
      b = bt.map((e) => game.mkUnit(1, Object.assign({}, e, { fresh: false })));
    game.formation(a, -1);
    game.formation(b, 1);
    game.units = a.concat(b);
    game.units.forEach((u) => {
      u.x = u.hx;
      u.z = u.hz;
      u.spawnT = 1;
      u.landed = true;
    });
    game.fightEnd = false;
    game.fightT = 0;
    let g = 0;
    while (!game.fightEnd && g++ < 6000) {
      game.stepFight(0.03);
      game.updateFx(0.03);
      game.units.forEach((u) => game.updateAnim(u, 0.03));
      if (game.parts.length > 400) {
        game.parts.length = 0;
      }
    }
    const w = game.fightEnd === 1;
    game.units = sa;
    game.fightEnd = sf;
    game.fightT = sft;
    game.parts.length = 0;
    game.floaters.length = 0;
    game.fx = [];
    game.simming = false;
    return w;
  };
  game.calibInf = function calibInf(policy) {
    const sT = game.team;
    game.team = [game.newMember(true)];
    let n = 1;
    while (n < 70) {
      for (let pk = 0; pk < (n > 1 && (n - 1) % 10 === 0 ? 2 : 1); pk++) {
        const o = game.genUpgrades();
        let k;
        if (policy === 'smart') {
          const pref = [
            'laser',
            'egg',
            'storm',
            'power',
            'vit',
            'robot',
            'armor',
            'gold',
            'fire',
            'titan',
            'phoenix',
            'flock',
            'vamp',
            'speed',
          ];
          o.sort((a, b) => pref.indexOf(a.id) - pref.indexOf(b.id));
          k = o[0].id;
        } else {
          k = o[(Math.random() * o.length) | 0].id;
        }
        const targets = k === 'flock' ? [game.team[0]] : game.team.filter((m) => game.canUpg(m, k));
        game.applyTo(
          policy === 'smart' ? targets[0] : targets[(Math.random() * targets.length) | 0],
          k,
        );
      }
      if (!game.simBattle(game.team, game.genInfEnemy(n))) {
        break;
      }
      n++;
    }
    game.team = sT;
    return n - 1;
  };
}
