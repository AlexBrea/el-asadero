/** @module features/metadata */
import { icon } from '../icons.js';
export { icon };

/**
 * Decorate copied catalog records with local SVG markup while keeping JSON immutable.
 * @param {object|object[]} value Authored catalog records.
 * @returns {object|object[]} Mutable records with presentation-only icon markup.
 */
export function hydrate(value) {
  if (Array.isArray(value)) {
    return value.map(hydrate);
  }
  if (typeof value.icon === 'string') {
    return { ...value, e: icon(value.icon) };
  }
  return Object.fromEntries(
    Object.entries(value).map(([id, definition]) => [
      id,
      typeof definition === 'object' && definition !== null
        ? { ...definition, ...(definition.icon ? { e: icon(definition.icon) } : {}) }
        : definition,
    ]),
  );
}
