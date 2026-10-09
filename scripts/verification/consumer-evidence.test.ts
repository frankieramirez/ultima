import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { KNOWN_GAPS } from '../consumer-bundles.ts';
import { EVIDENCE_PATH, OPEN_GAPS, evidenceManifest, evidenceProblems, knownGapEntries, type EvidenceManifest } from '../consumer-evidence.ts';
import { BUNDLE_ITEMS, CONSUMER_LAYOUTS, ELEMENT_ITEMS, ENGINES, bundleCases, elementCases, matrixCases, type ConsumerLayout, type ConsumerReport } from '../consumer-report.ts';

const digest = 'a'.repeat(64);
const head = 'c'.repeat(40);
const run = { id: 1, url: 'https://github.com/frankieramirez/ultima/actions/runs/1', event: 'schedule', date: '2026-10-12T06:17:00Z' };
const lock = (layout: ConsumerLayout | 'elements') => ({ packages: Object.fromEntries([
  ['node_modules/react', '19.3.0'], ['node_modules/@base-ui/react', '1.9.0'], ['node_modules/ultima-design', '0.1.0'], ['node_modules/vite', '8.3.4'],
  ...(layout === 'vite' ? [['node_modules/@zag-js/react', '1.40.0']] : []), ['node_modules/left-pad', '1.3.0'],
].filter(([name]) => layout !== 'elements' || name === 'node_modules/vite').map(([name, version]) => [name, { version }])) });

function report(exercise: 'bundles' | 'elements', layout: ConsumerLayout): ConsumerReport {
  const cases = exercise === 'elements' ? elementCases() : bundleCases(ENGINES, layout);
  const gaps = exercise === 'bundles' && layout === 'vite'
    ? [...ENGINES.flatMap((engine) => ['dark', 'light'].map((mode) => ({ id: `vite/bundles/${engine}/narrow-touch-${mode}`, assertion: 'range-date-picker-fits', component: 'date-picker', issue: '#806' }))),
      { id: 'vite/bundles/firefox/narrow-touch-dark', assertion: 'drawer-backdrop-dismiss', component: 'sidebar', issue: '#807' }]
    : [];
  return {
    schemaVersion: 1, status: 'passed', layout, deliveryPath: 'css', exercise, engines: [...ENGINES], versions: { node: 'v22.23.3', npm: '10.9.9', chromium: '153', firefox: '155', webkit: '26.6' },
    fixture: { hash: digest, lock: digest }, platform: { os: 'Linux', release: '6', arch: 'x64' },
    source: { head, manifest: { algorithm: 'sha256', version: 1, digest, files: 0, entries: [] }, registryManifestHash: digest, cliTarballDigest: exercise === 'elements' ? null : digest, draftDigest: digest, draftFingerprint: 'f', recipeVersion: 1 },
    command: [], work: null, installedItems: exercise === 'elements' ? [...ELEMENT_ITEMS, 'tokens-css'] : [layout === 'vite' ? 'setup-vite' : 'setup-next', ...(layout === 'vite' ? BUNDLE_ITEMS : [])],
    expected: cases, executed: cases, cases: cases.map((id) => ({ id, status: 'passed', failures: [], snapshot: 'x.json' })), errors: [], knownGaps: gaps,
  } as unknown as ConsumerReport;
}
const full = () => [
  ...CONSUMER_LAYOUTS.map((layout) => ({ id: `consumer-proof-${layout}-bundles`, report: report('bundles', layout), digest, lock: lock(layout) })),
  { id: 'consumer-proof-vite-elements', report: report('elements', 'vite'), digest, lock: lock('elements') },
];

test('a complete passing run becomes a manifest of its versions, reports and every known gap', () => {
  const manifest = evidenceManifest(full(), run);
  assert.deepEqual(evidenceProblems(manifest), []);
  assert.equal(manifest.run.revision, head);
  assert.equal(manifest.matrix.cells, matrixCases().length);
  assert.deepEqual(manifest.browsers, { chromium: '153', firefox: '155', webkit: '26.6' });
  assert.deepEqual(manifest.cli, { version: '0.1.0', tarballDigest: digest });
  const vite = manifest.fixtures.find((fixture) => fixture.id === 'consumer-proof-vite-bundles')!;
  assert.deepEqual(vite.versions, { react: '19.3.0', vite: '8.3.4', '@base-ui/react': '1.9.0', '@zag-js/react': '1.40.0', 'ultima-design': '0.1.0' }, 'the lockfile supplies the named packages only');
  assert.equal(vite.setup, 'setup-vite');
  assert.equal(manifest.fixtures.find((fixture) => fixture.exercise === 'elements')!.setup, null);
  const gaps = Object.values(KNOWN_GAPS).reduce((count, gaps) => count + Object.keys(gaps ?? {}).length, 0);
  assert.equal(manifest.knownGaps.length, gaps, 'every KNOWN_GAPS entry is listed, observed or not');
  assert.equal(manifest.knownGaps.find((gap) => gap.assertion === 'range-date-picker-fits')!.observed.length, 6);
  assert.deepEqual(manifest.knownGaps.find((gap) => gap.assertion === 'drawer-backdrop-dismiss')!.observed, ['vite/bundles/firefox/narrow-touch-dark']);
  assert.deepEqual(manifest.knownGaps.find((gap) => gap.assertion === 'tabs-indicator')!.observed, []);
  assert.deepEqual(manifest.openGaps, OPEN_GAPS);
});

test('an incomplete or failing run publishes no manifest', () => {
  assert.throws(() => evidenceManifest(full().slice(1), run), /incomplete/);
  const failing = full();
  failing[0]!.report = { ...failing[0]!.report, status: 'failed', cases: failing[0]!.report.cases.map((row, index) => index ? row : { ...row, status: 'failed', failures: ['x'] }) };
  assert.throws(() => evidenceManifest(failing, run), /failed/);
  const split = full();
  split[1]!.report = { ...split[1]!.report, versions: { ...split[1]!.report.versions, webkit: '27' } };
  assert.throws(() => evidenceManifest(split, run), /browser versions/);
});

test('a manifest whose gaps or cells drift from the runner is rejected', () => {
  const manifest = evidenceManifest(full(), run);
  const renamed: EvidenceManifest = { ...manifest, knownGaps: manifest.knownGaps.map((gap) => gap.assertion === 'range-date-picker-fits' ? { ...gap, issue: '#999' } : gap) };
  assert.match(evidenceProblems(renamed).join('\n'), /KNOWN_GAPS/);
  assert.match(evidenceProblems({ ...manifest, knownGaps: manifest.knownGaps.slice(1) }).join('\n'), /KNOWN_GAPS/);
  assert.match(evidenceProblems({ ...manifest, openGaps: manifest.openGaps.slice(1) }).join('\n'), /OPEN_GAPS/);
  assert.match(evidenceProblems({ ...manifest, matrix: { ...manifest.matrix, cells: 36 } }).join('\n'), /covers 36 cells/);
  const elsewhere = manifest.knownGaps.map((gap) => gap.assertion === 'drawer-backdrop-dismiss' ? { ...gap, observed: ['vite/bundles/webkit/narrow-touch-dark'] } : gap);
  assert.match(evidenceProblems({ ...manifest, knownGaps: elsewhere }).join('\n'), /drawer-backdrop-dismiss/);
});

test('the committed manifest matches KNOWN_GAPS, OPEN_GAPS and the registered matrix', () => {
  const committed = JSON.parse(readFileSync(EVIDENCE_PATH, 'utf8')) as EvidenceManifest;
  assert.deepEqual(evidenceProblems(committed), [], 'regenerate it with node --experimental-strip-types scripts/consumer-evidence.ts');
  assert.deepEqual(committed.knownGaps.map(({ observed: _, ...gap }) => gap), knownGapEntries());
});

test('the support page prose states no version or issue that the manifest does not supply', () => {
  const prose = readFileSync(new URL('../../apps/docs/src/content/support.mdx', import.meta.url), 'utf8');
  assert.doesNotMatch(prose, /\b\d+\.\d+(\.\d+)?\b/);
  assert.doesNotMatch(prose, /#\d+/);
});
