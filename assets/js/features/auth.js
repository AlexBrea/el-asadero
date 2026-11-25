import { icon } from './metadata.js';
/** @module features/auth */

/**
 * Install auth capabilities into one isolated game session.
 * Cross-feature dependencies are explicit properties; no globals or inline scripts are required.
 * @param {object} game Mutable session and service registry, owned by the application root.
 * @returns {void}
 */
export function installAuth(game) {
  game.authError = function authError(e) {
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
  };
  game.formModal = function formModal(title, sub, fields, btns, msg) {
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
    h += '<div class="err" id="ferr">' + (msg ? game.esc(msg) : '') + '</div>';
    game.setModal(h, btns);
    const first = btns[0];
    fields.forEach((f) => {
      game.$(f.id).addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          first.f();
        }
      });
    });
    setTimeout(() => {
      try {
        game.$(fields[0].id).focus();
      } catch (e) {}
    }, 50);
  };
  game.showLogin = function showLogin(msg) {
    game.resetBattle();
    game.mode = 'menu';
    game.hideScreens();
    game.closeStats();
    game.$('rosL').style.display = game.$('rosR').style.display = 'none';
    game.$('pips').innerHTML = '';
    game.formModal(
      'EL ASADERO',
      'Inicia sesión para jugar y aparecer en el ranking.',
      [
        { id: 'fu', ph: 'Usuario', ac: 'username' },
        { id: 'fp', ph: 'Contraseña', ac: 'current-password', pw: 1 },
      ],
      [
        { t: 'Entrar', f: game.doLogin },
        { t: 'Crear cuenta', cls: 'alt', f: () => game.showRegister() },
      ],
      msg,
    );
  };
  game.showRegister = function showRegister(msg) {
    game.formModal(
      'Crear cuenta',
      'Elige un nombre de usuario (3-16 letras, números o _) y una contraseña.',
      [
        { id: 'fu', ph: 'Usuario', ac: 'username' },
        { id: 'fp', ph: 'Contraseña (mín. 6)', ac: 'new-password', pw: 1 },
        { id: 'fp2', ph: 'Repite la contraseña', ac: 'new-password', pw: 1 },
      ],
      [
        { t: 'Registrarme', f: game.doRegister },
        { t: 'Ya tengo cuenta', cls: 'alt', f: () => game.showLogin() },
      ],
      msg,
    );
  };
  game.doLogin = function doLogin() {
    const u = game.cleanUser(game.$('fu').value),
      p = game.$('fp').value;
    if (!game.validUser(u) || !p) {
      return game.ferr('Escribe tu usuario y tu contraseña.');
    }
    game.ferr('Entrando…');
    game.fbAuth
      .signInWithEmailAndPassword(game.mailOf(u), p)
      .catch((e) => game.ferr(game.authError(e)));
  };
  game.doRegister = function doRegister() {
    const u = game.cleanUser(game.$('fu').value),
      p = game.$('fp').value,
      p2 = game.$('fp2').value;
    if (!game.validUser(u)) {
      return game.ferr('El usuario debe tener 3-16 caracteres: letras, números o _.');
    }
    if (p.length < 6) {
      return game.ferr('La contraseña debe tener al menos 6 caracteres.');
    }
    if (p !== p2) {
      return game.ferr('Las contraseñas no coinciden.');
    }
    game.ferr('Creando cuenta…');
    game.fbAuth
      .createUserWithEmailAndPassword(game.mailOf(u), p)
      .catch((e) => game.ferr(game.authError(e)));
  };
  game.buildStr = function buildStr() {
    const nm = (m) => (m.hero ? 'Gallina' : 'Pollito');
    const parts = game.team.map((m) => {
      const a = Object.keys(m.l)
        .filter((k) => m.l[k] && game.UPG[k])
        .map((k) => game.UPG[k].n + ' ' + m.l[k]);
      if (m.t) {
        a.unshift(m.t === 1 ? 'Robot' : 'Titán');
      }
      return nm(m) + (a.length ? ': ' + a.join(', ') : '');
    });
    return parts.join(' | ').slice(0, 380);
  };
  game.cloudSave = function cloudSave() {
    if (!game.ONLINE || !game.fbAuth.currentUser || !game.USER || game.BEST < 1) {
      return;
    }
    const ref = game.fbDb.collection('ranking').doc(game.fbAuth.currentUser.uid),
      ts = firebase.firestore.FieldValue.serverTimestamp(),
      best = game.BEST;
    const add = Math.floor(game.pend),
      run = Math.round(game.runT),
      bs = game.buildStr();
    ref
      .get()
      .then((d) => {
        if (!d.exists) {
          return ref
            .set({
              username: game.USER,
              best: best,
              updatedAt: ts,
              playSec: add,
              runSec: run,
              build: bs,
            })
            .then(() => {
              game.pend -= add;
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
          game.pend -= add;
        });
      })
      .catch((e) => console.error('No se pudo guardar el ranking', e));
  };
  game.showRanking = function showRanking() {
    game.hideScreens();
    game.setModal(
      '<div class="big">' +
        icon('trophy') +
        '</div><h1>Ranking</h1><div class="rank" id="rk">Cargando…</div>',
      [{ t: 'Cerrar', cls: 'alt', f: game.showMenu }],
    );
    game.fbDb
      .collection('ranking')
      .orderBy('best', 'desc')
      .limit(25)
      .get()
      .then((snap) => {
        if (snap.empty) {
          game.$('rk').innerHTML = 'Todavía no hay nadie. ¡Sé el primero!';
          return;
        }
        let h = '',
          i = 0;
        const me = game.fbAuth.currentUser && game.fbAuth.currentUser.uid;
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
            game.esc(x.username) +
            (x.xp
              ? '<span class="tm">' + icon('star') + ' Nv ' + game.lvOf(x.xp) + '</span>'
              : '') +
            (x.playSec
              ? '<span class="tm">' + icon('clock') + ' ' + game.fmtT(x.playSec) + '</span>'
              : '') +
            '</span><b>Ronda ' +
            game.esc(x.best) +
            '</b>' +
            '<div class="rkd">' +
            (x.runSec
              ? 'Llegó a la ronda ' +
                game.esc(x.best) +
                ' en <b>' +
                game.fmtT(x.runSec) +
                '</b> de partida.<br>'
              : '') +
            (x.build ? game.esc(x.build) : '<i>Sin datos de mejoras (partida anterior).</i>') +
            '</div></div>';
        });
        game.$('rk').innerHTML = h || 'Todavía no hay nadie. ¡Sé el primero!';
        document
          .querySelectorAll('#rk .rk')
          .forEach((el) => (el.onclick = () => el.classList.toggle('open')));
      })
      .catch((e) => {
        game.$('rk').innerHTML = 'No se pudo cargar el ranking.';
        console.error(e);
      });
  };
  game.boot = function boot() {
    if (!game.ONLINE) {
      game.USER = 'Invitado';
      game.loadProfile('guest', null);
      game.showMenu();
      return;
    }
    game.fbAuth.onAuthStateChanged((user) => {
      if (!user) {
        game.USER = null;
        game.BEST = 0;
        game.XP = 0;
        game.SKIN = 'classic';
        game.showLogin();
        return;
      }
      game.USER = (user.email || '').split('@')[0];
      Promise.all([
        game.fbDb.collection('ranking').doc(user.uid).get(),
        game.fbDb
          .collection('players')
          .doc(user.uid)
          .get()
          .catch(() => null),
      ])
        .then(([d, pl]) => {
          game.BEST = d.exists ? d.data().best || 0 : 0;
          game.loadProfile(
            user.uid,
            d.exists ? d.data() : null,
            pl && pl.exists ? pl.data() : null,
          );
        })
        .catch(() => {
          game.BEST = 0;
          game.loadProfile(user.uid, null);
        })
        .then(game.showMenu);
    });
  };
  game.esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  game.fbAuth = null;
  game.fbDb = null;
  game.USER = null;
  game.FBOK =
    typeof firebase !== 'undefined' &&
    typeof FIREBASE_CONFIG !== 'undefined' &&
    FIREBASE_CONFIG &&
    FIREBASE_CONFIG.apiKey &&
    FIREBASE_CONFIG.apiKey.indexOf('PEGA') < 0;
  if (game.FBOK) {
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      game.fbAuth = firebase.auth();
      game.fbDb = firebase.firestore();
    } catch (e) {
      console.error(e);
    }
  }
  game.ONLINE = !!game.fbAuth;
  game.mailOf = (u) => u + '@elasadero.game';
  game.cleanUser = (u) => (u || '').trim().toLowerCase();
  game.validUser = (u) => /^[a-z0-9_]{3,16}$/.test(u);
  game.ferr = (t) => {
    const e = game.$('ferr');
    if (e) {
      e.textContent = t;
    }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      game.cloudProfile(true);
      if (game.mode === 'inf') {
        game.cloudSave();
      }
    }
  });
  game.fmtT = (s) => {
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
}
