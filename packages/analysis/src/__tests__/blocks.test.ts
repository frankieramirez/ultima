// docs/spec/ultima.md#sources-and-the-files-of-a-block, with fixtures mounted over a file in Sign-in 01's folder.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { classify } from '../workspace.ts';
import { fixture, located, run, source } from './support.ts';

const FILE = 'packages/blocks/src/sign-in-01/fixture-region.tsx';

describe('block files', () => {
  test('are their own source kind, and their tests sit under packages/blocks/src/__tests__/', () => {
    assert.equal(classify('packages/blocks/src/sign-in-01/sign-in-form.tsx'), 'block');
    assert.equal(classify('packages/blocks/src/__tests__/sign-in-01.test.tsx'), 'test');
    const report = run({ 'packages/blocks/src/sign-in-01/region.test.tsx': "import { test } from 'vitest';\ntest('x', () => {});\n" });
    assert.deepEqual(
      located(report, 'packages/blocks/src/sign-in-01/region.test.tsx').map(({ ruleId }) => ruleId),
      ['ULT-SOURCE-001'],
    );
  });

  test('reject a raw value, className, paint, a native control, an option outside a kit select and an engine import', () => {
    const report = run({ [FILE]: fixture('blocks/invalid.tsx') });
    assert.deepEqual(
      located(report, FILE).map(({ ruleId, line, column, target }) => [ruleId, line, column, target]),
      [
        ['ULT-IMPORT-001', 2, 29, 'd3-scale'],
        ['ULT-TOKEN-001', 8, 10, 'gap'],
        ['ULT-DOCS-001', 10, 22, 'backgroundColor'],
        ['ULT-STYLE-001', 16, 14, 'className'],
        ['ULT-DOCS-002', 18, 8, '<button>'],
        ['ULT-DOCS-002', 20, 10, '<option>'],
      ],
    );
    assert.equal(report.status, 'violations');
  });

  test("pass tokens, StyleX, catalogue components, render composition, a kit select's options and their own glyphs", () => {
    const report = run({ [FILE]: fixture('blocks/valid.tsx') });
    assert.deepEqual(located(report, FILE), []);
    assert.equal(report.status, 'clean');
  });

  test("require the 'use client' directive on the entry file only", () => {
    const entry = 'packages/blocks/src/sign-in-01/sign-in-01.tsx';
    const report = run({ [entry]: source(entry).replace("'use client';\n\n", '') });
    assert.deepEqual(
      located(report, entry).map(({ ruleId, target }) => [ruleId, target]),
      [['ULT-SOURCE-001', 'use client']],
    );
    assert.deepEqual(located(run({ [FILE]: fixture('blocks/valid.tsx') }), FILE), []);
  });

  test("reject an import of another block's file", () => {
    const report = run({ [FILE]: "import { Region } from '../crm-01/region';\nexport function Other() { return <Region />; }\n", 'packages/blocks/src/crm-01/region.tsx': 'export function Region() { return null; }\n' });
    assert.deepEqual(
      located(report, FILE).map(({ ruleId, line, target }) => [ruleId, line, target]),
      [['ULT-IMPORT-001', 1, '../crm-01/region']],
    );
  });
});
