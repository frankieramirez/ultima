import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { memoryFiles } from './files.ts';
import { descriptor, validFixture } from './fixture.ts';
import { type DiagnosticCode, loadCatalogue } from './model.ts';

function load(changes: Record<string, string | undefined> = {}) {
  const files = { ...validFixture(), ...changes };
  for (const [path, text] of Object.entries(changes)) if (text === undefined) delete files[path];
  return loadCatalogue(memoryFiles(files as Record<string, string>));
}

function edit(path: string, change: (value: Record<string, unknown>) => void) {
  const text = validFixture()[path] as string;
  const [, type] = /satisfies (\w+)/.exec(text) as RegExpExecArray;
  const value = JSON.parse(text.slice(text.indexOf('{', text.indexOf('export default')), text.lastIndexOf('}') + 1));
  change(value);
  return { [path]: descriptor(value.kind, type as string, value) };
}

function expectDiagnostic(changes: Record<string, string | undefined>, code: DiagnosticCode, where: string | RegExp) {
  const { diagnostics } = load(changes);
  const found = diagnostics.filter((d) => d.code === code);
  assert.ok(
    found.some((d) => (typeof where === 'string' ? `${d.path} ${d.message}`.includes(where) : where.test(`${d.path} ${d.message}`))),
    `expected ${code} at ${where}, got ${JSON.stringify(diagnostics, null, 2)}`,
  );
}

const BUTTON = 'registry/metadata/react/button.ts';
const ELEMENT = 'registry/metadata/element/ult-button.ts';
const SETUP = 'registry/metadata/setup/setup-vite.ts';
const RECIPE = 'registry/metadata/recipe/data-table.ts';

describe('the valid fixture', () => {
  const { catalogue, diagnostics } = load();

  test('loads without a diagnostic', () => assert.deepEqual(diagnostics, []));

  test('orders React entries by release position, then order', () => {
    assert.deepEqual(catalogue.componentRoutes, ['button', 'sidebar', 'calendar', 'input-otp']);
  });

  test('derives a plain component’s dependencies, type-only imports included, in registry order', () => {
    const button = catalogue.react.find((entry) => entry.id === 'button');
    assert.deepEqual(button?.dependencies, ['@base-ui/react', '@stylexjs/stylex']);
    assert.deepEqual(button?.registryDependencies, ['tokens', 'lib']);
  });

  test('resolves an aliased export and keeps its type-only modifier', () => {
    const button = catalogue.react.find((entry) => entry.id === 'button');
    assert.deepEqual(
      button?.exports.map(({ name, local, typeOnly, kind }) => ({ name, local, typeOnly, kind })),
      [
        { name: 'Button', local: 'ButtonImpl', typeOnly: false, kind: 'value' },
        { name: 'ButtonProps', local: 'ButtonProps', typeOnly: true, kind: 'type' },
      ],
    );
  });

  test('keeps a compound’s hook and behavior composition', () => {
    const sidebar = catalogue.react.find((entry) => entry.id === 'sidebar');
    assert.deepEqual(
      sidebar?.exports.map((item) => `${item.name}:${item.kind}`),
      ['SidebarRootProps:type', 'Sidebar:value', 'useSidebar:value'],
    );
    assert.deepEqual(sidebar?.registryDependencies, ['lib', 'button']);
  });

  test('derives a Zag React component’s packages', () => {
    const calendar = catalogue.react.find((entry) => entry.id === 'calendar');
    assert.deepEqual(calendar?.dependencies, ['@stylexjs/stylex', '@zag-js/date-picker', '@zag-js/react']);
  });

  test('accepts a primary export that is not the id in Pascal case', () => {
    assert.equal(catalogue.exports.get('InputOTP')?.item, 'input-otp');
  });

  test('plans the barrel from source, ignoring the stale one on disk', () => {
    assert.deepEqual([...catalogue.exports.keys()].sort(), [
      'Button',
      'ButtonProps',
      'Calendar',
      'InputOTP',
      'InputOTPSize',
      'Sidebar',
      'SidebarRootProps',
      'useSidebar',
    ]);
    assert.equal(catalogue.exports.has('Retired'), false);
  });

  test('discovers the same catalogue with no barrel or registry projection at all', () => {
    const absent = load({ 'packages/ui/src/index.ts': undefined, 'registry/items.config.ts': undefined });
    assert.deepEqual(absent.diagnostics, []);
    assert.deepEqual([...absent.catalogue.exports.keys()], [...catalogue.exports.keys()]);
    assert.deepEqual(absent.catalogue.recipes, catalogue.recipes);
  });

  test('reads element tags and finite values from source without running it', () => {
    const [element] = catalogue.elements;
    assert.deepEqual(element?.attributes, [
      { names: ['variant'], on: 'ult-button', values: ['solid', 'outline'] },
      { names: ['aria-label', 'aria-labelledby'], on: 'ult-button', values: 'Names the button.' },
    ]);
  });

  test('stages each source bundle’s files, skipping the index and allowing in-bundle imports', () => {
    const tokens = catalogue.sourceBundles.find((bundle) => bundle.id === 'tokens');
    assert.deepEqual(tokens?.sources, ['packages/tokens/src/palette.ts', 'packages/tokens/src/tokens.stylex.ts']);
    assert.deepEqual(tokens?.dependencies, ['@stylexjs/stylex']);
  });

  test('derives a recipe’s items through the barrel plan and its engines through local imports', () => {
    const [recipe] = catalogue.recipes;
    assert.deepEqual(recipe?.registryDependencies, ['tokens', 'button', 'sidebar']);
    assert.deepEqual(recipe?.dependencies, ['@tanstack/react-table', 'd3-format']);
  });

  test('keeps setup, artifact and source bundles installable and recipes out of the registry and routes', () => {
    assert.deepEqual(catalogue.registryItems.sort(), [
      'button',
      'calendar',
      'input-otp',
      'lib',
      'setup-vite',
      'sidebar',
      'tokens',
      'tokens-css',
      'ult-button',
    ]);
    assert.equal(catalogue.componentRoutes.includes('data-table'), false);
  });
});

describe('descriptors are data', () => {
  const data = (body: string) => ({ [BUTTON]: `import type { ReactDescriptor } from '../schema.ts';\n\n${body}` });
  const valid = validFixture()[BUTTON] as string;
  const object = valid.slice(valid.indexOf('{', valid.indexOf('export default')), valid.lastIndexOf('}') + 1);

  test('rejects a runtime import', () => {
    expectDiagnostic({ [BUTTON]: `import { readFileSync } from 'node:fs';\n${valid}` }, 'not-data', 'only type imports');
  });
  test('rejects a call', () => {
    expectDiagnostic(data(`export default { ...${object}, title: String('Button') } satisfies ReactDescriptor;`), 'not-data', 'CallExpression');
  });
  test('rejects a spread', () => expectDiagnostic(data(`export default { ...${object} } satisfies ReactDescriptor;`), 'not-data', 'plain `key: value`'));
  test('rejects a getter', () => {
    expectDiagnostic(data(`export default { get title() { return 'x'; } } satisfies ReactDescriptor;`), 'not-data', 'plain `key: value`');
  });
  test('rejects a computed key', () => {
    expectDiagnostic(data(`export default { ['ti' + 'tle']: 'x' } satisfies ReactDescriptor;`), 'not-data', 'plain `key: value`');
  });
  test('rejects an identifier standing in for a value', () => {
    expectDiagnostic(data(`const title = 'Button';\nexport default { title } satisfies ReactDescriptor;`), 'not-data', 'only type imports');
  });
  test('requires `satisfies`', () => expectDiagnostic(data(`export default ${object};`), 'not-data', 'satisfies'));
});

describe('descriptor shape and identity', () => {
  test('rejects an unknown field', () => {
    expectDiagnostic(edit(BUTTON, (v) => (v.titel = 'Button')), 'invalid-descriptor', 'descriptor.titel is not a known field');
  });
  test('rejects a missing field', () => {
    expectDiagnostic(edit(BUTTON, (v) => delete v.primaryExport), 'invalid-descriptor', 'descriptor.primaryExport is missing');
  });
  test('rejects a replaced element that is neither a tag nor one input type', () => {
    expectDiagnostic(
      edit(BUTTON, (v) => (v.replaces = { elements: ['input[type=text'], roles: ['button'] })),
      'invalid-descriptor',
      'descriptor.replaces.elements[0] is not a tag or input[type=<type>]',
    );
  });
  test('rejects a non-integer order', () => expectDiagnostic(edit(BUTTON, (v) => (v.order = 1.5)), 'invalid-descriptor', 'not an integer'));
  test('rejects a kind filed under another kind', () => {
    expectDiagnostic({ 'registry/metadata/element/button.ts': validFixture()[BUTTON], [BUTTON]: undefined }, 'invalid-descriptor', 'sits under element/');
  });
  test('rejects an id that is not the file name', () => {
    expectDiagnostic(edit(BUTTON, (v) => (v.id = 'buttons')), 'invalid-descriptor', 'does not match the file name');
  });
  test('rejects an id that is not kebab-case', () => {
    const renamed = edit(BUTTON, (v) => (v.id = 'Button'))[BUTTON];
    expectDiagnostic({ 'registry/metadata/react/Button.ts': renamed, [BUTTON]: undefined }, 'invalid-descriptor', 'not kebab-case');
  });
  test('rejects an id used by two kinds', () => {
    expectDiagnostic(edit(RECIPE, (v) => (v.id = 'button')), 'invalid-descriptor', 'does not match the file name');
    const collided = edit(RECIPE, (v) => (v.id = 'button'))[RECIPE];
    expectDiagnostic({ 'registry/metadata/recipe/button.ts': collided, [RECIPE]: undefined }, 'duplicate-id', 'id "button"');
  });
  test('rejects an unexpected descriptor file or kind directory', () => {
    expectDiagnostic({ 'registry/metadata/react/notes.md': '# notes' }, 'unexpected-descriptor', 'react/notes.md');
    expectDiagnostic({ 'registry/metadata/widget/x.ts': 'export default {};' }, 'unexpected-descriptor', '"widget" is not a kind');
  });
  test('rejects a contract with a broken anchor, a missing file, or outside the specification', () => {
    expectDiagnostic(edit(BUTTON, (v) => (v.contract = 'docs/spec/ultima.md#gone')), 'broken-anchor', 'no heading #gone');
    expectDiagnostic(edit(BUTTON, (v) => (v.contract = 'docs/spec/missing.md#x')), 'broken-anchor', 'does not exist');
    expectDiagnostic(edit(BUTTON, (v) => (v.contract = 'README.md#ultima')), 'broken-anchor', 'is not docs/spec');
    expectDiagnostic(edit(BUTTON, (v) => (v.contract = 'docs/spec/ultima.md#not-a-heading')), 'broken-anchor', 'no heading');
  });
});

describe('releases and order', () => {
  test('rejects an undefined release', () => expectDiagnostic(edit(BUTTON, (v) => (v.release = 'v9')), 'unknown-release', 'release "v9"'));
  test('rejects a duplicate order within a release', () => {
    expectDiagnostic(edit(BUTTON, (v) => (v.order = 2)), 'duplicate-order', 'order 2 in release v0');
  });
  test('allows the same order in another release', () => {
    assert.deepEqual(load(edit(BUTTON, (v) => (v.order = 1))).diagnostics, []);
  });
  test('rejects a release defined twice', () => {
    expectDiagnostic(
      { 'registry/metadata/releases.ts': "export default [{ id: 'v0', label: 'a' }, { id: 'v0', label: 'b' }] satisfies Release[];" },
      'duplicate-id',
      'release "v0"',
    );
  });
  test('rejects a duplicate element order', () => {
    const second = edit(ELEMENT, (v) => {
      v.id = 'ult-sidebar';
      v.reactItem = 'sidebar';
      v.tags = ['ult-sidebar'];
      v.attributes = [];
    })[ELEMENT];
    expectDiagnostic(
      {
        'registry/metadata/element/ult-sidebar.ts': second,
        'packages/elements/src/ult-sidebar.element.ts': "customElements.define('ult-sidebar', class extends HTMLElement {});",
        'packages/elements/src/__tests__/ult-sidebar.test.ts': '',
      },
      'duplicate-order',
      'order 1 in elements',
    );
  });
});

describe('bidirectional membership', () => {
  for (const [label, path] of [
    ['source', 'packages/ui/src/sidebar.tsx'],
    ['page', 'apps/docs/src/content/components/sidebar.mdx'],
    ['test', 'packages/ui/src/__tests__/sidebar.test.tsx'],
    ['demo', 'apps/docs/src/demos/sidebar/basic.tsx'],
    ['element source', 'packages/elements/src/ult-button.element.ts'],
    ['element test', 'packages/elements/src/__tests__/ult-button.test.ts'],
    ['setup file', 'registry/static/setup-vite/components.json'],
    ['recipe demo', 'apps/docs/src/demos/button/sorting.tsx'],
    ['release definitions', 'registry/metadata/releases.ts'],
  ] as const) {
    test(`reports a missing ${label}`, () => expectDiagnostic({ [path]: undefined }, 'missing-file', path.replace(/\/basic\.tsx$/, '/')));
  }
  for (const [label, path] of [
    ['component source', 'packages/ui/src/extra.tsx'],
    ['component page', 'apps/docs/src/content/components/extra.mdx'],
    ['element source', 'packages/elements/src/ult-extra.element.ts'],
    ['setup directory', 'registry/static/setup-next/components.json'],
    ['setup file', 'registry/static/setup-vite/extra.json'],
  ] as const) {
    test(`reports a ${label} with no descriptor`, () => {
      expectDiagnostic({ [path]: 'export {};' }, 'source-without-metadata', path.replace(/\/components\.json$/, ''));
    });
  }
  test('reports an element whose React item does not exist', () => {
    expectDiagnostic(edit(ELEMENT, (v) => (v.reactItem = 'buttons')), 'missing-reference', 'reactItem "buttons"');
  });
  test('reports a registry dependency on a missing item', () => {
    expectDiagnostic(edit(ELEMENT, (v) => (v.registryDependencies = ['tokens-js'])), 'missing-reference', '"tokens-js"');
  });
});

describe('source-derived exports', () => {
  const source = (text: string) => ({ 'packages/ui/src/input-otp.tsx': text });
  test('rejects a primary export the source lacks', () => {
    expectDiagnostic(edit(BUTTON, (v) => (v.primaryExport = 'Buton')), 'invalid-primary-export', '"Buton"');
  });
  test('rejects a type as the primary export', () => {
    expectDiagnostic(edit(BUTTON, (v) => (v.primaryExport = 'ButtonProps')), 'invalid-primary-export', '"ButtonProps"');
  });
  test('rejects a re-exported import as the primary export', () => {
    expectDiagnostic(
      source("import { InputOTP } from '@base-ui/react/otp-field';\nexport { InputOTP };"),
      'invalid-primary-export',
      '"InputOTP"',
    );
  });
  test('rejects `export *`', () => {
    expectDiagnostic(source("const InputOTP = {};\nexport { InputOTP };\nexport * from '@base-ui/react/otp-field';"), 'invalid-export', 'export *');
  });
  test('rejects an export of an undeclared name', () => {
    expectDiagnostic(source('const InputOTP = {};\nexport { InputOTP, Missing };'), 'invalid-export', '"Missing" is not declared');
  });
  test('rejects a public name two components export', () => {
    expectDiagnostic(source('const InputOTP = {};\nconst Calendar = {};\nexport { InputOTP, Calendar };'), 'duplicate-export', '"Calendar"');
  });
});

describe('source-derived dependencies', () => {
  const calendar = (line: string) => ({
    'packages/ui/src/calendar.tsx': `${line}\nfunction Root() { return null; }\nconst Calendar = { Root };\nexport { Calendar };`,
  });
  test('rejects a relative sibling import', () => expectDiagnostic(calendar("import { Button } from './button';"), 'unresolved-import', "'./button'".replace(/'/g, '"')));
  test('rejects the barrel', () => expectDiagnostic(calendar("import { Button } from '@ultima/ui';"), 'unresolved-import', '"@ultima/ui" is a barrel'));
  test('rejects a component that does not exist', () => {
    expectDiagnostic(calendar("import { Missing } from '@ultima/ui/missing';"), 'unresolved-import', '"@ultima/ui/missing"');
  });
  test('rejects a helper module no bundle stages', () => {
    expectDiagnostic(calendar("import { x } from '@ultima/ui/lib/missing';"), 'unresolved-import', '"@ultima/ui/lib/missing"');
  });
  test('rejects a dynamic import it cannot resolve', () => {
    expectDiagnostic(calendar('const load = (name: string) => import(name);'), 'unresolved-import', 'computed specifier');
  });
  test('counts a literal dynamic import', () => {
    const { catalogue, diagnostics } = load(calendar("const load = () => import('@zag-js/splitter');"));
    assert.deepEqual(diagnostics, []);
    assert.deepEqual(catalogue.react.find((entry) => entry.id === 'calendar')?.dependencies, ['@zag-js/splitter']);
  });
  test('rejects a registry dependency cycle', () => {
    expectDiagnostic(
      { 'packages/ui/src/button.tsx': "import { Sidebar } from '@ultima/ui/sidebar';\nfunction Button() { return null; }\nexport { Button };" },
      'dependency-cycle',
      /button -> sidebar -> button|sidebar -> button -> sidebar/,
    );
  });
  test('keeps contributor tooling out of installed source', () => {
    expectDiagnostic({ 'packages/ui/src/lib/component.ts': "import ts from 'typescript';\nexport type PartProps<P> = P;" }, 'tooling-import', '"typescript"');
    expectDiagnostic(
      { 'packages/tokens/src/palette.ts': "import type { Release } from '../../../registry/metadata/schema.ts';\nexport const palette = 1;" },
      'tooling-import',
      'registry/metadata/schema.ts',
    );
    expectDiagnostic(
      { 'packages/elements/src/ult-button.element.ts': `import { loadCatalogue } from '../../../scripts/catalogue/model.ts';\n${validFixture()['packages/elements/src/ult-button.element.ts']}` },
      'tooling-import',
      'scripts/catalogue/model.ts',
    );
  });
  test('rejects a source-bundle import that leaves the bundle', () => {
    expectDiagnostic({ 'packages/tokens/src/palette.ts': "import { x } from '../../ui/src/lib/component';\nexport const palette = x;" }, 'unresolved-import', 'not a staged registry item');
  });
});

describe('elements', () => {
  test('rejects a tag the source does not register', () => {
    expectDiagnostic(edit(ELEMENT, (v) => (v.tags = ['ult-button', 'ult-button-icon', 'ult-button-label'])), 'tag-mismatch', 'registers no <ult-button-label>');
  });
  test('rejects a registered tag missing from tags', () => {
    expectDiagnostic(edit(ELEMENT, (v) => (v.tags = ['ult-button'])), 'tag-mismatch', '<ult-button-icon> is registered');
  });
  test('requires the root tag first', () => {
    expectDiagnostic(edit(ELEMENT, (v) => (v.tags = ['ult-button-icon', 'ult-button'])), 'tag-mismatch', 'root "ult-button" first');
  });
  test('rejects a computed tag', () => {
    expectDiagnostic(
      { 'packages/elements/src/ult-button.element.ts': "const VARIANTS = ['solid'] as const;\nconst tag = 'ult-button';\ncustomElements.define(tag, class extends HTMLElement {});" },
      'tag-mismatch',
      'computed tag',
    );
  });
  test('rejects an attribute on a tag outside the family', () => {
    expectDiagnostic(edit(ELEMENT, (v) => ((v.attributes as { on: string }[])[0]!.on = 'ult-card')), 'tag-mismatch', '<ult-card>');
  });
  test('rejects comma-joined attribute names', () => {
    expectDiagnostic(edit(ELEMENT, (v) => ((v.attributes as { names: string[] }[])[1]!.names = ['aria-label, aria-labelledby'])), 'invalid-descriptor', 'not one attribute name');
  });
  test('rejects a symbol the source lacks', () => {
    expectDiagnostic(edit(ELEMENT, (v) => ((v.attributes as { symbol: string }[])[0]!.symbol = 'TONES')), 'invalid-enum-reference', 'TONES');
  });
  test('rejects a symbol that is not a string table', () => {
    expectDiagnostic(edit(ELEMENT, (v) => ((v.attributes as { symbol: string }[])[0]!.symbol = 'LABELLED')), 'invalid-enum-reference', 'LABELLED');
  });
  test('needs exactly one of symbol and text', () => {
    expectDiagnostic(edit(ELEMENT, (v) => ((v.attributes as { text?: string }[])[0]!.text = 'Also text.')), 'invalid-descriptor', 'exactly one of symbol and text');
  });
  test('names an element family after its React item', () => {
    expectDiagnostic(edit(ELEMENT, (v) => (v.reactItem = 'sidebar')), 'invalid-descriptor', 'needs reactItem "button"');
  });
});

describe('setup and artifact records', () => {
  test('rejects a setup file outside its static directory', () => {
    expectDiagnostic(
      edit(SETUP, (v) => ((v.files as { path: string }[])[0]!.path = '../setup-next/components.json')),
      'path-outside',
      'leaves registry/static/setup-vite/',
    );
  });
  test('rejects an install target outside the consumer project', () => {
    expectDiagnostic(edit(SETUP, (v) => ((v.files as { target: string }[])[0]!.target = '/etc/components.json')), 'path-outside', 'target');
  });
  test('rejects a hand step with neither an assertion nor a reason', () => {
    expectDiagnostic(edit(SETUP, (v) => (v.handSteps = [{ prose: 'Do it.' }])), 'invalid-descriptor', 'neither an assertion');
  });
  test('rejects an artifact output its producer does not write', () => {
    expectDiagnostic(edit('registry/metadata/artifact/tokens-css.ts', (v) => (v.output = 'apps/docs/public/tokens.css')), 'path-outside', 'tokens-build');
  });
  test('rejects an unknown producer', () => {
    expectDiagnostic(edit('registry/metadata/artifact/tokens-css.ts', (v) => (v.producer = 'pnpm build')), 'invalid-descriptor', 'not one of tokens-build');
  });
  test('rejects a source bundle that is not its inventory’s item', () => {
    expectDiagnostic(edit('registry/metadata/source-bundle/lib.ts', (v) => (v.inventory = 'tokens')), 'invalid-descriptor', 'the tokens inventory');
  });
});

describe('recipes', () => {
  test('carry no install guidance, so no registry item can leak from one', () => {
    expectDiagnostic(edit(RECIPE, (v) => (v.installDocs = 'npx shadcn add @ultima/data-table')), 'invalid-descriptor', 'installDocs is not a known field');
  });
  test('reject a section the page lacks', () => expectDiagnostic(edit(RECIPE, (v) => (v.section = 'filtering')), 'broken-anchor', 'no heading #filtering'));
  test('reject a page that is not a React item', () => expectDiagnostic(edit(RECIPE, (v) => (v.page = 'tables')), 'missing-reference', 'page "tables"'));
  test('reject a demo the page does not import', () => {
    expectDiagnostic(
      { 'apps/docs/src/content/components/button.mdx': "import Basic from '../../demos/button/basic';\nimport sortingSource from '../../demos/button/sorting?raw';\n\n## Sorting" },
      'demo-not-on-page',
      'does not import apps/docs/src/demos/button/sorting.tsx',
    );
  });
  test('reject a demo outside the page’s demo directory', () => {
    expectDiagnostic(edit(RECIPE, (v) => (v.demos = ['apps/docs/src/demos/sidebar/basic.tsx'])), 'path-outside', 'outside apps/docs/src/demos/button/');
  });
  test('reject a barrel name no component exports', () => {
    expectDiagnostic(
      { 'apps/docs/src/demos/button/sorting.tsx': "import { DataTable } from '@ultima/ui';\nexport default function Sorting() { return null; }" },
      'unresolved-import',
      '@ultima/ui exports no "DataTable"',
    );
  });
  test('reject a local import that resolves to nothing', () => {
    expectDiagnostic({ 'apps/docs/src/demos/button/rows.ts': undefined }, 'unresolved-import', '"./rows" resolves to no file');
  });
  test('resolve a relative barrel import through the plan rather than the file', () => {
    const { catalogue, diagnostics } = load({
      'apps/docs/src/demos/button/sorting.tsx': "import { Calendar } from '../../../../../packages/ui/src/index';\nexport default function Sorting() { return null; }",
    });
    assert.deepEqual(diagnostics, []);
    assert.deepEqual(catalogue.recipes[0]?.registryDependencies, ['calendar']);
  });
});
