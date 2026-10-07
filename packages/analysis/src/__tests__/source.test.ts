// ULT-SOURCE-001 over the real repository with one file mutated or added at a time.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { optimizerPolicy } from '../../../../scripts/catalogue/optimizer-policy.ts';
import { planScaffold } from '../../../../scripts/catalogue/scaffold.ts';
import { INCOMPLETE_MARKER } from '../rules/source.ts';
import { fixture, located, repository, run, source } from './support.ts';

const SEPARATOR = 'packages/ui/src/separator.tsx';
const PAGE = 'apps/docs/src/content/components/separator.mdx';

describe('ULT-SOURCE-001', () => {
  test('rejects an unclassified production source', () => {
    const report = run({ 'packages/ui/src/parts/extra.tsx': source(SEPARATOR) });
    assert.deepEqual(located(report), [{ ruleId: 'ULT-SOURCE-001', file: 'packages/ui/src/parts/extra.tsx', line: 1, column: 1 }]);
    assert.equal(report.status, 'violations');
  });

  test('rejects a second component file no descriptor claims', () => {
    const report = run({ 'packages/ui/src/widget.tsx': source(SEPARATOR) });
    assert.deepEqual(located(report), [{ ruleId: 'ULT-SOURCE-001', file: 'packages/ui/src/widget.tsx', line: 1, column: 1 }]);
    assert.match(report.diagnostics[0]?.message ?? '', /one registry item of the same name/);
  });

  test('rejects a test beside the component, in every component package', () => {
    for (const path of ['packages/ui/src/separator.test.tsx', 'packages/elements/src/ult-badge.test.ts', 'packages/tokens/src/theme/codec.test.ts']) {
      const report = run({ [path]: "import { test } from 'vitest';\n" });
      assert.deepEqual(located(report), [{ ruleId: 'ULT-SOURCE-001', file: path, line: 1, column: 1 }], path);
    }
  });

  test('requires the client directive as the first statement', () => {
    for (const name of ['source/no-directive.tsx', 'source/directive-after-import.tsx']) {
      assert.deepEqual(located(run({ [SEPARATOR]: fixture(name) })), [
        { ruleId: 'ULT-SOURCE-001', file: SEPARATOR, line: 1, column: 1, target: 'use client' },
      ]);
    }
  });

  test('accepts the double-quoted directive Sidebar uses', () => {
    assert.match(source('packages/ui/src/sidebar.tsx'), /^"use client";/);
    assert.deepEqual(located(run(), 'packages/ui/src/sidebar.tsx'), []);
  });

  test('rejects a StyleX table built inside a function', () => {
    assert.deepEqual(located(run({ [SEPARATOR]: fixture('source/table-in-function.tsx') })), [
      { ruleId: 'ULT-SOURCE-001', file: SEPARATOR, line: 6, column: 18, symbol: 'Separator', target: 'stylex.create' },
    ]);
  });

  test('follows renamed imports and module-scope aliases of create and keyframes', () => {
    assert.deepEqual(located(run({ [SEPARATOR]: fixture('source/renamed-create.tsx') })), [
      { ruleId: 'ULT-SOURCE-001', file: SEPARATOR, line: 8, column: 18, symbol: 'Separator', target: 'stylex.create' },
    ]);
    assert.deepEqual(located(run({ [SEPARATOR]: fixture('source/aliased-namespace.tsx') })), [
      { ruleId: 'ULT-SOURCE-001', file: SEPARATOR, line: 13, column: 16, symbol: 'Separator', target: 'stylex.create' },
    ]);
  });

  test('reports StyleX reached through a computed member or passed as a value as unresolved analysis', () => {
    const report = run({ [SEPARATOR]: fixture('source/escaping-stylex.tsx') });
    assert.deepEqual(located(report), [
      { ruleId: 'ULT-ANALYSIS-001', file: SEPARATOR, line: 6, column: 16, symbol: 'styles', target: 'stylex' },
      { ruleId: 'ULT-ANALYSIS-001', file: SEPARATOR, line: 13, column: 10, symbol: 'Separator', target: 'stylex' },
    ]);
    assert.equal(report.status, 'incomplete');
  });

  test('accepts module-scope tables, exported, wrapped in satisfies or parentheses', () => {
    assert.deepEqual(located(run({ [SEPARATOR]: fixture('source/module-scope-tables.tsx') })), []);
  });

  test('rejects an incomplete scaffold marker in a component', () => {
    assert.ok(fixture('source/marker.tsx').includes(INCOMPLETE_MARKER));
    assert.deepEqual(located(run({ [SEPARATOR]: fixture('source/marker.tsx') })), [
      { ruleId: 'ULT-SOURCE-001', file: SEPARATOR, line: 7, column: 4, target: INCOMPLETE_MARKER },
    ]);
  });

  test('rejects a marker in executable MDX at its original location, but not in printed examples', () => {
    assert.deepEqual(located(run({ [PAGE]: fixture('source/marker.mdx') })), [
      { ruleId: 'ULT-SOURCE-001', file: PAGE, line: 13, column: 5, target: INCOMPLETE_MARKER },
    ]);
  });

  test('rejects every marker a real scaffold writes, and nothing else, until the author removes them', () => {
    const request = {
      descriptor: {
        title: 'Ribbon',
        description: 'A ribbon, for the checker fixture.',
        contract: 'docs/spec/ultima.md#one-file-per-component',
        installDocs: "import { Ribbon } from '@/components/ui/ribbon';",
        primaryExport: 'Ribbon',
        release: 'v0.1',
        order: 99,
        group: 'feedback',
      },
      brief: {
        primitive: { kind: 'native', element: 'div' },
        shape: 'plain',
        axes: { variant: { values: ['subtle', 'solid'], default: 'subtle' } },
        proofBar: ['renders', 'named', 'no ring', 'plain', 'no state', 'types', 'no behavior', 'no primitive css'],
      },
    };
    const plan = planScaffold(repository, 'react', 'ribbon', request, optimizerPolicy);
    const created = Object.fromEntries(plan.create);
    const report = run(created);
    const marked = Object.keys(created).filter((path) => created[path]?.includes(INCOMPLETE_MARKER));
    assert.ok(marked.length >= 4, marked.join(', '));
    assert.ok(report.diagnostics.every((diagnostic) => diagnostic.ruleId === 'ULT-SOURCE-001' && diagnostic.target === INCOMPLETE_MARKER));
    assert.deepEqual([...new Set(report.diagnostics.map((diagnostic) => diagnostic.file))].sort(), marked.sort());

    const completed = Object.fromEntries(Object.entries(created).map(([path, text]) => [path, text.split(INCOMPLETE_MARKER).join('completed')]));
    assert.deepEqual(located(run(completed)), []);
  });
});
