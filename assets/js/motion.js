/** @module motion */

const NAVIGATION_KEYS = new Set([
  'Tab',
  'Enter',
  ' ',
  'Escape',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
]);

/**
 * Own decorative UI motion independently of gameplay timing. Native animations use
 * transform/opacity, are replaceable, and never delay or disable a game command.
 * CSS owns the timing tokens; fallbacks only cover missing browser style APIs.
 * @param {object} [environment] Browser APIs, injectable for deterministic tests.
 * @returns {{reveal:Function,announce:Function,destroy:Function}} Session motion commands.
 */
export function createMotionController(environment = globalThis) {
  const document = environment.document;
  const root = document.documentElement;
  const styles = root && environment.getComputedStyle?.(root);
  const preference = environment.matchMedia?.('(prefers-reduced-motion: reduce)');
  const active = new Set();
  const running = new WeakMap();
  const noticeTimers = new Map();
  let keyboard = false;
  let destroyed = false;

  function milliseconds(name, fallback) {
    const raw = styles?.getPropertyValue(name).trim() || '';
    const value = Number.parseFloat(raw);
    if (!Number.isFinite(value) || value < 0) {
      return fallback;
    }
    return raw.endsWith('s') && !raw.endsWith('ms') ? value * 1000 : value;
  }

  const duration = milliseconds('--motion-enter', 200);
  const stagger = milliseconds('--motion-stagger', 40);
  const reducedDuration = milliseconds('--motion-reduced', 120);
  const noticeDuration = milliseconds('--motion-notice', 1500);
  const easing = styles?.getPropertyValue('--ease').trim() || 'cubic-bezier(0.23, 1, 0.32, 1)';

  function cancelActive() {
    for (const animation of active) {
      animation.cancel();
    }
    active.clear();
  }

  function onKeyDown(event) {
    if (!NAVIGATION_KEYS.has(event.key)) {
      return;
    }
    keyboard = true;
    if (root) {
      root.dataset.motionInput = 'keyboard';
    }
    cancelActive();
  }

  function onPointerDown() {
    keyboard = false;
    if (root) {
      root.dataset.motionInput = 'pointer';
    }
  }

  function onPreferenceChange() {
    if (preference.matches) {
      cancelActive();
    }
  }

  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('pointerdown', onPointerDown, true);
  preference?.addEventListener('change', onPreferenceChange);

  function play(element, keyframes, options) {
    if (destroyed || typeof element.animate !== 'function') {
      return;
    }
    const previous = running.get(element);
    if (previous) {
      // Retarget an interrupted entrance from its current visual position.
      const current = environment.getComputedStyle?.(element);
      if (current) {
        keyframes = [
          {
            ...keyframes[0],
            opacity: current.opacity,
            ...('transform' in keyframes[0] ? { transform: current.transform } : {}),
          },
          ...keyframes.slice(1),
        ];
      }
      previous.cancel();
    }
    let animation;
    try {
      animation = element.animate(keyframes, { easing, fill: 'backwards', ...options });
    } catch {
      // Decorative motion must never prevent a selection on a partial implementation.
      return;
    }
    running.set(element, animation);
    active.add(animation);
    const release = () => {
      active.delete(animation);
      if (running.get(element) === animation) {
        running.delete(element);
      }
    };
    animation.finished.then(release, release);
  }

  return {
    /**
     * Reveal a newly mounted group, with at most 80 ms of total staggering.
     * Keyboard navigation is immediate; reduced motion uses a short opacity fade.
     * @param {Iterable<HTMLElement>} elements Newly visible surfaces.
     * @returns {void}
     */
    reveal(elements) {
      if (keyboard || destroyed) {
        return;
      }
      Array.from(elements).forEach((element, index) => {
        const reduced = preference?.matches;
        play(
          element,
          reduced
            ? [{ opacity: 0 }, { opacity: 1 }]
            : [
                { opacity: 0, transform: 'translateY(8px) scale(0.97)' },
                { opacity: 1, transform: 'translateY(0) scale(1)' },
              ],
          {
            id: 'asadero-enter',
            duration: reduced ? reducedDuration : duration,
            delay: reduced ? 0 : Math.min(index, 2) * stagger,
          },
        );
      });
    },
    /**
     * Show a round announcement with a readable hold between short entry and exit.
     * Keyboard users receive an immediate message and timed dismissal without motion.
     * @param {HTMLElement} element Announcement whose default CSS opacity is zero.
     * @returns {void}
     */
    announce(element) {
      if (destroyed) {
        return;
      }
      if (noticeTimers.has(element)) {
        environment.clearTimeout?.(noticeTimers.get(element));
        noticeTimers.delete(element);
      }
      element.style.opacity = '';
      if (keyboard || typeof element.animate !== 'function') {
        running.get(element)?.cancel();
        element.style.opacity = '1';
        const timer = environment.setTimeout(() => {
          element.style.opacity = '';
          noticeTimers.delete(element);
        }, noticeDuration);
        noticeTimers.set(element, timer);
        return;
      }
      const movement = preference?.matches ? {} : { transform: 'translateY(8px) scale(0.97)' };
      const resting = preference?.matches ? {} : { transform: 'translateY(0) scale(1)' };
      play(
        element,
        [
          { opacity: 0, ...movement, offset: 0 },
          { opacity: 1, ...resting, offset: 0.12 },
          { opacity: 1, ...resting, offset: 0.88 },
          { opacity: 0, ...movement, offset: 1 },
        ],
        { id: 'asadero-notice', duration: noticeDuration },
      );
    },
    /** Cancel animations and release input/preference listeners on session teardown. */
    destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      cancelActive();
      for (const [element, timer] of noticeTimers) {
        environment.clearTimeout?.(timer);
        element.style.opacity = '';
      }
      noticeTimers.clear();
      document.removeEventListener?.('keydown', onKeyDown, true);
      document.removeEventListener?.('pointerdown', onPointerDown, true);
      preference?.removeEventListener('change', onPreferenceChange);
      root?.removeAttribute('data-motion-input');
    },
  };
}
