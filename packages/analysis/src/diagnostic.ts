// Diagnostics, output and exits: docs/spec/agent-infrastructure.md, Engine and command and Diagnostics.

export const SCHEMA_VERSION = 1;

export type Position = { line: number; column: number };

/** `incomplete` is `ULT-ANALYSIS-001` and the run's own failures: the checker could not establish a contract. */
export type Severity = 'blocking' | 'advisory' | 'incomplete';

export type Diagnostic = {
  ruleId: string;
  severity: Severity;
  /** Repository-relative. */
  file: string;
  start: Position;
  end: Position;
  /** The top-level declaration, part or binding the finding sits in, when there is one. */
  symbol?: string;
  /** The import specifier, directive or call the finding is about. */
  target?: string;
  /** The failed condition. */
  message: string;
  repair: string;
  /** The owning specification section or ADR, as a repository-relative link. */
  link: string;
  /** The typed exception an `ULT-EXCEPTION-001` finding is about. */
  exception?: string;
};

export type RuleStatus = { id: string; status: 'blocking' | 'advisory' | 'pending'; scope: string; link: string; owner?: string };

/** Analysis the run did not perform, listed so that a clean run never implies it. */
export type Unsupported = { step: string; reason: string };

export type Report = {
  schemaVersion: typeof SCHEMA_VERSION;
  command: 'check:architecture';
  status: 'clean' | 'violations' | 'incomplete';
  scopes: { kind: string; files: number }[];
  rules: RuleStatus[];
  unsupported: Unsupported[];
  counts: { blocking: number; advisory: number; incomplete: number; excepted: number };
  diagnostics: Diagnostic[];
};

export function compareDiagnostics(a: Diagnostic, b: Diagnostic): number {
  return (
    (a.file < b.file ? -1 : a.file > b.file ? 1 : 0) ||
    a.start.line - b.start.line ||
    a.start.column - b.start.column ||
    (a.ruleId < b.ruleId ? -1 : a.ruleId > b.ruleId ? 1 : 0) ||
    (a.message < b.message ? -1 : a.message > b.message ? 1 : 0)
  );
}

/** 0 clean, 1 an established violation, 2 an incomplete run. A violation outranks incompleteness, which is still listed. */
export function exitCode(report: Pick<Report, 'counts'>): 0 | 1 | 2 {
  if (report.counts.blocking > 0) return 1;
  if (report.counts.incomplete > 0) return 2;
  return 0;
}

export function formatJson(report: Report): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function formatText(report: Report): string {
  const lines = [`check:architecture  ${report.status}`];
  lines.push(`Scopes: ${report.scopes.map(({ kind, files }) => `${kind} ${files}`).join(', ')}`);
  lines.push(
    `Rules: ${report.rules
      .filter((rule) => rule.status !== 'pending')
      .map((rule) => `${rule.id} (${rule.status})`)
      .join(', ')}`,
  );
  for (const diagnostic of report.diagnostics) {
    const { start, end } = diagnostic;
    const where = diagnostic.symbol ? `  ${diagnostic.symbol}` : '';
    lines.push(
      '',
      `${diagnostic.file}:${start.line}:${start.column}-${end.line}:${end.column}  ${diagnostic.severity}  ${diagnostic.ruleId}${where}`,
      `  ${diagnostic.message}`,
      `  Repair: ${diagnostic.repair}`,
      `  Spec: ${diagnostic.link}`,
    );
    if (diagnostic.exception) lines.push(`  Exception: ${diagnostic.exception}`);
  }
  if (report.unsupported.length > 0) {
    lines.push('', 'Unsupported analysis:');
    for (const { step, reason } of report.unsupported) lines.push(`  ${step}`, `    ${reason}`);
  }
  const { blocking, advisory, incomplete, excepted } = report.counts;
  lines.push(
    '',
    `${blocking} blocking, ${incomplete} incomplete, ${advisory} advisory, ${excepted} excepted.`,
    report.status === 'clean'
      ? 'The completed static checks found no violation in their declared scopes. This is not accessibility, performance, visual or interaction verification.'
      : report.status === 'violations'
        ? 'Architectural violations: fix each blocking finding at its location.'
        : 'Incomplete: the run could not establish every blocking contract.',
  );
  return `${lines.join('\n')}\n`;
}
