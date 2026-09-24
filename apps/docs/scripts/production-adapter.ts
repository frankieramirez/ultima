/**
 * Verification adapters for the production docs, per Check composition under Verification CLI and
 * Runner and build identity under Production browser verification in docs/spec/agent-infrastructure.md.
 *
 * `productionAdapter` is the `production-scenarios` check. It requires the build manifest the same run's
 * `docs-build` check wrote, launches `production.ts internal` as an owned process in the snapshot (never
 * the standalone command), and turns that report into coverage: the case IDs that reached a verdict, the
 * validation failures, and the evidence paths. A missing manifest or report is incomplete.
 *
 * `docsBuildPreparation` is the bounded stand-in for the `docs-build` adapter #461 delivers: the package's
 * own `build` script (its catalogue preflight, `registry:build` and `vite build`) in the snapshot, then a
 * manifest of what it produced. It has the same interface and output path, so the production adapter
 * reads a build the same way whichever wrote it; once #461 lands, it replaces this and the standalone
 * entry stops passing it. It is not in the shared adapter map, so release plans keep `docs-build`
 * unavailable until then.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import type { Adapter, AdapterContext, AdapterReport } from '../../../scripts/verification/run.ts';
import { createManifest } from './build-manifest.ts';
import type { ProductionReport } from './production.ts';

/** Where a run's `docs-build` check leaves its manifest, relative to the run's artifacts. */
export const BUILD_MANIFEST = 'docs-build/build-manifest.json';
export const BUILD_ROOT = 'apps/docs/dist';
export const BUILD_ARGV = ['pnpm', '--filter', '@ultima/docs', 'build'];
export const RUNNER = 'apps/docs/scripts/production.ts';

/** Time the runner keeps for closing the browser and writing its report after the matrix deadline. */
const TEARDOWN_MS = 15_000;

/** The run's captured source identity: the manifest digest every build and report is checked against. */
export function runSource(context: Pick<AdapterContext, 'artifacts' | 'run'>): { digest: string; head: string | null } | null {
  try {
    const manifest = JSON.parse(readFileSync(join(context.artifacts, 'source-manifest.json'), 'utf8')) as { digest?: unknown };
    if (typeof manifest.digest !== 'string') return null;
    let head: string | null = null;
    try {
      const report = JSON.parse(readFileSync(join(context.run, 'report.json'), 'utf8')) as { source?: { identity?: { head?: string | null } } };
      head = report.source?.identity?.head ?? null;
    } catch {
      head = null;
    }
    return { digest: manifest.digest, head };
  } catch {
    return null;
  }
}

export const docsBuildPreparation: Adapter = {
  async run(context) {
    const source = runSource(context);
    if (!source) return { verdict: 'incomplete', process: null, executed: [], reason: 'the run has no readable source manifest, so a build cannot be tied to it' };
    const process = await context.launch(BUILD_ARGV, { cwd: '.' });
    if (process.status !== 'exited') return { verdict: 'incomplete', process, executed: [], reason: `the build ${process.status}` };
    if (process.exitCode !== 0) {
      return {
        verdict: 'validation-failure',
        process,
        executed: [],
        failures: [`${BUILD_ARGV.join(' ')} exited ${process.exitCode}`],
        reason: `the production docs build failed (exit ${process.exitCode}); its log holds the compiler or preflight output`,
      };
    }
    const path = join(context.artifacts, BUILD_MANIFEST);
    mkdirSync(join(context.artifacts, 'docs-build'), { recursive: true });
    const manifest = createManifest({ source: context.source, root: BUILD_ROOT, sourceDigest: source.digest, head: source.head, argv: BUILD_ARGV, cwd: '.' });
    writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
    return { verdict: 'passed', process, executed: ['docs-build:production'], expected: ['docs-build:production'], artifacts: [relative(context.run, path)] };
  },
};

export const productionAdapter: Adapter = {
  async run(context): Promise<AdapterReport> {
    const source = runSource(context);
    if (!source) return { verdict: 'incomplete', process: null, executed: [], reason: 'the run has no readable source manifest' };
    const manifest = join(context.artifacts, BUILD_MANIFEST);
    if (!existsSync(manifest)) {
      return { verdict: 'incomplete', process: null, executed: [], reason: `no production build manifest at artifacts/${BUILD_MANIFEST}; the docs-build check of this run must write one` };
    }
    const expected = context.check.cases;
    if (expected.length === 0) return { verdict: 'incomplete', process: null, executed: [], reason: 'the plan expects no production case, and zero cases cannot pass' };
    const evidence = join(context.artifacts, 'production');
    mkdirSync(evidence, { recursive: true });
    const cases = join(evidence, 'expected-cases.json');
    writeFileSync(cases, `${JSON.stringify(expected, null, 2)}\n`);
    const reportPath = join(evidence, 'report.json');
    const revision = source.head ? `${source.head.slice(0, 12)}+${source.digest.slice(0, 8)}` : source.digest.slice(0, 12);
    const deadline = Math.max(1000, context.remainingMs() - TEARDOWN_MS);
    const argv = ['node', '--experimental-strip-types', RUNNER, 'internal',
      '--source', context.source, '--manifest', manifest, '--source-digest', source.digest, '--cases', cases,
      '--evidence', evidence, '--relative-to', context.run, '--revision', revision, '--deadline-ms', String(deadline), '--report', reportPath];
    const process = await context.launch(argv, { cwd: '.' });
    const artifacts = [relative(context.run, cases)];
    let report: ProductionReport;
    try {
      report = JSON.parse(readFileSync(reportPath, 'utf8')) as ProductionReport;
    } catch (error) {
      return { verdict: 'incomplete', process, executed: [], expected, artifacts, reason: `the runner left no readable report: ${error instanceof Error ? error.message : String(error)}` };
    }
    artifacts.push(relative(context.run, reportPath));
    if (report.server.log) artifacts.push(report.server.log);
    for (const cell of report.runner?.cells ?? []) artifacts.push(...cell.artifacts.map((artifact) => artifact.path));
    const failures = (report.runner?.cells ?? [])
      .filter((cell) => cell.failure?.kind === 'validation')
      .map((cell) => `${cell.caseId}: ${cell.failure?.message}`);
    const common = { process, expected, executed: report.executed, artifacts };
    if (report.status === 'passed') return { ...common, verdict: 'passed' };
    if (report.status === 'failed') return { ...common, verdict: 'validation-failure', failures, reason: report.reason };
    return { ...common, verdict: 'incomplete', reason: report.reason };
  },
};
