/** @module icons */
const names = new Set([
  'chicken',
  'chick',
  'rooster',
  'cat',
  'dog',
  'wolf',
  'puma',
  'lion',
  'bear',
  'gorilla',
  'elephant',
  'sword',
  'heart',
  'shield',
  'bolt',
  'flame',
  'moon',
  'users',
  'sparkles',
  'diamond',
  'crown',
  'robot',
  'sun',
  'egg',
  'feather',
  'target',
  'star',
  'trophy',
  'volume',
  'volume-off',
  'music',
  'menu',
  'x',
  'eye',
  'user',
  'logout',
  'home',
  'chart',
  'gift',
  'alert',
  'check',
  'lock',
  'paint',
  'clock',
  'chevron',
  'arrow-right',
  'skull',
  'infinity',
  'medal',
  'party',
]);
/**
 * Render one decorative symbol from the local sprite; unknown names use a fallback.
 * Icon-only controls must provide their own accessible label.
 * @param {string} name Symbol identifier.
 * @returns {string} Trusted SVG markup with an allowlisted fragment identifier.
 */
export function icon(name) {
  const id = names.has(name) ? name : 'diamond';
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><use href="assets/icons.svg#${id}"></use></svg>`;
}
