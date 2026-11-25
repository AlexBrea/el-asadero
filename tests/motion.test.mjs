import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMotionController } from '../assets/js/motion.js';

function fixture() {
  const calls = [],
    listeners = new Map(),
    preferences = new Map(),
    timers = new Map();
  let nextTimer = 0;
  const root = {
    dataset: {},
    removeAttribute() {
      delete this.dataset.motionInput;
    },
  };
  const preference = {
    matches: false,
    addEventListener: (name, listener) => preferences.set(name, listener),
    removeEventListener: (name) => preferences.delete(name),
  };
  const environment = {
    document: {
      documentElement: root,
      addEventListener: (name, listener) => listeners.set(name, listener),
      removeEventListener: (name) => listeners.delete(name),
    },
    matchMedia: () => preference,
    getComputedStyle: () => ({
      opacity: '0.7',
      transform: 'matrix(1, 0, 0, 1, 0, 3)',
      getPropertyValue: () => '',
    }),
    setTimeout(callback) {
      timers.set(++nextTimer, callback);
      return nextTimer;
    },
    clearTimeout: (id) => timers.delete(id),
  };
  const element = () => ({
    style: {},
    animate(keyframes, options) {
      let resolve, reject;
      const finished = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
      });
      const animation = {
        finished,
        cancelled: false,
        cancel() {
          this.cancelled = true;
          reject(new Error('cancelled'));
        },
        finish: resolve,
      };
      calls.push({ keyframes, options, animation });
      return animation;
    },
  });
  return { calls, listeners, preferences, timers, root, preference, element, environment };
}

test('entrances use bounded staggering and release their transform after playback', () => {
  const f = fixture(),
    motion = createMotionController(f.environment);
  motion.reveal(Array.from({ length: 6 }, f.element));
  assert.deepEqual(
    f.calls.map((call) => call.options.delay),
    [0, 40, 80, 80, 80, 80],
  );
  assert.ok(
    f.calls.every((call) => call.options.duration === 200 && call.options.fill === 'backwards'),
  );
  assert.ok(
    f.calls.every((call) => call.keyframes[0].opacity === 0 && call.keyframes.at(-1).opacity === 1),
  );
  motion.destroy();
});

test('keyboard cancels existing motion and leaves future commands immediate', () => {
  const f = fixture(),
    motion = createMotionController(f.environment);
  motion.reveal([f.element()]);
  f.listeners.get('keydown')({ key: 'Tab' });
  assert.equal(f.calls[0].animation.cancelled, true);
  motion.reveal([f.element()]);
  assert.equal(f.calls.length, 1);
  assert.equal(f.root.dataset.motionInput, 'keyboard');
  f.listeners.get('pointerdown')();
  motion.reveal([f.element()]);
  assert.equal(f.calls.length, 2);
  motion.destroy();
});

test('reduced motion cancels movement and uses an unstaggered opacity fade', () => {
  const f = fixture(),
    motion = createMotionController(f.environment);
  motion.reveal([f.element()]);
  f.preference.matches = true;
  f.preferences.get('change')();
  assert.equal(f.calls[0].animation.cancelled, true);
  motion.reveal([f.element(), f.element()]);
  for (const call of f.calls.slice(1)) {
    assert.equal(call.options.duration, 120);
    assert.equal(call.options.delay, 0);
    assert.ok(call.keyframes.every((frame) => !('transform' in frame)));
  }
  motion.destroy();
});

test('interrupted entrances retarget from the current visual position', () => {
  const f = fixture(),
    motion = createMotionController(f.environment),
    element = f.element();
  motion.reveal([element]);
  motion.reveal([element]);
  assert.equal(f.calls[0].animation.cancelled, true);
  assert.equal(f.calls[1].keyframes[0].opacity, '0.7');
  assert.equal(f.calls[1].keyframes[0].transform, 'matrix(1, 0, 0, 1, 0, 3)');
  motion.destroy();
});

test('announcement fallback replaces timers and teardown releases all listeners', () => {
  const f = fixture(),
    motion = createMotionController(f.environment),
    element = { style: {} };
  f.listeners.get('keydown')({ key: 'Enter' });
  motion.announce(element);
  motion.announce(element);
  assert.equal(element.style.opacity, '1');
  assert.equal(f.timers.size, 1);
  motion.destroy();
  motion.destroy();
  assert.equal(element.style.opacity, '');
  assert.equal(f.timers.size, 0);
  assert.equal(f.listeners.size, 0);
  assert.equal(f.preferences.size, 0);
});
