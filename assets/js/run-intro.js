/** @module run-intro */
import { turnTo } from './math.js';

const ENTRANCE_SECONDS = 2.4;

/**
 * Walk the actual hero through the open front of the ring into its formation slot.
 * Simulation time owns the sequence, so it pauses with the game and creates no timers.
 * Combat remains disabled until the caller transitions out of the entrance phase.
 * @param {function():void} onComplete Reveal the first upgrade selection once.
 * @returns {{start:Function,update:Function,skip:Function,cancel:Function,active:boolean,progress:number}} Entrance lifecycle.
 */
export function createRingEntrance(onComplete) {
  let hero = null,
    elapsed = 0,
    startX = 0,
    startZ = 0;
  function settle() {
    if (!hero) {
      return;
    }
    hero.x = hero.hx;
    hero.z = hero.hz;
    hero.yaw = 0;
    hero.state = 'idle';
    hero = null;
  }
  function complete() {
    if (!hero) {
      return;
    }
    settle();
    onComplete();
  }
  return {
    get active() {
      return hero !== null;
    },
    get progress() {
      return Math.min(1, elapsed / ENTRANCE_SECONDS);
    },
    /**
     * Start a new entrance using a live combat/render entity, not a separate preview.
     * @param {object} unit Hero with a formation destination in hx/hz.
     * @returns {void}
     */
    start(unit) {
      settle();
      hero = unit;
      elapsed = 0;
      startX = unit.hx - 1.6;
      startZ = 8.5;
      unit.x = startX;
      unit.z = startZ;
      unit.spawnT = 1;
      unit.landed = true;
      unit.alpha = 1;
      unit.state = 'walk';
      unit.yaw = Math.atan2(-(unit.hz - startZ), unit.hx - startX);
    },
    /**
     * Advance position and the existing leg/wing gait without applying combat logic.
     * @param {number} dt Unscaled elapsed time in seconds.
     * @returns {void}
     */
    update(dt) {
      if (!hero) {
        return;
      }
      elapsed += dt;
      const progress = Math.min(1, elapsed / ENTRANCE_SECONDS);
      hero.x = startX + (hero.hx - startX) * progress;
      hero.z = startZ + (hero.hz - startZ) * progress;
      hero.gait += dt * 3.6;
      if (progress > 0.8) {
        hero.yaw = turnTo(hero.yaw, 0, dt * 10);
      }
      if (progress >= 1) {
        complete();
      }
    },
    skip: complete,
    cancel: settle,
  };
}
