/** @module catalog */

/**
 * Validate cross-references and numeric inputs before they reach the render loop.
 * This function does not mutate its input; callers may freeze a valid catalog.
 * @param {unknown} value Parsed JSON to validate.
 * @returns {import('./types.js').GameCatalog} The same validated catalog.
 * @throws {TypeError} When required sections, references or numeric bounds are invalid.
 */
export function validateCatalog(value) {
  const isRecord = (input) => input !== null && typeof input === 'object' && !Array.isArray(input);
  const require = (condition, message) => {
    if (!condition) {
      throw new TypeError(`Catálogo de juego inválido: ${message}`);
    }
  };
  const positive = (input) => typeof input === 'number' && Number.isFinite(input) && input > 0;

  require(isRecord(value), 'se esperaba un objeto');
  for (const key of ['rarities', 'upgrades', 'species', 'balance']) {
    require(isRecord(value[key]), `falta ${key}`);
  }
  for (const key of ['skins', 'themes', 'titles', 'tierPalettes']) {
    require(Array.isArray(value[key]) && value[key].length > 0, `falta ${key}`);
  }
  let totalWeight = 0;
  for (const [id, rarity] of Object.entries(value.rarities)) {
    require(isRecord(rarity) && positive(rarity.weight), `peso de rareza ${id}`);
    require(typeof rarity.name === 'string' && rarity.name.length > 0, `nombre de rareza ${id}`);
    require(/^#[\da-f]{6}$/i.test(rarity.color), `color de rareza ${id}`);
    totalWeight += rarity.weight;
  }
  require(Math.abs(totalWeight - 100) < 1e-8, 'las rarezas deben sumar 100');
  require(Object.keys(value.upgrades).length > 0, 'no hay mejoras');
  for (const [id, upgrade] of Object.entries(value.upgrades)) {
    require(isRecord(upgrade), `mejora ${id}`);
    require(Object.hasOwn(value.rarities, upgrade.rarity), `rareza de ${id}`);
    require(Number.isInteger(upgrade.max) && upgrade.max > 0, `nivel máximo de ${id}`);
    require(typeof upgrade.n === 'string' && upgrade.n.length > 0, `nombre de ${id}`);
    require(typeof upgrade.d === 'string', `descripción de ${id}`);
    require(typeof upgrade.icon === 'string' &&
      /^[a-z][a-z-]*$/.test(upgrade.icon), `icono de ${id}`);
  }
  for (const [id, species] of Object.entries(value.species)) {
    require(isRecord(species), `especie ${id}`);
    require(Array.isArray(species.es) && species.es.length === 2, `nombres de ${id}`);
    for (const key of ['hp', 'atk', 'rate', 'spd']) {
      require(positive(species[key]), `${key} de ${id}`);
    }
    require(['bird', 'quad', 'gorilla'].includes(species.model?.kind), `modelo de ${id}`);
  }
  const { balance } = value;
  for (const key of ['healthMultiplier', 'enemyBase', 'enemyGrowth', 'enemyExponent']) {
    require(positive(balance[key]), `balance.${key}`);
  }
  for (const key of ['healthTiers', 'attackTiers', 'speedTiers']) {
    require(Array.isArray(balance[key]) &&
      balance[key].length === 3 &&
      balance[key].every(positive), `balance.${key}`);
  }
  require(Array.isArray(balance.enemyOrder) && balance.enemyOrder.length > 0, 'orden de enemigos');
  require(balance.enemyOrder.every((key) =>
    Object.hasOwn(value.species, key),
  ), 'especie enemiga desconocida');
  return value;
}

/**
 * Freeze a JSON object recursively so game state cannot accidentally change balance.
 * JSON has no cycles; this intentionally does not support arbitrary object graphs.
 * @template T
 * @param {T} value JSON-compatible value.
 * @returns {Readonly<T>} The same value, recursively frozen.
 */
export function freezeCatalog(value) {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      freezeCatalog(child);
    }
    Object.freeze(value);
  }
  return value;
}
