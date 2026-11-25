import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateCatalog, freezeCatalog } from '../assets/js/catalog.js';
import { removeExpired, createBattleIndex } from '../assets/js/simulation.js';
import { createGameLoop } from '../assets/js/loop.js';
import { sanitizeChickenName, normalizeExperience, getLevelInfo } from '../assets/js/profile.js';
import { createRules } from './runtime-fixture.mjs';
import { createRingEntrance } from '../assets/js/run-intro.js';

const catalog = JSON.parse(readFileSync(new URL('../assets/data/game.json', import.meta.url)));

test('catalog validation rejects broken cross-references and non-finite balance inputs', () => {
  assert.equal(validateCatalog(catalog), catalog);
  for (const corrupt of [
    (value) => {
      value.upgrades.power.rarity = 'missing';
    },
    (value) => {
      value.rarities.common.weight = -1;
    },
    (value) => {
      value.rarities.common.weight = 54;
    },
    (value) => {
      value.balance.enemyGrowth = Infinity;
    },
    (value) => {
      value.balance.enemyOrder.push('missing');
    },
    (value) => {
      value.upgrades.power.max = 1.5;
    },
    (value) => {
      value.specializations.war.up.push('missing');
    },
    (value) => {
      delete value.ultimates.rage;
    },
    (value) => {
      value.cosmetics[0].slot = 'missing';
    },
    (value) => {
      value.chests.weights.n.rare = 71;
    },
    (value) => {
      value.chests.copiesRequired[1] = 0;
    },
  ]) {
    const invalid = structuredClone(catalog);
    corrupt(invalid);
    assert.throws(() => validateCatalog(invalid), TypeError);
  }
});

test('catalog freezing protects nested balance without freezing member progression', () => {
  const frozen = freezeCatalog(structuredClone(catalog));
  assert.throws(() => {
    frozen.upgrades.power.max = 100;
  }, TypeError);
  assert.throws(() => {
    frozen.balance.healthTiers.push(8);
  }, TypeError);
  assert.equal(freezeCatalog(frozen), frozen);
});

test('particle compaction preserves identity and order across mixed and fully expired bursts', () => {
  const first = { life: 2 },
    last = { life: 1 };
  const items = [{ life: 0 }, first, { life: -1 }, last, { life: 0 }];
  const original = items;
  removeExpired(items);
  assert.equal(items, original);
  assert.deepEqual(items, [first, last]);
  first.life = 0;
  last.life = -1;
  removeExpired(items);
  assert.equal(items.length, 0);
  removeExpired(items);
});

test('battle index reuses arrays and excludes deaths between combat substeps', () => {
  const index = createBattleIndex();
  const ally = { side: 0, dying: false, dead: false };
  const enemy = { side: 1, dying: false, dead: false };
  const alive = index.alive,
    allies = index.teams[0];
  index.collect([ally, enemy]);
  assert.deepEqual(index.teams, [[ally], [enemy]]);
  enemy.dying = true;
  index.collect([ally, enemy]);
  assert.equal(index.alive, alive);
  assert.equal(index.teams[0], allies);
  assert.deepEqual(index.alive, [ally]);
});

function clockEnvironment() {
  let now = 0,
    nextFrame = 0;
  const frames = new Map(),
    listeners = new Map();
  const worker = {
    terminateCount: 0,
    terminate() {
      this.terminateCount++;
    },
  };
  const environment = {
    performance: { now: () => now },
    document: {
      hidden: false,
      addEventListener: (name, listener) => listeners.set(name, listener),
      removeEventListener: (name) => listeners.delete(name),
    },
    requestAnimationFrame(callback) {
      frames.set(++nextFrame, callback);
      return nextFrame;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    Worker: function () {
      return worker;
    },
  };
  return {
    environment,
    frames,
    listeners,
    worker,
    frame(time) {
      now = time;
      const [id, callback] = frames.entries().next().value;
      frames.delete(id);
      callback(time);
    },
    visibility(hidden, time) {
      now = time;
      environment.document.hidden = hidden;
      listeners.get('visibilitychange')();
    },
    background(time) {
      now = time;
      worker.onmessage();
    },
  };
}

test('visible and hidden clocks do not double count; catch-up is bounded and stoppable', () => {
  const clock = clockEnvironment(),
    steps = [];
  let renders = 0;
  const loop = createGameLoop(
    { advance: (dt) => steps.push(dt), render: () => renders++ },
    clock.environment,
  );
  clock.frame(16);
  assert.equal(renders, 1);
  clock.visibility(true, 20);
  clock.background(120);
  const count = steps.length;
  clock.frame(130);
  assert.equal(steps.length, count);
  assert.equal(renders, 1);
  clock.visibility(false, 150);
  clock.frame(166);
  assert.ok(Math.abs(steps.reduce((sum, dt) => sum + dt, 0) - 0.132) < 1e-8);
  clock.visibility(true, 170);
  const before = steps.reduce((sum, dt) => sum + dt, 0);
  clock.background(20170);
  assert.ok(Math.abs(steps.reduce((sum, dt) => sum + dt, 0) - before - 5) < 1e-8);
  assert.ok(steps.every((dt) => dt > 0 && dt <= 0.05));
  loop.stop();
  loop.stop();
  assert.equal(clock.frames.size, 0);
  assert.equal(clock.listeners.size, 0);
  assert.equal(clock.worker.terminateCount, 1);
});

test('invalid persisted XP cannot hang level resolution and names cannot contain markup', () => {
  for (const xp of [Infinity, NaN, -1]) assert.equal(getLevelInfo(xp).L, 1);
  assert.deepEqual(getLevelInfo(6), { L: 2, cur: 0, need: 7 });
  assert.ok(sanitizeChickenName('<b>Pollo</b>').length <= 12);
  assert.ok(!/[<>]/.test(sanitizeChickenName('<script>test</script>')));
  assert.equal(normalizeExperience(Symbol('invalid')), 0);
  assert.equal(normalizeExperience({ xp: 10 }), 0);
});

test('a consumer can stop a failed clock update without scheduling another frame', () => {
  const clock = clockEnvironment();
  let reported;
  const failure = new Error('simulation failed');
  const loop = createGameLoop(
    {
      advance() {
        throw failure;
      },
      render() {
        assert.fail('render must not run after a failed update');
      },
      onError(error) {
        reported = error;
        loop.stop();
      },
    },
    clock.environment,
  );
  clock.frame(16);
  assert.equal(reported, failure);
  assert.equal(clock.frames.size, 0);
  assert.equal(clock.worker.terminateCount, 1);
});

test('enemy generation is repeatable and preserves tier and boss rules', () => {
  const rules = createRules();
  const enemies = { generate: rules.genInfEnemy };
  for (const round of [1, 9, 10, 19, 20]) {
    assert.deepEqual(enemies.generate(round), enemies.generate(round));
    assert.ok(enemies.generate(round).every((member) => member.t >= 0 && member.t <= 2));
  }
  assert.ok(enemies.generate(10).some((member) => member.boss && member.t === 2));
  assert.ok(enemies.generate(1).every((member) => member.t === 0));
});

test('hero enters through the front of the actual ring and settles in formation', () => {
  let completed = 0;
  const entrance = createRingEntrance(() => completed++);
  const hero = { hx: -2.4, hz: 0, gait: 0 };
  entrance.start(hero);
  assert.ok(hero.z > 6);
  assert.equal(hero.state, 'walk');
  entrance.update(1.2);
  assert.ok(hero.z < 8.5 && hero.z > hero.hz);
  assert.ok(hero.gait > 0);
  entrance.update(1.2);
  assert.equal(hero.x, hero.hx);
  assert.equal(hero.z, hero.hz);
  assert.equal(hero.state, 'idle');
  assert.equal(completed, 1);
  entrance.skip();
  assert.equal(completed, 1);
});

test('skipping or cancelling an entrance cannot leave a misplaced hero', () => {
  let completed = 0;
  const entrance = createRingEntrance(() => completed++);
  const hero = { hx: -2.4, hz: 0, gait: 0 };
  entrance.start(hero);
  entrance.skip();
  assert.equal(completed, 1);
  assert.equal(hero.z, hero.hz);
  entrance.start(hero);
  entrance.cancel();
  entrance.update(5);
  assert.equal(completed, 1);
  assert.equal(entrance.active, false);
  assert.equal(hero.x, hero.hx);
});
