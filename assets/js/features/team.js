import { icon } from './metadata.js';
/** @module features/team */

/**
 * Install team capabilities into one isolated game session.
 * Cross-feature dependencies are explicit properties; no globals or inline scripts are required.
 * @param {object} game Mutable session and service registry, owned by the application root.
 * @returns {void}
 */
export function installTeam(game) {
  game.newMember = function newMember(hero) {
    return {
      k: hero ? 'chicken' : 'chick',
      hero: !!hero,
      t: 0,
      l: {},
      base: hero ? 1 : 0.55,
      fresh: true,
      skin: hero ? game.SKIN : null,
    };
  };
  game.canUpg = function canUpg(m, k) {
    const l = m.l[k] || 0;
    if (game.UPG[k].sp) {
      return m.hero && m.spec === game.UPG[k].sp && l < game.UPG[k].max;
    }
    if ((k === 'laser' || k === 'egg' || k === 'storm') && !m.hero) {
      return false;
    }
    if (m.hero && m.spec && !game.specOK(k)) {
      return false;
    }
    if (k === 'robot') {
      return m.t === 0;
    }
    if (k === 'titan') {
      return m.t === 1;
    }
    if (k === 'phoenix') {
      return !game.team.some((x) => (x.l.phoenix || 0) > 0);
    }
    if (k === 'flock') {
      return m.hero && l < game.UPG.flock.max;
    }
    return l < game.UPG[k].max;
  };
  game.memberStats = function memberStats(m) {
    const g = (k) => m.l[k] || 0,
      t = m.t,
      b = m.base,
      sp = game.specMul(m);
    const hp =
        30 *
        b *
        Math.pow(1.35, g('vit')) *
        game.HM[t] *
        game.HPM *
        (1 + 0.25 * game.rl('hp')) *
        sp.hp,
      atk = 6 * b * Math.pow(1.3, g('power')) * game.AM[t] * (1 + 0.2 * game.rl('dmg')) * sp.atk;
    const o = {
      hp,
      atk,
      rate: 0.7 * Math.pow(0.9, g('speed')) * Math.pow(0.9, game.rl('spd')),
      spd: 3.6 * Math.pow(1.12, g('speed')) * Math.pow(1.1, game.rl('spd')) * sp.spd,
      dmgMul: Math.pow(0.8, g('armor')) * sp.dmg,
      vamp: 0.12 * g('vamp') + 0.08 * game.rl('vamp') + sp.vamp,
      fireDps: g('fire') ? atk * 0.35 * (1 + 0.3 * (g('fire') - 1)) : 0,
      crit: Math.min(0.8, (g('gold') ? 0.15 + 0.12 * g('gold') : 0) + 0.12 * game.rl('crit')),
      phoenix: g('phoenix'),
      regen: hp * 0.02 * game.rl('regen'),
      rev: game.rl('rev'),
      laser: null,
      egg: null,
      storm: null,
    };
    if (g('laser')) {
      const l = g('laser');
      o.laser = {
        cd: Math.max(1.5, 4.2 - 0.5 * l),
        n: 1 + Math.floor(l / 2),
        dmg: atk * 2.6 * (1 + 0.25 * (l - 1)),
      };
    }
    if (g('egg')) {
      const l = g('egg');
      o.egg = {
        cd: Math.max(2.2, 5 - 0.5 * l),
        dmg: atk * 2.2 * (1 + 0.3 * (l - 1)),
        rad: 2 + 0.2 * l,
      };
    }
    if (g('storm')) {
      const l = g('storm');
      o.storm = { cd: Math.max(2.5, 6 - 0.7 * l), dmg: atk * 1.3 * (1 + 0.3 * (l - 1)), rad: 3 };
    }
    if (m.hero && m.spec) {
      game.specStats(m, o);
    }
    return o;
  };
  game.fitsRing = function fitsRing(list) {
    const sz = list
      .map(
        (e) =>
          game.getModel(e.k, e.t || 0, false, null, null).size * 1.4 * game.SM[e.t || 0] * 1.08,
      )
      .sort((a, b) => b - a);
    let colX = 1.8,
      i = 0;
    while (i < sz.length) {
      let used = 0,
        mx = 0,
        n = 0;
      while (i < sz.length) {
        const c = sz[i] * 1.05 + 0.45;
        if (used + c > 9.4 && n) {
          break;
        }
        used += c;
        mx = Math.max(mx, c);
        i++;
        n++;
      }
      colX += mx;
    }
    return colX <= 9.9;
  };
  game.genInfEnemy = function genInfEnemy(n) {
    const rng = game.mulberry(n * 104729 + 17),
      top = Math.min(10, Math.floor((n - 1) * 0.6)),
      lo = Math.max(0, top - 2);
    let target = game.INF_BASE * Math.pow(game.INF_G, n - 1) * Math.exp(game.INF_E * n * n);
    const cap = n >= 18 ? 2 : n >= 9 ? 1 : 0,
      t = [];
    if (n % 10 === 0) {
      /* JEFE: una bestia gigante */
      target *= 1.2;
      const bk = ['bear', 'gorilla', 'elephant', 'dino'][(n / 10 - 1) % 4],
        bs = game.SP[bk],
        raw = bs.hp * game.HM[2] * bs.atk * game.AM[2];
      return [{ k: bk, t: 2, boss: true, f: Math.sqrt(target / raw), fresh: true }];
    }
    let g = 0;
    while (game.S(t) < target && g++ < 150) {
      const nk = game.KEYS[lo + Math.floor(rng() * (top - lo + 1))];
      if (t.length >= game.MAXN || !game.fitsRing(t.concat([{ k: nk, t: 0 }]))) {
        /* ring lleno: primero mejoras de tier, luego más fuerza */
        const k = game.pickUp(t, rng, Math.max(cap, 1));
        if (k) {
          const sv = t.map((e) => e.t || 0);
          game.upSpecies(t, k, true);
          if (game.S(t) <= target * 1.1 && game.fitsRing(t)) {
            continue;
          }
          t.forEach((e, i) => {
            e.t = sv[i];
          });
        }
        break;
      }
      if (cap > 0 && t.length >= 3 && rng() < (t.length > 12 ? 0.7 : 0.25)) {
        const k = game.pickUp(t, rng, cap);
        if (k) {
          const sv = t.map((e) => e.t || 0);
          game.upSpecies(t, k, true);
          if (game.fitsRing(t)) {
            continue;
          }
          t.forEach((e, i) => {
            e.t = sv[i];
          });
        }
      }
      t.push({ k: nk, t: 0, fresh: true });
    }
    const sc = game.S(t);
    if (sc < target && t.length) {
      const f = Math.sqrt((game.FEWK * target) / sc);
      t.forEach((e) => {
        e.f = f;
      });
    }
    return t;
  };
  game.genUpgrades = function genUpgrades() {
    const av = Object.keys(game.UPG).filter(
      (k) => game.specOK(k) && game.team.some((m) => game.canUpg(m, k)),
    );
    const ex = av.filter((k) => game.UPG[k].sp),
      pk = [];
    if (ex.length) {
      pk.push(ex[(Math.random() * ex.length) | 0]);
    } /* siempre sale 1 de la especialidad */
    const rest = av.filter((k) => !pk.includes(k));
    while (pk.length < game.OFFER_N && rest.length) {
      pk.push(rest.splice((Math.random() * rest.length) | 0, 1)[0]);
    }
    for (let i = pk.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [pk[i], pk[j]] = [pk[j], pk[i]];
    }
    return pk.map((k) => ({ id: k }));
  };
  game.applyTo = function applyTo(m, k) {
    if (k === 'robot') {
      m.t = 1;
    } else if (k === 'titan') {
      m.t = 2;
    } else {
      m.l[k] = (m.l[k] || 0) + 1;
    }
    m.fresh = true;
    if (
      game.UPG[k].sp &&
      m.l[k] === game.UPG[k].max &&
      !game.simming &&
      typeof game.ULT !== 'undefined'
    ) {
      game.banner('★ ' + game.ULT[k].n.toUpperCase() + ' ★', game.SPECS[m.spec].col);
      game.tone(300, 1500, 0.5, 'triangle', 0.09);
    }
    if (k === 'flock') {
      game.team.push(game.newMember(false), game.newMember(false));
    }
  };
  game.memberName = function memberName(m) {
    if (m.hero) {
      return game.CNAME || 'Tu gallina';
    }
    let i = 0;
    for (const e of game.team) {
      if (!e.hero) {
        i++;
        if (e === m) {
          break;
        }
      }
    }
    return 'Pollito ' + i;
  };
  game.memberDesc = function memberDesc(m) {
    const a = Object.keys(m.l)
      .filter((k) => m.l[k] && k !== 'flock')
      .map((k) => game.UPG[k].n + ' ' + m.l[k]);
    if (m.t) {
      a.unshift(m.t === 1 ? 'Robot' : 'Titán');
    }
    if (m.hero && m.spec) {
      a.unshift(game.SPECS[m.spec].n);
    }
    return a.length ? a.join(' · ') : 'Sin mejoras todavía';
  };
  game.mkUnit = function mkUnit(side, e) {
    const sp = game.SP[e.k],
      t = e.t || 0,
      gold = !!(e.l && e.l.gold > 0),
      m = game.getModel(e.k, t, gold, e.hero ? e.skin : null, e.hero ? e.spec : null);
    let hp = sp.hp * game.HM[t] * game.HPM * (e.f || 1),
      atk = sp.atk * game.AM[t] * (e.f || 1),
      rate = sp.rate,
      spd = sp.spd;
    const sc =
      1.4 *
      game.SM[t] *
      (e.boss
        ? e.k === 'elephant' || e.k === 'dino'
          ? 0.8
          : 1
        : Math.min(1.08, 1 + 0.05 * Math.log(Math.max(1, e.f || 1))));
    const fresh = e.fresh;
    e.fresh = false;
    const u = {
      side,
      key: e.k,
      tier: t,
      robot: t > 0,
      model: m.parts,
      sc,
      hw: m.hw,
      size: m.size * sc,
      top: m.top * sc,
      x: 0,
      y: 0,
      z: 0,
      hx: 0,
      hz: 0,
      yaw: side ? Math.PI : 0,
      pitch: 0,
      roll: 0,
      lunge: 0,
      state: 'idle',
      gait: Math.random() * 6,
      seed: Math.random() * 10,
      wk: 0,
      cd: Math.random() * 0.5,
      atkT: 0,
      hit: false,
      flash: 0,
      kx: 0,
      kz: 0,
      alpha: 1,
      dieT: 0,
      spawnT: fresh ? -Math.random() * 0.4 : 1,
      landed: !fresh,
      tgt: null,
      dead: false,
      dying: false,
      win: false,
      rd: Math.random() < 0.5 ? 1 : -1,
      dmgMul: 1,
      vamp: 0,
      fireDps: 0,
      crit: 0,
      phoenix: 0,
      burn: null,
      hero: false,
      boss: !!e.boss,
      rbw: m.rbw,
    };
    if (e.l) {
      const h = game.memberStats(e);
      hp = h.hp;
      atk = h.atk;
      rate = h.rate;
      spd = h.spd;
      if (e.hero) {
        u.sc = sc * 1.15;
        u.size *= 1.15;
        u.top *= 1.15;
        u.hero = true;
      }
      Object.assign(u, {
        ref: e,
        invuln: 0,
        dmgMul: h.dmgMul,
        vamp: h.vamp,
        fireDps: h.fireDps,
        crit: h.crit,
        phoenix: h.phoenix,
        regen: h.regen,
        rev: h.rev,
        ab: h,
        laserT: 1.2,
        eggT: 2,
        stormT: 2.5,
        member: true,
        sk: h.sk || null,
        specCol: e.hero && e.spec ? game.SPECS[e.spec].col : null,
      });
    }
    u.hp = hp;
    u.max = hp;
    u.atk = atk;
    u.rate = rate * (t ? 0.95 : 1);
    u.spd = spd;
    return u;
  };
  game.formation = function formation(list, sgn) {
    const s = [...list].sort((a, b) => b.size - a.size),
      cell = (u) => u.size * 1.05 + 0.45;
    let colX = 1.8,
      i = 0;
    while (i < s.length) {
      const col = [];
      let used = 0,
        mx = 0;
      while (i < s.length) {
        const c = cell(s[i]);
        if (used + c > 9.4 && col.length) {
          break;
        }
        col.push([s[i], c]);
        used += c;
        mx = Math.max(mx, c);
        i++;
      }
      let z = -used / 2;
      col.forEach(([u, c]) => {
        u.hx = sgn * (colX + mx / 2);
        u.hz = z + c / 2;
        z += c;
      });
      colX += mx;
    }
  };
  game.buildArena = function buildArena() {
    const a = game.team.map((e) => game.mkUnit(0, e)),
      b = game.bteam.map((e) => game.mkUnit(1, e));
    game.formation(a, -1);
    game.formation(b, 1);
    game.units = a.concat(b);
    game.units.forEach((u) => {
      u.x = u.hx;
      u.z = u.hz;
    });
    game.updateRosters();
  };
  game.rosterHTML = function rosterHTML(list) {
    if (!list.length) {
      return '<span style="opacity:.7">— nadie —</span>';
    }
    const m = {};
    list.forEach((e) => {
      const id = e.k + (e.t || 0) + (e.boss ? 'B' : '');
      m[id] = m[id] || { k: e.k, t: e.t || 0, n: 0, b: !!e.boss };
      m[id].n++;
    });
    return Object.values(m)
      .map(
        (g) =>
          '<span class="chip">' +
          (g.b ? icon('skull') : '') +
          game.TIERN[g.t] +
          game.SP[g.k].e +
          '×' +
          g.n +
          '</span>',
      )
      .join('');
  };
  game.updateRosters = function updateRosters() {
    const hero = game.team.find((m) => m.hero);
    let h = '<b>TU EQUIPO</b>';
    if (hero) {
      h +=
        '<span class="chip">' +
        game.TIERN[hero.t] +
        (icon('star') + icon('chicken') + '</span>') +
        (hero.spec ? '<span class="chip">' + game.SPECS[hero.spec].n + '</span>' : '');
      Object.keys(hero.l).forEach((k) => {
        if (game.UEM[k] && k !== 'flock') {
          h += '<span class="chip">' + game.UEM[k] + hero.l[k] + '</span>';
        }
      });
    }
    Object.keys(game.RL).forEach((k) => {
      if (game.RL[k] && game.REL[k]) {
        h +=
          '<span class="chip">' +
          game.REL[k].e +
          (game.RL[k] > 1 ? '×' + game.RL[k] : '') +
          '</span>';
      }
    });
    const ch = game.team.filter((e) => !e.hero).length;
    if (ch) {
      h += '<span class="chip">' + icon('chick') + '×' + ch + '</span>';
    }
    game.$('rosL').innerHTML = h;
    game.$('rosR').innerHTML =
      '<b>ENEMIGOS · RONDA ' + game.infN + '</b>' + game.rosterHTML(game.bteam);
  };
  game.updatePips = function updatePips() {
    game.$('pips').innerHTML =
      '<div style="font-weight:900;font-size:15px;padding:0 6px">RONDA ' +
      game.infN +
      ' · récord ' +
      game.BEST +
      '</div>';
    game.$('lvl').innerHTML =
      icon('infinity') + ' INFINITO<small>Sobrevive todo lo que puedas</small>';
  };
  game.banner = function banner(t, color) {
    const b = game.$('banner');
    b.innerHTML = t;
    b.style.color = color || '#ffe08a';
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
  };
  game.setModal = function setModal(html, btns) {
    const m = game.$('mbox');
    m.innerHTML = html + '<div class="row" id="mrow"></div>';
    btns.forEach((b) => {
      const x = document.createElement('button');
      x.className = 'btn ' + (b.cls || '');
      x.innerHTML = b.t;
      x.onclick = () => {
        game.ensureAudio();
        game.snd.click();
        b.f();
      };
      game.$('mrow').appendChild(x);
    });
    game.$('modal').classList.remove('off');
  };
  game.hideScreens = function hideScreens() {
    game.$('modal').classList.add('off');
    game.$('panel').classList.remove('on');
    game.icons.length = 0;
  };
  game.resetBattle = function resetBattle() {
    game.runId++;
    game.units = [];
    game.parts.length = 0;
    game.floaters.length = 0;
    game.fx = [];
    game.st = 'menu';
    game.team = [];
    game.bteam = [];
  };
  game.SP.dino = {
    es: ['Dinosaurio', 'Dinosaurios'],
    e: icon('wolf'),
    hp: 820,
    atk: 115,
    rate: 1.2,
    spd: 2.9,
    mk: () => {
      const P = game.quad({
        L: 2.5,
        H: 1.45,
        W: 1.0,
        leg: 1.0,
        lw: 0.46,
        head: 1.0,
        sn: 0.5,
        col: '#4f8f3a',
        hcol: '#5a9d42',
        snc: '#5a9d42',
        belly: '#c9d98a',
        tail: 1.9,
        tailh: 0.42,
        hup: 0.15,
        legc: '#417a30',
      });
      const hd = P.head.hd,
        yb = 1.0 + 1.45 / 2;
      [-0.9, -0.45, 0, 0.45, 0.9].forEach((x) =>
        P.push(game.B([x, yb + 1.45 / 2 + 0.1, 0], [0.28, 0.3, 0.12], '#2f5a24', 'acc')),
      );
      [1, -1].forEach((z) => {
        P.push(
          game.B([1.35, yb - 0.1, z * 0.5], [0.3, 0.12, 0.12], '#417a30', 'limb', {
            an: 'arm',
            pv: [1.25, yb, z * 0.5],
            ph: z > 0 ? 0 : 3.14,
          }),
        );
      });
      const hx = 1.25 + 0.25,
        hy = yb + 1.45 * 0.3 + 0.15;
      [0, 1, 2].forEach((i) =>
        [1, -1].forEach((z) =>
          P.push(
            game.B(
              [hx + 0.5 + 0.35 + 0.02 * i, hy - 0.38, z * (0.18 - 0.06 * i)],
              [0.06, 0.12, 0.05],
              '#fff8e0',
              'acc',
              hd,
            ),
          ),
        ),
      );
      return P;
    },
  };
  game.UPG = Object.fromEntries(
    Object.entries(game.catalog.upgrades)
      .filter(([, definition]) => !definition.sp)
      .map(([id, definition]) => [id, { ...definition }]),
  );
  game.UEM = {
    gold: '__COIN__',
    laser: icon('target'),
    egg: icon('egg'),
    storm: icon('feather'),
    fire: icon('flame'),
    vamp: icon('moon'),
    armor: icon('shield'),
    speed: icon('bolt'),
    power: icon('sword'),
    vit: icon('heart'),
    flock: icon('chick'),
    phoenix: icon('sun'),
  };
  game.INF_BASE = game.catalog.balance.enemyBase;
  game.INF_G = game.catalog.balance.enemyGrowth;
  game.INF_E = game.catalog.balance.enemyExponent;
  game.FEWK = game.catalog.balance.enemyStrength;
  game.MAXN = game.catalog.balance.enemyLimit;
  game.OFFER_N = 3;
  game.plural = (k, n) => game.SP[k].es[n === 1 ? 0 : 1];
}
