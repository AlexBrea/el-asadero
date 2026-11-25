const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');

async function main() {
  const root = path.join(__dirname, '..');
  const extension = process.env.ASADERO_TEST_EXTENSION === '1';
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'asadero-ui-'));
  const mime = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
  };
  const api = `window.__testGame={
    startInf:()=>game.startInf({skipIntro:true}),pick:i=>game.pick(i),startFight:()=>game.startFight(),hurt:(...args)=>game.hurt(...args),roundOver:won=>game.roundOver(won),newMember:game.newMember,
    get st(){return game.st},get offers(){return game.offers},get team(){return game.team},get units(){return game.units},get session(){return game},
    goRound(n,bonus=1){game.infN=n;game.picksLeft=bonus;game.prize=bonus>1?bonus:0;game.nextInfRound()},
    showOffers(ids){game.offers=ids.map(id=>({id}));game.st='choose';game.showCards()},
    addAlly(){game.team.push(game.newMember(false));game.buildArena()},
    showProfile:()=>game.showProfile(),showMenu:()=>game.showMenu(),showCards:()=>game.showCards(),memberStats:game.memberStats};`;
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const filename = path.join(root, url.pathname === '/' ? 'index.html' : url.pathname);
    if (!filename.startsWith(root + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    try {
      let body = fs.readFileSync(filename);
      if (filename.endsWith('index.html'))
        body = Buffer.from(body.toString().replace(/<script src=[^>]+><\/script>/g, ''));
      if (!extension && filename.endsWith('/game.js'))
        body = Buffer.from(body.toString().replace(/game\.boot\(\);/, api + '\ngame.boot();'));
      response
        .writeHead(200, {
          'Content-Type': mime[path.extname(filename)] || 'application/octet-stream',
        })
        .end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = spawn(
    process.env.ASADERO_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-pipe',
      '--disable-background-networking',
      '--autoplay-policy=no-user-gesture-required',
      `--user-data-dir=${path.join(tmp, 'profile')}`,
    ],
    { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] },
  );
  let nextId = 0,
    buffer = '',
    sessionId,
    stderr = '';
  const pending = new Map(),
    events = new Set(),
    errors = [];
  browser.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  browser.on('exit', () => {
    for (const promise of pending.values())
      promise.reject(new Error(stderr.slice(-2000) || 'Chrome exited'));
    pending.clear();
  });
  const send = (method, params = {}, session = sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      browser.stdio[3].write(
        JSON.stringify({ id, method, params, ...(session ? { sessionId: session } : {}) }) + '\0',
      );
    });
  browser.stdio[4].on('data', (chunk) => {
    buffer += chunk;
    let end;
    while ((end = buffer.indexOf('\0')) !== -1) {
      const message = JSON.parse(buffer.slice(0, end));
      buffer = buffer.slice(end + 1);
      if (message.id) {
        const promise = pending.get(message.id);
        if (!promise) continue;
        pending.delete(message.id);
        message.error
          ? promise.reject(new Error(message.error.message))
          : promise.resolve(message.result);
      } else if (message.sessionId === sessionId) {
        if (message.method === 'Page.javascriptDialogOpening')
          send('Page.handleJavaScriptDialog', { accept: true }).catch((error) =>
            errors.push(error.message),
          );
        if (message.method === 'Runtime.exceptionThrown')
          errors.push(
            message.params.exceptionDetails.exception?.description ||
              message.params.exceptionDetails.text,
          );
        if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error')
          errors.push(message.params.args.map((a) => a.description || a.value).join(' '));
        if (message.method === 'Network.responseReceived' && message.params.response.status >= 400)
          errors.push(message.params.response.status + ' ' + message.params.response.url);
        for (const listener of events) listener(message);
      }
    }
  });
  const timer = setTimeout(() => {
    console.error('Browser test timed out');
    browser.kill();
    server.close();
    process.exitCode = 1;
  }, 35000);
  try {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' }, null);
    ({ sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }, null));
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Network.enable');
    const evaluate = async (expression) => {
      const reply = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (reply.exceptionDetails)
        throw new Error(
          reply.exceptionDetails.exception?.description || reply.exceptionDetails.text,
        );
      return reply.result.value;
    };
    const waitFor = async (expression) => {
      for (let i = 0; i < 80; i++) {
        if (await evaluate(expression)) return;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      throw new Error('Timeout waiting for ' + expression);
    };
    const viewport = async (width, height) =>
      send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false,
      });
    const screenshot = async (name) => {
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      const file = path.join(tmp, name + '.png');
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
      console.log('Screenshot: ' + file);
    };
    await viewport(1440, 900);
    await send('Page.navigate', { url });
    if (extension) {
      await waitFor("document.querySelector('#mbox h1')?.textContent==='EL ASADERO'");
      assert.equal(await evaluate('!!window.__game'), true);
      const debuggerListeners = new Map();
      const sandbox = {
        setTimeout,
        clearTimeout,
        chrome: {
          debugger: {
            onEvent: {
              addListener(fn) {
                const callback = (m) => fn({ tabId: 1 }, m.method, m.params);
                debuggerListeners.set(fn, callback);
                events.add(callback);
              },
              removeListener(fn) {
                events.delete(debuggerListeners.get(fn));
              },
            },
            attach: async () => {},
            detach: () => send('Debugger.disable'),
            sendCommand: (target, method, params) => send(method, params),
          },
          runtime: { onMessage: { addListener() {} } },
        },
      };
      vm.createContext(sandbox);
      vm.runInContext(
        fs.readFileSync(path.join(root, 'chrome-extension/background.js'), 'utf8'),
        sandbox,
      );

      await evaluate(fs.readFileSync(path.join(root, 'chrome-extension/trainer.js'), 'utf8'));
      await evaluate('window.__game.startInf()');
      assert.equal((await evaluate("window.__asaderoTrainer.command('god',true)")).god, true);
      assert.equal((await evaluate("window.__asaderoTrainer.command('damage',100)")).damage, 100);
      await evaluate("window.__asaderoTrainer.command('max')");
      assert.equal(await evaluate('window.__game.team.length'), 9);
      await waitFor("window.__game.st==='fight'");
      await evaluate("window.__asaderoTrainer.command('win')");
      assert.equal(errors.length, 0, errors.join('\n'));
      console.log(
        'PASS: Chrome extension connects to the refactored module, applies powers and starts combat.',
      );
      return;
    }
    await waitFor('!!window.__testGame');
    assert.equal(await evaluate("document.querySelector('#mbox h1').textContent"), 'EL ASADERO');
    await evaluate("document.getElementById('hnew').click()");
    assert.equal(await evaluate('window.__testGame.st'), 'entrance');
    assert.ok(await evaluate('window.__testGame.units.find(u=>u.hero).z>6'));
    await new Promise((resolve) => setTimeout(resolve, 700));
    await screenshot('run-intro');
    await waitFor("window.__testGame.st==='choose'");
    assert.equal(await evaluate("document.getElementById('entrance-ui').hidden"), true);
    assert.equal(await evaluate('window.__testGame.st'), 'choose');
    assert.equal(await evaluate("document.querySelectorAll('.upgrade-card').length"), 3);
    assert.equal(await evaluate("document.querySelectorAll('.rarity-badge').length"), 3);
    const entrances = await evaluate(`(()=>{
      window.__testGame.team[0].t=1;
      window.__testGame.showOffers(['power','laser','titan']);
      return [...document.querySelectorAll('.upgrade-card')].map(card=>
        card.getAnimations().find(animation=>animation.id==='asadero-enter')?.effect.getTiming());
    })()`);
    assert.deepEqual(
      entrances.map((timing) => timing.delay),
      [0, 40, 80],
    );
    assert.ok(entrances.every((timing) => timing.duration === 200));
    await new Promise((resolve) => setTimeout(resolve, 1800));
    await screenshot('upgrades-desktop');
    for (const [width, height] of [
      [1440, 900],
      [768, 1024],
      [390, 844],
      [320, 667],
      [844, 390],
    ]) {
      await viewport(width, height);
      await new Promise((resolve) => setTimeout(resolve, 100));
      assert.ok(
        await evaluate('document.documentElement.scrollWidth<=innerWidth'),
        `${width}: horizontal overflow`,
      );
      const cards = await evaluate(
        "[...document.querySelectorAll('.upgrade-card')].map(c=>{const r=c.getBoundingClientRect();return {x:r.x,right:r.right,w:r.width,h:r.height}})",
      );
      assert.equal(cards.length, 3);
      assert.ok(
        cards.every((c) => c.x >= 0 && c.right <= width + 1 && c.h >= 44),
        `${width}: card bounds`,
      );
      assert.ok(
        await evaluate(
          "document.getElementById('menu').getBoundingClientRect().right <= document.getElementById('lvl').getBoundingClientRect().left && document.getElementById('pips').getBoundingClientRect().right <= document.getElementById('spd').getBoundingClientRect().left",
        ),
        `${width}: overlapping HUD`,
      );
      if (width === 390) await screenshot('upgrades-mobile');
    }
    await viewport(1440, 900);
    // Keyboard actions reveal immediately; preference changes remove positional motion.
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Tab',
      code: 'Tab',
      windowsVirtualKeyCode: 9,
    });
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Tab',
      code: 'Tab',
      windowsVirtualKeyCode: 9,
    });
    const keyboardAnimations = await evaluate(`(()=>{
      window.__testGame.showOffers(['power','laser','titan']);
      return [...document.querySelectorAll('.upgrade-card')].flatMap(card=>card.getAnimations()).filter(animation=>animation.id==='asadero-enter').length;
    })()`);
    assert.equal(keyboardAnimations, 0);
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: 100,
      y: 200,
      button: 'left',
      clickCount: 1,
    });
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: 100,
      y: 200,
      button: 'left',
      clickCount: 1,
    });
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    const reduced = await evaluate(`(()=>{
      window.__testGame.showOffers(['power','laser','titan']);
      return [...document.querySelectorAll('.upgrade-card')].map(card=>{
        const effect=card.getAnimations().find(animation=>animation.id==='asadero-enter').effect;
        return {timing:effect.getTiming(),frames:effect.getKeyframes()};
      });
    })()`);
    assert.ok(reduced.every((item) => item.timing.duration === 120 && item.timing.delay === 0));
    assert.ok(reduced.every((item) => item.frames.every((frame) => !('transform' in frame))));
    await send('Emulation.setEmulatedMedia', { features: [] });
    // Target selection, rebuilding the arena, and the actual fight loop.
    await evaluate("window.__testGame.addAlly();window.__testGame.showOffers(['power'])");
    await evaluate("document.querySelector('.upgrade-card').click()");
    assert.equal(await evaluate('window.__testGame.st'), 'target');
    await evaluate("document.querySelector('.target-card').click()");
    await waitFor("window.__testGame.st==='fight'");
    assert.ok(await evaluate('window.__testGame.units.length>1'));
    await evaluate("document.getElementById('fpv').click();document.getElementById('fpv').click()");
    // A win must show the next offers directly, with no claim/continue button.
    await evaluate('window.__testGame.roundOver(true)');
    assert.equal(await evaluate('window.__testGame.st'), 'choose');
    assert.equal(await evaluate("document.querySelectorAll('.upgrade-card').length"), 3);
    assert.equal(await evaluate("document.querySelectorAll('#cards > .btn').length"), 0);
    assert.match(
      await evaluate("document.getElementById('selection-meta').textContent"),
      /RONDA 02/,
    );
    // Multiple boss rewards must return to selection before the fight starts.
    await evaluate(
      "window.__testGame.session.chooseSpec(window.__testGame.team[0],'war');window.__testGame.goRound(10);window.__testGame.roundOver(true)",
    );
    assert.equal(await evaluate('window.__testGame.st'), 'relic');
    await evaluate('window.__testGame.session.pickRelic(window.__testGame.session.relOffer()[0])');
    assert.equal(await evaluate('window.__testGame.st'), 'gamble');
    // Keep the claimed relic instead of betting it, then take the two boss upgrades.
    await evaluate("document.querySelectorAll('#cards .card')[1].click()");
    assert.match(
      await evaluate("document.getElementById('selection-meta').textContent"),
      /ELECCIÓN 1 DE 2/,
    );
    await evaluate("window.__testGame.showOffers(['titan'])");
    await evaluate("document.querySelector('.upgrade-card').click()");
    assert.equal(await evaluate('window.__testGame.st'), 'choose');
    await evaluate(
      "window.__testGame.showOffers(['speed']);document.querySelector('.upgrade-card').click()",
    );
    if (await evaluate("window.__testGame.st==='target'"))
      await evaluate("document.querySelector('.target-card').click()");
    assert.equal(await evaluate('window.__testGame.st'), 'intro');
    await evaluate('window.__testGame.showMenu();window.__testGame.showProfile()');
    assert.ok(await evaluate("document.querySelectorAll('#hng .sk').length>=1"));
    assert.ok(await evaluate('!(/\\p{Extended_Pictographic}/u.test(document.body.innerText))'));
    await evaluate(
      "window.__testGame.showMenu();document.getElementById('hnew').click();document.getElementById('skip-entrance').click()",
    );
    assert.equal(await evaluate('window.__testGame.st'), 'choose');
    assert.equal(await evaluate("document.getElementById('entrance-ui').hidden"), true);
    // Exercise the imported specialization meshes, ultimates, enemies and saved runs.
    const specializations = await evaluate(`(()=>{
      const game=window.__testGame.session;
      const checked=[];
      for (const id of Object.keys(game.SPECS)) {
        game.startInf({skipIntro:true});
        const hero=game.heroOf();
        game.chooseSpec(hero,id);
        for (const upgrade of game.SPECS[id].up) hero.l[upgrade]=game.UPG[upgrade].max;
        game.infN=40;game.bteam=game.genInfEnemy(40);
        game.buildArena();game.startFight();
        for(let i=0;i<100;i++) game.stepFight(0.025);
        game.render();
        if(!game.units.every(unit=>Number.isFinite(unit.hp))) throw new Error('Invalid health: '+id);
        checked.push(id);
      }
      game.st='choose';game.snapRun('choose');
      const saved=JSON.stringify(game.team);
      game.showMenu();game.resumeRun();
      if(JSON.stringify(game.team)!==saved) throw new Error('Saved team changed');
      return checked;
    })()`);
    assert.equal(specializations.length, 6);
    await evaluate('window.__testGame.showMenu();window.__testGame.session.showShop()');
    assert.ok(await evaluate("document.querySelectorAll('#shg .sk').length>0"));
    assert.equal(
      await evaluate("document.getElementById('mbox').textContent.includes('__COIN__')"),
      false,
    );
    await evaluate('window.__testGame.session.showPass()');
    assert.equal(await evaluate("document.querySelectorAll('#shl .sk').length"), 20);
    assert.ok(await evaluate('window.__testGame.session.SH.dq.m.length===3'));
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log(
      'PASS: real Chrome startup, 5 viewports, motion timing, reduced motion, keyboard, combat, boss rewards, 6 specializations, saved runs, shop and battle pass.',
    );
  } finally {
    clearTimeout(timer);
    browser.kill();
    server.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
