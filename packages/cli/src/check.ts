// docs/spec/ultima.md, Consumer CLI, Check. The CLI carries no rules: it builds the consumer scope and
// runs `@ultima/analysis` over it with the catalogue bundled at build, so it never fetches.
import { type ConsumerReport, checkConsumer } from '@ultima/analysis/consumer';

import type { Diagnostic } from './diagnostic.ts';
import { consumerScope } from './scope.ts';

export type CheckReport = ConsumerReport;

export function check(
  root: string,
  options: { project?: string; files?: string[]; strict?: boolean },
): CheckReport | { diagnostics: Diagnostic[] } {
  const scope = consumerScope(root, options);
  if ('incomplete' in scope) {
    const { incomplete } = scope;
    // A missing or unreadable components.json is a setup failure, which doctor checks and explains.
    if (incomplete.ruleId !== 'ULT-SCOPE-001') return { diagnostics: [incomplete] };
    return { diagnostics: [{ ...incomplete, repair: 'Run `npx ultima-design doctor`; it names the setup step that writes components.json.' }] };
  }
  const report = checkConsumer(scope, { strict: options.strict ?? false });
  const skipped = scope.skipped.map(({ path, reason }) => ({ step: `Skipped: ${path}`, reason: `Named by --files, and ${reason}.` }));
  return { ...report, unsupported: [...skipped, ...report.unsupported] };
}

/** 0 clean or advisory only, 1 a blocking finding (or an advisory under `--strict`), 3 an incomplete run. */
export function checkExit(report: CheckReport): 0 | 1 | 3 {
  if (report.counts.errors > 0) return 1;
  if (report.counts.incomplete > 0) return 3;
  return 0;
}

export function printCheck(report: CheckReport): string {
  const lines = ['ultima check', `Scope: ${report.scopes.map(({ kind, files }) => `${kind} ${files}`).join(', ') || 'no files'}`];
  lines.push(`Rules: ${report.rules.map(({ id, status }) => `${id} (${status})`).join(', ')}`);
  for (const diagnostic of report.diagnostics) {
    const { start, end } = diagnostic;
    const where = [diagnostic.symbol, diagnostic.target, diagnostic.selector].filter((part) => part !== undefined).join(' ');
    lines.push(
      '',
      `${diagnostic.file}:${start.line}:${start.column}-${end.line}:${end.column}  ${diagnostic.severity}  ${diagnostic.ruleId}${where ? `  ${where}` : ''}`,
      `  ${diagnostic.message}`,
      `  Repair: ${diagnostic.repair}`,
      `  Docs: ${diagnostic.link}`,
    );
  }
  if (report.unsupported.length > 0) {
    lines.push('', 'Unsupported analysis:');
    for (const { step, reason } of report.unsupported) lines.push(`  ${step}`, `    ${reason}`);
  }
  const { errors, advisories, incomplete, suppressions } = report.counts;
  lines.push(
    '',
    `${errors} ${errors === 1 ? 'error' : 'errors'}, ${advisories} ${advisories === 1 ? 'advisory' : 'advisories'}, ${incomplete} incomplete, ${suppressions} suppressed.`,
  );
  return `${lines.join('\n')}\n`;
}
