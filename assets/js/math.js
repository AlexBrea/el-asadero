/** @module math */
/**
 * Create a deterministic 32-bit PRNG for repeatable enemy generation and tests.
 * @param {number} a Integer seed; JavaScript coerces it to a signed 32-bit value.
 * @returns {function():number} Generator returning numbers in [0, 1).
 */
function mulberry(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/**
 * Interpolate along the shortest arc, including across the -PI/PI boundary.
 * @param {number} a Current angle in radians.
 * @param {number} b Target angle in radians.
 * @param {number} k Nonnegative interpolation factor, clamped to one.
 * @returns {number} Updated angle in radians.
 */
function turnTo(a, b, k) {
  let d = b - a;
  while (d > Math.PI) {
    d -= 6.2832;
  }
  while (d < -Math.PI) {
    d += 6.2832;
  }
  return a + d * Math.min(1, k);
}

export { mulberry, turnTo };
