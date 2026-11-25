/** @module game */
import { DATA } from './config.js';
import { createGameLoop } from './loop.js';
import { createMotionController } from './motion.js';
import { createRingEntrance } from './run-intro.js';
import {
  sanitizeChickenName,
  normalizeExperience,
  getLevelInfo,
  readStoredValue,
  writeStoredValue,
} from './profile.js';
import { createBattleIndex, removeExpired } from './simulation.js';
import { SP, SKINS, getModel } from './models.js';
import { createRenderer, atkCurve } from './renderer.js';
import { createAudio } from './audio.js';
import { createUpgradeSystem } from './upgrades.js';
import { turnTo } from './math.js';
import { createEnemySystem } from './enemies.js';
import { icon } from './icons.js';
import { renderUpgradeCards, renderRarityGuide } from './upgrade-ui.js';

/**
 * Initialize one game session and attach the UI to its collaborators.
 * The returned callback stops session clocks; page navigation owns DOM teardown.
 * @returns {function():void} Stop the simulation clocks.
 */
export function startGame() {
  /* ============ datos ============ */
  const { healthTiers: HM, attackTiers: AM, speedTiers: SM, healthMultiplier: HPM } = DATA.balance;
  const THEMES = DATA.themes,
    UPG = DATA.upgrades,
    TIERN = ['', icon('robot'), icon('crown')];
  const UEM = Object.fromEntries(Object.entries(UPG).map(([id, u]) => [id, icon(u.icon)]));
  /* ============ estado ============ */
  let mode = 'menu',
    st = 'menu',
    team = [],
    bteam = [],
    offers = [],
    units = [],
    fightT = 0,
    fightEnd = false,
    endT = 0,
    speed = 1,
    runId = 0,
    infN = 1,
    TH = THEMES[0];
  const parts = [],
    floaters = [];
  let fx = [];
  let TT = 0;
  const icons = [];
  const motion = createMotionController();
  const entrance = createRingEntrance(finishEntrance);
  const enemySystem = createEnemySystem({ data: DATA, species: SP });
  const battleIndex = createBattleIndex();
  const collisionUnits = [];
  const renderState = {
    get mode() {
      return mode;
    },
    get st() {
      return st;
    },
    get units() {
      return units;
    },
    get parts() {
      return parts;
    },
    get floaters() {
      return floaters;
    },
    get fx() {
      return fx;
    },
    get TH() {
      return TH;
    },
    get CNAME() {
      return CNAME;
    },
    get TT() {
      return TT;
    },
    get entranceProgress() {
      return entrance.active ? entrance.progress : null;
    },
    get infN() {
      return infN;
    },
  };
  const audio = createAudio(() => renderState);
  const { snd, tone, ensureAudio, musicTick } = audio;
  const upgradeSystem = createUpgradeSystem({
    data: DATA,
    getTeam: () => team,
    getSkin: () => SKIN,
  });
  const { newMember, canUpg, memberStats, applyTo } = upgradeSystem;
  function genUpgrades() {
    return upgradeSystem.genUpgrades();
  }
  const renderer = createRenderer({
    canvas: document.getElementById('c'),
    icons,
    getState: () => renderState,
    onPress: () => {
      ensureAudio();
      snd.click();
    },
  });
  const { objSpec, skinSpec, memberSpec } = renderer;
  const $ = (id) => document.getElementById(id);
  let BEST = 0,
    runT = 0,
    pend = 0,
    picksLeft = 1,
    prize = 0;
  const saveProg = () => {
    if (typeof cloudSave === 'function') {
      cloudSave();
    }
  };
  const timers = [];
  const later = (fn, ms) => {
    timers.push({ t: ms / 1000, fn, id: runId });
  };
  function runTimers(dt) {
    for (let i = 0; i < timers.length; i++) {
      const x = timers[i];
      x.t -= dt;
      if (x.t <= 0) {
        timers.splice(i, 1);
        i--;
        if (x.id === runId) {
          x.fn();
        }
      }
    }
  }

  /* unidades */

  /* ===== infinito: miembros del equipo ===== */
  function genInfEnemy(round) {
    return enemySystem.generate(round);
  }
  function memberName(m) {
    if (m.hero) {
      return CNAME || 'Tu gallina';
    }
    let i = 0;
    for (const e of team) {
      if (!e.hero) {
        i++;
        if (e === m) {
          break;
        }
      }
    }
    return 'Pollito ' + i;
  }
  function memberDesc(m) {
    const a = Object.keys(m.l)
      .filter((k) => m.l[k] && k !== 'flock')
      .map((k) => UPG[k].n + ' ' + m.l[k]);
    if (m.t) {
      a.unshift(m.t === 1 ? 'Robot' : 'Titán');
    }
    return a.length ? a.join(' · ') : 'Sin mejoras todavía';
  }

  /* unidades */
  /**
   * Create mutable combat state from a roster member and consume its spawn flag.
   * Roster progression stays on the member; transient positions and cooldowns stay here.
   * @param {0|1} side Player (0) or enemy (1).
   * @param {object} e Roster member whose fresh flag is consumed.
   * @returns {object} Combat and render state for one unit.
   */
  function mkUnit(side, e) {
    const sp = SP[e.k],
      t = e.t || 0,
      gold = !!(e.l && e.l.gold > 0),
      m = getModel(e.k, t, gold, e.hero ? e.skin : null);
    let hp = sp.hp * HM[t] * HPM * (e.f || 1),
      atk = sp.atk * AM[t] * (e.f || 1),
      rate = sp.rate,
      spd = sp.spd;
    const sc = 1.4 * SM[t] * (e.boss ? (e.k === 'elephant' ? 0.8 : 1) : 1);
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
      const h = memberStats(e);
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
        ab: h,
        laserT: 1.2,
        eggT: 2,
        stormT: 2.5,
        member: true,
      });
    }
    u.hp = hp;
    u.max = hp;
    u.atk = atk;
    u.rate = rate * (t ? 0.95 : 1);
    u.spd = spd;
    return u;
  }
  function formation(list, sgn) {
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
  }
  function buildArena() {
    const a = team.map((e) => mkUnit(0, e)),
      b = bteam.map((e) => mkUnit(1, e));
    formation(a, -1);
    formation(b, 1);
    units = a.concat(b);
    units.forEach((u) => {
      u.x = u.hx;
      u.z = u.hz;
    });
    updateRosters();
  }
  const plural = (k, n) => SP[k].es[n === 1 ? 0 : 1];
  function rosterHTML(list) {
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
          '<span class="chip" aria-label="' +
          g.n +
          ' ' +
          plural(g.k, g.n) +
          '">' +
          (g.b ? icon('skull') : '') +
          TIERN[g.t] +
          SP[g.k].e +
          '×' +
          g.n +
          '</span>',
      )
      .join('');
  }
  function updateRosters() {
    const hero = team.find((m) => m.hero);
    let h = '<b>TU EQUIPO</b>';
    if (hero) {
      h += '<span class="chip">' + TIERN[hero.t] + icon('star') + icon('chicken') + '</span>';
      Object.keys(hero.l).forEach((k) => {
        if (UEM[k] && k !== 'flock') {
          h += '<span class="chip">' + UEM[k] + hero.l[k] + '</span>';
        }
      });
    }
    const ch = team.filter((e) => !e.hero).length;
    if (ch) {
      h += '<span class="chip">' + icon('chick') + '×' + ch + '</span>';
    }
    $('rosL').innerHTML = h;
    $('rosR').innerHTML = '<b>ENEMIGOS · RONDA ' + infN + '</b>' + rosterHTML(bteam);
  }
  function updatePips() {
    $('pips').innerHTML =
      '<div style="font-weight:900;font-size:15px;padding:0 6px">RONDA ' +
      infN +
      ' · récord ' +
      BEST +
      '</div>';
    $('lvl').innerHTML = icon('infinity') + ' INFINITO<small>Sobrevive todo lo que puedas</small>';
  }
  function banner(t, color) {
    const b = $('banner');
    b.innerHTML = t;
    b.style.color = color || '#ffe08a';
    motion.announce(b);
  }
  function setModal(html, btns) {
    const m = $('mbox');
    m.innerHTML = html + '<div class="row" id="mrow"></div>';
    btns.forEach((b) => {
      const x = document.createElement('button');
      x.className = 'btn ' + (b.cls || '');
      x.innerHTML = b.t;
      x.onclick = () => {
        ensureAudio();
        snd.click();
        b.f();
      };
      $('mrow').appendChild(x);
    });
    const modal = $('modal');
    modal.inert = false;
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.remove('off');
    motion.reveal([m]);
  }
  function setPanelOpen(open) {
    const panel = $('panel');
    panel.inert = !open;
    panel.setAttribute('aria-hidden', String(!open));
    panel.classList.toggle('on', open);
  }
  function hideScreens() {
    entrance.cancel();
    document.getElementById('entrance-ui').hidden = true;
    const modal = $('modal');
    modal.inert = true;
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.add('off');
    setPanelOpen(false);
    icons.length = 0;
  }
  function resetBattle() {
    timers.length = 0;
    collisionUnits.length = 0;
    battleIndex.collect([]);
    runId++;
    units = [];
    parts.length = 0;
    floaters.length = 0;
    fx = [];
    st = 'menu';
    team = [];
    bteam = [];
  }

  /* ============ estadísticas ============ */
  const f1 = (n) => (Math.round(n * 10) / 10).toString().replace('.', ',');
  let drawerOpen = false,
    statsShown = false,
    statsT = 0,
    homeArm = 0;
  function statsHTML() {
    if (mode !== 'inf' || !team.length) {
      return '<div class="note">Empieza una partida para ver tus estadísticas.</div>';
    }
    let h =
      '<div class="note">Valores reales, se actualizan en directo. El juego sigue corriendo.</div>';
    team.forEach((m) => {
      const s = memberStats(m),
        g = (k) => m.l[k] || 0,
        R = (a, b) => '<div class="sr"><span>' + a + '</span><b>' + b + '</b></div>';
      h +=
        '<div class="sc"><h3>' +
        memberName(m) +
        (m.hero ? ' ' + icon('star') : '') +
        (m.t ? ' · ' + (m.t === 1 ? icon('robot') + ' Robot' : icon('crown') + ' Titán') : '') +
        '</h3>';
      h += R(icon('heart') + ' Vida', Math.round(s.hp));
      h += R(
        icon('sword') + ' Daño por segundo',
        f1(s.atk) + '  (' + f1(s.atk * s.rate) + ' por golpe)',
      );
      h += R(icon('bolt') + ' Velocidad de ataque', 'x' + f1(0.7 / s.rate));
      h += R(icon('bolt') + ' Velocidad al correr', 'x' + f1(s.spd / 3.6));
      if (m.t) {
        h += R('Bonus de cuerpo', 'vida x' + HM[m.t] + ' · daño x' + AM[m.t]);
      }
      if (g('power')) {
        h += R(
          icon('sword') + ' Músculos (' + g('power') + ')',
          'daño x' + f1(Math.pow(1.3, g('power'))),
        );
      }
      if (g('vit')) {
        h += R(
          icon('heart') + ' Súper plumaje (' + g('vit') + ')',
          'vida x' + f1(Math.pow(1.35, g('vit'))),
        );
      }
      if (g('armor')) {
        h += R(
          icon('shield') + ' Plumas de acero (' + g('armor') + ')',
          '-' + Math.round((1 - s.dmgMul) * 100) + '% daño recibido',
        );
      }
      if (g('gold')) {
        h += R(
          icon('sparkles') + ' Pico de oro (' + g('gold') + ')',
          Math.round(s.crit * 100) + '% críticos · x3 daño',
        );
      }
      if (g('fire')) {
        h += R(
          icon('flame') + ' Pico de fuego (' + g('fire') + ')',
          f1(s.fireDps) + ' daño/s durante 3 s',
        );
      }
      if (g('vamp')) {
        h += R(
          icon('moon') + ' Pico vampiro (' + g('vamp') + ')',
          'roba ' + Math.round(s.vamp * 100) + '% del daño',
        );
      }
      if (s.laser) {
        h += R(
          icon('target') + ' Láser (' + g('laser') + ')',
          s.laser.n +
            (s.laser.n > 1 ? ' rayos' : ' rayo') +
            ' de ' +
            Math.round(s.laser.dmg) +
            ' · cada ' +
            f1(s.laser.cd) +
            ' s',
        );
      }
      if (s.egg) {
        h += R(
          icon('egg') + ' Huevos (' + g('egg') + ')',
          Math.round(s.egg.dmg) +
            ' de daño · radio ' +
            f1(s.egg.rad) +
            ' · cada ' +
            f1(s.egg.cd) +
            ' s',
        );
      }
      if (s.storm) {
        h += R(
          icon('feather') + ' Tormenta (' + g('storm') + ')',
          Math.round(s.storm.dmg) +
            ' de daño · radio ' +
            f1(s.storm.rad) +
            ' · cada ' +
            f1(s.storm.cd) +
            ' s',
        );
      }
      if (g('phoenix')) {
        h += R(icon('sun') + ' Huevo fénix', 'x' + g('phoenix') + ' · revive con toda la vida');
      }
      if (m.hero && g('flock')) {
        h += R(icon('chick') + ' La bandada', 'nivel ' + g('flock'));
      }
      h += '</div>';
    });
    return h;
  }
  function refreshStats() {
    if (drawerOpen && statsShown) {
      $('dstats').innerHTML = statsHTML();
    }
  }
  function refreshDrawer() {
    $('d-stats').classList.toggle('hide', mode !== 'inf');
    if (mode !== 'inf') {
      statsShown = false;
      $('dstats').classList.remove('on');
    }
    $('d-rank').classList.toggle('hide', !(ONLINE && mode === 'menu'));
    $('d-home').classList.toggle('hide', mode === 'menu');
    $('d-out').classList.toggle('hide', !ONLINE);
    $('d-mus').classList.toggle('off', !audio.musicOn);
    $('d-snd').classList.toggle('off', audio.muted);
    $('d-snd').innerHTML = audio.muted
      ? icon('volume-off') + ' Sonido'
      : icon('volume') + ' Sonido';
    $('spd').textContent = 'x' + speed;
    $('d-home').innerHTML = icon('home') + ' Menú principal';
    homeArm = 0;
    refreshStats();
  }
  function openDrawer() {
    drawerOpen = true;
    $('drawer').classList.add('open');
    refreshDrawer();
  }
  function closeDrawer() {
    drawerOpen = false;
    $('drawer').classList.remove('open');
  }
  function closeStats() {
    closeDrawer();
  }

  /* ============ nivel de cuenta ============ */
  let XP = 0,
    SKIN = 'classic',
    UID = 'guest',
    runXP0 = 0,
    CNAME = '';
  const cleanName = sanitizeChickenName;
  const lvInfo = getLevelInfo;
  const lsGet = readStoredValue;
  const lsSet = writeStoredValue;
  const lvOf = (xp) => lvInfo(xp).L;
  const TITLES = DATA.titles;
  function titleOf(L) {
    let t = TITLES[0][1];
    TITLES.forEach((a) => {
      if (L >= a[0]) {
        t = a[1];
      }
    });
    return t;
  }
  function loadProfile(uid, data) {
    UID = uid;
    CNAME = cleanName(lsGet('asadero_name_' + uid));
    const lx = Math.floor(+lsGet('asadero_xp_' + uid) || 0),
      cx = Math.floor(+(data && data.xp) || 0);
    XP = Math.max(normalizeExperience(lx), normalizeExperience(cx));
    const sk = (data && data.skin) || lsGet('asadero_skin_' + uid) || 'classic',
      L = lvOf(XP);
    SKIN = SKINS.some((x) => x.id === sk && L >= x.lvl) ? sk : 'classic';
  }
  function saveProfile() {
    lsSet('asadero_xp_' + UID, XP);
    lsSet('asadero_skin_' + UID, SKIN);
    lsSet('asadero_name_' + UID, CNAME);
    if (!ONLINE || !fbAuth.currentUser || BEST < 1) {
      return;
    }
    fbDb
      .collection('ranking')
      .doc(fbAuth.currentUser.uid)
      .update({ xp: XP, skin: SKIN })
      .catch((e) => console.warn('Perfil no guardado en la nube', e && e.code));
  }
  function toast(t) {
    const e = $('toast');
    e.innerHTML = t;
    e.classList.add('show');
    clearTimeout(toast.h);
    toast.h = setTimeout(() => e.classList.remove('show'), 4200);
  }
  function unlocksBetween(a, b) {
    const g = [];
    for (let l = a + 1; l <= b; l++) {
      SKINS.forEach((x) => {
        if (x.lvl === l) {
          g.push(icon('paint') + ' Skin «' + x.n + '»');
        }
      });
      TITLES.forEach((t) => {
        if (t[0] === l) {
          g.push(icon('medal') + ' Título «' + t[1] + '»');
        }
      });
    }
    return g;
  }
  function awardXP(n, silent) {
    const a = lvOf(XP);
    XP += n;
    const b = lvInfo(XP);
    if (silent) {
      lsSet('asadero_xp_' + UID, XP);
      setTimeout(saveProfile, 1500);
      return;
    }
    if (b.L > a) {
      const g = [];
      for (let l = a + 1; l <= b.L; l++) {
        SKINS.forEach((x) => {
          if (x.lvl === l) {
            g.push(icon('paint') + ' Skin «' + x.n + '»');
          }
        });
        TITLES.forEach((t) => {
          if (t[0] === l) {
            g.push(icon('medal') + ' Título «' + t[1] + '»');
          }
        });
      }
      toast(
        icon('party') +
          ' ¡NIVEL ' +
          b.L +
          '!' +
          (g.length ? '<br><small>' + g.join(' · ') + '</small>' : ''),
      );
    } else {
      toast(icon('star') + ' +' + n + ' XP · Nivel ' + b.L + ' (' + b.cur + '/' + b.need + ')');
    }
    lsSet('asadero_xp_' + UID, XP);
    setTimeout(saveProfile, 1500);
  }
  function xpEndHTML() {
    const gained = XP - runXP0,
      l0 = lvOf(runXP0),
      l1 = lvOf(XP),
      g = unlocksBetween(l0, l1);
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
      Math.round((lvInfo(XP).cur / lvInfo(XP).need) * 100) +
      '%"></i></div><small>Nivel ' +
      l1 +
      ' · ' +
      lvInfo(XP).cur +
      ' / ' +
      lvInfo(XP).need +
      ' XP</small></div>'
    );
  }
  function profHTML() {
    const i = lvInfo(XP),
      pc = Math.round((i.cur / i.need) * 100);
    return (
      '<div class="lvbox">' +
      icon('star') +
      ' Nivel <em>' +
      i.L +
      '</em> · ' +
      titleOf(i.L) +
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
  }
  function showProfile() {
    hideScreens();
    closeStats();
    const L = lvOf(XP),
      nx = SKINS.find((x) => x.lvl > L);
    setModal(
      '<div class="big">' +
        icon('user') +
        '</div><h1>Tu perfil</h1>' +
        profHTML() +
        '<p style="margin-bottom:8px">Cada ronda que superas = <b>1 XP</b>.' +
        (nx
          ? '<br>Próxima skin: <b>' + nx.n + '</b> (nivel ' + nx.lvl + ')'
          : '<br>¡Tienes todas las skins!') +
        '</p><input class="inp" id="cname" maxlength="12" placeholder="Ponle nombre a tu pollo" autocomplete="off" spellcheck="false" value="' +
        CNAME +
        '" style="margin-bottom:10px"><div class="skg" id="skg"></div>',
      [{ t: 'Volver', cls: 'alt', f: showMenu }],
    );
    $('cname').oninput = (e) => {
      CNAME = cleanName(e.target.value);
      lsSet('asadero_name_' + UID, CNAME);
    };
    const box = $('skg');
    SKINS.forEach((sk) => {
      const ok = L >= sk.lvl,
        d = document.createElement('button');
      d.type = 'button';
      d.disabled = !ok;
      d.className = 'sk' + (sk.id === SKIN ? ' sel' : '') + (ok ? '' : ' lock');
      d.innerHTML =
        '<canvas class="ic"></canvas><div class="nm">' +
        sk.n +
        '</div><div class="ds">' +
        (ok
          ? sk.id === SKIN
            ? icon('check') + ' Puesta'
            : sk.d
          : icon('lock') + ' Nivel ' + sk.lvl) +
        '</div>';
      if (ok) {
        d.onclick = () => {
          ensureAudio();
          snd.click();
          SKIN = sk.id;
          saveProfile();
          showProfile();
        };
      }
      box.appendChild(d);
      icons.push({ cv: d.querySelector('canvas'), spec: () => skinSpec(sk.id) });
    });
  }

  /* ============ menú ============ */
  function showMenu() {
    if (mode === 'inf') {
      cloudSave();
    }
    resetBattle();
    mode = 'menu';
    TH = THEMES[0];
    hideScreens();
    closeStats();
    $('lvl').innerHTML = 'EL ASADERO<small>Rondas infinitas</small>';
    $('pips').innerHTML = '';
    $('rosL').style.display = $('rosR').style.display = 'none';
    const a = newMember(true);
    a.fresh = false;
    team = [a];
    bteam = [
      { k: 'gorilla', t: 0 },
      { k: 'cat', t: 0 },
    ];
    buildArena();
    units.forEach((u) => (u.spawnT = 1));
    team = [];
    bteam = [];
    const btns = [
      { t: '¡JUGAR!', f: beginRun },
      { t: icon('user') + ' Perfil', cls: 'alt', f: showProfile },
    ];
    if (ONLINE) {
      btns.push({ t: icon('trophy') + ' Ranking', cls: 'alt', f: showRanking });
      btns.push({ t: 'Salir', cls: 'alt', f: () => fbAuth.signOut() });
    }
    setModal(
      '<div class="big">' +
        icon('chicken') +
        icon('sword') +
        icon('gorilla') +
        '</div><h1>EL ASADERO</h1>' +
        profHTML() +
        '<p>Empiezas con <b>una sola gallina</b>. Cada ronda eliges una mejora: ataques especiales como el pico de oro, rayos láser o huevos explosivos.<br>Los pollitos que te ayudan también se pueden mejorar. ¿Hasta qué ronda llegas?<br><br>' +
        (ONLINE
          ? 'Jugador: <b>' +
            esc(USER) +
            '</b>' +
            (BEST ? ' · ' + icon('trophy') + ' récord: <b>' + BEST + '</b>' : '')
          : '<small>Modo sin conexión: no se guarda el ranking</small>') +
        '</p>',
      btns,
    );
  }

  /* ============ flujo infinito ============ */
  /** Play the hero's entrance only for a new user-started run. */
  function beginRun() {
    startInf(true);
  }
  function finishEntrance() {
    if (st !== 'entrance') {
      return;
    }
    const hero = units.find((unit) => unit.hero);
    if (hero) {
      puff(hero.x, hero.z, 5, 0.25);
      snd.drop();
    }
    document.getElementById('entrance-ui').hidden = true;
    st = 'choose';
    showCards();
    banner('RONDA 1', '#ffe08a');
  }
  function startInf(playEntrance = false) {
    resetBattle();
    mode = 'inf';
    runXP0 = XP;
    infN = 1;
    runT = 0;
    picksLeft = 1;
    prize = 0;
    team = [newMember(true)];
    hideScreens();
    $('rosL').style.display = $('rosR').style.display = '';
    nextInfRound(playEntrance);
  }
  function nextInfRound(playEntrance = false) {
    bteam = genInfEnemy(infN);
    offers = genUpgrades();
    TH = THEMES[(((infN - 1) / 5) | 0) % 5];
    st = 'choose';
    buildArena();
    updatePips();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const keyboard = document.documentElement?.dataset.motionInput === 'keyboard';
    if (playEntrance && !reduced && !keyboard) {
      st = 'entrance';
      units.forEach((unit) => {
        unit.spawnT = 1;
        unit.landed = true;
        unit.alpha = 1;
        unit.y = 0;
      });
      entrance.start(units.find((unit) => unit.hero));
      document.getElementById('entrance-ui').hidden = false;
      return;
    }
    showCards();
    if (infN % 10 === 0) {
      banner(icon('skull') + ' ¡JEFE! RONDA ' + infN, '#ff6b6b');
    } else {
      banner('RONDA ' + infN, '#ffe08a');
    }
  }
  function showCards() {
    icons.length = 0;
    $('selection-meta').textContent = prize
      ? 'PREMIO DEL JEFE · ELECCIÓN ' + (prize - picksLeft + 1) + ' DE ' + prize
      : 'RONDA ' + String(infN).padStart(2, '0') + ' · ELIGE UNA MEJORA';
    $('ptitle').textContent = 'Tu próxima ventaja';
    const box = $('cards');
    box.innerHTML = '';
    box.classList.remove('tgt');
    renderUpgradeCards({
      container: box,
      offers,
      upgrades: UPG,
      rarities: DATA.rarities,
      team,
      onPick: pick,
      icons,
      objSpec,
      canUpg,
      motion,
    });
    renderRarityGuide($('rarity-guide'), DATA.rarities);
    if (!offers.length) {
      panelButton('Tu equipo tiene todas las mejoras', 'Comenzar combate', () => {
        picksLeft = 1;
        proceed();
      });
      return;
    }
    setPanelOpen(true);
  }
  function pick(i) {
    if (st !== 'choose') {
      return;
    }
    ensureAudio();
    snd.click();
    const k = offers[i].id;
    const targets = k === 'flock' ? [team.find((m) => m.hero)] : team.filter((m) => canUpg(m, k));
    if (targets.length === 1) {
      applyTo(targets[0], k);
      proceed();
      return;
    }
    st = 'target';
    icons.length = 0;
    $('ptitle').innerHTML = '¿A quién le das «' + UPG[k].n + '»?';
    const box = $('cards');
    box.innerHTML = '';
    box.classList.add('tgt');
    box.scrollTop = 0;
    targets.forEach((m) => {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'card target-card';
      d.innerHTML =
        '<canvas class="ic"></canvas><div class="nm">' +
        memberName(m) +
        (m.hero ? ' ' + icon('star') : '') +
        '</div><div class="ds">' +
        memberDesc(m) +
        '</div>';
      d.onclick = () => {
        if (st !== 'target') {
          return;
        }
        ensureAudio();
        snd.click();
        applyTo(m, k);
        proceed();
      };
      box.appendChild(d);
      icons.push({ cv: d.querySelector('canvas'), spec: () => memberSpec(m) });
    });
    motion.reveal(box.children);
  }
  function proceed() {
    if (picksLeft > 1) {
      picksLeft--;
      offers = genUpgrades();
      st = 'choose';
      icons.length = 0;
      showCards();
      return;
    }
    prize = 0;
    picksLeft = 1;
    st = 'intro';
    setPanelOpen(false);
    icons.length = 0;
    buildArena();
    later(() => {
      if (st === 'intro') {
        startFight();
      }
    }, 1500);
  }
  function startFight() {
    st = 'fight';
    fightT = 0;
    fightEnd = false;
    endT = 0;
    units.forEach((u) => {
      u.state = 'idle';
      u.cd = Math.random() * 0.5;
      u.spawnT = 1;
      u.y = 0;
      u.alpha = 1;
    });
    banner('¡PELEA!', '#ff6b6b');
    tone(200, 400, 0.2, 'sawtooth', 0.05);
  }
  function panelButton(title, label, fn) {
    icons.length = 0;
    $('ptitle').innerHTML = title;
    $('cards').innerHTML = '';
    $('cards').classList.remove('tgt');
    const b = document.createElement('button');
    b.className = 'btn';
    b.innerHTML = label;
    b.onclick = () => {
      ensureAudio();
      snd.click();
      setPanelOpen(false);
      fn();
    };
    $('cards').appendChild(b);
    setPanelOpen(true);
  }
  function roundOver(pw) {
    st = 'rounddone';
    if (pw) {
      snd.win();
      banner(infN % 10 === 0 ? '¡JEFE DERROTADO!' : '¡RONDA ' + infN + ' SUPERADA!', '#7bed9f');
      if (infN > BEST) {
        BEST = infN;
      }
      saveProg();
      awardXP(1, true);
      const defeatedBoss = infN % 10 === 0;
      infN++;
      prize = defeatedBoss ? 2 : 0;
      picksLeft = defeatedBoss ? 2 : 1;
      nextInfRound();
    } else {
      snd.lose();
      banner('¡HAS CAÍDO!', '#ff6b6b');
      saveProg();
      later(() => {
        st = 'levelend';
        const rs = infN - 1;
        setModal(
          '<div class="big">' +
            icon('chicken') +
            icon('skull') +
            '</div><h1>Fin de la partida</h1><p>Superaste <b>' +
            rs +
            '</b> ' +
            (rs === 1 ? 'ronda' : 'rondas') +
            (rs > 0 && rs >= BEST ? ' · ¡NUEVO RÉCORD! ' + icon('trophy') : '') +
            '<br>Récord: ' +
            BEST +
            '</p>' +
            xpEndHTML(),
          [{ t: 'Jugar otra vez', f: beginRun }]
            .concat(ONLINE ? [{ t: icon('trophy') + ' Ranking', cls: 'alt', f: showRanking }] : [])
            .concat([{ t: 'Menú', cls: 'alt', f: showMenu }]),
        );
      }, 2200);
    }
  }

  /* ============ login, registro y ranking (Firebase) ============ */
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  let fbAuth = null,
    fbDb = null,
    USER = null;
  const FBOK =
    typeof firebase !== 'undefined' &&
    typeof FIREBASE_CONFIG !== 'undefined' &&
    FIREBASE_CONFIG &&
    FIREBASE_CONFIG.apiKey &&
    FIREBASE_CONFIG.apiKey.indexOf('PEGA') < 0;
  if (FBOK) {
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      fbAuth = firebase.auth();
      fbDb = firebase.firestore();
    } catch (e) {
      console.error(e);
    }
  }
  const ONLINE = !!fbAuth;
  const mailOf = (u) => u + '@elasadero.game';
  const cleanUser = (u) => (u || '').trim().toLowerCase();
  const validUser = (u) => /^[a-z0-9_]{3,16}$/.test(u);
  function authError(e) {
    const c = (e && e.code) || '';
    if (c === 'auth/email-already-in-use') {
      return 'Ese usuario ya existe. Prueba con otro nombre.';
    }
    if (c === 'auth/weak-password') {
      return 'La contraseña es muy débil (mínimo 6 caracteres).';
    }
    if (
      c === 'auth/user-not-found' ||
      c === 'auth/wrong-password' ||
      c === 'auth/invalid-credential' ||
      c === 'auth/invalid-login-credentials'
    ) {
      return 'Usuario o contraseña incorrectos.';
    }
    if (c === 'auth/too-many-requests') {
      return 'Demasiados intentos. Espera un momento y prueba otra vez.';
    }
    if (c === 'auth/network-request-failed') {
      return 'Sin conexión. Revisa tu internet.';
    }
    if (c === 'auth/operation-not-allowed') {
      return 'Falta activar Email/Contraseña en Firebase Authentication.';
    }
    return 'Ha ocurrido un error (' + (c || 'desconocido') + ').';
  }
  function formModal(title, sub, fields, btns, msg) {
    let h =
      '<div class="big">' + icon('chicken') + '</div><h1>' + title + '</h1><p>' + sub + '</p>';
    fields.forEach((f) => {
      h +=
        '<input class="inp" id="' +
        f.id +
        '" type="' +
        (f.pw ? 'password' : 'text') +
        '" placeholder="' +
        f.ph +
        '" autocomplete="' +
        f.ac +
        '" maxlength="' +
        (f.pw ? 64 : 16) +
        '" autocapitalize="none" spellcheck="false">';
    });
    h += '<div class="err" id="ferr">' + (msg ? esc(msg) : '') + '</div>';
    setModal(h, btns);
    const first = btns[0];
    fields.forEach((f) => {
      $(f.id).addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          first.f();
        }
      });
    });
    setTimeout(() => {
      try {
        $(fields[0].id).focus();
      } catch (e) {}
    }, 50);
  }
  const ferr = (t) => {
    const e = $('ferr');
    if (e) {
      e.textContent = t;
    }
  };
  function showLogin(msg) {
    resetBattle();
    mode = 'menu';
    hideScreens();
    closeStats();
    $('rosL').style.display = $('rosR').style.display = 'none';
    $('pips').innerHTML = '';
    formModal(
      'EL ASADERO',
      'Inicia sesión para jugar y aparecer en el ranking.',
      [
        { id: 'fu', ph: 'Usuario', ac: 'username' },
        { id: 'fp', ph: 'Contraseña', ac: 'current-password', pw: 1 },
      ],
      [
        { t: 'Entrar', f: doLogin },
        { t: 'Crear cuenta', cls: 'alt', f: () => showRegister() },
      ],
      msg,
    );
  }
  function showRegister(msg) {
    formModal(
      'Crear cuenta',
      'Elige un nombre de usuario (3-16 letras, números o _) y una contraseña.',
      [
        { id: 'fu', ph: 'Usuario', ac: 'username' },
        { id: 'fp', ph: 'Contraseña (mín. 6)', ac: 'new-password', pw: 1 },
        { id: 'fp2', ph: 'Repite la contraseña', ac: 'new-password', pw: 1 },
      ],
      [
        { t: 'Registrarme', f: doRegister },
        { t: 'Ya tengo cuenta', cls: 'alt', f: () => showLogin() },
      ],
      msg,
    );
  }
  function doLogin() {
    const u = cleanUser($('fu').value),
      p = $('fp').value;
    if (!validUser(u) || !p) {
      return ferr('Escribe tu usuario y tu contraseña.');
    }
    ferr('Entrando…');
    fbAuth.signInWithEmailAndPassword(mailOf(u), p).catch((e) => ferr(authError(e)));
  }
  function doRegister() {
    const u = cleanUser($('fu').value),
      p = $('fp').value,
      p2 = $('fp2').value;
    if (!validUser(u)) {
      return ferr('El usuario debe tener 3-16 caracteres: letras, números o _.');
    }
    if (p.length < 6) {
      return ferr('La contraseña debe tener al menos 6 caracteres.');
    }
    if (p !== p2) {
      return ferr('Las contraseñas no coinciden.');
    }
    ferr('Creando cuenta…');
    fbAuth.createUserWithEmailAndPassword(mailOf(u), p).catch((e) => ferr(authError(e)));
  }
  function buildStr() {
    const nm = (m) => (m.hero ? 'Gallina' : 'Pollito');
    const parts = team.map((m) => {
      const a = Object.keys(m.l)
        .filter((k) => m.l[k] && UPG[k])
        .map((k) => UPG[k].n + ' ' + m.l[k]);
      if (m.t) {
        a.unshift(m.t === 1 ? 'Robot' : 'Titán');
      }
      return nm(m) + (a.length ? ': ' + a.join(', ') : '');
    });
    return parts.join(' | ').slice(0, 380);
  }
  function cloudSave() {
    if (!ONLINE || !fbAuth.currentUser || !USER || BEST < 1) {
      return;
    }
    const ref = fbDb.collection('ranking').doc(fbAuth.currentUser.uid),
      ts = firebase.firestore.FieldValue.serverTimestamp(),
      best = BEST;
    const add = Math.floor(pend),
      run = Math.round(runT),
      bs = buildStr();
    ref
      .get()
      .then((d) => {
        if (!d.exists) {
          return ref
            .set({
              username: USER,
              best: best,
              updatedAt: ts,
              playSec: add,
              runSec: run,
              build: bs,
            })
            .then(() => {
              pend -= add;
            });
        }
        const o = d.data(),
          u = { playSec: (o.playSec || 0) + add };
        if (o.best < best) {
          u.best = best;
          u.updatedAt = ts;
          u.runSec = run;
          u.build = bs;
        }
        return ref.update(u).then(() => {
          pend -= add;
        });
      })
      .catch((e) => console.error('No se pudo guardar el ranking', e));
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && mode === 'inf') {
      cloudSave();
    }
  });
  const fmtT = (s) => {
    s = Math.round(s || 0);
    if (s < 60) {
      return s + ' s';
    }
    const m = Math.floor(s / 60);
    if (m < 60) {
      return m + ' min';
    }
    return Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
  };
  function showRanking() {
    hideScreens();
    setModal(
      '<div class="big">' +
        icon('trophy') +
        '</div><h1>Ranking</h1><div class="rank" id="rk">Cargando…</div>',
      [{ t: 'Cerrar', cls: 'alt', f: showMenu }],
    );
    fbDb
      .collection('ranking')
      .orderBy('best', 'desc')
      .limit(25)
      .get()
      .then((snap) => {
        if (snap.empty) {
          $('rk').textContent = 'Todavía no hay nadie. ¡Sé el primero!';
          return;
        }
        let h = '',
          i = 0;
        const me = fbAuth.currentUser && fbAuth.currentUser.uid;
        snap.forEach((d) => {
          const x = d.data();
          if (!x.best) {
            return;
          }
          i++;
          h +=
            '<div class="rk' +
            (d.id === me ? ' me' : '') +
            '"><span>' +
            (i === 1
              ? icon('medal')
              : i === 2
                ? icon('medal')
                : i === 3
                  ? icon('medal')
                  : '#' + i) +
            '</span><span class="nmu">' +
            esc(x.username) +
            (x.xp ? '<span class="tm">' + icon('star') + ' Nv ' + lvOf(x.xp) + '</span>' : '') +
            (x.playSec
              ? '<span class="tm">' + icon('clock') + ' ' + fmtT(x.playSec) + '</span>'
              : '') +
            '</span><b>Ronda ' +
            esc(x.best) +
            '</b>' +
            '<div class="rkd">' +
            (x.runSec
              ? 'Llegó a la ronda ' +
                esc(x.best) +
                ' en <b>' +
                fmtT(x.runSec) +
                '</b> de partida.<br>'
              : '') +
            (x.build ? esc(x.build) : '<i>Sin datos de mejoras (partida anterior).</i>') +
            '</div></div>';
        });
        $('rk').innerHTML = h || 'Todavía no hay nadie. ¡Sé el primero!';
        document
          .querySelectorAll('#rk .rk')
          .forEach((el) => (el.onclick = () => el.classList.toggle('open')));
      })
      .catch((e) => {
        $('rk').textContent = 'No se pudo cargar el ranking.';
        console.error(e);
      });
  }
  function boot() {
    if (!ONLINE) {
      USER = 'Invitado';
      loadProfile('guest', null);
      showMenu();
      return;
    }
    fbAuth.onAuthStateChanged((user) => {
      if (!user) {
        USER = null;
        BEST = 0;
        XP = 0;
        SKIN = 'classic';
        showLogin();
        return;
      }
      USER = (user.email || '').split('@')[0];
      fbDb
        .collection('ranking')
        .doc(user.uid)
        .get()
        .then((d) => {
          BEST = d.exists ? d.data().best || 0 : 0;
          loadProfile(user.uid, d.exists ? d.data() : null);
        })
        .catch(() => {
          BEST = 0;
          loadProfile(user.uid, null);
        })
        .then(showMenu);
    });
  }
  /* ============ efectos ============ */
  function burst(x, y, z, n, cols, sp, sz, life) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28,
        e = Math.random() * 0.8 + 0.2;
      parts.push({
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
  }
  function puff(x, z, n, s) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28;
      parts.push({
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
  }
  function floater(x, y, z, t, c) {
    if (floaters.length < 60) {
      floaters.push({ x, y, z, t, c, life: 0.9 });
    }
  }

  /* ============ combate ============ */
  /**
   * Apply armor, damage, healing and the phoenix/death transition atomically.
   * The target is mutated; dying and invulnerable units ignore subsequent damage.
   * @param {object|null} src Damage source, or null for a damage-over-time tick.
   * @param {object} t Target unit.
   * @param {number} dmg Unmitigated damage.
   * @param {object} [o] Hit metadata used for critical and ability feedback.
   * @returns {void}
   */
  function hurt(src, t, dmg, o) {
    if (t.dying || t.dead || t.invuln > 0) {
      return;
    }
    o = o || {};
    dmg *= t.dmgMul || 1;
    t.hp -= dmg;
    t.flash = 0.18;
    if (src && src.vamp && src.hp > 0) {
      src.hp = Math.min(src.max, src.hp + dmg * src.vamp);
    }
    const big = dmg > t.max * 0.25 || dmg > 25 || o.crit;
    floater(
      t.x + (Math.random() - 0.5) * 0.5,
      t.top + 0.2,
      t.z,
      Math.round(dmg) + '',
      o.crit ? '#ffd24a' : o.burn ? '#ff9a3d' : o.laser ? '#ff7be0' : big ? '#ff7b3d' : '#fff',
    );
    if (!o.burn) {
      burst(
        t.x,
        t.top * 0.6,
        t.z,
        big ? 10 : 5,
        t.robot ? ['#ffb83d', '#fff3a0'] : ['#fff3a0', '#ffffff', '#ffd24a'],
        3.2,
        0.09,
        0.4,
      );
      snd.hit(big);
      renderer.shake = Math.min(0.5, renderer.shake + (big ? 0.22 : 0.04));
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
        }
        burst(t.x, t.top * 0.6, t.z, 40, ['#ffd24a', '#ff9a3d', '#fff', '#ff5a1a'], 6, 0.14, 0.9);
        puff(t.x, t.z, 8, 0.6);
        fx.push({ k: 'ring', x: t.x, z: t.z, r: 2.6, t: 0, max: 0.6, c: '255,170,40' });
        floater(t.x, t.top + 0.9, t.z, '¡HUEVO FÉNIX!', '#ffb83d');
        tone(300, 1400, 0.5, 'triangle', 0.09);
        renderer.shake = Math.min(0.6, renderer.shake + 0.3);
        return;
      }
      t.hp = 0;
      t.dying = true;
      t.dieT = 0;
      t.state = 'die';
      puff(t.x, t.z, 8, 0.5);
      burst(t.x, t.top * 0.5, t.z, 14, ['#ffd24a', '#ff6b6b', '#fff'], 4.5, 0.11, 0.7);
      floater(t.x, t.top + 0.8, t.z, '¡KO!', '#ffd24a');
      snd.ko();
      renderer.shake = Math.min(0.6, renderer.shake + 0.3);
    }
  }
  function strike(u, t) {
    let dmg = u.atk * u.rate * (0.85 + Math.random() * 0.3),
      crit = false;
    if (u.crit && Math.random() < u.crit) {
      dmg *= 3;
      crit = true;
      burst(t.x, t.top * 0.7, t.z, 14, ['#ffd700', '#fff3a0', '#ffffff'], 4, 0.1, 0.6);
    }
    const dx = t.x - u.x,
      dz = t.z - u.z,
      d = Math.hypot(dx, dz) || 1,
      k = Math.min(5, 2 + (dmg / t.max) * 10);
    t.kx += (dx / d) * k;
    t.kz += (dz / d) * k;
    hurt(u, t, dmg, { crit });
    if (u.fireDps && !t.dying) {
      t.burn = { t: 3, dps: u.fireDps, tick: 0.5 };
    }
  }
  function explodeEgg(f) {
    burst(f.x1, 0.6, f.z1, 26, ['#fff3a0', '#ffb83d', '#ffffff', '#ff7b3d'], 6, 0.14, 0.7);
    puff(f.x1, f.z1, 10, 0.6);
    fx.push({ k: 'ring', x: f.x1, z: f.z1, r: f.rad, t: 0, max: 0.45, c: '255,200,80' });
    snd.boom();
    renderer.shake = Math.min(0.7, renderer.shake + 0.35);
    units.forEach((e) => {
      if (
        e.side !== f.side &&
        !e.dying &&
        !e.dead &&
        Math.hypot(e.x - f.x1, e.z - f.z1) < f.rad + e.size * 0.4
      ) {
        hurt(f.src, e, f.dmg, { egg: true });
      }
    });
  }
  function heroAbilities(u, alive, dt) {
    const ab = u.ab;
    if (!ab.laser && !ab.egg && !ab.storm) {
      return;
    }
    const en = alive.filter((e) => e.side !== u.side && !e.dying);
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
          fx.push({
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
          burst(t.x, t.top * 0.55, t.z, 10, ['#ff7be0', '#ffffff', '#ff3a8a'], 4, 0.1, 0.5);
          hurt(u, t, ab.laser.dmg, { laser: true });
        }
        snd.laser();
      }
    }
    if (ab.egg) {
      u.eggT -= dt;
      if (u.eggT <= 0) {
        u.eggT = ab.egg.cd;
        const t = en[(Math.random() * en.length) | 0];
        fx.push({
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
        fx.push({ k: 'ring', x: u.x, z: u.z, r: ab.storm.rad, t: 0, max: 0.5, c: '255,255,255' });
        for (let i = 0; i < 30; i++) {
          const a = (i / 30) * 6.28;
          parts.push({
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
        snd.laser();
        en.forEach((e) => {
          if (Math.hypot(e.x - u.x, e.z - u.z) < ab.storm.rad + e.size * 0.4) {
            hurt(u, e, ab.storm.dmg, {});
          }
        });
      }
    }
  }
  /**
   * Advance combat without rendering. Targeting uses borrowed scratch arrays.
   * Units may die during this step, so cached targets are rechecked before every hit.
   * @param {number} dt Simulation step in seconds, normally at most 0.025.
   * @returns {void}
   */
  function stepFight(dt) {
    battleIndex.collect(units);
    const { alive, teams } = battleIndex;
    for (const u of alive) {
      if (u.dying) {
        continue;
      }
      u.flash = Math.max(0, u.flash - dt);
      if (u.invuln > 0) {
        u.invuln -= dt;
      }
      if (u.burn) {
        u.burn.t -= dt;
        u.burn.tick -= dt;
        if (u.burn.tick <= 0) {
          u.burn.tick = 0.5;
          hurt(null, u, u.burn.dps * 0.5, { burn: true });
          burst(u.x, u.top * 0.7, u.z, 3, ['#ff9a3d', '#ffd24a'], 1.6, 0.08, 0.4);
        }
        if (u.burn.t <= 0) {
          u.burn = null;
        }
        if (u.dying) {
          continue;
        }
      }
      if (u.hero && u.ab) {
        heroAbilities(u, alive, dt);
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
        for (const e of teams[1 - u.side]) {
          if (e.dying) {
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
        u.yaw = turnTo(u.yaw, Math.atan2(-dz, dx), dt * 14);
        if (!u.hit && u.atkT >= 0.38) {
          u.hit = true;
          if (!t.dying) {
            strike(u, t);
          }
        }
        if (u.atkT >= 0.6) {
          u.state = 'idle';
          u.cd = u.rate * (0.85 + Math.random() * 0.3);
        }
        continue;
      }
      u.cd -= dt;
      if (dist <= reach * 1.15) {
        u.state = 'idle';
        u.yaw = turnTo(u.yaw, Math.atan2(-dz, dx), dt * 14);
        if (u.cd <= 0) {
          u.state = 'attack';
          u.atkT = 0;
          u.hit = false;
        }
      } else {
        u.state = 'walk';
        u.yaw = turnTo(u.yaw, Math.atan2(-dz, dx), dt * 12);
        u.x += (dx / dist) * u.spd * dt;
        u.z += (dz / dist) * u.spd * dt;
        u.gait += dt * u.spd * 0.9;
      }
    }
    const al2 = collisionUnits;
    al2.length = 0;
    for (const unit of alive) {
      if (!unit.dying) {
        al2.push(unit);
      }
    }
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
    fightT += dt;
    battleIndex.collect(units);
    const [pl, bl] = battleIndex.teams;
    if (!fightEnd && (!pl.length || !bl.length || fightT > 60)) {
      let pw =
        pl.length > 0 &&
        (bl.length === 0 || pl.reduce((s, u) => s + u.hp, 0) >= bl.reduce((s, u) => s + u.hp, 0));
      if (!pl.length) {
        pw = false;
      }
      endT = 0;
      units.forEach((u) => {
        if (!u.dying && (u.side === 0) === pw) {
          u.win = true;
          u.state = 'idle';
        }
      });
      fightEnd = pw ? 1 : 2;
    }
  }
  /**
   * Advance effects and compact survivors in place, including rings appended by eggs.
   * @param {number} dt Scaled simulation time in seconds.
   * @returns {void}
   */
  function updateFx(dt) {
    let writeIndex = 0;
    for (const f of fx) {
      f.t += dt;
      if (f.k === 'egg' && !f.done && f.t >= f.dur) {
        f.done = true;
        explodeEgg(f);
      }
      if (f.k === 'egg' ? !f.done : f.t < f.max) {
        fx[writeIndex++] = f;
      }
    }
    fx.length = writeIndex;
  }
  function updateAnim(u, dt) {
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
        puff(u.x, u.z, 5, 0.35);
        snd.drop();
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
        puff(u.x, u.z, 6, 0.45);
      }
      return;
    }
    if (u.state === 'attack') {
      const c = atkCurve(u.atkT);
      u.pitch = c[0];
      u.lunge = c[1];
    } else if (u.state === 'walk') {
      u.y = Math.abs(Math.sin(u.gait * 8)) * 0.07;
      u.pitch = -0.05;
    } else {
      u.y = Math.sin(TT * 3 + u.seed) * 0.02;
    }
    if (u.win) {
      u.y = Math.abs(Math.sin(TT * 9 + u.seed)) * 0.5;
    }
  }

  /* ============ bucle ============ */
  /**
   * Advance timers, combat, particles and animations for one bounded clock step.
   * Rendering and wall-clock scheduling are intentionally owned by other modules.
   * @param {number} dt Unscaled elapsed time in seconds.
   * @returns {void}
   */
  function update(dt) {
    try {
      musicTick();
    } catch (e) {}
    renderer.update(dt);
    if (st === 'entrance') {
      entrance.update(document.hidden ? 0 : dt);
    }
    if (drawerOpen && statsShown) {
      statsT -= dt;
      if (statsT <= 0) {
        statsT = 0.5;
        refreshStats();
      }
    }
    runTimers(dt);
    const sdt = dt * speed;
    if (
      mode === 'inf' &&
      st !== 'levelend' &&
      (!document.hidden || st === 'fight' || st === 'intro' || st === 'rounddone0')
    ) {
      runT += dt;
      pend += dt;
    }
    if (st === 'fight') {
      if (!fightEnd) {
        const n = Math.ceil(sdt / 0.025);
        for (let i = 0; i < n; i++) {
          stepFight(sdt / n);
        }
      } else {
        endT += sdt;
        if (endT > 2.0) {
          const pw = fightEnd === 1;
          st = 'rounddone0';
          roundOver(pw);
        }
      }
    }
    updateFx(sdt);
    units.forEach((u) => updateAnim(u, sdt));
    if (units.some((u) => u.dead)) {
      units = units.filter((u) => !u.dead);
    }
    for (const p of parts) {
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
    removeExpired(parts);
    for (const f of floaters) {
      f.life -= sdt;
      f.y += 1.3 * sdt;
    }
    removeExpired(floaters);
  }
  document.getElementById('skip-entrance').onclick = () => entrance.skip();
  function onEntranceKey(event) {
    if (entrance.active && event.key === 'Escape') {
      event.preventDefault();
      entrance.skip();
    }
  }
  document.addEventListener('keydown', onEntranceKey);
  $('spd').onclick = () => {
    speed = speed === 1 ? 2 : speed === 2 ? 3 : 1;
    $('spd').textContent = 'x' + speed;
  };
  const toggleSnd = () => {
    audio.muted = !audio.muted;
    refreshDrawer();
  };
  const toggleMus = () => {
    ensureAudio();
    audio.musicOn = !audio.musicOn;
    refreshDrawer();
  };
  $('menu').onclick = () => {
    ensureAudio();
    drawerOpen ? closeDrawer() : openDrawer();
  };
  $('dclose').onclick = closeDrawer;
  $('d-stats').onclick = () => {
    statsShown = !statsShown;
    $('dstats').classList.toggle('on', statsShown);
    $('d-stats').querySelector('.ar').textContent = statsShown ? '▴' : '▾';
    refreshStats();
  };
  $('d-mus').onclick = toggleMus;
  $('d-snd').onclick = toggleSnd;
  $('d-rank').onclick = () => {
    closeDrawer();
    showRanking();
  };
  $('d-home').onclick = () => {
    if (!homeArm) {
      homeArm = 1;
      $('d-home').innerHTML = icon('alert') + ' ¿Seguro? Pulsa otra vez';
      setTimeout(() => {
        if (homeArm) {
          homeArm = 0;
          $('d-home').innerHTML = icon('home') + ' Menú principal';
        }
      }, 3000);
      return;
    }
    closeDrawer();
    showMenu();
  };
  $('d-out').onclick = () => {
    closeDrawer();
    fbAuth && fbAuth.signOut();
  };
  boot();
  const loop = createGameLoop({
    advance(dt) {
      TT += dt;
      update(dt);
    },
    render() {
      renderer.render();
      renderer.renderIcons();
    },
  });
  return () => {
    loop.stop();
    motion.destroy();
    entrance.cancel();
    document.removeEventListener('keydown', onEntranceKey);
  };
}
