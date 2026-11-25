/** @module features/chests */
import { icon } from './metadata.js';
/**
 * Install chests, skin progression and equipment bonuses for one session.
 * @param {object} game Session registry with shop, account and combat services installed.
 * @returns {void}
 */
export function installChests(game) {
  game.ensureSh = function ensureSh() {
    if (!game.SH.ky) {
      game.SH.ky = { n: 0, e: 0 };
    }
    if (!game.SH.sc) {
      game.SH.sc = {};
    }
    if (!game.SH.sl) {
      game.SH.sl = {};
    }
    game.CS.forEach((s) => {
      if (game.SH.own[s.id] && !game.SH.sc[s.id]) {
        game.SH.sc[s.id] = 1;
      }
      if (game.SH.own[s.id] && !game.SH.sl[s.id]) {
        game.SH.sl[s.id] = 1;
      }
    });
  };
  game.addKey = function addKey(t, n) {
    game.ensureSh();
    game.SH.ky[t] += n;
    game.shopSave();
  };
  game.cosBuff = function cosBuff(x) {
    const t = game.SLOTB[x.slot][game.hashId(x.id) % 2];
    return { t, v: game.BV[x.rar] * (t === 'spd' ? 0.8 : 1) };
  };
  game.skinBuff = function skinBuff(id, L) {
    const x = game.catOf(id),
      t = ['dmg', 'hp', 'crit', 'vamp', 'def'][game.hashId(id) % 5];
    return { t, v: game.BV[x.rar] * 0.4 * L * (t === 'vamp' ? 0.6 : 1) };
  };
  game.heroBuffs = function heroBuffs() {
    game.ensureSh();
    const b = { dmg: 0, hp: 0, crit: 0, def: 0, spd: 0, vamp: 0 };
    ['hat', 'shoes', 'suit'].forEach((s) => {
      const x = game.catOf(game.SH.eq[s]);
      if (x && game.SLOTB[x.slot]) {
        const c = game.cosBuff(x);
        b[c.t] += c.v;
      }
    });
    const k = game.curSkinBuff();
    if (k) {
      b[k.t] += k.v;
    }
    return b;
  };
  game.lvSkinBuff = function lvSkinBuff(id) {
    const sk = game.SKINS.find((x) => x.id === id);
    if (!sk || sk.lvl >= 9999 || id === 'classic') {
      return null;
    }
    const t = ['dmg', 'hp', 'crit', 'spd', 'def'][game.hashId(id) % 5];
    return { t, v: game.BV[game.lvRar(sk.lvl)] * 0.8 * (t === 'spd' ? 0.8 : 1) };
  };
  game.curSkinBuff = function curSkinBuff() {
    if (game.chestSkin(game.SKIN) && game.SH.own[game.SKIN]) {
      return game.skinBuff(game.SKIN, game.skLvl(game.SKIN));
    }
    return game.lvSkinBuff(game.SKIN);
  };
  game.buffPanel = function buffPanel() {
    game.ensureSh();
    const rows = [];
    const sk = game.SKINS.find((x) => x.id === game.SKIN),
      kb = game.curSkinBuff();
    if (sk && kb) {
      rows.push([
        '' +
          icon('paint') +
          ' Skin ' +
          sk.n +
          (game.chestSkin(game.SKIN) ? ' (nv ' + game.skLvl(game.SKIN) + ')' : ''),
        kb,
      ]);
    }
    [
      ['hat', '' + icon('crown') + ''],
      ['shoes', '' + icon('bolt') + ''],
      ['suit', '' + icon('shield') + ''],
    ].forEach(([sl, ic]) => {
      const x = game.catOf(game.SH.eq[sl]);
      if (x && game.SLOTB[x.slot]) {
        rows.push([ic + ' ' + x.n, game.cosBuff(x)]);
      }
    });
    let h = '<b>' + icon('chart') + ' Estadísticas extra</b>';
    if (!rows.length) {
      h += '<span class="bnr">Sin bonos todavía: equipa cosméticos o una skin.</span>';
    } else {
      rows.forEach((r) => {
        h +=
          '<span class="bnr"><i>' +
          r[0] +
          '</i><em>+' +
          game.pct(r[1].v) +
          '% ' +
          game.BTX[r[1].t] +
          '</em></span>';
      });
      h +=
        '<span class="bnr tot"><i>Total</i><em>' + game.buffTxt(game.heroBuffs()) + '</em></span>';
    }
    return h;
  };
  game.rr = function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  };
  game.drawChest = function drawChest(cv, kind, o) {
    const S = 2,
      W = 140,
      H = 110;
    if (cv.width !== W * S) {
      cv.width = W * S;
      cv.height = H * S;
    }
    const c = cv.getContext('2d');
    c.setTransform(S, 0, 0, S, 0, 0);
    c.clearRect(0, 0, W, H);
    const ep = kind === 'e',
      wood = ep ? '#5b2a9c' : '#9a6330',
      dark = ep ? '#3a176e' : '#6b4119',
      band = ep ? '#ffd24a' : '#c8ccd8',
      bandD = ep ? '#c9941a' : '#8f95a6',
      bx = 20,
      bw = 100,
      by = 58,
      bh = 42;
    if (o > 0) {
      const g = c.createRadialGradient(70, 56, 4, 70, 56, 62);
      g.addColorStop(0, (ep ? 'rgba(210,150,255,' : 'rgba(255,230,140,') + 0.95 * o + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    }
    c.fillStyle = 'rgba(0,0,0,.35)';
    c.beginPath();
    c.ellipse(70, 102, 52, 8, 0, 0, 7);
    c.fill();
    c.fillStyle = wood;
    game.rr(c, bx, by, bw, bh, 5);
    c.fill();
    c.fillStyle = dark;
    c.fillRect(bx, by + 14, bw, 2);
    c.fillRect(bx, by + 28, bw, 2);
    if (o > 0) {
      c.fillStyle = ep ? '#ffe9ff' : '#fff3b0';
      c.fillRect(bx + 5, by - 1, bw - 10, 3 + 7 * o);
    }
    [38, 96].forEach((x) => {
      c.fillStyle = band;
      c.fillRect(x, by, 8, bh);
      c.fillStyle = bandD;
      c.fillRect(x + 6, by, 2, bh);
    });
    const lh = 30 * (1 - 0.85 * o),
      ly = by - lh - 14 * o + (o > 0 ? 0 : 0);
    c.fillStyle = ep ? '#6d34b8' : '#b27838';
    game.rr(c, bx - 2, ly, bw + 4, lh + 4, 8);
    c.fill();
    [38, 96].forEach((x) => {
      c.fillStyle = band;
      c.fillRect(x, ly, 8, lh + 2);
    });
    if (o < 0.3) {
      c.fillStyle = ep ? '#ffe27a' : '#e8c04a';
      game.rr(c, 62, by - 8, 16, 17, 3);
      c.fill();
      c.fillStyle = '#3a2a10';
      c.beginPath();
      c.arc(70, by - 1, 2.6, 0, 7);
      c.fill();
      c.fillRect(69, by - 1, 2, 6);
    }
    if (o > 0.2) {
      c.fillStyle = 'rgba(255,255,255,' + 0.9 * o + ')';
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05 + game.TT * 2,
          r = 14 + (i % 3) * 10 + o * 16;
        c.fillRect(70 + Math.cos(a) * r * 1.3, 44 - Math.abs(Math.sin(a)) * r * 0.9, 2.4, 2.4);
      }
    }
  };
  game.skinRarW = function skinRarW(kind) {
    return game.catalog.chests.weights[kind === 'e' ? 'e' : 'n'];
  };
  game.rollSkin = function rollSkin(kind) {
    const w = game.skinRarW(kind);
    let r = Math.random() * 100,
      rar = 'rare';
    for (const k of ['rare', 'epic', 'legend']) {
      if (r < w[k]) {
        rar = k;
        break;
      }
      r -= w[k];
    }
    const pool = game.CS.filter((s) => s.rar === rar);
    return pool[(Math.random() * pool.length) | 0];
  };
  game.showChests = function showChests() {
    game.tabCur = 'chest';
    game.hideScreens();
    game.closeStats();
    game.ensureSh();
    const k = game.SH.ky;
    const h =
      '<div class="tabv"><h1>' +
      icon('gift') +
      ' Cofres</h1>' +
      game.coinChip() +
      (' <div class="coin">' + icon('lock') + ' <b>') +
      k.n +
      ('</b> · ' + icon('lock') + ' <b>') +
      k.e +
      '</b></div>' +
      '<p class="sm">Las llaves caen de los jefes (poca probabilidad), de misiones difíciles y del pase de batalla.</p>' +
      '<div class="chrow"><div class="chb"><canvas class="chc" id="chN"></canvas><b>Cofre normal</b><small>Raro 70% · Épico 26% · Legendario 4%</small><button class="cbt' +
      (k.n ? '' : ' dis') +
      ('" id="oN">Abrir · ' + icon('lock') + ' 1</button></div>') +
      '<div class="chb ep"><canvas class="chc" id="chE"></canvas><b>Cofre épico</b><small>Raro 20% · Épico 55% · Legendario 25%</small><button class="cbt' +
      (k.e ? '' : ' dis') +
      ('" id="oE">Abrir · ' + icon('lock') + ' 1</button></div></div>') +
      '<p class="sm">Bonos activos: <b>' +
      game.buffTxt(game.heroBuffs()) +
      '</b></p>' +
      '<p class="sm">Si te toca una skin repetida, sube de nivel con monedas: nivel 2 con 2 copias, 3 con 4, 4 con 8, 5 con 16.</p>' +
      '<div class="spl" id="skl"></div></div>';
    game.$('mbox').classList.remove('hn');
    game.setModal(h, []);
    game.drawChest(game.$('chN'), 'n', 0);
    game.drawChest(game.$('chE'), 'e', 0);
    game.$('oN').onclick = () => {
      game.ensureAudio();
      game.snd.click();
      game.openChest('n');
    };
    game.$('oE').onclick = () => {
      game.ensureAudio();
      game.snd.click();
      game.openChest('e');
    };
    const box = game.$('skl');
    game.CS.slice()
      .sort(
        (a, b) =>
          ['rare', 'epic', 'legend'].indexOf(a.rar) - ['rare', 'epic', 'legend'].indexOf(b.rar),
      )
      .forEach((s) => {
        const own = !!game.SH.own[s.id],
          L = game.skLvl(s.id),
          c = game.skCopies(s.id),
          x = game.catOf(s.id),
          d = document.createElement('div');
        d.className = 'spc' + (own ? '' : ' lock');
        d.style.setProperty('--c', game.RAR[x.rar].c);
        let info =
          '<b>' +
          s.n +
          '</b><span style="color:' +
          game.RAR[x.rar].c +
          ';font-weight:900">' +
          game.RAR[x.rar].n +
          '</span>';
        let btn = '';
        if (!own) {
          info += '<small>' + icon('lock') + ' Sin conseguir · sale de los cofres</small>';
        } else {
          const bf = game.skinBuff(s.id, L);
          info +=
            '<span>Nivel ' +
            L +
            '/' +
            game.MAXL +
            ' · copias ' +
            c +
            '</span><small>Bono: +' +
            game.pct(bf.v) +
            '% ' +
            game.BTX[bf.t] +
            '</small>';
          if (L < game.MAXL) {
            const need = game.NEED[L],
              cost = game.costFor(s.id, L + 1),
              ok = c >= need;
            info +=
              '<small>Nivel ' +
              (L + 1) +
              ': ' +
              Math.min(c, need) +
              '/' +
              need +
              ' copias · __COIN__ ' +
              cost +
              '</small>';
            btn +=
              '<button class="cbt' +
              (ok && game.SH.c >= cost ? ' gr' : ' dis') +
              '" data-up="' +
              s.id +
              '">Mejorar</button>';
          } else {
            info += '<small>' + icon('star') + ' Nivel máximo</small>';
          }
          btn +=
            '<button class="cbt' +
            (game.SKIN === s.id ? ' dis' : '') +
            '" data-eq="' +
            s.id +
            '">' +
            (game.SKIN === s.id ? '' + icon('check') + ' Puesta' : 'Equipar') +
            '</button>';
        }
        d.innerHTML =
          '<canvas class="ic"></canvas><div class="spt">' +
          info +
          '</div><div class="spb">' +
          btn +
          '</div>';
        box.appendChild(d);
        game.icons.push({ cv: d.querySelector('canvas'), spec: () => game.skinSpec(s.id) });
      });
    box
      .querySelectorAll('[data-up]')
      .forEach((b) => (b.onclick = () => game.upgradeSkin(b.dataset.up)));
    box.querySelectorAll('[data-eq]').forEach(
      (b) =>
        (b.onclick = () => {
          game.ensureAudio();
          game.snd.click();
          game.SKIN = b.dataset.eq;
          game.saveProfile();
          game.showChests();
        }),
    );
    game.coinify(game.$('mbox'));
  };
  game.upgradeSkin = function upgradeSkin(id) {
    game.ensureSh();
    const L = game.skLvl(id);
    if (L >= game.MAXL || !game.SH.own[id]) {
      return;
    }
    const need = game.NEED[L],
      cost = game.costFor(id, L + 1);
    if (game.skCopies(id) < need) {
      game.toast('' + icon('gift') + ' Te faltan copias: ' + game.skCopies(id) + '/' + need);
      return;
    }
    if (game.SH.c < cost) {
      game.toast('__COIN__ Te faltan <b>' + (cost - game.SH.c) + '</b> monedas');
      return;
    }
    game.ensureAudio();
    game.snd.win && game.snd.win();
    game.SH.c -= cost;
    game.SH.sl[id] = L + 1;
    game.shopSave();
    game.toast('' + icon('star') + ' «' + game.catOf(id).n + '» sube al nivel ' + (L + 1));
    game.showChests();
  };
  game.openChest = function openChest(kind) {
    game.ensureSh();
    const key = kind === 'e' ? 'e' : 'n';
    if (game.SH.ky[key] < 1) {
      game.toast('' + icon('lock') + ' Te falta una llave' + (key === 'e' ? ' épica' : ''));
      return;
    }
    game.SH.ky[key]--;
    const sk = game.rollSkin(kind),
      had = !!game.SH.own[sk.id];
    game.SH.own[sk.id] = 1;
    game.SH.sc[sk.id] = (game.SH.sc[sk.id] || 0) + 1;
    if (!game.SH.sl[sk.id]) {
      game.SH.sl[sk.id] = 1;
    }
    game.shopSave();
    game.setModal(
      '<div class="tabv"><h1>Abriendo…</h1><canvas class="chc big" id="chA"></canvas></div>',
      [],
    );
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      game.showReveal(sk, had, kind);
      return;
    }
    const cv = game.$('chA'),
      t0 = performance.now();
    game.snd.click && game.snd.click();
    const step = (now) => {
      if (!cv.isConnected) {
        return;
      }
      const k = Math.min(1, (now - t0) / 1200),
        open = k < 0.45 ? 0 : (k - 0.45) / 0.55;
      cv.style.transform =
        'translateX(' + (k < 0.45 ? Math.sin(k * 120) * 4 * (1 - k / 0.45) : 0) + 'px)';
      game.drawChest(cv, kind, open);
      if (k < 1) {
        requestAnimationFrame(step);
      } else {
        game.snd.win && game.snd.win();
        game.showReveal(sk, had, kind);
      }
    };
    requestAnimationFrame(step);
  };
  game.showReveal = function showReveal(sk, had, _kind) {
    game.ensureSh();
    const x = game.catOf(sk.id),
      c = game.skCopies(sk.id),
      L = game.skLvl(sk.id),
      nl = game.maxByCopies(c),
      bf = game.skinBuff(sk.id, L);
    const h =
      '<div class="tabv"><h1>' +
      (had ? '¡Skin repetida!' : '¡Skin nueva!') +
      '</h1><canvas class="ic hen" id="rvc"></canvas>' +
      '<div style="font-weight:900;font-size:22px;color:' +
      game.RAR[x.rar].c +
      '">' +
      sk.n +
      '</div>' +
      '<p class="sm">' +
      game.RAR[x.rar].n +
      ' · copias: <b>' +
      c +
      '</b> · Nivel <b>' +
      L +
      '</b>' +
      (nl > L ? '<br>¡Ya puedes mejorarla al nivel ' + (L + 1) + '!' : '') +
      '<br>Bono: +' +
      game.pct(bf.v) +
      '% ' +
      game.BTX[bf.t] +
      '</p></div>';
    const btns = [{ t: 'Aceptar', f: game.showChests }];
    game.setModal(h, btns);
    game.icons.push({ cv: game.$('rvc'), spec: () => game.skinSpec(sk.id) });
  };
  game.NEWSKINS = structuredClone(game.catalog.chests.skins);
  game.NEWSKINS.forEach((s) => {
    game.SKINS.push(s);
    game.SHOPSKINS.push(s);
    game.CAT.push({ id: s.id, slot: 'skin', n: s.n, rar: s.rar, price: 0, d: s.d });
  });
  game.CS = game.SHOPSKINS;
  game.chestSkin = (id) => game.CS.find((s) => s.id === id) || null;
  game.MAXL = structuredClone(game.catalog.chests.maxLevel);
  game.NEED = structuredClone(game.catalog.chests.copiesRequired);
  game.CB = structuredClone(game.catalog.chests.upgradeCosts);
  game.CM = structuredClone(game.catalog.chests.costMultipliers);
  game.costFor = (id, L) => Math.round((game.CB[L] * game.CM[game.catOf(id).rar]) / 10) * 10;
  game.maxByCopies = (c) => {
    let l = 0;
    game.NEED.forEach((n, i) => {
      if (c >= n) {
        l = i + 1;
      }
    });
    return l;
  };
  game.skLvl = (id) => Math.max(1, (game.SH.sl && game.SH.sl[id]) || 1);
  game.skCopies = (id) => (game.SH.sc && game.SH.sc[id]) || 0;
  game._shopClean = game.shopClean;
  game.shopClean = function (o) {
    const r = game._shopClean(o);
    r.ky = { n: game.shN(o && o.ky && o.ky.n, 999), e: game.shN(o && o.ky && o.ky.e, 999) };
    r.sc = {};
    r.sl = {};
    game.CS.forEach((s) => {
      if (!r.own[s.id]) {
        return;
      }
      const c = Math.max(1, game.shN(o && o.sc && o.sc[s.id], 9999));
      r.sc[s.id] = c;
      r.sl[s.id] = Math.max(
        1,
        Math.min(game.shN(o && o.sl && o.sl[s.id], game.MAXL) || 1, game.maxByCopies(c)),
      );
    });
    return r;
  };
  game.SH = game.shopClean(game.SH);
  game.BV = structuredClone(game.catalog.chests.bonusValues);
  game.BTX = structuredClone(game.catalog.chests.bonusLabels);
  game.hashId = (s) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) >>> 0;
    }
    return h;
  };
  game.pct = (v) => (Math.round(v * 1000) / 10).toString().replace('.', ',');
  game.SLOTB = structuredClone(game.catalog.chests.slotBonuses);
  game.buffTxt = (b) => {
    const a = Object.keys(b)
      .filter((k) => b[k] > 0)
      .map((k) => '+' + game.pct(b[k]) + '% ' + game.BTX[k]);
    return a.length ? a.join(' · ') : 'ninguno (equipa cosméticos o una skin de cofre)';
  };
  game.CAT.forEach((x) => {
    if (game.SLOTB[x.slot]) {
      const c = game.cosBuff(x);
      x.d += ' · +' + game.pct(c.v) + '% ' + game.BTX[c.t];
    }
  });
  game.lvRar = (l) => (l <= 6 ? 'common' : l <= 15 ? 'rare' : l <= 25 ? 'epic' : 'legend');
  game.SKINS.forEach((sk) => {
    const b = game.lvSkinBuff(sk.id);
    if (b) {
      sk.d += ' · +' + game.pct(b.v) + '% ' + game.BTX[b.t];
    }
  });
  game._showHen = game.showHen;
  game.showHen = function () {
    game._showHen.apply(this, arguments);
    const cv = game.$('hcv');
    if (!cv) {
      return;
    }
    const d = document.createElement('div');
    d.className = 'bnp';
    d.innerHTML = game.buffPanel();
    cv.insertAdjacentElement('afterend', d);
  };
  game._memberStats = game.memberStats;
  game.memberStats = function (m) {
    const o = game._memberStats.apply(this, arguments);
    if (m && m.hero) {
      const b = game.heroBuffs(),
        dm = 1 + b.dmg;
      o.hp *= 1 + b.hp;
      o.atk *= dm;
      o.crit = Math.min(0.8, (o.crit || 0) + b.crit);
      o.dmgMul *= Math.max(0.3, 1 - b.def);
      o.spd *= 1 + b.spd;
      o.vamp += b.vamp;
      o.fireDps *= dm;
      if (o.laser) {
        o.laser.dmg *= dm;
      }
      if (o.egg) {
        o.egg.dmg *= dm;
      }
      if (o.storm) {
        o.storm.dmg *= dm;
      }
    }
    return o;
  };
  game._shopRound = game.shopRound;
  game.shopRound = function (pw, boss) {
    game._shopRound.apply(this, arguments);
    if (pw && boss) {
      const n = game.infN;
      if (n >= 40) {
        if (Math.random() < 0.2) {
          game.addKey('e', 1);
          game.toast('' + icon('lock') + ' ¡El jefe soltaba una <b>llave épica</b>!');
        }
      } else if (n >= 10) {
        if (Math.random() < 0.25) {
          game.addKey('n', 1);
          game.toast('' + icon('lock') + ' ¡El jefe soltaba una <b>llave</b>!');
        }
      }
    }
  };
  game._claimMission = game.claimMission;
  game.claimMission = function (i) {
    const m = game.SH.dq && game.SH.dq.m[i],
      d = m && game.mDef(m.id),
      hit = !!(m && !m.cl && game.mDone(m) && d.g >= 35 && Math.random() < 0.25);
    game._claimMission.apply(this, arguments);
    if (hit && m.cl) {
      game.addKey('n', 1);
      game.toast('__COIN__ +' + d.g + (' monedas · ' + icon('lock') + ' ¡y una llave!'));
    }
  };
  game._claimPass = game.claimPass;
  game.claimPass = function () {
    const t0 = game.SH.bp,
      t1 = game.bpTier();
    game._claimPass.apply(this, arguments);
    if (game.SH.bp > t0) {
      let n = 0,
        e = 0;
      for (let i = t0 + 1; i <= t1; i++) {
        if (i === 10 || i === 15) {
          n++;
        }
        if (i === 20) {
          e++;
        }
      }
      if (n || e) {
        game.ensureSh();
        game.SH.ky.n += n;
        game.SH.ky.e += e;
        game.shopSave();
        game.toast(
          '' +
            icon('lock') +
            ' ¡Llaves del pase! +' +
            n +
            ' normal' +
            (e ? ' y +' + e + ' épica' : ''),
        );
      }
    }
  };
  game._showPass = game.showPass;
  game.showPass = function () {
    game._showPass.apply(this, arguments);
    const p = game.$('mbox').querySelector('.sm');
    if (p) {
      p.innerHTML += '<br>' + icon('lock') + ' Llaves: nivel 10 y 15 (normal) · nivel 20 (épica)';
    }
  };
  game._buyItem = game.buyItem;
  game.buyItem = function (id) {
    const x = game.catOf(id);
    if (x && x.slot === 'skin') {
      game.toast('' + icon('gift') + ' Las skins salen de los cofres');
      return;
    }
    return game._buyItem.apply(this, arguments);
  };
  game._showShop = game.showShop;
  game.showShop = function () {
    if (game.shSlot === 'skin') {
      game.shSlot = 'hat';
    }
    game._showShop.apply(this, arguments);
    const b = game.$('mbox').querySelector('[data-sl=skin]');
    if (b) {
      b.remove();
    }
  };
  game._tabGo = game.tabGo;
  game.tabGo = function (t) {
    if (t === 'chest') {
      game.ensureAudio();
      game.snd.click();
      game.showChests();
      return;
    }
    return game._tabGo.apply(this, arguments);
  };
  game._tabSync = game.tabSync;
  game.tabSync = function () {
    game._tabSync.apply(this, arguments);
    const d = document.querySelector('#tabbar [data-t=chest] i');
    if (d) {
      game.ensureSh();
      d.style.display = game.SH.ky.n + game.SH.ky.e > 0 ? 'block' : 'none';
    }
  };
  game._dotSync = () => {
    const d = document.querySelector('#tabbar [data-t=chest] i');
    if (d) {
      game.ensureSh();
      d.style.display = game.SH.ky.n + game.SH.ky.e > 0 ? 'block' : 'none';
    }
  };
  game.wrapFn('setModal', game._dotSync);
  game.wrapFn('hideScreens', game._dotSync);
}
