/** @module layout */

/**
 * Apply shared screen structure and control semantics after each feature renders.
 * Features retain their data and actions; this adapter owns presentation structure only.
 * @param {object} game Session registry with the feature screens installed.
 * @returns {void}
 */
export function installLayout(game) {
  const modal = document.getElementById('mbox');
  const enhance = () => {
    const page = modal.querySelector('.tabv');
    if (page && !page.querySelector('.page-heading')) {
      const title = page.querySelector(':scope > h1');
      if (title) {
        const header = document.createElement('header');
        header.className = 'page-heading';
        page.prepend(header);
        header.append(title);
        const balance = page.querySelector(':scope > .coin');
        if (balance) {
          header.append(balance);
        }
      }
    }
    modal.querySelectorAll('.sk').forEach((card) => {
      if (typeof card.onclick !== 'function') {
        return;
      }
      card.setAttribute('role', 'button');
      card.setAttribute('aria-pressed', String(card.classList.contains('sel')));
      card.tabIndex = 0;
      card.onkeydown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          card.click();
        }
      };
    });
    modal.querySelectorAll('.stabs').forEach((group) => {
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', 'Categoría de equipamiento');
    });
    modal.querySelectorAll('[data-sl]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.classList.contains('on')));
    });
    document.querySelectorAll('#tabbar [data-t]').forEach((button) => {
      if (button.dataset.t === game.tabCur) {
        button.setAttribute('aria-current', 'page');
      } else {
        button.removeAttribute('aria-current');
      }
    });
  };
  for (const name of ['showHome', 'showShop', 'showHen', 'showChests', 'showPass']) {
    const show = game[name];
    game[name] = (...args) => {
      const category = modal.contains(document.activeElement)
        ? document.activeElement.dataset.sl
        : null;
      const result = show(...args);
      if (name === 'showHome') {
        const hero = document.querySelector('.home-hero');
        hero?.parentElement.prepend(hero);
      }
      enhance();
      if (category) {
        modal.querySelector(`[data-sl="${CSS.escape(category)}"]`)?.focus({ preventScroll: true });
      }
      return result;
    };
  }
}
