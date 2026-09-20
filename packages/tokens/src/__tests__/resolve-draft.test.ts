import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { resolveDraft, stockDraft, type ThemeDraft } from '../theme/draft.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

function themeableTokens(): string[] {
  const source = readFileSync(join(root, 'packages/tokens/src/tokens.stylex.ts'), 'utf8');
  return [...source.matchAll(/'(--ult-[^']+)'/g)].map((match) => match[1] ?? '');
}

test('resolveDraft covers every themeable token in both modes', () => {
  const tables = resolveDraft(stockDraft());
  const tokens = themeableTokens();
  expect(tokens.length).toBeGreaterThan(0);
  for (const mode of ['dark', 'light'] as const) {
    for (const token of tokens) {
      expect(tables[mode][token], `${token} in ${mode}`).toEqual(expect.any(String));
      expect(tables[mode][token]?.length, `${token} in ${mode}`).toBeGreaterThan(0);
    }
  }
});

test('overrides pin the resolved value after derivation', () => {
  const draft: ThemeDraft = stockDraft();
  draft.overrides.dark['--ult-color-accent'] = '#ff00aa';
  draft.overrides.light['--ult-space-4'] = '2rem';
  draft.color.arcane = { hue: 12, saturation: 1.5 };

  const tables = resolveDraft(draft);
  expect(tables.dark['--ult-color-accent']).toBe('#ff00aa');
  expect(tables.light['--ult-space-4']).toBe('2rem');
  expect(tables.light['--ult-color-accent']).not.toBe('#ff00aa');
  expect(tables.dark['--ult-space-4']).not.toBe('2rem');
});

test('non-color groups follow the theme-studio derivation contracts', () => {
  const draft: ThemeDraft = stockDraft();
  draft.density = 0.75;
  draft.shape = 'sharp';
  draft.elevation = 0;
  draft.motion = 0.6;
  draft.typography.baseSizePx = 14;
  draft.typography.scale = 1.25;
  draft.typography.leading = 'compact';
  draft.typography.tracking = 'loose';
  draft.overrides.dark['--ult-color-surface-raised'] = '#abcdef';

  const tables = resolveDraft(draft);
  expect(tables.dark['--ult-space-1']).toBe('0.09375rem');
  expect(tables.dark['--ult-radius-xs']).toBe('0px');
  expect(tables.dark['--ult-radius-full']).toBe('9999px');
  expect(tables.dark['--ult-shadow-sm']).toBe('none');
  expect(tables.light['--ult-shadow-lg']).toBe('none');
  expect(tables.dark['--ult-motion-fast']).toBe('70ms');
  expect(tables.dark['--ult-text-5']).toBe('0.875rem');
  expect(tables.dark['--ult-text-6']).toBe('1.09375rem');
  expect(tables.dark['--ult-font-leading-normal']).toBe('1.45');
  expect(tables.dark['--ult-font-tracking-wide']).toBe('0.1em');
  expect(tables.dark['--ult-color-surface-overlay']).toBe('#abcdefb3');
});
