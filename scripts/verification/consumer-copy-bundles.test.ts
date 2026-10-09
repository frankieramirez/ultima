import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
import { compositionExamples, recipeSources, recipes } from '../../apps/docs/src/generated/recipes.ts';
import { COPY_BUNDLES, COPY_TYPES, EXERCISES, copySnapshotProblems, gallerySource } from '../consumer-copy-bundles.ts';
import { ADAPTED_BLOCK, consumerReportProblems, copyBundleCases } from '../consumer-report.ts';

test('every bundle the inventory and the Recipes index expose is installed and exercised', () => {
  const exposed = new Set([...compositionExamples.flatMap((example) => example.files.slice(0, 1).map((file) => file.source)), ...recipes.flatMap((recipe) => recipe.sources)]);
  assert.deepEqual(new Set(COPY_BUNDLES.map((bundle) => bundle.entry)), exposed);
  const exercised = new Set(Object.values(EXERCISES).map((exercise) => exercise.bundle));
  for (const bundle of COPY_BUNDLES) assert.ok(exercised.has(bundle.id), `${bundle.id} has no installed exercise`);
  for (const lesson of compositionExamples) {
    const covered = lesson.block ? exercised.has(lesson.block) : Object.keys(EXERCISES).some((name) => name === lesson.id || name.startsWith(`${lesson.id}-`));
    assert.ok(covered, `lesson ${lesson.id} has no installed exercise`);
  }
  assert.deepEqual(Object.values(EXERCISES).filter((exercise) => exercise.bundle === ADAPTED_BLOCK).map((exercise) => exercise.viewport.width), [1280, 390]);
  assert.equal(EXERCISES['projects-zoom-200']?.viewport.deviceScaleFactor, 2);
  assert.ok(COPY_TYPES.includes('@types/d3-scale'), 'the Chart engines install their type packages');
});

test('the gallery imports every entry by its copied path and parses as TSX', () => {
  const source = gallerySource();
  for (const bundle of COPY_BUNDLES) {
    const entry = recipeSources[bundle.entry]!.files.find((file) => file.source === bundle.entry)!;
    assert.ok(source.includes(`from './${entry.path.replace(/\.tsx?$/, '')}'`), bundle.id);
  }
  const output = ts.transpileModule(source, { fileName: 'CopyBundles.tsx', reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.ReactJSX } });
  assert.deepEqual(output.diagnostics, []);
});

test('the seeded unresolved import still finds a copied Button import to break', () => {
  assert.ok(COPY_BUNDLES.some((bundle) => recipeSources[bundle.entry]!.files.some((file) => file.content.includes("from '@/components/ui/button'"))));
});

test('a copy-bundles report needs every case and the adapted block, and cannot satisfy another gate', () => {
  for (const layout of ['vite', 'next-app', 'next-src'] as const) {
    const cases = copyBundleCases(layout);
    const report = { exercise: 'copy-bundles', layout, deliveryPath: 'css', expected: cases, executed: cases, cases: cases.map((id) => ({ id, status: 'passed', failures: [], snapshot: 'fixture.json' })), installedItems: [ADAPTED_BLOCK] };
    assert.ok(!consumerReportProblems(report).includes('consumer-proof case coverage is incomplete'));
    assert.ok(consumerReportProblems({ ...report, executed: cases.slice(1) }).includes('consumer-proof case coverage is incomplete'));
    assert.ok(consumerReportProblems({ ...report, exercise: 'theme-mode' }).includes('consumer-proof case coverage is incomplete'));
    assert.ok(consumerReportProblems({ ...report, installedItems: [] }).includes('copy-bundles installed source inventory is incomplete'));
    assert.ok(consumerReportProblems({ ...report, deliveryPath: 'registry' }).includes('copy-bundles requires CSS delivery'));
  }
});

test('copy snapshots must agree with their case and retain their artifacts', () => {
  const id = copyBundleCases('vite').at(-1)!;
  const row = { id, status: 'passed', failures: [] };
  const artifacts = { build: 'build.log', server: 'server.log', browser: 'b.json', axe: 'a.json', screenshot: 's.png' };
  assert.deepEqual(copySnapshotProblems({ id, failures: [], artifacts }, row), []);
  assert.ok(copySnapshotProblems({ id, failures: ['hidden'], artifacts }, row).length);
  assert.ok(copySnapshotProblems({ id, failures: [], artifacts: { build: 'build.log' } }, row).length);
  assert.ok(copySnapshotProblems(null, row).length);
  assert.ok(copySnapshotProblems({ id: 'vite/copy-bundles/chromium/unknown', failures: [], artifacts }, { ...row, id: 'vite/copy-bundles/chromium/unknown' }).length);
});
