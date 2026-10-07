/**
 * `pnpm --filter @ultima/docs test:production`, per Runner and build identity and Local, PR and release
 * policy under Production browser verification in docs/spec/agent-infrastructure.md.
 *
 * With no subcommand it is the standalone entry: it delegates to the verification lifecycle
 * (scripts/verification/run.ts), which captures the checkout into its own run directory, installs from
 * the snapshot's lockfile, builds the docs there and then runs every registered production case. It
 * never runs the browser itself.
 *
 * `internal` is what the verification adapter launches inside that run. It never re-enters the
 * standalone command. It needs a build manifest that matches the run's captured source and the bytes on
 * disk, serves that build from an owned loopback server on port 0, checks the server's nonce and
 * manifest identity, and runs the selected cases through `production-runner.ts`. The cases come from the
 * joined feature map in the snapshot, and each one resolves to its registered binding there; there is
 * no second list. Exits: 0 every case passed, 1 a case failed validation, 3 incomplete, 130 or 143
 * cancelled.
 */
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { loadCatalogue } from '../../../scripts/catalogue/model.ts';
import { loadVerification, repositoryFiles } from '../../../scripts/verification/model.ts';
import type { ProductionScenario, ProductionVariant } from '../../../scripts/verification/production.ts';
import { manifestProblems, readManifest } from './build-manifest.ts';
import { CHROMIUM_ARGS, type Cell, LIMITS, type Limits, type RunnerResult, installedAxe, runCells } from './production-runner.ts';
import { type StaticServer, startStaticServer, verifyIdentity } from './static-server.ts';

export const REPORT_VERSION = 1;

/** The report `internal` writes, which the verification adapter reads. */
export type ProductionReport = {
  schemaVersion: typeof REPORT_VERSION;
  kind: 'production-scenarios';
  status: 'passed' | 'failed' | 'incomplete' | 'cancelled';
  reason: string;
  source: { digest: string };
  build: { manifest: string; digest: string | null; root: string | null; problems: string[] };
  server: { url: string | null; port: number | null; identity: 'verified' | 'failed' | 'not_started'; detail: string | null; log: string | null };
  expected: string[];
  /** Cases that ran to a verdict. */
  executed: string[];
  selection: { problems: string[] };
  runner: RunnerResult | null;
};

export type InternalOptions = {
  /** The run's source snapshot. */
  source: string;
  manifest: string;
  sourceDigest: string;
  /** Case IDs the plan expects. */
  cases: string[];
  evidence: string;
  /** Evidence paths are recorded relative to this directory: the run. */
  relativeTo: string;
  revision: string;
  deadlineMs: number;
  signal?: AbortSignal;
  onProgress?: (line: string) => void;
  /** Test seams. */
  launch?: () => Promise<import('playwright').Browser>;
  limits?: Partial<Limits>;
  /** Serves a nonce other than the one the runner checks, to prove a foreign server is refused. */
  identityNonce?: string;
};

/** Each expected case, resolved through the snapshot's joined model to its variant and registered binding. */
export async function selectCells(source: string, expected: string[]): Promise<{ cells: Cell[]; problems: string[] }> {
  const files = repositoryFiles(source);
  const { catalogue, diagnostics: catalogueDiagnostics } = loadCatalogue(files);
  const { model, diagnostics } = loadVerification(files, catalogue);
  const problems = [...catalogueDiagnostics, ...diagnostics].map((d) => `${d.code} ${d.path}: ${d.message}`);
  const cells: Cell[] = [];
  const modules = new Map<string, ProductionScenario>();
  for (const caseId of expected) {
    const scenario = model.scenarios.find((entry) => entry.bindings.some((slot) => slot.target === 'production' && slot.cases.some((c) => c.id === caseId)));
    const slot = scenario?.bindings.find((entry) => entry.target === 'production');
    const variant = slot?.cases.find((c) => c.id === caseId)?.variant;
    if (!scenario || !slot || !variant) {
      problems.push(`${caseId} is expected but no registered production scenario declares it`);
      continue;
    }
    if (!slot.binding) {
      problems.push(`${caseId}: ${scenario.id} has no production binding under apps/docs/tests/production/`);
      continue;
    }
    const complete = variant.mode && variant.viewport && variant.motion;
    if (!complete) {
      problems.push(`${caseId}: a production case needs mode, viewport and motion`);
      continue;
    }
    let loaded = modules.get(slot.binding.path);
    if (!loaded) {
      try {
        const module = (await import(pathToFileURL(join(source, slot.binding.path)).href)) as { default?: ProductionScenario };
        if (!module.default || typeof module.default.run !== 'function') throw new Error('its default export is not a productionScenario registration');
        loaded = module.default;
        modules.set(slot.binding.path, loaded);
      } catch (error) {
        problems.push(`${caseId}: ${slot.binding.path} cannot be loaded: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
    }
    if (loaded.id !== scenario.id || loaded.target !== 'production') {
      problems.push(`${caseId}: ${slot.binding.path} registers ${loaded.id}@${loaded.target}, not ${scenario.id}@production`);
      continue;
    }
    const remove = scenario.targets.find((target) => target.target === 'production')?.remove ?? [];
    cells.push({ caseId, scenario: scenario.id, variant: variant as ProductionVariant, binding: slot.binding.path, run: loaded.run, remove });
  }
  return { cells, problems };
}

export async function launchChromium() {
  const { chromium } = await import('playwright');
  return chromium.launch({ headless: true, args: CHROMIUM_ARGS });
}

/** One production pass inside a verification run. Never throws; the report says what happened. */
export async function internal(options: InternalOptions): Promise<{ exit: number; report: ProductionReport }> {
  mkdirSync(options.evidence, { recursive: true });
  const report: ProductionReport = {
    schemaVersion: REPORT_VERSION,
    kind: 'production-scenarios',
    status: 'incomplete',
    reason: 'not started',
    source: { digest: options.sourceDigest },
    build: { manifest: relative(options.relativeTo, options.manifest), digest: null, root: null, problems: [] },
    server: { url: null, port: null, identity: 'not_started', detail: null, log: null },
    expected: [...options.cases].sort(),
    executed: [],
    selection: { problems: [] },
    runner: null,
  };
  const done = (status: ProductionReport['status'], reason: string) => {
    report.status = status;
    report.reason = reason;
    const exit = { passed: 0, failed: 1, incomplete: 3, cancelled: options.signal?.reason === 'SIGINT' ? 130 : 143 }[status];
    return { exit, report };
  };

  const manifest = readManifest(options.manifest);
  if ('failure' in manifest) return done('incomplete', manifest.failure);
  report.build.digest = manifest.digest;
  report.build.root = manifest.root;
  const root = resolve(options.source, manifest.root);
  report.build.problems = manifestProblems(manifest, options.sourceDigest, root);
  if (report.build.problems.length > 0) return done('incomplete', `the build manifest does not describe this run's build: ${report.build.problems.join('; ')}`);

  const { cells, problems } = await selectCells(options.source, options.cases);
  report.selection.problems = problems;
  if (problems.length > 0) return done('incomplete', `the selected cases do not resolve to registered bindings: ${problems.join('; ')}`);
  if (cells.length === 0) return done('incomplete', 'no production case was selected, and zero cases cannot pass');

  const nonce = randomBytes(16).toString('hex');
  let server: StaticServer | null = null;
  try {
    try {
      server = await startStaticServer({ root, nonce: options.identityNonce ?? nonce, manifestDigest: manifest.digest });
    } catch (error) {
      report.server.identity = 'failed';
      report.server.detail = `the static server could not bind a loopback port: ${error instanceof Error ? error.message : String(error)}`;
      return done('incomplete', report.server.detail);
    }
    report.server.url = server.url;
    report.server.port = server.port;
    const limits: Limits = { ...LIMITS, ...options.limits };
    const identity = await verifyIdentity(server.url, nonce, manifest.digest, limits.serverReadinessMs);
    report.server.identity = identity ? 'failed' : 'verified';
    report.server.detail = identity;
    if (identity) return done('incomplete', `the server is not this run's: ${identity}`);

    const result = await runCells({
      baseUrl: server.url,
      cells,
      evidence: options.evidence,
      relativeTo: options.relativeTo,
      revision: options.revision,
      launch: options.launch ?? launchChromium,
      launchArgs: options.launch ? [] : CHROMIUM_ARGS,
      axeSource: installedAxe(),
      limits: { ...limits, matrixMs: Math.min(limits.matrixMs, options.deadlineMs) },
      signal: options.signal,
      onProgress: options.onProgress,
    });
    report.runner = result;
    report.executed = result.cells.filter((cell) => cell.status === 'passed' || cell.failure?.kind === 'validation').map((cell) => cell.caseId).sort();
    const counts = result.cells.reduce<Record<string, number>>((all, cell) => ({ ...all, [cell.status]: (all[cell.status] ?? 0) + 1 }), {});
    const summary = Object.entries(counts)
      .map(([status, count]) => `${count} ${status}`)
      .join(', ');
    if (result.status === 'passed') return done('passed', `${cells.length} case(s) passed: ${summary}`);
    if (result.status === 'cancelled') return done('cancelled', `cancelled: ${summary}`);
    if (result.status === 'failed') return done('failed', `a case failed validation: ${summary}`);
    return done('incomplete', result.browser.error ?? `not every case reached a verdict: ${summary}${result.closeErrors.length > 0 ? `; ${result.closeErrors.join('; ')}` : ''}`);
  } finally {
    if (server) {
      const log = join(options.evidence, 'server.log');
      writeFileSync(log, server.requests.map((entry) => `${entry.status} ${entry.method} ${entry.path}${entry.file ? ` -> ${entry.file}` : ''}`).join('\n') + '\n');
      report.server.log = relative(options.relativeTo, log);
      await server.close();
    }
  }
}

function parseInternal(argv: string[]): Omit<InternalOptions, 'signal' | 'onProgress'> & { report: string } {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error(`internal takes --name value pairs; got ${argv.join(' ')}`);
    values.set(key.slice(2), value);
  }
  const need = (name: string) => {
    const value = values.get(name);
    if (value === undefined) throw new Error(`internal needs --${name}`);
    return value;
  };
  return {
    source: resolve(need('source')),
    manifest: resolve(need('manifest')),
    sourceDigest: need('source-digest'),
    cases: JSON.parse(readFileSync(need('cases'), 'utf8')) as string[],
    evidence: resolve(need('evidence')),
    relativeTo: resolve(need('relative-to')),
    revision: need('revision'),
    deadlineMs: Number(need('deadline-ms')),
    report: resolve(need('report')),
  };
}

async function main(argv: string[]) {
  const [command, ...rest] = argv;
  const controller = new AbortController();
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      if (!controller.signal.aborted) controller.abort(signal);
    });
  }
  if (command === 'internal') {
    let options: ReturnType<typeof parseInternal>;
    try {
      options = parseInternal(rest);
    } catch (error) {
      process.stderr.write(`production: ${error instanceof Error ? error.message : String(error)}\n`);
      return 2;
    }
    const { exit, report } = await internal({ ...options, signal: controller.signal, onProgress: (line) => process.stderr.write(`${line}\n`) });
    writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
    process.stderr.write(`production: ${report.status}: ${report.reason}\n`);
    return exit;
  }
  const { standalone } = await import('./test-production.ts');
  return standalone(argv, controller.signal);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
  // Playwright can leave handles open after a cancelled run; the report is written, so leave.
  process.exit();
}
