import { expect, test } from 'vitest';

import { presetDraft, resolveDraft, stockDraft } from '../theme/draft.ts';
import { gate } from '../theme/gate.ts';

const SERIES = [1, 2, 3, 4, 5, 6].map((n) => `--ult-color-series-${n}`);
const MODES = ['dark', 'light'] as const;
const GROUNDS = ['--ult-color-surface', '--ult-color-surface-raised'];

test('the gate holds each series token to 3:1 on surface and surface-raised', () => {
  const rows = gate(resolveDraft(presetDraft('neutral'))).filter((row) => SERIES.includes(row.foreground));
  expect(rows.map((row) => `${row.foreground} on ${row.background} at ${row.minimum}`)).toEqual(
    SERIES.flatMap((series) => GROUNDS.map((ground) => `${series} on ${ground} at 3`)),
  );
});

test('Neutral, Ultima and the base theme share the six values, and none aliases another color token', () => {
  const neutral = resolveDraft(presetDraft('neutral'));
  const ultima = resolveDraft(presetDraft('ultima'));
  const base = resolveDraft(stockDraft());
  for (const mode of MODES) {
    const values = SERIES.map((series) => neutral[mode][series]);
    expect(SERIES.map((series) => ultima[mode][series])).toEqual(values);
    expect(SERIES.map((series) => base[mode][series])).toEqual(values);
    expect(new Set(values).size).toBe(6);
    for (const table of [neutral, ultima]) {
      const roles = Object.entries(table[mode])
        .filter(([name]) => name.startsWith('--ult-color-') && !SERIES.includes(name))
        .map(([, value]) => value);
      for (const value of values) expect(roles, `${mode} ${value}`).not.toContain(value);
    }
  }
});
