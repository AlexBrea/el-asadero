import { icon } from './metadata.js';
/** @module features/account */

/**
 * Install account capabilities into one isolated game session.
 * Cross-feature dependencies are explicit properties; no globals or inline scripts are required.
 * @param {object} game Mutable session and service registry, owned by the application root.
 * @returns {void}
 */
export function installAccount(game) {
  game.pj = function pj(x) {
    try {
      const o = JSON.parse(x);
      return o && typeof o === 'object' ? o : null;
    } catch (e) {
      return null;
    }
  };
  game.stClean = function stClean(o) {
    const r = {
      k: game.stN(o && o.k),
      b: game.stN(o && o.b),
      r: game.stN(o && o.r),
      g: game.stN(o && o.g),
      rl: game.stN(o && o.rl),
      kb: {},
    };
    game.KEYS.forEach((k) => {
      r.kb[k] = game.stN(o && o.kb && o.kb[k]);
    });
    return r;
  };
  game.stMax = function stMax(a, b) {
    const x = game.stClean(a),
      y = game.stClean(b);
    ['k', 'b', 'r', 'g', 'rl'].forEach((f) => {
      x[f] = Math.max(x[f], y[f]);
    });
    game.KEYS.forEach((k) => {
      x.kb[k] = Math.max(x.kb[k], y.kb[k]);
    });
    return x;
  };
  game.lvInfo = function lvInfo(xp) {
    let L = 1;
    xp = Math.max(0, Math.floor(+xp || 0));
    while (xp >= game.lvNeed(L)) {
      xp -= game.lvNeed(L);
      L++;
    }
    return { L, cur: xp, need: game.lvNeed(L) };
  };
  game.titleOf = function titleOf(L) {
    let t = game.TITLES[0][1];
    game.TITLES.forEach((a) => {
      if (L >= a[0]) {
        t = a[1];
      }
    });
    return t;
  };
  game.lsGet = function lsGet(k) {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  };
  game.lsSet = function lsSet(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch (e) {}
  };
  game.loadProfile = function loadProfile(uid, data, pd) {
    game.UID = uid;
    game.CNAME = game.cleanName(
      pd && typeof pd.name === 'string' && pd.name ? pd.name : game.lsGet('asadero_name_' + uid),
    );
    game.ST = game.stMax(game.pj(game.lsGet('asadero_st_' + uid)), pd && pd.st);
    game.shopLoad(pd && pd.st && pd.st.sh);
    {
      const a = game.pj(game.lsGet('asadero_run_' + uid)),
        b = game.pj(pd && pd.run);
      if (b && (!a || (b.ts || 0) > (a.ts || 0))) {
        game.lsSet('asadero_run_' + uid, JSON.stringify(b));
      }
    }
    const lx = Math.floor(+game.lsGet('asadero_xp_' + uid) || 0),
      cx = Math.floor(+(data && data.xp) || 0);
    game.XP = Math.max(lx, cx);
    const sk = (data && data.skin) || game.lsGet('asadero_skin_' + uid) || 'classic',
      L = game.lvOf(game.XP);
    game.SKIN = game.SKINS.some((x) => x.id === sk && (L >= x.lvl || game.SH.own[x.id]))
      ? sk
      : 'classic';
    game.achPrev = game.achSet();
  };
  game.saveProfile = function saveProfile() {
    game.lsSet('asadero_xp_' + game.UID, game.XP);
    game.lsSet('asadero_skin_' + game.UID, game.SKIN);
    game.lsSet('asadero_name_' + game.UID, game.CNAME);
    if (!game.ONLINE || !game.fbAuth.currentUser || game.BEST < 1) {
      return;
    }
    game.fbDb
      .collection('ranking')
      .doc(game.fbAuth.currentUser.uid)
      .update({ xp: game.XP, skin: game.SKIN })
      .catch((e) => console.warn('Perfil no guardado en la nube', e && e.code));
  };
  game.toast = function toast(t) {
    const e = game.$('toast');
    e.innerHTML = t;
    e.classList.add('show');
    clearTimeout(game.toast.h);
    game.toast.h = setTimeout(() => e.classList.remove('show'), 4200);
  };
  game.unlocksBetween = function unlocksBetween(a, b) {
    const g = [];
    for (let l = a + 1; l <= b; l++) {
      game.SKINS.forEach((x) => {
        if (x.lvl === l) {
          g.push(icon('paint') + ' Skin «' + x.n + '»');
        }
      });
      game.TITLES.forEach((t) => {
        if (t[0] === l) {
          g.push(icon('medal') + ' Título «' + t[1] + '»');
        }
      });
    }
    return g;
  };
  game.awardXP = function awardXP(n, silent) {
    const a = game.lvOf(game.XP);
    game.XP += n;
    const b = game.lvInfo(game.XP);
    if (silent) {
      game.lsSet('asadero_xp_' + game.UID, game.XP);
      setTimeout(game.saveProfile, 1500);
      return;
    }
    if (b.L > a) {
      const g = [];
      for (let l = a + 1; l <= b.L; l++) {
        game.SKINS.forEach((x) => {
          if (x.lvl === l) {
            g.push(icon('paint') + ' Skin «' + x.n + '»');
          }
        });
        game.TITLES.forEach((t) => {
          if (t[0] === l) {
            g.push(icon('medal') + ' Título «' + t[1] + '»');
          }
        });
      }
      game.toast(
        icon('party') +
          ' ¡NIVEL ' +
          b.L +
          '!' +
          (g.length ? '<br><small>' + g.join(' · ') + '</small>' : ''),
      );
    } else {
      game.toast(
        icon('star') + ' +' + n + ' XP · Nivel ' + b.L + ' (' + b.cur + '/' + b.need + ')',
      );
    }
    game.lsSet('asadero_xp_' + game.UID, game.XP);
    setTimeout(game.saveProfile, 1500);
  };
  game.xpEndHTML = function xpEndHTML() {
    const gained = game.XP - game.runXP0,
      l0 = game.lvOf(game.runXP0),
      l1 = game.lvOf(game.XP),
      g = game.unlocksBetween(l0, l1);
    let h =
      '<div class="lvbox" style="margin-bottom:14px">' +
      icon('star') +
      ' Experiencia ganada: <em>+' +
      gained +
      ' XP</em>';
    if (l1 > l0) {
      h +=
        '<br>' +
        icon('party') +
        ' ¡Subes al nivel <em>' +
        l1 +
        '</em>!' +
        (g.length ? '<br><small>' + g.join(' · ') + '</small>' : '');
    }
    return (
      h +
      '<div class="xpbar"><i style="width:' +
      Math.round((game.lvInfo(game.XP).cur / game.lvInfo(game.XP).need) * 100) +
      '%"></i></div><small>Nivel ' +
      l1 +
      ' · ' +
      game.lvInfo(game.XP).cur +
      ' / ' +
      game.lvInfo(game.XP).need +
      ' XP</small></div>'
    );
  };
  game.profHTML = function profHTML() {
    const i = game.lvInfo(game.XP),
      pc = Math.round((i.cur / i.need) * 100);
    return (
      '<div class="lvbox">' +
      icon('star') +
      ' Nivel <em>' +
      i.L +
      '</em> · ' +
      game.titleOf(i.L) +
      '<div class="xpbar"><i style="width:' +
      pc +
      '%"></i></div><small>' +
      i.cur +
      ' / ' +
      i.need +
      ' XP para el nivel ' +
      (i.L + 1) +
      '</small></div>'
    );
  };
  game.showProfile = function showProfile() {
    game.hideScreens();
    game.closeStats();
    const L = game.lvOf(game.XP),
      nx = game.SKINS.find((x) => x.lvl > L);
    game.setModal(
      '<div class="big">' +
        icon('user') +
        '</div><h1>Tu perfil</h1>' +
        game.profHTML() +
        '<p style="margin-bottom:8px">Cada ronda que superas = <b>1 XP</b>.' +
        (nx
          ? '<br>Próxima skin: <b>' + nx.n + '</b> (nivel ' + nx.lvl + ')'
          : '<br>¡Tienes todas las skins!') +
        '</p><input class="inp" id="cname" maxlength="12" placeholder="Ponle nombre a tu pollo" autocomplete="off" spellcheck="false" value="' +
        game.CNAME +
        '" style="margin-bottom:10px"><div class="skg" id="skg"></div>',
      [{ t: 'Volver', cls: 'alt', f: game.showMenu }],
    );
    game.$('cname').oninput = (e) => {
      game.CNAME = game.cleanName(e.target.value);
      game.lsSet('asadero_name_' + game.UID, game.CNAME);
      game.cloudProfile();
    };
    const box = game.$('skg');
    game.SKINS.forEach((sk) => {
      const ok = L >= sk.lvl,
        d = document.createElement('div');
      d.className = 'sk' + (sk.id === game.SKIN ? ' sel' : '') + (ok ? '' : ' lock');
      d.innerHTML =
        '<canvas class="ic"></canvas><div class="nm">' +
        sk.n +
        '</div><div class="ds">' +
        (ok
          ? sk.id === game.SKIN
            ? icon('check') + ' Puesta'
            : sk.d
          : icon('lock') + ' Nivel ' + sk.lvl) +
        '</div>';
      if (ok) {
        d.onclick = () => {
          game.ensureAudio();
          game.snd.click();
          game.SKIN = sk.id;
          game.saveProfile();
          game.showProfile();
        };
      }
      box.appendChild(d);
      game.icons.push({ cv: d.querySelector('canvas'), spec: () => game.skinSpec(sk.id) });
    });
  };
  game.XP = 0;
  game.SKIN = 'classic';
  game.UID = 'guest';
  game.runXP0 = 0;
  game.CNAME = '';
  game.RL = {};
  game.ST = { k: 0, b: 0, r: 0, g: 0, rl: 0, kb: {} };
  game.achPrev = null;
  game.simming = false;
  game.rl = (k) => game.RL[k] || 0;
  game.stN = (v) => Math.max(0, Math.min(1e9, Math.floor(+v || 0)));
  game.cleanName = (v) =>
    String(v || '')
      .replace(/[<>&"'`\\]/g, '')
      .replace(/\s+/g, ' ')
      .slice(0, 12)
      .trim();
  game.lvNeed = (L) => Math.round(4 + 1.5 * L + 0.12 * L * L);
  game.lvOf = (xp) => game.lvInfo(xp).L;
  game.TITLES = game.catalog.titles;
}
