/** @module rarity */

/**
 * Draw a weighted rarity, then choose uniformly within that category.
 * Categories are built once per offer set; removing a chosen ID prevents repeats.
 * Empty categories lose their weight immediately, including within the same draw.
 * @param {Record<string,import('./types.js').UpgradeDefinition>} upgrades Upgrade catalog.
 * @param {Record<string,import('./types.js').RarityDefinition>} rarities Category weights.
 * @param {function(string):boolean} eligible Whether an upgrade can currently be offered.
 * @param {number} [count] Maximum number of distinct offers.
 * @param {function():number} [random] Random source in [0, 1); injectable for replayable tests.
 * @returns {import('./types.js').UpgradeOffer[]} Ordered, distinct offers.
 */
export function drawUpgradeOffers(upgrades, rarities, eligible, count = 3, random = Math.random) {
  const groups = Object.entries(rarities).map(([id, rarity]) => ({
    id,
    weight: rarity.weight,
    ids: [],
  }));
  const byRarity = new Map(groups.map((group) => [group.id, group]));
  for (const [id, upgrade] of Object.entries(upgrades)) {
    if (eligible(id)) {
      byRarity.get(upgrade.rarity).ids.push(id);
    }
  }
  let totalWeight = 0;
  for (const group of groups) {
    if (group.ids.length) {
      totalWeight += group.weight;
    }
  }

  const offers = [];
  while (offers.length < count && totalWeight > 0) {
    let roll = random() * totalWeight;
    let selected;
    for (const group of groups) {
      if (!group.ids.length) {
        continue;
      }
      roll -= group.weight;
      if (roll < 0) {
        selected = group;
        break;
      }
    }
    const index = Math.floor(random() * selected.ids.length);
    const [id] = selected.ids.splice(index, 1);
    offers.push({ id });
    if (!selected.ids.length) {
      totalWeight -= selected.weight;
    }
  }
  return offers;
}
