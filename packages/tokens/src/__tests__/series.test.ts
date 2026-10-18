import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { presetDraft, resolveDraft, stockDraft } from '../theme/draft.ts';
import { gate } from '../theme/gate.ts';
import { contrastRatio } from '../theme/recipe.ts';

const SERIES = [1, 2, 3, 4, 5, 6].map((n) => `--ult-color-series-${n}`);
const MODES = ['dark', 'light'] as const;
const GROUNDS = ['--ult-color-surface', '--ult-color-surface-raised'];
const scripts = fileURLToPath(new URL('../../scripts/', import.meta.url));

test('the six series tokens clear 3:1 on surface and surface-raised in both modes and both presets', () => {
  for (const id of ['neutral', 'ultima'] as const) {
    const resolved = resolveDraft(presetDraft(id));
    for (const mode of MODES) {
      for (const series of SERIES) {
        expect(resolved[mode][series], `${id} ${mode} ${series}`).toMatch(/^#[0-9a-f]{6}$/);
        for (const ground of GROUNDS) {
          const ratio = contrastRatio(resolved[mode][series] ?? '', resolved[mode][ground] ?? '');
          expect(ratio, `${id} ${mode} ${series} on ${ground}`).toBeGreaterThanOrEqual(3);
        }
      }
    }
    const rows = gate(resolved).filter((row) => SERIES.includes(row.foreground));
    expect(rows.map((row) => `${row.foreground} on ${row.background}`)).toEqual(
      SERIES.flatMap((series) => GROUNDS.map((ground) => `${series} on ${ground}`)),
    );
    expect(rows.every((row) => row.minimum === 3 && row.dark.pass && row.light.pass)).toBe(true);
  }
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

test('palette.py generates the series in both presets and its check fails on a hand edit to one', () => {
  const reference = JSON.parse(readFileSync(join(scripts, 'palette.json'), 'utf8'));
  for (const mode of MODES) {
    const neutral = SERIES.map((series) => reference.semantic[mode][series.replace('--ult-color-', '')]);
    expect(neutral.every((value: unknown) => typeof value === 'string')).toBe(true);
    expect(SERIES.map((series) => reference.ultima.semantic[mode][series.replace('--ult-color-', '')])).toEqual(neutral);
  }

  const dir = mkdtempSync(join(tmpdir(), 'palette-'));
  copyFileSync(join(scripts, 'palette.py'), join(dir, 'palette.py'));
  execFileSync('python3', [join(dir, 'palette.py')], { encoding: 'utf8' });
  execFileSync('python3', [join(dir, 'palette.py'), '--check'], { encoding: 'utf8' });

  const generated = readFileSync(join(dir, 'palette.json'), 'utf8');
  const value = reference.semantic.light['series-3'] as string;
  const edited = generated.replace(`"series-3": "${value}"`, '"series-3": "#123456"');
  expect(edited).not.toBe(generated);
  writeFileSync(join(dir, 'palette.json'), edited);
  const run = spawnSync('python3', [join(dir, 'palette.py'), '--check'], { encoding: 'utf8' });
  expect(run.status).toBe(1);
  expect(run.stderr).toContain('"series-3": "#123456"');
});
