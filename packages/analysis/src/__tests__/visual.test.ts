// ULT-VISUAL-001, the checkable rules of docs/spec/design-foundations.md, over the real
// repository with one file replaced or mutated at a time. docs/spec/agent-infrastructure.md, Visual rules.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { fixture, located, run, source } from './support.ts';

const SEPARATOR = 'packages/ui/src/separator.tsx';
const CARD = 'packages/ui/src/card.tsx';
const SWITCH = 'packages/ui/src/switch.tsx';
const visual = (line: number, column: number, symbol: string, target: string, selector?: string) => ({
  ruleId: 'ULT-VISUAL-001',
  file: SEPARATOR,
  line,
  column,
  symbol,
  target,
  ...(selector !== undefined && { selector }),
});

describe('ULT-VISUAL-001', () => {
  test('rejects each visual rule a style table breaks, at its value', () => {
    const report = run({ [SEPARATOR]: fixture('visual/invalid.tsx') });
    assert.deepEqual(located(report, SEPARATOR), [
      visual(8, 16, 'styles.floating', 'boxShadow'),
      visual(12, 53, 'styles.ring', 'boxShadow', ':focus-visible'),
      visual(15, 14, 'styles.frame', 'outline'),
      visual(18, 21, 'styles.frosted', 'backdropFilter'),
      visual(22, 13, 'styles.loading', 'filter'),
      visual(27, 18, 'styles.control', 'borderWidth'),
      visual(32, 18, 'styles.heavy', 'borderWidth'),
      visual(36, 52, 'styles.dimmed', 'opacity', ':is([data-disabled])'),
      visual(39, 14, 'styles.disabled', 'opacity'),
    ]);
    const [shadow] = report.diagnostics;
    assert.equal(shadow?.severity, 'blocking');
    assert.equal(shadow?.link, 'docs/spec/design-foundations.md#elevation');
  });

  test('accepts a bordered shadow, the scrim blur, focus outlines, the current-item indicator, and disabled colors', () => {
    assert.deepEqual(located(run({ [SEPARATOR]: fixture('visual/valid.tsx') }), SEPARATOR), []);
  });

  test("rejects Switch's disabled track once it dims with opacity", () => {
    const text = source(SWITCH);
    const mutated = text.replace(/(\n  root: \{\n)/, "$1    opacity: { default: 1, ':is([data-disabled])': 0.5 },\n");
    assert.notEqual(mutated, text);
    const findings = located(run({ [SWITCH]: mutated }), SWITCH);
    assert.deepEqual(
      findings.map(({ ruleId, symbol, target, selector }) => ({ ruleId, symbol, target, selector })),
      [{ ruleId: 'ULT-VISUAL-001', symbol: 'styles.root', target: 'opacity', selector: ':is([data-disabled])' }],
    );
  });

  test("rejects Card's shadow once its border color is gone", () => {
    const text = source(CARD);
    const mutated = text.replace("    borderColor: color['--ult-color-border'],\n", '');
    assert.notEqual(mutated, text);
    const findings = located(run({ [CARD]: mutated }), CARD);
    assert.deepEqual(
      findings.map(({ ruleId, symbol, target }) => ({ ruleId, symbol, target })),
      [{ ruleId: 'ULT-VISUAL-001', symbol: 'styles.root', target: 'boxShadow' }],
    );
  });
});
