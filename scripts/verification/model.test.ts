import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { memoryFiles } from '../catalogue/files.ts';
import { loadCatalogue } from '../catalogue/model.ts';
import {
  FEATURE,
  PRODUCTION_BINDING,
  SCENARIO,
  UI_BINDING,
  feature,
  productionBinding,
  scenario,
  uiBinding,
  validFixture,
} from './fixture.ts';
import { type RepositoryFiles, type VerificationCode, casesFor, loadVerification } from './model.ts';
import { scenario as register } from './register.ts';

function load(changes: Record<string, string | undefined> = {}, real?: (path: string) => string | undefined) {
  const contents = { ...validFixture(), ...changes };
  for (const [path, text] of Object.entries(changes)) if (text === undefined) delete contents[path];
  const files: RepositoryFiles = { ...memoryFiles(contents as Record<string, string>), ...(real ? { real } : {}) };
  const { catalogue, diagnostics } = loadCatalogue(files);
  assert.deepEqual(diagnostics, [], 'the catalogue fixture stays valid');
  return loadVerification(files, catalogue);
}

function expectDiagnostic(changes: Record<string, string | undefined>, code: VerificationCode, where: string | RegExp) {
  const { diagnostics } = load(changes);
  const found = diagnostics.filter((d) => d.code === code);
  assert.ok(
    found.some((d) => (typeof where === 'string' ? `${d.path} ${d.message}`.includes(where) : where.test(`${d.path} ${d.message}`))),
    `expected ${code} at ${where}, got ${JSON.stringify(diagnostics, null, 2)}`,
  );
}

const withScenario = (changes: Record<string, unknown>) => ({ [SCENARIO]: JSON.stringify(scenario(changes)) });
const withFeature = (changes: Record<string, unknown>) => ({ [FEATURE]: JSON.stringify(feature(changes)) });

describe('the valid feature map', () => {
  const { model, diagnostics } = load();

  test('loads without a diagnostic', () => assert.deepEqual(diagnostics, []));

  test('derives membership from the directory and joins one binding per target', () => {
    assert.deepEqual(model.features.map((f) => [f.id, f.scenarios]), [['button', ['button.press']]]);
    const [joined] = model.scenarios;
    assert.deepEqual(
      joined?.bindings.map((slot) => [slot.target, slot.binding?.path, slot.binding?.line]),
      [
        ['ui-vitest', UI_BINDING, 3],
        ['production', PRODUCTION_BINDING, 2],
      ],
    );
    assert.deepEqual(joined?.resolvedRoutes.map((route) => route.pathname), ['/components/button', '/studio']);
  });

  test('expands one default case per Vitest binding and the declared production product', () => {
    assert.deepEqual(casesFor(model, 'ui-vitest'), ['button.press@ui-vitest[default]']);
    assert.deepEqual(casesFor(model, 'production'), [
      'button.press@production[mode=dark,viewport=desktop,motion=normal]',
      'button.press@production[mode=dark,viewport=narrow,motion=normal]',
      'button.press@production[mode=light,viewport=desktop,motion=normal]',
      'button.press@production[mode=light,viewport=narrow,motion=normal]',
    ]);
  });

  test('renaming a title leaves every ID and case unchanged', () => {
    const renamed = load({ ...withScenario({ title: 'Clicking a button' }), ...withFeature({ title: 'Buttons' }) });
    assert.deepEqual(renamed.diagnostics, []);
    assert.deepEqual(renamed.model.scenarios.map((s) => s.id), model.scenarios.map((s) => s.id));
    assert.deepEqual(casesFor(renamed.model, 'production'), casesFor(model, 'production'));
    assert.deepEqual(casesFor(renamed.model, 'ui-vitest'), casesFor(model, 'ui-vitest'));
  });

  test('finds aliased and namespace imports of the helper', () => {
    const aliased = load({
      [UI_BINDING]: [
        "import { scenario as registered } from '../../../../scripts/verification/register.ts';",
        "test('presses', registered('button.press', 'ui-vitest', async () => {}));",
      ].join('\n'),
      [PRODUCTION_BINDING]: [
        "import * as production from '../../../../scripts/verification/production.ts';",
        "export default production.productionScenario('button.press', 'production', async () => {});",
      ].join('\n'),
    });
    assert.deepEqual(aliased.diagnostics, []);
  });

  test('ignores a scenario-shaped string that no helper registers', () => {
    const { diagnostics } = load({
      'packages/ui/src/__tests__/other.test.tsx': "// verification/\ntest('button.press', () => scenario('button.orphan', 'ui-vitest'));\n",
    });
    assert.deepEqual(diagnostics, []);
  });
});

describe('bindings', () => {
  test('an orphan binding has no record', () =>
    expectDiagnostic({ 'packages/ui/src/__tests__/extra.test.tsx': uiBinding('button.orphan') }, 'orphan-binding', 'button.orphan'));

  test('a renamed binding orphans itself and leaves its scenario without the target', () => {
    const renamed = { [UI_BINDING]: uiBinding('button.pressed') };
    expectDiagnostic(renamed, 'orphan-binding', '"button.pressed"');
    expectDiagnostic(renamed, 'missing-binding', /button\.press requires a ui-vitest binding/);
  });

  test('a deleted binding names the scenario and the expected target', () =>
    expectDiagnostic({ [PRODUCTION_BINDING]: undefined }, 'missing-binding', /button\.press requires a production binding under apps\/docs\/tests\/production/));

  test('a second binding for one scenario and target is a duplicate', () =>
    expectDiagnostic({ 'packages/ui/src/__tests__/again.test.tsx': uiBinding() }, 'duplicate-binding', /button\.press already has its ui-vitest binding at packages\/ui\/src\/__tests__\/(again|button)\.test\.tsx:3/));

  test('a binding for a target the record does not declare', () =>
    expectDiagnostic({ 'apps/docs/src/__tests__/button.test.tsx': uiBinding('button.press', 'docs-vitest') }, 'undeclared-target', 'docs-vitest'));

  test('a binding outside its target directory', () =>
    expectDiagnostic({ 'apps/docs/src/__tests__/button.test.tsx': uiBinding('button.press', 'ui-vitest') }, 'misplaced-binding', 'packages/ui/src/__tests__/'));

  test('a dynamic ID cannot be discovered', () =>
    expectDiagnostic(
      {
        [UI_BINDING]: [
          "import { scenario } from '../../../../scripts/verification/register.ts';",
          "const id = 'button.press';",
          "test('presses', scenario(id, 'ui-vitest', async () => {}));",
        ].join('\n'),
      },
      'dynamic-registration',
      `${UI_BINDING}:3`,
    ));

  test('a helper passed around instead of called', () =>
    expectDiagnostic(
      {
        'packages/ui/src/__tests__/wrap.test.tsx': [
          "import { scenario } from '../../../../scripts/verification/register.ts';",
          'const wrap = scenario;',
        ].join('\n'),
      },
      'dynamic-registration',
      'only supported as a direct call',
    ));

  test('an unknown target literal', () =>
    expectDiagnostic({ [UI_BINDING]: uiBinding('button.press', 'storybook') }, 'dynamic-registration', '"storybook" is not a target'));

  test('the Vitest helper records one case and runs the callback unchanged', async () => {
    const context = { task: { meta: {} as Record<string, unknown> } };
    let ran = 0;
    const result = await register('button.press', 'ui-vitest', async (received) => {
      assert.equal(received, context);
      ran += 1;
      return 'done';
    })(context);
    assert.equal(result, 'done');
    assert.equal(ran, 1);
    assert.deepEqual(context.task.meta.scenario, { id: 'button.press', target: 'ui-vitest', case: 'button.press@ui-vitest[default]' });
  });
});

describe('records', () => {
  test('an unknown field', () => expectDiagnostic(withScenario({ owner: 'me' }), 'invalid-record', 'scenario.owner is not a known field'));

  test('a capability requirement or removal outside the production target, of an unknown capability, or of both at once', () => {
    expectDiagnostic(withScenario({ targets: [{ target: 'ui-vitest', variants: 'default', remove: ['webgl'] }] }), 'invalid-record', 'remove is for the production target only');
    expectDiagnostic(withScenario({ targets: [{ target: 'production', variants: 'default', remove: ['camera'] }] }), 'invalid-record', 'remove[0] is not one of webgl');
    expectDiagnostic(withScenario({ targets: [{ target: 'ui-vitest', variants: 'default', require: ['webgl'] }] }), 'invalid-record', 'require is for the production target only');
    expectDiagnostic(withScenario({ targets: [{ target: 'production', variants: 'default', require: ['webgl'], remove: ['webgl'] }] }), 'invalid-record', 'both requires and removes webgl');
  });

  test('text that is not JSON', () => expectDiagnostic({ [SCENARIO]: '{ id: button.press }' }, 'not-json', SCENARIO));

  test('an ID that disagrees with its path', () => expectDiagnostic(withScenario({ id: 'button.click' }), 'id-mismatch', 'makes it "button.press"'));

  test('a feature ID that disagrees with its file name', () => expectDiagnostic(withFeature({ id: 'buttons' }), 'id-mismatch', 'buttons'));

  test('scenarios with no owning feature', () =>
    expectDiagnostic({ 'verification/scenarios/toast/close.json': JSON.stringify(scenario({ id: 'toast.close' })) }, 'absent-owner', 'toast'));

  test('a broken contract anchor', () => expectDiagnostic(withScenario({ contract: 'docs/spec/ultima.md#no-such-heading' }), 'broken-anchor', 'no heading #no-such-heading'));

  test('a contract outside docs/spec', () => expectDiagnostic(withFeature({ contract: 'README.md#usage' }), 'broken-anchor', 'README.md#usage'));

  test('an unknown item', () => expectDiagnostic(withFeature({ items: ['button', 'buton'] }), 'unknown-item', '"buton"'));

  test('an item the feature does not own', () => expectDiagnostic(withScenario({ items: ['button', 'sidebar'] }), 'outside-ownership', '"sidebar"'));

  test('a stale source path', () => expectDiagnostic(withScenario({ sources: ['packages/ui/src/gone.tsx'] }), 'missing-file', 'packages/ui/src/gone.tsx'));

  test('a source outside the feature', () => expectDiagnostic(withScenario({ sources: ['packages/ui/src/sidebar.tsx'] }), 'outside-ownership', 'sidebar.tsx'));

  test('a demo of another item', () => expectDiagnostic(withScenario({ demos: ['apps/docs/src/demos/sidebar/basic.tsx'] }), 'outside-ownership', 'demos/sidebar'));

  test('a missing fixture', () =>
    expectDiagnostic(withScenario({ fixtures: [{ name: 'gone', path: 'apps/docs/src/demos/button/gone.tsx', reset: 'unmount' }] }), 'missing-file', 'gone.tsx'));

  test('a path escaping the repository', () =>
    expectDiagnostic(withScenario({ sources: ['../elsewhere/button.tsx'] }), 'path-outside', '"../elsewhere/button.tsx"'));

  test('a symlink resolving outside the repository', () => {
    const { diagnostics } = load({}, (path) => (path === 'packages/ui/src/button.tsx' ? '../outside/button.tsx' : path));
    assert.ok(diagnostics.some((d) => d.code === 'path-outside' && d.message.includes('resolves outside')), JSON.stringify(diagnostics));
  });

  test('a source root with no source', () =>
    expectDiagnostic({ ...withFeature({ sourceRoots: ['docs/spec'] }), 'docs/spec/notes.txt': 'x' }, 'empty-source-root', 'docs/spec'));

  test('an application route the router does not define', () =>
    expectDiagnostic(withScenario({ routes: [{ kind: 'application', definition: 'apps/docs/src/router.tsx', pathname: '/studios' }] }), 'unsupported-route', '"/studios"'));

  test('an item route for an item without a component page', () =>
    expectDiagnostic(
      { ...withFeature({ items: ['button', 'ult-button'] }), ...withScenario({ items: ['button', 'ult-button'], routes: [{ kind: 'item', item: 'ult-button' }] }) },
      'unsupported-route',
      'ult-button',
    ));

  test('a static fixture not served where the record says', () =>
    expectDiagnostic(
      { 'apps/docs/public/elements.html': '<html></html>', ...withScenario({ routes: [{ kind: 'static', file: 'apps/docs/public/elements.html', pathname: '/fixture.html' }] }) },
      'unsupported-route',
      'elements.html',
    ));

  test('a malformed variant value', () =>
    expectDiagnostic(withScenario({ targets: [{ target: 'ui-vitest', variants: 'default' }, { target: 'production', variants: { mode: ['dusk'], viewport: ['desktop'], motion: ['normal'] } }] }), 'invalid-record', 'mode[0]'));

  test('a production variant missing an axis', () =>
    expectDiagnostic(withScenario({ targets: [{ target: 'ui-vitest', variants: 'default' }, { target: 'production', variants: { mode: ['dark'], viewport: ['desktop'] } }] }), 'invalid-record', 'motion is missing'));

  test('a Vitest target with mode variants its fixture does not apply', () =>
    expectDiagnostic(withScenario({ targets: [{ target: 'ui-vitest', variants: { mode: ['dark', 'light'], viewport: ['desktop'], motion: ['normal'] } }, { target: 'production', variants: 'default' }] }), 'unsupported-variant', 'ui-vitest'));

  test('an unknown target', () => expectDiagnostic(withScenario({ targets: [{ target: 'storybook', variants: 'default' }] }), 'invalid-record', 'targets[0].target'));

  test('no steps', () => expectDiagnostic(withScenario({ steps: [] }), 'invalid-record', 'scenario.steps is empty'));

  test('a supporting suite no runner discovers', () =>
    expectDiagnostic(withFeature({ supporting: [{ path: 'packages/ui/src/button.tsx', reason: 'x' }] }), 'path-outside', 'not a test file'));
});
