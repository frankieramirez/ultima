// Output and exits: docs/spec/ultima.md, Consumer CLI, Package and engine.
// The shape follows the contributor checker's (docs/spec/agent-infrastructure.md, Diagnostics).

export type Position = { line: number; column: number };

export type Diagnostic = {
  ruleId: string;
  severity: 'blocking' | 'advisory' | 'incomplete';
  file: string;
  start?: Position;
  end?: Position;
  message: string;
  repair: string;
  link: string;
};

export type Run = { usage: string } | { diagnostics: Diagnostic[] };

export function exitCode(run: Run): 0 | 1 | 2 | 3 {
  if ('usage' in run) return 2;
  if (run.diagnostics.some((diagnostic) => diagnostic.severity === 'blocking')) return 1;
  if (run.diagnostics.some((diagnostic) => diagnostic.severity === 'incomplete')) return 3;
  return 0;
}

/** A check the run lists rather than passes: unverifiable by design, or not yet implemented. */
export type Unsupported = { step: string; reason: string };

export type Report = { command: string; diagnostics: Diagnostic[]; unsupported?: Unsupported[] } & Record<string, unknown>;

export function print(report: Report, json: boolean): string {
  const diagnostics = [...report.diagnostics].sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      (a.start?.line ?? 0) - (b.start?.line ?? 0) ||
      (a.start?.column ?? 0) - (b.start?.column ?? 0) ||
      a.ruleId.localeCompare(b.ruleId),
  );
  if (json) return `${JSON.stringify({ ...report, diagnostics }, null, 2)}\n`;

  const { command, diagnostics: _, unsupported = [], ...facts } = report;
  const lines = [
    `ultima ${command}`,
    ...Object.entries(facts).map(([key, value]) => `${key[0]?.toUpperCase()}${key.slice(1)}: ${value ?? 'none'}`),
  ];
  for (const diagnostic of diagnostics) {
    const at = diagnostic.start ? `:${diagnostic.start.line}:${diagnostic.start.column}` : '';
    lines.push(
      '',
      `${diagnostic.file}${at}  ${diagnostic.severity}  ${diagnostic.ruleId}`,
      `  ${diagnostic.message}`,
      `  Repair: ${diagnostic.repair}`,
      `  Spec: ${diagnostic.link}`,
    );
  }
  if (unsupported.length > 0) {
    lines.push('', 'Unsupported analysis:');
    for (const { step, reason } of unsupported) lines.push(`  ${step}`, `    ${reason}`);
  }
  const count = (severity: Diagnostic['severity']) =>
    diagnostics.filter((diagnostic) => diagnostic.severity === severity).length;
  lines.push(
    '',
    diagnostics.length === 0
      ? 'No findings.'
      : `${count('blocking')} blocking, ${count('incomplete')} incomplete, ${count('advisory')} advisory.`,
  );
  return `${lines.join('\n')}\n`;
}
