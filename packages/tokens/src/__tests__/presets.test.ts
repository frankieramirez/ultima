import { expect, test } from 'vitest';

import * as drafts from '../theme/draft.ts';
import { gate } from '../theme/gate.ts';
import { decodeFragment, encodeFragment, parseDraft, serializeDraft } from '../theme/codec.ts';
import { toCss, toRegistryItem, toStylex } from '../theme/export.ts';
import legacy from './fixtures/legacy-theme-drafts.json';

test('a fresh Neutral theme is versioned, achromatic and passes both modes', () => {
  expect(drafts.presetDraft).toBeTypeOf('function');
  const draft = drafts.presetDraft('neutral');
  expect(draft.version).toBe(2);
  expect(draft.recipeVersion).toBe(2);
  expect(draft.preset).toEqual({ id: 'neutral', revision: 1 });
  const resolved = drafts.resolveDraft(draft);
  for (const mode of ['dark', 'light'] as const) {
    for (const token of ['--ult-color-surface', '--ult-color-accent', '--ult-color-action']) {
      expect(resolved[mode][token]).toMatch(/^#([0-9a-f]{2})\1\1$/);
    }
  }
  expect(gate(resolved)).toHaveLength(49);
  expect(gate(resolved).every((pair) => pair.dark.pass && pair.light.pass)).toBe(true);
});

test('Ultima preserves its brand pins while every complete preset passes all pairings', () => {
  const ultima = drafts.resolveDraft(drafts.presetDraft('ultima'));
  expect(ultima.dark['--ult-color-surface']).toBe('#101011');
  expect(ultima.dark['--ult-color-highlight-text']).toBe('#8ff5ff');
  for (const { id } of drafts.THEME_PRESETS) {
    const draft = drafts.presetDraft(id);
    expect(gate(drafts.resolveDraft(draft)).every((row) => row.dark.pass && row.light.pass), id).toBe(true);
    expect(drafts.isPresetEdited(draft)).toBe(false);
  }
});

test('saved v1 drafts preserve every resolved token and all exported artifacts', () => {
  for (const fixture of legacy.cases) {
    const parsed = parseDraft(JSON.stringify(fixture.draft));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.message);
    expect(parsed.draft.version).toBe(1);
    expect(parsed.draft).not.toHaveProperty('preset');
    expect(drafts.resolveDraft(parsed.draft)).toEqual(fixture.resolved);
    expect(toCss(parsed.draft)).toBe(fixture.css);
    expect(toStylex(parsed.draft)).toBe(fixture.stylex);
    expect(toRegistryItem(parsed.draft)).toBe(fixture.registry);
    expect(drafts.resetDraft(parsed.draft)).toEqual(drafts.stockDraft());
  }
});

test('edited preset documents and share links reopen exact values and reset to their revision', async () => {
  const draft = drafts.presetDraft('grove');
  draft.density = 0.75;
  draft.overrides.dark['--ult-color-accent'] = '#224466';
  draft.locks.color = true;
  expect(drafts.isPresetEdited(draft)).toBe(true);
  expect(parseDraft(serializeDraft(draft))).toEqual({ ok: true, draft });
  expect(await decodeFragment((await encodeFragment(draft)).fragment)).toEqual({ ok: true, draft });
  expect(drafts.resetDraft(draft)).toEqual(drafts.presetDraft('grove'));
  const unsupported = { ...draft, preset: { id: 'grove', revision: 999 } };
  expect(parseDraft(JSON.stringify(unsupported))).toMatchObject({ ok: false, reason: 'unknown-version' });
});
