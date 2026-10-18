// The chart-engine allowance: docs/spec/agent-infrastructure.md, Import and registry boundaries. The
// `chart` item, a block that imports it and a demo may import the allowlisted @tanstack/charts entries;
// every other entry, and every entry anywhere else, fails ULT-IMPORT-001.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { diskFiles } from '../../../../scripts/catalogue/files.ts';
import { checkConsumer } from '../consumer.ts';
import { formatJson } from '../diagnostic.ts';
import { CHART_ENGINE_ENTRIES, CHART_ENGINE_ITEMS, POLICY, STYLE_POLICY, allows, categoryOf } from '../policy.ts';
import type { Scope } from '../scope.ts';
import { afterFirstLine, fixture, located, root, run, source } from './support.ts';

const CHART = 'packages/ui/src/chart.tsx';
const SEPARATOR = 'packages/ui/src/separator.tsx';
const BLOCK = 'packages/blocks/src/sign-in-01/fixture-region.tsx';
const BLOCK_TREND = 'packages/blocks/src/sign-in-01/fixture-trend.tsx';
const DEMO = 'apps/docs/src/demos/separator/fixture-chart.tsx';

/**
 * The repository as it stands once the item ships: a `chart` React descriptor and source, and the d3
 * Chart recipe gone, since the two share the id.
 */
function withChart(chart: string, changes: Record<string, string | null> = {}) {
  const descriptor = source('registry/metadata/react/separator.ts')
    .replace("id: 'separator'", "id: 'chart'")
    .replace("title: 'Separator'", "title: 'Chart'")
    .replace("primaryExport: 'Separator'", "primaryExport: 'Chart'");
  return run({ 'registry/metadata/react/chart.ts': descriptor, 'registry/metadata/recipe/chart.ts': null, [CHART]: chart, ...changes });
}

const imports = (rows: ReturnType<typeof located>) => rows.filter((row) => row.ruleId === 'ULT-IMPORT-001').map(({ line, target }) => [line, target]);

describe('the chart-engine category', () => {
  test('matches the whole specifier against the eighteen walked entries, ahead of engine', () => {
    assert.equal(CHART_ENGINE_ENTRIES.length, 18);
    for (const entry of ['scene', 'runtime', 'types', 'bar', 'line', 'area', 'dot', 'rule', 'rect', 'text', 'tick', 'band', 'stack', 'transform/stack', 'scales/band', 'scales/linear', 'scales/point', 'scales/ordinal']) {
      assert.equal(categoryOf(POLICY, `@tanstack/charts/${entry}`)?.category, 'chart-engine', entry);
    }
    for (const denied of ['@tanstack/charts', '@tanstack/charts/react', '@tanstack/charts/tooltip', '@tanstack/charts/legend', '@tanstack/charts/universal', '@tanstack/react-charts']) {
      assert.equal(categoryOf(POLICY, denied)?.category, 'engine', denied);
    }
    assert.ok(POLICY.categories.findIndex((rule) => rule.category === 'chart-engine') < POLICY.categories.findIndex((rule) => rule.category === 'engine'));
  });

  test('is listed in the JSON report with its authority', () => {
    const json = JSON.parse(formatJson(run())) as { policy: { categories: { category: string; authority: string }[] } };
    const listed = json.policy.categories.map(({ category }) => category);
    assert.ok(listed.indexOf('chart-engine') >= 0 && listed.indexOf('chart-engine') < listed.indexOf('engine'), listed.join(', '));
    assert.equal(json.policy.categories.find(({ category }) => category === 'chart-engine')?.authority, 'docs/adr/0007-engines-ship-as-recipes.md#amendment-2026-10-16');
  });

  test('bounds the React allowance to the chart item', () => {
    assert.deepEqual(CHART_ENGINE_ITEMS, ['chart']);
    assert.equal(allows(POLICY, 'react-component', 'chart-engine', 'chart'), true);
    assert.equal(allows(POLICY, 'react-component', 'chart-engine', 'separator'), false);
    assert.equal(allows(POLICY, 'react-component', 'chart-engine', undefined), false);
    assert.equal(allows(POLICY, 'element', 'chart-engine', 'chart'), false);
  });
});

describe('ULT-IMPORT-001 for the chart engine', () => {
  test('passes the allowed entries in the chart item', () => {
    const report = withChart(fixture('chart/item.tsx'));
    assert.deepEqual(imports(located(report, CHART)), []);
    // Until the item ticket installs @tanstack/charts, the API rule cannot read the entries' types.
    for (const diagnostic of report.diagnostics.filter((row) => row.file === CHART)) {
      assert.equal(diagnostic.ruleId, 'ULT-ANALYSIS-001');
      assert.match(diagnostic.message, /"@tanstack\/charts\/[a-z/]+" resolves to no module the compiler can read/);
    }
  });

  test('rejects the root, /react and /tooltip in the chart item, and names an allowed entry', () => {
    const report = withChart(fixture('chart/item-denied.tsx'));
    assert.deepEqual(imports(located(report, CHART)), [
      [3, '@tanstack/charts'],
      [4, '@tanstack/charts/react'],
      [5, '@tanstack/charts/tooltip'],
    ]);
    for (const diagnostic of report.diagnostics.filter((row) => row.file === CHART && row.ruleId === 'ULT-IMPORT-001')) {
      assert.match(diagnostic.repair, /@tanstack\/charts\/scene/);
      assert.match(diagnostic.repair, /@tanstack\/charts\/bar/);
    }
  });

  test('rejects any chart entry in another item', () => {
    const report = withChart(fixture('chart/item.tsx'), {
      [SEPARATOR]: afterFirstLine(source(SEPARATOR), "import { createChartScene } from '@tanstack/charts/scene';"),
    });
    assert.deepEqual(imports(located(report, SEPARATOR)), [[2, '@tanstack/charts/scene']]);
    assert.match(report.diagnostics.find((row) => row.file === SEPARATOR)?.repair ?? '', /@ultima\/ui\/chart/);
  });

  test("passes a block's chart entries when the block imports @ultima/ui/chart, in any of its files", () => {
    const report = withChart(fixture('chart/item.tsx'), { [BLOCK]: fixture('chart/block.tsx'), [BLOCK_TREND]: fixture('chart/block-entry.tsx') });
    assert.deepEqual(imports(located(report, BLOCK)), []);
    assert.deepEqual(imports(located(report, BLOCK_TREND)), []);
  });

  test('rejects a chart entry in a block that does not import @ultima/ui/chart', () => {
    const report = withChart(fixture('chart/item.tsx'), { [BLOCK_TREND]: fixture('chart/block-entry.tsx') });
    assert.deepEqual(imports(located(report, BLOCK_TREND)), [
      [1, '@tanstack/charts/line'],
      [2, '@tanstack/charts/scene'],
    ]);
    assert.match(report.diagnostics.find((row) => row.file === BLOCK_TREND)?.repair ?? '', /@ultima\/ui\/chart/);
  });

  test('keeps the denied entries denied in a block that imports the chart', () => {
    const denied = afterFirstLine(fixture('chart/block.tsx'), "import { createTooltip } from '@tanstack/charts/tooltip';");
    const report = withChart(fixture('chart/item.tsx'), { [BLOCK]: denied });
    assert.deepEqual(imports(located(report, BLOCK)), [[2, '@tanstack/charts/tooltip']]);
  });

  test('passes the allowed entries in a demo and rejects /react there, naming an allowed entry', () => {
    assert.deepEqual(located(run({ [DEMO]: fixture('chart/demo.tsx') }), DEMO), []);
    const report = run({ [DEMO]: fixture('chart/demo-denied.tsx') });
    assert.deepEqual(imports(located(report, DEMO)), [[1, '@tanstack/charts/react']]);
    assert.match(report.diagnostics.find((row) => row.file === DEMO)?.repair ?? '', /@tanstack\/charts\/scene/);
  });
});

describe('ULT-IMPORT-001 in a consumer scope', () => {
  const INSTALLED = 'src/components/ui/chart.tsx';
  const PAGE = 'src/app/page.tsx';
  const files = diskFiles(root);
  const texts: Record<string, string> = { [INSTALLED]: fixture('chart/installed.tsx'), [PAGE]: fixture('chart/page.tsx') };
  const scope: Scope = {
    name: 'consumer',
    files: { ...files, read: (path) => texts[path] },
    inventory: [
      { path: INSTALLED, kind: 'app' },
      { path: PAGE, kind: 'app' },
    ],
    unclassified: [],
    excluded: [],
    kindOf: (path) => (path in texts ? 'app' : undefined),
    resolve: (specifier) => ({ kind: 'external', package: specifier.split('/').slice(0, specifier.startsWith('@') ? 2 : 1).join('/') }),
    staged: () => undefined,
    itemOf: (path) => (path === INSTALLED ? 'chart' : undefined),
    policy: POLICY,
    styles: STYLE_POLICY,
    tokenSources: [],
    globalStyles: [],
    testPlacement: [],
    unclaimed: [],
    anchors: () => undefined,
    rules: ['ULT-IMPORT-001'],
    problems: [],
  };

  test("reports a denied entry in an installed chart.tsx and ignores the consumer's own file", () => {
    const report = checkConsumer(scope);
    assert.deepEqual(
      report.diagnostics.map(({ ruleId, file, start, target }) => [ruleId, file, start.line, target]),
      [['ULT-IMPORT-001', INSTALLED, 3, '@tanstack/charts/react']],
    );
    assert.equal(report.status, 'violations');
    assert.ok(report.rules.some((rule) => rule.id === 'ULT-IMPORT-001' && rule.status === 'blocking'));
  });
});
