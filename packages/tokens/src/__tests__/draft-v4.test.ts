import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

import { decodeFragment, encodeFragment, parseDraft, serializeDraft } from '../theme/codec.ts';
import { presetDraft, resetDraft, resolveDraft, shapePresets, stockDraft, THEME_DRAFT_VERSION, THEME_PRESETS, type ThemeDraft } from '../theme/draft.ts';
import { toCss, toStylex } from '../theme/export.ts';
import { gate } from '../theme/gate.ts';
import { draftProvenance, parseProvenance, provenanceComment, withoutProvenance } from '../theme/provenance.ts';
import { generateScales, type ScaleName } from '../theme/recipe.ts';
import v3 from './fixtures/base-theme-v3-drafts.json';

const MODES = ['dark', 'light'] as const;
const ROLES = { accent: 'arcane', highlight: 'mana', success: 'verdant', warning: 'ember', danger: 'ruin' } as const;
const NEW_COLORS = [
  '--ult-color-field',
  '--ult-color-border-hover',
  '--ult-color-text-disabled',
  ...Object.keys(ROLES).flatMap((role) => [`--ult-color-${role}-subtle-hover`, `--ult-color-${role}-subtle-active`]),
];
const hash = (source: string) => createHash('sha256').update(source).digest('hex');

function steps(draft: ThemeDraft) {
  const scales = generateScales(draft.color, draft.recipeVersion, draft.preset?.id === 'ultima');
  return (scale: ScaleName, mode: 'dark' | 'light', n: number) => scales[scale][mode][n - 1];
}

/** A version-3 copy of a current draft: the same parameters on the revision-2 document. */
function asV3(draft: ThemeDraft): ThemeDraft {
  return { ...structuredClone(draft), version: 3, preset: draft.preset && { id: draft.preset.id, revision: 2 } };
}

test('the stock draft is version 4 on the 2/4/6/8/12 corners, and every shape gains xl', () => {
  expect(THEME_DRAFT_VERSION).toBe(4);
  const stock = resolveDraft(stockDraft());
  expect(['xs', 'sm', 'md', 'lg', 'xl', 'full'].map((size) => stock.dark[`--ult-radius-${size}`]))
    .toEqual(['2px', '4px', '6px', '8px', '12px', '9999px']);
  expect(shapePresets(4)).toEqual(['sharp', 'default', 'soft', 'round']);
  const shapes = { sharp: '0px 0px 0px 0px 0px', default: '2px 4px 6px 8px 12px', soft: '2px 4px 10px 12px 16px', round: '6px 10px 16px 24px 32px' };
  const legacyShapes = { sharp: '0px 0px 0px 0px', default: '1px 2px 4px 6px', soft: '2px 4px 10px 12px', round: '6px 10px 16px 24px' };
  for (const shape of shapePresets(4)) {
    const v4 = resolveDraft({ ...stockDraft(), shape });
    const v3Shape = resolveDraft({ ...asV3(stockDraft()), shape });
    for (const mode of MODES) {
      expect(['xs', 'sm', 'md', 'lg', 'xl'].map((size) => v4[mode][`--ult-radius-${size}`]).join(' '), shape).toBe(shapes[shape]);
      expect(['xs', 'sm', 'md', 'lg'].map((size) => v3Shape[mode][`--ult-radius-${size}`]).join(' '), shape).toBe(legacyShapes[shape]);
      expect(v3Shape[mode]).not.toHaveProperty('--ult-radius-xl');
    }
  }
});

test('light surface-raised is surface at version 4, while dark and every version-3 draft keep step 2', () => {
  for (const draft of [stockDraft(), ...THEME_PRESETS.map(({ id }) => presetDraft(id))]) {
    const m = steps(draft);
    const v4 = resolveDraft(draft);
    const legacy = resolveDraft(asV3(draft));
    expect(v4.light['--ult-color-surface-raised']).toBe(v4.light['--ult-color-surface']);
    expect(v4.light['--ult-color-surface-raised']).toBe(m('mithril', 'light', 1));
    expect(v4.dark['--ult-color-surface-raised']).toBe(m('mithril', 'dark', 2));
    expect(v4.light['--ult-color-surface-overlay']).toBe(`${m('mithril', 'light', 1)}cc`);
    expect(v4.dark['--ult-color-surface-overlay']).toBe(`${m('mithril', 'dark', 2)}b3`);
    for (const mode of MODES) expect(legacy[mode]['--ult-color-surface-raised']).toBe(m('mithril', mode, 2));
    expect(legacy.light['--ult-color-surface-overlay']).toBe(`${m('mithril', 'light', 2)}cc`);
  }
});

test('the new color tokens resolve to their steps in both modes, with Ink accents on the neutral scale', () => {
  for (const draft of [stockDraft(), ...THEME_PRESETS.map(({ id }) => presetDraft(id))]) {
    const name = draft.preset?.id ?? 'custom';
    const m = steps(draft);
    const tables = resolveDraft(draft);
    for (const mode of MODES) {
      const table = tables[mode];
      expect(table['--ult-color-field'], name).toBe(m('mithril', mode, mode === 'light' ? 1 : 2));
      expect(table['--ult-color-border-hover'], name).toBe(m('mithril', mode, 9));
      expect(table['--ult-color-text-disabled'], name).toBe(m('mithril', mode, 9));
      for (const [role, scale] of Object.entries(ROLES)) {
        const source = role === 'accent' && draft.accentFill === 'ink' ? 'mithril' : scale;
        expect(table[`--ult-color-${role}-subtle-hover`], `${name} ${role}`).toBe(m(source, mode, 4));
        expect(table[`--ult-color-${role}-subtle-active`], `${name} ${role}`).toBe(m(source, mode, 5));
        expect(table[`--ult-color-${role}-subtle`], `${name} ${role}`).toBe(m(source, mode, 3));
      }
    }
  }
  const ultima = presetDraft('ultima');
  const m = steps(ultima);
  const ink = resolveDraft({ ...ultima, accentFill: 'ink' });
  for (const mode of MODES) {
    expect(ink[mode]['--ult-color-accent-subtle-hover']).toBe(m('mithril', mode, 4));
    expect(ink[mode]['--ult-color-accent-subtle-active']).toBe(m('mithril', mode, 5));
    expect(m('mithril', mode, 4)).not.toBe(m('arcane', mode, 4));
  }
});

test('shadow-xs is one layer that scales with elevation and is none at 0', () => {
  const at = (elevation: number) => resolveDraft({ ...stockDraft(), elevation });
  expect([at(1).dark['--ult-shadow-xs'], at(1).light['--ult-shadow-xs']]).toEqual(['0 1px 2px rgba(0,0,0,.30)', '0 1px 2px rgba(0,0,0,.05)']);
  expect([at(2).dark['--ult-shadow-xs'], at(2).light['--ult-shadow-xs']]).toEqual(['0 1px 2px rgba(0,0,0,.60)', '0 1px 2px rgba(0,0,0,.10)']);
  expect([at(0).dark['--ult-shadow-xs'], at(0).light['--ult-shadow-xs']]).toEqual(['none', 'none']);
  expect(at(0).dark['--ult-shadow-sm']).toBe('none');
  for (const mode of MODES) expect(resolveDraft(asV3(stockDraft()))[mode]).not.toHaveProperty('--ult-shadow-xs');
  // The hand-written stock shadow group restates the stock draft's values.
  const source = readFileSync(new URL('../tokens.stylex.ts', import.meta.url), 'utf8');
  const stock = resolveDraft(stockDraft());
  for (const size of ['xs', 'sm', 'md', 'lg']) {
    const token = `--ult-shadow-${size}`;
    expect(source).toContain(`'${token}': {\n    default: '${stock.dark[token]}',\n    [LIGHT]: '${stock.light[token]}',\n  }`);
  }
});

test('border-hover is gated at 3:1 on surface and surface-raised, and a version-3 draft keeps its 49 pairings', () => {
  for (const draft of [stockDraft(), ...THEME_PRESETS.map(({ id }) => presetDraft(id))]) {
    const rows = gate(resolveDraft(draft)).filter((row) => row.foreground === '--ult-color-border-hover');
    expect(rows.map((row) => [row.background, row.minimum])).toEqual([
      ['--ult-color-surface', 3],
      ['--ult-color-surface-raised', 3],
    ]);
    for (const row of rows) expect(row.dark.pass && row.light.pass, `${draft.preset?.id} ${row.background}`).toBe(true);
  }
  const faint = stockDraft();
  faint.overrides.light['--ult-color-border-hover'] = resolveDraft(faint).light['--ult-color-border'];
  expect(gate(resolveDraft(faint)).filter((row) => !row.light.pass).map((row) => `${row.foreground} on ${row.background}`))
    .toEqual(['--ult-color-border-hover on --ult-color-surface', '--ult-color-border-hover on --ult-color-surface-raised']);
  expect(gate(resolveDraft(asV3(stockDraft())))).toHaveLength(49);
});

test('the codec opens version 4 documents and share links, and refuses version 5', async () => {
  const draft = presetDraft('grove');
  draft.overrides.light['--ult-color-field'] = '#fafafa';
  expect(parseDraft(serializeDraft(draft))).toEqual({ ok: true, draft });
  expect(await decodeFragment((await encodeFragment(draft)).fragment)).toEqual({ ok: true, draft });
  expect(parseDraft(serializeDraft(stockDraft()))).toEqual({ ok: true, draft: stockDraft() });
  expect(parseDraft(JSON.stringify({ ...stockDraft(), version: 5 }))).toMatchObject({ ok: false, reason: 'unknown-version' });
  expect(parseDraft(JSON.stringify({ ...draft, preset: { id: 'grove', revision: 2 } }))).toMatchObject({ ok: false, reason: 'unknown-version' });
  const { accentFill: _fill, ...missing } = draft;
  expect(parseDraft(JSON.stringify(missing))).toMatchObject({ ok: false, reason: 'malformed' });
  const legacy = presetDraft({ id: 'grove', revision: 2 });
  expect(legacy).toMatchObject({ version: 3, preset: { id: 'grove', revision: 2 }, accentFill: 'hue' });
  expect(parseDraft(serializeDraft(legacy))).toEqual({ ok: true, draft: legacy });
  expect(parseDraft(JSON.stringify({ ...legacy, preset: { id: 'grove', revision: 3 } }))).toMatchObject({ ok: false, reason: 'unknown-version' });
  const provenance = parseProvenance(provenanceComment(draftProvenance(draft)));
  expect(provenance).toMatchObject({ status: 'linked', provenance: { draftVersion: 4, preset: { id: 'grove', revision: 3 } } });
});

test('version-3 base drafts keep every resolved token and export, and reset within version 3', () => {
  for (const fixture of v3.cases) {
    const opened = parseDraft(JSON.stringify(fixture.draft));
    if (!opened.ok) throw new Error(opened.message);
    expect(opened.draft.version, fixture.name).toBe(3);
    const resolved = resolveDraft(opened.draft);
    expect(resolved, fixture.name).toEqual(fixture.resolved);
    for (const mode of MODES) for (const token of [...NEW_COLORS, '--ult-shadow-xs', '--ult-radius-xl']) {
      expect(resolved[mode], `${fixture.name} ${token}`).not.toHaveProperty(token);
    }
    expect(hash(serializeDraft(opened.draft)), fixture.name).toBe(fixture.exports.serialized);
    expect(hash(withoutProvenance(toCss(opened.draft))), fixture.name).toBe(fixture.exports.css);
    expect(hash(withoutProvenance(toStylex(opened.draft))), fixture.name).toBe(fixture.exports.stylex);
  }
  const base = parseDraft(JSON.stringify(v3.cases[0]!.draft));
  if (!base.ok) throw new Error(base.message);
  expect(resetDraft(base.draft)).toEqual(base.draft);
  expect(resetDraft(stockDraft())).toEqual(stockDraft());
});
