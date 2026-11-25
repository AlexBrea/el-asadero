/** @module game */
import { DATA } from './config.js';
import { createGameLoop } from './loop.js';
import { installIntegration } from './integration.js';
import { installLayout } from './layout.js';
import { installCamera } from './features/camera.js';
import { installModels } from './features/models.js';
import { installCosgfx } from './features/cosgfx.js';
import { installRender3d } from './features/render3d.js';
import { installScene } from './features/scene.js';
import { installData } from './features/data.js';
import { installAudio } from './features/audio.js';
import { installTeam } from './features/team.js';
import { installSpec } from './features/spec.js';
import { installStats } from './features/stats.js';
import { installAccount } from './features/account.js';
import { installRelics } from './features/relics.js';
import { installMedals } from './features/medals.js';
import { installCloud } from './features/cloud.js';
import { installShop } from './features/shop.js';
import { installFlow } from './features/flow.js';
import { installIcons } from './features/icons.js';
import { installSpecgfx } from './features/specgfx.js';
import { installAuth } from './features/auth.js';
import { installEffects } from './features/effects.js';
import { installCombat } from './features/combat.js';
import { installMain } from './features/main.js';
import { installChests } from './features/chests.js';

/**
 * Assemble one session in dependency order, then apply the shared UI and timing policies.
 * Domain features never export mutable state to window.
 * @returns {function():void} Stop session clocks and UI controllers.
 */
export function startGame() {
  const game = { catalog: DATA };
  installCamera(game);
  installModels(game);
  installCosgfx(game);
  installRender3d(game);
  installScene(game);
  installData(game);
  installAudio(game);
  installTeam(game);
  installSpec(game);
  installStats(game);
  installAccount(game);
  installRelics(game);
  installMedals(game);
  installCloud(game);
  installShop(game);
  installFlow(game);
  installIcons(game);
  installSpecgfx(game);
  installAuth(game);
  installEffects(game);
  installCombat(game);
  installMain(game);
  installChests(game);
  const cleanup = installIntegration(game);
  installLayout(game);
  Object.defineProperty(window, '__game', { configurable: true, value: game.getDebugApi() });
  game.boot();
  const loop = createGameLoop({
    advance(dt) {
      game.TT += dt;
      game.update(dt);
    },
    render() {
      game.render();
      game.renderIcons();
      game.drawCoins();
    },
  });
  return () => {
    loop.stop();
    cleanup();
  };
}
