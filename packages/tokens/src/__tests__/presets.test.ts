import { expect, test } from 'vitest';

import { restoreAutosave, saveAutosave, type StorageLike } from '../theme/autosave.ts';
import * as drafts from '../theme/draft.ts';
import { gate } from '../theme/gate.ts';
import { decodeFragment, encodeFragment, parseDraft, serializeDraft } from '../theme/codec.ts';
import { toCss, toRegistryItem, toStylex } from '../theme/export.ts';
import { commit, createHistory, undo } from '../theme/history.ts';
import { shuffleDraft } from '../theme/shuffle.ts';
import legacy from './fixtures/legacy-theme-drafts.json';
import presetV2 from './fixtures/preset-v2-theme-drafts.json';

function memoryStorage(): StorageLike {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

test('a fresh Neutral theme is versioned, achromatic and passes both modes', () => {
  expect(drafts.presetDraft).toBeTypeOf('function');
  const draft = drafts.presetDraft('neutral');
  expect(draft.version).toBe(3);
  expect(draft.recipeVersion).toBe(2);
  expect(draft.preset).toEqual({ id: 'neutral', revision: 2 });
  expect(draft.accentFill).toBe('ink');
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
    const registry = JSON.parse(toRegistryItem(parsed.draft));
    expect({ ...registry, files: registry.files.slice(0, 2) }).toEqual(JSON.parse(fixture.registry));
    expect(registry.files[2]?.target).toBe('~/DESIGN.md');
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

test('Neutral revision 2 resolves its Ink accent table in both modes', () => {
  const resolved = drafts.resolveDraft(drafts.presetDraft('neutral'));
  const expected = {
    accent: ['#e8e8e8', '#1b1b1b'],
    'accent-hover': ['#d4d4d4', '#2e2e2e'],
    'accent-active': ['#c4c4c4', '#3d3d3d'],
    'accent-subtle': ['#1e1e1e', '#f2f2f2'],
    'accent-border': ['#4d4d4d', '#b7b7b7'],
    'accent-text': ['#e8e8e8', '#1b1b1b'],
    'accent-contrast': ['#0e0e0e', '#fdfdfd'],
  };
  for (const [role, [dark, light]] of Object.entries(expected)) {
    expect(resolved.dark[`--ult-color-${role}`], role).toBe(dark);
    expect(resolved.light[`--ult-color-${role}`], role).toBe(light);
  }
  const revision1 = drafts.resolveDraft(drafts.presetDraft({ id: 'neutral', revision: 1 }));
  expect(resolved.dark['--ult-color-border-focus']).toBe(revision1.dark['--ult-color-border-focus']);
  expect(resolved.light['--ult-color-border-focus']).toBe(revision1.light['--ult-color-border-focus']);
});

test('every revision-2 preset is a version-3 draft on the four-shape table and passes all 49 pairings', () => {
  const shapes = { neutral: 'default', ultima: 'soft', grove: 'round', cinder: 'sharp' } as const;
  const radii = { neutral: '1px 2px 4px 6px', ultima: '2px 4px 10px 12px', grove: '6px 10px 16px 24px', cinder: '0px 0px 0px 0px' };
  expect(drafts.shapePresets(3)).toEqual(['sharp', 'default', 'soft', 'round']);
  for (const { id } of drafts.THEME_PRESETS) {
    const draft = drafts.presetDraft(id);
    expect(draft).toMatchObject({ version: 3, preset: { id, revision: 2 }, shape: shapes[id], accentFill: id === 'neutral' ? 'ink' : 'hue' });
    const revision1 = drafts.presetDraft({ id, revision: 1 });
    expect(revision1).toMatchObject({ version: 2, preset: { id, revision: 1 } });
    expect(revision1).not.toHaveProperty('accentFill');
    const { shape: _shape, accentFill: _fill, preset: _preset, version: _version, ...fields } = draft;
    expect(revision1).toMatchObject(fields);
    const resolved = drafts.resolveDraft(draft);
    expect(['xs', 'sm', 'md', 'lg'].map((size) => resolved.dark[`--ult-radius-${size}`]).join(' ')).toBe(radii[id]);
    const results = gate(resolved);
    expect(results).toHaveLength(49);
    expect(results.every((row) => row.dark.pass && row.light.pass), id).toBe(true);
    expect(parseDraft(serializeDraft(draft))).toEqual({ ok: true, draft });
  }
});

test('version-2 preset drafts resolve every token unchanged after open, autosave, share link and export', async () => {
  expect(presetV2.cases.map((fixture) => fixture.draft.preset.id)).toEqual(drafts.THEME_PRESETS.map(({ id }) => id));
  for (const fixture of presetV2.cases) {
    const id = fixture.draft.preset.id;
    const opened = parseDraft(JSON.stringify(fixture.draft));
    if (!opened.ok) throw new Error(opened.message);
    expect(opened.draft).toEqual(drafts.presetDraft({ id: opened.draft.preset!.id, revision: 1 }));
    const storage = memoryStorage();
    saveAutosave(opened.draft, storage);
    const restored = restoreAutosave(storage);
    if (restored.status !== 'restored') throw new Error(`${id} autosave did not restore`);
    const shared = await decodeFragment((await encodeFragment(opened.draft)).fragment);
    if (!shared.ok) throw new Error(shared.message);
    for (const draft of [opened.draft, restored.draft, shared.draft]) {
      expect(draft.version, id).toBe(2);
      expect(serializeDraft(draft)).toBe(serializeDraft(fixture.draft as drafts.ThemeDraft));
      expect(drafts.resolveDraft(draft), id).toEqual(fixture.resolved);
      expect(toCss(draft), id).toBe(fixture.css);
      expect(toStylex(draft), id).toBe(fixture.stylex);
      const registry = JSON.parse(toRegistryItem(draft));
      expect({ ...registry, files: registry.files.slice(0, 2) }, id).toEqual(JSON.parse(fixture.registry));
      expect(drafts.resetDraft(draft)).toEqual(opened.draft);
    }
  }
  for (const fixture of legacy.cases) {
    const opened = parseDraft(JSON.stringify(fixture.draft));
    if (!opened.ok) throw new Error(opened.message);
    const storage = memoryStorage();
    saveAutosave(opened.draft, storage);
    const restored = restoreAutosave(storage);
    if (restored.status !== 'restored') throw new Error('legacy autosave did not restore');
    const shared = await decodeFragment((await encodeFragment(opened.draft)).fragment);
    if (!shared.ok) throw new Error(shared.message);
    for (const draft of [restored.draft, shared.draft]) {
      expect(draft.version).toBe(1);
      expect(drafts.resolveDraft(draft)).toEqual(fixture.resolved);
      expect(toCss(draft)).toBe(fixture.css);
    }
  }
});

test('selecting a preset from a version-2 draft is one undoable entry to version 3', () => {
  const saved = drafts.presetDraft({ id: 'grove', revision: 1 });
  saved.overrides.dark['--ult-color-accent'] = '#224466';
  saved.locks.shape = true;
  const before = serializeDraft(saved);
  const selected = commit(createHistory(saved), drafts.presetDraft('cinder'));
  expect(selected.past).toHaveLength(1);
  expect(selected.committed).toEqual(drafts.presetDraft('cinder'));
  expect(selected.committed).toMatchObject({ version: 3, preset: { id: 'cinder', revision: 2 } });
  expect(serializeDraft(undo(selected).committed)).toBe(before);
});

test('version-2 drafts keep the frozen three-shape table and refuse version-3 fields', () => {
  expect(drafts.shapePresets(2)).toEqual(['sharp', 'default', 'round']);
  expect(drafts.shapePresets(1)).toEqual(['sharp', 'default', 'round']);
  const v2 = drafts.presetDraft({ id: 'neutral', revision: 1 });
  expect(drafts.resolveDraft({ ...v2, shape: 'default' }).dark['--ult-radius-md']).toBe('10px');
  expect(drafts.resolveDraft({ ...v2, shape: 'sharp' }).dark['--ult-radius-xs']).toBe('0px');
  expect(drafts.resolveDraft({ ...v2, shape: 'sharp' }).dark['--ult-radius-sm']).toBe('2px');
  expect(parseDraft(JSON.stringify({ ...v2, shape: 'soft' }))).toMatchObject({ ok: false, reason: 'malformed' });
  const ignored = parseDraft(JSON.stringify({ ...v2, accentFill: 'ink' }));
  if (!ignored.ok) throw new Error(ignored.message);
  expect(ignored.draft).not.toHaveProperty('accentFill');
  expect(drafts.resolveDraft(ignored.draft)).toEqual(drafts.resolveDraft(v2));
  const v3 = drafts.presetDraft('neutral');
  expect(parseDraft(JSON.stringify({ ...v3, preset: { id: 'neutral', revision: 1 } }))).toMatchObject({ ok: false, reason: 'unknown-version' });
  expect(parseDraft(JSON.stringify({ ...v2, preset: { id: 'neutral', revision: 2 } }))).toMatchObject({ ok: false, reason: 'unknown-version' });
  const { accentFill: _fill, ...missing } = v3;
  expect(parseDraft(JSON.stringify(missing))).toMatchObject({ ok: false, reason: 'malformed' });
  expect(parseDraft(JSON.stringify({ ...v3, accentFill: 'tint' }))).toMatchObject({ ok: false, reason: 'malformed' });
  expect(parseDraft(JSON.stringify({ ...v3, version: 4 }))).toMatchObject({ ok: false, reason: 'unknown-version' });
});

test('a custom draft resets to the Neutral revision of its own document version', () => {
  expect(drafts.resetDraft({ ...drafts.presetDraft('grove'), preset: null })).toEqual(drafts.presetDraft('neutral'));
  expect(drafts.resetDraft({ ...drafts.presetDraft({ id: 'grove', revision: 1 }), preset: null }))
    .toEqual(drafts.presetDraft({ id: 'neutral', revision: 1 }));
});

test('Shuffle never changes the accent fill and draws shapes from the draft version', () => {
  const v3 = drafts.presetDraft('neutral');
  const v2 = drafts.presetDraft({ id: 'neutral', revision: 1 });
  const v3Shapes = new Set<string>();
  const v2Shapes = new Set<string>();
  for (let seed = 1; seed <= 60; seed++) {
    const global = shuffleDraft(v3, 'global', 'broad', seed);
    if (global.kind === 'applied') expect(global.draft.accentFill).toBe('ink');
    const color = shuffleDraft(v3, 'color', 'subtle', seed);
    if (color.kind === 'applied') expect(color.draft.accentFill).toBe('ink');
    const shape = shuffleDraft(v3, 'shape', 'broad', seed);
    if (shape.kind === 'applied') v3Shapes.add(shape.draft.shape);
    const legacyShape = shuffleDraft(v2, 'shape', 'broad', seed);
    if (legacyShape.kind === 'applied') {
      v2Shapes.add(legacyShape.draft.shape);
      expect(legacyShape.draft).not.toHaveProperty('accentFill');
    }
  }
  expect([...v3Shapes].sort()).toEqual(['default', 'round', 'sharp', 'soft']);
  expect([...v2Shapes].sort()).toEqual(['default', 'round', 'sharp']);
});
