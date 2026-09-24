// ULT-REGISTRY-001 over the real repository with metadata or sources mutated, against the builder's own
// staging plan. No registry build runs: the check reads source and metadata only.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { loadCatalogue } from '../../../../scripts/catalogue/model.ts';
import { registryPlan, stagedSources, stagedTarget } from '../../../../scripts/catalogue/staging.ts';
import { workspaceScope } from '../workspace.ts';
import { afterFirstLine, located, repository, run, source } from './support.ts';

const SEPARATOR = 'packages/ui/src/separator.tsx';

function registryFindings(report: ReturnType<typeof run>) {
  return located(report).filter((entry) => entry.ruleId === 'ULT-REGISTRY-001');
}

describe('the staging plan', () => {
  test('is the builder’s, and names exactly the installable items the catalogue describes', () => {
    const { catalogue } = loadCatalogue(repository);
    const { sources, collisions } = stagedSources(repository);
    assert.deepEqual(collisions, []);
    const plan = registryPlan(sources, catalogue.elements.map((entry) => entry.id));
    assert.deepEqual(plan.map((item) => item.name).sort(), [...catalogue.registryItems].sort());
    assert.deepEqual(plan.slice(0, 2).map((item) => item.name), ['tokens', 'lib']);
    for (const entry of catalogue.react) assert.equal(sources.filter((source) => source.item === entry.id).length, 1, entry.id);
    assert.ok(sources.every((source) => !source.source.includes('__tests__') && !source.source.endsWith('index.ts')));
  });

  test('the workspace scope carries it, with no registry build output present or read', () => {
    const scope = workspaceScope(repository);
    assert.ok(scope.registry);
    assert.ok(scope.excluded.some((entry) => entry.path === 'registry/ultima'));
    assert.deepEqual(registryFindings(run()), []);
  });
});

describe('ULT-REGISTRY-001', () => {
  test('rejects a descriptor whose source is gone: stale item metadata', () => {
    const report = run({ [SEPARATOR]: null, 'packages/ui/src/__tests__/separator.test.tsx': null });
    assert.deepEqual(
      registryFindings(report).filter((entry) => entry.file === 'registry/metadata/react/separator.ts'),
      [
        { ruleId: 'ULT-REGISTRY-001', file: 'registry/metadata/react/separator.ts', line: 1, column: 1, target: 'missing-file' },
        { ruleId: 'ULT-REGISTRY-001', file: 'registry/metadata/react/separator.ts', line: 1, column: 1, target: 'missing-file' },
        { ruleId: 'ULT-REGISTRY-001', file: 'registry/metadata/react/separator.ts', line: 1, column: 1, symbol: 'separator' },
      ],
    );
  });

  test('rejects a descriptor the build never writes an item for', () => {
    const report = run({
      'registry/metadata/setup/setup-remix.ts': source('registry/metadata/setup/setup-vite.ts').replace("id: 'setup-vite'", "id: 'setup-remix'"),
      'registry/static/setup-remix/components.json': source('registry/static/setup-vite/components.json'),
      'registry/static/setup-remix/ultima.vite.ts': source('registry/static/setup-vite/ultima.vite.ts'),
    });
    assert.deepEqual(registryFindings(report), [
      { ruleId: 'ULT-REGISTRY-001', file: 'registry/metadata/setup/setup-remix.ts', line: 1, column: 1, symbol: 'setup-remix' },
    ]);
    assert.match(report.diagnostics[0]?.message ?? '', /never writes: its metadata is stale/);
  });

  test('rejects an item the build writes with no descriptor, and the files it leaves unclaimed', () => {
    const report = run({ 'registry/metadata/setup/setup-next.ts': null });
    assert.deepEqual(registryFindings(report), [
      { ruleId: 'ULT-REGISTRY-001', file: 'registry/metadata/setup/setup-next.ts', line: 1, column: 1, symbol: 'setup-next' },
      { ruleId: 'ULT-REGISTRY-001', file: 'registry/static/setup-next', line: 1, column: 1, target: 'source-without-metadata' },
    ]);
  });

  test('rejects a source and an item of different shapes under one ID', () => {
    // A component file named for the artifact item: the build would stage it as registry:ui "tokens-css".
    const report = run({ 'packages/ui/src/tokens-css.tsx': source(SEPARATOR) });
    assert.deepEqual(registryFindings(report), [
      { ruleId: 'ULT-REGISTRY-001', file: 'registry/metadata/artifact/tokens-css.ts', line: 1, column: 1, symbol: 'tokens-css' },
    ]);
    assert.match(report.diagnostics.find((diagnostic) => diagnostic.ruleId === 'ULT-REGISTRY-001')?.message ?? '', /is a artifact descriptor|is a artifact/);
  });

  test('rejects two sources that stage to one registry path', () => {
    const report = run({ 'packages/ui/src/lib/tokens.stylex.ts': "export const clash = 'clash';\n" });
    assert.deepEqual(registryFindings(report), [
      { ruleId: 'ULT-REGISTRY-001', file: 'packages/ui/src/lib/tokens.stylex.ts', line: 1, column: 1, target: 'registry/ultima/lib/tokens.stylex.ts' },
    ]);
  });

  test('rejects a workspace import the build stages no file for, once per site', () => {
    const report = run({ [SEPARATOR]: afterFirstLine(source(SEPARATOR), "import tokens from '@ultima/tokens/tokens.json';") });
    // ULT-IMPORT-001 already rejects this spelling at the specifier, so the registry rule does not repeat it.
    assert.deepEqual(
      located(report).map((entry) => entry.ruleId),
      ['ULT-IMPORT-001'],
    );
    // The builder's own rewrite is what the registry rule checks every staged import against.
    const { sources } = stagedSources(repository);
    assert.equal(stagedTarget('@ultima/tokens/tokens.json', sources), undefined);
    assert.equal(stagedTarget('@ultima/ui', sources), undefined);
    assert.equal(stagedTarget('@ultima/tokens/tokens.stylex', sources)?.item, 'tokens');
    assert.equal(stagedTarget('@ultima/ui/lib/component', sources)?.item, 'lib');
    assert.equal(stagedTarget('@ultima/ui/dialog', sources)?.item, 'dialog');
  });

  test('rejects a registry dependency on an item that does not exist', () => {
    const report = run({
      'registry/metadata/element/ult-badge.ts': source('registry/metadata/element/ult-badge.ts').replace("registryDependencies: ['tokens-css']", "registryDependencies: ['tokens-scss']"),
    });
    assert.deepEqual(registryFindings(report), [
      { ruleId: 'ULT-REGISTRY-001', file: 'registry/metadata/element/ult-badge.ts', line: 1, column: 1, target: 'missing-reference' },
    ]);
  });

  test('leaves a relative sibling import to ULT-IMPORT-001, and a valid composition passes', () => {
    const report = run({ [SEPARATOR]: afterFirstLine(source(SEPARATOR), "import { Dialog } from './dialog';") });
    assert.deepEqual(registryFindings(report), []);
    assert.ok(located(report).some((entry) => entry.ruleId === 'ULT-IMPORT-001'));
    // Sidebar composes Dialog through its staged specifier, and item sidebar declares the dependency.
    assert.match(source('packages/ui/src/sidebar.tsx'), /from ["']@ultima\/ui\/dialog["']/);
    assert.deepEqual(located(run(), 'packages/ui/src/sidebar.tsx'), []);
  });
});
