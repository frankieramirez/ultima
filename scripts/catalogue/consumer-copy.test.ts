import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { consumerBundle, consumerCopy } from './consumer-copy.ts';
import { compositionProjection, COMPOSITION_INVENTORY } from './compositions.ts';
import { memoryFiles } from './files.ts';
import { diskFixture, testPolicy } from './fixture.ts';
import { loadCatalogue } from './model.ts';
import { OUTPUTS, planOutputs } from './projections.ts';
import { exportsOf, importsOf, parse } from './source.ts';

const entry = 'apps/docs/src/demos/button/sorting.tsx';
function fixture() {
  const values = diskFixture();
  const files = memoryFiles(values);
  const { catalogue } = loadCatalogue(files);
  return { values, files, catalogue };
}

describe('consumer-copy projection', () => {
  test('splits UI exports by owner, preserves aliases, type modifiers and executable source', () => {
    const { catalogue, files } = fixture();
    const source = "'use client';\n// example\nimport { Button as Action, type ButtonProps, Sidebar } from '@ultima/ui';\nimport { space } from '@ultima/tokens/tokens.stylex';\nexport const label = '@ultima/ui';\n";
    const { content, items } = consumerCopy(entry, source, catalogue, files);
    const imports = importsOf(parse(entry, content)).imports;
    assert.deepEqual(imports.map(({ specifier }) => specifier), ['@/components/ui/button', '@/components/ui/sidebar', '@/lib/tokens.stylex']);
    assert.deepEqual(imports[0]?.names, [{ imported: 'Button', typeOnly: false }, { imported: 'ButtonProps', typeOnly: true }]);
    assert.match(content, /Button as Action/);
    assert.match(content, /^'use client';\n\/\/ example\n/);
    assert.equal(content.split('// example').length - 1, 1);
    assert.ok(content.endsWith("export const label = '@ultima/ui';\n"));
    assert.deepEqual(items, ['button', 'sidebar', 'tokens']);
  });

  test('uses components.json aliases for components, tokens and shared helper modules', () => {
    const { catalogue, files, values } = fixture();
    const helper = 'packages/ui/src/lib/component.ts';
    const name = exportsOf(parse(helper, values[helper]!)).exports[0]!.name;
    const { content } = consumerCopy(entry, `import { Button } from '@ultima/ui/button';\nimport { space } from '@ultima/tokens/tokens.stylex';\nimport type { ${name} } from '@ultima/ui/lib/component';`, catalogue, files, { ui: '~/ui', lib: '~/shared' });
    assert.deepEqual(importsOf(parse(entry, content)).imports.map(({ specifier }) => specifier), ['~/ui/button', '~/shared/tokens.stylex', '~/shared/component']);
  });

  test('rejects unresolved exports, unknown workspace modules and unsupported workspace forms', () => {
    const { catalogue, files } = fixture();
    for (const source of [
      "import { Missing } from '@ultima/ui';",
      "import { Missing } from '@ultima/ui/button';",
      "import { missing } from '@ultima/tokens/tokens.stylex';",
      "import { Missing } from '@ultima/nope';",
      "import * as UI from '@ultima/ui';",
      "export { Button } from '@ultima/ui';",
      "const ui = import('@ultima/ui');",
      'const ui = import(`@ultima/ui`);',
      "type UI = import('@ultima/ui').ButtonProps;",
    ]) assert.throws(() => consumerCopy(entry, source, catalogue, files), /exports no|unresolved workspace|requires named|require an explicit/);
  });

  test('keeps local imports, re-exports and dynamic imports with recursively derived dependencies', () => {
    const { catalogue, files, values } = fixture();
    values[entry] += "\nexport { rows } from './rows';\nconst lazy = import('./lazy');";
    values['apps/docs/src/demos/button/lazy.ts'] = "export { rows } from './rows';";
    const bundle = consumerBundle(entry, catalogue, files);
    assert.deepEqual(bundle.files.map(({ path }) => path), ['examples/demos/button/sorting.tsx', 'examples/demos/button/rows.ts', 'examples/demos/button/lazy.ts']);
    assert.match(bundle.files[0]!.content, /import \{ rows \} from '\.\/rows'/);
    assert.deepEqual(bundle.dependencies, ['@tanstack/react-table', 'd3-format']);
    assert.deepEqual(bundle.items, ['button', 'sidebar', 'tokens']);
    assert.deepEqual(bundle, consumerBundle(entry, catalogue, files));
  });

  test('rejects missing locals, computed imports, unsafe paths and broken relative destinations', () => {
    const { catalogue, files, values } = fixture();
    assert.throws(() => consumerBundle('../outside.ts', catalogue, files), /unsafe copy path/);
    assert.throws(() => consumerBundle(entry, catalogue, files, undefined, { [entry]: 'elsewhere/demo.tsx' }), /changes its relative import/);
    values[entry] = "import './missing';";
    assert.throws(() => consumerBundle(entry, catalogue, files), /unresolved local dependency/);
    values[entry] = 'const lazy = import(name);';
    assert.throws(() => consumerBundle(entry, catalogue, files), /computed specifier/);
  });

  test('retains local type-query dependencies and derives external type packages', () => {
    const { catalogue, files, values } = fixture();
    values[entry] = "export type Row = import('./types').Row;\nexport type Scale = import('d3-scale').ScaleLinear<number, number>;\n";
    values['apps/docs/src/demos/button/types.ts'] = "export type Row = import('./nested').Row;\n";
    values['apps/docs/src/demos/button/nested.ts'] = 'export type Row = { id: string };\n';
    const bundle = consumerBundle(entry, catalogue, files);
    assert.deepEqual(bundle.files.map(({ path }) => path), ['examples/demos/button/sorting.tsx', 'examples/demos/button/types.ts', 'examples/demos/button/nested.ts']);
    assert.equal(bundle.files[0]!.content, values[entry]);
    assert.deepEqual(bundle.dependencies, ['d3-scale']);
    delete values['apps/docs/src/demos/button/nested.ts'];
    assert.throws(() => consumerBundle(entry, catalogue, files), /unresolved local dependency "\.\/nested"/);
  });
});

describe('composition inventory and generated recipes', () => {
  const example = {
    id: 'sorting', title: 'Sorting', recipe: 'data-table', route: '/components/button', anchor: 'sorting',
    files: [{ source: entry, destination: 'examples/demos/button/sorting.tsx' }],
  };
  test('validates the inventory and derives commands from items and engines, never recipes', () => {
    const { values, files, catalogue } = fixture();
    values[COMPOSITION_INVENTORY] = `export default ${JSON.stringify([example])} satisfies CompositionExample[];`;
    const projection = compositionProjection(files, catalogue);
    assert.deepEqual(projection.diagnostics, []);
    assert.equal(projection.examples.length, 1);
    assert.equal(projection.recipes.length, catalogue.recipes.length);
    assert.equal(projection.recipes[0]!.url, '/components/button#sorting');
    assert.equal(projection.recipes[0]!.install, 'npx shadcn add @ultima/button @ultima/sidebar');
    assert.equal(projection.recipes[0]!.engines, 'npm install @tanstack/react-table d3-format');
    const first = planOutputs(files, testPolicy);
    assert.deepEqual(first.diagnostics, []);
    assert.equal(first.outputs.get(OUTPUTS.recipes), planOutputs(files, testPolicy).outputs.get(OUTPUTS.recipes));
    assert.doesNotMatch(first.outputs.get(OUTPUTS.recipes)!, /from '@ultima\//);
  });

  test('rejects duplicate IDs, unresolved anchors, owners, proof references and sources', () => {
    const { values, files, catalogue } = fixture();
    for (const inventory of [
      [example, example], [{ ...example, id: '../invalid' }], [{ ...example, anchor: 'missing' }],
      [{ ...example, recipe: 'missing' }], [{ ...example, block: 'missing' }],
      [{ ...example, feature: 'missing' }], [{ ...example, scenarios: ['missing'] }],
      [{ ...example, files: [{ source: '../outside', destination: 'examples/demo.tsx' }] }],
      [{ ...example, files: [{ source: 'missing.tsx', destination: 'examples/demo.tsx' }] }],
    ]) {
      values[COMPOSITION_INVENTORY] = `export default ${JSON.stringify(inventory)} satisfies CompositionExample[];`;
      assert.ok(compositionProjection(files, catalogue).diagnostics.length > 0, JSON.stringify(inventory));
    }
  });

  test('an example awaiting its page omits route and anchor together and derives its install command from its imports', () => {
    const { values, files, catalogue } = fixture();
    const { route: _route, anchor: _anchor, recipe: _recipe, ...unpublished } = example;
    values[COMPOSITION_INVENTORY] = `export default ${JSON.stringify([unpublished])} satisfies CompositionExample[];`;
    const projection = compositionProjection(files, catalogue);
    assert.deepEqual(projection.diagnostics, []);
    assert.deepEqual(projection.sources[entry]!.items, ['button', 'sidebar', 'tokens']);
    assert.equal(projection.examples[0]!.install, 'npx shadcn add @ultima/button @ultima/sidebar');
    for (const partial of [{ ...unpublished, route: '/components/button' }, { ...unpublished, anchor: 'sorting' }]) {
      values[COMPOSITION_INVENTORY] = `export default ${JSON.stringify([partial])} satisfies CompositionExample[];`;
      assert.ok(compositionProjection(files, catalogue).diagnostics.length > 0, JSON.stringify(partial));
    }
  });

  test('rejects a missing authored inventory', () => {
    const { values, files, catalogue } = fixture();
    delete values[COMPOSITION_INVENTORY];
    assert.ok(compositionProjection(files, catalogue).diagnostics.some(({ message }) => message === 'missing composition inventory'));
  });

  test('an unresolved workspace export produces a generation diagnostic', () => {
    const { values, files } = fixture();
    values[entry] += "\nimport { Missing } from '@ultima/tokens/tokens.stylex';";
    assert.ok(planOutputs(files, testPolicy).diagnostics.some(({ message }) => message.includes('exports no "Missing"')));
  });
});
