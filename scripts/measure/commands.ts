/**
 * Runs one command workload under one cache condition against this checkout and
 * writes its raw samples.
 *
 *   node --experimental-strip-types scripts/measure/commands.ts \
 *     --workload dialog-edit --cache cold --runs 5 --out <dir>
 *
 * Cold clears COLD_PATHS before every sample. Warm runs one unmeasured priming sample
 * first and clears nothing. pair.ts runs the same samples against two checkouts,
 * alternating which goes first.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { sourceIdentity } from './identity.ts';
import { environment, sample, seriesReport, type RecordedSample } from './sampler.ts';
import { unsupportedReason, workload } from './workloads.ts';

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
const unsupported = unsupportedReason(root, target);
if (unsupported) {
  console.error(`${target.id} is unavailable at this checkout: ${unsupported}`);
  process.exit(2);
}
const cache = values.cache;
const runs = Number(values.runs);
const maxAttempts = Number(values['max-attempts'] ?? runs * 2);
const phaseTimeoutMs = Number(values['phase-timeout-min']) * 60_000;
const out = resolve(values.out);
mkdirSync(join(out, 'logs'), { recursive: true });

const common = { root, workload: target, out, phaseTimeoutMs };
const env = environment(root);
const before = sourceIdentity(root);

const priming = cache === 'warm' ? await sample({ ...common, runId: `${target.id}-warm-priming`, order: -1, clear: false }) : null;
const samples: RecordedSample[] = [];
let attempt = 0;
while (samples.filter((s) => s.status === 'valid').length < runs && attempt < maxAttempts) {
  samples.push(await sample({ ...common, runId: `${target.id}-${cache}-${attempt + 1}`, order: attempt, clear: cache === 'cold' }));
  attempt += 1;
}

const report = seriesReport({
  root,
  workload: target,
  cache,
  runs,
  env,
  before,
  priming,
  samples,
  concurrency: 'one workload at a time; phases run serially; the host is a shared workstation',
});
writeFileSync(join(out, `${target.id}.${cache}.json`), `${JSON.stringify(report, null, 2)}\n`);
rmSync(join(out, 'tmp'), { recursive: true, force: true });
console.log(JSON.stringify(report.summary));
