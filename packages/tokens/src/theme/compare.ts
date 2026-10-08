import { canonicalJson, parseDraft, serializeDraft } from './codec.ts';
import type { ThemeDraft } from './draft.ts';
import { toCss, toDesignMd, toRegistryItem, toStylex } from './export.ts';
import { draftProvenance, parseGeneratedRegion, parseProvenance, withoutProvenance, type ProvenanceResult } from './provenance.ts';

export type ThemeArtifact = { kind: 'css' | 'stylex' | 'registry' | 'design'; content: string };
export type ThemeComparison = {
  status: 'current' | 'stale' | 'modified' | 'unlinked' | 'unresolved';
  provenance: ProvenanceResult;
  contentMatches: boolean | null;
  region: 'intact' | 'edited' | 'unmarked' | 'unresolved' | null;
  reason?: string;
};

const EXPORTS = { css: toCss, stylex: toStylex, registry: toRegistryItem, design: toDesignMd };

function comparable(source: string): string {
  return withoutProvenance(source).replace(/(?:\/\*|<!--) Ultima theme studio v\d+ · draft v\d+ · fingerprint [^\r\n]*? (?:\*\/|-->)\n?/, '').replace(/^\n+/, '');
}

function registryContent(source: string, includeDesign = true): { content: string; provenance: ProvenanceResult; hasDesign: boolean } {
  const item = JSON.parse(source);
  const metadata = item.meta?.ultimaTheme;
  const provenance = metadata === undefined ? { status: 'unlinked' } as const : parseProvenance(`/* ultima-theme:provenance v${metadata.version} ${JSON.stringify(metadata)} */`);
  const meta = { ...item.meta };
  delete meta.ultimaTheme;
  let nestedIdentityMatches = true;
  const hasDesign = item.files.some((file: Record<string, unknown>) => file.path === 'DESIGN.md');
  const files = item.files.filter((file: Record<string, unknown>) => includeDesign || file.path !== 'DESIGN.md').map((file: Record<string, unknown>) => {
    if (typeof file.content !== 'string') throw new Error('Registry file content is missing.');
    if (file.path === 'ultima-theme.json') {
      const parsed = parseDraft(file.content);
      if (!parsed.ok) throw new Error(parsed.message);
      return { ...file, content: canonicalJson(parsed.draft) };
    }
    const nested = parseProvenance(file.content);
    if (nested.status === 'unresolved') throw new Error(nested.reason);
    if (provenance.status === 'linked') nestedIdentityMatches &&= nested.status === 'linked'
      && canonicalJson(nested.provenance) === canonicalJson(provenance.provenance);
    if (file.path === 'DESIGN.md') {
      const region = parseGeneratedRegion(file.content);
      if (region.status === 'unresolved') throw new Error('Registry design region is malformed.');
      return { ...file, content: comparable(region.status !== 'unmarked' ? region.content : file.content), regionEdited: region.status === 'edited' };
    }
    return { ...file, content: comparable(file.content) };
  });
  const comparableItem = { ...item, description: '', files, nestedIdentityMatches };
  delete comparableItem.meta;
  if (Object.keys(meta).length) comparableItem.meta = meta;
  return { provenance, content: canonicalJson(comparableItem), hasDesign };
}

export function compare(draft: ThemeDraft, artifact: ThemeArtifact): ThemeComparison {
  let provenance: ProvenanceResult = { status: 'unlinked' };
  let region: ThemeComparison['region'] = null;
  try {
    const parsed = parseDraft(serializeDraft(draft));
    if (!parsed.ok) return { status: 'unresolved', provenance, contentMatches: null, region, reason: parsed.message };
    const expected = EXPORTS[artifact.kind](draft);
    let actualContent = artifact.content;
    let expectedContent = expected;
    if (artifact.kind === 'registry') {
      const actual = registryContent(actualContent);
      provenance = actual.provenance;
      actualContent = actual.content;
      expectedContent = registryContent(expectedContent, actual.provenance.status !== 'unlinked' || actual.hasDesign).content;
    } else {
      if (artifact.kind === 'design') {
        const actual = parseGeneratedRegion(actualContent);
        const generated = parseGeneratedRegion(expectedContent);
        region = actual.status;
        if (actual.status === 'unresolved') return { status: 'unresolved', provenance, contentMatches: null, region, reason: actual.reason };
        if (generated.status !== 'intact') throw new Error('Exporter produced an invalid region.');
        expectedContent = generated.content;
        if (actual.status !== 'unmarked') actualContent = actual.content;
      }
      provenance = parseProvenance(actualContent);
      actualContent = comparable(actualContent);
      expectedContent = comparable(expectedContent);
    }
    const contentMatches = actualContent === expectedContent && region !== 'edited';
    if (provenance.status === 'unresolved') return { status: 'unresolved', provenance, contentMatches, region, reason: provenance.reason };
    if (provenance.status === 'unlinked') return { status: 'unlinked', provenance, contentMatches, region };
    if (provenance.provenance.sourceKind !== 'studio-draft') return { status: 'unresolved', provenance, contentMatches, region, reason: 'Compiled defaults do not record a Studio draft identity.' };
    const sameSource = canonicalJson(provenance.provenance) === canonicalJson(draftProvenance(draft));
    return { status: !sameSource ? 'stale' : contentMatches ? 'current' : 'modified', provenance, contentMatches, region };
  } catch (error) {
    return { status: 'unresolved', provenance, contentMatches: null, region, reason: String(error) };
  }
}
