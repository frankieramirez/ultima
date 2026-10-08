import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

import { baseTokenSources } from '../../scripts/base-theme.ts';
import { restoreAutosave, saveAutosave, type StorageLike } from '../theme/autosave.ts';
import { decodeFragment, encodeFragment, parseDraft, serializeDraft } from '../theme/codec.ts';
import { presetDraft, resetDraft, resolveDraft, stockDraft, type ThemeDraft } from '../theme/draft.ts';
import { toCss, toRegistryItem, toStylex } from '../theme/export.ts';
import { parseGeneratedRegion, withoutProvenance } from '../theme/provenance.ts';
import { gate } from '../theme/gate.ts';
import { BASE_RECIPE_VERSION, generateScales, UnsupportedRecipeError } from '../theme/recipe.ts';
import reference from '../../scripts/palette.json';
import fixtures from './fixtures/pre-base-theme-drafts.json';

const hash = (source: string) => createHash('sha256').update(source).digest('hex');

function legacyRegistry(source: string): string {
  const { meta: _meta, ...item } = JSON.parse(source);
  item.files = item.files.map((file: { content: string; path: string }) => {
    const region = file.path === 'DESIGN.md' ? parseGeneratedRegion(file.content) : null;
    const content = region?.status === 'intact' ? region.content.slice(1) : file.content;
    return { ...file, content: withoutProvenance(content).replace(/^\n+/, '') };
  });
  return `${JSON.stringify(item, null, 2)}\n`;
}

test('every pre-base draft keeps its values through import, autosave, share and export', async () => {
  for (const fixture of fixtures.cases) {
    const opened = parseDraft(JSON.stringify(fixture.draft));
    if (!opened.ok) throw new Error(opened.message);
    const items = new Map<string, string>();
    const storage: StorageLike = {
      getItem: (key) => items.get(key) ?? null,
      setItem: (key, value) => { items.set(key, value); },
      removeItem: (key) => { items.delete(key); },
    };
    saveAutosave(opened.draft, storage);
    const restored = restoreAutosave(storage);
    if (restored.status !== 'restored') throw new Error(`${fixture.name} did not restore`);
    const shared = await decodeFragment((await encodeFragment(opened.draft)).fragment);
    if (!shared.ok) throw new Error(shared.message);
    for (const draft of [opened.draft, restored.draft, shared.draft]) {
      expect(resolveDraft(draft), fixture.name).toEqual(fixture.resolved);
      expect(hash(serializeDraft(draft)), fixture.name).toBe(fixture.exports.serialized);
      expect(hash(withoutProvenance(toCss(draft))), fixture.name).toBe(fixture.exports.css);
      expect(hash(withoutProvenance(toStylex(draft))), fixture.name).toBe(fixture.exports.stylex);
      expect(hash(legacyRegistry(toRegistryItem(draft))), fixture.name).toBe(fixture.exports.registry);
    }
  }
});

test('stock uses the new Neutral/Tight identity without revising any preset', () => {
  const draft = stockDraft();
  expect(draft).toMatchObject({ version: 3, recipeVersion: BASE_RECIPE_VERSION, shape: 'default', accentFill: 'ink' });
  expect(resolveDraft(draft)).toEqual(resolveDraft(presetDraft('neutral')));
  expect(parseDraft(serializeDraft(draft))).toEqual({ ok: true, draft });
  expect(resetDraft(draft)).toEqual(draft);
  for (const id of ['neutral', 'ultima'] as const) {
    const rows = gate(resolveDraft(presetDraft(id)));
    expect(rows).toHaveLength(49);
    for (const row of rows) for (const mode of ['dark', 'light'] as const) {
      expect(row[mode].ratio, `${id} ${mode} ${row.foreground}/${row.background}`).toBeGreaterThanOrEqual(row.minimum);
    }
  }
});

test('unknown recipe identities fail by name instead of falling back to the current recipe', () => {
  expect(() => resolveDraft({ ...stockDraft(), recipeVersion: 999 })).toThrow(UnsupportedRecipeError);
  for (const draft of [stockDraft(), ...fixtures.cases.map(({ draft }) => draft as ThemeDraft)]) {
    expect(parseDraft(JSON.stringify({ ...draft, recipeVersion: 999 }))).toMatchObject({ ok: false, reason: 'unknown-version' });
  }
  for (const version of [1, 2]) {
    expect(parseDraft(JSON.stringify({ ...stockDraft(), version }))).toMatchObject({ ok: false, reason: 'unknown-version' });
  }
});

test('the Python Neutral reference and generated installed sources match the base recipe', () => {
  const script = new URL('../../scripts/palette.py', import.meta.url);
  execFileSync('python3', [script.pathname, '--check'], { encoding: 'utf8' });
  const draft = stockDraft();
  expect(reference.recipeVersion).toBe(BASE_RECIPE_VERSION);
  expect(generateScales(draft.color, draft.recipeVersion)).toEqual(reference.palette);
  const resolved = resolveDraft(draft);
  for (const mode of ['dark', 'light'] as const) {
    const semantic = Object.fromEntries(Object.entries(reference.semantic[mode])
      .filter(([name]) => !name.endsWith('@step')).map(([name, value]) => [`--ult-color-${name}`, value]));
    expect(Object.fromEntries(Object.entries(resolved[mode]).filter(([name]) => name.startsWith('--ult-color-')))).toEqual(semantic);
  }
  for (const [path, expected] of baseTokenSources()) expect(readFileSync(path, 'utf8')).toBe(expected);
});
