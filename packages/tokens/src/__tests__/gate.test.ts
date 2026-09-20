import { expect, test } from 'vitest';

import { resolveDraft, stockDraft } from '../theme/draft.ts';
import { contrastRatio } from '../theme/recipe.ts';
import { gate, PAIRINGS } from '../theme/gate.ts';

test('the pairing manifest is 49 pairs including the action checks', () => {
  expect(PAIRINGS).toHaveLength(49);
  const action = PAIRINGS.filter(
    (pairing) =>
      pairing.foreground === '--ult-color-action-contrast' &&
      ['--ult-color-action', '--ult-color-action-hover', '--ult-color-action-active'].includes(
        pairing.background,
      ),
  );
  expect(action).toHaveLength(3);
});

test('gate reports per-pairing pass/fail in both modes at full precision', () => {
  const tables = resolveDraft(stockDraft());
  const results = gate(tables);
  expect(results).toHaveLength(49);
  for (const result of results) {
    expect(result.dark.ratio).toBe(
      contrastRatio(tables.dark[result.foreground] ?? '', tables.dark[result.background] ?? ''),
    );
    expect(result.light.ratio).toBe(
      contrastRatio(tables.light[result.foreground] ?? '', tables.light[result.background] ?? ''),
    );
    expect(result.dark.pass).toBe(result.dark.ratio >= result.minimum);
    expect(result.light.pass).toBe(result.light.ratio >= result.minimum);
  }
});

test('full-precision compare does not round a 4.498 ratio up to 4.5', () => {
  const tables = resolveDraft(stockDraft());
  tables.dark['--ult-color-text'] = '#777777';
  tables.dark['--ult-color-surface'] = '#070707';
  const result = gate(tables).find(
    (row) => row.foreground === '--ult-color-text' && row.background === '--ult-color-surface',
  );
  expect(result?.dark.ratio).toBeCloseTo(4.4983480864214345, 12);
  expect(result?.dark.pass).toBe(false);
});
