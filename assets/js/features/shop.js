import { icon } from './metadata.js';
/** @module features/shop */

/**
 * Install shop capabilities into one isolated game session.
 * Cross-feature dependencies are explicit properties; no globals or inline scripts are required.
 * @param {object} game Mutable session and service registry, owned by the application root.
 * @returns {void}
 */
export function installShop(game) {
  game.seedRng = function seedRng(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return () => {
      h ^= h << 13;
      h ^= h >>> 17;
      h ^= h << 5;
      return ((h >>> 0) % 100000) / 100000;
    };
  };
  game.newDaily = function newDaily() {
    const rnd = game.seedRng(game.dayKey() + '|' + game.UID),
      fs = ['r', 'k', 'g', 'b', 'rl'].sort(() => rnd() - 0.5).slice(0, 3),
      m = [];
    fs.forEach((f) => {
      const c = game.MPOOL.filter((x) => x.f === f);
      m.push({ id: c[Math.floor(rnd() * c.length)].id, cl: 0 });
    });
    const b = {};
    ['k', 'b', 'r', 'g', 'rl'].forEach((f) => (b[f] = game.stN(game.ST[f])));
    return { d: game.dayKey(), b, m };
  };
  game.shopClean = function shopClean(o) {
    const r = {
      c: game.shN(o && o.c),
      own: {},
      eq: {},
      dq: null,
      ps: String((o && o.ps) || '').slice(0, 10),
      px: game.shN(o && o.px),
      bp: game.shN(o && o.bp, game.SH_TOP),
      ts: game.shN(o && o.ts, 1e15),
    };
    if (o && o.own) {
      game.CAT.forEach((x) => {
        if (o.own[x.id]) {
          r.own[x.id] = 1;
        }
      });
    }
    if (o && o.eq) {
      ['hat', 'shoes', 'suit'].forEach((s) => {
        const x = game.catOf(o.eq[s]);
        if (x && x.slot === s && r.own[x.id]) {
          r.eq[s] = x.id;
        }
      });
    }
    const q = o && o.dq;
    if (q && typeof q.d === 'string' && q.b && Array.isArray(q.m)) {
      r.dq = {
        d: q.d.slice(0, 12),
        b: {},
        m: q.m
          .slice(0, 3)
          .filter((x) => x && game.mDef(x.id))
          .map((x) => ({ id: x.id, cl: x.cl ? 1 : 0 })),
      };
      ['k', 'b', 'r', 'g', 'rl'].forEach((f) => (r.dq.b[f] = game.stN(q.b[f])));
    }
    return r;
  };
  game.shopRoll = function shopRoll() {
    if (!game.SH.dq || game.SH.dq.d !== game.dayKey() || !game.SH.dq.m.length) {
      game.SH.dq = game.newDaily();
    }
    if (game.SH.ps !== game.seasonKey()) {
      game.SH.ps = game.seasonKey();
      game.SH.px = 0;
      game.SH.bp = 0;
    }
  };
  game.shopLoad = function shopLoad(cloud) {
    const a = game.pj(game.lsGet('asadero_sh_' + game.UID)),
      b = cloud && typeof cloud === 'object' ? cloud : null;
    const pick = b && (!a || (+b.ts || 0) > (+a.ts || 0)) ? b : a;
    game.SH = game.shopClean(pick);
    game.shopRoll();
  };
  game.shopSave = function shopSave() {
    game.SH.ts = Date.now();
    game.lsSet('asadero_sh_' + game.UID, JSON.stringify(game.SH));
    game.cloudProfile();
  };
  game.claimables = function claimables() {
    if (!game.SH.dq) {
      return 0;
    }
    game.shopRoll();
    let n = 0;
    game.SH.dq.m.forEach((m) => {
      if (!m.cl && game.mDone(m)) {
        n++;
      }
    });
    n += Math.max(0, game.bpTier() - game.SH.bp) > 0 ? 1 : 0;
    return n;
  };
  game.shopRound = function shopRound(pw, boss) {
    game.shopRoll();
    if (pw) {
      game.SH.px += boss ? 25 : 5;
    }
    game.shopSave();
    const n = game.claimables();
    if (n > game.lastClaimable) {
      game.toast(icon('gift') + ' ¡Tienes recompensas por recoger en <b>Jugar</b>!');
    }
    game.lastClaimable = n;
  };
  game.claimMission = function claimMission(i) {
    const m = game.SH.dq.m[i];
    if (!m || m.cl || !game.mDone(m)) {
      return;
    }
    m.cl = 1;
    game.SH.c += game.mDef(m.id).g;
    game.SH.px += 30;
    game.snd.win && game.snd.win();
    game.shopSave();
    game.toast('__COIN__ +' + game.mDef(m.id).g + ' monedas');
    game.claimAfter();
  };
  game.claimPass = function claimPass() {
    const t = game.bpTier();
    let g = 0;
    for (let i = game.SH.bp + 1; i <= t; i++) {
      g += game.bpRew(i);
    }
    if (!g) {
      return;
    }
    game.SH.bp = t;
    game.SH.c += g;
    game.shopSave();
    game.toast('__COIN__ +' + g + ' monedas del pase');
    game.claimAfter();
  };
  game.buyItem = function buyItem(id) {
    const x = game.catOf(id);
    if (!x || game.SH.own[id]) {
      return;
    }
    if (game.SH.c < x.price) {
      game.toast('__COIN__ Te faltan <b>' + (x.price - game.SH.c) + '</b> monedas');
      return;
    }
    game.SH.c -= x.price;
    game.SH.own[id] = 1;
    if (x.slot === 'skin') {
      game.SKIN = id;
      game.saveProfile();
    } else {
      game.SH.eq[x.slot] = id;
    }
    game.shopSave();
    game.toast(icon('check') + ' «' + x.n + '» comprado y puesto');
    game.showShop();
  };
  game.cosPrev = function cosPrev(x) {
    const cs = x.slot === 'skin' ? null : { [x.slot]: x.id };
    const mo = game.getModel('chicken', 0, false, x.slot === 'skin' ? x.id : 'classic', null, cs);
    return [Object.assign({}, game.boundsOf(mo.parts), { robot: false, rbw: mo.rbw })];
  };
  game.heroPrev = function heroPrev() {
    const mo = game.getModel('chicken', 0, false, game.SKIN, null, game.SH.eq);
    return [Object.assign({}, game.boundsOf(mo.parts), { robot: false, rbw: mo.rbw })];
  };
  game.tabSync = function tabSync() {
    const tb = game.$('tabbar');
    if (!tb) {
      return;
    }
    const hm = game.$('home'),
      on =
        game.mode === 'menu' &&
        !!game.USER &&
        (!game.$('modal').classList.contains('off') || !!(hm && hm.classList.contains('on')));
    tb.style.display = on ? 'flex' : 'none';
    document.body.classList.toggle('hastab', on);
    if (!on) {
      return;
    }
    tb.querySelectorAll('button').forEach((b) =>
      b.classList.toggle('on', b.dataset.t === game.tabCur),
    );
    const dot = tb.querySelector('[data-t=shop] i');
    if (dot) {
      dot.style.display = game.claimables() ? 'block' : 'none';
    }
  };
  game.tabGo = function tabGo(t) {
    game.ensureAudio();
    game.snd.click();
    if (t === 'game') {
      game.showMenu();
    } else if (t === 'shop') {
      game.showShop();
    } else {
      game.showHen();
    }
  };
  game.menuShopHTML = function menuShopHTML() {
    const n = game.claimables();
    return (
      '<div class="coin">__COIN__ <b>' +
      game.SH.c +
      '</b>' +
      (n
        ? ' · <span style="color:#7bed9f">' + icon('gift') + ' ' + n + ' por recoger</span>'
        : '') +
      '</div>'
    );
  };
  game.showShop = function showShop() {
    game.tabCur = 'shop';
    game.hideScreens();
    game.closeStats();
    game.shopRoll();
    const h =
      '<div class="tabv"><h1>' +
      icon('shop') +
      ' Tienda</h1>' +
      game.coinChip() +
      '<p class="sm">Las monedas se consiguen con las misiones y el pase de batalla (pantalla Jugar).</p>' +
      '<div class="stabs sl">' +
      game.SLOTS.map(
        (s) =>
          '<button data-sl="' +
          s.id +
          '" class="' +
          (game.shSlot === s.id ? 'on' : '') +
          '">' +
          s.e +
          ' ' +
          s.n +
          '</button>',
      ).join('') +
      '</div><div class="skg" id="shg"></div></div>';
    game.$('mbox').classList.remove('hn');
    game.setModal(h, []);
    game
      .$('mbox')
      .querySelectorAll('[data-sl]')
      .forEach(
        (b) =>
          (b.onclick = () => {
            game.ensureAudio();
            game.snd.click();
            game.shSlot = b.dataset.sl;
            game.showShop();
          }),
      );
    const box = game.$('shg');
    game.CAT.filter((x) => x.slot === game.shSlot).forEach((x) => {
      const own = !!game.SH.own[x.id],
        d = document.createElement('div');
      d.className = 'sk' + (own ? ' sel' : '');
      d.style.borderColor = own ? '' : game.RAR[x.rar].c;
      d.innerHTML =
        '<canvas class="ic"></canvas><div class="nm">' +
        x.n +
        '</div><div class="rar" style="color:' +
        game.RAR[x.rar].c +
        '">' +
        game.RAR[x.rar].n +
        '</div><div class="ds">' +
        x.d +
        '</div><div class="pr">' +
        (own ? icon('check') + ' Tuyo' : '__COIN__ ' + x.price) +
        '</div>';
      if (!own) {
        d.onclick = () => {
          game.ensureAudio();
          game.snd.click();
          game.buyItem(x.id);
        };
      }
      box.appendChild(d);
      game.icons.push({ cv: d.querySelector('canvas'), spec: () => game.cosPrev(x) });
    });
  };
  game.passGain = function passGain() {
    let g = 0;
    for (let i = game.SH.bp + 1; i <= game.bpTier(); i++) {
      g += game.bpRew(i);
    }
    return g;
  };
  game.showPass = function showPass() {
    game.tabCur = 'game';
    game.hideScreens();
    game.shopRoll();
    game.passOpen = true;
    const t = game.bpTier(),
      pend = t - game.SH.bp,
      pc = t >= game.SH_TOP ? 100 : Math.round(((game.SH.px % game.PX_TIER) / game.PX_TIER) * 100);
    const h =
      '<div class="tabv"><h1>' +
      icon('gift') +
      ' Pase de batalla</h1>' +
      game.coinChip() +
      '<p class="sm">Temporada <b>' +
      game.SH.ps +
      '</b> · Nivel <b>' +
      t +
      '/' +
      game.SH_TOP +
      '</b><br>Ronda superada: +5 · Jefe: +25 · Misión: +30 puntos (300 por nivel)</p><div class="xpbar" style="max-width:380px;margin:0 auto 10px"><i style="width:' +
      pc +
      '%"></i></div>' +
      (pend > 0
        ? '<button class="btn" id="bpclaim" style="margin-bottom:10px">' +
          icon('gift') +
          ' Recoger ' +
          pend +
          ' (+' +
          game.passGain() +
          ' __COIN__)</button>'
        : '') +
      '<div class="skg bp" id="shl"></div></div>';
    game.$('mbox').classList.remove('hn');
    game.setModal(h, [{ t: 'Volver', cls: 'alt', f: game.showMenu }]);
    const box = game.$('shl');
    for (let i = 1; i <= game.SH_TOP; i++) {
      const d = document.createElement('div');
      d.className = 'sk' + (i <= game.SH.bp ? ' sel' : '') + (i > t ? ' lock' : '');
      d.style.cursor = 'default';
      d.innerHTML =
        '<div class="nm">Nivel ' +
        i +
        '</div><div class="pr">' +
        (i % 5 ? '' : icon('star') + ' ') +
        '__COIN__ ' +
        game.bpRew(i) +
        '</div><div class="ds">' +
        (i <= game.SH.bp
          ? icon('check') + ' Recogido'
          : i <= t
            ? icon('gift') + ' Listo'
            : icon('lock')) +
        '</div>';
      box.appendChild(d);
    }
    const bc = game.$('bpclaim');
    if (bc) {
      bc.onclick = () => {
        game.ensureAudio();
        game.snd.click();
        game.claimPass();
      };
    }
  };
  game.claimAfter = function claimAfter() {
    if (game.passOpen) {
      game.showPass();
    } else {
      const h = game.$('home');
      if (h && h.classList.contains('on')) {
        game.showHome();
      }
    }
  };
  game.showHome = function showHome() {
    const el = game.$('home');
    if (!el) {
      return;
    }
    game.shopRoll();
    game.tabCur = 'game';
    const rn = game.getRun(),
      hasRun = !!(rn && !rn.x && rn.tm),
      t = game.bpTier(),
      pend = t - game.SH.bp,
      pc = t >= game.SH_TOP ? 100 : Math.round(((game.SH.px % game.PX_TIER) / game.PX_TIER) * 100);
    const h =
      '<div class="hr"><div class="hg">' +
      (game.ONLINE
        ? '<button class="hb" id="hrank" aria-label="Ranking">' + icon('trophy') + '</button>'
        : '') +
      ('<button class="hb alt" id="hach" aria-label="Logros">' +
        icon('medal') +
        '</button></div><h1 class="ttl">EL ASADERO</h1><div class="hg">') +
      game.coinChip() +
      (game.ONLINE
        ? '<button class="hb out" id="hout" aria-label="Salir">' + icon('logout') + '</button>'
        : '') +
      '</div></div>' +
      ('<div class="home-grid"><section class="home-progress" aria-label="Progreso y recompensas"><section class="hpass" id="hpass"><span class="pass-icon">' +
        icon('gift') +
        '</span><div class="pm"><h2>Pase de batalla</h2><span>Nivel ') +
      t +
      '/' +
      game.SH_TOP +
      '</span><div class="xpbar"><i style="width:' +
      pc +
      '%"></i></div><small>' +
      (t >= game.SH_TOP
        ? '¡Completado!'
        : (game.SH.px % game.PX_TIER) + ' / ' + game.PX_TIER + ' puntos') +
      '</small></div>' +
      (pend > 0
        ? '<button class="go" id="hpclaim">' +
          icon('gift') +
          ' Recoger +' +
          game.passGain() +
          ' __COIN__</button>'
        : '<button class="go" id="hpview">Ver pase</button>') +
      '</section><section class="home-missions" aria-labelledby="missions-title"><div class="section-heading"><h2 id="missions-title">Misiones diarias</h2><span>Se renuevan cada día</span></div><div class="hmis" id="hmis"></div></section></section>' +
      '<section class="home-hero" aria-label="Tu próxima partida"><p class="home-eyebrow">El ring te espera</p><div class="hhen"><canvas id="hcv2"></canvas></div>' +
      '<div class="hname">' +
      (game.CNAME ? game.esc(game.CNAME) : 'Tu gallina') +
      ('<small>' + icon('star') + ' Nivel ') +
      game.lvOf(game.XP) +
      ' · ' +
      game.titleOf(game.lvOf(game.XP)) +
      (game.ONLINE ? ' · ' + icon('trophy') + ' ' + (game.BEST || 0) : '') +
      '</small></div>' +
      '<div class="hplay">' +
      (hasRun
        ? '<button class="btn" id="hcont">' +
          icon('arrow-right') +
          ' Continuar · ronda ' +
          rn.n +
          '</button>'
        : '') +
      '<button class="btn' +
      (hasRun ? ' alt' : '') +
      '" id="hnew">' +
      (hasRun ? icon('sparkles') + ' Nueva partida' : '¡JUGAR!') +
      '</button></div></section></div>';
    el.innerHTML = h;
    game.$('modal').classList.add('off');
    el.classList.add('on');
    const box = game.$('hmis');
    game.SH.dq.m.forEach((m, i) => {
      const d = game.mDef(m.id),
        p = game.mProg(m),
        ok = p >= d.t,
        r = document.createElement('div');
      r.className = 'hm' + (m.cl ? ' cl' : '');
      r.innerHTML =
        '<div class="mt">' +
        d.n +
        '<div class="xpbar"><i style="width:' +
        Math.round((p / d.t) * 100) +
        '%"></i></div></div><span style="font-size:11px;color:#c9bff0;font-weight:800">' +
        p +
        '/' +
        d.t +
        '</span>';
      const b = document.createElement('button');
      b.className = 'go' + (ok && !m.cl ? '' : ' dis');
      b.disabled = !ok || !!m.cl;
      b.innerHTML = m.cl ? icon('check') : ok ? '__COIN__ +' + d.g : '__COIN__ ' + d.g;
      if (ok && !m.cl) {
        b.onclick = () => {
          game.ensureAudio();
          game.snd.click();
          game.claimMission(i);
        };
      }
      r.appendChild(b);
      box.appendChild(r);
    });
    const on = (id, f) => {
      const e = game.$(id);
      if (e) {
        e.onclick = (ev) => {
          ev.stopPropagation();
          game.ensureAudio();
          game.snd.click();
          f();
        };
      }
    };
    on('hrank', game.showRanking);
    on('hpclaim', game.claimPass);
    on('hcont', game.resumeRun);
    on('hnew', game.newGame);
    on('hach', game.showAch);
    on('hout', game.doSignOut);
    on('hpview', game.showPass);
    game.icons.push({ cv: game.$('hcv2'), spec: game.heroPrev });
    game.coinify(el);
    game.tabSync();
  };
  game.showHen = function showHen() {
    game.tabCur = 'hen';
    game.hideScreens();
    game.closeStats();
    const L = game.lvOf(game.XP);
    const h =
      '<div class="tabv"><h1>' +
      icon('chicken') +
      ' Mi gallina</h1><div class="hen-layout"><section class="hen-overview" aria-label="Vista de tu gallina">' +
      game.profHTML() +
      '<label class="field-label" for="cname">Nombre de tu gallina</label><input class="inp" id="cname" maxlength="12" placeholder="Ponle nombre a tu pollo" autocomplete="off" spellcheck="false" value="' +
      game.CNAME +
      '" style="margin-bottom:8px"><canvas class="ic hen" id="hcv"></canvas>' +
      '</section><section class="hen-equipment" aria-label="Equipamiento"><h2>Equipamiento</h2><div class="stabs sl">' +
      game.SLOTS.map(
        (s) =>
          '<button data-sl="' +
          s.id +
          '" class="' +
          (game.hnSlot === s.id ? 'on' : '') +
          '">' +
          s.e +
          ' ' +
          s.n +
          '</button>',
      ).join('') +
      '</div><div class="skg" id="hng"></div></section></div></div>';
    game.setModal(h, []);
    game.$('mbox').classList.add('hn');
    game.$('cname').oninput = (e) => {
      game.CNAME = game.cleanName(e.target.value);
      game.lsSet('asadero_name_' + game.UID, game.CNAME);
      game.cloudProfile();
    };
    game
      .$('mbox')
      .querySelectorAll('[data-sl]')
      .forEach(
        (b) =>
          (b.onclick = () => {
            game.ensureAudio();
            game.snd.click();
            game.hnSlot = b.dataset.sl;
            game.showHen();
          }),
      );
    game.icons.push({ cv: game.$('hcv'), spec: game.heroPrev });
    const box = game.$('hng');
    const add = (name, sub, sel, ok, fn, prev) => {
      const d = document.createElement('div');
      d.className = 'sk' + (sel ? ' sel' : '') + (ok ? '' : ' lock');
      d.innerHTML =
        (prev ? '<canvas class="ic"></canvas>' : '<div class="ic none">∅</div>') +
        '<div class="nm">' +
        name +
        '</div><div class="ds">' +
        sub +
        '</div>';
      if (ok) {
        d.onclick = () => {
          game.ensureAudio();
          game.snd.click();
          fn();
        };
      }
      box.appendChild(d);
      if (prev) {
        game.icons.push({ cv: d.querySelector('canvas'), spec: prev });
      }
    };
    if (game.hnSlot === 'skin') {
      game.SKINS.forEach((sk) => {
        const lvl = sk.lvl < 9999,
          ok = lvl ? L >= sk.lvl : !!game.SH.own[sk.id];
        if (!lvl && !ok) {
          return;
        }
        add(
          sk.n,
          ok
            ? sk.id === game.SKIN
              ? icon('check') + ' Puesta'
              : sk.d
            : icon('lock') + ' Nivel ' + sk.lvl,
          sk.id === game.SKIN,
          ok,
          () => {
            game.SKIN = sk.id;
            game.saveProfile();
            game.showHen();
          },
          () => game.skinSpec(sk.id),
        );
      });
      const nx = game.SKINS.find((x) => x.lvl > L && x.lvl < 9999);
      if (nx) {
        add(nx.n, icon('lock') + ' Nivel ' + nx.lvl, false, false, null, () =>
          game.skinSpec(nx.id),
        );
      }
    } else {
      add(
        'Ninguno',
        'Quitar',
        !game.SH.eq[game.hnSlot],
        true,
        () => {
          delete game.SH.eq[game.hnSlot];
          game.shopSave();
          game.showHen();
        },
        null,
      );
      const own = game.CAT.filter((x) => x.slot === game.hnSlot && game.SH.own[x.id]);
      own.forEach((x) =>
        add(
          x.n,
          game.SH.eq[game.hnSlot] === x.id ? icon('check') + ' Puesto' : game.RAR[x.rar].n,
          game.SH.eq[game.hnSlot] === x.id,
          true,
          () => {
            game.SH.eq[game.hnSlot] = x.id;
            game.shopSave();
            game.showHen();
          },
          () => game.cosPrev(x),
        ),
      );
      if (!own.length) {
        const p = document.createElement('p');
        p.className = 'sm';
        p.style.gridColumn = '1/-1';
        p.innerHTML = 'Aún no tienes nada de esto. ¡Pásate por la ' + icon('gift') + ' Tienda!';
        box.appendChild(p);
      }
    }
  };
  game.drawCoin = function drawCoin(cv) {
    const dpr = Math.min(2, window.devicePixelRatio || 1),
      w = cv.clientWidth || 24,
      h = cv.clientHeight || 24;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    if (cv._p === undefined) {
      cv._p = Math.random() * 6.28;
    }
    const a = game.TT * 2.4 + cv._p,
      cs = Math.cos(a),
      sn = Math.sin(a);
    const r = Math.min(w, h) * 0.45,
      th = r * 0.3,
      cx = w / 2,
      cy = h / 2;
    const rx = Math.max(r * Math.abs(cs), r * 0.05),
      sg = cs >= 0 ? 1 : -1;
    const nx = cx + (sg * sn * th) / 2,
      fx = cx - (sg * sn * th) / 2;
    /* cara lejana */
    c.fillStyle = '#a56a00';
    c.beginPath();
    c.ellipse(fx, cy, rx, r, 0, 0, 7);
    c.fill();
    /* canto */
    const g = c.createLinearGradient(0, cy - r, 0, cy + r);
    g.addColorStop(0, '#ffe27a');
    g.addColorStop(0.5, '#d99a0a');
    g.addColorStop(1, '#8f5a00');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(fx, cy - r);
    c.lineTo(nx, cy - r);
    c.lineTo(nx, cy + r);
    c.lineTo(fx, cy + r);
    c.closePath();
    c.fill();
    /* cara cercana */
    const fg = c.createRadialGradient(nx - rx * 0.35, cy - r * 0.4, r * 0.05, nx, cy, r * 1.05);
    fg.addColorStop(0, '#fff6b0');
    fg.addColorStop(0.35, '#ffd23a');
    fg.addColorStop(1, '#d08c00');
    c.fillStyle = fg;
    c.beginPath();
    c.ellipse(nx, cy, rx, r, 0, 0, 7);
    c.fill();
    c.lineWidth = Math.max(1, r * 0.07);
    c.strokeStyle = '#a86b00';
    c.stroke();
    /* aro interior y brillo */
    c.lineWidth = Math.max(1, r * 0.06);
    c.strokeStyle = 'rgba(150,90,0,.75)';
    c.beginPath();
    c.ellipse(nx, cy, rx * 0.74, r * 0.74, 0, 0, 7);
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,.45)';
    c.beginPath();
    c.ellipse(nx - rx * 0.32, cy - r * 0.4, rx * 0.18, r * 0.1, -0.5, 0, 7);
    c.fill();
    c.fillStyle = 'rgba(60,30,0,' + ((1 - Math.abs(cs)) * 0.28).toFixed(3) + ')';
    c.beginPath();
    c.ellipse(nx, cy, rx, r, 0, 0, 7);
    c.fill();
  };
  game.drawCoins = function drawCoins() {
    for (let i = game.coins.length - 1; i >= 0; i--) {
      if (!game.coins[i].isConnected) {
        game.coins.splice(i, 1);
        continue;
      }
      game.drawCoin(game.coins[i]);
    }
  };
  game.coinify = function coinify(root) {
    if (!root) {
      return;
    }
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT),
      L = [];
    let n;
    while ((n = w.nextNode())) {
      if (n.nodeValue.indexOf('__COIN__') >= 0) {
        L.push(n);
      }
    }
    L.forEach((n) => {
      const parts = n.nodeValue.split('__COIN__'),
        f = document.createDocumentFragment();
      parts.forEach((s, i) => {
        if (i > 0) {
          const cv = document.createElement('canvas');
          cv.className = 'c3';
          f.appendChild(cv);
          game.coins.push(cv);
        }
        if (s) {
          f.appendChild(document.createTextNode(s));
        }
      });
      n.parentNode.replaceChild(f, n);
    });
    for (let i = game.icons.length - 1; i >= 0; i--) {
      if (game.icons[i].cv && !game.icons[i].cv.isConnected) {
        game.icons.splice(i, 1);
      }
    }
  };
  game.SH_TOP = game.catalog.balance.passMax;
  game.PX_TIER = game.catalog.balance.passTierPoints;
  game.SH = { c: 0, own: {}, eq: {}, dq: null, ps: '', px: 0, bp: 0, ts: 0 };
  game.tabCur = 'game';
  game.shSub = 'shop';
  game.shSlot = 'hat';
  game.hnSlot = 'hat';
  game.cosOf = () => game.SH.eq;
  game.shN = (v, m) => Math.max(0, Math.min(m || 1e9, Math.floor(+v || 0)));
  game.dayKey = () => {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  };
  game.seasonKey = () => {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1);
  };
  game.MPOOL = structuredClone(game.catalog.missions);
  game.mDef = (id) => game.MPOOL.find((x) => x.id === id);
  game.mProg = (m) => {
    const d = game.mDef(m.id);
    return Math.min(d.t, Math.max(0, game.stN(game.ST[d.f]) - game.stN(game.SH.dq.b[d.f])));
  };
  game.mDone = (m) => game.mProg(m) >= game.mDef(m.id).t;
  game.bpTier = () => Math.min(game.SH_TOP, Math.floor(game.SH.px / game.PX_TIER));
  game.bpRew = (t) => 5 + 2 * t + (t % 5 ? 0 : 25);
  game.lastClaimable = 0;
  game.wrapFn = (name, after) => {
    const f = game[name];
    game[name] = function () {
      const r = f.apply(this, arguments);
      after();
      return r;
    };
  };
  game.wrapFn('setModal', game.tabSync);
  game.wrapFn('hideScreens', () => {
    const h = game.$('home');
    if (h) {
      h.classList.remove('on');
    }
    game.passOpen = false;
    game.tabSync();
  });
  game.coinChip = () => '<div class="coin">__COIN__ <b>' + game.SH.c + '</b></div>';
  game.passOpen = false;
  (function () {
    const d = document.createElement('div');
    d.id = 'home';
    document.body.appendChild(d);
  })();
  game.showMenuBase = game.showMenu;
  game.showMenu = function () {
    game.showMenuBase();
    game.showHome();
  };
  game.showProfile = function () {
    game.showHen();
  };
  (function () {})();
  game.coins = [];
  game.wrapFn('setModal', () => game.coinify(game.$('mbox')));
  game.wrapFn('toast', () => game.coinify(game.$('toast')));
}
