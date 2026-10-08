import { createHash, webcrypto } from 'node:crypto';
import { expect, test } from 'vitest';
import { canonicalDraft, canonicalJson, contentDigest, draftDigest, parseDraft } from '../theme/codec.ts';
import { compare } from '../theme/compare.ts';
import { presetDraft, resolveDraft, stockDraft } from '../theme/draft.ts';
import { toCss, toDefaultDesignMd, toDesignMd, toRegistryItem, toStylex } from '../theme/export.ts';
import { defaultProvenance, draftProvenance, generatedRegion, parseGeneratedRegion, parseProvenance, provenanceComment, refreshDesignRegion, withoutProvenance } from '../theme/provenance.ts';
import legacy from './fixtures/legacy-theme-drafts.json';
import presetV2 from './fixtures/preset-v2-theme-drafts.json';

const exports = { css: toCss, stylex: toStylex, registry: toRegistryItem, design: toDesignMd };

test('canonical v1 identity is full SHA-256 over UTF-8, independent of object insertion order and presentation', () => {
  expect(canonicalJson({ z: [2, 1], a: { z: 'é', a: true } })).toBe('{"a":{"a":true,"z":"é"},"z":[2,1]}');
  for (const value of ['', 'abc', 'é😀\r\n']) expect(contentDigest(value)).toBe(createHash('sha256').update(value).digest('hex'));
  const draft = stockDraft();
  const reverse = (value: unknown): unknown => typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).reverse().map(([key, child]) => [key, reverse(child)])) : value;
  expect(draftDigest(reverse(draft) as typeof draft)).toBe(draftDigest(draft));
  const parsed = parseDraft(JSON.stringify(draft, null, 4));
  if (!parsed.ok) throw new Error(parsed.message);
  expect(draftDigest(parsed.draft)).toBe(draftDigest(draft));
  expect(draftDigest(draft)).toBe(createHash('sha256').update(canonicalDraft(draft)).digest('hex'));
  const edited = structuredClone(draft);
  edited.locks.color = true;
  expect(resolveDraft(edited)).toEqual(resolveDraft(draft));
  expect(draftDigest(edited)).not.toBe(draftDigest(draft));
  edited.locks.color = false;
  edited.shuffleSeeds.global = 99;
  expect(draftDigest(edited)).not.toBe(draftDigest(draft));
});

test.each(Object.entries(exports))('%s exports record supported draft identity and are byte-identical on re-export', (kind, emit) => {
  for (const raw of [stockDraft(), presetDraft('grove'), ...legacy.cases.map((item) => item.draft), ...presetV2.cases.map((item) => item.draft)]) {
    const parsed = parseDraft(JSON.stringify(raw));
    if (!parsed.ok) throw new Error(parsed.message);
    const draft = parsed.draft;
    const output = emit(draft);
    expect(output).toBe(emit(draft));
    const provenance = kind === 'registry'
      ? parseProvenance(provenanceComment(JSON.parse(output).meta.ultimaTheme)) : parseProvenance(output);
    expect(provenance).toEqual({ status: 'linked', provenance: draftProvenance(draft) });
    expect(output).toContain(draftDigest(draft));
    expect(compare(draft, { kind: kind as keyof typeof exports, content: output })).toMatchObject({ status: 'current', contentMatches: true });
  }
});

test.each(['css', 'stylex', 'design', 'registry'] as const)('%s copied source headers cannot hide changed rendered values', (kind) => {
  const draft = stockDraft();
  const output = exports[kind](draft);
  const value = resolveDraft(draft).dark['--ult-color-accent']!;
  const edited = output.replace(value, '#123456');
  expect(edited).not.toBe(output);
  expect(compare(draft, { kind, content: edited }).status).not.toBe('current');
});

test('comparison detects a stale complete draft even when locks alone change and token content matches', () => {
  const draft = stockDraft();
  const css = toCss(draft);
  draft.locks.motion = true;
  expect(compare(draft, { kind: 'css', content: css })).toMatchObject({ status: 'stale', contentMatches: true });
});

test('generated content digest excludes only its own field and refresh retains outside prose byte-for-byte', () => {
  const draft = stockDraft();
  const generated = toDesignMd(draft);
  const prefix = '\ufeff# Product\r\n\r\nConsumer prose: é😀\t  \r\n';
  const suffix = '\r\n## Decisions\nKeep exactly these bytes.\r\n';
  const source = prefix + generated + suffix;
  expect(parseGeneratedRegion(source).status).toBe('intact');
  expect(compare(draft, { kind: 'design', content: source })).toMatchObject({ status: 'current', contentMatches: true });
  draft.typography.sans = 'Arial, sans-serif';
  const refresh = refreshDesignRegion(source, toDesignMd(draft));
  expect(refresh.ok).toBe(true);
  if (!refresh.ok) throw new Error(refresh.reason);
  expect(refresh.content).toBe(prefix + toDesignMd(draft) + suffix);
  expect(refreshDesignRegion(refresh.content, toDesignMd(draft))).toEqual(refresh);
  const region = parseGeneratedRegion(refresh.content);
  if (region.status !== 'intact') throw new Error('No intact region');
  expect(region.actualDigest).toBe(contentDigest(region.content));
  const edited = source.replace('## Typography', '## Custom typography');
  expect(parseGeneratedRegion(edited).status).toBe('edited');
  expect(refreshDesignRegion(edited, generated).ok).toBe(false);
  expect(parseGeneratedRegion(generated.replace(/sha256:[a-f0-9]{64}/, `sha256:${'0'.repeat(64)}`)).status).toBe('edited');
});

test('even recomputed region digest and copied provenance cannot establish content parity', () => {
  const draft = stockDraft();
  const region = parseGeneratedRegion(toDesignMd(draft));
  if (region.status !== 'intact') throw new Error('No region');
  const changed = generatedRegion(region.content.slice(1).replace('## Typography', '## Edited'));
  expect(parseGeneratedRegion(changed).status).toBe('intact');
  expect(compare(draft, { kind: 'design', content: changed })).toMatchObject({ status: 'modified', contentMatches: false });
});

test('legacy frozen exports remain unlinked and receive actual content comparison without migration', () => {
  for (const fixture of [...legacy.cases, ...presetV2.cases]) {
    const parsed = parseDraft(JSON.stringify(fixture.draft));
    if (!parsed.ok) throw new Error(parsed.message);
    for (const kind of ['css', 'stylex', 'registry'] as const) {
      expect(compare(parsed.draft, { kind, content: fixture[kind] })).toMatchObject({ status: 'unlinked', contentMatches: true });
      expect(compare(parsed.draft, { kind, content: fixture[kind].replace('#', '#00') }).status).not.toBe('current');
    }
  }
  expect(parseProvenance('legacy document')).toEqual({ status: 'unlinked' });
  expect(parseProvenance('font-family: "ultima-theme:provenance";')).toEqual({ status: 'unlinked' });
  expect(parseGeneratedRegion('font-family: ultima-theme:generated:;')).toEqual({ status: 'unmarked' });
  const region = parseGeneratedRegion(toDesignMd(stockDraft()));
  if (region.status !== 'intact') throw new Error('No region');
  const legacyDesign = region.content.slice(1).replace(/<!-- ultima-theme:provenance[^\n]+-->\n\n/, '');
  expect(compare(stockDraft(), { kind: 'design', content: legacyDesign })).toMatchObject({ status: 'unlinked', contentMatches: true, region: 'unmarked' });
  expect(refreshDesignRegion(legacyDesign, toDesignMd(stockDraft())).ok).toBe(false);
});

test('canonical identity rejects non-JSON values rather than silently collapsing them', () => {
  for (const value of [undefined, NaN, Infinity, new Date(), new Map(), [,], { invalid: undefined }]) {
    expect(() => canonicalJson(value)).toThrow('JSON values');
  }
});

test('provenance SHA-256 agrees with native Web Crypto for complete drafts and content across block boundaries', async () => {
  for (const content of [canonicalDraft(stockDraft()), canonicalDraft(presetDraft('grove')), ...[0, 55, 56, 63, 64, 65, 127, 128, 1024].map((length) => 'a'.repeat(length)), 'é😀\r\n']) {
    const digest = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
    expect(contentDigest(content)).toBe(Buffer.from(digest).toString('hex'));
    expect(contentDigest(content)).toBe(createHash('sha256').update(content).digest('hex'));
  }
});

test('linked registry requires matching provenance in each generated file', () => {
  const draft = stockDraft();
  const item = JSON.parse(toRegistryItem(draft));
  item.files[0].content = withoutProvenance(item.files[0].content);
  expect(compare(draft, { kind: 'registry', content: JSON.stringify(item) }).status).toBe('modified');
});

test('compiled default identity covers both complete tables and never claims a Studio draft', () => {
  const tables = resolveDraft(stockDraft());
  const output = toDefaultDesignMd(tables);
  expect(output).toBe(toDefaultDesignMd(tables));
  expect(parseProvenance(output)).toEqual({ status: 'linked', provenance: defaultProvenance(tables) });
  expect(output).not.toMatch(/draftDigest|draftVersion|recipeVersion|preset/);
  expect(parseGeneratedRegion(output).status).toBe('intact');
  const edited = structuredClone(tables);
  edited.light['--ult-space-1'] = '999px';
  expect(defaultProvenance(edited)).not.toEqual(defaultProvenance(tables));
  expect(compare(stockDraft(), { kind: 'design', content: output }).status).toBe('unresolved');
});

test('malformed, unknown and duplicate identities and regions remain unresolved without throwing', () => {
  for (const source of ['/* ultima-theme:provenance v1 {} */', '/* ultima-theme:provenance v99 {} */', '/* ultima-theme:provenance v1 nope */', '/* ultima-theme:provenance']) {
    expect(parseProvenance(source).status).toBe('unresolved');
    expect(compare(stockDraft(), { kind: 'css', content: source }).status).toBe('unresolved');
  }
  const p = draftProvenance(stockDraft());
  for (const invalid of [{ ...p, recipeVersion: 999 }, { ...p, preset: { id: 'grove', revision: 999 } }, { ...p, sourceKind: 'unknown' }, { ...p, documentVersion: 99 }]) {
    expect(parseProvenance(provenanceComment(invalid as typeof p)).status).toBe('unresolved');
  }
  expect(parseProvenance(provenanceComment(p) + provenanceComment(p)).status).toBe('unresolved');
  expect(parseProvenance(provenanceComment(p).replace('*/', '-->')).status).toBe('unresolved');
  expect(parseProvenance(`${provenanceComment(p)}\n/* ultima-theme:provenance v1 nope */`).status).toBe('unresolved');
  const doc = toDesignMd(stockDraft());
  expect(refreshDesignRegion(doc.replace('"exporterVersion":1', '"exporterVersion":9'), doc).ok).toBe(false);
  const region = parseGeneratedRegion(doc);
  if (region.status !== 'intact') throw new Error('No region');
  expect(refreshDesignRegion(generatedRegion(region.content.slice(1).replace('"exporterVersion":1', '"exporterVersion":9')), doc).ok).toBe(false);
  for (const malformed of [doc + doc, doc.replace('start v1', 'start v99'), doc.replace('generated:end', 'generated:missing')]) {
    expect(parseGeneratedRegion(malformed).status).toBe('unresolved');
    expect(refreshDesignRegion(malformed, doc).ok).toBe(false);
  }
});
