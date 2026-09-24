// ULT-ANALYSIS-001: parser failures and an unusable catalogue make the run incomplete, never clean.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { exitCode } from '../diagnostic.ts';
import { fixture, located, run } from './support.ts';

const SEPARATOR = 'packages/ui/src/separator.tsx';
const PAGE = 'apps/docs/src/content/components/separator.mdx';

describe('ULT-ANALYSIS-001', () => {
  test('a TypeScript parse failure is reported once, at the first error, and exits 2', () => {
    const report = run({ [SEPARATOR]: fixture('analysis/parse-error.tsx') });
    assert.deepEqual(located(report), [{ ruleId: 'ULT-ANALYSIS-001', file: SEPARATOR, line: 5, column: 52 }]);
    assert.equal(report.diagnostics[0]?.severity, 'incomplete');
    assert.equal(report.status, 'incomplete');
    assert.equal(exitCode(report), 2);
  });

  test('an MDX parse failure is located in the original page', () => {
    const report = run({ [PAGE]: fixture('analysis/parse-error.mdx') });
    assert.deepEqual(located(report), [{ ruleId: 'ULT-ANALYSIS-001', file: PAGE, line: 5, column: 14 }]);
    assert.equal(exitCode(report), 2);
  });

  test('a parse failure in docs code or a demo is incomplete too', () => {
    for (const path of ['apps/docs/src/prose.tsx', 'apps/docs/src/demos/button/variants.tsx', 'packages/elements/src/ult-badge.element.ts']) {
      assert.equal(run({ [path]: 'export const broken = {;\n' }).status, 'incomplete', path);
    }
  });

  test('metadata the catalogue cannot read leaves the component inventory unestablished', () => {
    const report = run({ 'registry/metadata/react/separator.ts': 'export default load();\n' });
    assert.equal(report.status, 'incomplete');
    assert.ok(report.diagnostics.some((diagnostic) => diagnostic.ruleId === 'ULT-ANALYSIS-001' && diagnostic.file === 'registry/metadata/react/separator.ts'));
  });

  test('a violation outranks an incomplete analysis in the exit code', () => {
    assert.equal(exitCode({ counts: { blocking: 1, advisory: 0, incomplete: 1, excepted: 0 } }), 1);
    assert.equal(exitCode({ counts: { blocking: 0, advisory: 3, incomplete: 0, excepted: 2 } }), 0);
  });
});
