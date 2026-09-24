// One `check` run over a consumer scope: docs/spec/ultima.md, Consumer CLI, Check. The same parser,
// value grammar and diagnostic shape as the contributor run, the consumer rule family, and
// suppressions in place of typed exceptions.
import { type Diagnostic, type RuleStatus, type Unsupported, compareDiagnostics } from './diagnostic.ts';
import { APP_RULES, CHECK_SPEC, RULES } from './rules.ts';
import { type Skipped, checkApp } from './rules/app.ts';
import { createContext } from './rules/context.ts';
import { checkThemes } from './rules/theme.ts';
import type { Scope } from './scope.ts';

// The consumer CLI's entry: everything it needs to build a scope and run the consumer rules, and
// nothing of the workspace scope or the MDX pipeline, which it never loads.
export type { Diagnostic, RuleStatus, Unsupported } from './diagnostic.ts';
export { POLICY, STYLE_POLICY } from './policy.ts';
export type { Classified, InstalledItem, Resolution, Scope, SourceKind } from './scope.ts';

/** The rule IDs a consumer scope enables. No contributor family ever runs in a consumer's repository. */
export const CONSUMER_RULES = [
  'ULT-APP-CONTRAST-001',
  'ULT-APP-THEME-001',
  'ULT-APP-PALETTE-001',
  'ULT-APP-PAINT-001',
  'ULT-APP-PRIMITIVE-001',
  'ULT-APP-CONTROL-001',
  'ULT-APP-SUPPRESSION-001',
  'ULT-ANALYSIS-001',
] as const;

export type ConsumerReport = {
  command: 'check';
  status: 'clean' | 'violations' | 'incomplete';
  scopes: { kind: string; files: number }[];
  rules: RuleStatus[];
  unsupported: Unsupported[];
  /** `errors` are blocking findings, and advisories too under `--strict`. */
  counts: { errors: number; advisories: number; incomplete: number; suppressions: number };
  diagnostics: Diagnostic[];
};

const UNSUPPORTED: Record<string, string> = {
  'Tailwind and other class names': 'Class names are not analyzed, so their paint is neither a pass nor a finding.',
  'CSS modules': 'CSS modules are not analyzed, so their paint is neither a pass nor a finding.',
  'CSS-in-JS and class-name libraries': 'Styles written through another library are not analyzed, so they are neither a pass nor a finding.',
  'Computed inline styles': 'An inline style computed at run time cannot be read statically, so it is neither a pass nor a finding.',
  'Computed StyleX values': 'A paint value computed at run time cannot be read statically, so it is neither a pass nor a finding.',
};

export function checkConsumer(scope: Scope, { strict = false }: { strict?: boolean } = {}): ConsumerReport {
  const context = createContext(scope);
  const skipped: Skipped = new Map();
  checkApp(context, skipped);
  checkThemes(context);

  // A diagnostic's link is absolute in a consumer's output: a repository path means nothing there.
  const found = [...scope.problems, ...context.diagnostics].map((diagnostic) => (/^https?:/.test(diagnostic.link) ? diagnostic : { ...diagnostic, link: CHECK_SPEC }));
  const { diagnostics, suppressions } = applySuppressions(scope, found.filter((diagnostic) => !authorized(scope, diagnostic)));
  const unique = new Map<string, Diagnostic>();
  for (const diagnostic of diagnostics) unique.set(JSON.stringify(diagnostic), diagnostic);
  const sorted = [...unique.values()].sort(compareDiagnostics);

  const count = (severity: Diagnostic['severity']) => sorted.filter((diagnostic) => diagnostic.severity === severity).length;
  const advisories = count('advisory');
  const counts = { errors: count('blocking') + (strict ? advisories : 0), advisories, incomplete: count('incomplete'), suppressions };
  const scopes = new Map<string, number>();
  for (const { kind } of scope.inventory) scopes.set(kind, (scopes.get(kind) ?? 0) + 1);

  const unsupported: Unsupported[] = [];
  for (const [path, entries] of [...skipped].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    const byKind = new Map<string, number[]>();
    for (const { kind, line } of entries) byKind.set(kind, [...(byKind.get(kind) ?? []), line]);
    for (const [kind, lines] of byKind) {
      const unique = [...new Set(lines)].sort((a, b) => a - b);
      unsupported.push({ step: `${kind}: ${path}:${unique.join(',')}`, reason: UNSUPPORTED[kind] ?? 'Not analyzed.' });
    }
  }

  const enabled = new Set(scope.rules ?? CONSUMER_RULES);
  const rules = CONSUMER_RULES.filter((id) => enabled.has(id)).map((id): RuleStatus => {
    if (id === 'ULT-ANALYSIS-001') return { id, status: 'blocking', scope: 'Values and imports a rule needs; advisory against an advisory rule', link: CHECK_SPEC };
    return { id, ...APP_RULES[id] };
  });

  return {
    command: 'check',
    status: counts.errors > 0 ? 'violations' : counts.incomplete > 0 ? 'incomplete' : 'clean',
    scopes: [...scopes].map(([kind, files]) => ({ kind, files })).sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0)),
    rules,
    unsupported,
    counts,
    diagnostics: sorted,
  };
}

/** Whether an installed item's own typed exception, from Ultima's source, covers this finding. */
function authorized(scope: Scope, diagnostic: Diagnostic): boolean {
  const item = scope.itemOf(diagnostic.file);
  if (item === undefined) return false;
  const quotes = (text: string | undefined) => text?.replace(/"/g, "'");
  return (scope.authorized ?? []).some(
    (entry) =>
      entry.item === item &&
      entry.ruleId === diagnostic.ruleId &&
      entry.symbol === diagnostic.symbol &&
      entry.target === diagnostic.target &&
      entry.selector === diagnostic.selector &&
      (entry.expression === undefined || quotes(entry.expression) === quotes(diagnostic.expression)),
  );
}

// ---------------------------------------------------------------------------------------------
// Suppression: `// ultima-check-ignore <RULE-ID>: <reason>` on the line before a declaration.
// ---------------------------------------------------------------------------------------------

const IGNORE = /^(\s*)\/\/\s*ultima-check-ignore\b(.*)$/;
const BODY = /^\s+(ULT-[A-Z0-9]+(?:-[A-Z0-9]+)*)\s*:\s*(\S.*)$/;

/** Rules a suppression may name: the consumer's own findings, never an incomplete analysis or a bad suppression. */
function suppressible(id: string): boolean {
  return id in APP_RULES && id !== 'ULT-APP-SUPPRESSION-001';
}

type Suppression = { file: string; line: number; column: number; end: number; target: number; ruleId: string; used: boolean };

function applySuppressions(scope: Scope, diagnostics: Diagnostic[]): { diagnostics: Diagnostic[]; suppressions: number } {
  const suppressions: Suppression[] = [];
  const problems: Diagnostic[] = [];
  for (const { path, kind } of scope.inventory) {
    if (kind !== 'app') continue;
    const lines = (scope.files.read(path) ?? '').split(/\r?\n/);
    lines.forEach((text, index) => {
      const match = IGNORE.exec(text);
      if (!match) return;
      const column = (match[1] as string).length + 1;
      const at = { file: path, start: { line: index + 1, column }, end: { line: index + 1, column: text.length + 1 } };
      const body = BODY.exec(match[2] as string);
      const invalid = (message: string, repair: string) =>
        problems.push({ ruleId: 'ULT-APP-SUPPRESSION-001', severity: 'advisory', ...at, target: 'ultima-check-ignore', message, repair, link: CHECK_SPEC });
      if (!body) {
        const id = /^\s+(ULT-[A-Z0-9-]+)/.exec(match[2] as string)?.[1];
        invalid(
          id ? `The suppression of ${id} gives no reason, so it suppresses nothing.` : 'The suppression names no rule ID, so it suppresses nothing.',
          'Write `// ultima-check-ignore <RULE-ID>: <reason>`: both the rule ID and the reason are required.',
        );
        return;
      }
      const ruleId = body[1] as string;
      if (!suppressible(ruleId)) {
        invalid(
          ruleId in RULES || ruleId in APP_RULES ? `${ruleId} cannot be suppressed.` : `${ruleId} is not a rule check runs.`,
          `Name one of ${Object.keys(APP_RULES).filter(suppressible).join(', ')}, or fix what the finding reports.`,
        );
        return;
      }
      // Stacked suppressions all apply to the first line after them.
      let target = index + 1;
      while (target < lines.length && IGNORE.test(lines[target] as string)) target += 1;
      suppressions.push({ file: path, line: index + 1, column, end: text.length + 1, target: target + 1, ruleId, used: false });
    });
  }

  let suppressed = 0;
  const kept = diagnostics.filter((diagnostic) => {
    const matches = suppressions.filter((entry) => entry.file === diagnostic.file && entry.ruleId === diagnostic.ruleId && entry.target === diagnostic.start.line);
    for (const entry of matches) entry.used = true;
    if (matches.length > 0) suppressed += 1;
    return matches.length === 0;
  });
  for (const entry of suppressions) {
    if (entry.used) continue;
    kept.push({
      ruleId: 'ULT-APP-SUPPRESSION-001',
      severity: 'advisory',
      file: entry.file,
      start: { line: entry.line, column: entry.column },
      end: { line: entry.line, column: entry.end },
      target: 'ultima-check-ignore',
      message: `The suppression of ${entry.ruleId} matches no finding on the line after it.`,
      repair: 'Remove the suppression, or move it to the line before the declaration it is for.',
      link: CHECK_SPEC,
    });
  }
  return { diagnostics: [...kept, ...problems], suppressions: suppressed };
}
