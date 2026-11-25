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
  for (const key of ['specializations', 'ultimates', 'relics', 'cosmeticRarities']) {
    require(isRecord(value[key]) && Object.keys(value[key]).length > 0, `falta ${key}`);
  }
  for (const key of ['cosmeticSlots', 'shopSkins', 'cosmetics', 'missions']) {
    require(Array.isArray(value[key]) && value[key].length > 0, `falta ${key}`);
  }
  for (const [id, specialization] of Object.entries(value.specializations)) {
    for (const key of ['start', 'allow', 'up']) {
      require(Array.isArray(specialization[key]) &&
        specialization[key].every((upgrade) =>
          Object.hasOwn(value.upgrades, upgrade),
        ), `mejoras de ${id}.${key}`);
    }
    require(specialization.up.every(
      (upgrade) => value.upgrades[upgrade].sp === id,
    ), `especialización de ${id}`);
  }
  for (const [id, upgrade] of Object.entries(value.upgrades)) {
    if (upgrade.sp) {
      require(Object.hasOwn(value.specializations, upgrade.sp), `especialización de ${id}`);
      require(isRecord(value.ultimates[id]), `definitiva de ${id}`);
    }
  }
  for (const [id, relic] of Object.entries(value.relics)) {
    require(Number.isInteger(relic.max) && relic.max > 0, `máximo de reliquia ${id}`);
  }
  const slots = new Set(value.cosmeticSlots.map((slot) => slot.id));
  for (const cosmetic of [...value.cosmetics, ...value.shopSkins]) {
    require(Object.hasOwn(
      value.cosmeticRarities,
      cosmetic.rar,
    ), `rareza de cosmético ${cosmetic.id}`);
    require(positive(cosmetic.price), `precio de cosmético ${cosmetic.id}`);
    require(!cosmetic.slot || slots.has(cosmetic.slot), `equipamiento de ${cosmetic.id}`);
  }
  const { chests } = value;
  require(isRecord(chests) && isRecord(chests.weights), 'catálogo de cofres');
  require(Number.isInteger(chests.maxLevel) && chests.maxLevel > 0, 'nivel máximo de skins');
  require(Array.isArray(chests.copiesRequired) &&
    chests.copiesRequired.length === chests.maxLevel &&
    chests.copiesRequired.every(
      (count, index, counts) =>
        Number.isInteger(count) && count > 0 && (index === 0 || count > counts[index - 1]),
    ), 'copias para mejorar skins');
  for (const kind of ['n', 'e']) {
    const weights = chests.weights[kind];
    require(isRecord(weights) &&
      Object.keys(weights).every((rarity) => Object.hasOwn(value.cosmeticRarities, rarity)) &&
      Object.values(weights).every(positive) &&
      Math.abs(Object.values(weights).reduce((sum, weight) => sum + weight, 0) - 100) <
        1e-8, `probabilidades de cofre ${kind}`);
  }
  require(Array.isArray(chests.skins) &&
    chests.skins.every(
      (skin) => typeof skin.id === 'string' && Object.hasOwn(value.cosmeticRarities, skin.rar),
    ), 'skins de cofres');
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
