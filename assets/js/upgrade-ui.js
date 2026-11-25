/** @module upgrade-ui */
import { icon } from './icons.js';

/**
 * Replace the current offers with native keyboard-accessible selection buttons.
 * Catalog strings are authored metadata; player-supplied text is not accepted here.
 * @param {object} options Catalog, roster, DOM container and selection collaborators.
 * @param {HTMLElement} options.container Offer host, whose children are replaced.
 * @param {import('./types.js').UpgradeOffer[]} options.offers Distinct eligible offers.
 * @param {Record<string,import('./types.js').UpgradeDefinition>} options.upgrades Upgrade catalog.
 * @param {Record<string,import('./types.js').RarityDefinition>} options.rarities Rarity catalog.
 * @param {import('./types.js').GameMember[]} options.team Current player roster.
 * @param {function(number):void} options.onPick Select an offer by index.
 * @param {object[]} options.icons Visible 3D preview registry.
 * @param {function(string):object[]} options.objSpec Get preview geometry.
 * @param {function(object,string):boolean} options.canUpg Check member eligibility.
 * @param {object} options.motion Session-owned decorative animation controller.
 * @param {object} [options.specializations] Optional specialization definitions.
 * @param {object} [options.ultimates] Optional maximum-level ability descriptions.
 * @returns {void}
 */
export function renderUpgradeCards({
  container,
  offers,
  upgrades,
  rarities,
  team,
  onPick,
  icons,
  objSpec,
  canUpg,
  motion,
  specializations = {},
  ultimates = {},
}) {
  container.replaceChildren();
  offers.forEach((offer, index) => {
    const upgrade = upgrades[offer.id],
      rarity = rarities[upgrade.rarity];
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card upgrade-card';
    card.dataset.rarity = upgrade.rarity;
    card.style.setProperty('--rarity', rarity.color);
    const level = Math.min(
      ...team
        .filter((member) => canUpg(member, offer.id))
        .map((member) => {
          if (offer.id === 'robot') {
            return member.t > 0 ? 1 : 0;
          }
          if (offer.id === 'titan') {
            return member.t > 1 ? 1 : 0;
          }
          return member.l[offer.id] || 0;
        }),
    );
    card.innerHTML = `<span class="card-top"><span class="rarity-badge">${icon(rarity.icon)} ${rarity.name}</span><span class="card-level">${level ? 'MEJORAR' : 'NUEVA'}</span></span>
      <span class="card-art"><canvas class="ic" aria-hidden="true"></canvas></span>
      <span class="card-copy"><span class="nm">${upgrade.n}</span><span class="ds">${upgrade.d}</span></span>
      <span class="card-footer"><span>${icon(upgrade.icon)} Nivel ${level + 1} / ${upgrade.max}</span>${icon('arrow-right')}</span>`;
    if (upgrade.sp) {
      const label = document.createElement('span');
      label.className = 'specialty-label';
      label.textContent = specializations[upgrade.sp]?.n || upgrade.sp;
      card.querySelector('.card-copy').appendChild(label);
      if (level + 1 >= upgrade.max && ultimates[offer.id]) {
        const ultimate = document.createElement('span');
        ultimate.className = 'ultimate-label';
        ultimate.textContent = `Definitiva: ${ultimates[offer.id].n}`;
        card.querySelector('.card-copy').appendChild(ultimate);
      }
    }
    card.onclick = () => onPick(index);
    container.appendChild(card);
    icons.push({ cv: card.querySelector('canvas'), spec: () => objSpec(offer.id) });
  });
  motion.reveal(container.children);
}

/**
 * Mount the persistent, native disclosure explaining conditional draw probabilities.
 * @param {HTMLElement} container Guide host; an existing guide is preserved.
 * @param {Record<string,import('./types.js').RarityDefinition>} rarities Rarity catalog.
 * @returns {void}
 */
export function renderRarityGuide(container, rarities) {
  if (container.childElementCount) {
    return;
  }
  const details = document.createElement('details');
  details.className = 'rarity-guide';
  details.innerHTML = `<summary>${icon('diamond')} Rarezas y probabilidades ${icon('chevron')}</summary>
    <div class="rarity-chances">${Object.values(rarities)
      .map(
        (rarity) =>
          `<span style="--rarity:${rarity.color}">${icon(rarity.icon)} ${rarity.name} <b>${rarity.weight}%</b></span>`,
      )
      .join('')}</div>
    <p>Se sortea la rareza y después una mejora de esa categoría. Los porcentajes se ajustan entre las rarezas disponibles. No se repiten mejoras en una misma selección.</p>`;
  container.appendChild(details);
}
