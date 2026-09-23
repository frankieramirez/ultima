/**
 * Joins one evidence directory's raw series into the machine-readable baseline index
 * and the human report beside it. It summarizes only what the raw files hold: a
 * workload without a complete series reports its status, never a number.
 *
 *   node --experimental-strip-types scripts/measure/report.ts --dir <evidence dir>
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { median, SCHEMA_VERSION, type CommandSummary, type InteractionSummary, type Sample } from './protocol.ts';
import { WORKLOADS } from './workloads.ts';

const { values } = parseArgs({ options: { dir: { type: 'string' } } });
if (!values.dir) {
  console.error('usage: report.ts --dir <evidence dir>');
  process.exit(2);
}
const dir = resolve(values.dir);
const readJson = <T>(path: string): T => JSON.parse(readFileSync(join(dir, path), 'utf8')) as T;
const seconds = (ms: number | null | undefined) => (ms === null || ms === undefined ? '–' : (ms / 1000).toFixed(1));
const millis = (ms: number | null | undefined) => (ms === null || ms === undefined ? '–' : ms.toFixed(1));

type CommandSeries = {
  conditions: { runnerClass: string; harnessHash: string };
  source: { commit: string; harnessSha256: string; lockfileSha256: string; dirtyPatchSha256: string | null };
  environment: Record<string, unknown>;
  samples: (Sample & { cleared: string[] })[];
  summary: CommandSummary | { status: 'incomplete'; reason: string };
  priming: Sample | null;
};

const commandRows: string[] = [];
const phaseRows: string[] = [];
const index: Record<string, unknown>[] = [];
for (const workload of WORKLOADS) {
  const sourceId = workload.samplesFrom ?? workload.id;
  for (const cache of ['cold', 'warm']) {
    const file = `commands/${sourceId}.${cache}.json`;
    if (!existsSync(join(dir, file))) {
      index.push({ workload: workload.id, cache, status: 'unavailable', reason: 'no series recorded' });
      commandRows.push(`| ${workload.id} | ${cache} | unavailable | – | – | – | – | no series recorded |`);
      continue;
    }
    const series = readJson<CommandSeries>(file);
    const summary = series.summary;
    const failed = series.samples.filter((sample) => sample.status !== 'valid');
    const note = [
      workload.samplesFrom ? `samples from ${workload.samplesFrom}` : '',
      ...failed.map((sample) => `${sample.runId}: ${sample.reason}`),
    ]
      .filter(Boolean)
      .join('; ');
    index.push({ workload: workload.id, cache, series: file, samplesFrom: workload.samplesFrom ?? null, summary });
    const measured = 'medianMs' in summary ? summary : null;
    commandRows.push(
      `| ${workload.id} | ${cache} | ${summary.status} | ${measured ? `${measured.valid}/${measured.required}` : '–'} | ${seconds(measured?.medianMs)} | ${measured?.minMs == null ? '–' : `${seconds(measured.minMs)}–${seconds(measured.maxMs)}`} | ${seconds(measured?.madMs)} | ${note || '–'} |`,
    );
    if (workload.samplesFrom) continue;
    for (const phase of workload.phases) {
      const times = series.samples.flatMap((sample) => sample.phases?.filter((p) => p.id === phase.id) ?? []);
      const ok = times.filter((p) => p.exitCode === 0).map((p) => p.elapsedMs);
      phaseRows.push(
        `| ${workload.id} | ${cache} | ${phase.id} | \`${phase.argv.join(' ')}\` | ${ok.length}/${times.length} | ${ok.length ? seconds(median(ok)) : '–'} |`,
      );
    }
  }
}

type StudioReport = {
  label: string;
  conditions: Record<string, string>;
  build: Record<string, unknown>;
  protocol: { unavailable: string[]; supportedEntryTypes: string[]; sessions: number; repetitions: number };
  fixtures: Record<string, { sha256: string; overrides: number; failingPairings: number }>;
  cells: {
    cell: { id: string };
    trace: string | null;
    sessions: { sessionId: string; firstNavigationMs: number; priming: { interaction: string; durationMs: number | null }[] }[];
    summaries: Record<string, InteractionSummary>;
  }[];
};
const studioRows: string[] = [];
const firstRows: string[] = [];
let studio: StudioReport | null = null;
if (existsSync(join(dir, 'studio/studio.json'))) {
  studio = readJson<StudioReport>('studio/studio.json');
  for (const cell of studio.cells) {
    for (const [interaction, summary] of Object.entries(cell.summaries)) {
      studioRows.push(
        `| ${cell.cell.id} | ${interaction} | ${summary.status} | ${summary.sessions.reduce((n, s) => n + s.count, 0)} | ${millis(summary.sessionMedian?.medianMs)} | ${summary.sessionMedian ? `${millis(summary.sessionMedian.minMs)}–${millis(summary.sessionMedian.maxMs)}` : '–'} | ${millis(summary.sessionP95?.medianMs)} | ${summary.sessionP95 ? `${millis(summary.sessionP95.minMs)}–${millis(summary.sessionP95.maxMs)}` : '–'} | ${summary.missing} |`,
      );
    }
    const navigations = cell.sessions.map((session) => session.firstNavigationMs);
    const firstInteraction = cell.sessions.map((session) => session.priming[0]?.durationMs ?? null);
    firstRows.push(
      `| ${cell.cell.id} | ${navigations.map(millis).join(', ')} | ${firstInteraction.map(millis).join(', ')} | ${cell.trace ? `\`studio/${cell.trace}\`` : '–'} |`,
    );
  }
}

type Exercise = {
  exercise: string;
  attempt: number;
  failure?: string;
  session?: { model: string | null; durationMs?: number | null; wallMs?: number; turns?: number | null; add?: { wallMs: number }; remove?: { wallMs: number } };
  observation?: Record<string, any>;
  score?: Record<string, any>;
};
const exerciseRows: string[] = [];
const additionRows: string[] = [];
const exerciseFiles = existsSync(join(dir, 'exercises'))
  ? readdirSync(join(dir, 'exercises')).filter((name) => name.endsWith('.json')).sort()
  : [];
for (const name of exerciseFiles) {
  const record = readJson<Exercise>(`exercises/${name}`);
  if (record.failure) {
    exerciseRows.push(`| ${record.exercise} | ${record.attempt} | harness failure: ${record.failure.slice(0, 80)} | | | | | | |`);
    continue;
  }
  const o = record.observation ?? {};
  const s = record.score ?? {};
  if (record.exercise === 'stepper-add-remove') {
    additionRows.push(
      `| ${record.attempt} | ${record.session?.model} | ${seconds(record.session?.add?.wallMs)} | ${o.addition.changedFiles.wiring.length} (${o.addition.changedFiles.wiring.map((f: string) => `\`${f}\``).join(', ')}) | ${o.addition.editOperations.wiring} | ${o.addition.changedFiles.authored.length} | ${o.addition.editOperations.authored} | ${o.addition.failedCommands.length} | ${s.additionComplete ? 'yes' : 'no'} | ${seconds(record.session?.remove?.wallMs)} | ${s.removalClean ? 'yes' : 'no'} |`,
    );
    continue;
  }
  exerciseRows.push(
    `| ${record.exercise} | ${record.attempt} | ${record.session?.model} | ${seconds(record.session?.wallMs)} | ${o.searches.length} | ${o.filesOpened.length} | ${s.owner ? `\`${s.owner}\`` : '–'} ${s.located ? '✓' : '✗'} | ${s.check ? `\`${s.check.command}\` exit ${s.check.exitCode}` : '–'} | ${o.failedCommands.length} | ${s.success ? 'success' : 'failed'} |`,
  );
}

const inventory = existsSync(join(dir, 'inventory/index.json')) ? readJson<{ snapshots: Record<string, string> }>('inventory/index.json') : null;
const anySeries = index.find((entry) => 'series' in entry);
const identity = anySeries ? readJson<CommandSeries>(String(anySeries.series)) : null;

writeFileSync(
  join(dir, 'baseline.json'),
  `${JSON.stringify(
    {
      schemaVersion: SCHEMA_VERSION,
      kind: 'performance-baseline',
      comparator: null,
      budget: 'report-only: no budget is proposed until three independent complete batches exist on the intended runner class',
      source: identity?.source ?? null,
      environment: identity?.environment ?? null,
      runnerClass: identity?.conditions.runnerClass ?? null,
      commands: index,
      studio: studio ? { file: 'studio/studio.json', conditions: studio.conditions, fixtures: studio.fixtures } : { status: 'unavailable' },
      exercises: exerciseFiles.map((name) => `exercises/${name}`),
      inventory: inventory ? { file: 'inventory/index.json', snapshots: inventory.snapshots } : { status: 'unavailable' },
    },
    null,
    2,
  )}\n`,
);

const sections = [
  '<!-- Generated by scripts/measure/report.ts from the raw files in this directory. -->',
  '## Command workloads',
  '',
  'Five valid runs per cache condition are required. A failed or timed-out run is kept and never counted; a condition without five valid runs is `incomplete` and has no summary.',
  '',
  '| Workload | Cache | Status | Valid | Median s | Range s | MAD s | Failures and notes |',
  '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ...commandRows,
  '',
  '### Phases',
  '',
  'Median of the successful runs of each phase, across every sample of the batch (a phase that ran after an earlier failure still counts here).',
  '',
  '| Workload | Cache | Phase | argv | Succeeded | Median s |',
  '| --- | --- | --- | --- | --- | --- |',
  ...phaseRows,
  '',
  '## Studio interactions',
  '',
  studio ? `${studio.label}. ${studio.protocol.sessions} sessions of ${studio.protocol.repetitions} measured repetitions per cell, after one priming sequence. Unavailable: ${studio.protocol.unavailable.join('; ')}.` : 'Unavailable: no Studio series recorded.',
  '',
  '| Cell | Interaction | Status | Events | Session median ms | Range | Session p95 ms (median) | p95 range | Missing |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...studioRows,
  '',
  '### First navigation and first interaction',
  '',
  'Per session, first navigation to readiness (fonts ready and the next frame, from navigation start) and the first priming interaction (the guided edit), in ms.',
  '',
  '| Cell | First navigation per session | First interaction per session | Diagnostic trace |',
  '| --- | --- | --- | --- |',
  ...firstRows,
  '',
  '## Discovery exercises',
  '',
  '| Exercise | Attempt | Model | Wall s | Searches | Files opened | Owner | Command | Failed commands | Result |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...exerciseRows,
  '',
  '## Synthetic component addition and removal',
  '',
  '| Attempt | Model | Add wall s | Wiring files | Wiring edits | Authored files | Authored edits | Failed commands | Addition complete | Remove wall s | Removal clean |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...additionRows,
  '',
];
writeFileSync(join(dir, 'results.md'), `${sections.join('\n')}\n`);
console.log(`wrote baseline.json and results.md in ${dir}`);
