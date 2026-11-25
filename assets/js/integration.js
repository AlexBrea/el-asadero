/** @module integration */
import { createMotionController } from './motion.js';
import { createRingEntrance } from './run-intro.js';
import { drawUpgradeOffers } from './rarity.js';
import { renderUpgradeCards, renderRarityGuide } from './upgrade-ui.js';
import {
  normalizeExperience,
  getLevelInfo,
  sanitizeChickenName,
  readStoredValue,
  writeStoredValue,
} from './profile.js';

/**
 * Reconcile imported gameplay features with the branch's UI, weighted offers and intro.
 * All overrides are session-local and installed before authentication starts the UI.
 * @param {object} game Isolated game session and feature service registry.
 * @returns {function():void} Release motion and intro input resources.
 */
export function installIntegration(game) {
  const motion = createMotionController();
  const unitObservers = new Set();
  const buildArena = game.buildArena;
  game.buildArena = () => {
    buildArena();
    for (const observer of unitObservers) {
      observer();
    }
  };
  const $ = (id) => document.getElementById(id);
  let starting = false;
  const entrance = createRingEntrance(() => {
    if (game.st !== 'entrance') {
      return;
    }
    $('entrance-ui').hidden = true;
    game.st = 'choose';
    game.showCards();
    game.banner('RONDA 1', '#ffe08a');
  });
  game.cleanName = sanitizeChickenName;
  game.lvInfo = getLevelInfo;
  game.lsGet = readStoredValue;
  game.lsSet = writeStoredValue;
  const load = game.loadProfile;
  game.loadProfile = (...args) => {
    load(...args);
    game.XP = normalizeExperience(game.XP);
  };
  const hide = game.hideScreens;
  game.hideScreens = () => {
    entrance.cancel();
    $('entrance-ui').hidden = true;
    hide();
    setPanel(false);
    $('modal').inert = true;
    $('modal').setAttribute('aria-hidden', 'true');
  };
  const modal = game.setModal;
  game.setModal = (...args) => {
    modal(...args);
    $('modal').inert = false;
    $('modal').setAttribute('aria-hidden', 'false');
    motion.reveal([$('mbox')]);
  };
  game.banner = (text, color) => {
    if (starting) {
      return;
    }
    const element = $('banner');
    element.innerHTML = text;
    element.style.color = color || '#ffe08a';
    motion.announce(element);
  };
  function setPanel(open) {
    const panel = $('panel');
    panel.inert = !open;
    panel.setAttribute('aria-hidden', String(!open));
    panel.classList.toggle('on', open);
  }
  game.setPanelOpen = setPanel;
  game.genUpgrades = () => {
    const available = (id) =>
      game.specOK(id) && game.team.some((member) => game.canUpg(member, id));
    const exclusive = Object.keys(game.UPG).filter((id) => game.UPG[id].sp && available(id));
    const guaranteed = exclusive.length
      ? exclusive[Math.floor(Math.random() * exclusive.length)]
      : null;
    const rest = drawUpgradeOffers(
      game.UPG,
      game.catalog.rarities,
      (id) => id !== guaranteed && available(id),
      guaranteed ? 2 : 3,
    );
    if (guaranteed) {
      rest.splice(Math.floor(Math.random() * (rest.length + 1)), 0, { id: guaranteed });
    }
    return rest;
  };
  game.showCards = () => {
    if (starting) {
      return;
    }
    game.icons.length = 0;
    $('selection-meta').textContent = game.prize
      ? `PREMIO DEL JEFE · ELECCIÓN ${game.prize - game.picksLeft + 1} DE ${game.prize}`
      : `RONDA ${String(game.infN).padStart(2, '0')} · ELIGE UNA MEJORA`;
    $('ptitle').textContent = 'Tu próxima ventaja';
    $('cards').classList.remove('tgt');
    renderUpgradeCards({
      container: $('cards'),
      offers: game.offers,
      upgrades: game.UPG,
      rarities: game.catalog.rarities,
      team: game.team,
      onPick: game.pick,
      icons: game.icons,
      objSpec: (id) => {
        const u = game.UPG[id];
        return u.sp && (game.heroOf().l[id] || 0) + 1 >= u.max
          ? game.ultSpec(id)
          : game.objSpec(id);
      },
      canUpg: game.canUpg,
      motion,
      specializations: game.SPECS,
      ultimates: game.ULT,
    });
    renderRarityGuide($('rarity-guide'), game.catalog.rarities);
    if (!game.offers.length) {
      game.panelButton('Tu equipo tiene todas las mejoras', 'Comenzar combate', () => {
        game.picksLeft = 1;
        game.proceed();
      });
    }
    setPanel(true);
  };
  // Claim screens are redundant; actual relic selection and optional wagering are retained.
  game.winPanel = () => game.advance();
  const start = game.startInf;
  game.startInf = (options = {}) => {
    starting =
      !options.skipIntro &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      document.documentElement.dataset.motionInput !== 'keyboard';
    start();
    if (starting) {
      game.st = 'entrance';
      setPanel(false);
      game.icons.length = 0;
      game.units.forEach((unit) => {
        unit.spawnT = 1;
        unit.landed = true;
        unit.y = 0;
        unit.alpha = 1;
      });
      entrance.start(game.units.find((unit) => unit.hero));
      $('entrance-ui').hidden = false;
    }
    starting = false;
  };
  const update = game.update;
  game.update = (dt) => {
    if (entrance.active) {
      entrance.update(document.hidden ? 0 : dt);
    }
    update(dt);
    $('fpv').classList.toggle('hide', game.mode !== 'inf' || game.st === 'entrance');
  };
  const camera = game.setCam;
  game.setCam = (time) => {
    camera(time);
    if (entrance.active) {
      game.F *= 0.88 + 0.12 * entrance.progress;
    }
  };
  const pick = game.pick;
  game.pick = (index) => {
    pick(index);
    if (game.st === 'target') {
      $('cards')
        .querySelectorAll('.card')
        .forEach((card) => card.classList.add('target-card'));
      enhanceChoices($('cards'));
      setPanel(true);
      motion.reveal($('cards').children);
    }
  };
  const proceed = game.proceed;
  game.proceed = () => {
    proceed();
    if (game.st === 'intro') {
      setPanel(false);
    }
  };
  for (const name of ['showRelics', 'showGamble']) {
    const show = game[name];
    game[name] = (...args) => {
      show(...args);
      $('selection-meta').textContent = 'PREMIO DEL JEFE';
      enhanceChoices($('cards'));
      setPanel(true);
      motion.reveal($('cards').children);
    };
  }
  function enhanceChoices(container) {
    container.querySelectorAll('.card:not(button),.spc').forEach((choice) => {
      choice.setAttribute('role', 'button');
      choice.tabIndex = 0;
      choice.onkeydown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          choice.click();
        }
      };
    });
  }
  const specialize = game.showSpecPick;
  game.showSpecPick = () => {
    specialize();
    enhanceChoices($('mbox'));
  };
  for (const name of ['showShop', 'showPass', 'showHen']) {
    const show = game[name];
    game[name] = (...args) => {
      show(...args);
      game.coinify($('mbox'));
    };
  }
  const panel = game.panelButton;
  game.panelButton = (...args) => {
    panel(...args);
    setPanel(true);
  };
  const skip = () => entrance.skip();
  const key = (event) => {
    if (entrance.active && event.key === 'Escape') {
      event.preventDefault();
      skip();
    }
  };
  $('skip-entrance').onclick = skip;
  document.addEventListener('keydown', key);
  document.querySelectorAll('#tabbar [data-t]').forEach((button) => {
    button.onclick = () => game.tabGo(button.dataset.t);
  });
  // Explicit local adapter for development tools; no window globals are required by features.
  game.getDebugApi = () => ({
    apiVersion: 2,
    get st() {
      return game.st;
    },
    get mode() {
      return game.mode;
    },
    get team() {
      return game.team;
    },
    get units() {
      return game.units;
    },
    get offers() {
      return game.offers;
    },
    get speed() {
      return game.speed;
    },
    set speed(value) {
      if ([1, 2, 3].includes(value)) {
        game.speed = value;
        $('spd').textContent = 'x' + value;
      }
    },
    get upgradeLimits() {
      return Object.fromEntries(Object.entries(game.UPG).map(([id, u]) => [id, u.max]));
    },
    newMember: game.newMember,
    pick: game.pick,
    startInf: () => game.startInf({ skipIntro: true }),
    showMenu: game.showMenu,
    subscribeUnits(observer) {
      unitObservers.add(observer);
      return () => unitObservers.delete(observer);
    },
    prepareCombat() {
      if (game.st !== 'choose') {
        throw new Error('Espera a elegir mejora.');
      }
      game.picksLeft = 1;
      game.proceed();
    },
  });
  return () => {
    entrance.cancel();
    motion.destroy();
    document.removeEventListener('keydown', key);
  };
}
