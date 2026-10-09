import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mdxImports } from '../catalogue/source.ts';
import { externalLayout } from '../consumer-external.ts';
import { repository } from '../consumer-helpers.ts';
import { CONSUMER_LAYOUTS, DELIVERY_PATHS } from '../consumer-report.ts';
import { consumerMatrix } from '../consumer-select.ts';
import { repositoryFiles } from './model.ts';
import { type Plan, plan, snapshot } from './plan.ts';

const current = snapshot(repositoryFiles(repository));
const selected = (...paths: string[]) => consumerMatrix(plan({
  mode: 'changed', selectors: [], current, base: current,
  baseInfo: { ref: 'origin/main', commit: null, mergeBase: null, head: null, fallback: null },
  changes: paths.map((path) => ({ path, status: 'modified', sources: ['committed'] })),
}));
const every = {
  proof: CONSUMER_LAYOUTS.flatMap((layout) => DELIVERY_PATHS.map((path) => `${layout}/${path}`)).sort(),
  mode: [...CONSUMER_LAYOUTS].sort(),
  copy: [...CONSUMER_LAYOUTS].sort(),
  lint: [...CONSUMER_LAYOUTS].sort(),
  bundles: [...CONSUMER_LAYOUTS].sort(),
  elements: ['vite'],
};
const layouts = (list: { layout: string }[]) => list.map((cell) => cell.layout).sort();
const cells = ({ proof, mode, copy, lint, bundles, elements }: ReturnType<typeof consumerMatrix>) => ({ proof: proof.map((cell) => `${cell.layout}/${cell['delivery-path']}`).sort(), mode: layouts(mode), copy: layouts(copy), lint: layouts(lint), bundles: layouts(bundles), elements: layouts(elements) });
const none = { proof: [], mode: [], copy: [], lint: [], bundles: [], elements: [] };

test('a release plan selects every installed-consumer cell', () => {
  assert.deepEqual(cells(consumerMatrix(plan({ mode: 'release', selectors: [], current }))), every);
});

test('a prose-only change selects no installed-consumer cell', () => {
  assert.deepEqual(selected('docs/spec/consumer-proof.md', 'README.md'), none);
});

test('token, theme export, StyleX config, runner and dependency changes select every cell', () => {
  for (const path of ['packages/tokens/src/tokens.stylex.ts', 'packages/tokens/src/theme/export.ts', 'stylex.options.ts', 'scripts/consumer-proof.ts', 'scripts/consumer-copy-bundles.ts', 'scripts/consumer-lint.ts', 'scripts/consumer-bundles.ts', 'scripts/consumer-elements.ts', 'pnpm-lock.yaml']) assert.deepEqual(cells(selected(path)), every, path);
});

test('scene components, setup and the CLI select the cells that install them', () => {
  assert.deepEqual(cells(selected('packages/ui/src/dialog.tsx')), { ...every, mode: [], elements: [] });
  assert.deepEqual(cells(selected('registry/static/setup-next/postcss.config.js')), { proof: every.proof.filter((cell) => cell.startsWith('next-')), mode: ['next-app', 'next-src'], copy: every.copy, lint: ['next-app', 'next-src'], bundles: ['next-app', 'next-src'], elements: [] });
  assert.deepEqual(cells(selected('packages/cli/src/stamp.ts')), { ...none, proof: CONSUMER_LAYOUTS.map((layout) => `${layout}/cli`).sort(), lint: every.lint });
  assert.deepEqual(cells(selected('packages/ui/src/tooltip.tsx')), { ...none, lint: every.lint, elements: ['vite'] }, 'a React item selects its shipped element counterpart');
  assert.deepEqual(cells(selected('packages/elements/src/ult-tabs.element.ts')), { ...none, elements: ['vite'] });
  assert.deepEqual(cells(selected('packages/ui/src/checkbox.tsx')), { ...none, copy: every.copy, lint: every.lint, bundles: ['vite'] });
});

test('each exercise lands in its own job matrix', () => {
  const argv = (exercise: string) => ['node', '--experimental-strip-types', 'scripts/consumer-proof.ts', '--layout', 'vite', '--delivery-path', 'css', '--exercise', exercise];
  assert.deepEqual(cells(consumerMatrix({ checks: [{ argv: argv('copy-bundles') }, { argv: argv('lint') }, { argv: argv('bundles') }, { argv: argv('elements') }] as Plan['checks'] })), { ...none, copy: ['vite'], lint: ['vite'], bundles: ['vite'], elements: ['vite'] });
  assert.throws(() => consumerMatrix({ checks: [{ argv: argv('first-screen') }] as Plan['checks'] }), /first-screen/);
});

test('MDX code fences are prose, not imports', () => {
  const text = "import { Card } from '@ultima/ui';\n\n```tsx title=\"src/main.tsx\"\nimport './index.css';\n```\n\n~~~\nimport '../ultima-theme.css';\n~~~\n";
  assert.deepEqual(mdxImports('page.mdx', text).map((entry) => entry.specifier), ['@ultima/ui']);
  const nested = "import { Card } from '@ultima/ui';\n\n```md\n```tsx\nimport './example.css';\n```\n\nimport { Demo } from '../demos';\n";
  assert.deepEqual(mdxImports('page.mdx', nested).map((entry) => entry.specifier), ['@ultima/ui', '../demos']);
});

test('external mode reads the layout from the project it is given', () => {
  assert.equal(externalLayout({ devDependencies: { vite: '^8' } }, false), 'vite');
  assert.equal(externalLayout({ dependencies: { next: '16' } }, false), 'next-app');
  assert.equal(externalLayout({ dependencies: { next: '16' } }, true), 'next-src');
  assert.equal(externalLayout({ dependencies: { react: '19' } }, false), null);
});
