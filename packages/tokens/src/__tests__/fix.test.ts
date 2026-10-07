import { expect, test } from 'vitest';

import { presetDraft, resolveDraft, type ThemeDraft } from '../theme/draft.ts';
import { applyClosestPassingValue, closestPassingValue, fixTarget } from '../theme/fix.ts';
import { gate, PAIRINGS, type Pairing } from '../theme/gate.ts';
import { contrastRatio } from '../theme/recipe.ts';

function pairing(foreground: string, background: string): Pairing {
  const found = PAIRINGS.find(
    (row) => row.foreground === `--ult-color-${foreground}` && row.background === `--ult-color-${background}`,
  );
  if (!found) throw new Error(`${foreground} on ${background} is not a declared pairing`);
  return found;
}

function withOverrides(dark: Record<string, string>, light: Record<string, string> = {}): ThemeDraft {
  const draft = presetDraft('neutral');
  draft.overrides = { dark: { ...dark }, light: { ...light } };
  return draft;
}

function pairingsOf(draft: ThemeDraft, token: string) {
  return gate(resolveDraft(draft)).filter((row) => row.foreground === token || row.background === token);
}

test('the target is the overridden token, else the foreground', () => {
  const textOnSurface = pairing('text', 'surface');
  expect(fixTarget(withOverrides({}), textOnSurface)).toBe('--ult-color-text');
  expect(fixTarget(withOverrides({ '--ult-color-surface': '#202020' }), textOnSurface)).toBe('--ult-color-surface');
  expect(fixTarget(withOverrides({}, { '--ult-color-surface': '#202020' }), textOnSurface)).toBe('--ult-color-surface');
  expect(fixTarget(withOverrides({ '--ult-color-text': '#202020' }), textOnSurface)).toBe('--ult-color-text');
  expect(
    fixTarget(withOverrides({ '--ult-color-text': '#202020', '--ult-color-surface': '#202020' }), textOnSurface),
  ).toBe('--ult-color-text');
});

test('a preferred target that is not directly editable hands the fix to the other token', () => {
  const overlayOnText = { foreground: '--ult-color-surface-overlay', background: '--ult-color-text', minimum: 4.5 };
  expect(fixTarget(withOverrides({}), overlayOnText)).toBe('--ult-color-text');
});

test('the accepted value passes every pairing the target takes part in, not only the failing one', () => {
  const draft = withOverrides({ '--ult-color-surface-hover': '#767676', '--ult-color-text-muted': '#3a3a3a' });
  const hover = pairing('text-muted', 'surface-hover');
  expect(contrastRatio('#000000', '#767676')).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio('#000000', resolveDraft(draft).dark['--ult-color-surface'] ?? '')).toBeLessThan(4.5);

  const result = closestPassingValue(draft, hover, 'dark');
  expect(result).toEqual({ value: '#fefefe' });

  const rows = pairingsOf(
    withOverrides({ '--ult-color-surface-hover': '#767676', '--ult-color-text-muted': '#fefefe' }),
    '--ult-color-text-muted',
  );
  expect(rows.length).toBe(4);
  expect(rows.every((row) => row.dark.pass)).toBe(true);
});

test('the smallest lightness distance wins and a tie goes to the higher ratio against the partner', () => {
  const repairUnpaired = (partner: string, target: string, minimum: number) =>
    closestPassingValue(
      withOverrides({ '--ult-color-surface-hover': partner, '--ult-color-text-inverse': target }),
      { foreground: '--ult-color-text-inverse', background: '--ult-color-surface-hover', minimum },
      'dark',
    );

  expect(contrastRatio('#939393', '#777777')).toBeGreaterThan(contrastRatio('#5e5e5e', '#777777'));
  expect(repairUnpaired('#777777', '#787878', 1.44)).toEqual({ value: '#939393' });

  expect(contrastRatio('#6b6b6b', '#777777')).toBeGreaterThan(contrastRatio('#838383', '#777777'));
  expect(repairUnpaired('#777777', '#777777', 1.18)).toEqual({ value: '#6b6b6b' });
});

test('no passing lightness disables the fix with a reason', () => {
  const draft = withOverrides({ '--ult-color-text': '#3a3a3a', '--ult-color-surface-hover': '#7c7c7c' });
  const textOnHover = pairing('text', 'surface-hover');
  const reason = { reason: 'No lightness at this hue passes every pairing for text.' };
  expect(closestPassingValue(draft, textOnHover, 'dark')).toEqual(reason);
  expect(applyClosestPassingValue(draft, textOnHover)).toEqual(reason);
});

test('the fix writes only the failing mode', () => {
  const draft = presetDraft('ultima');
  draft.overrides.dark['--ult-color-accent-text'] = '#c26b4a';
  draft.overrides.light['--ult-color-accent-text'] = '#c26b4a';
  const onSurface = pairing('accent-text', 'surface');
  const before = gate(resolveDraft(draft)).find((row) => row.foreground === onSurface.foreground && row.background === onSurface.background)!;
  expect(before.dark.pass).toBe(true);
  expect(before.light.pass).toBe(false);

  const result = applyClosestPassingValue(draft, onSurface);
  if (!('draft' in result)) throw new Error(result.reason);
  expect(result.draft.overrides.dark['--ult-color-accent-text']).toBe('#c26b4a');
  expect(result.draft.overrides.light['--ult-color-accent-text']).toBe('#ab5636');
  expect(draft.overrides.light['--ult-color-accent-text']).toBe('#c26b4a');
});

test('each failing mode is searched independently, and locks do not stop the fix', () => {
  const draft = withOverrides({ '--ult-color-text-subtle': '#555555' }, { '--ult-color-text-subtle': '#bbbbbb' });
  draft.locks.color = true;
  const result = applyClosestPassingValue(draft, pairing('text-subtle', 'surface'));
  if (!('draft' in result)) throw new Error(result.reason);
  expect(result.draft.overrides.dark['--ult-color-text-subtle']).toBe('#8e8e8e');
  expect(result.draft.overrides.light['--ult-color-text-subtle']).toBe('#696969');
  const rows = gate(resolveDraft(result.draft)).filter((row) => row.foreground === '--ult-color-text-subtle');
  expect(rows.every((row) => row.dark.pass && row.light.pass)).toBe(true);
});

test('a fix never breaks a passing pairing through a derived on-color', () => {
  // A darker accent would flip the un-pinned accent-contrast to the light end and fail it on accent-hover and accent-active.
  const draft = withOverrides({ '--ult-color-accent': '#333333' });
  const before = gate(resolveDraft(draft)).filter((row) => !row.dark.pass);
  expect(before.map((row) => `${row.foreground} on ${row.background}`)).toEqual(['--ult-color-accent-contrast on --ult-color-accent']);

  const result = applyClosestPassingValue(draft, pairing('accent-contrast', 'accent'));
  if (!('draft' in result)) throw new Error(result.reason);
  expect(result.draft.overrides.dark['--ult-color-accent']).toBe('#7b7b7b');
  expect(gate(resolveDraft(result.draft)).every((row) => row.dark.pass && row.light.pass)).toBe(true);
});

test('across the presets, no fix shrinks the passing set in either mode', () => {
  const key = (row: Pairing) => `${row.foreground}|${row.background}`;
  let fixed = 0;
  for (const preset of ['neutral', 'ultima', 'grove', 'cinder'] as const) {
    for (const declared of PAIRINGS) {
      for (const token of [declared.foreground, declared.background]) {
        for (const value of ['#000000', '#777777', '#ffffff']) {
          const draft = presetDraft(preset);
          draft.overrides = { dark: { [token]: value }, light: { [token]: value } };
          const before = gate(resolveDraft(draft));
          const row = before.find((candidate) => key(candidate) === key(declared))!;
          if (row.dark.pass && row.light.pass) continue;
          const result = applyClosestPassingValue(draft, declared);
          if (!('draft' in result)) continue;
          fixed++;
          const after = gate(resolveDraft(result.draft));
          for (const mode of ['dark', 'light'] as const) {
            const lost = before.filter((was, i) => was[mode].pass && !after[i]![mode].pass).map(key);
            expect(lost, `${preset} ${key(declared)} ${token}=${value} ${mode}`).toEqual([]);
            expect(after.find((candidate) => key(candidate) === key(declared))![mode].pass).toBe(true);
          }
        }
      }
    }
  }
  expect(fixed).toBeGreaterThan(100);
}, 60_000);

test('a linked row whose single written mode matches the other mode stays linked', () => {
  // text-inverse takes part in no declared pairing; against warning only light fails, and its nearest pass is dark's own value.
  const draft = presetDraft('neutral');
  const resolved = resolveDraft(draft);
  expect(resolved.dark['--ult-color-text-inverse']).toBe('#0e0e0e');
  const minimum = contrastRatio('#0e0e0e', resolved.light['--ult-color-warning'] ?? '');
  const result = applyClosestPassingValue(draft, { foreground: '--ult-color-text-inverse', background: '--ult-color-warning', minimum });
  if (!('draft' in result)) throw new Error(result.reason);
  expect(result.draft.overrides.light['--ult-color-text-inverse']).toBe('#0e0e0e');
  expect(result.draft.overrides.dark['--ult-color-text-inverse']).toBe('#0e0e0e');
  expect(resolveDraft(result.draft).dark).toEqual(resolved.dark);
});
