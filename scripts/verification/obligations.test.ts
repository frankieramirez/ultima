/**
 * The required production obligations, written out independently of the records they protect: the
 * 28-cell matrix under Validation and coverage in docs/spec/agent-infrastructure.md. A contract test,
 * never a discovery source. Removing a target, a light/narrow variant or a binding, repeating a variant,
 * or skipping or doubling a cell fails here; a new required scenario joins the cases on its own.
 */
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { diskFiles, memoryFiles } from '../catalogue/files.ts';
import { loadCatalogue } from '../catalogue/model.ts';
import { validFixture as validCatalogue } from '../catalogue/fixture.ts';
import { casesFor, loadVerification, repositoryFiles } from './model.ts';
import { judge } from './run.ts';

const BOTH = ['dark', 'light'];
const MATRIX: [scenario: string, viewports: string[], motion: string][] = [
  ['site-navigation.route-and-mode', ['desktop', 'narrow'], 'normal'],
  ['catalogue.filter-and-demo', ['desktop', 'narrow'], 'normal'],
  ['dialog.keyboard-dismissal', ['desktop', 'narrow'], 'normal'],
  ['theme-studio.draft-history', ['desktop', 'narrow'], 'normal'],
  ['theme-studio.pane-boundaries', ['desktop'], 'normal'],
  ['elements.fixture-interactions', ['desktop', 'narrow'], 'normal'],
  ['motion.reduced-loop', ['desktop', 'narrow'], 'reduced'],
  ['site-discovery.discovery-surface', ['desktop'], 'normal'],
];

const REQUIRED = MATRIX.flatMap(([scenario, viewports, motion]) =>
  BOTH.flatMap((mode) => viewports.map((viewport) => `${scenario}@production[mode=${mode},viewport=${viewport},motion=${motion}]`)),
);

function coverage(actual: string[]) {
  return { missing: REQUIRED.filter((cell) => !actual.includes(cell)), unexpected: actual.filter((cell) => !REQUIRED.includes(cell)) };
}

type Declared = Record<string, { mode: string[]; viewport: string[]; motion: string[] } | undefined>;

/** The files of a repository registering every matrix scenario with the given production variants (undefined drops the target). */
function registeredFiles(declared: Declared): Record<string, string> {
  const files = validCatalogue();
  for (const [id, variants] of Object.entries(declared)) {
    const [featureId, name] = id.split('.') as [string, string];
    files[`verification/features/${featureId}.json`] = JSON.stringify({
      schemaVersion: 1,
      id: featureId,
      title: featureId,
      summary: 'A fixture feature.',
      aliases: [],
      contract: 'docs/spec/ultima.md#plain-components',
      items: [],
      sourceRoots: [],
      extraDependencies: [],
      supporting: [],
    });
    files[`verification/scenarios/${featureId}/${name}.json`] = JSON.stringify({
      schemaVersion: 1,
      id,
      title: id,
      intent: 'A fixture scenario.',
      contract: 'docs/spec/ultima.md#plain-components',
      aliases: [],
      items: [],
      sources: [],
      demos: [],
      routes: [],
      fixtures: [],
      preconditions: [],
      steps: [{ action: 'Act.', expect: 'Observe.' }],
      targets: variants ? [{ target: 'production', variants }] : [{ target: 'ui-vitest', variants: 'default' }],
    });
    files[`apps/docs/tests/production/${id}.ts`] = [
      "import { productionScenario } from '../../../../scripts/verification/production.ts';",
      `export default productionScenario('${id}', 'production', async () => {});`,
    ].join('\n');
    if (!variants) {
      files[`packages/ui/src/__tests__/${id}.test.tsx`] = [
        "import { scenario } from '../../../../scripts/verification/register.ts';",
        `test('x', scenario('${id}', 'ui-vitest', async () => {}));`,
      ].join('\n');
    }
  }
  return files;
}

function load(files: Record<string, string>) {
  const memory = memoryFiles(files);
  return loadVerification(memory, loadCatalogue(memory).catalogue);
}

function registered(declared: Declared) {
  return load(registeredFiles(declared));
}

const complete = (): Declared =>
  Object.fromEntries(MATRIX.map(([id, viewports, motion]) => [id, { mode: [...BOTH], viewport: [...viewports], motion: [motion] }]));

describe('the production obligations', () => {
  test('are 28 cells across eight scenarios', () => {
    assert.equal(REQUIRED.length, 28);
    assert.equal(new Set(REQUIRED).size, 28);
  });

  test('a model registering the whole matrix covers exactly those cells', () => {
    const { model, diagnostics } = registered(complete());
    assert.deepEqual(diagnostics, []);
    assert.deepEqual(coverage(casesFor(model, 'production')), { missing: [], unexpected: [] });
  });

  test('removing a light variant loses its cells', () => {
    const declared = complete();
    (declared['dialog.keyboard-dismissal'] as { mode: string[] }).mode = ['dark'];
    const { missing } = coverage(casesFor(registered(declared).model, 'production'));
    assert.deepEqual(missing, [
      'dialog.keyboard-dismissal@production[mode=light,viewport=desktop,motion=normal]',
      'dialog.keyboard-dismissal@production[mode=light,viewport=narrow,motion=normal]',
    ]);
  });

  test('removing a narrow variant loses its cells', () => {
    const declared = complete();
    (declared['motion.reduced-loop'] as { viewport: string[] }).viewport = ['desktop'];
    assert.equal(coverage(casesFor(registered(declared).model, 'production')).missing.length, 2);
  });

  test('removing the production target loses every cell of the scenario', () => {
    const declared = complete();
    declared['theme-studio.pane-boundaries'] = undefined;
    const { model, diagnostics } = registered(declared);
    assert.ok(diagnostics.some((d) => d.code === 'undeclared-target'), 'its production binding is left undeclared');
    assert.deepEqual(coverage(casesFor(model, 'production')).missing, [
      'theme-studio.pane-boundaries@production[mode=dark,viewport=desktop,motion=normal]',
      'theme-studio.pane-boundaries@production[mode=light,viewport=desktop,motion=normal]',
    ]);
  });

  test('a repeated variant is rejected, so no cell can be counted twice', () => {
    const declared = complete();
    (declared['catalogue.filter-and-demo'] as { mode: string[] }).mode = ['dark', 'light', 'dark'];
    const { model, diagnostics } = registered(declared);
    assert.ok(diagnostics.some((d) => d.code === 'invalid-record' && /mode repeats a value/.test(d.message)), 'the record is invalid');
    assert.equal(coverage(casesFor(model, 'production')).missing.filter((cell) => cell.startsWith('catalogue.')).length, 4, 'and none of its cells is registered');
  });

  test('a deleted binding is a missing-binding error, and its cells stay expected so a run cannot cover them', () => {
    const files = registeredFiles(complete());
    delete files['apps/docs/tests/production/elements.fixture-interactions.ts'];
    const { model, diagnostics } = load(files);
    assert.deepEqual(
      diagnostics.map((d) => [d.code, d.path]),
      [['missing-binding', 'verification/scenarios/elements/fixture-interactions.json']],
    );
    assert.deepEqual(coverage(casesFor(model, 'production')), { missing: [], unexpected: [] }, 'the obligation is still planned');
    const slot = model.scenarios.find((s) => s.id === 'elements.fixture-interactions')?.bindings.find((b) => b.target === 'production');
    assert.equal(slot?.binding, undefined, 'nothing can execute it');
    const judged = judge({ verdict: 'passed', process: null, executed: REQUIRED.filter((cell) => !cell.startsWith('elements.')) }, REQUIRED);
    assert.equal(judged.failure?.kind, 'incomplete');
    assert.match(judged.reason, /expected coverage did not execute: elements\.fixture-interactions@production/);
  });

  test('a skipped or duplicated cell cannot pass coverage', () => {
    const [first] = REQUIRED as [string];
    const skipped = judge({ verdict: 'passed', process: null, executed: REQUIRED.filter((cell) => cell !== first), skipped: [first] }, REQUIRED);
    assert.match(skipped.reason, /required coverage was skipped/);
    const doubled = judge({ verdict: 'passed', process: null, executed: [...REQUIRED.slice(1), REQUIRED[1] as string] }, REQUIRED);
    assert.match(doubled.reason, new RegExp(`expected coverage did not execute: ${first.replace(/[.[\]]/g, '\\$&')}`), 'running one cell twice does not cover another');
  });

  test('an additional required scenario joins the production cases without editing any list', () => {
    const files = registeredFiles(complete());
    files['verification/scenarios/motion/extra-loop.json'] = files['verification/scenarios/motion/reduced-loop.json']?.replaceAll('motion.reduced-loop', 'motion.extra-loop') ?? '';
    files['apps/docs/tests/production/motion.extra-loop.ts'] = files['apps/docs/tests/production/motion.reduced-loop.ts']?.replaceAll('motion.reduced-loop', 'motion.extra-loop') ?? '';
    const { model, diagnostics } = load(files);
    assert.deepEqual(diagnostics, []);
    const { missing, unexpected } = coverage(casesFor(model, 'production'));
    assert.deepEqual(missing, []);
    assert.equal(unexpected.length, 4);
    assert.ok(unexpected.every((cell) => cell.startsWith('motion.extra-loop@production[')));
  });

  test('changing the motion variant is caught both ways', () => {
    const declared = complete();
    (declared['motion.reduced-loop'] as { motion: string[] }).motion = ['normal'];
    const { missing, unexpected } = coverage(casesFor(registered(declared).model, 'production'));
    assert.equal(missing.length, 4);
    assert.equal(unexpected.length, 4);
  });
});

describe('the repository', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
  const files = repositoryFiles(root);
  const { model, diagnostics } = loadVerification(files, loadCatalogue(diskFiles(root)).catalogue);

  test('registers exactly the 28 required production cells', () => {
    assert.deepEqual(diagnostics, []);
    assert.deepEqual(coverage(casesFor(model, 'production')), { missing: [], unexpected: [] });
  });

  test('binds each production scenario in apps/docs/tests/production/, one file per scenario', () => {
    for (const [id] of MATRIX) {
      const slot = model.scenarios.find((s) => s.id === id)?.bindings.find((b) => b.target === 'production');
      assert.equal(slot?.binding?.path, `apps/docs/tests/production/${id}.ts`, id);
    }
  });

  test('keeps each pilot scenario registered in its existing Vitest suite', () => {
    const where = (id: string) => model.scenarios.find((s) => s.id === id)?.bindings.map((slot) => [slot.target, slot.binding?.path]);
    assert.deepEqual(where('dialog.keyboard-dismissal'), [
      ['ui-vitest', 'packages/ui/src/__tests__/dialog.test.tsx'],
      ['production', 'apps/docs/tests/production/dialog.keyboard-dismissal.ts'],
    ]);
    assert.deepEqual(where('theme-studio.draft-history'), [
      ['docs-vitest', 'apps/docs/src/__tests__/theme-studio.test.tsx'],
      ['production', 'apps/docs/tests/production/theme-studio.draft-history.ts'],
    ]);
    assert.deepEqual(where('site-discovery.discovery-surface'), [
      ['docs-vitest', 'apps/docs/src/__tests__/document-title.test.tsx'],
      ['production', 'apps/docs/tests/production/site-discovery.discovery-surface.ts'],
    ]);
  });
});
