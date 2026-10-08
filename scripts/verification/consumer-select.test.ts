import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mdxImports } from '../catalogue/source.ts';
import { externalLayout } from '../consumer-external.ts';
import { repository } from '../consumer-helpers.ts';
import { CONSUMER_LAYOUTS, DELIVERY_PATHS } from '../consumer-report.ts';
import { consumerMatrix } from '../consumer-select.ts';
import { repositoryFiles } from './model.ts';
import { plan, snapshot } from './plan.ts';

const current = snapshot(repositoryFiles(repository));
const selected = (...paths: string[]) => consumerMatrix(plan({
  mode: 'changed', selectors: [], current, base: current,
  baseInfo: { ref: 'origin/main', commit: null, mergeBase: null, head: null, fallback: null },
  changes: paths.map((path) => ({ path, status: 'modified', sources: ['committed'] })),
}));
const every = {
  proof: CONSUMER_LAYOUTS.flatMap((layout) => DELIVERY_PATHS.map((path) => `${layout}/${path}`)).sort(),
  mode: [...CONSUMER_LAYOUTS].sort(),
};
const cells = ({ proof, mode }: ReturnType<typeof consumerMatrix>) => ({ proof: proof.map((cell) => `${cell.layout}/${cell['delivery-path']}`).sort(), mode: mode.map((cell) => cell.layout).sort() });

test('a release plan selects every installed-consumer cell', () => {
  assert.deepEqual(cells(consumerMatrix(plan({ mode: 'release', selectors: [], current }))), every);
});

test('a prose-only change selects no installed-consumer cell', () => {
  assert.deepEqual(selected('docs/spec/consumer-proof.md', 'README.md'), { proof: [], mode: [] });
});

test('token, theme export, StyleX config, runner and dependency changes select every cell', () => {
  for (const path of ['packages/tokens/src/tokens.stylex.ts', 'packages/tokens/src/theme/export.ts', 'stylex.options.ts', 'scripts/consumer-proof.ts', 'pnpm-lock.yaml']) assert.deepEqual(cells(selected(path)), every, path);
});

test('scene components, setup and the CLI select the cells that install them', () => {
  assert.deepEqual(cells(selected('packages/ui/src/dialog.tsx')).proof, every.proof);
  assert.deepEqual(cells(selected('registry/static/setup-next/postcss.config.js')), { proof: every.proof.filter((cell) => cell.startsWith('next-')), mode: ['next-app', 'next-src'] });
  assert.deepEqual(cells(selected('packages/cli/src/stamp.ts')), { proof: CONSUMER_LAYOUTS.map((layout) => `${layout}/cli`).sort(), mode: [] });
  assert.deepEqual(selected('packages/ui/src/tooltip.tsx'), { proof: [], mode: [] });
});

test('MDX code fences are prose, not imports', () => {
  const text = "import { Card } from '@ultima/ui';\n\n```tsx title=\"src/main.tsx\"\nimport './index.css';\n```\n\n~~~\nimport '../ultima-theme.css';\n~~~\n";
  assert.deepEqual(mdxImports('page.mdx', text).map((entry) => entry.specifier), ['@ultima/ui']);
});

test('external mode reads the layout from the project it is given', () => {
  assert.equal(externalLayout({ devDependencies: { vite: '^8' } }, false), 'vite');
  assert.equal(externalLayout({ dependencies: { next: '16' } }, false), 'next-app');
  assert.equal(externalLayout({ dependencies: { next: '16' } }, true), 'next-src');
  assert.equal(externalLayout({ dependencies: { react: '19' } }, false), null);
});
