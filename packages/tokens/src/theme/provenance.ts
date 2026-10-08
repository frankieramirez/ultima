import { CANONICAL_SERIALIZATION_VERSION, canonicalJson, contentDigest, draftDigest } from './codec.ts';
import { THEME_PRESETS, presetRevision, type ResolvedDraft, type ThemeDraft, type ThemePresetOrigin } from './draft.ts';

export const EXPORTER_VERSION = 1;
export const DESIGN_DOCUMENT_VERSION = 1;
export const GENERATED_START = '<!-- ultima-theme:generated:start v1 -->';
export const GENERATED_END = '<!-- ultima-theme:generated:end -->';

type BaseProvenance = {
  version: 1;
  exporterVersion: number;
  documentVersion: 1;
  serializationVersion: 1;
};
export type ThemeProvenance = BaseProvenance & (
  | { sourceKind: 'studio-draft'; draftVersion: number; recipeVersion: number; preset: ThemePresetOrigin | null; draftDigest: string }
  | { sourceKind: 'compiled-default'; resolvedDigest: string }
);
export type ProvenanceResult =
  | { status: 'linked'; provenance: ThemeProvenance }
  | { status: 'unlinked' }
  | { status: 'unresolved'; reason: string };

const DIGEST = /^[a-f0-9]{64}$/;
const HEADER = /(?:\/\*|<!--) ultima-theme:provenance v(\d+) ([^\r\n]*?) (?:\*\/|-->)/g;
const CONTENT_DIGEST = /<!-- ultima-theme:content-digest sha256:([a-f0-9]{64}) -->\n/g;
const base = { version: 1, exporterVersion: EXPORTER_VERSION, documentVersion: DESIGN_DOCUMENT_VERSION, serializationVersion: CANONICAL_SERIALIZATION_VERSION } as const;

export function draftProvenance(draft: ThemeDraft): ThemeProvenance {
  return { ...base, sourceKind: 'studio-draft', draftVersion: draft.version, recipeVersion: draft.recipeVersion, preset: draft.preset ?? null, draftDigest: draftDigest(draft) };
}

export function defaultProvenance(tables: ResolvedDraft): ThemeProvenance {
  return { ...base, sourceKind: 'compiled-default', resolvedDigest: contentDigest(canonicalJson(tables)) };
}

export function provenanceComment(provenance: ThemeProvenance, format: 'code' | 'markdown' = 'code'): string {
  const value = `ultima-theme:provenance v1 ${canonicalJson(provenance)}`;
  return format === 'code' ? `/* ${value} */` : `<!-- ${value} -->`;
}

export function parseProvenance(source: string): ProvenanceResult {
  const matches = [...source.matchAll(HEADER)];
  const markers = source.match(/(?:\/\*|<!--)\s+ultima-theme:provenance/g) ?? [];
  if (matches.length === 0) return markers.length
    ? { status: 'unresolved', reason: 'Malformed provenance comment.' } : { status: 'unlinked' };
  if (matches.length !== 1 || matches[0]![1] !== '1' || markers.length !== 1) return { status: 'unresolved', reason: 'Unsupported or duplicate provenance.' };
  const comment = matches[0]![0];
  if (comment.startsWith('/*') !== comment.endsWith('*/')) return { status: 'unresolved', reason: 'Malformed provenance comment delimiters.' };
  let raw: unknown;
  try { raw = JSON.parse(matches[0]![2]!); } catch { return { status: 'unresolved', reason: 'Malformed provenance JSON.' }; }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { status: 'unresolved', reason: 'Malformed provenance.' };
  const p = raw as Record<string, unknown>;
  if (p.version !== 1 || p.exporterVersion !== EXPORTER_VERSION || p.documentVersion !== DESIGN_DOCUMENT_VERSION || p.serializationVersion !== CANONICAL_SERIALIZATION_VERSION) {
    return { status: 'unresolved', reason: 'Unsupported provenance versions.' };
  }
  if (p.sourceKind === 'compiled-default' && typeof p.resolvedDigest === 'string' && DIGEST.test(p.resolvedDigest)
    && !['draftDigest', 'draftVersion', 'recipeVersion', 'preset'].some((key) => key in p)) {
    return { status: 'linked', provenance: p as ThemeProvenance };
  }
  if (p.sourceKind === 'studio-draft' && [1, 2, 3].includes(p.draftVersion as number)
    && (p.draftVersion === 1 ? p.recipeVersion === 1 : p.draftVersion === 2 ? p.recipeVersion === 2 : [2, 3].includes(p.recipeVersion as number))
    && typeof p.draftDigest === 'string' && DIGEST.test(p.draftDigest) && !('resolvedDigest' in p)) {
    const preset = p.preset as ThemePresetOrigin | null;
    if (preset === null || (typeof preset === 'object' && !Array.isArray(preset) && p.draftVersion !== 1
      && THEME_PRESETS.some(({ id }) => id === preset.id) && preset.revision === presetRevision(p.draftVersion as 2 | 3))) {
      return { status: 'linked', provenance: p as ThemeProvenance };
    }
  }
  return { status: 'unresolved', reason: 'Malformed or unsupported source identity.' };
}

export function withoutProvenance(source: string): string {
  return source.replace(new RegExp(`${HEADER.source}\\n?`, 'g'), '');
}

export type GeneratedRegionResult =
  | { status: 'unmarked' }
  | { status: 'unresolved'; reason: string }
  | { status: 'intact' | 'edited'; start: number; end: number; content: string; recordedDigest: string; actualDigest: string };

export function generatedRegion(content: string): string {
  const digest = contentDigest(`\n${content}`);
  return `${GENERATED_START}\n<!-- ultima-theme:content-digest sha256:${digest} -->\n${content}${GENERATED_END}`;
}

export function parseGeneratedRegion(source: string): GeneratedRegionResult {
  const markers = source.match(/<!--\s+ultima-theme:generated:/g) ?? [];
  if (!markers.length) return { status: 'unmarked' };
  const start = source.indexOf(GENERATED_START);
  const end = source.indexOf(GENERATED_END);
  if (start < 0 || end < start || source.indexOf(GENERATED_START, start + 1) >= 0 || source.indexOf(GENERATED_END, end + 1) >= 0
    || markers.length !== 2) {
    return { status: 'unresolved', reason: 'Malformed, duplicate or unsupported generated region.' };
  }
  const region = source.slice(start + GENERATED_START.length, end);
  const digests = [...region.matchAll(CONTENT_DIGEST)];
  if (digests.length !== 1 || (region.match(/ultima-theme:content-digest/g) ?? []).length !== 1) {
    return { status: 'unresolved', reason: 'Missing or malformed generated-content digest.' };
  }
  const content = region.replace(CONTENT_DIGEST, '');
  const recordedDigest = digests[0]![1]!;
  const actualDigest = contentDigest(content);
  return { status: recordedDigest === actualDigest ? 'intact' : 'edited', start, end: end + GENERATED_END.length, content, recordedDigest, actualDigest };
}

export function refreshDesignRegion(existing: string, replacement: string):
  | { ok: true; content: string }
  | { ok: false; reason: string } {
  const current = parseGeneratedRegion(existing);
  const next = parseGeneratedRegion(replacement);
  if (current.status !== 'intact' || next.status !== 'intact') {
    return { ok: false, reason: 'Refresh requires intact, supported regions; legacy prose and consumer edits require a reviewed patch.' };
  }
  if (parseProvenance(current.content).status !== 'linked' || parseProvenance(next.content).status !== 'linked') {
    return { ok: false, reason: 'Unknown or malformed sources require a reviewed patch.' };
  }
  return { ok: true, content: existing.slice(0, current.start) + replacement.slice(next.start, next.end) + existing.slice(current.end) };
}
