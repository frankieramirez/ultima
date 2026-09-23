/**
 * Runs one command workload under one cache condition and writes its raw samples.
 *
 *   node --experimental-strip-types scripts/measure/commands.ts \
 *     --workload dialog-edit --cache cold --runs 5 --out <dir>
 *
 * Cold clears COLD_PATHS before every sample. Warm runs one unmeasured priming sample
 * first and clears nothing. Each phase is a fresh process group. A failing or timed-out
 * phase makes its sample failed, kept with its reason and never counted as valid; the
 * remaining phases still run so their costs stay visible.
 */
import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';

import { environment, runnerClass, sourceIdentity } from './identity.ts';
import { SCHEMA_VERSION, summarizeCommand, type PhaseSample, type Sample, type Series } from './protocol.ts';
import { COLD_PATHS, RETAINED, workload, type Phase } from './workloads.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

const { values } = parseArgs({
  options: {
    workload: { type: 'string' },
    cache: { type: 'string' },
    runs: { type: 'string', default: '5' },
    'max-attempts': { type: 'string' },
    'phase-timeout-min': { type: 'string', default: '45' },
    out: { type: 'string' },
  },
});

if (!values.workload || !values.out || (values.cache !== 'cold' && values.cache !== 'warm')) {
  console.error('usage: commands.ts --workload <id> --cache cold|warm --out <dir> [--runs 5]');
  process.exit(2);
}

const target = workload(values.workload);
if (target.samplesFrom) {
  console.error(`${target.id} takes its samples from ${target.samplesFrom}; measure that workload instead`);
  process.exit(2);
}
const cache = values.cache;
const runs = Number(values.runs);
const maxAttempts = Number(values['max-attempts'] ?? runs * 2);
const phaseTimeoutMs = Number(values['phase-timeout-min']) * 60_000;
const out = resolve(values.out);
const logs = join(out, 'logs');
mkdirSync(logs, { recursive: true });

function ignored(path: string): boolean {
  try {
    execFileSync('git', ['check-ignore', '-q', path], { cwd: root });
    return true;
  } catch {
    return false;
  }
}

function expand(pattern: string): string[] {
  if (!pattern.includes('*')) return existsSync(join(root, pattern)) ? [pattern] : [];
  const dir = dirname(pattern);
  const suffix = pattern.slice(pattern.lastIndexOf('*') + 1);
  if (!existsSync(join(root, dir))) return [];
  return readdirSync(join(root, dir))
    .filter((name) => name.endsWith(suffix))
    .map((name) => `${dir}/${name}`);
}

function clearCold(): string[] {
  const cleared: string[] = [];
  for (const path of COLD_PATHS.flatMap(expand)) {
    if (!ignored(path)) throw new Error(`refusing to clear ${path}: it is not gitignored`);
    rmSync(join(root, path), { recursive: true, force: true });
    cleared.push(path);
  }
  return cleared;
}

function runPhase(phase: Phase, runId: string, tmp: string): Promise<PhaseSample> {
  const log = join(logs, runId, `${phase.id}.log`);
  mkdirSync(dirname(log), { recursive: true });
  const stream = createWriteStream(log);
  const started = performance.now();
  return new Promise((done) => {
    const child = spawn(phase.argv[0]!, phase.argv.slice(1), {
      cwd: join(root, phase.cwd),
      env: { ...process.env, TMPDIR: tmp, FORCE_COLOR: '0' },
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
    }, phaseTimeoutMs);
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

async function sample(runId: string, order: number, clear: boolean): Promise<Sample & { cleared: string[] }> {
  const cleared = clear ? clearCold() : [];
  const tmp = join(out, 'tmp', runId);
  mkdirSync(tmp, { recursive: true });
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const phases: PhaseSample[] = [];
  let failure: string | null = null;
  let timedOut = false;
  for (const phase of target.phases) {
    process.stderr.write(`[${runId}] ${phase.id} …\n`);
    const result = await runPhase(phase, runId, tmp);
    phases.push(result);
    process.stderr.write(`[${runId}] ${phase.id} ${result.exitCode === 0 ? 'ok' : 'FAILED'} ${(result.elapsedMs / 1000).toFixed(1)}s\n`);
    // Later phases still run so their times stay visible, but the sample stays failed.
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
  };
}

const env = environment(root);
const before = sourceIdentity(root);
const series: Series = {
  conditions: {
    workload: target.id,
    workloadVersion: target.version,
    cache,
    runnerClass: runnerClass(env),
    harnessHash: before.harnessSha256,
    fixtureHash: null,
  },
  samples: [],
};

let priming: (Sample & { cleared: string[] }) | null = null;
if (cache === 'warm') priming = await sample(`${target.id}-warm-priming`, -1, false);

let attempt = 0;
while (series.samples.filter((s) => s.status === 'valid').length < runs && attempt < maxAttempts) {
  series.samples.push(await sample(`${target.id}-${cache}-${attempt + 1}`, attempt, cache === 'cold'));
  attempt += 1;
}

const after = sourceIdentity(root);
const sourceChanged = before.sourceManifestSha256 !== after.sourceManifestSha256;
const report = {
  schemaVersion: SCHEMA_VERSION,
  kind: 'command-series',
  workload: target,
  conditions: series.conditions,
  source: before,
  sourceChanged,
  environment: { ...env, loadAverageAtEnd: (await import('node:os')).loadavg() },
  cachePolicy: {
    condition: cache,
    coldPaths: COLD_PATHS,
    retained: RETAINED,
    priming: cache === 'warm' ? 'one unmeasured run immediately before the batch' : 'none',
    tmpdir: 'a run-owned TMPDIR per sample, removed afterwards',
  },
  concurrency: 'one workload at a time; phases run serially; the host is a shared workstation',
  priming,
  samples: series.samples,
  summary: sourceChanged ? { status: 'incomplete', reason: 'source changed during the batch' } : summarizeCommand(series, runs),
  budget: 'report-only',
};
writeFileSync(join(out, `${target.id}.${cache}.json`), `${JSON.stringify(report, null, 2)}\n`);
rmSync(join(out, 'tmp'), { recursive: true, force: true });
console.log(JSON.stringify(report.summary));
