import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { drawUpgradeOffers } from '../assets/js/rarity.js';
import { createUpgradeSystem } from '../assets/js/upgrades.js';
import { mulberry } from '../assets/js/math.js';

const data = JSON.parse(readFileSync(new URL('../assets/data/game.json', import.meta.url)));

test('the first draw follows rarity weights rather than the number of upgrades in each rarity', () => {
  const random = mulberry(73829),
    n = 60000,
    counts = {};
  for (let i = 0; i < n; i++) {
    const [offer] = drawUpgradeOffers(data.upgrades, data.rarities, () => true, 1, random);
    const rarity = data.upgrades[offer.id].rarity;
    counts[rarity] = (counts[rarity] || 0) + 1;
  }
  for (const [id, rarity] of Object.entries(data.rarities)) {
    assert.ok(Math.abs(counts[id] / n - rarity.weight / 100) < 0.006, `${id}: ${counts[id] / n}`);
  }
});

test('offers stay distinct and normalize probabilities across remaining eligible categories', () => {
  const random = mulberry(91);
  for (let i = 0; i < 300; i++) {
    const offers = drawUpgradeOffers(
      data.upgrades,
      data.rarities,
      (k) => data.upgrades[k].rarity === 'legendary',
      3,
      random,
    );
    assert.equal(offers.length, 2);
    assert.equal(new Set(offers.map((o) => o.id)).size, 2);
  }
  assert.deepEqual(
    drawUpgradeOffers(data.upgrades, data.rarities, () => false),
    [],
  );
});

test('prerequisites and maximum levels still control availability', () => {
  let team = [];
  const rules = createUpgradeSystem({ data, getTeam: () => team, getSkin: () => 'cap' });
  const hero = rules.newMember(true);
  team = [hero];
  assert.equal(hero.skin, 'cap');
  assert.equal(rules.memberStats(hero).hp, 48);
  assert.equal(rules.memberStats(hero).atk, 6);
  assert.equal(rules.canUpg(hero, 'titan'), false);
  rules.applyTo(hero, 'robot');
  assert.equal(rules.canUpg(hero, 'robot'), false);
  assert.equal(rules.canUpg(hero, 'titan'), true);
  rules.applyTo(hero, 'titan');
  assert.equal(rules.canUpg(hero, 'titan'), false);
  rules.applyTo(hero, 'flock');
  assert.equal(team.length, 3);
  assert.equal(rules.canUpg(team[1], 'flock'), false);
  hero.l.phoenix = 1;
  assert.equal(rules.canUpg(team[1], 'phoenix'), false);
  hero.l.laser = 5;
  assert.equal(rules.canUpg(hero, 'laser'), false);
  assert.ok(Number.isFinite(rules.memberStats(hero).hp));
});

test('catalog icons and rarities are complete and source UI contains no emoji pictograms', () => {
  const svg = readFileSync(new URL('../assets/icons.svg', import.meta.url), 'utf8');
  assert.equal(
    Object.values(data.rarities).reduce((sum, r) => sum + r.weight, 0),
    100,
  );
  for (const upgrade of Object.values(data.upgrades)) {
    assert.ok(data.rarities[upgrade.rarity]);
    assert.ok(svg.includes(`id="${upgrade.icon}"`));
  }
  for (const file of [
    '../index.html',
    '../assets/js/game.js',
    '../assets/js/models.js',
    '../assets/js/renderer.js',
  ]) {
    assert.ok(
      !/\p{Extended_Pictographic}/u.test(readFileSync(new URL(file, import.meta.url), 'utf8')),
      file,
    );
  }
});
