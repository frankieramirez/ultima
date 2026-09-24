/**
 * Joins a paired evidence directory into the machine-readable comparison and the
 * human results beside it. It reads only the raw series: a missing, incomplete or
 * mismatched side is unavailable, never a pass or a zero change.
 *
 *   node --experimental-strip-types scripts/measure/compare.ts --dir <evidence dir>
 *
 * Layout read from <dir>:
 *   batch-<n>/{baseline,candidate}/commands/<workload>.<cache>.json   (pair.ts)
 *   studio/{baseline,candidate}/<cell>/studio.json[.gz]               (studio.ts, one cell each)
 *   exercises/<exercise>-<side>-<attempt>.json                        (exercise.ts)
 *   discovery.json                                                    (discover.ts)
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { gunzipSync } from 'node:zlib';

import {
  compareInteraction,
  compareSeries,
  median,
  SCHEMA_VERSION,
  type CommandSummary,
  type Comparison,
  type InteractionSummary,
  type Sample,
  type Series,
} from './protocol.ts';
import { NEW_WORKLOADS, WORKLOADS, type Workload } from './workloads.ts';

const { values } = parseArgs({ options: { dir: { type: 'string' } } });
if (!values.dir) {
  console.error('usage: compare.ts --dir <evidence dir>');
  process.exit(2);
}
const dir = resolve(values.dir);
const readMaybeGzip = (path: string) => {
  const raw = readFileSync(path);
  return JSON.parse((path.endsWith('.gz') ? gunzipSync(raw) : raw).toString('utf8'));
};
const seconds = (ms: number | null | undefined) => (ms === null || ms === undefined ? '–' : (ms / 1000).toFixed(1));
const millis = (ms: number | null | undefined) => (ms === null || ms === undefined ? '–' : ms.toFixed(1));
const signed = (ms: number, unit: (ms: number) => string) => `${ms > 0 ? '+' : ms < 0 ? '−' : '±'}${unit(Math.abs(ms))}`;

type CommandFile = Series & {
  workload: Workload;
  source: { commit: string; harnessSha256: string; dirtyPatchSha256: string | null; sourceManifestSha256: string | null };
  summary: CommandSummary | { status: 'incomplete' | 'unavailable'; reason: string };
  samples: (Sample & { loadAverage?: number[] })[];
  environment?: Record<string, unknown>;
};

const batches = readdirSync(dir)
  .filter((name) => /^batch-\d+$/.test(name))
  .sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)));

function readSeries(batch: string, side: 'baseline' | 'candidate', id: string, cache: string): CommandFile | undefined {
  const file = join(dir, batch, side, 'commands', `${id}.${cache}.json`);
  return existsSync(file) ? (readMaybeGzip(file) as CommandFile) : undefined;
}

const asSeries = (file: CommandFile | undefined): Series | undefined =>
  file && file.summary.status !== 'unavailable' && file.conditions ? { conditions: file.conditions, samples: file.samples } : undefined;

/* ---------- same-command comparisons ---------- */

type Row = { workload: string; cache: string; batch: string; baseline: unknown; candidate: unknown; comparison: Comparison };
const sameCommand: Row[] = [];
for (const workload of WORKLOADS) {
  const sourceId = workload.samplesFrom ?? workload.id;
  for (const cache of ['cold', 'warm']) {
    const recorded = batches.filter((batch) => readSeries(batch, 'baseline', sourceId, cache) || readSeries(batch, 'candidate', sourceId, cache));
    if (recorded.length === 0) {
      sameCommand.push({ workload: workload.id, cache, batch: '–', baseline: null, candidate: null, comparison: { status: 'unavailable', reason: 'no paired series recorded' } });
      continue;
    }
    for (const batch of recorded) {
      const baseline = readSeries(batch, 'baseline', sourceId, cache);
      const candidate = readSeries(batch, 'candidate', sourceId, cache);
      sameCommand.push({
        workload: workload.id,
        cache,
        batch,
        baseline: baseline ? { file: `${batch}/baseline/commands/${sourceId}.${cache}.json`, summary: baseline.summary } : null,
        candidate: candidate ? { file: `${batch}/candidate/commands/${sourceId}.${cache}.json`, summary: candidate.summary } : null,
        comparison: compareSeries(asSeries(baseline), asSeries(candidate)),
      });
    }
  }
}

/** The screen's verdict over batches: a first inconclusive batch is repeated once, and the repeat decides only if it agrees. */
function screened(rows: Row[]): { status: string; reason: string } {
  const [first, repeat] = rows;
  if (!first) return { status: 'unavailable', reason: 'no batch' };
  if (first.comparison.status !== 'inconclusive') return { status: first.comparison.status, reason: `${first.batch}: ${first.comparison.reason}` };
  if (!repeat) return { status: 'inconclusive', reason: `${first.batch} inconclusive and not yet repeated` };
  if (repeat.comparison.status === 'inconclusive' || repeat.comparison.status === 'unavailable') {
    return { status: 'inconclusive', reason: `${first.batch} and the repeat ${repeat.batch} both inconclusive or unavailable: advisory only, no measured change` };
  }
  return { status: 'unstable', reason: `${first.batch} inconclusive, the repeat ${repeat.batch} ${repeat.comparison.status}: the batches disagree, so no change is claimed` };
}

const verdicts = WORKLOADS.flatMap((workload) =>
  ['cold', 'warm'].map((cache) => ({ workload: workload.id, cache, ...screened(sameCommand.filter((row) => row.workload === workload.id && row.cache === cache)) })),
);

/* ---------- new coverage: candidate-only workloads ---------- */

const newCoverage = NEW_WORKLOADS.flatMap((workload) =>
  (workload.cacheIndependent ? ['cold'] : ['cold', 'warm']).map((cache) => {
    const batch = batches.find((name) => readSeries(name, 'candidate', workload.id, cache));
    const candidate = batch ? readSeries(batch, 'candidate', workload.id, cache) : undefined;
    const baseline = batch ? readSeries(batch, 'baseline', workload.id, cache) : undefined;
    return {
      workload: workload.id,
      title: workload.title,
      cache,
      comparesWith: workload.comparesWith ?? null,
      file: candidate ? `${batch}/candidate/commands/${workload.id}.${cache}.json` : null,
      candidate: candidate?.summary ?? { status: 'unavailable', reason: 'no series recorded' },
      baseline: baseline?.summary ?? { status: 'unavailable', reason: 'the command does not exist at the baseline' },
      phases: candidate ? phaseMedians(candidate) : [],
      cacheIndependent: workload.cacheIndependent ?? null,
      coverage: workload.coverage,
    };
  }),
);

function phaseMedians(file: CommandFile) {
  return file.workload.phases.map((phase) => {
    const runs = file.samples.flatMap((s) => s.phases?.filter((p) => p.id === phase.id) ?? []);
    const ok = runs.filter((p) => p.exitCode === 0).map((p) => p.elapsedMs);
    return { id: phase.id, argv: phase.argv, succeeded: ok.length, runs: runs.length, medianMs: ok.length ? median(ok) : null };
  });
}

/* ---------- Studio ---------- */

type StudioFile = {
  conditions: { runnerClass: string; harnessHash: string; fixtureHash: string };
  source: { commit: string };
  build: { distSha256: string; setupMs: number | null };
  cells: {
    cell: { id: string };
    sessions: { sessionId: string; firstNavigationMs: number; priming: { durationMs: number | null }[] }[];
    summaries: Record<string, InteractionSummary>;
  }[];
};
function readStudio(side: string, cell: string): StudioFile | undefined {
  const base = join(dir, 'studio', side, cell);
  const file = ['studio.json', 'studio.json.gz'].map((name) => join(base, name)).find(existsSync);
  return file ? (readMaybeGzip(file) as StudioFile) : undefined;
}
const CELLS = ['dark-desktop', 'light-desktop', 'dark-narrow', 'light-narrow'];
const studio = CELLS.map((cellId) => {
  const baseline = readStudio('baseline', cellId);
  const candidate = readStudio('candidate', cellId);
  const b = baseline?.cells.find((c) => c.cell.id === cellId);
  const c = candidate?.cells.find((x) => x.cell.id === cellId);
  const mismatch =
    baseline && candidate
      ? (['runnerClass', 'harnessHash', 'fixtureHash'] as const).filter((key) => baseline.conditions[key] !== candidate.conditions[key])
      : [];
  const interactions = Object.keys(c?.summaries ?? b?.summaries ?? {}).map((id) => ({
    interaction: id,
    baseline: b?.summaries[id] ? pick(b.summaries[id]!) : null,
    candidate: c?.summaries[id] ? pick(c.summaries[id]!) : null,
    comparison: mismatch.length
      ? ({ status: 'unavailable', reason: `conditions differ: ${mismatch.join(', ')}` } as Comparison)
      : compareInteraction(b?.summaries[id], c?.summaries[id]),
  }));
  return {
    cell: cellId,
    baseline: baseline ? { commit: baseline.source.commit, distSha256: baseline.build.distSha256, buildMs: baseline.build.setupMs } : null,
    candidate: candidate ? { commit: candidate.source.commit, distSha256: candidate.build.distSha256, buildMs: candidate.build.setupMs } : null,
    firstNavigationMs: { baseline: b?.sessions.map((s) => s.firstNavigationMs) ?? null, candidate: c?.sessions.map((s) => s.firstNavigationMs) ?? null },
    firstInteractionMs: {
      baseline: b?.sessions.map((s) => s.priming[0]?.durationMs ?? null) ?? null,
      candidate: c?.sessions.map((s) => s.priming[0]?.durationMs ?? null) ?? null,
    },
    interactions,
  };
});
function pick(summary: InteractionSummary) {
  return { status: summary.status, missing: summary.missing, sessionMedian: summary.sessionMedian, sessionP95: summary.sessionP95, sessions: summary.sessions };
}

/* ---------- exercises and discovery ---------- */

type Exercise = {
  exercise: string;
  attempt: number;
  revision: string;
  failure?: string;
  pairing: { side: string; position: string | null } | null;
  session?: Record<string, any>;
  observation?: Record<string, any>;
  score?: Record<string, any>;
};
const exerciseFiles = existsSync(join(dir, 'exercises'))
  ? readdirSync(join(dir, 'exercises')).filter((name) => name.endsWith('.json')).sort()
  : [];
const exercises = exerciseFiles.map((name) => ({ file: `exercises/${name}`, ...(readMaybeGzip(join(dir, 'exercises', name)) as Exercise) }));
const discovery = existsSync(join(dir, 'discovery.json')) ? readMaybeGzip(join(dir, 'discovery.json')) : null;

/* ---------- write ---------- */

const anyCandidate = batches.map((batch) => readdirSync(join(dir, batch, 'candidate', 'commands')).find((n) => n.endsWith('.json'))).find(Boolean);
const anyBaseline = batches.map((batch) => readdirSync(join(dir, batch, 'baseline', 'commands')).find((n) => n.endsWith('.json'))).find(Boolean);
const identity = (side: 'baseline' | 'candidate', name: string | undefined) => {
  if (!name) return null;
  const batch = batches.find((b) => existsSync(join(dir, b, side, 'commands', name)))!;
  const file = readMaybeGzip(join(dir, batch, side, 'commands', name)) as CommandFile;
  return { source: file.source, environment: file.environment ?? null, runnerClass: file.conditions?.runnerClass ?? null };
};

writeFileSync(
  join(dir, 'comparison.json'),
  `${JSON.stringify(
    {
      schemaVersion: SCHEMA_VERSION,
      kind: 'performance-comparison',
      comparator: 'paired alternating batches; the median of paired differences screened against the larger MAD, repeated once when inconclusive',
      budget: 'report-only: timing is advisory and gates nothing',
      baseline: identity('baseline', anyBaseline),
      candidate: identity('candidate', anyCandidate),
      batches,
      sameCommand,
      verdicts,
      newCoverage,
      studio,
      exercises: exercises.map(({ file, exercise, attempt, pairing, failure, score }) => ({ file, exercise, attempt, pairing, failure: failure ?? null, score: score ?? null })),
      discovery: discovery ? { file: 'discovery.json', met: discovery.met } : { status: 'unavailable' },
    },
    null,
    2,
  )}\n`,
);

const summaryCell = (summary: unknown) => {
  const s = summary as (CommandSummary & { reason?: string }) | null;
  if (!s) return 'unavailable';
  if (s.status !== 'measured') return `${s.status}${s.reason ? ` (${s.reason})` : ` (${s.valid}/${s.required} valid)`}`;
  return `${seconds(s.medianMs)} (${seconds(s.minMs)}–${seconds(s.maxMs)}, MAD ${seconds(s.madMs)})`;
};
const comparisonCell = (c: Comparison, unit: (ms: number) => string) =>
  c.status === 'unavailable' ? `unavailable: ${c.reason}` : `**${c.status}** ${signed(c.medianPairedDifferenceMs, unit)} (larger MAD ${unit(c.largerMadMs)}, ${c.pairs} pairs)`;

const lines = [
  '<!-- Generated by scripts/measure/compare.ts from the raw files in this directory. -->',
  '## Same-command comparisons',
  '',
  'Each row runs the identical argv on both revisions, five valid runs per side, alternating which side goes first. Values in seconds: median (range, MAD). The change is the median of paired differences, candidate minus baseline.',
  '',
  '| Workload | Cache | Batch | Baseline s | Candidate s | Change s |',
  '| --- | --- | --- | --- | --- | --- |',
  ...sameCommand.map(
    (row) =>
      `| ${row.workload} | ${row.cache} | ${row.batch} | ${summaryCell((row.baseline as { summary: unknown } | null)?.summary ?? null)} | ${summaryCell((row.candidate as { summary: unknown } | null)?.summary ?? null)} | ${comparisonCell(row.comparison, seconds)} |`,
  ),
  '',
  '### Verdicts after the noise screen',
  '',
  '| Workload | Cache | Verdict | Why |',
  '| --- | --- | --- | --- |',
  ...verdicts.map((v) => `| ${v.workload} | ${v.cache} | ${v.status} | ${v.reason} |`),
  '',
  '### Phases',
  '',
  'Median seconds of the successful runs of each phase, first batch.',
  '',
  '| Workload | Cache | Phase | Baseline | Candidate |',
  '| --- | --- | --- | --- | --- |',
  ...WORKLOADS.filter((w) => !w.samplesFrom).flatMap((workload) =>
    ['cold', 'warm'].flatMap((cache) => {
      const batch = batches[0];
      if (!batch) return [];
      const b = readSeries(batch, 'baseline', workload.id, cache);
      const c = readSeries(batch, 'candidate', workload.id, cache);
      if (!b || !c) return [];
      const bp = phaseMedians(b);
      const cp = phaseMedians(c);
      return bp.map((phase, i) => `| ${workload.id} | ${cache} | ${phase.id} | ${seconds(phase.medianMs)} (${phase.succeeded}/${phase.runs}) | ${seconds(cp[i]?.medianMs)} (${cp[i]?.succeeded}/${cp[i]?.runs}) |`);
    }),
  ),
  '',
  '## New coverage and selected scope',
  '',
  'Commands the candidate added. The baseline cannot run them, so none of these has a same-coverage comparison; each names the baseline workload it widens or selects from.',
  '',
  '| Workload | Cache | Candidate s | Widens or selects from | Phases (median s) |',
  '| --- | --- | --- | --- | --- |',
  ...newCoverage.map(
    (row) =>
      `| ${row.workload} | ${row.cache} | ${summaryCell(row.candidate)} | ${row.comparesWith ?? '–'} | ${row.phases.map((p) => `${p.id} ${seconds(p.medianMs)} (${p.succeeded}/${p.runs})`).join('; ') || '–'} |`,
  ),
  '',
  '## Studio interactions',
  '',
  'Application-observed update latency in ms, per cell: the median and range of the five session medians, and the median of the five session p95s. The change pairs sessions by index.',
  '',
  '| Cell | Interaction | Baseline median (range) | Baseline p95 | Candidate median (range) | Candidate p95 | Change ms |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  ...studio.flatMap((cell) =>
    cell.interactions.map((row) => {
      const fmt = (s: ReturnType<typeof pick> | null) =>
        !s ? 'unavailable' : s.status !== 'measured' ? `${s.status} (${s.missing} missing)` : `${millis(s.sessionMedian!.medianMs)} (${millis(s.sessionMedian!.minMs)}–${millis(s.sessionMedian!.maxMs)})`;
      const p95 = (s: ReturnType<typeof pick> | null) => (s?.sessionP95 ? millis(s.sessionP95.medianMs) : '–');
      return `| ${cell.cell} | ${row.interaction} | ${fmt(row.baseline)} | ${p95(row.baseline)} | ${fmt(row.candidate)} | ${p95(row.candidate)} | ${comparisonCell(row.comparison, millis)} |`;
    }),
  ),
  '',
  '### First navigation and first interaction',
  '',
  '| Cell | Baseline first navigation ms | Candidate first navigation ms | Baseline first interaction ms | Candidate first interaction ms |',
  '| --- | --- | --- | --- | --- |',
  ...studio.map(
    (cell) =>
      `| ${cell.cell} | ${cell.firstNavigationMs.baseline?.map(millis).join(', ') ?? '–'} | ${cell.firstNavigationMs.candidate?.map(millis).join(', ') ?? '–'} | ${cell.firstInteractionMs.baseline?.map(millis).join(', ') ?? '–'} | ${cell.firstInteractionMs.candidate?.map(millis).join(', ') ?? '–'} |`,
  ),
  '',
  '## Discovery exercises',
  '',
  '| Exercise | Side | Attempt | Position | Wall s | Turns | Searches | Files opened | verify list/describe | Owner | Command | Result |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...exercises
    .filter((e) => e.exercise !== 'stepper-add-remove')
    .map((e) =>
      e.failure
        ? `| ${e.exercise} | ${e.pairing?.side ?? '–'} | ${e.attempt} | ${e.pairing?.position ?? '–'} | harness failure: ${e.failure.slice(0, 80)} | | | | | | | |`
        : `| ${e.exercise} | ${e.pairing?.side} | ${e.attempt} | ${e.pairing?.position} | ${seconds(e.session?.wallMs)} | ${e.session?.turns ?? '–'} | ${e.observation?.searches.length} | ${e.observation?.filesOpened.length} | ${e.observation?.discoveryCommands?.length ?? 0} | ${e.score?.owner ? `\`${e.score.owner}\`` : '–'} ${e.score?.located ? '✓' : '✗'} | ${e.score?.check ? `\`${e.score.check.command}\` exit ${e.score.check.exitCode}` : '–'} | ${e.score?.success ? 'success' : 'failed'} |`,
    ),
  '',
  '## Synthetic component addition and removal',
  '',
  '| Side | Attempt | Position | Add wall s | Manual projection edits | Projections changed without a manual edit | Tooling commands | Authored files | Addition complete | Remove wall s | Removal clean |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...exercises
    .filter((e) => e.exercise === 'stepper-add-remove')
    .map((e) => {
      if (e.failure) return `| ${e.pairing?.side ?? '–'} | ${e.attempt} | ${e.pairing?.position ?? '–'} | harness failure: ${e.failure.slice(0, 80)} | | | | | | | |`;
      const a = e.observation!.addition;
      return `| ${e.pairing?.side} | ${e.attempt} | ${e.pairing?.position} | ${seconds(e.session?.add?.wallMs)} | ${a.manualProjectionEdits.length}${a.manualProjectionEdits.length ? ` (${a.manualProjectionEdits.map((x: string) => `\`${x.slice(0, 60)}\``).join(', ')})` : ''} | ${a.projectionsChangedWithoutManualEdit.map((f: string) => `\`${f}\``).join(', ') || '–'} | ${a.commandsRun.map((x: string) => `\`${x.slice(0, 50)}\``).join(', ') || '–'} | ${a.changedFiles.authored.length} | ${e.score?.additionComplete ? 'yes' : 'no'} | ${seconds(e.session?.remove?.wallMs)} | ${e.score?.removalClean ? 'yes' : 'no'} |`;
    }),
  '',
  '## Discovery through list and describe',
  '',
  ...(discovery
    ? [
        '| Prompt | Met | Top candidate | Checks | Discovery ms |',
        '| --- | --- | --- | --- | --- |',
        ...discovery.results.map(
          (r: { prompt: string; met: boolean; topCandidate: string; checks: Record<string, boolean>; discoveryMs: number }) =>
            `| ${r.prompt} | ${r.met ? 'yes' : 'no'} | ${r.topCandidate} | ${Object.entries(r.checks).map(([k, v]) => `${k} ${v ? '✓' : '✗'}`).join(', ')} | ${millis(r.discoveryMs)} |`,
        ),
      ]
    : ['Unavailable: no discovery proof recorded.']),
  '',
];
writeFileSync(join(dir, 'results.md'), `${lines.join('\n')}\n`);
console.log(`wrote comparison.json and results.md in ${dir}`);
