/** @module config */
import { freezeCatalog, validateCatalog } from './catalog.js';

// Relative URLs keep this entry point compatible with GitHub Pages project paths.
const response = await fetch(new URL('../data/game.json', import.meta.url));
if (!response.ok) {
  throw new Error('No se pudieron cargar los datos del juego.');
}
/** Validated, immutable metadata; mutable progress lives in the game session. */
export const DATA = freezeCatalog(validateCatalog(await response.json()));
