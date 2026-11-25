/** @module loop */

const MAX_STEP_SECONDS = 0.05;
const MAX_BACKGROUND_SECONDS = 5;

/**
 * Start the session clock. Visible frames and hidden worker ticks share one timestamp,
 * so switching tabs cannot charge the same interval twice. Hidden catch-up is bounded
 * and subdivided into the same steps used for visible simulation.
 * @param {object} callbacks Session operations; rendering must not advance game state.
 * @param {function(number):void} callbacks.advance Advance simulation by seconds.
 * @param {function():void} callbacks.render Render the current state once.
 * @param {function(Error):void} [callbacks.onError] Report a failed update or render.
 * @param {object} [environment] Browser APIs, injectable for deterministic tests.
 * @returns {{stop:function():void}} Idempotent cleanup for the frame, worker and listener.
 */
export function createGameLoop(
  { advance, render, onError = console.error },
  environment = globalThis,
) {
  let previous = environment.performance.now();
  let stopped = false;
  let frameId;
  let worker;

  function tick(now, hidden) {
    const elapsed = Math.max(0, (now - previous) / 1000);
    previous = now;
    let remaining = Math.min(elapsed, hidden ? MAX_BACKGROUND_SECONDS : MAX_STEP_SECONDS);
    try {
      while (remaining > 0.0001) {
        const step = Math.min(remaining, MAX_STEP_SECONDS);
        advance(step);
        remaining -= step;
      }
      if (!hidden) {
        render();
      }
    } catch (error) {
      onError(error);
    }
  }

  function frame(now) {
    if (stopped) {
      return;
    }
    if (!environment.document.hidden) {
      tick(now, false);
    }
    if (!stopped) {
      frameId = environment.requestAnimationFrame(frame);
    }
  }

  const resetClock = () => {
    previous = environment.performance.now();
  };
  environment.document.addEventListener('visibilitychange', resetClock);
  try {
    worker = new environment.Worker(new URL('./background-ticker.js', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = () => {
      if (!stopped && environment.document.hidden) {
        tick(environment.performance.now(), true);
      }
    };
  } catch (error) {
    environment.console?.warn('Sin worker: el juego se pausará en segundo plano.', error);
  }
  frameId = environment.requestAnimationFrame(frame);

  return {
    stop() {
      if (stopped) {
        return;
      }
      stopped = true;
      environment.cancelAnimationFrame(frameId);
      worker?.terminate();
      environment.document.removeEventListener('visibilitychange', resetClock);
    },
  };
}
