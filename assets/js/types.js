/**
 * Shared domain contracts. Compact member keys are persisted by existing saves;
 * changing those keys requires a save migration, not just a variable rename.
 * @module types
 */

/**
 * @typedef {object} GameMember
 * @property {string} k Species identifier.
 * @property {boolean} hero Whether this is the player's main chicken.
 * @property {0|1|2} t Body tier: ordinary, robot, titan.
 * @property {Record<string, number>} l Acquired upgrade levels.
 * @property {number} base Base stat multiplier.
 * @property {boolean} fresh Whether the next arena should play the spawn animation.
 * @property {string|null} skin Cosmetic identifier, or null for allies.
 */

/**
 * @typedef {object} RarityDefinition
 * @property {string} name Visible label.
 * @property {number} weight Positive category weight; catalog weights sum to 100.
 * @property {string} color Hexadecimal accent color.
 * @property {string} icon Local SVG symbol identifier.
 */

/**
 * @typedef {object} UpgradeDefinition
 * @property {string} n Visible name.
 * @property {string} d Description.
 * @property {number} max Maximum acquired level.
 * @property {string} rarity Key of an existing rarity.
 * @property {string} icon Local SVG symbol identifier.
 */

/**
 * @typedef {object} UpgradeOffer
 * @property {string} id Key of an existing upgrade.
 */

/**
 * @typedef {object} GameCatalog
 * @property {Record<string, RarityDefinition>} rarities Rarity definitions.
 * @property {Record<string, UpgradeDefinition>} upgrades Upgrade definitions.
 * @property {Record<string, object>} species Stats and declarative models.
 * @property {object[]} skins Cosmetic unlocks.
 * @property {object[]} themes Arena palettes.
 * @property {(object|null)[]} tierPalettes Body tier palettes.
 * @property {Array<[number,string]>} titles Account titles.
 * @property {object} balance Numeric balance settings and enemy species order.
 */

export {};
