const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');

// Execute the real game, with rendering and Firebase replaced by inert adapters.
function setup() {
  const elements = new Map();
  const context2d = { setTransform() {} };
  function element() {
    return {
      style: { setProperty() {} },
      dataset: {},
      children: [],
      replaceChildren() {},
      classList: { add() {}, remove() {}, toggle() {} },
      addEventListener() {},
      setAttribute() {},
      getContext: () => context2d,
      appendChild() {},
      querySelector: () => element(),
      innerHTML: '',
      textContent: '',
      clientWidth: 150,
      clientHeight: 90,
    };
  }
  const document = {
    addEventListener() {},
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, element());
      return elements.get(id);
    },
    createElement: element,
  };
  let frame;
  const sandbox = {
    document,
    console,
    Worker: class {},
    URL: { createObjectURL() {} },
    Blob: class {},
    performance: { now: () => 0 },
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener() {},
    setTimeout() {},
    clearTimeout() {},
    requestAnimationFrame(callback) {
      frame = callback;
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  sandbox.DATA = JSON.parse(fs.readFileSync(path.join(root, 'assets/data/game.json'), 'utf8'));
  const classic = (source) =>
    source
      .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\n/gm, '')
      .replace(/^export \{[^}]+\};?\n/gm, '')
      .replace(/\bexport (?=function)/g, '');
  for (const file of [
    'icons',
    'math',
    'rarity',
    'simulation',
    'motion',
    'run-intro',
    'profile',
    'enemies',
    'models',
    'audio',
    'upgrades',
    'renderer',
    'upgrade-ui',
  ]) {
    vm.runInContext(
      classic(fs.readFileSync(path.join(root, `assets/js/${file}.js`), 'utf8')),
      sandbox,
    );
  }
  sandbox.createGameLoop = () => ({ stop() {} });
  const code = classic(fs.readFileSync(path.join(root, 'assets/js/game.js'), 'utf8'));
  const background = fs.readFileSync(path.join(root, 'chrome-extension/background.js'), 'utf8');
  const bridge = vm.runInNewContext(background + '\nbridgeExpression;', {
    chrome: { runtime: { onMessage: { addListener() {} } } },
  });
  vm.runInContext(
    code.replace(
      /\bboot\(\);/,
      bridge +
        ';window.testGame={startFight,hurt,nextInfRound,stepFight, bossPrize(){picksLeft=2;prize=2;}};',
    ) + '\nstartGame();',
    sandbox,
  );
  sandbox.__game.startInf();
  const trainer = fs.readFileSync(path.join(root, 'chrome-extension/trainer.js'), 'utf8');
  vm.runInContext(trainer, sandbox);
  return {
    sandbox,
    game: sandbox.__game,
    command: sandbox.__asaderoTrainer.command,
    tick() {
      sandbox.requestAnimationFrame(() => {});
      frame(0);
    },
    trainer,
  };
}

test('infinite health survives lethal damage and disables cleanly', () => {
  const { sandbox, game, command } = setup();
  const ally = game.units.find((u) => u.side === 0);
  command('god', true);
  sandbox.testGame.hurt(null, ally, ally.max * 100);
  assert.equal(ally.hp, ally.max);
  assert.ok(!ally.dying);
  command('reset');
  sandbox.testGame.hurt(null, ally, ally.max * 100);
  assert.equal(ally.hp, 0);
  assert.equal(ally.dying, true);
});

test('damage does not stack and new allies receive settings before a frame', () => {
  const { sandbox, game, command, tick } = setup();
  const ally = game.units.find((u) => u.side === 0);
  const enemy = game.units.find((u) => u.side === 1);
  const base = ally.atk,
    enemyBase = enemy.atk;
  command('damage', 10);
  command('damage', 100);
  assert.equal(ally.atk, base * 100);
  assert.equal(enemy.atk, enemyBase);
  command('god', true);
  sandbox.testGame.nextInfRound();
  tick();
  const next = game.units.find((u) => u.side === 0);
  assert.equal(next.atk, base * 100);
  sandbox.testGame.hurt(null, next, next.max * 100);
  assert.equal(next.hp, next.max);
  command('reset');
  assert.equal(next.atk, base);
});

test('maximum upgrades build nine titans and allow subsequent combats', () => {
  const { sandbox, game, command, tick } = setup();
  command('max');
  assert.equal(game.st, 'intro');
  assert.equal(game.team.length, 9);
  for (const member of game.team) {
    assert.equal(member.t, 2);
    assert.equal(member.l.power, 99);
    assert.equal(member.l.vit, 99);
  }
  tick();
  const ally = game.units.find((u) => u.side === 0);
  const laser = ally.ab.laser.dmg;
  command('damage', 10);
  assert.equal(ally.ab.laser.dmg, laser * 10);
  sandbox.testGame.nextInfRound();
  assert.equal(game.offers.length, 0);
  command('fight');
  assert.equal(game.st, 'intro');
  assert.equal(game.team[0].l.power, 99);
  assert.equal(game.team.length, 9);
});

test('new arenas are protected without animation frames, including background play', () => {
  const { sandbox, game, command } = setup();
  command('god', true);
  command('damage', 1000);
  sandbox.document.hidden = true;
  sandbox.testGame.nextInfRound();
  const ally = game.units.find((unit) => unit.side === 0);
  assert.equal(ally.atk, 6000);
  sandbox.testGame.hurt(null, ally, ally.max * 1000);
  assert.equal(ally.hp, ally.max);
  assert.ok(!ally.dying);
});

test('fully upgraded teams can start a fight after a double boss reward', () => {
  const { sandbox, game, command } = setup();
  command('max');
  sandbox.testGame.bossPrize();
  sandbox.testGame.nextInfRound();
  assert.equal(game.offers.length, 0);
  command('fight');
  assert.equal(game.st, 'intro');
  assert.equal(game.team[0].l.power, game.upgradeLimits.power);
  assert.equal(game.team[0].l.flock, game.upgradeLimits.flock);
});

test('speed reflects the game and created allies use the current member structure', () => {
  const { game, command } = setup();
  game.speed = 3;
  assert.equal(command('status').speed, 3);
  command('max');
  assert.equal(game.team[1].skin, null);
  assert.equal(game.apiVersion, 2);
});

test('win is limited to active fights; healing does not resurrect', () => {
  const { sandbox, game, command } = setup();
  assert.throws(() => command('win'), /combate/);
  const ally = game.units.find((u) => u.side === 0);
  ally.hp = 1;
  command('heal');
  assert.equal(ally.hp, ally.max);
  sandbox.testGame.startFight();
  command('win');
  sandbox.testGame.stepFight(0.01);
  assert.ok(game.units.filter((u) => u.side === 1).every((u) => u.dying));
});

test('reinjection keeps settings and incompatible pages are rejected', () => {
  const { sandbox, command, trainer } = setup();
  command('god', true);
  const installed = sandbox.__asaderoTrainer;
  vm.runInContext(trainer, sandbox);
  assert.equal(sandbox.__asaderoTrainer, installed);
  assert.equal(command('status').god, true);
  assert.throws(() => vm.runInNewContext(trainer, { window: {} }), /conexión/);
});

test('popup sends serializable arguments for status, buttons and toggles', async () => {
  const calls = [];
  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, { addEventListener() {} });
      return elements.get(id);
    },
    querySelectorAll: () => [],
  };
  const sandbox = {
    document,
    chrome: {
      tabs: { query: async () => [{ id: 7 }] },
      scripting: {
        executeScript: async (injection) => {
          if (!injection.files && !injection.args)
            return [{ result: { connected: true, game: true } }];
          if (injection.args) {
            // Chrome rejects undefined even though JSON.stringify silently converts it.
            for (const value of injection.args) assert.notEqual(value, undefined);
            assert.deepEqual(
              JSON.parse(JSON.stringify(injection.args)),
              Array.from(injection.args),
            );
            calls.push(Array.from(injection.args));
          }
          return [
            { result: { ok: true, state: { god: false, damage: 1, speed: 1, message: 'OK' } } },
          ];
        },
      },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'chrome-extension/popup.js'), 'utf8'), sandbox);
  // Wait for the automatic status request at popup initialization.
  await new Promise((resolve) => setImmediate(resolve));
  for (const action of ['heal', 'max', 'fight', 'win', 'reset']) {
    await vm.runInContext(`command('${action}')`, sandbox);
  }
  await vm.runInContext("command('god', false)", sandbox);
  await vm.runInContext("command('damage', 100)", sandbox);
  assert.deepEqual(calls, [
    ['status', null],
    ['heal', null],
    ['max', null],
    ['fight', null],
    ['win', null],
    ['reset', null],
    ['god', false],
    ['damage', 100],
  ]);
  assert.equal(document.getElementById('status').textContent, 'OK');
});

async function popupWithResponse(respond) {
  const elements = new Map();
  const controls = [{ disabled: false }, { disabled: false }];
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, { addEventListener() {} });
      return elements.get(id);
    },
    querySelectorAll: () => controls,
  };
  const sandbox = {
    document,
    chrome: {
      tabs: { query: async () => [{ id: 7 }] },
      scripting: {
        executeScript: async (injection) =>
          injection.files
            ? [{ result: null }]
            : !injection.args
              ? [{ result: { connected: true, game: true } }]
              : respond(injection),
      },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'chrome-extension/popup.js'), 'utf8'), sandbox);
  await new Promise((resolve) => setImmediate(resolve));
  return { sandbox, controls, status: document.getElementById('status') };
}

test('empty Chrome responses and malformed trainer data keep controls disabled', async () => {
  for (const reply of [
    [],
    [{ result: null }],
    [{ result: { ok: true, state: null } }],
    [{ result: { ok: true, state: { god: 'yes', damage: 1, speed: 1, message: 'OK' } } }],
  ]) {
    const popup = await popupWithResponse(() => reply);
    assert.ok(popup.controls.every((control) => control.disabled));
    assert.match(popup.status.textContent, /Chrome no devolvió|datos incompatibles/);
    assert.doesNotMatch(popup.status.textContent, /Cannot read/);
  }
});

test('MAIN world exceptions reach the popup as useful errors, including missing bridge', async () => {
  for (const [window, expected] of [
    [{}, /Se perdió la conexión/],
    [{ __game: {} }, /No se pudo iniciar el panel/],
    [
      {
        __asaderoTrainer: {
          command() {
            throw new Error('Empieza una partida primero.');
          },
        },
      },
      /Empieza una partida primero/,
    ],
  ]) {
    const popup = await popupWithResponse((injection) => [
      {
        result: vm.runInNewContext(`(${injection.func.toString()})(...args)`, {
          window,
          args: injection.args,
        }),
      },
    ]);
    assert.match(popup.status.textContent, expected);
    assert.ok(popup.controls.every((control) => control.disabled));
  }
});

test('popup enables controls only after a valid MAIN world response', async () => {
  const window = {
    __asaderoTrainer: {
      command: () => ({ god: true, damage: 10, speed: 2, message: 'Conectado' }),
    },
  };
  const popup = await popupWithResponse((injection) => [
    {
      result: vm.runInNewContext(`(${injection.func.toString()})(...args)`, {
        window,
        args: injection.args,
      }),
    },
  ]);
  assert.equal(popup.status.textContent, 'Conectado');
  assert.ok(popup.controls.every((control) => !control.disabled));
});
