import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, test } from 'node:test';

import { diskFiles } from './files.ts';
import { diskFixture, testPolicy as policy } from './fixture.ts';
import { check, generate } from './generate.ts';
import { OUTPUTS } from './projections.ts';
import { INCOMPLETE_MARKER, MANIFESTS, type Manifest, ScaffoldError, main, planScaffold, writeScaffold } from './scaffold.ts';

const repository = join(dirname(fileURLToPath(import.meta.url)), '../..');

const roots: string[] = [];
after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function temporary(): string {
  const root = mkdtempSync(join(tmpdir(), 'ultima-scaffold-'));
  roots.push(root);
  return root;
}

/** The fixture on disk with its wiring generated, as a checkout is before a scaffold. */
function checkout(): string {
  const root = temporary();
  const files = { ...diskFixture(), 'apps/docs/src/demo.tsx': 'export function Demo() { return null; }\n' };
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  generate(root, { policy });
  return root;
}

function snapshot(root: string, directory = ''): Record<string, string> {
  const found: Record<string, string> = {};
  for (const name of readdirSync(join(root, directory))) {
    const path = directory ? `${directory}/${name}` : name;
    if (statSync(join(root, path)).isDirectory()) Object.assign(found, snapshot(root, path));
    else found[path] = readFileSync(join(root, path), 'utf8');
  }
  return found;
}

const read = (root: string, path: string) => readFileSync(join(root, path), 'utf8');

const PROOF = [
  'variant × size, and no props matches the default',
  'role status, named by its text',
  'none; the one part takes no focus',
  'none; it is plain',
  'none; it has no data-* state',
  'className is rejected, and each axis union is exactly its values',
  'none, because it has no interaction',
  'none; no declaration is read by a primitive',
];

function reactRequest(overrides: Record<string, unknown> = {}, brief: Record<string, unknown> = {}) {
  return {
    descriptor: {
      title: 'Ribbon',
      description: 'A ribbon, for the scaffold fixture.',
      contract: 'docs/spec/ultima.md#plain-components',
      installDocs: "import { Ribbon } from '@/components/ui/ribbon';",
      primaryExport: 'Ribbon',
      release: 'v0.1',
      order: 3,
      ...overrides,
    },
    brief: {
      primitive: { kind: 'native', element: 'div' },
      shape: 'plain',
      axes: {
        variant: { values: ['subtle', 'solid'], default: 'subtle' },
        size: { values: ['sm', 'md'], default: 'md' },
      },
      proofBar: PROOF,
      ...brief,
    },
  };
}

const CREATED = [
  'registry/metadata/react/ribbon.ts',
  'packages/ui/src/ribbon.tsx',
  'packages/ui/src/__tests__/ribbon.test.tsx',
  'apps/docs/src/demos/ribbon/basic.tsx',
  'apps/docs/src/content/components/ribbon.mdx',
];

const generated = (root: string) => Object.fromEntries(Object.values(OUTPUTS).map((path) => [path, read(root, path)]));

describe('a React scaffold', () => {
  test('dry-runs by default: validates, plans every file and writes nothing', () => {
    const root = checkout();
    const before = snapshot(root);
    const plan = planScaffold(diskFiles(root), 'react', 'ribbon', reactRequest(), policy);
    assert.deepEqual([...plan.create.keys()], CREATED);
    assert.deepEqual(plan.regenerate, [OUTPUTS.registry, OUTPUTS.catalogue, OUTPUTS.pages, OUTPUTS.barrel]);
    assert.match(plan.remaining.join('\n'), /Proof bar 2, The name resolves: role status, named by its text/);
    assert.deepEqual(snapshot(root), before);
  });

  test('writes each file with the marker, regenerates the wiring, and leaves the checkout fresh', () => {
    const root = checkout();
    const { manifest } = writeScaffold(root, 'react', 'ribbon', reactRequest(), { policy });
    assert.equal(manifest.status, 'complete');
    assert.deepEqual(manifest.created, CREATED);
    assert.deepEqual(manifest.regenerated, [OUTPUTS.registry, OUTPUTS.catalogue, OUTPUTS.pages, OUTPUTS.barrel]);
    for (const path of CREATED.slice(1)) assert.match(read(root, path), new RegExp(INCOMPLETE_MARKER), path);
    assert.deepEqual(check(root, policy), { diagnostics: [], freshness: { added: [], changed: [], stale: [] } });
    assert.match(read(root, OUTPUTS.barrel), /export \{\n {2}Ribbon,\n {2}type RibbonProps,\n {2}type RibbonVariant,\n {2}type RibbonSize,\n\} from '\.\/ribbon';/);

    const source = read(root, 'packages/ui/src/ribbon.tsx');
    assert.match(source, /^'use client';\n/);
    assert.match(source, /function Ribbon\(\{ variant = 'subtle', size = 'md', style, \.\.\.props \}: RibbonProps\)/);
    assert.match(source, /stylex\.props\(styles\.root, variants\[variant\], sizes\[size\], style\)/);

    const page = read(root, 'apps/docs/src/content/components/ribbon.mdx');
    assert.match(page, /^import Basic from '\.\.\/\.\.\/demos\/ribbon\/basic';$/m);
    assert.match(page, /^import basicSource from '\.\.\/\.\.\/demos\/ribbon\/basic\?raw';$/m);
    assert.match(page, /<Demo component=\{Basic\} source=\{basicSource\} \/>/);
  });

  test('writes no test that passes: every proof-bar item is a todo', () => {
    const root = checkout();
    writeScaffold(root, 'react', 'ribbon', reactRequest(), { policy });
    const text = read(root, 'packages/ui/src/__tests__/ribbon.test.tsx');
    assert.equal(text.match(/^test\.todo\(/gm)?.length, 8);
    assert.doesNotMatch(text, /^(test|it)\(|expect/m);
  });

  test('a repeated write fails on the existing item without changing a byte', () => {
    const root = checkout();
    writeScaffold(root, 'react', 'ribbon', reactRequest(), { policy });
    const before = snapshot(root);
    assert.throws(
      () => writeScaffold(root, 'react', 'ribbon', reactRequest(), { policy }),
      (error: ScaffoldError) => /collides with existing work/.test(error.message) && /packages\/ui\/src\/ribbon\.tsx already exists/.test(error.message),
    );
    assert.deepEqual(snapshot(root), before);
  });

  test('composes a Base UI compound, passing unstyled parts through and merging variant with tone', () => {
    const root = checkout();
    const plan = planScaffold(
      diskFiles(root),
      'react',
      'ribbon',
      reactRequest({}, {
        primitive: { kind: 'base-ui', module: '@base-ui/react/button', export: 'Button' },
        shape: 'compound',
        parts: [{ name: 'Root', styled: false }, { name: 'Trigger', styled: true }],
        axes: {
          variant: { values: ['subtle', 'solid'], default: 'subtle', part: 'Trigger' },
          tone: { values: ['neutral', 'accent'], default: 'neutral', part: 'Trigger' },
        },
      }),
      policy,
    );
    const source = plan.create.get('packages/ui/src/ribbon.tsx') as string;
    assert.match(source, /import \{ Button as BaseButton \} from '@base-ui\/react\/button';/);
    assert.match(source, /type RibbonRootProps = ComponentProps<typeof BaseButton\.Root>;/);
    assert.match(source, /const Ribbon = \{\n {2}Root: BaseButton\.Root,\n {2}Trigger,\n\};/);
    assert.match(source, /stylex\.props\(styles\.trigger, variants\[variant\]\[tone\], style\)/);
    assert.match(source, /type RibbonTone = keyof typeof subtle;/);
  });
});

describe('preconditions', () => {
  const rejects = (request: unknown, pattern: RegExp, id = 'ribbon') => {
    const root = checkout();
    const before = snapshot(root);
    assert.throws(() => writeScaffold(root, 'react', id, request, { policy }), (error: ScaffoldError) => pattern.test(error.message));
    assert.deepEqual(Object.keys(snapshot(root)).filter((path) => !path.startsWith(`${MANIFESTS}/`)), Object.keys(before));
  };

  test('reports the append position instead of choosing one', () => {
    const request = reactRequest();
    delete (request.descriptor as { order?: number }).order;
    rejects(request, /descriptor\.order is missing: the next free position in v0\.1 is 3; accept it by adding "order": 3/);
  });

  test('rejects absent contract answers by name', () => {
    rejects(reactRequest({}, { primitive: undefined }), /brief\.primitive is missing/);
    rejects(reactRequest({}, { proofBar: PROOF.slice(0, 7) }), /brief\.proofBar is missing: eight answers/);
    rejects(reactRequest({}, { axes: undefined }), /brief\.axes is missing/);
    rejects(reactRequest({}, { shape: 'compound' }), /brief\.parts is missing/);
    rejects({ descriptor: reactRequest().descriptor }, /request\.brief is missing/);
  });

  test('rejects contradictions: a fourth axis, a default outside its values, a broken anchor, a mismatched id', () => {
    rejects(reactRequest({}, { axes: { color: { values: ['red'], default: 'red' } } }), /brief\.axes\.color is not an axis/);
    rejects(reactRequest({}, { axes: { size: { values: ['sm'], default: 'lg' } } }), /brief\.axes\.size\.default is missing or not one of its values/);
    rejects(reactRequest({ contract: 'docs/spec/ultima.md#no-such-heading' }), /broken-anchor .* has no heading #no-such-heading/);
    rejects(reactRequest({ id: 'banner' }), /descriptor\.id "banner" contradicts the command's "ribbon"/);
    rejects(reactRequest({ summary: 'x' }), /descriptor\.summary is not a known field/);
  });

  test('detects id, path, export and order collisions before writing', () => {
    rejects(reactRequest(), /id "data-table" is already registry\/metadata\/recipe\/data-table\.ts/, 'data-table');
    rejects(reactRequest({ primaryExport: 'Button' }), /public export "Button" is already exported by button/);
    rejects(reactRequest({ order: 2 }), /order 2 in release v0\.1 is already "input-otp"/);
    const root = checkout();
    writeFileSync(join(root, 'packages/ui/src/__tests__/ribbon.test.tsx'), 'authored\n');
    assert.throws(() => writeScaffold(root, 'react', 'ribbon', reactRequest(), { policy }), /__tests__\/ribbon\.test\.tsx already exists/);
    assert.equal(read(root, 'packages/ui/src/__tests__/ribbon.test.tsx'), 'authored\n');
    assert.equal(existsSync(join(root, 'packages/ui/src/ribbon.tsx')), false);
  });

  test('refuses setup, artifact and source-bundle records, and a malformed command, as usage errors', () => {
    for (const kind of ['setup', 'artifact', 'source-bundle']) {
      assert.throws(() => main([kind, 'x', '--from', 'r.json'], repository), (error: ScaffoldError) => error.exitCode === 2 && /not scaffolded/.test(error.message));
    }
    assert.throws(() => main(['react', 'ribbon'], repository), (error: ScaffoldError) => error.exitCode === 2 && /usage/.test(error.message));
    assert.throws(() => main(['react', 'ribbon', '--from', 'r.json', '--force'], repository), (error: ScaffoldError) => error.exitCode === 2);
  });

  test('refuses to write over stale wiring', () => {
    const root = checkout();
    writeFileSync(join(root, OUTPUTS.barrel), `${read(root, OUTPUTS.barrel)}// hand edit\n`);
    assert.throws(() => writeScaffold(root, 'react', 'ribbon', reactRequest(), { policy }), /invalid or stale before scaffolding/);
    assert.equal(existsSync(join(root, 'registry/metadata/react/ribbon.ts')), false);
  });
});

describe('concurrent and interrupted writes', () => {
  test('an input edited after planning invalidates the plan, and nothing is written', () => {
    const root = checkout();
    const before = snapshot(root);
    const take = () =>
      writeFileSync(join(root, 'registry/metadata/react/sidebar.ts'), read(root, 'registry/metadata/react/sidebar.ts').replace('"order": 2', '"order": 9'));
    assert.throws(() => writeScaffold(root, 'react', 'ribbon', reactRequest(), { policy, beforeWrite: take }), /changed while planning[^]*registry\/metadata\/react\/sidebar\.ts/);
    for (const path of CREATED) assert.equal(existsSync(join(root, path)), false, path);
    assert.deepEqual(Object.keys(snapshot(root)).filter((path) => !path.startsWith(`${MANIFESTS}/`)), Object.keys(before));
  });

  test('a file created during planning is never overwritten', () => {
    const root = checkout();
    const race = () => {
      mkdirSync(join(root, 'apps/docs/src/demos/ribbon'), { recursive: true });
      writeFileSync(join(root, 'apps/docs/src/demos/ribbon/basic.tsx'), 'theirs\n');
    };
    assert.throws(() => writeScaffold(root, 'react', 'ribbon', reactRequest(), { policy, beforeWrite: race }), /changed while planning/);
    assert.equal(read(root, 'apps/docs/src/demos/ribbon/basic.tsx'), 'theirs\n');
  });

  test('refuses while another scaffold holds the lock', () => {
    const root = checkout();
    mkdirSync(join(root, MANIFESTS), { recursive: true });
    writeFileSync(join(root, MANIFESTS, 'lock'), '1\n');
    assert.throws(() => writeScaffold(root, 'react', 'ribbon', reactRequest(), { policy }), /another scaffold is running/);
    assert.equal(existsSync(join(root, 'registry/metadata/react/ribbon.ts')), false);
  });

  test('an interrupted write keeps its manifest and partial files, and a rerun stops without touching them', () => {
    const root = checkout();
    const interrupt = (path: string) => {
      if (path === CREATED[2]) throw new Error('disk full');
    };
    assert.throws(
      () => writeScaffold(root, 'react', 'ribbon', reactRequest(), { policy, beforeCreate: interrupt }),
      (error: ScaffoldError) =>
        /disk full/.test(error.message) &&
        error.message.includes(`created: ${CREATED[0]}, ${CREATED[1]}`) &&
        error.message.includes(`not created: ${CREATED.slice(2).join(', ')}`),
    );
    const manifest = JSON.parse(read(root, `${MANIFESTS}/ribbon.json`)) as Manifest;
    assert.equal(manifest.status, 'failed');
    assert.deepEqual(manifest.created, CREATED.slice(0, 2));
    assert.equal(existsSync(join(root, MANIFESTS, 'lock')), false);

    const partial = snapshot(root);
    assert.throws(
      () => writeScaffold(root, 'react', 'ribbon', reactRequest(), { policy }),
      (error: ScaffoldError) =>
        /stopped while failed: disk full/.test(error.message) &&
        error.message.includes(`  ${CREATED[0]}\n  ${CREATED[1]}`) &&
        /does not delete or overwrite them/.test(error.message),
    );
    assert.deepEqual(snapshot(root), partial);
  });
});

describe('element and recipe scaffolds', () => {
  const element = (brief: Record<string, unknown> = {}) => ({
    descriptor: {
      title: 'Sidebar element',
      description: 'Sidebar as a custom element.',
      contract: 'docs/spec/ultima.md#web-components',
      installDocs: '<script type="module" src="./ult-sidebar.js"></script>',
      reactItem: 'sidebar',
      order: 2,
      registryDependencies: ['tokens-css'],
      tags: ['ult-sidebar', 'ult-sidebar-item'],
      attributes: [{ names: ['side'], on: 'ult-sidebar', symbol: 'SIDES' }],
      example: '<ult-sidebar side="start"></ult-sidebar>',
    },
    brief: {
      enums: { SIDES: ['start', 'end'] },
      parity: { axes: { side: ['start', 'end'] }, parts: ['root', 'item'], stateMap: {} },
      proof: ['items navigate with the arrow keys'],
      ...brief,
    },
  });

  test('an element registers exactly its tags and reads its enum from source, with the parity entry left to the author', () => {
    const root = checkout();
    const plan = writeScaffold(root, 'element', 'ult-sidebar', element(), { policy });
    assert.deepEqual([...plan.create.keys()], [
      'registry/metadata/element/ult-sidebar.ts',
      'packages/elements/src/ult-sidebar.element.ts',
      'packages/elements/src/__tests__/ult-sidebar.test.ts',
    ]);
    assert.deepEqual(plan.regenerate, [OUTPUTS.registry, OUTPUTS.elements]);
    assert.match(read(root, OUTPUTS.elements), /"values": \[\n\s+"start",\n\s+"end"\n\s+\]/);
    assert.equal(plan.snippets[0]?.path, 'packages/elements/src/__tests__/parity.test.ts');
    assert.match(plan.snippets[0]?.text as string, /react: reactSidebar,\n {2}axes: \{ side: \['start', 'end'\] \},/);
    assert.equal(check(root, policy).diagnostics.length, 0);
  });

  test('an element parity mapping is never guessed', () => {
    const root = checkout();
    assert.throws(() => planScaffold(diskFiles(root), 'element', 'ult-sidebar', element({ parity: undefined }), policy), /brief\.parity is missing/);
    assert.throws(() => planScaffold(diskFiles(root), 'element', 'ult-sidebar', element({ enums: {} }), policy), /brief\.enums\.SIDES is missing/);
  });

  test('a recipe on an existing page gets an unapplied snippet, and the page is untouched', () => {
    const root = checkout();
    const page = read(root, 'apps/docs/src/content/components/sidebar.mdx');
    const request = {
      descriptor: {
        title: 'Data Table',
        description: 'A table recipe.',
        contract: 'docs/spec/ultima.md#data-table',
        page: 'sidebar',
        section: 'data-table',
        release: 'v0.1',
        demos: ['apps/docs/src/demos/sidebar/data-table.tsx'],
      },
      brief: { proof: ['sorting reorders the rows'] },
    };
    const plan = writeScaffold(root, 'recipe', 'grid', request, { policy });
    assert.deepEqual([...plan.create.keys()], [
      'registry/metadata/recipe/grid.ts',
      'apps/docs/src/demos/sidebar/data-table.tsx',
      'apps/docs/src/__tests__/grid.test.tsx',
    ]);
    assert.equal(read(root, 'apps/docs/src/content/components/sidebar.mdx'), page);
    assert.ok(plan.generationWaits);
    const snippet = plan.snippets[0]?.text as string;
    assert.match(snippet, /import DataTable from '\.\.\/\.\.\/demos\/sidebar\/data-table';\nimport dataTableSource from '\.\.\/\.\.\/demos\/sidebar\/data-table\?raw';/);
    assert.match(snippet, /^## Data Table$/m);
  });
});

describe('the synthetic exercise', () => {
  test('complete, then remove, an item with zero manual projection edits', () => {
    const root = checkout();
    const projections = generated(root);
    writeScaffold(root, 'react', 'ribbon', reactRequest(), { policy });
    for (const path of CREATED.slice(1)) {
      writeFileSync(join(root, path), read(root, path).split('\n').filter((line) => !line.includes(INCOMPLETE_MARKER)).join('\n'));
    }
    assert.deepEqual(check(root, policy).freshness, { added: [], changed: [], stale: [] });
    for (const path of CREATED) rmSync(join(root, path));
    rmSync(join(root, 'apps/docs/src/demos/ribbon'), { recursive: true });
    generate(root, { policy });
    assert.deepEqual(generated(root), projections);
  });
});

describe('the command on this checkout', () => {
  test('a dry run validates a real request and writes nothing', () => {
    const request = join(temporary(), 'request.json');
    writeFileSync(
      request,
      JSON.stringify(
        reactRequest(
          { contract: 'docs/spec/ultima.md#the-v01-set', release: 'v0.2', order: 1000, primaryExport: 'ScaffoldProbe', installDocs: 'x' },
          { primitive: { kind: 'native', element: 'div' } },
        ),
      ),
    );
    const run = spawnSync(process.execPath, ['--experimental-strip-types', join(repository, 'scripts/catalogue/scaffold.ts'), 'react', 'scaffold-probe', '--from', request], {
      encoding: 'utf8',
    });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /react scaffold-probe, dry run; pass --write to apply/);
    assert.match(run.stdout, /packages\/ui\/src\/__tests__\/scaffold-probe\.test\.tsx/);
    assert.equal(existsSync(join(repository, 'registry/metadata/react/scaffold-probe.ts')), false);
    assert.equal(existsSync(join(repository, 'packages/ui/src/scaffold-probe.tsx')), false);
  });

  test('an unsupported kind exits 2', () => {
    const run = spawnSync(process.execPath, ['--experimental-strip-types', join(repository, 'scripts/catalogue/scaffold.ts'), 'setup', 'setup-bun', '--from', 'x.json'], {
      encoding: 'utf8',
    });
    assert.equal(run.status, 2);
    assert.match(run.stderr, /setup records are not scaffolded/);
  });
});
