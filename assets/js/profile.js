/** @module profile */

/**
 * Normalize persisted and user-entered names before embedding them in interface markup.
 * This keeps the existing twelve-character save format and excludes markup delimiters.
 * @param {unknown} value Stored or entered name.
 * @returns {string} Plain display name, possibly empty.
 */
export function sanitizeChickenName(value) {
  return String(value ?? '')
    .replace(/[<>&"'`\\]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 12)
    .trim();
}

/**
 * Normalize persisted XP before assigning it to mutable account state.
 * @param {unknown} value Persisted XP value.
 * @returns {number} A nonnegative safe integer; invalid numbers become zero.
 */
export function normalizeExperience(value) {
  const experience = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(experience)
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(experience)))
    : 0;
}

/**
 * Resolve account level from total XP. Invalid persisted numbers start at level one
 * instead of locking the page in an unbounded loop (for example, stored Infinity).
 * @param {number} totalExperience Total nonnegative account XP.
 * @returns {{L:number,cur:number,need:number}} Level, progress and next level cost.
 */
export function getLevelInfo(totalExperience) {
  let experience = normalizeExperience(totalExperience);
  let level = 1;
  const levelCost = (value) => Math.round(4 + 1.5 * value + 0.12 * value * value);
  while (experience >= levelCost(level)) {
    experience -= levelCost(level);
    level++;
  }
  return { L: level, cur: experience, need: levelCost(level) };
}

/**
 * Read one profile key while allowing storage-disabled and private browsing modes.
 * @param {string} key Namespaced storage key.
 * @returns {string|null} Stored string, or null when storage is unavailable.
 */
export function readStoredValue(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Best-effort local persistence; gameplay continues when the storage quota is exhausted.
 * @param {string} key Namespaced storage key.
 * @param {string|number} value Value serialized by the storage implementation.
 * @returns {boolean} Whether the write succeeded.
 */
export function writeStoredValue(key, value) {
  try {
    localStorage.setItem(key, String(value));
    return true;
  } catch {
    return false;
  }
}
