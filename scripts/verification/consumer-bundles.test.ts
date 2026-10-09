import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';
import { BUNDLE_ASSERTIONS, BUNDLE_FAULTS, CELL_DEADLINES_MS, DATE_PROBES_SOURCE, DIRECTION_PROBES_SOURCE, PROBES_SOURCE, KNOWN_GAPS, RTL_EXCLUSIONS, assertionStatus, bundleFiles, bundleProof, bundleReproduction, bundleSnapshotProblems, type BundleSnapshot } from '../consumer-bundles.ts';
import { BUNDLES, BUNDLE_ITEMS, CONSUMER_LAYOUTS, ELEMENT_ITEMS, ENGINES, MATRIX_BUNDLES, bundleCases, consumerReportProblems, elementCases, matrixCases, type ConsumerReport, type Engine } from '../consumer-report.ts';
import { presetDraft, resolveDraft } from '../../packages/tokens/src/theme/draft.ts';
import { SCENE_ITEMS } from '../consumer-scene.ts';
import { matrixMarkdown, matrixSummary } from '../consumer-matrix.ts';

const digest = 'a'.repeat(64);
const fixture = { hash: digest, lock: 'b'.repeat(64) };
const platform = { os: 'Linux', release: '6', arch: 'x64' };
const versions = Object.fromEntries(ENGINES.map((engine) => [engine, `${engine}-1`]));

const problemsExceptSourceIdentity = (value: ConsumerReport) => consumerReportProblems(value).filter((problem) => problem !== 'consumer-proof source identity is incomplete');

function report(overrides: Partial<ConsumerReport> = {}) {
  const engines = overrides.engines ?? [...ENGINES];
  const cases = bundleCases(engines);
  return {
    schemaVersion: 1, status: 'passed', layout: 'vite', deliveryPath: 'css', exercise: 'bundles', engines, fixture, platform, versions,
    installedItems: [...BUNDLE_ITEMS], expected: cases, executed: cases, cases: cases.map((id) => ({ id, status: 'passed', failures: [], snapshot: 'fixture.json' })), errors: [],
    ...overrides,
  } as ConsumerReport;
}

test('the case registry is every bundle in both modes in every engine: 36 cells', () => {
  const cases = bundleCases();
  assert.equal(cases.length, 36);
  assert.equal(new Set(cases).size, 36);
  for (const engine of ENGINES) for (const bundle of BUNDLES) for (const mode of ['dark', 'light']) assert.ok(cases.includes(`vite/bundles/${engine}/${bundle}-${mode}`));
  assert.deepEqual(bundleCases(['firefox']), cases.filter((id) => id.includes('/firefox/')));
  for (const bundle of MATRIX_BUNDLES) assert.ok(BUNDLE_ASSERTIONS[bundle].length > 0 && new Set(BUNDLE_ASSERTIONS[bundle]).size === BUNDLE_ASSERTIONS[bundle].length, bundle);
});

test('the Next layouts add 12 hydration cells and the element fixture 6 lifecycle cells', () => {
  const next = (['next-app', 'next-src'] as const).flatMap((layout) => bundleCases(ENGINES, layout));
  assert.equal(next.length, 12);
  for (const layout of ['next-app', 'next-src']) for (const engine of ENGINES) for (const mode of ['dark', 'light']) assert.ok(next.includes(`${layout}/bundles/${engine}/hydration-${mode}`));
  assert.deepEqual(elementCases(), ENGINES.flatMap((engine) => ['dark', 'light'].map((mode) => `vite/elements/${engine}/lifecycle-${mode}`)));
  const matrix = matrixCases();
  assert.equal(new Set(matrix).size, matrix.length);
  assert.deepEqual(matrix, [...CONSUMER_LAYOUTS.flatMap((layout) => bundleCases(ENGINES, layout)), ...elementCases()]);
  assert.equal(matrix.length, bundleCases().length + 12 + 6, 'the Vite bundles plus the Next and element cells');
  assert.equal(matrix.length, 54, 'the full cross-engine matrix of docs/spec/consumer-support.md#bounded-production-proof');
  for (const bundle of MATRIX_BUNDLES) assert.ok(CELL_DEADLINES_MS[bundle] >= 30_000, `${bundle} has a deadline of at least 30 seconds`);
  assert.equal(ELEMENT_ITEMS.length, 9, 'the nine-element catalogue');
});

test('a bundles report needs every requested engine, its identity and the Vite fixture', () => {
  const coverage = 'consumer-proof case coverage is incomplete';
  assert.deepEqual(problemsExceptSourceIdentity(report()), []);
  const withoutWebkit = bundleCases(['chromium', 'firefox']);
  assert.ok(problemsExceptSourceIdentity(report({ executed: withoutWebkit, cases: withoutWebkit.map((id) => ({ id, status: 'passed', failures: [], snapshot: 'fixture.json' })) })).includes(coverage), 'an unexecuted engine leaves coverage incomplete');
  assert.deepEqual(problemsExceptSourceIdentity(report({ engines: ['chromium', 'firefox'] })).filter((problem) => problem !== coverage), [], 'a narrowed run states its engines');
  assert.ok(problemsExceptSourceIdentity(report({ engines: ['chromium', 'opera' as Engine] })).includes('unknown bundle engines'));
  assert.ok(problemsExceptSourceIdentity(report({ engines: ['firefox', 'firefox'] })).includes('unknown bundle engines'));
  const next = bundleCases(ENGINES, 'next-src');
  assert.deepEqual(problemsExceptSourceIdentity(report({ layout: 'next-src', installedItems: [], expected: next, executed: next, cases: next.map((id) => ({ id, status: 'passed', failures: [], snapshot: 'fixture.json' })) })), [], 'a Next layout runs its hydration cells and needs no Vite probes');
  assert.ok(problemsExceptSourceIdentity(report({ layout: 'next-app' })).includes('consumer-proof case coverage is incomplete'), 'a Next report cannot carry the Vite cells');
  assert.ok(problemsExceptSourceIdentity(report({ installedItems: [] })).includes('bundles installed source inventory is incomplete'));
  assert.ok(problemsExceptSourceIdentity(report({ versions: { chromium: 'x' } })).includes('bundle browser identity is missing'));
  assert.ok(problemsExceptSourceIdentity(report({ fixture: undefined })).includes('bundle fixture or platform identity is missing'));
  assert.ok(problemsExceptSourceIdentity(report({ platform: undefined })).includes('bundle fixture or platform identity is missing'));
  assert.ok(problemsExceptSourceIdentity(report({ errors: ['webkit could not launch'] })).includes('invalid consumer-proof errors'), 'a launch error cannot sit in a passing report');
  assert.ok(!problemsExceptSourceIdentity(report({ status: 'incomplete', errors: ['webkit could not launch'], fixture: undefined })).includes('bundle fixture or platform identity is missing'));
});

test('an elements report needs the whole element catalogue, its own fixture and no CLI tarball', () => {
  const cases = elementCases();
  const elements = (overrides: Partial<ConsumerReport> = {}) => report({ exercise: 'elements', installedItems: [...ELEMENT_ITEMS, 'tokens-css'], expected: cases, executed: cases, cases: cases.map((id) => ({ id, status: 'passed', failures: [], snapshot: 'fixture.json' })), ...overrides });
  const source = (cliTarballDigest: string | null) => ({ head: 'c'.repeat(40), manifest: { algorithm: 'sha256', version: 1, digest, files: 0, entries: [] }, registryManifestHash: digest, cliTarballDigest, draftDigest: digest, draftFingerprint: 'f', recipeVersion: 1 }) as unknown as ConsumerReport['source'];
  assert.deepEqual(consumerReportProblems(elements({ source: source(null) })), []);
  assert.ok(consumerReportProblems(elements({ source: source(digest) })).includes('consumer-proof source identity is incomplete'), 'the light-DOM consumer never packs the CLI');
  assert.ok(problemsExceptSourceIdentity(elements({ installedItems: ['ult-button'] })).includes('bundles installed source inventory is incomplete'));
  assert.ok(problemsExceptSourceIdentity(elements({ layout: 'next-app' })).includes('elements run on their own vanilla Vite fixture'));
  assert.ok(problemsExceptSourceIdentity(elements({ expected: bundleCases(), executed: bundleCases() })).includes('consumer-proof case coverage is incomplete'));
});

test('an engine that cannot launch leaves its cells unexecuted and says why', async () => {
  const app = await mkdtemp(join(tmpdir(), 'ultima-bundles-'));
  try {
    await mkdir(join(app, 'dist'));
    await writeFile(join(app, 'dist/index.html'), '<!doctype html>');
    await writeFile(join(app, 'package-lock.json'), '{}');
    const draft = resolveDraft(presetDraft('neutral'));
    const result = report({ status: 'incomplete', executed: [], cases: [], errors: [], fixture: undefined, platform: undefined, versions: {} });
    await bundleProof('http://127.0.0.1:9', app, result, app, draft, draft, ENGINES, undefined, async (engine) => { throw new Error(`browserType.launch:\n╔═══╗\n║ ${engine} is missing dependencies ║`); });
    assert.deepEqual(result.executed, []);
    assert.deepEqual(result.errors, ENGINES.map((engine) => `${engine} could not launch: Error: browserType.launch: ${engine} is missing dependencies`));
    assert.match(result.fixture?.hash ?? '', /^[a-f0-9]{64}$/);
    assert.ok(problemsExceptSourceIdentity(result).includes('consumer-proof case coverage is incomplete'));
  } finally { await rm(app, { recursive: true, force: true }); }
});

test('bundle snapshots carry every assertion, the engine, platform and fixture identity, and failure evidence', () => {
  const id = 'vite/bundles/webkit/form-light';
  const row = { id, status: 'passed', failures: [] as string[] };
  const reproduceArgv = bundleReproduction('webkit');
  const snapshot: BundleSnapshot = {
    id, engine: 'webkit', bundle: 'form', mode: 'light', browser: { name: 'webkit', version: 'webkit-1' }, userAgent: 'agent', platform, fixture,
    assertions: BUNDLE_ASSERTIONS.form.map((name) => ({ name, expected: true, actual: true, status: 'passed' })), failures: [], durationMs: 1200, reproduceArgv, reproduce: reproduceArgv.join(' '),
    artifacts: { browser: 'b.json', screenshot: 's.png' },
  };
  const context = { fixture, versions };
  assert.deepEqual(bundleSnapshotProblems(snapshot, row, context), []);
  assert.ok(bundleSnapshotProblems({ ...snapshot, assertions: snapshot.assertions.slice(1) }, row, context).includes('incomplete bundle assertion inventory'));
  assert.ok(bundleSnapshotProblems({ ...snapshot, assertions: snapshot.assertions.map((row, index) => index ? row : { ...row, actual: false, status: 'failed' }) }, row, context).includes('passing cell holds a failed assertion'));
  assert.ok(bundleSnapshotProblems({ ...snapshot, engine: 'chromium' }, row, context).includes('snapshot disagrees with its case'));
  assert.ok(bundleSnapshotProblems({ ...snapshot, browser: { name: 'webkit', version: 'other' } }, row, context).length);
  assert.ok(bundleSnapshotProblems(snapshot, row, { ...context, fixture: { ...fixture, hash: 'c'.repeat(64) } }).length, 'a cell must name the build the report shared');
  assert.ok(bundleSnapshotProblems({ ...snapshot, reproduceArgv: bundleReproduction('chromium') }, row, context).includes('invalid reproduction'));
  const failed = { ...row, status: 'failed', failures: ['form broke'] };
  assert.ok(bundleSnapshotProblems({ ...snapshot, failures: failed.failures }, failed, context).includes('missing trace artifact'));
  assert.deepEqual(bundleSnapshotProblems({ ...snapshot, failures: failed.failures, artifacts: { browser: 'b.json', trace: 't.zip' } }, failed, context), []);
  assert.deepEqual(bundleSnapshotProblems(null, row, context), ['missing bundle snapshot']);
  assert.ok(bundleSnapshotProblems({ ...snapshot, durationMs: undefined } as unknown as BundleSnapshot, row, context).includes('missing cell duration'));
});

test('a hydration cell reproduces its Next layout and retains the server HTML', () => {
  const id = 'next-src/bundles/firefox/hydration-dark';
  const row = { id, status: 'passed', failures: [] as string[] };
  const reproduceArgv = bundleReproduction('firefox', undefined, 'next-src');
  const snapshot: BundleSnapshot = {
    id, engine: 'firefox', bundle: 'hydration', mode: 'dark', browser: { name: 'firefox', version: 'firefox-1' }, userAgent: 'agent', platform, fixture,
    assertions: BUNDLE_ASSERTIONS.hydration.map((name) => ({ name, expected: true, actual: true, status: 'passed' })), failures: [], durationMs: 900, reproduceArgv, reproduce: reproduceArgv.join(' '),
    artifacts: { browser: 'b.json', screenshot: 's.png', server: 'h.html' },
  };
  const context = { fixture, versions };
  assert.deepEqual(bundleSnapshotProblems(snapshot, row, context), []);
  assert.ok(bundleSnapshotProblems({ ...snapshot, artifacts: { browser: 'b.json', screenshot: 's.png' } }, row, context).includes('missing server artifact'));
  assert.ok(bundleSnapshotProblems({ ...snapshot, reproduceArgv: bundleReproduction('firefox') }, row, context).includes('invalid reproduction'), 'the Vite command cannot reproduce a Next cell');
  assert.deepEqual(bundleReproduction('webkit', undefined, 'vite', 'elements').slice(3, 10), ['--layout', 'vite', '--delivery-path', 'css', '--exercise', 'elements', '--engine']);
});

test('the fault and engine reproduce one engine of the run', () => {
  assert.deepEqual(bundleReproduction('firefox', 'portal-theme').slice(-4), ['--engine', 'firefox', '--fault', 'portal-theme']);
});

test('the probes parse as TSX and import only installed items', () => {
  const imports: string[] = [];
  for (const [name, source] of Object.entries(bundleFiles())) {
    const output = ts.transpileModule(source, { fileName: name, reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.ReactJSX } });
    assert.deepEqual(output.diagnostics, [], name);
    imports.push(...[...source.matchAll(/from '@\/components\/ui\/([a-z-]+)'/g)].map((match) => match[1]!));
    for (const [, specifier] of source.matchAll(/from '([^.@][^']*|@[^/]+\/[^/']+)/g)) assert.ok(['react', '@zag-js/date-picker', '@base-ui/react'].includes(specifier!), `${name} imports ${specifier}, which the fixture does not install`);
  }
  for (const item of BUNDLE_ITEMS) assert.ok(imports.includes(item), item);
  assert.ok(PROBES_SOURCE && DATE_PROBES_SOURCE.includes("locale=\"en-US\"") && DATE_PROBES_SOURCE.includes("locale=\"en-GB\""), 'both date locales');
  assert.equal(DATE_PROBES_SOURCE.match(/parse=\{parseEntry\}/g)?.length, 2, 'both typed pickers use the fixture\'s deterministic parser, never the engine\'s Date.parse');
  assert.ok(DIRECTION_PROBES_SOURCE.includes('dir="rtl"') && /[\u0600-\u06ff]/.test(DIRECTION_PROBES_SOURCE), 'the RTL fixture carries Zag\'s dir prop and Arabic labels');
});

test('the wrong-submitted-date fault changes only how the form serializes a date', () => {
  assert.deepEqual(BUNDLE_FAULTS, ['wrong-submitted-date']);
  const clean = bundleFiles();
  const faulted = bundleFiles('wrong-submitted-date');
  assert.notEqual(faulted['DateProbes.tsx'], clean['DateProbes.tsx']);
  assert.match(faulted['DateProbes.tsx']!, /new Date\(date\.toString\(\)\)\.toLocaleDateString/);
  for (const name of Object.keys(clean).filter((name) => name !== 'DateProbes.tsx')) assert.equal(faulted[name], clean[name], name);
});

test('an RTL exclusion names a direction assertion and the component it removes from the claim', () => {
  const direction: readonly string[] = BUNDLE_ASSERTIONS['direction-locale'];
  for (const [assertion, exclusion] of Object.entries(RTL_EXCLUSIONS)) {
    assert.ok(direction.includes(assertion), assertion);
    assert.ok([...BUNDLE_ITEMS, ...SCENE_ITEMS].includes(exclusion!.component), exclusion!.component);
    assert.ok(exclusion!.reason.length > 0);
  }
});

test('an excluded assertion passes a cell only when it is a named RTL exclusion', () => {
  const id = 'vite/bundles/firefox/direction-locale-dark';
  const row = { id, status: 'passed', failures: [] as string[] };
  const reproduceArgv = bundleReproduction('firefox');
  const assertions = BUNDLE_ASSERTIONS['direction-locale'].map((name) => ({ name, expected: true, actual: true, status: 'passed' as const }));
  const snapshot: BundleSnapshot = {
    id, engine: 'firefox', bundle: 'direction-locale', mode: 'dark', browser: { name: 'firefox', version: 'firefox-1' }, userAgent: 'agent', platform, fixture,
    assertions, failures: [], durationMs: 1500, reproduceArgv, reproduce: reproduceArgv.join(' '), artifacts: { browser: 'b.json', screenshot: 's.png' },
  };
  const context = { fixture, versions };
  const exclude = (name: string) => ({ ...snapshot, assertions: assertions.map((row) => row.name === name ? { ...row, actual: false, status: 'excluded' as const } : row) });
  assert.deepEqual(bundleSnapshotProblems(exclude('tabs-indicator'), row, context), []);
  assert.ok(bundleSnapshotProblems(exclude('tabs-arrows'), row, context).includes('an assertion is excluded without a named exclusion or known gap'));
  assert.ok(bundleSnapshotProblems(exclude('tabs-arrows'), row, context).includes('passing cell holds a failed assertion'));
});

test('a narrow touch known gap names its issue and is excluded only where it was found', () => {
  const touch: readonly string[] = BUNDLE_ASSERTIONS['narrow-touch'];
  const gaps = KNOWN_GAPS['narrow-touch']!;
  assert.deepEqual(Object.fromEntries(Object.entries(gaps).map(([name, gap]) => [name, gap!.issue])), { 'range-date-picker-fits': '#806', 'drawer-backdrop-dismiss': '#807' });
  for (const name of Object.keys(gaps)) assert.ok(touch.includes(name), name);
  for (const engine of ENGINES) assert.equal(assertionStatus('narrow-touch', 'range-date-picker-fits', engine, false), 'excluded', engine);
  assert.equal(assertionStatus('narrow-touch', 'drawer-backdrop-dismiss', 'firefox', false), 'excluded');
  for (const engine of ['chromium', 'webkit'] as const) assert.equal(assertionStatus('narrow-touch', 'drawer-backdrop-dismiss', engine, false), 'failed', `#807 is a Firefox gap, so ${engine} still fails it`);
  for (const name of touch.filter((name) => !(name in gaps))) for (const engine of ENGINES) assert.equal(assertionStatus('narrow-touch', name, engine, false), 'failed', `${name} in ${engine}`);
  assert.equal(assertionStatus('narrow-touch', 'tabs-indicator', 'firefox', false), 'failed', 'an RTL exclusion does not excuse another bundle');
  assert.equal(assertionStatus('narrow-touch', 'range-date-picker-fits', 'chromium', true), 'passed', 'a gap that holds is reported as passing');
  assert.equal(assertionStatus('narrow-touch', 'range-date-picker-fits', 'firefox', false, false), 'failed', 'a gap check that threw never measured the gap, so it fails');
  assert.equal(assertionStatus('direction-locale', 'tabs-indicator', 'webkit', false, false), 'failed');
});

test('a narrow touch cell passes with its known gaps recorded, and fails on any other broken assertion', () => {
  const cell = (engine: Engine, broken: string[]) => {
    const id = `vite/bundles/${engine}/narrow-touch-dark`;
    const assertions = BUNDLE_ASSERTIONS['narrow-touch'].map((name) => {
      const status = assertionStatus('narrow-touch', name, engine, !broken.includes(name));
      return { name, expected: true, actual: !broken.includes(name), status };
    });
    const failures = assertions.filter((row) => row.status === 'failed').map((row) => `${row.name}: broke`);
    const row = { id, status: failures.length ? 'failed' : 'passed', failures };
    const reproduceArgv = bundleReproduction(engine);
    const snapshot: BundleSnapshot = {
      id, engine, bundle: 'narrow-touch', mode: 'dark', browser: { name: engine, version: `${engine}-1` }, userAgent: 'agent', platform, fixture,
      assertions, failures, durationMs: 9000, reproduceArgv, reproduce: reproduceArgv.join(' '), artifacts: failures.length ? { browser: 'b.json', trace: 't.zip' } : { browser: 'b.json', screenshot: 's.png' },
    };
    return { row, snapshot, problems: bundleSnapshotProblems(snapshot, row, { fixture, versions }) };
  };
  const firefox = cell('firefox', ['range-date-picker-fits', 'drawer-backdrop-dismiss']);
  assert.equal(firefox.row.status, 'passed');
  assert.deepEqual(firefox.problems, []);
  assert.deepEqual(firefox.snapshot.assertions.filter((row) => row.status === 'excluded').map((row) => row.name), ['range-date-picker-fits', 'drawer-backdrop-dismiss'], 'both gaps stay in the snapshot as excluded, not passed');
  const chromium = cell('chromium', ['range-date-picker-fits', 'drawer-backdrop-dismiss']);
  assert.equal(chromium.row.status, 'failed', 'the Firefox-only gap fails in Chromium');
  assert.deepEqual(chromium.row.failures, ['drawer-backdrop-dismiss: broke']);
  const fresh = cell('webkit', ['range-date-picker-fits', 'page-overflow']);
  assert.equal(fresh.row.status, 'failed', 'an overflow from anything but the range Date Picker still fails');
  assert.deepEqual(fresh.row.failures, ['page-overflow: broke']);
  const forged = { ...firefox.snapshot, assertions: firefox.snapshot.assertions.map((row) => row.name === 'dialog-touch' ? { ...row, actual: false, status: 'excluded' as const } : row) };
  assert.ok(bundleSnapshotProblems(forged, firefox.row, { fixture, versions }).includes('an assertion is excluded without a named exclusion or known gap'));
});

test('known gaps travel in the report and the matrix summary, and must name executed cells', () => {
  const id = 'vite/bundles/firefox/narrow-touch-dark';
  const gaps = [{ id, assertion: 'range-date-picker-fits', component: 'date-picker', issue: '#806' }, { id, assertion: 'drawer-backdrop-dismiss', component: 'sidebar', issue: '#807' }];
  assert.deepEqual(problemsExceptSourceIdentity(report({ knownGaps: gaps })), []);
  assert.ok(problemsExceptSourceIdentity(report({ knownGaps: [{ ...gaps[0]!, id: 'vite/bundles/firefox/narrow-touch-sepia' }] })).includes('known gaps must name executed cells'));
  const summary = matrixSummary([{ path: 'r.json', report: report({ knownGaps: gaps }), durations: {} }], false);
  assert.deepEqual(summary.knownGaps, gaps);
  assert.match(matrixMarkdown(summary), /### Known gaps[\s\S]*range-date-picker-fits: date-picker \(#806\)[\s\S]*drawer-backdrop-dismiss: sidebar \(#807\)/);
});
