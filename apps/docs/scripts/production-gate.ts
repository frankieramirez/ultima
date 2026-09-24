/**
 * The CI gate over a `test:production` run, per Local, PR and release policy under Production browser
 * verification in docs/spec/agent-infrastructure.md: an absent required cell, a skip, an unavailable
 * prerequisite or a missing report prevents the required job from succeeding. The run's exit already
 * says most of that. This reads the report the run left behind and judges it again against the
 * checkout, so a runner that exits 0 without a report, or a report that planned fewer cells than the
 * checkout registers, cannot pass the job.
 *
 *   node --experimental-strip-types apps/docs/scripts/production-gate.ts <run-dir> [--head <sha>]
 *
 * Exits 0 when the report proves every registered case passed against `--head`, 1 otherwise, 2 on usage.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RUN_VERSION, type Report } from '../../../scripts/verification/run.ts';
import { productionPlan } from './test-production.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/** The checks a production run plans, in order; each must pass. */
const REQUIRED_CHECKS = ['docs-build', 'production-scenarios'] as const;

export type GateInput = { directory: string; root?: string; head?: string };

/** Every reason the run cannot pass the gate; empty means it passes. */
export function gateProblems({ directory, root = ROOT, head }: GateInput): string[] {
  const path = join(directory, 'report.json');
  if (!existsSync(path)) return [`${path} is absent: the run left no report, and a missing report cannot pass`];
  let report: Report;
  try {
    report = JSON.parse(readFileSync(path, 'utf8')) as Report;
  } catch (error) {
    return [`${path} is not JSON: ${error instanceof Error ? error.message : String(error)}`];
  }
  if (report?.kind !== 'verification-run' || report.schemaVersion !== RUN_VERSION) {
    return [`${path} is not a verification-run report of schema version ${RUN_VERSION}`];
  }

  const problems: string[] = [];
  if (report.command !== 'test:production') problems.push(`the report is from "${report.command}", not test:production`);
  if (report.status !== 'passed' || report.exit !== 0) problems.push(`the run ended ${report.status} with exit ${report.exit}: ${report.summary}`);
  if (report.cancellation) problems.push(`the run was cancelled by ${report.cancellation}`);
  for (const need of report.prerequisites ?? []) {
    if (need.status === 'missing') problems.push(`prerequisite ${need.need} was unavailable: ${need.detail}`);
  }
  if (report.cleanup?.survivors?.length || report.cleanup?.errors?.length) {
    problems.push(`cleanup left ${report.cleanup.survivors.length} process(es) and ${report.cleanup.errors.length} error(s)`);
  }

  const identity = report.source?.identity;
  if (head !== undefined && identity?.head !== head) problems.push(`the report tested ${identity?.head ?? 'no revision'}, not ${head}`);
  if (report.source?.completion?.status !== 'unchanged') problems.push('the checkout changed while the run held it, or its state is unknown');

  // The report lists every release check; the ones outside this command's scope are recorded as skipped.
  const selected = report.checks.filter((entry) => entry.selection.scope !== 'outside');
  const ids = selected.map((entry) => entry.id);
  if (ids.join() !== REQUIRED_CHECKS.join()) problems.push(`the run selected checks [${ids.join(', ')}], not [${REQUIRED_CHECKS.join(', ')}]`);
  for (const entry of selected) {
    if (entry.status !== 'passed') problems.push(`${entry.id} ${entry.status}: ${entry.reason}`);
    if (entry.skipped.length > 0) problems.push(`${entry.id} skipped ${entry.skipped.join(', ')}`);
    if (entry.missingEvidence.length > 0) problems.push(`${entry.id} is missing evidence: ${entry.missingEvidence.join(', ')}`);
    for (const evidence of entry.evidence) {
      const file = isAbsolute(evidence) ? evidence : join(directory, evidence);
      if (!existsSync(file)) problems.push(`${entry.id} names evidence that does not exist: ${evidence}`);
    }
  }

  const planned = productionPlan(root);
  if ('failure' in planned) return [...problems, `the checkout's production cases cannot be planned: ${planned.failure}`];
  const registered = planned.checks.find((entry) => entry.id === 'production-scenarios')?.cases ?? [];
  const production = report.checks.find((entry) => entry.id === 'production-scenarios');
  const expected = new Set(production?.expected ?? []);
  const executed = new Set(production?.executed ?? []);
  const unplanned = registered.filter((id) => !expected.has(id));
  const unexecuted = registered.filter((id) => !executed.has(id));
  if (registered.length === 0) problems.push('the checkout registers no production case, and zero cases cannot pass');
  if (unplanned.length > 0) problems.push(`the report did not plan ${unplanned.length} registered case(s): ${unplanned.join(', ')}`);
  if (unexecuted.length > 0) problems.push(`the report did not execute ${unexecuted.length} registered case(s): ${unexecuted.join(', ')}`);
  return problems;
}

export function main(argv: string[]): number {
  const usage = 'usage: production-gate.ts <run-dir> [--head <sha>]';
  const positional: string[] = [];
  let head: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index] as string;
    if (argument === '--head') {
      head = argv[index + 1];
      index += 1;
      if (!head) {
        process.stderr.write(`production-gate: --head needs a revision\n${usage}\n`);
        return 2;
      }
    } else if (argument.startsWith('-')) {
      process.stderr.write(`production-gate: unknown argument "${argument}"\n${usage}\n`);
      return 2;
    } else positional.push(argument);
  }
  if (positional.length !== 1) {
    process.stderr.write(`${usage}\n`);
    return 2;
  }
  const directory = resolve(positional[0] as string);
  const problems = gateProblems({ directory, head });
  if (problems.length > 0) {
    process.stderr.write(`production gate: FAILED\n${problems.map((problem) => `  - ${problem}`).join('\n')}\n`);
    return 1;
  }
  const report = JSON.parse(readFileSync(join(directory, 'report.json'), 'utf8')) as Report;
  const production = report.checks.find((entry) => entry.id === 'production-scenarios');
  process.stdout.write(
    `production gate: passed, ${production?.executed.length} of ${production?.expected.length} registered case(s) against ${report.source.identity?.head}\n`,
  );
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
