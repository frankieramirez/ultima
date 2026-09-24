// One full static run over a scope. docs/spec/agent-infrastructure.md, Engine and command.
import { type Diagnostic, type Report, SCHEMA_VERSION, compareDiagnostics, exitCode } from './diagnostic.ts';
import { applyExceptions } from './exceptions.ts';
import { ruleStatuses } from './rules.ts';
import { createContext } from './rules/context.ts';
import { checkImports } from './rules/imports.ts';
import { checkSource } from './rules/source.ts';
import { DOCS_KINDS, PRODUCTION_KINDS, type Scope } from './scope.ts';

export function check(scope: Scope): Report {
  const context = createContext(scope);
  // Every production and docs source is parsed up front, so a parse failure anywhere a blocking rule
  // reads makes the run incomplete even when no rule happens to reach the broken statement.
  for (const { path, kind } of scope.inventory) {
    if (PRODUCTION_KINDS.includes(kind) || DOCS_KINDS.includes(kind)) context.source(path);
  }
  checkSource(context);
  checkImports(context);

  const { diagnostics, excepted } = applyExceptions(scope, [...scope.problems, ...context.diagnostics]);
  const unique = new Map<string, Diagnostic>();
  for (const diagnostic of diagnostics) unique.set(JSON.stringify(diagnostic), diagnostic);
  const sorted = [...unique.values()].sort(compareDiagnostics);

  const count = (severity: Diagnostic['severity']) => sorted.filter((diagnostic) => diagnostic.severity === severity).length;
  const counts = { blocking: count('blocking'), advisory: count('advisory'), incomplete: count('incomplete'), excepted };
  const scopes = new Map<string, number>();
  for (const { kind } of scope.inventory) scopes.set(kind, (scopes.get(kind) ?? 0) + 1);
  const rules = ruleStatuses();
  const exit = exitCode({ counts });

  return {
    schemaVersion: SCHEMA_VERSION,
    command: 'check:architecture',
    status: exit === 0 ? 'clean' : exit === 1 ? 'violations' : 'incomplete',
    scopes: [...scopes].map(([kind, files]) => ({ kind, files })).sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0)),
    rules,
    unsupported: [
      ...rules
        .filter((rule) => rule.status === 'pending')
        .map((rule) => ({ step: rule.id, reason: `Not implemented in this run; ${rule.owner} delivers it. Its contract is unchecked.` })),
      {
        step: 'MDX page JSX',
        reason: 'Parsed with locations kept, and read for imports and scaffold markers; no active rule checks its elements yet.',
      },
      ...scope.excluded.map(({ path, reason }) => ({ step: `Excluded: ${path}`, reason: `${reason}; a structural scope, never read.` })),
    ],
    counts,
    diagnostics: sorted,
  };
}
