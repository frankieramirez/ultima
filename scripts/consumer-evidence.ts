import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KNOWN_GAPS } from './consumer-bundles.ts';
import { matrixSummary, retainedReports } from './consumer-matrix.ts';
import { CONSUMER_LAYOUTS, ENGINES, matrixCases, type Bundle, type ConsumerLayout, type ConsumerReport, type Engine } from './consumer-report.ts';

/** The committed evidence manifest the support page and `/llms.txt` render; regenerate it, never edit it. */
export const EVIDENCE_PATH = fileURLToPath(new URL('../apps/docs/src/support-evidence.json', import.meta.url));
const REPOSITORY = 'frankieramirez/ultima';

/**
 * The obligations of docs/spec/consumer-support.md that no automated cell can meet. Each stays an open gap on the
 * support page until a person records the evidence it names.
 */
export const OPEN_GAPS = [
  { id: 'desktop-browsers', title: 'Actual desktop browsers', closes: 'A keyboard, form and overlay smoke in branded Chrome and Edge and stable Firefox on Windows and macOS. The matrix runs Playwright\'s Chromium and Firefox builds on Linux.' },
  { id: 'safari', title: 'Actual Safari', closes: 'The same smoke in current stable Safari on current stable macOS. The matrix runs Playwright\'s WebKit, a test environment.' },
  { id: 'phones', title: 'Physical phones', closes: 'One iPhone in Safari and one Android phone in Chrome: touch targets, virtual keyboard and viewport resize, scrolling, popup dismissal, date entry and orientation. The narrow touch cells are emulation.' },
  { id: 'screen-readers', title: 'VoiceOver and NVDA', closes: 'VoiceOver with Safari and NVDA with Chrome: labels, announced state and focus order.' },
  { id: 'rtl-catalogue', title: 'RTL beyond the fixture', closes: 'RTL cases for components other than Sidebar navigation, Tabs, Select and Date Picker. The RTL claim covers only those four, less their named exclusions.' },
  { id: 'next-date-picker', title: 'Date Picker hydration in Next', closes: 'Date Picker cells in the Next root and src layouts. The hydration cells run the Projects scene, which has no Date Picker.' },
] as const;

/** The packages each fixture's lockfile pins that the support page names: framework, React, StyleX, primitives and the CLI. */
const PACKAGES = ['react', 'react-dom', 'typescript', 'vite', 'next', '@stylexjs/stylex', '@stylexjs/unplugin', '@stylexjs/babel-plugin', '@stylexjs/postcss-plugin', '@base-ui/react', '@zag-js/react', '@zag-js/date-picker', 'ultima-design'];

export type EvidenceGap = { bundle: Bundle; assertion: string; component: string; issue: string | null; engines: Engine[]; reason: string; observed: string[] };
export type EvidenceFixture = { id: string; report: string; reportDigest: string; layout: ConsumerLayout; exercise: 'bundles' | 'elements'; cells: number; setup: string | null; installedItems: string[]; versions: Record<string, string> };
export type EvidenceManifest = {
  schemaVersion: 1;
  run: { id: number; url: string; event: string; date: string; revision: string };
  matrix: { status: 'passed'; cells: number; engines: Engine[] };
  platform: { os: string; release: string; arch: string };
  tools: { node: string; npm: string };
  browsers: Record<Engine, string>;
  cli: { version: string; tarballDigest: string };
  fixtures: EvidenceFixture[];
  knownGaps: EvidenceGap[];
  openGaps: typeof OPEN_GAPS[number][];
};

/** Every `KNOWN_GAPS` entry, in bundle and assertion order, as the manifest lists it before a run's observations. */
export function knownGapEntries(): Omit<EvidenceGap, 'observed'>[] {
  return Object.entries(KNOWN_GAPS).flatMap(([bundle, gaps]) => Object.entries(gaps ?? {}).map(([assertion, gap]) => ({
    bundle: bundle as Bundle, assertion, component: gap!.component, issue: gap!.issue ?? null, engines: [...(gap!.engines ?? ENGINES)], reason: gap!.reason,
  })));
}

type Retained = { id: string; report: ConsumerReport; digest: string; lock: { packages?: Record<string, { version?: string }> } };
type Run = { id: number; url: string; event: string; date: string };

/** The manifest for one complete, passing matrix run. Anything less publishes no claim. */
export function evidenceManifest(retained: Retained[], run: Run): EvidenceManifest {
  const summary = matrixSummary(retained.map(({ id, report }) => ({ path: id, report, durations: {} })), true);
  if (summary.status !== 'passed') throw new Error(`run ${run.id} is ${summary.status}, not a complete passing matrix`);
  const reports = retained.map(({ report }) => report);
  const one = <T>(values: T[], what: string): T => {
    const distinct = new Set(values.map((value) => JSON.stringify(value)));
    if (distinct.size !== 1) throw new Error(`the run's reports disagree on ${what}`);
    return JSON.parse([...distinct][0]!) as T;
  };
  const same = <T>(pick: (report: ConsumerReport) => T, what: string) => one(reports.map(pick), what);
  const fixtures = retained.map(({ id, report, digest, lock }): EvidenceFixture => ({
    id, report: `${id}/report.json`, reportDigest: digest, layout: report.layout, exercise: report.exercise as EvidenceFixture['exercise'], cells: report.cases.length,
    setup: report.installedItems.find((item) => item.startsWith('setup-')) ?? null,
    installedItems: [...report.installedItems].sort(),
    versions: Object.fromEntries(PACKAGES.flatMap((name) => { const version = lock.packages?.[`node_modules/${name}`]?.version; return version ? [[name, version]] : []; })),
  })).sort((a, b) => a.id.localeCompare(b.id));
  return {
    schemaVersion: 1,
    run: { ...run, revision: summary.heads[0]! },
    matrix: { status: 'passed', cells: summary.executed, engines: [...ENGINES] },
    platform: same((report) => report.platform!, 'platform'),
    tools: { node: same((report) => report.versions.node!, 'Node'), npm: same((report) => report.versions.npm!, 'npm') },
    browsers: same((report) => Object.fromEntries(ENGINES.map((engine) => [engine, report.versions[engine]])) as Record<Engine, string>, 'browser versions'),
    cli: {
      version: one(fixtures.filter((fixture) => fixture.exercise === 'bundles').map((fixture) => fixture.versions['ultima-design']!), 'CLI version'),
      tarballDigest: one(reports.filter((report) => report.exercise === 'bundles').map((report) => report.source.cliTarballDigest!), 'CLI tarball'),
    },
    fixtures,
    knownGaps: knownGapEntries().map((gap) => ({ ...gap, observed: summary.knownGaps.filter((row) => row.assertion === gap.assertion && row.id.split('/').at(-1)!.startsWith(`${gap.bundle}-`)).map((row) => row.id).sort() })),
    openGaps: [...OPEN_GAPS],
  };
}

/** Where the committed manifest no longer matches the runner it claims to describe. */
export function evidenceProblems(manifest: EvidenceManifest): string[] {
  const problems: string[] = [];
  if (manifest.schemaVersion !== 1 || manifest.matrix.status !== 'passed') problems.push('the manifest is not a passing schema-1 run');
  if (!/^[a-f0-9]{40}$/.test(manifest.run.revision) || Number.isNaN(Date.parse(manifest.run.date))) problems.push('the run names no revision or date');
  if (manifest.matrix.cells !== matrixCases().length || manifest.fixtures.reduce((sum, fixture) => sum + fixture.cells, 0) !== matrixCases().length) problems.push(`the manifest covers ${manifest.matrix.cells} cells; the matrix registers ${matrixCases().length}`);
  if (JSON.stringify(manifest.matrix.engines) !== JSON.stringify(ENGINES) || ENGINES.some((engine) => !manifest.browsers[engine])) problems.push('the manifest does not name every engine');
  const strip = manifest.knownGaps.map(({ observed: _, ...gap }) => gap);
  if (JSON.stringify(strip) !== JSON.stringify(knownGapEntries())) problems.push('the known gaps differ from KNOWN_GAPS in scripts/consumer-bundles.ts');
  if (JSON.stringify(manifest.openGaps) !== JSON.stringify(OPEN_GAPS)) problems.push('the open gaps differ from OPEN_GAPS in scripts/consumer-evidence.ts');
  const cells = new Set(matrixCases());
  for (const gap of manifest.knownGaps) if (gap.observed.some((id) => !cells.has(id) || !gap.engines.includes(id.split('/').at(-2) as Engine))) problems.push(`${gap.assertion} names a cell outside its bundle's registered engines`);
  return problems;
}

function gh(args: string[]): string {
  const result = spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`gh ${args.join(' ')} exited ${result.status}: ${result.stderr}`);
  return result.stdout;
}

/** The latest completed full matrix: a passing installed-consumer run on `main` that is not a pull request. */
function latestRun(): number {
  const runs = JSON.parse(gh(['run', 'list', '--repo', REPOSITORY, '--workflow', 'consumer-proof.yml', '--branch', 'main', '--limit', '20', '--json', 'databaseId,event,conclusion'])) as { databaseId: number; event: string; conclusion: string }[];
  const run = runs.find(({ event, conclusion }) => event !== 'pull_request' && conclusion === 'success');
  if (!run) throw new Error('no passing full installed-consumer run on main');
  return run.databaseId;
}

function download(id: number, folder: string): { run: Run; retained: Retained[] } {
  const meta = JSON.parse(gh(['run', 'view', String(id), '--repo', REPOSITORY, '--json', 'databaseId,url,event,createdAt,conclusion'])) as { databaseId: number; url: string; event: string; createdAt: string; conclusion: string };
  if (meta.conclusion !== 'success') throw new Error(`run ${id} concluded ${meta.conclusion || 'nothing yet'}`);
  if (!existsSync(folder)) {
    mkdirSync(folder, { recursive: true });
    gh(['run', 'download', String(id), '--repo', REPOSITORY, '--dir', folder, ...[...CONSUMER_LAYOUTS.map((layout) => `consumer-proof-${layout}-bundles`), 'consumer-proof-vite-elements'].flatMap((name) => ['--name', name])]);
  }
  const retained = retainedReports(folder).map(({ path }) => {
    const id = dirname(path);
    const text = readFileSync(join(folder, path));
    return { id, report: JSON.parse(String(text)) as ConsumerReport, digest: createHash('sha256').update(text).digest('hex'), lock: JSON.parse(readFileSync(join(folder, id, 'package-lock.json'), 'utf8')) };
  });
  return { run: { id: meta.databaseId, url: meta.url, event: meta.event, date: meta.createdAt }, retained };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const flag = (name: string) => { const index = args.indexOf(name); return index === -1 ? undefined : args[index + 1]; };
  if (args.includes('--check')) {
    const problems = evidenceProblems(JSON.parse(readFileSync(EVIDENCE_PATH, 'utf8')) as EvidenceManifest);
    for (const problem of problems) console.error(problem);
    process.exitCode = problems.length ? 1 : 0;
  } else {
    const id = Number(flag('--run') ?? latestRun());
    const folder = resolve(flag('--reports') ?? join(fileURLToPath(new URL('..', import.meta.url)), '.scratch/consumer-evidence', String(id)));
    const { run, retained } = download(id, folder);
    const manifest = evidenceManifest(retained, run);
    const problems = evidenceProblems(manifest);
    if (problems.length) throw new Error(problems.join('\n'));
    writeFileSync(EVIDENCE_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Wrote ${EVIDENCE_PATH} from ${run.url} at ${manifest.run.revision}`);
  }
}
