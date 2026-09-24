/**
 * The standalone `test:production` entry, per Local, PR and release policy under Production browser
 * verification in docs/spec/agent-infrastructure.md. It prepares nothing itself: the verification
 * lifecycle captures the checkout into `.scratch/verify/<run-id>/` (or a new `--output`), installs from
 * the snapshot's lockfile, and runs two checks of the release plan there, `docs-build` then
 * `production-scenarios`, with every registered production case. The report is the verification run's.
 *
 * It narrows the release plan to those two checks and runs `docs-build` through the package's own
 * `build` script, which carries the catalogue preflight and `registry:build` that the release DAG models
 * as separate prerequisites. A pass here covers the registered production cases for the captured
 * snapshot only; it is not a release result, and the production gate stays incomplete until every
 * required production group is registered (#463).
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_DEADLINE_SECONDS } from '../../../scripts/verification/checks.ts';
import { repositoryFiles } from '../../../scripts/verification/model.ts';
import { type Plan, ambiguous, plan, snapshot } from '../../../scripts/verification/plan.ts';
import { EXIT, type Report, type RunOptions, executeRun, formatReport, newRunId, runDirectory } from '../../../scripts/verification/run.ts';
import { docsBuildPreparation, productionAdapter } from './production-adapter.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export const USAGE = `usage: pnpm --filter @ultima/docs test:production [--json] [--output <dir>] [--timeout <seconds>]

Builds the docs in production mode inside an isolated verification run and executes every registered
production scenario case against that build, served from an owned loopback server, in the locked
Playwright Chromium (install it with \`pnpm --filter @ultima/docs exec playwright install chromium\`).
Needs pnpm, the npm store or network for the snapshot's install, Chromium and a loopback port.

  --json               the verification report as one JSON document on stdout
  --output <dir>       a new or empty evidence directory outside the checkout (default .scratch/verify/<run-id>/)
  --timeout <seconds>  the overall deadline (default ${DEFAULT_DEADLINE_SECONDS}s)

Exits 0 when every registered case passed, 1 on a proven failure, 2 on usage, 3 incomplete, 130/143
cancelled. The report is <run>/report.json; per-case images, traces and the server log are under
<run>/artifacts/production/. This is not a release result: only the pilot's production scenarios are
registered so far.`;

/** The release plan, narrowed to the production build and its scenarios. */
export function productionPlan(source: string): Plan | { failure: string } {
  const current = snapshot(repositoryFiles(source));
  const unreadable = ambiguous(current);
  if (unreadable.length > 0) return { failure: `the captured catalogue or feature map cannot be read: ${unreadable.map((d) => `${d.code} ${d.path}`).join('; ')}` };
  const release = plan({ mode: 'release', selectors: [], current });
  const build = release.checks.find((entry) => entry.id === 'docs-build');
  const production = release.checks.find((entry) => entry.id === 'production-scenarios');
  if (!build || !production) return { failure: 'the release plan has no docs-build or production-scenarios check' };
  if (production.cases.length === 0) return { failure: 'no production scenario case is registered, and zero cases cannot pass' };
  return {
    ...release,
    scope: 'scoped',
    fallbacks: [],
    checks: [
      {
        ...build,
        prerequisites: [],
        reasons: [
          'the standalone production command builds the docs through the package script, which runs the catalogue preflight and registry:build itself',
        ],
      },
      { ...production, reasons: [`every registered production case: ${production.cases.length}`] },
    ],
  };
}

class UsageError extends Error {}

function options(argv: string[]) {
  const parsed: { json: boolean; output?: string; timeout?: number; help: boolean } = { json: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index] as string;
    const value = () => {
      const next = argv[index + 1];
      if (next === undefined || next.startsWith('-')) throw new UsageError(`${argument} needs a value`);
      index += 1;
      return next;
    };
    if (argument === '--json') parsed.json = true;
    else if (argument === '--help' || argument === '-h') parsed.help = true;
    else if (argument === '--output') parsed.output = value();
    else if (argument === '--timeout') {
      const seconds = value();
      if (!/^[1-9][0-9]*$/.test(seconds)) throw new UsageError(`--timeout takes a positive whole number of seconds, not "${seconds}"`);
      parsed.timeout = Number(seconds);
    } else throw new UsageError(`unknown argument "${argument}"`);
  }
  return parsed;
}

export type StandaloneOptions = Partial<Pick<RunOptions, 'probes' | 'preparation' | 'graceMs' | 'runId' | 'adapters'>> & {
  root?: string;
  cwd?: string;
  signal?: AbortSignal;
  onProgress?: (line: string) => void;
};

/** Runs the standalone command; returns the exit and what it printed. */
export async function runStandalone(argv: string[], extra: StandaloneOptions = {}): Promise<{ exit: number; stdout: string; stderr: string; report?: Report }> {
  let parsed: ReturnType<typeof options>;
  try {
    parsed = options(argv);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    return { exit: EXIT.usage, stdout: '', stderr: `test:production: ${error.message}\n${USAGE}\n` };
  }
  if (parsed.help) return { exit: 0, stdout: `${USAGE}\n`, stderr: '' };
  const root = extra.root ?? ROOT;
  const runId = extra.runId ?? newRunId();
  const location = runDirectory(root, runId, parsed.output, extra.cwd ?? process.env.INIT_CWD ?? process.cwd());
  if ('usage' in location) return { exit: EXIT.usage, stdout: '', stderr: `test:production: ${location.usage}\n` };
  const report = await executeRun({
    root,
    directory: location.directory,
    runId,
    command: 'test:production',
    selectors: [],
    planFrom: productionPlan,
    adapters: extra.adapters ?? { 'docs-build': docsBuildPreparation, 'production-scenarios': productionAdapter },
    overallDeadlineSeconds: parsed.timeout ?? DEFAULT_DEADLINE_SECONDS,
    deadlineSource: parsed.timeout ? '--timeout' : 'default',
    signal: extra.signal,
    onProgress: extra.onProgress,
    probes: extra.probes,
    preparation: extra.preparation,
    graceMs: extra.graceMs,
  });
  const production = report.checks.find((entry) => entry.id === 'production-scenarios');
  const gate = `production gate: ${production?.executed.length ?? 0} of ${production?.expected.length ?? 0} registered case(s) reached a verdict; the full gate stays incomplete until every required production group is registered (#463).`;
  return { exit: report.exit ?? EXIT.incomplete, stdout: `${parsed.json ? JSON.stringify(report, null, 2) : `${formatReport(report)}\n${gate}`}\n`, stderr: '', report };
}

export async function standalone(argv: string[], signal: AbortSignal): Promise<number> {
  const { exit, stdout, stderr } = await runStandalone(argv, { signal, onProgress: (line) => process.stderr.write(`${line}\n`) });
  process.stdout.write(stdout);
  process.stderr.write(stderr);
  return exit;
}
