/**
 * One command sample against one checkout: clear the application-cold inputs when
 * asked, then run every phase of a workload as a fresh process group. Shared by
 * commands.ts (one side) and pair.ts (baseline and candidate, alternating), so both
 * record a sample the same way.
 */
import { execFileSync, spawn } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { loadavg } from 'node:os';
import { dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';

import { environment, plainEnvironment, runnerClass, sourceIdentity, type Environment, type SourceIdentity } from './identity.ts';
import { SCHEMA_VERSION, summarizeCommand, type PhaseSample, type Sample, type Series } from './protocol.ts';
import { COLD_PATHS, RETAINED, type Phase, type Workload } from './workloads.ts';

export type RecordedSample = Sample & { cleared: string[]; loadAverage: number[] };

function ignored(root: string, path: string): boolean {
  try {
    execFileSync('git', ['check-ignore', '-q', path], { cwd: root });
    return true;
  } catch {
    return false;
  }
}

function expand(root: string, pattern: string): string[] {
  if (!pattern.includes('*')) return existsSync(join(root, pattern)) ? [pattern] : [];
  const dir = dirname(pattern);
  const suffix = pattern.slice(pattern.lastIndexOf('*') + 1);
  if (!existsSync(join(root, dir))) return [];
  return readdirSync(join(root, dir))
    .filter((name) => name.endsWith(suffix))
    .map((name) => `${dir}/${name}`);
}

export function clearCold(root: string): string[] {
  const cleared: string[] = [];
  for (const path of COLD_PATHS.flatMap((pattern) => expand(root, pattern))) {
    if (!ignored(root, path)) throw new Error(`refusing to clear ${path}: it is not gitignored`);
    rmSync(join(root, path), { recursive: true, force: true });
    cleared.push(path);
  }
  return cleared;
}

function runPhase(root: string, phase: Phase, logs: string, runId: string, tmp: string, timeoutMs: number): Promise<PhaseSample> {
  const log = join(logs, runId, `${phase.id}.log`);
  mkdirSync(dirname(log), { recursive: true });
  const stream = createWriteStream(log);
  const started = performance.now();
  return new Promise((done) => {
    const child = spawn(phase.argv[0]!, phase.argv.slice(1), {
      cwd: join(root, phase.cwd),
      env: { ...plainEnvironment(), TMPDIR: tmp },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });
    child.stdout.pipe(stream, { end: false });
    child.stderr.pipe(stream, { end: false });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid!, 'SIGTERM');
      } catch {}
    }, timeoutMs);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const elapsedMs = performance.now() - started;
      stream.end(() => {
        writeFileSync(`${log}.gz`, gzipSync(readFileSync(log)));
        rmSync(log);
        done({
          id: phase.id,
          elapsedMs,
          exitCode: code,
          signal: timedOut ? 'timeout' : signal,
          log: `logs/${runId}/${phase.id}.log.gz`,
        });
      });
    });
  });
}

export type SampleOptions = {
  root: string;
  workload: Workload;
  out: string;
  runId: string;
  order: number;
  clear: boolean;
  phaseTimeoutMs: number;
  label?: string;
};

/**
 * A failing or timed-out phase makes the sample failed, kept with its reason and never
 * counted as valid; the remaining phases still run so their costs stay visible.
 */
export async function sample(options: SampleOptions): Promise<RecordedSample> {
  const { root, workload, out, runId, order } = options;
  const cleared = options.clear ? clearCold(root) : [];
  const tmp = join(out, 'tmp', runId);
  mkdirSync(tmp, { recursive: true });
  const startedAt = new Date().toISOString();
  const loadAverage = loadavg();
  const started = performance.now();
  const phases: PhaseSample[] = [];
  let failure: string | null = null;
  let timedOut = false;
  const tag = options.label ? `${options.label} ${runId}` : runId;
  for (const phase of workload.phases) {
    process.stderr.write(`[${tag}] ${phase.id} …\n`);
    const result = await runPhase(root, phase, join(out, 'logs'), runId, tmp, options.phaseTimeoutMs);
    phases.push(result);
    process.stderr.write(`[${tag}] ${phase.id} ${result.exitCode === 0 ? 'ok' : 'FAILED'} ${(result.elapsedMs / 1000).toFixed(1)}s\n`);
    if (result.exitCode !== 0 && failure === null) {
      timedOut = result.signal === 'timeout';
      failure = `${phase.id} ${timedOut ? 'timed out' : `exited ${result.exitCode ?? result.signal}`}`;
    }
  }
  const elapsedMs = performance.now() - started;
  rmSync(tmp, { recursive: true, force: true });
  return {
    runId,
    order,
    startedAt,
    elapsedMs,
    status: failure ? (timedOut ? 'timeout' : 'failed') : 'valid',
    ...(failure ? { reason: failure } : {}),
    phases,
    cleared,
    loadAverage,
  };
}

/** The series file both runners write: conditions, identity, cache policy, raw samples and summary. */
export function seriesReport(options: {
  root: string;
  workload: Workload;
  cache: 'cold' | 'warm';
  runs: number;
  env: Environment;
  before: SourceIdentity;
  priming: RecordedSample | null;
  samples: RecordedSample[];
  concurrency: string;
  pairing?: Record<string, unknown>;
}) {
  const { root, workload, cache, env, before, runs } = options;
  const after = sourceIdentity(root);
  const sourceChanged = before.sourceManifestSha256 !== after.sourceManifestSha256;
  const series: Series = {
    conditions: {
      workload: workload.id,
      workloadVersion: workload.version,
      cache,
      runnerClass: runnerClass(env),
      harnessHash: before.harnessSha256,
      fixtureHash: null,
    },
    samples: options.samples,
  };
  return {
    schemaVersion: SCHEMA_VERSION,
    kind: 'command-series',
    workload,
    conditions: series.conditions,
    source: before,
    sourceChanged,
    environment: { ...env, loadAverageAtEnd: loadavg() },
    cachePolicy: {
      condition: cache,
      coldPaths: COLD_PATHS,
      retained: RETAINED,
      priming: cache === 'warm' ? 'one unmeasured run immediately before the batch' : 'none',
      tmpdir: 'a run-owned TMPDIR per sample, removed afterwards',
    },
    concurrency: options.concurrency,
    ...(options.pairing ? { pairing: options.pairing } : {}),
    priming: options.priming,
    samples: series.samples,
    summary: sourceChanged ? { status: 'incomplete', reason: 'source changed during the batch' } : summarizeCommand(series, runs),
    budget: 'report-only',
  };
}

export { environment };
