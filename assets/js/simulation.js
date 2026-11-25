/** @module simulation */

/**
 * Compact expiring particles in place, preserving draw order and array identity.
 * A linear pass avoids repeated splice shifts when many particles expire together.
 * @template {{life:number}} T
 * @param {T[]} items Mutable simulation collection.
 * @returns {void}
 */
export function removeExpired(items) {
  let writeIndex = 0;
  for (let readIndex = 0; readIndex < items.length; readIndex++) {
    const item = items[readIndex];
    if (item.life > 0) {
      items[writeIndex++] = item;
    }
  }
  items.length = writeIndex;
}

/**
 * Reuse per-battle scratch collections rather than allocating filter arrays per substep.
 * Results are borrowed until the next collect call; do not retain or mutate them.
 * @returns {{alive:object[],teams:object[][],collect:Function}} Reusable battle index.
 */
export function createBattleIndex() {
  const alive = [];
  const teams = [[], []];
  return {
    alive,
    teams,
    collect(units) {
      alive.length = 0;
      teams[0].length = 0;
      teams[1].length = 0;
      for (const unit of units) {
        if (!unit.dying && !unit.dead) {
          alive.push(unit);
          teams[unit.side].push(unit);
        }
      }
    },
  };
}
