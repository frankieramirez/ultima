import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MATRIX_BUNDLES, consumerReportProblems, matrixCases, type Bundle, type ConsumerReport } from './consumer-report.ts';

export const MATRIX_ISSUE_TITLE = 'Weekly installed-consumer matrix failed';

export type RetainedReport = { path: string; report: unknown; durations: Record<string, number> };
export type MatrixSummary = {
  status: 'passed' | 'failed' | 'incomplete';
  wholeMatrix: boolean;
  heads: string[];
  expected: number;
  executed: number;
  missing: string[];
  unexpected: string[];
  duplicated: string[];
  failed: { id: string; failures: string[] }[];
  knownGaps: NonNullable<ConsumerReport['knownGaps']>;
  invalid: { path: string; problems: string[] }[];
  jobs: { name: string; result: string }[];
  durations: Partial<Record<Bundle, { cells: number; maxMs: number; totalMs: number }>>;
};

/**
 * The cross-engine matrix on one revision. Every retained bundles and elements report must be valid and name
 * the same head; a complete run must execute exactly the registered cells. A failed or cancelled job, a failed
 * cell or a report problem fails the matrix; a missing cell or a second revision leaves it incomplete.
 */
export function matrixSummary(retained: RetainedReport[], wholeMatrix: boolean, jobs: { name: string; result: string }[] = []): MatrixSummary {
  const expected = matrixCases();
  const executed: string[] = [];
  const heads = new Set<string>();
  const summary: MatrixSummary = { status: 'passed', wholeMatrix, heads: [], expected: expected.length, executed: 0, missing: [], unexpected: [], duplicated: [], failed: [], knownGaps: [], invalid: [], jobs: jobs.filter((job) => job.result !== 'success' && job.result !== 'skipped'), durations: {} };
  for (const { path, report, durations } of retained) {
    const value = report as ConsumerReport;
    const problems = consumerReportProblems(value);
    if (problems.length) summary.invalid.push({ path, problems });
    heads.add(String(value?.source?.head));
    if (Array.isArray(value?.knownGaps)) summary.knownGaps.push(...value.knownGaps);
    for (const row of Array.isArray(value?.cases) ? value.cases : []) {
      executed.push(row.id);
      if (row.status !== 'passed') summary.failed.push({ id: row.id, failures: row.failures });
      const bundle = MATRIX_BUNDLES.find((candidate) => row.id.split('/').at(-1)?.startsWith(`${candidate}-`));
      const duration = durations[row.id];
      if (bundle && typeof duration === 'number') {
        const entry = summary.durations[bundle] ??= { cells: 0, maxMs: 0, totalMs: 0 };
        entry.cells += 1;
        entry.maxMs = Math.max(entry.maxMs, duration);
        entry.totalMs += duration;
      }
    }
  }
  summary.heads = [...heads].sort();
  summary.executed = executed.length;
  summary.duplicated = [...new Set(executed.filter((id, index) => executed.indexOf(id) !== index))];
  summary.unexpected = executed.filter((id) => !expected.includes(id));
  summary.missing = wholeMatrix ? expected.filter((id) => !executed.includes(id)) : [];
  if (summary.failed.length || summary.invalid.length || summary.jobs.length) summary.status = 'failed';
  else if (!retained.length || summary.heads.length !== 1 || summary.missing.length || summary.unexpected.length || summary.duplicated.length) summary.status = 'incomplete';
  return summary;
}

export function matrixMarkdown(summary: MatrixSummary, run?: string): string {
  const list = (title: string, rows: string[]) => rows.length ? [`### ${title}`, '', ...rows.map((row) => `- ${row}`), ''] : [];
  return [
    `## Installed-consumer matrix: ${summary.status}`, '',
    ...(run ? [`Run: ${run}`, ''] : []),
    `Revision: ${summary.heads.map((head) => `\`${head}\``).join(', ') || 'none'}. Executed ${summary.executed} of ${summary.expected} registered cells${summary.wholeMatrix ? '' : ' (a pull request runs the cells its change plan selects)'}.`, '',
    ...list('Failed jobs', summary.jobs.map((job) => `${job.name}: ${job.result}`)),
    ...list('Failed cells', summary.failed.map((row) => `\`${row.id}\`: ${row.failures.join('; ')}`)),
    ...list('Known gaps', summary.knownGaps.map((gap) => `\`${gap.id}\` ${gap.assertion}: ${gap.component}${gap.issue ? ` (${gap.issue})` : ''}`)),
    ...list('Invalid reports', summary.invalid.map((row) => `\`${row.path}\`: ${row.problems.join('; ')}`)),
    ...list('Missing cells', summary.missing.map((id) => `\`${id}\``)),
    ...list('Unregistered or duplicated cells', [...summary.unexpected, ...summary.duplicated].map((id) => `\`${id}\``)),
    '### Cell durations', '',
    '| Bundle | Cells | Slowest | Total |', '| --- | --- | --- | --- |',
    ...Object.entries(summary.durations).map(([bundle, entry]) => `| ${bundle} | ${entry.cells} | ${(entry.maxMs / 1000).toFixed(1)}s | ${(entry.totalMs / 1000).toFixed(1)}s |`),
    '',
  ].join('\n');
}

/** Every retained bundles and elements `report.json` under `folder`, with each cell's duration from its snapshot. */
export function retainedReports(folder: string): RetainedReport[] {
  const found: RetainedReport[] = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name === 'report.json') {
        const report = JSON.parse(readFileSync(path, 'utf8')) as ConsumerReport;
        if (report.exercise !== 'bundles' && report.exercise !== 'elements') continue;
        const durations: Record<string, number> = {};
        for (const row of Array.isArray(report.cases) ? report.cases : []) {
          const snapshot = join(dirname(path), row.snapshot);
          if (existsSync(snapshot)) durations[row.id] = (JSON.parse(readFileSync(snapshot, 'utf8')) as { durationMs?: number }).durationMs ?? NaN;
        }
        found.push({ path: relative(folder, path), report, durations });
      }
    }
  };
  if (existsSync(folder)) walk(folder);
  return found;
}

function gh(args: string[]): string {
  const result = spawnSync('gh', args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`gh ${args.join(' ')} exited ${result.status}: ${result.stderr}`);
  return result.stdout;
}

/** Opens the tracked issue for a failed scheduled run, or comments on the open one. */
export function fileIssue(summaryPath: string): string {
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) throw new Error('GITHUB_REPOSITORY names the repository the issue belongs to');
  const run = `${process.env.GITHUB_SERVER_URL ?? 'https://github.com'}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID ?? ''}`;
  const summary = existsSync(summaryPath) ? readFileSync(summaryPath, 'utf8') : `## Installed-consumer matrix: incomplete\n\nThe matrix job wrote no summary; read the run's logs and artifacts.\n`;
  const body = join(dirname(resolve(summaryPath)), 'issue.md');
  writeFileSync(body, `The scheduled full run failed: ${run}\n\nA scheduled failure is a support gap under docs/spec/consumer-support.md#cadence-cost-and-manual-proof until a passing run closes it.\n\n${summary}`);
  const open = JSON.parse(gh(['issue', 'list', '--repo', repository, '--state', 'open', '--search', `in:title "${MATRIX_ISSUE_TITLE}"`, '--json', 'number,title'])) as { number: number; title: string }[];
  const existing = open.find((issue) => issue.title === MATRIX_ISSUE_TITLE);
  return existing ? gh(['issue', 'comment', String(existing.number), '--repo', repository, '--body-file', body]) : gh(['issue', 'create', '--repo', repository, '--title', MATRIX_ISSUE_TITLE, '--body-file', body]);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args[0] === '--file-issue' && args[1]) console.log(fileIssue(args[1]).trim());
  else if (args[0] && args[1] === '--summary' && args[2]) {
    const wholeMatrix = process.env.GITHUB_EVENT_NAME !== 'pull_request';
    const needs = JSON.parse(process.env.NEEDS ?? '{}') as Record<string, { result: string }>;
    const summary = matrixSummary(retainedReports(resolve(args[0])), wholeMatrix, Object.entries(needs).map(([name, job]) => ({ name, result: job.result })));
    const run = process.env.GITHUB_RUN_ID && process.env.GITHUB_REPOSITORY ? `${process.env.GITHUB_SERVER_URL ?? 'https://github.com'}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : undefined;
    const markdown = matrixMarkdown(summary, run);
    writeFileSync(resolve(args[2]), markdown);
    writeFileSync(join(dirname(resolve(args[2])), 'matrix.json'), `${JSON.stringify(summary, null, 2)}\n`);
    if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, markdown, { flag: 'a' });
    console.log(markdown);
    process.exitCode = summary.status === 'passed' ? 0 : summary.status === 'failed' ? 1 : 2;
  } else throw new Error('usage: consumer-matrix.ts <reports> --summary <file> | --file-issue <summary>');
}
