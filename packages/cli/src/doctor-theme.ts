import { readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import { canonicalJson, draftDigest, parseDraft } from '../../tokens/src/theme/codec.ts';
import type { ThemeDraft } from '../../tokens/src/theme/draft.ts';
import { compare } from '../../tokens/src/theme/compare.ts';
import { draftProvenance, parseProvenance, type ThemeProvenance } from '../../tokens/src/theme/provenance.ts';
import { type Diagnostic, SPEC } from './diagnostic.ts';
import type { Target } from './doctor.ts';
import { discoverThemes, type ActiveArtifact } from './theme-discovery.ts';
import { compareContent, compareDefaultDocument, localTokenTables, reducedMotionDifferences, type Difference } from './theme-content.ts';

export type ThemeRow = {
  family: 'theme'; boundary: string; artifact: 'css' | 'stylex' | 'draft' | 'design' | 'discovery';
  paths: { artifact: string | null; draft: string | null; imports: string[] };
  state: 'match' | 'mismatch' | 'unlinked' | 'incomplete';
  source: ThemeProvenance | null;
  coverage: { modes: string[]; groups: string[]; scopes: string[]; contentMatches: boolean | null; rendering: 'not-evaluated' };
  differences: Difference[]; reason: string; repair: string;
};
export type ThemeReport = { schemaVersion: 1; rows: ThemeRow[] };
const GROUPS = ['color', 'space', 'text', 'font', 'radius', 'shadow', 'filter', 'motion'];
const REPAIR = 'Preserve local edits and product intent. Compare the associated source in both modes; regenerate only the identified export or generated document region to a temporary destination and review the diff. Never migrate a draft implicitly.';
const LINK = `${SPEC}#discover-and-maintain-the-product-theme`;

export function doctorTheme(root: string, target: Target | null): { theme: ThemeReport; diagnostics: Diagnostic[] } {
  const discovery = discoverThemes(root, target);
  const rows: ThemeRow[] = [];
  const read = (path: string) => readFileSync(join(root, path), 'utf8');
  const draftFiles = discovery.files.filter((path) => path.endsWith('.json') && !/lock|package|tsconfig|components/.test(basename(path)));
  const parsed = new Map(draftFiles.map((path) => [path, parseDraft(read(path))]));
  const documents = discovery.files.filter((path) => path.endsWith('.md') && (basename(path) === 'DESIGN.md' || /ultima-theme:(?:provenance|generated)/.test(read(path))));
  const row = (boundary: string, artifact: ThemeRow['artifact'], path: string | null, imports: string[] = []): ThemeRow => ({
    family: 'theme', boundary, artifact, paths: { artifact: path, draft: null, imports }, state: 'unlinked', source: null,
    coverage: { modes: [], groups: [], scopes: [], contentMatches: null, rendering: 'not-evaluated' },
    differences: [], reason: 'No associated supported local draft; no draft freshness established.', repair: 'Continue using confirmed local source. Associate an editable draft or document only when the task calls for one; preserve the existing appearance.',
  });
  for (const problem of discovery.problems) {
    rows.push({ ...row(problem.boundary, 'discovery', problem.path), state: 'incomplete', reason: problem.reason,
      repair: 'Resolve the named static association or unsupported expression locally; preserve the active theme and verify production rendering separately.' });
  }
  const associate = (artifact: ActiveArtifact): { path?: string; draft?: ThemeDraft; reason?: string } => {
    const identity = parseProvenance(read(artifact.path));
    const digest = identity.status === 'linked' && identity.provenance.sourceKind === 'studio-draft' ? identity.provenance.draftDigest : null;
    const stem = artifact.path.replace(/(?:\.stylex)?\.[^.]+$/, '');
    const named = [`${stem}.json`, join(dirname(artifact.path), 'ultima-theme.json')].filter((path) => parsed.has(path));
    const byIdentity = digest
      ? [...parsed].filter(([, result]) => result.ok && draftDigest(result.draft) === digest).map(([path]) => path) : [];
    // A conventional companion records the association even after either file was edited.
    const candidates = [...new Set(named.length ? named : byIdentity)];
    if (candidates.length > 1) return { reason: `Ambiguous draft association: ${candidates.join(', ')}` };
    const path = candidates[0];
    if (!path) return {};
    const result = parsed.get(path)!;
    return result.ok ? { path, draft: result.draft } : { path, reason: result.message };
  };
  const visitedDocuments = new Set<string>();
  for (const artifact of discovery.artifacts) {
    const current = row(artifact.boundary, artifact.kind, artifact.path, artifact.imports);
    rows.push(current);
    const provenance = parseProvenance(read(artifact.path));
    if (provenance.status === 'unresolved') { current.state = 'incomplete'; current.reason = provenance.reason; continue; }
    if (provenance.status === 'linked') current.source = provenance.provenance;
    const associated = associate(artifact);
    current.paths.draft = associated.path ?? null;
    if (associated.reason) { current.state = 'incomplete'; current.reason = associated.reason; continue; }
    if (!associated.draft) {
      rows.push(row(artifact.boundary, 'draft', null, artifact.imports));
      if (!documents.length) rows.push(row(artifact.boundary, 'design', null, artifact.imports));
      continue;
    }
    const { draft } = associated;
    const source = draftProvenance(draft);
    const draftRow = row(artifact.boundary, 'draft', associated.path!, artifact.imports);
    Object.assign(draftRow, { state: 'match', source, reason: 'Supported local draft parsed without migration.' });
    draftRow.paths.draft = associated.path!;
    rows.push(draftRow);
    const checkArtifact = (record: ThemeRow, kind: 'css' | 'stylex' | 'design', content: string) => {
      record.paths.draft = associated.path!;
      record.source = source;
      const result = compareContent(draft, { kind, content });
      if (kind === 'stylex') {
        if (discovery.tokenSources.length !== 1) result.reason = 'StyleX inheritance needs exactly one supported locally installed token source.';
        else try {
          const changes = reducedMotionDifferences(read(discovery.tokenSources[0]!));
          result.differences.push(...changes);
          result.matches &&= changes.length === 0;
        } catch (error) { result.reason = String(error); }
      }
      const shared = compare(draft, { kind, content });
      record.coverage = { modes: ['dark', 'light', 'reduced-motion'], groups: GROUPS, scopes: result.scopes, contentMatches: result.reason ? null : result.matches, rendering: 'not-evaluated' };
      record.differences = result.differences;
      record.repair = REPAIR;
      if (shared.status === 'unresolved' || result.reason) {
        record.state = 'incomplete'; record.reason = shared.reason ?? result.reason!;
      } else if (shared.status === 'unlinked') {
        record.state = 'unlinked'; record.reason = result.matches ? 'Legacy artifact content agrees, but strong provenance is absent; no linked freshness established.' : 'Legacy artifact differs from its companion draft; no strong provenance. Preserve and reconcile the named content differences.';
      } else if (shared.status === 'stale' || !result.matches) {
        record.state = 'mismatch'; record.reason = shared.status === 'stale' ? 'Recorded source identity differs from the associated local draft.' : 'Actual artifact content differs from the associated local draft.';
        if (shared.status === 'stale') record.differences.unshift({ location: 'source identity', expected: canonicalJson(source), actual: canonicalJson(shared.provenance.status === 'linked' ? shared.provenance.provenance : null) });
      } else {
        record.state = 'match'; record.reason = 'Supported linked draft, complete emitted content and source identity agree. Static artifact coverage only; production rendering is not evaluated.';
      }
    };
    checkArtifact(current, artifact.kind, read(artifact.path));
    if (discovery.problems.some((problem) => problem.boundary === artifact.boundary)) {
      if (current.state === 'match') { current.state = 'incomplete'; current.reason = 'Artifact content agrees, but boundary discovery or cascade is incomplete; see the discovery rows.'; }
    }
    const ids = new Set([draftDigest(draft)]);
    if (provenance.status === 'linked' && provenance.provenance.sourceKind === 'studio-draft') ids.add(provenance.provenance.draftDigest);
    const byIdentity = documents.filter((path) => {
      const p = parseProvenance(read(path));
      return p.status === 'linked' && p.provenance.sourceKind === 'studio-draft' && ids.has(p.provenance.draftDigest);
    });
    const companion = join(dirname(associated.path!), 'DESIGN.md');
    const candidates = [...new Set([...byIdentity, ...(documents.includes(companion) ? [companion] : [])])];
    if (!candidates.length) rows.push(row(artifact.boundary, 'design', null, artifact.imports));
    else for (const path of candidates) {
      visitedDocuments.add(path);
      const document = row(artifact.boundary, 'design', path, artifact.imports);
      checkArtifact(document, 'design', read(path));
      rows.push(document);
    }
  }
  for (const path of documents.filter((path) => !visitedDocuments.has(path))) {
    const record = row('.', 'design', path);
    rows.push(record);
    const p = parseProvenance(read(path));
    if (p.status === 'unresolved') { record.state = 'incomplete'; record.reason = p.reason; }
    else if (p.status === 'linked' && p.provenance.sourceKind === 'compiled-default') {
      record.source = p.provenance;
      if (discovery.tokenSources.length !== 1) {
        record.state = 'incomplete'; record.reason = `Default document requires one locally installed token source; found ${discovery.tokenSources.length}.`;
      } else try {
        const local = discovery.tokenSources[0]!;
        record.paths.imports = [local];
        const result = compareDefaultDocument(localTokenTables(read(local)), read(path));
        record.coverage = { modes: ['dark', 'light'], groups: GROUPS, scopes: result.scopes, contentMatches: result.reason ? null : result.matches, rendering: 'not-evaluated' };
        record.differences = result.differences;
        record.state = result.reason ? 'incomplete' : result.matches ? 'unlinked' : 'mismatch';
        record.reason = result.reason ?? (result.matches ? 'Default document agrees with local installed tokens; it has no Studio draft.' : 'Default document differs from local installed tokens, not the CLI defaults.');
        record.repair = 'Preserve consumer prose. Refresh only the generated region from the locally installed token values after reviewing local intent.';
      } catch (error) { record.state = 'incomplete'; record.reason = String(error); }
    }
  }
  if (!discovery.artifacts.length) rows.push(row('.', 'discovery', null));
  const diagnostics = rows.filter((record) => record.state === 'mismatch' || record.state === 'incomplete').map((record): Diagnostic => ({
    ruleId: record.state === 'mismatch' ? 'ULT-THEME-001' : 'ULT-THEME-002', severity: record.state === 'mismatch' ? 'blocking' : 'incomplete',
    file: record.paths.artifact ?? record.boundary, message: `${record.boundary}: ${record.reason}`, repair: record.repair, link: LINK,
  }));
  return { theme: { schemaVersion: 1, rows }, diagnostics };
}

export function printTheme(theme: ThemeReport): string {
  return `\nTheme freshness (offline, read-only; rendering not evaluated):\n${theme.rows.map((row) => [
    `  ${row.state}  ${row.boundary}  ${row.artifact}  ${row.paths.artifact ?? '(missing optional artifact)'}`,
    `    Draft: ${row.paths.draft ?? 'unlinked'}; modes: ${row.coverage.modes.join(', ') || 'none'}; scope: ${row.coverage.scopes.join('; ') || 'unresolved'}`,
    `    ${row.reason}`, ...row.differences.map((difference) => `    ${difference.location}: expected ${difference.expected ?? '(absent)'}, actual ${difference.actual ?? '(absent)'}`),
    `    Repair: ${row.repair}`,
  ].join('\n')).join('\n')}\n`;
}
