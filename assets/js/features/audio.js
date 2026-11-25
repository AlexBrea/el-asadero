/** @module features/audio */

/**
 * Install audio capabilities into one isolated game session.
 * Cross-feature dependencies are explicit properties; no globals or inline scripts are required.
 * @param {object} game Mutable session and service registry, owned by the application root.
 * @returns {void}
 */
export function installAudio(game) {
  game.tone = function tone(f1, f2, d, type, v) {
    if (game.muted || !game.AC) {
      return;
    }
    try {
      const t = game.AC.currentTime,
        o = game.AC.createOscillator(),
        g = game.AC.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(f1, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + d);
      g.gain.setValueAtTime(v || 0.05, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g);
      g.connect(game.AC.destination);
      o.start(t);
      o.stop(t + d + 0.02);
    } catch (e) {}
  };
  game.ensureAudio = function ensureAudio() {
    if (!game.AC) {
      try {
        game.AC = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {}
    }
    if (game.AC && game.AC.state === 'suspended') {
      game.AC.resume();
    }
  };
  game.mNote = function mNote(t, f, dur, type, v, glide) {
    const o = game.AC.createOscillator(),
      g = game.AC.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (glide) {
      o.frequency.exponentialRampToValueAtTime(glide, t + dur);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(game.MG);
    o.start(t);
    o.stop(t + dur + 0.03);
  };
  game.mNoise = function mNoise(t, dur, v, hp) {
    const s = game.AC.createBufferSource();
    s.buffer = game.NB;
    const f = game.AC.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    const g = game.AC.createGain();
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(game.MG);
    s.start(t);
    s.stop(t + dur + 0.03);
  };
  game.playStep = function playStep(t, mode, step, sp) {
    const bar = ((step / 16) | 0) % 4,
      s = step % 16,
      ch = game.CHS[mode][bar],
      r = ch[0],
      tn = ch[1];
    if (mode === 'calm') {
      if (s === 0) {
        tn.forEach((x) => game.mNote(t, game.NF(r + 12 + x), sp * 15, 'triangle', 0.05));
      }
      if (s === 0 || s === 8) {
        game.mNote(t, game.NF(r), sp * 7, 'sine', 0.2);
      }
      if (s % 2 === 0) {
        game.mNote(t, game.NF(r + 24 + tn[(s / 2) % 3]), sp * 3, 'triangle', 0.05);
      }
      if (s % 4 === 2) {
        game.mNoise(t, 0.05, 0.03, 8000);
      }
      return;
    }
    const boss = mode === 'boss';
    if (s % 4 === 0) {
      game.mNote(t, boss ? 170 : 150, 0.16, 'sine', 0.9, 40);
    }
    if (s === 4 || s === 12) {
      game.mNoise(t, 0.13, 0.32, 1800);
      game.mNote(t, 190, 0.08, 'triangle', 0.25, 110);
    }
    if (s % 2 === 0) {
      game.mNoise(t, s % 4 === 2 ? 0.09 : 0.04, s % 4 === 2 ? 0.1 : 0.06, 7000);
    }
    if (s % 2 === 0) {
      game.mNote(t, game.NF(r + (s % 4 === 2 ? 12 : 0)), sp * 1.8, 'sawtooth', 0.13);
    }
    game.mNote(t, game.NF(r + 24 + tn[s % 3] + (s % 8 >= 4 ? 12 : 0)), sp * 1.4, 'triangle', 0.05);
    const m = game.MEL[s];
    if (m >= 0) {
      game.mNote(
        t,
        game.NF(r + (boss ? 24 : 36) + (m === 3 ? tn[0] + 12 : tn[m])),
        sp * 2.4,
        'square',
        0.04,
      );
    }
  };
  game.musicWant = function musicWant() {
    if (game.mode !== 'inf') {
      return 'calm';
    }
    if (game.st === 'fight' || game.st === 'intro') {
      return game.infN % 10 === 0 ? 'boss' : 'fight';
    }
    return 'calm';
  };
  game.musicTick = function musicTick() {
    if (!game.AC || !game.musicOn || game.muted || game.AC.state !== 'running') {
      return;
    }
    if (!game.MG) {
      game.MG = game.AC.createGain();
      game.MG.gain.value = 0.35;
      game.MG.connect(game.AC.destination);
      const L = game.AC.sampleRate >> 1;
      game.NB = game.AC.createBuffer(1, L, game.AC.sampleRate);
      const d = game.NB.getChannelData(0);
      for (let i = 0; i < L; i++) {
        d[i] = Math.random() * 2 - 1;
      }
    }
    const w = game.musicWant(),
      now = game.AC.currentTime;
    if (w !== game.mus.mode || game.mus.next < now - 0.5) {
      game.mus.mode = w;
      game.mus.step = 0;
      game.mus.next = now + 0.05;
    }
    const sp = w === 'calm' ? 60 / 84 / 4 : w === 'boss' ? 60 / 165 / 4 : 60 / 150 / 4;
    while (game.mus.next < now + 0.7) {
      game.playStep(game.mus.next, w, game.mus.step, sp);
      game.mus.next += sp;
      game.mus.step++;
    }
  };
  game.AC = null;
  game.muted = false;
  game.lastHit = 0;
  game.snd = {
    hit(big) {
      const n = performance.now();
      if (n - game.lastHit < 45) {
        return;
      }
      game.lastHit = n;
      game.tone(big ? 160 : 260, big ? 50 : 80, 0.1, 'square', 0.05);
    },
    ko() {
      game.tone(420, 70, 0.35, 'sawtooth', 0.05);
    },
    drop() {
      game.tone(300, 700, 0.12, 'sine', 0.06);
    },
    win() {
      /* gallina: po-koo, po-koo */
      const c = (d) => {
        setTimeout(() => {
          game.tone(520, 330, 0.07, 'triangle', 0.12);
          game.tone(1040, 660, 0.05, 'sine', 0.04);
        }, d);
        setTimeout(() => {
          game.tone(380, 900, 0.07, 'sawtooth', 0.07);
          game.tone(900, 520, 0.16, 'sawtooth', 0.07);
          game.tone(760, 1040, 0.05, 'sine', 0.04);
        }, d + 110);
      };
      c(0);
      c(520);
      c(1040);
    },
    lose() {
      [400, 330, 260, 200].forEach((f, i) =>
        setTimeout(() => game.tone(f, f * 0.98, 0.22, 'sawtooth', 0.05), i * 160),
      );
    },
    click() {
      game.tone(500, 800, 0.08, 'triangle', 0.06);
    },
    laser() {
      game.tone(1100, 200, 0.25, 'sawtooth', 0.04);
    },
    boom() {
      game.tone(140, 35, 0.3, 'square', 0.07);
    },
  };
  game.musicOn = true;
  game.MG = null;
  game.NB = null;
  game.mus = { next: 0, step: 0, mode: '' };
  game.NF = (n) => 440 * Math.pow(2, (n - 69) / 12);
  game.CHS = {
    fight: [
      [45, [0, 3, 7]],
      [41, [0, 4, 7]],
      [48, [0, 4, 7]],
      [43, [0, 4, 7]],
    ],
    boss: [
      [38, [0, 3, 7]],
      [34, [0, 4, 7]],
      [43, [0, 3, 7]],
      [33, [0, 4, 7]],
    ],
    calm: [
      [48, [0, 4, 7]],
      [45, [0, 3, 7]],
      [41, [0, 4, 7]],
      [43, [0, 4, 7]],
    ],
  };
  game.MEL = [0, -1, 2, -1, 1, -1, 0, -1, 1, -1, 2, 3, 2, -1, 1, -1];
}
