/**
 * An executed verification run, per Isolation and cancellation and Evidence and exits under
 * Verification CLI in docs/spec/agent-infrastructure.md. A run owns one directory, by default
 * `.scratch/verify/<run-id>/`, holding `source/`, `artifacts/`, `logs/` and `report.json`, plus a private
 * TMPDIR under the system temporary directory, outside any checkout. It captures the checkout into `source/`, plans from those bytes, prepares dependencies there from the
 * matching lockfile when an adapter needs them, and executes the plan's check DAG with owned processes,
 * resource locks and deadlines. It hashes the checkout again at the end, writes one versioned report and
 * returns the exit the contract assigns.
 *
 * A check passes only when its adapter ran to completion and its coverage evidence names every expected
 * test or case: a child's exit code alone never establishes a pass. A check with no adapter is
 * `unavailable`, and a run with any required check short of `passed` is not a pass.
 */
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

import { CHECKS, type CheckId, type Need } from './checks.ts';
import type { Plan, PlannedCheck } from './plan.ts';
import { type OwnedServer, allocatePort, startServer } from './ports.ts';
import { GRACE_MS, type ProcessResult, launch, ownedBy, sleep, stopOwned } from './process.ts';
import { type Capture, type CaptureOptions, type SourceIdentity, captureSource, hashSource } from './source.ts';

export const RUN_VERSION = 1;

/** The ignored directory runs live in, relative to the checkout. */
export const RUNS_DIRECTORY = '.scratch/verify';

export type CheckState = 'passed' | 'failed' | 'unavailable' | 'timed_out' | 'cancelled' | 'blocked' | 'skipped' | 'not_run';

export type RunStatus = 'passed' | 'failed' | 'incomplete' | 'cancelled';

export const EXIT = { passed: 0, failed: 1, usage: 2, incomplete: 3, SIGINT: 130, SIGTERM: 143 } as const;

export type Cancellation = 'SIGINT' | 'SIGTERM';

/** What an adapter reports once its command has run. The runner, not the adapter, decides the state. */
export type AdapterReport = {
  /** `passed` claims success, which the runner still checks against the process and coverage. */
  verdict: 'passed' | 'validation-failure' | 'incomplete';
  /** The main process, if the adapter ran one; a stopped or crashed process overrides the verdict. */
  process: ProcessResult | null;
  /** Test or case IDs the check must execute, beyond the plan's; the runner adds the plan's own. */
  expected?: string[];
  /** Test or case IDs the check actually executed, from the tool's own report. */
  executed: string[];
  /** IDs the tool reported skipped. A skipped expected ID cannot pass. */
  skipped?: string[];
  /** Structured validation failures the tool reported. */
  failures?: string[];
  reason?: string;
  /** Run-relative evidence paths; each must exist inside the run. */
  artifacts?: string[];
};

export type AdapterContext = {
  runId: string;
  check: PlannedCheck;
  /** Absolute paths inside the run. `source` is the frozen snapshot the check runs against. */
  source: string;
  run: string;
  artifacts: string;
  logs: string;
  /** The check's log, `logs/<check>.log`, which every launch appends standard error (and, by default, output) to. */
  log: string;
  env: NodeJS.ProcessEnv;
  /** Aborted on the check's deadline or the run's cancellation. */
  signal: AbortSignal;
  /** Milliseconds left before the check's deadline. */
  remainingMs(): number;
  /**
   * Runs an owned child from an argument array in `cwd` (relative to `source`), logging to `log`. `stdout`
   * sends standard output alone to a file, for a tool that prints its report there; `env` adds variables.
   */
  launch(argv: string[], options?: { cwd?: string; stdout?: string; env?: Record<string, string> }): Promise<ProcessResult>;
  /** Starts an owned server on a fresh loopback port and waits for its identity. */
  startServer(argv: string[], options: { readinessMs: number; cwd?: string }): Promise<{ server: OwnedServer } | { failure: string }>;
};

export type Adapter = { run(context: AdapterContext): Promise<AdapterReport> };

export type Adapters = Partial<Record<CheckId, Adapter>>;

/** Returns null when the need is met, or why it is not. */
export type Probe = () => Promise<string | null>;

export type Preparation = { argv: string[]; deadlineSeconds: number };

/** Dependencies from the snapshot's own lockfile, into the snapshot's own node_modules; the store is shared. */
export const PREPARATION: Preparation = { argv: ['pnpm', 'install', '--frozen-lockfile', '--prefer-offline', '--config.confirmModulesPurge=false'], deadlineSeconds: 900 };

function command(argv: string[]): string | null {
  const result = spawnSync(argv[0] as string, argv.slice(1), { encoding: 'utf8', timeout: 10_000 });
  return result.status === 0 ? `${result.stdout}${result.stderr}`.trim().split('\n')[0] ?? '' : null;
}

export const PROBES: Record<Need, Probe> = {
  python3: async () => (command(['python3', '--version']) === null ? 'python3 is not on PATH' : null),
  'loopback-port': async () => {
    try {
      await allocatePort();
      return null;
    } catch (error) {
      return `no loopback port could be bound: ${String(error)}`;
    }
  },
  network: async () => {
    try {
      await lookup('registry.npmjs.org');
      return null;
    } catch (error) {
      return `the npm registry does not resolve, so installation cannot reach the network: ${String(error)}`;
    }
  },
  chromium: async () => {
    try {
      const { chromium } = (await import('playwright')) as { chromium: { executablePath(): string } };
      const path = chromium.executablePath();
      return existsSync(path) ? null : `the locked Playwright Chromium is not installed at ${path}`;
    } catch (error) {
      return `the Playwright library cannot be loaded: ${String(error)}`;
    }
  },
};

export type CheckRecord = {
  id: CheckId;
  title: string;
  status: CheckState;
  /** For `failed`: a proven validation failure, or incomplete execution such as a crash or missing coverage. */
  failure: { kind: 'validation' | 'incomplete'; reason: string; failures: string[] } | null;
  reason: string;
  selection: { scope: PlannedCheck['scope'] | 'outside'; reasons: string[] };
  argv: string[];
  cwd: string;
  prerequisites: CheckId[];
  blockedBy: string[];
  locks: string[];
  needs: string[];
  deadlineSeconds: number;
  expected: string[];
  executed: string[];
  skipped: string[];
  exitCode: number | null;
  signal: string | null;
  startedAt: string | null;
  durationMs: number | null;
  processes: (Omit<ProcessResult, 'durationMs'> & { durationMs: number })[];
  servers: { url: string; port: number; pid: number; attempts: { port: number; outcome: string }[] }[];
  evidence: string[];
  missingEvidence: string[];
};

export type AbandonedRun = { runId: string; directory: string; startedAt: string | null; pid: number | null; state: 'abandoned' | 'running' | 'unreadable' };

export type Report = {
  schemaVersion: typeof RUN_VERSION;
  kind: 'verification-run';
  runId: string;
  command: string;
  selectors: string[];
  status: RunStatus | 'unfinished';
  exit: number | null;
  summary: string;
  scope: { requested: string; effective: Plan['scope'] | null; note: string };
  directory: { run: string; source: string; artifacts: string; logs: string; report: string; sourceRetained: boolean };
  source: {
    capture: { status: 'captured' | 'failed'; attempts: number; durationMs: number; reason: string | null };
    identity: SourceIdentity | null;
    completion: { status: 'unchanged' | 'changed' | 'unknown'; digest: string | null; reason: string | null } | null;
    sourceChanged: boolean;
  };
  environment: { platform: string; arch: string; node: string; pnpm: string | null; git: string | null; host: string; pid: number };
  timestamps: { started: string; finished: string | null };
  durationMs: number | null;
  deadline: { overallSeconds: number; source: string };
  cancellation: Cancellation | null;
  preparation: {
    status: 'passed' | 'failed' | 'timed_out' | 'cancelled' | 'not_run';
    reason: string;
    argv: string[];
    cwd: string;
    lockfile: string | null;
    durationMs: number | null;
    exitCode: number | null;
    log: string | null;
  };
  prerequisites: { need: Need; status: 'present' | 'missing' | 'not_probed'; detail: string | null }[];
  checks: CheckRecord[];
  counts: Record<CheckState, number>;
  abandonedRuns: AbandonedRun[];
  cleanup: { survivors: number[]; errors: string[] };
  plan: Plan | null;
};

export type RunOptions = {
  root: string;
  /** The run directory: new or empty. */
  directory: string;
  runId: string;
  command: string;
  selectors: string[];
  /** Plans from the captured bytes; a thrown error or string becomes incomplete evidence. */
  planFrom(source: string): Plan | { failure: string };
  adapters: Adapters;
  probes?: Partial<Record<Need, Probe>>;
  preparation?: Preparation;
  overallDeadlineSeconds: number;
  deadlineSource: string;
  /** Aborted with a `Cancellation` reason on SIGINT or SIGTERM. */
  signal?: AbortSignal;
  concurrency?: number;
  graceMs?: number;
  capture?: CaptureOptions;
  onProgress?(line: string): void;
};

export const newRunId = () => `${new Date().toISOString().replace(/[-:]/g, '').replace(/\..*$/, '')}-${randomBytes(4).toString('hex')}`;

/** The run directory: under the checkout's ignored runs directory, or a caller's new or empty directory. */
export function runDirectory(root: string, runId: string, output?: string, cwd = process.cwd()): { directory: string } | { usage: string } {
  if (output === undefined) return { directory: join(root, RUNS_DIRECTORY, runId) };
  const directory = resolve(cwd, output);
  const inside = relative(realpathSync(root), existsSync(directory) ? realpathSync(directory) : directory);
  if (!inside.startsWith('..') && !isAbsolute(inside) && !`${inside}${sep}`.startsWith(`.scratch${sep}`)) {
    return { usage: `--output ${output} is inside the checkout, where it would become source; use a directory outside it or under .scratch/` };
  }
  if (existsSync(directory)) {
    if (!statSync(directory).isDirectory()) return { usage: `--output ${output} exists and is not a directory` };
    if (readdirSync(directory).length > 0) return { usage: `--output ${output} is not empty; evidence goes only to a new or empty directory` };
  }
  return { directory };
}

function tools() {
  return {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    pnpm: command(['pnpm', '--version']),
    git: command(['git', '--version']),
    host: hostname(),
    pid: process.pid,
  };
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** Earlier runs in this checkout that never finalized their report; their partial files are never evidence. */
export function abandonedRuns(root: string, except: string): AbandonedRun[] {
  const parent = join(root, RUNS_DIRECTORY);
  let names: string[];
  try {
    names = readdirSync(parent).sort();
  } catch {
    return [];
  }
  const found: AbandonedRun[] = [];
  for (const name of names) {
    const directory = join(parent, name);
    if (resolve(directory) === resolve(except)) continue;
    const path = join(directory, 'report.json');
    if (!existsSync(path)) {
      found.push({ runId: name, directory: relative(root, directory), startedAt: null, pid: null, state: 'unreadable' });
      continue;
    }
    try {
      const report = JSON.parse(readFileSync(path, 'utf8')) as Partial<Report>;
      if (report.status !== 'unfinished') continue;
      const pid = report.environment?.pid ?? null;
      const sameHost = report.environment?.host === hostname();
      found.push({
        runId: report.runId ?? name,
        directory: relative(root, directory),
        startedAt: report.timestamps?.started ?? null,
        pid,
        state: sameHost && pid !== null && isAlive(pid) ? 'running' : 'abandoned',
      });
    } catch {
      found.push({ runId: name, directory: relative(root, directory), startedAt: null, pid: null, state: 'unreadable' });
    }
  }
  return found;
}

function writeReport(directory: string, report: Report) {
  const path = join(directory, 'report.json');
  writeFileSync(`${path}.tmp`, `${JSON.stringify(report, null, 2)}\n`);
  renameSync(`${path}.tmp`, path);
}

/**
 * A child's environment: the caller's, minus what points package scripts back at the caller's checkout,
 * and minus NODE_TEST_CONTEXT, which would make a `node --test` check report to a test runner that
 * started this run instead of to its own reporters.
 */
export function childEnvironment(runId: string, source: string, tmp: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (/^(npm_|PNPM_SCRIPT_SRC_DIR$|INIT_CWD$|OLDPWD$|NODE_TEST_CONTEXT$)/.test(key)) continue;
    env[key] = value;
  }
  return { ...env, PWD: source, TMPDIR: tmp, ULTIMA_VERIFY_RUN: runId, ULTIMA_VERIFY_SOURCE: source };
}

const emptyCounts = (): Record<CheckState, number> => ({ passed: 0, failed: 0, unavailable: 0, timed_out: 0, cancelled: 0, blocked: 0, skipped: 0, not_run: 0 });

function record(check: PlannedCheck | (typeof CHECKS)[number], selection: CheckRecord['selection'], status: CheckState, reason: string): CheckRecord {
  const planned = 'status' in check ? check : undefined;
  return {
    id: check.id,
    title: check.title,
    status,
    failure: null,
    reason,
    selection,
    argv: check.argv,
    cwd: check.cwd,
    prerequisites: planned ? planned.prerequisites : check.prerequisites,
    blockedBy: [],
    locks: [...check.locks],
    needs: [...check.needs],
    deadlineSeconds: check.deadlineSeconds,
    expected: planned ? [...planned.files.filter((file) => file.present).map((file) => file.path), ...planned.cases] : [],
    executed: [],
    skipped: [],
    exitCode: null,
    signal: null,
    startedAt: null,
    durationMs: null,
    processes: [],
    servers: [],
    evidence: [],
    missingEvidence: [],
  };
}

/**
 * The state a finished adapter earns. Stopped processes win; then a crash or launch failure is
 * incomplete; then the verdict, with a claimed pass checked against the exit and the coverage.
 */
export function judge(report: AdapterReport, expected: string[]): Pick<CheckRecord, 'status' | 'failure' | 'reason'> {
  const process = report.process;
  if (process?.status === 'timed_out') return { status: 'timed_out', failure: null, reason: 'the check exceeded its deadline and its processes were stopped' };
  if (process?.status === 'cancelled') return { status: 'cancelled', failure: null, reason: 'the run was cancelled while the check ran' };
  const incomplete = (reason: string) => ({ status: 'failed' as const, failure: { kind: 'incomplete' as const, reason, failures: [] }, reason });
  if (process?.status === 'launch-failed') return incomplete(`the command could not start: ${process.error ?? 'unknown error'}`);
  if (process?.status === 'signalled') return incomplete(`the command was killed by ${process.signal}, so its result is unknown`);
  if (report.verdict === 'validation-failure') {
    const failures = report.failures ?? [];
    const reason = report.reason ?? `${failures.length} validation failure(s)`;
    return { status: 'failed', failure: { kind: 'validation', reason, failures }, reason };
  }
  if (report.verdict === 'incomplete') return incomplete(report.reason ?? 'the adapter could not establish a result');
  if (process && process.exitCode !== 0) return incomplete(`the adapter claimed a pass but its command exited ${process.exitCode}`);
  if (report.executed.length === 0) return incomplete('no test or case executed, and zero executed tests cannot pass');
  const executed = new Set(report.executed);
  const skipped = new Set(report.skipped ?? []);
  const skippedRequired = expected.filter((id) => skipped.has(id));
  if (skippedRequired.length > 0) return incomplete(`required coverage was skipped: ${skippedRequired.join(', ')}`);
  const missing = expected.filter((id) => !executed.has(id));
  if (missing.length > 0) return incomplete(`expected coverage did not execute: ${missing.join(', ')}`);
  return { status: 'passed', failure: null, reason: `executed ${report.executed.length} expected test(s) or case(s)` };
}

/** Cancellation, then a proven validation failure, then anything short of a pass, which is incomplete. */
export function outcome(checks: CheckRecord[], extra: { cancellation: Cancellation | null; incomplete: boolean }): { status: RunStatus; exit: number } {
  if (extra.cancellation) return { status: 'cancelled', exit: EXIT[extra.cancellation] };
  if (checks.some((entry) => entry.status === 'failed' && entry.failure?.kind === 'validation')) return { status: 'failed', exit: EXIT.failed };
  const required = checks.filter((entry) => entry.status !== 'skipped');
  if (extra.incomplete || required.length === 0 || required.some((entry) => entry.status !== 'passed')) return { status: 'incomplete', exit: EXIT.incomplete };
  return { status: 'passed', exit: EXIT.passed };
}

function inside(directory: string, path: string): boolean {
  const target = resolve(directory, path);
  const rel = relative(directory, target);
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}

export async function executeRun(options: RunOptions): Promise<Report> {
  const started = performance.now();
  const { root, directory, runId } = options;
  const progress = options.onProgress ?? (() => {});
  const graceMs = options.graceMs ?? GRACE_MS;
  const paths = { source: join(directory, 'source'), artifacts: join(directory, 'artifacts'), logs: join(directory, 'logs') };
  for (const path of [directory, paths.artifacts, paths.logs]) mkdirSync(path, { recursive: true });
  // Outside any checkout: a test's scratch repository under the run directory would sit inside the
  // caller's Git work tree and pnpm workspace, and Git and pnpm would find them.
  const tmp = mkdtempSync(join(tmpdir(), `ultima-verify-${runId}-`));
  const deadlineAt = started + options.overallDeadlineSeconds * 1000;
  const cancellation = () => (options.signal?.aborted ? (options.signal.reason as Cancellation) : null);

  const report: Report = {
    schemaVersion: RUN_VERSION,
    kind: 'verification-run',
    runId,
    command: options.command,
    selectors: options.selectors,
    status: 'unfinished',
    exit: null,
    summary: 'The run has not finished; nothing here is evidence of a completed check.',
    scope: { requested: [options.command, ...options.selectors].join(' '), effective: null, note: '' },
    directory: { run: directory, source: 'source', artifacts: 'artifacts', logs: 'logs', report: 'report.json', sourceRetained: true },
    source: { capture: { status: 'failed', attempts: 0, durationMs: 0, reason: 'not captured yet' }, identity: null, completion: null, sourceChanged: false },
    environment: tools(),
    timestamps: { started: new Date().toISOString(), finished: null },
    durationMs: null,
    deadline: { overallSeconds: options.overallDeadlineSeconds, source: options.deadlineSource },
    cancellation: null,
    preparation: { status: 'not_run', reason: 'the source has not been captured', argv: [], cwd: 'source', lockfile: null, durationMs: null, exitCode: null, log: null },
    prerequisites: [],
    checks: [],
    counts: emptyCounts(),
    abandonedRuns: abandonedRuns(root, directory),
    cleanup: { survivors: [], errors: [] },
    plan: null,
  };
  const flush = () => {
    try {
      writeReport(directory, report);
    } catch (error) {
      report.cleanup.errors.push(`the report could not be written: ${String(error)}`);
    }
  };
  flush();
  for (const abandoned of report.abandonedRuns.filter((run) => run.state !== 'running')) {
    progress(`verify: earlier run ${abandoned.runId} in ${abandoned.directory} never finished; its partial files are not evidence`);
  }

  let incomplete = false;
  const tokens: string[] = [];
  const finish = async (): Promise<Report> => {
    // Let a signal that arrived during synchronous work reach its handler before the outcome is decided.
    await new Promise((resolve) => setImmediate(resolve));
    for (const token of tokens) {
      const survivors = await stopOwned(null, token, graceMs);
      report.cleanup.survivors.push(...survivors);
    }
    if (report.cleanup.survivors.length > 0) {
      incomplete = true;
      report.cleanup.errors.push(`owned processes survived cleanup: ${report.cleanup.survivors.join(', ')}`);
    }
    if (report.source.identity) {
      const now = hashSource(root);
      const digest = now.ok ? now.manifest.digest : null;
      const changed = !now.ok || digest !== report.source.identity.manifest.digest || now.head !== report.source.identity.head;
      report.source.completion = now.ok
        ? { status: changed ? 'changed' : 'unchanged', digest, reason: changed ? 'the checkout no longer matches the captured bytes; results describe the captured snapshot only' : null }
        : { status: 'unknown', digest: null, reason: now.reason };
      report.source.sourceChanged = changed;
      if (changed) incomplete = true;
    }
    try {
      rmSync(paths.source, { recursive: true, force: true });
      rmSync(tmp, { recursive: true, force: true });
      report.directory.sourceRetained = false;
    } catch (error) {
      report.cleanup.errors.push(`the run's disposable source could not be removed: ${String(error)}`);
    }
    report.cancellation = cancellation();
    for (const entry of report.checks) {
      report.counts[entry.status] += 1;
    }
    const result = outcome(report.checks, { cancellation: report.cancellation, incomplete });
    report.status = result.status;
    report.exit = result.exit;
    report.summary = summarize(report);
    report.timestamps.finished = new Date().toISOString();
    report.durationMs = performance.now() - started;
    flush();
    return report;
  };

  const outside = (reason: string) => CHECKS.map((check) => record(check, { scope: 'outside', reasons: [] }, 'not_run', reason));

  progress(`verify: capturing the checkout into ${relative(root, paths.source).startsWith('..') ? paths.source : relative(root, paths.source)}`);
  const capture: Capture = captureSource(root, paths.source, options.capture);
  report.source.capture = { status: capture.ok ? 'captured' : 'failed', attempts: capture.attempts, durationMs: capture.durationMs, reason: capture.ok ? null : capture.reason };
  if (!capture.ok) {
    incomplete = true;
    report.checks = outside(`no coherent source snapshot: ${capture.reason}`);
    return finish();
  }
  report.source.identity = capture.identity;
  writeFileSync(join(paths.artifacts, 'source-manifest.json'), `${JSON.stringify(capture.manifest, null, 2)}\n`);
  flush();

  let plan: Plan | { failure: string };
  try {
    plan = options.planFrom(paths.source);
  } catch (error) {
    plan = { failure: String(error) };
  }
  if ('failure' in plan) {
    incomplete = true;
    report.checks = outside(`the plan could not be resolved from the snapshot: ${plan.failure}`);
    return finish();
  }
  report.plan = plan;
  report.scope.effective = plan.scope;
  report.scope.note =
    plan.scope === 'release'
      ? 'The release plan; its success still needs every adapter, and full CI remains authoritative.'
      : `A local ${plan.scope} result for \`${report.scope.requested}\` only; it says nothing about paths outside that scope.`;

  const selected = new Map(plan.checks.map((check) => [check.id, check]));
  const records = new Map<CheckId, CheckRecord>();
  for (const check of plan.checks) records.set(check.id, record(check, { scope: check.scope, reasons: check.reasons }, 'not_run', 'not started'));
  const skipped = CHECKS.filter((check) => !selected.has(check.id)).map((check) => record(check, { scope: 'outside', reasons: [] }, 'skipped', 'outside the selected scope'));
  report.checks = [...records.values(), ...skipped];

  // Adapters first: a check without one is unavailable whatever its prerequisites did.
  for (const check of plan.checks) {
    if (!options.adapters[check.id]) {
      const entry = records.get(check.id) as CheckRecord;
      entry.status = 'unavailable';
      entry.reason =
        check.adapter.status === 'unavailable' ? `no execution adapter yet; it lands with ${check.adapter.lands}` : 'no execution adapter was registered for this run';
    }
  }
  const runnable = plan.checks.filter((check) => options.adapters[check.id]);

  // Needs, probed once each, for the checks that could run.
  const needs = [...new Set(runnable.flatMap((check) => check.needs))];
  const probes = { ...PROBES, ...options.probes };
  const missing = new Map<Need, string>();
  for (const need of ['network', 'loopback-port', 'chromium', 'python3'] as Need[]) {
    if (!needs.includes(need)) {
      report.prerequisites.push({ need, status: 'not_probed', detail: 'no runnable selected check needs it' });
      continue;
    }
    const problem = await probes[need]();
    if (problem) missing.set(need, problem);
    report.prerequisites.push({ need, status: problem ? 'missing' : 'present', detail: problem });
  }
  for (const check of runnable) {
    const absent = check.needs.filter((need) => missing.has(need));
    if (absent.length === 0) continue;
    const entry = records.get(check.id) as CheckRecord;
    entry.status = 'unavailable';
    entry.reason = `missing prerequisite: ${absent.map((need) => missing.get(need)).join('; ')}`;
  }
  const executable = runnable.filter((check) => (records.get(check.id) as CheckRecord).status === 'not_run');

  const env = childEnvironment(runId, paths.source, tmp);
  const preparation = options.preparation ?? PREPARATION;
  report.preparation.argv = preparation.argv;
  report.preparation.lockfile = capture.manifest.entries.find((entry) => entry.path === 'pnpm-lock.yaml')?.sha256 ?? null;
  let prepared = false;
  if (executable.length === 0) {
    report.preparation.reason = 'no selected check can execute, so dependencies were not installed';
  } else if (cancellation()) {
    report.preparation.status = 'cancelled';
    report.preparation.reason = 'cancelled before preparation';
  } else {
    const log = join(paths.logs, 'preparation.log');
    const token = `${runId}.preparation`;
    tokens.push(token);
    progress(`verify: preparing dependencies: ${preparation.argv.join(' ')}`);
    const result = await launch({
      argv: preparation.argv,
      cwd: paths.source,
      env,
      log,
      token,
      deadlineMs: Math.min(preparation.deadlineSeconds * 1000, deadlineAt - performance.now()),
      signal: options.signal,
      graceMs,
    });
    report.preparation.durationMs = result.durationMs;
    report.preparation.exitCode = result.exitCode;
    report.preparation.log = relative(directory, log);
    if (result.status === 'exited' && result.exitCode === 0) {
      prepared = true;
      report.preparation.status = 'passed';
      report.preparation.reason = 'installed from the snapshot lockfile into the run';
    } else {
      report.preparation.status = result.status === 'timed_out' ? 'timed_out' : result.status === 'cancelled' ? 'cancelled' : 'failed';
      report.preparation.reason =
        result.status === 'exited' ? `the install exited ${result.exitCode}; a lockfile that does not match its manifests fails here` : `the install ${result.status}${result.error ? `: ${result.error}` : ''}`;
      incomplete = true;
    }
  }
  flush();

  // The DAG: plan order, prerequisites passed, locks free, bounded concurrency.
  const pending = executable.map((check) => check.id);
  const held = new Set<string>();
  const running = new Map<CheckId, Promise<void>>();
  const concurrency = Math.max(1, options.concurrency ?? 2);
  // A check is finished once it holds its final state; unavailable ones never start.
  const finished = new Set<CheckId>(plan.checks.filter((check) => !executable.includes(check)).map((check) => check.id));

  const start = (check: PlannedCheck) => {
    const entry = records.get(check.id) as CheckRecord;
    const adapter = options.adapters[check.id] as Adapter;
    for (const lock of check.locks) held.add(lock);
    const token = `${runId}.${check.id}`;
    tokens.push(token);
    const controller = new AbortController();
    const checkDeadline = Math.min(performance.now() + check.deadlineSeconds * 1000, deadlineAt);
    let stopReason: 'timed_out' | 'cancelled' | null = null;
    const halt = (reason: 'timed_out' | 'cancelled') => {
      if (stopReason) return;
      stopReason = reason;
      controller.abort(reason);
    };
    const timer = setTimeout(() => halt('timed_out'), Math.max(0, checkDeadline - performance.now()));
    const onCancel = () => halt('cancelled');
    options.signal?.addEventListener('abort', onCancel, { once: true });
    const log = join(paths.logs, `${check.id}.log`);
    const begun = performance.now();
    entry.startedAt = new Date().toISOString();
    entry.status = 'not_run';
    entry.reason = 'running; not finished';
    progress(`verify: ${check.id} started`);
    const context: AdapterContext = {
      runId,
      check,
      source: paths.source,
      run: directory,
      artifacts: paths.artifacts,
      logs: paths.logs,
      log,
      env,
      signal: controller.signal,
      remainingMs: () => Math.max(0, checkDeadline - performance.now()),
      async launch(argv, launchOptions = {}) {
        const result = await launch({
          argv,
          cwd: join(paths.source, launchOptions.cwd ?? check.cwd),
          env: { ...env, ...launchOptions.env },
          log,
          ...(launchOptions.stdout ? { stdout: launchOptions.stdout } : {}),
          token,
          deadlineMs: Math.max(0, checkDeadline - performance.now()),
          signal: controller.signal,
          graceMs,
        });
        entry.processes.push(result);
        return result;
      },
      async startServer(argv, serverOptions) {
        const started = await startServer({
          argv,
          cwd: join(paths.source, serverOptions.cwd ?? check.cwd),
          env,
          log: join(paths.logs, `${check.id}.server.log`),
          token,
          readinessMs: Math.min(serverOptions.readinessMs, Math.max(0, checkDeadline - performance.now())),
          lifetimeMs: Math.max(0, checkDeadline - performance.now()),
          signal: controller.signal,
          graceMs,
        });
        if ('server' in started) {
          const { url, port, pid, attempts } = started.server;
          entry.servers.push({ url, port, pid, attempts });
        } else entry.servers.push({ url: '', port: 0, pid: 0, attempts: started.attempts });
        return started;
      },
    };
    const work = (async () => {
      let adapterReport: AdapterReport;
      const stopped = new Promise<'stopped'>((resolve) => controller.signal.addEventListener('abort', () => setTimeout(() => resolve('stopped'), graceMs + 2500), { once: true }));
      try {
        const result = await Promise.race([adapter.run(context), stopped]);
        adapterReport =
          result === 'stopped'
            ? { verdict: 'incomplete', process: null, executed: [], reason: 'the adapter did not return after it was stopped' }
            : result;
      } catch (error) {
        adapterReport = { verdict: 'incomplete', process: null, executed: [], reason: `the adapter crashed: ${error instanceof Error ? error.message : String(error)}` };
      }
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', onCancel);
      // Whatever the adapter left behind is still this check's to stop.
      const leftovers = ownedBy(token);
      if (leftovers.length > 0) {
        const survivors = await stopOwned(null, token, graceMs);
        report.cleanup.errors.push(`${check.id} left owned process(es) ${leftovers.join(', ')} running; they were stopped`);
        if (survivors.length > 0) report.cleanup.survivors.push(...survivors);
      }
      const expected = [...new Set([...entry.expected, ...(adapterReport.expected ?? [])])].sort();
      entry.expected = expected;
      entry.executed = [...adapterReport.executed].sort();
      entry.skipped = [...(adapterReport.skipped ?? [])].sort();
      const main = adapterReport.process;
      entry.exitCode = main?.exitCode ?? null;
      entry.signal = main?.signal ?? null;
      entry.durationMs = performance.now() - begun;
      const judged =
        stopReason === 'timed_out'
          ? {
              status: 'timed_out' as const,
              failure: null,
              reason: `the check exceeded its deadline of ${Math.round((checkDeadline - begun) / 1000)}s, the lesser of its own ${check.deadlineSeconds}s and the run's remaining time, and its processes were stopped`,
            }
          : stopReason === 'cancelled'
            ? { status: 'cancelled' as const, failure: null, reason: `the run was cancelled by ${cancellation() ?? 'a signal'} while the check ran` }
            : judge(adapterReport, expected);
      Object.assign(entry, judged);
      for (const path of adapterReport.artifacts ?? []) {
        if (inside(directory, path) && existsSync(join(directory, path))) entry.evidence.push(path);
        else entry.missingEvidence.push(path);
      }
      if (existsSync(log)) entry.evidence.unshift(relative(directory, log));
      for (const lock of check.locks) held.delete(lock);
      finished.add(check.id);
      progress(`verify: ${check.id} ${entry.status}${entry.status === 'passed' ? '' : `: ${entry.reason}`}`);
      flush();
    })();
    running.set(check.id, work.then(() => void running.delete(check.id)));
  };

  if (!prepared) {
    for (const id of pending) {
      const entry = records.get(id) as CheckRecord;
      entry.status = report.preparation.status === 'cancelled' ? 'not_run' : 'blocked';
      entry.blockedBy = ['preparation'];
      entry.reason = `dependency preparation ${report.preparation.status}: ${report.preparation.reason}`;
    }
    pending.length = 0;
  }

  while (pending.length > 0 || running.size > 0) {
    for (const id of [...pending]) {
      const check = selected.get(id) as PlannedCheck;
      const entry = records.get(id) as CheckRecord;
      const failed = check.prerequisites.filter((prerequisite) => finished.has(prerequisite) && records.get(prerequisite)?.status !== 'passed');
      if (failed.length > 0 || cancellation() || performance.now() >= deadlineAt) {
        pending.splice(pending.indexOf(id), 1);
        finished.add(id);
        if (failed.length > 0) {
          entry.status = 'blocked';
          entry.blockedBy = failed;
          entry.reason = `blocked by ${failed.map((prerequisite) => `${prerequisite} (${records.get(prerequisite)?.status})`).join(', ')}`;
        } else {
          entry.status = 'not_run';
          entry.reason = cancellation() ? `the run was cancelled by ${cancellation()} before it started` : 'the overall deadline expired before it started';
        }
        continue;
      }
      const ready = check.prerequisites.every((prerequisite) => records.get(prerequisite)?.status === 'passed');
      // An ordering, not a prerequisite: it writes outputs these read, so it waits for them to finish however they end.
      const waiting = check.after.some((earlier) => selected.has(earlier) && !finished.has(earlier));
      if (!ready || waiting || running.size >= concurrency || check.locks.some((lock) => held.has(lock))) continue;
      pending.splice(pending.indexOf(id), 1);
      start(check);
    }
    if (running.size === 0) {
      if (pending.length === 0) break;
      // Nothing runs and nothing can start: a prerequisite outside the executable set never resolves.
      for (const id of pending) {
        const entry = records.get(id) as CheckRecord;
        const check = selected.get(id) as PlannedCheck;
        entry.status = 'blocked';
        entry.blockedBy = check.prerequisites.filter((prerequisite) => records.get(prerequisite)?.status !== 'passed');
        entry.reason = `blocked by ${entry.blockedBy.join(', ')}, which never passed`;
      }
      pending.length = 0;
      break;
    }
    await new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', done);
        resolve();
      };
      const timer = setTimeout(done, Math.max(0, deadlineAt - performance.now()));
      options.signal?.addEventListener('abort', done, { once: true });
      void Promise.race(running.values()).then(done);
    });
    await sleep(0);
  }

  return finish();
}

function summarize(report: Report): string {
  const counts = Object.entries(report.counts)
    .filter(([, count]) => count > 0)
    .map(([state, count]) => `${count} ${state}`)
    .join(', ');
  const why =
    report.status === 'passed'
      ? 'every required check passed with coverage evidence for the captured snapshot'
      : report.status === 'failed'
        ? 'at least one executed check proved a validation failure'
        : report.status === 'cancelled'
          ? `cancelled by ${report.cancellation}; results reached before cancellation are kept`
          : report.source.capture.status === 'failed'
            ? `the source could not be captured: ${report.source.capture.reason}`
            : report.source.sourceChanged
              ? 'the checkout changed during the run, so results describe the captured snapshot only'
              : 'at least one required check did not pass, and nothing failed validation';
  return `${report.status} (exit ${report.exit}): ${why}. Checks: ${counts || 'none'}.`;
}

export function formatReport(report: Report): string {
  const lines: string[] = [];
  lines.push(`verify ${report.scope.requested}: ${report.summary}`);
  if (report.scope.note) lines.push(`  ${report.scope.note}`);
  lines.push(`run ${report.runId}: ${report.directory.run}`);
  const { capture, identity, completion } = report.source;
  lines.push(`source: ${capture.status} in ${capture.attempts} attempt(s)${capture.reason ? ` (${capture.reason})` : ''}`);
  if (identity) {
    lines.push(`  manifest sha256 ${identity.manifest.digest} over ${identity.manifest.files} files, ${identity.manifest.bytes} bytes; HEAD ${identity.head ?? 'none'}; index ${identity.index.digest}`);
    lines.push(`  dirty: ${'unknown' in identity.status ? `unknown (${identity.status.unknown})` : `${identity.status.length} path(s)`}; excluded: ${identity.exclusions.map((e) => e.pattern).join(', ')}`);
  }
  if (completion) lines.push(`  at completion: ${completion.status}${completion.reason ? ` (${completion.reason})` : ''}`);
  lines.push(`preparation: ${report.preparation.status}: ${report.preparation.reason}${report.preparation.durationMs !== null ? ` in ${Math.round(report.preparation.durationMs)}ms` : ''}`);
  const probed = report.prerequisites.filter((p) => p.status !== 'not_probed');
  if (probed.length > 0) lines.push(`prerequisites: ${probed.map((p) => `${p.need} ${p.status}${p.detail ? ` (${p.detail})` : ''}`).join('; ')}`);
  lines.push(`checks (${report.checks.length}):`);
  for (const entry of report.checks) {
    lines.push(`  ${entry.id}: ${entry.status}${entry.failure ? ` [${entry.failure.kind}]` : ''} — ${entry.reason}`);
    if (entry.executed.length + entry.expected.length > 0) lines.push(`    coverage: ${entry.executed.length} executed of ${entry.expected.length} expected`);
    if (entry.blockedBy.length > 0) lines.push(`    blocked by: ${entry.blockedBy.join(', ')}`);
    for (const failure of entry.failure?.failures ?? []) lines.push(`    failure: ${failure}`);
    for (const server of entry.servers) lines.push(`    server ${server.url || 'none'} (${server.attempts.map((a) => `${a.port}: ${a.outcome}`).join('; ')})`);
    for (const path of entry.evidence) lines.push(`    evidence ${path}`);
    for (const path of entry.missingEvidence) lines.push(`    missing evidence ${path}`);
  }
  for (const run of report.abandonedRuns) lines.push(`earlier run ${run.runId} (${run.directory}): ${run.state}; its partial files are not evidence`);
  for (const error of report.cleanup.errors) lines.push(`cleanup: ${error}`);
  lines.push(`report: ${join(report.directory.run, report.directory.report)}`);
  return lines.join('\n');
}
