import { expect, test } from 'vitest';

import { resolveDraft, stockDraft, type ThemeDraft } from '../theme/draft.ts';
import { gate } from '../theme/gate.ts';
import { SCALE_NAMES } from '../theme/recipe.ts';
import { shuffleDraft, SHUFFLE_ATTEMPT_LIMIT } from '../theme/shuffle.ts';

function pinnedDraft(): ThemeDraft {
  const draft = stockDraft();
  const stock = resolveDraft(draft);
  draft.overrides.dark = { ...stock.dark };
  draft.overrides.light = { ...stock.light };
  return draft;
}

test('a recorded seed replays a shuffle identically', () => {
  const draft = pinnedDraft();
  const first = shuffleDraft(draft, 'global', 'broad', 42);
  const second = shuffleDraft(draft, 'global', 'broad', 42);
  expect(first).toEqual(second);
  expect(first.kind).toBe('applied');
  if (first.kind === 'applied') {
    expect(first.draft).not.toEqual(draft);
    expect(first.draft.shuffleSeeds.global).toBe(42);
  }
});

test('broad draws fresh parameters uniformly within each control range', () => {
  const result = shuffleDraft(pinnedDraft(), 'color', 'broad', 7);
  expect(result.kind).toBe('applied');
  if (result.kind !== 'applied') return;

  for (const name of SCALE_NAMES) {
    const seed = result.draft.color[name];
    expect(Number.isInteger(seed.hue), `${name} hue`).toBe(true);
    expect(seed.hue).toBeGreaterThanOrEqual(0);
    expect(seed.hue).toBeLessThanOrEqual(359);
    expect(seed.saturation).toBeGreaterThanOrEqual(0);
    expect(seed.saturation).toBeLessThanOrEqual(1.5);
  }

  const draft = stockDraft();
  draft.locks.color = true;
  const wide = shuffleDraft(draft, 'global', 'broad', 7);
  expect(wide.kind).toBe('applied');
  if (wide.kind !== 'applied') return;
  expect([0.75, 1, 1.25]).toContain(wide.draft.density);
  expect(['sharp', 'default', 'round']).toContain(wide.draft.shape);
  expect(wide.draft.elevation).toBeGreaterThanOrEqual(0);
  expect(wide.draft.elevation).toBeLessThanOrEqual(2);
  expect(wide.draft.motion).toBeGreaterThanOrEqual(0.5);
  expect(wide.draft.motion).toBeLessThanOrEqual(2);
  expect(wide.draft.typography.baseSizePx).toBeGreaterThanOrEqual(14);
  expect(wide.draft.typography.baseSizePx).toBeLessThanOrEqual(18);
  expect((wide.draft.typography.baseSizePx * 2) % 1).toBe(0);
  expect(['stock', 1.125, 1.2, 1.25, 1.333]).toContain(wide.draft.typography.scale);
  expect(['compact', 'default', 'loose']).toContain(wide.draft.typography.leading);
  expect(['compact', 'default', 'loose']).toContain(wide.draft.typography.tracking);
});

test('subtle perturbs the current draft inside its bounds', () => {
  const draft = pinnedDraft();
  const result = shuffleDraft(draft, 'color', 'subtle', 9);
  expect(result.kind).toBe('applied');
  if (result.kind !== 'applied') return;
  for (const name of SCALE_NAMES) {
    const before = draft.color[name];
    const after = result.draft.color[name];
    const hueDelta = Math.min(Math.abs(after.hue - before.hue), 360 - Math.abs(after.hue - before.hue));
    expect(hueDelta, `${name} hue`).toBeLessThanOrEqual(15);
    expect(Math.abs(after.saturation - before.saturation), `${name} saturation`).toBeLessThanOrEqual(
      0.15 + 1e-9,
    );
  }

  const stock = stockDraft();
  stock.locks.color = true;
  const near = shuffleDraft(stock, 'global', 'subtle', 9);
  expect(near.kind).toBe('applied');
  if (near.kind !== 'applied') return;
  expect(near.draft.color).toEqual(stock.color);
  expect(near.draft.typography.baseSizePx).toBeGreaterThanOrEqual(15);
  expect(near.draft.typography.baseSizePx).toBeLessThanOrEqual(17);
  expect(near.draft.typography.scale).toBe(1.125);
  expect(['compact', 'loose']).toContain(near.draft.typography.leading);
  expect(['compact', 'loose']).toContain(near.draft.typography.tracking);
  expect([0.75, 1.25]).toContain(near.draft.density);
  expect(['sharp', 'soft', 'round']).toContain(near.draft.shape);
  expect(Math.abs(near.draft.elevation - 1)).toBeCloseTo(0.1, 9);
  expect(Math.abs(near.draft.motion - 1)).toBeCloseTo(0.1, 9);
});

test('a locked group is untouched by every shuffle', () => {
  const draft = stockDraft();
  draft.locks.typography = true;
  draft.locks.density = true;
  const result = shuffleDraft(draft, 'global', 'broad', 11);
  expect(result.kind).toBe('applied');
  if (result.kind !== 'applied') return;
  expect(result.draft.typography).toEqual(draft.typography);
  expect(result.draft.density).toBe(draft.density);
});

test('a locked group shuffle does nothing', () => {
  const draft = stockDraft();
  draft.locks.density = true;
  expect(shuffleDraft(draft, 'density', 'broad', 5).kind).toBe('locked');
  draft.locks.color = true;
  draft.locks.typography = true;
  draft.locks.shape = true;
  draft.locks.elevation = true;
  draft.locks.motion = true;
  expect(shuffleDraft(draft, 'global', 'broad', 5).kind).toBe('locked');
});

test('the color search accepts only candidates passing the pairing gate in both modes', () => {
  const result = shuffleDraft(stockDraft(), 'color', 'broad', 13);
  expect(result.kind).toBe('applied');
  if (result.kind !== 'applied') return;
  const results = gate(resolveDraft(result.draft));
  for (const row of results) {
    expect(row.dark.pass, `${row.foreground} on ${row.background} dark`).toBe(true);
    expect(row.light.pass, `${row.foreground} on ${row.background} light`).toBe(true);
  }
});

test('exhaustion applies nothing and reports the failing pairings and locks', () => {
  const draft = stockDraft();
  draft.overrides.dark['--ult-color-text'] = '#112233';
  draft.overrides.dark['--ult-color-surface'] = '#112233';
  draft.overrides.light['--ult-color-text'] = '#445566';
  draft.overrides.light['--ult-color-surface'] = '#445566';
  draft.locks.motion = true;

  const result = shuffleDraft(draft, 'global', 'broad', 3);
  expect(result.kind).toBe('exhausted');
  if (result.kind !== 'exhausted') return;
  expect(SHUFFLE_ATTEMPT_LIMIT).toBe(50);
  expect(
    result.report.failures.some(
      (row) => row.foreground === '--ult-color-text' && row.background === '--ult-color-surface',
    ),
  ).toBe(true);
  expect(result.report.locks).toContain('motion');
  expect(result.report.locks).not.toContain('color');
});

test('a group shuffle records its seed on the draft', () => {
  const draft = stockDraft();
  draft.locks.color = true;
  draft.locks.typography = true;
  draft.locks.density = true;
  draft.locks.elevation = true;
  draft.locks.motion = true;
  const result = shuffleDraft(draft, 'shape', 'broad', 77);
  expect(result.kind).toBe('applied');
  if (result.kind !== 'applied') return;
  expect(result.draft.shuffleSeeds.shape).toBe(77);
});
