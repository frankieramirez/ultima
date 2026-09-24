/**
 * The required production obligations, written out independently of the records they protect: the
 * 26-cell matrix under Validation and coverage in docs/spec/agent-infrastructure.md. A contract test,
 * never a discovery source. Removing a target or a light/narrow variant from the model fails here.
 */
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { diskFiles, memoryFiles } from '../catalogue/files.ts';
import { loadCatalogue } from '../catalogue/model.ts';
import { validFixture as validCatalogue } from '../catalogue/fixture.ts';
import { casesFor, loadVerification, repositoryFiles } from './model.ts';

const BOTH = ['dark', 'light'];
const MATRIX: [scenario: string, viewports: string[], motion: string][] = [
  ['site-navigation.route-and-mode', ['desktop', 'narrow'], 'normal'],
  ['catalogue.filter-and-demo', ['desktop', 'narrow'], 'normal'],
  ['dialog.keyboard-dismissal', ['desktop', 'narrow'], 'normal'],
  ['theme-studio.draft-history', ['desktop', 'narrow'], 'normal'],
  ['theme-studio.pane-boundaries', ['desktop'], 'normal'],
  ['elements.fixture-interactions', ['desktop', 'narrow'], 'normal'],
  ['motion.reduced-loop', ['desktop', 'narrow'], 'reduced'],
];
const PILOT = ['dialog.keyboard-dismissal', 'theme-studio.draft-history'];

const REQUIRED = MATRIX.flatMap(([scenario, viewports, motion]) =>
  BOTH.flatMap((mode) => viewports.map((viewport) => `${scenario}@production[mode=${mode},viewport=${viewport},motion=${motion}]`)),
);

function coverage(actual: string[]) {
  return { missing: REQUIRED.filter((cell) => !actual.includes(cell)), unexpected: actual.filter((cell) => !REQUIRED.includes(cell)) };
}

type Declared = Record<string, { mode: string[]; viewport: string[]; motion: string[] } | undefined>;

/** A repository registering every matrix scenario with the given production variants (undefined drops the target). */
function registered(declared: Declared) {
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
  const memory = memoryFiles(files);
  return loadVerification(memory, loadCatalogue(memory).catalogue);
}

const complete = (): Declared =>
  Object.fromEntries(MATRIX.map(([id, viewports, motion]) => [id, { mode: [...BOTH], viewport: [...viewports], motion: [motion] }]));

describe('the production obligations', () => {
  test('are 26 cells across seven scenarios', () => {
    assert.equal(REQUIRED.length, 26);
    assert.equal(new Set(REQUIRED).size, 26);
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

  test('registers the pilot production cells and no cell outside the matrix', () => {
    assert.deepEqual(diagnostics, []);
    const { missing, unexpected } = coverage(casesFor(model, 'production'));
    assert.deepEqual(unexpected, []);
    assert.deepEqual(
      missing,
      REQUIRED.filter((cell) => !PILOT.some((id) => cell.startsWith(`${id}@`))),
      'only the scenarios after the pilot remain unregistered',
    );
    assert.equal(REQUIRED.length - missing.length, 8);
  });

  test('registers each pilot scenario in its existing Vitest suite', () => {
    const where = (id: string) => model.scenarios.find((s) => s.id === id)?.bindings.map((slot) => [slot.target, slot.binding?.path]);
    assert.deepEqual(where('dialog.keyboard-dismissal'), [
      ['ui-vitest', 'packages/ui/src/__tests__/dialog.test.tsx'],
      ['production', 'apps/docs/tests/production/dialog.keyboard-dismissal.ts'],
    ]);
    assert.deepEqual(where('theme-studio.draft-history'), [
      ['docs-vitest', 'apps/docs/src/__tests__/theme-studio.test.tsx'],
      ['production', 'apps/docs/tests/production/theme-studio.draft-history.ts'],
    ]);
  });
});
