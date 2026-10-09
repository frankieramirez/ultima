import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { matrixMarkdown, matrixSummary, retainedReports, type RetainedReport } from '../consumer-matrix.ts';
import { BUNDLE_ITEMS, CONSUMER_LAYOUTS, ELEMENT_ITEMS, ENGINES, bundleCases, elementCases, matrixCases, type ConsumerLayout, type ConsumerReport } from '../consumer-report.ts';

const digest = 'a'.repeat(64);
const head = 'c'.repeat(40);
const versions = Object.fromEntries(ENGINES.map((engine) => [engine, `${engine}-1`]));

function report(exercise: 'bundles' | 'elements', layout: ConsumerLayout, overrides: Partial<ConsumerReport> = {}): ConsumerReport {
  const cases = exercise === 'elements' ? elementCases() : bundleCases(ENGINES, layout);
  return {
    schemaVersion: 1, status: 'passed', layout, deliveryPath: 'css', exercise, engines: [...ENGINES], versions, fixture: { hash: digest, lock: digest }, platform: { os: 'Linux', release: '6', arch: 'x64' },
    source: { head, manifest: { algorithm: 'sha256', version: 1, digest, files: 0, entries: [] }, registryManifestHash: digest, cliTarballDigest: exercise === 'elements' ? null : digest, draftDigest: digest, draftFingerprint: 'f', recipeVersion: 1 },
    command: [], work: null, installedItems: exercise === 'elements' ? [...ELEMENT_ITEMS, 'tokens-css'] : layout === 'vite' ? [...BUNDLE_ITEMS] : [],
    expected: cases, executed: cases, cases: cases.map((id) => ({ id, status: 'passed', failures: [], snapshot: `${id.replaceAll('/', '-')}.values.json` })), errors: [],
    ...overrides,
  } as ConsumerReport;
}
const full = (): RetainedReport[] => [
  ...CONSUMER_LAYOUTS.map((layout) => ({ path: `${layout}/report.json`, report: report('bundles', layout), durations: Object.fromEntries(bundleCases(ENGINES, layout).map((id) => [id, 1000])) })),
  { path: 'elements/report.json', report: report('elements', 'vite'), durations: Object.fromEntries(elementCases().map((id) => [id, 500])) },
];

test('every registered cell on one revision passes the matrix', () => {
  const summary = matrixSummary(full(), true);
  assert.equal(summary.status, 'passed');
  assert.equal(summary.executed, matrixCases().length);
  assert.deepEqual(summary.heads, [head]);
  assert.deepEqual(summary.durations.hydration, { cells: 12, maxMs: 1000, totalMs: 12000 });
  assert.deepEqual(summary.durations.lifecycle, { cells: 6, maxMs: 500, totalMs: 3000 });
  assert.match(matrixMarkdown(summary), /Executed \d+ of \d+ registered cells\./);
});

test('a missing layout leaves a complete run incomplete, but not a pull request', () => {
  const partial = full().filter((row) => !row.path.startsWith('next-src'));
  const complete = matrixSummary(partial, true);
  assert.equal(complete.status, 'incomplete');
  assert.deepEqual(complete.missing, bundleCases(ENGINES, 'next-src'));
  assert.equal(matrixSummary(partial, false).status, 'passed');
});

test('two revisions, a failed cell, a failed job and an invalid report each fail or void the matrix', () => {
  const rows = full();
  rows[0]!.report = report('bundles', 'vite', { source: { ...(rows[0]!.report as ConsumerReport).source, head: 'd'.repeat(40) } });
  assert.equal(matrixSummary(rows, true).status, 'incomplete', 'cells from a second revision are not one matrix');
  const failing = full();
  const id = bundleCases(ENGINES, 'next-app')[0]!;
  failing[1]!.report = report('bundles', 'next-app', { status: 'failed', cases: bundleCases(ENGINES, 'next-app').map((cell) => ({ id: cell, status: cell === id ? 'failed' : 'passed', failures: cell === id ? ['hydration: mismatch'] : [], snapshot: 'x.json' })) });
  const failed = matrixSummary(failing, true);
  assert.equal(failed.status, 'failed');
  assert.deepEqual(failed.failed, [{ id, failures: ['hydration: mismatch'] }]);
  assert.equal(matrixSummary(full(), true, [{ name: 'lint', result: 'failure' }, { name: 'theme-mode', result: 'skipped' }]).status, 'failed');
  const invalid = full();
  invalid[3]!.report = report('elements', 'vite', { installedItems: [] });
  assert.equal(matrixSummary(invalid, true).status, 'failed');
  assert.equal(matrixSummary([], false).status, 'incomplete', 'no report is never a pass');
});

test('retained reports are read from downloaded artifacts with their cell durations', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'ultima-matrix-'));
  try {
    const vite = report('bundles', 'vite');
    await mkdir(join(folder, 'consumer-proof-vite-bundles'), { recursive: true });
    await writeFile(join(folder, 'consumer-proof-vite-bundles/report.json'), JSON.stringify(vite));
    await writeFile(join(folder, 'consumer-proof-vite-bundles', vite.cases[0]!.snapshot), JSON.stringify({ durationMs: 4200 }));
    await mkdir(join(folder, 'consumer-proof-vite-css'), { recursive: true });
    await writeFile(join(folder, 'consumer-proof-vite-css/report.json'), JSON.stringify({ ...vite, exercise: undefined }));
    const found = retainedReports(folder);
    assert.equal(found.length, 1, 'only bundles and elements reports belong to the matrix');
    assert.equal(found[0]!.durations[vite.cases[0]!.id], 4200);
  } finally { await rm(folder, { recursive: true, force: true }); }
});
