import { readFileSync } from 'node:fs';
import { installData } from '../assets/js/features/data.js';
import { installModels } from '../assets/js/features/models.js';
import { installTeam } from '../assets/js/features/team.js';
import { installSpec } from '../assets/js/features/spec.js';
import { installRelics } from '../assets/js/features/relics.js';

/** Create actual gameplay rules with only presentation services stubbed. */
export function createRules() {
  const game = {
    catalog: JSON.parse(readFileSync(new URL('../assets/data/game.json', import.meta.url))),
    SKIN: 'cap',
    B: (c, s, col, role, extra) => ({ c, s, col, role, ...extra }),
    RL: {},
    rl(key) {
      return this.RL[key] || 0;
    },
    simming: true,
    // Ring capacity uses geometry bounds; browser tests exercise the real meshes.
    getModel: () => ({ size: 1 }),
  };
  installData(game);
  installModels(game);
  installTeam(game);
  installSpec(game);
  installRelics(game);
  game.getModel = () => ({ size: 1 });
  return game;
}
