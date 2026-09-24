/**
 * Runs one command workload under one cache condition against a baseline and a
 * candidate checkout, alternating which goes first in each pair, and writes one series
 * per side in the commands.ts format.
 *
 *   node --experimental-strip-types scripts/measure/pair.ts \
 *     --baseline <checkout> --candidate <checkout> --workload dialog-edit --cache cold \
 *     --out <dir> [--runs 5] [--batch 1]
 *
 * Both checkouts must carry byte-identical harness trees. Pair 1 runs baseline then
 * candidate, pair 2 candidate then baseline, and so on. A workload the baseline cannot
 * run (a candidate-only command) runs on the candidate alone, and the baseline side is
 * written as unavailable with its reason: new coverage has no same-coverage comparison.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { sourceIdentity } from './identity.ts';
import { SCHEMA_VERSION } from './protocol.ts';
import { environment, sample, seriesReport, type RecordedSample } from './sampler.ts';
import { unsupportedReason, workload } from './workloads.ts';

const { values } = parseArgs({
  options: {
    baseline: { type: 'string' },
    candidate: { type: 'string' },
    workload: { type: 'string' },
    cache: { type: 'string' },
    runs: { type: 'string', default: '5' },
    batch: { type: 'string', default: '1' },
    'max-attempts': { type: 'string' },
    'phase-timeout-min': { type: 'string', default: '45' },
    out: { type: 'string' },
  },
});

if (!values.baseline || !values.candidate || !values.workload || !values.out || (values.cache !== 'cold' && values.cache !== 'warm')) {
  console.error('usage: pair.ts --baseline <dir> --candidate <dir> --workload <id> --cache cold|warm --out <dir> [--runs 5] [--batch 1]');
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
const batch = Number(values.batch);

type Side = {
  name: 'baseline' | 'candidate';
  root: string;
  out: string;
  unsupported: string | null;
  before: ReturnType<typeof sourceIdentity>;
  env: ReturnType<typeof environment>;
  priming: RecordedSample | null;
  samples: RecordedSample[];
};

const sides: Side[] = (['baseline', 'candidate'] as const).map((name) => {
  const root = resolve(values[name]!);
  const sideOut = join(out, name, 'commands');
  mkdirSync(join(sideOut, 'logs'), { recursive: true });
  return { name, root, out: sideOut, unsupported: unsupportedReason(root, target), before: sourceIdentity(root), env: environment(root), priming: null, samples: [] };
});
const [baseline, candidate] = sides as [Side, Side];
if (baseline.before.harnessSha256 !== candidate.before.harnessSha256) {
  console.error(`harness trees differ: baseline ${baseline.before.harnessSha256}, candidate ${candidate.before.harnessSha256}`);
  process.exit(2);
}
if (candidate.unsupported) {
  console.error(`${target.id} is unavailable at the candidate: ${candidate.unsupported}`);
  process.exit(2);
}
const active = sides.filter((side) => side.unsupported === null);

const run = (side: Side, runId: string, order: number, clear: boolean) =>
  sample({ root: side.root, workload: target, out: side.out, runId, order, clear, phaseTimeoutMs, label: side.name });

if (cache === 'warm') {
  for (const side of active) side.priming = await run(side, `${target.id}-warm-priming`, -1, false);
}

const validCount = (side: Side) => side.samples.filter((s) => s.status === 'valid').length;
const sequence: { pair: number; first: string }[] = [];
for (let pair = 0; pair < maxAttempts && active.some((side) => validCount(side) < runs); pair += 1) {
  const ordered = pair % 2 === 0 ? active : [...active].reverse();
  sequence.push({ pair: pair + 1, first: ordered[0]!.name });
  for (const side of ordered) {
    if (validCount(side) >= runs) continue;
    const order = side.samples.length;
    side.samples.push(await run(side, `${target.id}-${cache}-${order + 1}`, order, cache === 'cold'));
  }
}

const rule = 'pair 1 runs the baseline first, pair 2 the candidate first, alternating; a side with enough valid runs sits out later pairs';

for (const side of sides) {
  const file = join(side.out, `${target.id}.${cache}.json`);
  if (side.unsupported) {
    writeFileSync(
      file,
      `${JSON.stringify(
        {
          schemaVersion: SCHEMA_VERSION,
          kind: 'command-series',
          workload: target,
          source: side.before,
          summary: { status: 'unavailable', reason: side.unsupported },
          budget: 'report-only',
        },
        null,
        2,
      )}\n`,
    );
    continue;
  }
  const report = seriesReport({
    root: side.root,
    workload: target,
    cache,
    runs,
    env: side.env,
    before: side.before,
    priming: side.priming,
    samples: side.samples,
    concurrency: `paired with the ${side === baseline ? 'candidate' : 'baseline'} checkout, one sample at a time; phases run serially; the host is a shared workstation`,
    pairing: { batch, rule, sequence },
  });
  writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  rmSync(join(side.out, 'tmp'), { recursive: true, force: true });
  console.log(`${side.name} ${JSON.stringify(report.summary)}`);
}
