// ULT-TEST-001 over the real repository with a component test added or mutated at a time.
// docs/spec/agent-infrastructure.md, Component color assertions.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { fixedColors } from '../rules/assertions.ts';
import { fixture, located, run, source } from './support.ts';

const PROBE = 'packages/ui/src/__tests__/probe.test.tsx';
const ALERT = 'packages/ui/src/__tests__/alert.test.tsx';
const TOKENS = 'packages/tokens/src/tokens.stylex.ts';

const invalid = (directory: string) => ({
  [`${directory}/probe.test.tsx`]: fixture('assertions/invalid.test.tsx'),
  [`${directory}/palette-values.ts`]: fixture('assertions/palette-values.ts'),
});
const at = (file: string, line: number, column: number, symbol: string, target?: string, ruleId = 'ULT-TEST-001') => ({
  ruleId,
  file,
  line,
  column,
  symbol,
  ...(target !== undefined && { target }),
});
const pinned = (file: string) => [
  at(file, 13, 38, 'pins palette values', 'backgroundColor'),
  at(file, 14, 47, 'pins palette values', 'color'),
  at(file, 15, 41, 'pins palette values', 'borderTopColor'),
  at(file, 16, 38, 'pins palette values', 'outlineColor'),
  at(file, 17, 30, 'pins palette values', 'backgroundColor'),
  at(file, 18, 74, 'pins palette values', 'backgroundColor'),
  at(file, 19, 59, 'pins palette values', 'border-top-color'),
  at(file, 20, 28, 'pins palette values', 'color'),
  at(file, 22, 32, 'pins palette values', 'backgroundColor'),
  at(file, 23, 21, 'pins palette values', 'borderTopColor'),
  at(file, 24, 38, 'pins palette values', 'backgroundColor'),
];

describe('ULT-TEST-001', () => {
  test('rejects a computed color pinned to a fixed literal, in place or through a local or sibling constant', () => {
    const report = run(invalid('packages/ui/src/__tests__'));
    assert.deepEqual(located(report), pinned(PROBE));
    assert.equal(report.status, 'violations');
    const [first, alias] = report.diagnostics;
    assert.equal(first?.severity, 'blocking');
    assert.equal(first?.link, 'docs/spec/ultima.md#what-a-build-ticket-proves');
    assert.equal(first?.expression, "'rgb(51, 102, 255)'");
    assert.match(first?.message ?? '', /^The assertion toBe\('rgb\(51, 102, 255\)'\) pins the computed backgroundColor to the fixed color rgb\(51, 102, 255\)\. No component test asserts a color value/);
    assert.match(alias?.message ?? '', /pins the computed color to the fixed color #3366ff\. /);
    assert.match(report.diagnostics[2]?.message ?? '', /fixed color rgb\(51, 102, 255\), which PINNED resolves to/);
  });

  test('reads every component test directory', () => {
    for (const directory of ['packages/elements/src/__tests__', 'packages/blocks/src/__tests__']) {
      assert.deepEqual(located(run(invalid(directory))), pinned(`${directory}/probe.test.tsx`), directory);
    }
  });

  test('accepts before/after and installed-token comparisons, transparent paint, installed overrides and unrelated hex text', () => {
    const report = run({ [PROBE]: fixture('assertions/valid.test.tsx') });
    assert.deepEqual(located(report), []);
    assert.equal(report.status, 'clean');
  });

  test('leaves token and compiler output tests, whose contract is the exact emitted value, outside its scope', () => {
    for (const directory of ['packages/tokens/src/__tests__', 'apps/docs/tests/fixtures']) {
      assert.deepEqual(located(run(invalid(directory))), [], directory);
    }
  });

  test('reports a relevant value it cannot follow as incomplete analysis, never as a pass', () => {
    const report = run({ [PROBE]: fixture('assertions/unresolved.test.tsx') });
    assert.deepEqual(located(report), [
      at(PROBE, 4, 58, 'expectPaint', 'backgroundColor', 'ULT-ANALYSIS-001'),
      at(PROBE, 11, 51, 'values the checker cannot follow', 'color', 'ULT-ANALYSIS-001'),
      at(PROBE, 14, 74, 'values the checker cannot follow', undefined, 'ULT-ANALYSIS-001'),
      at(PROBE, 17, 28, 'values the checker cannot follow', undefined, 'ULT-ANALYSIS-001'),
      at(PROBE, 20, 21, 'values the checker cannot follow', undefined, 'ULT-ANALYSIS-001'),
      at(PROBE, 22, 24, 'values the checker cannot follow', undefined, 'ULT-ANALYSIS-001'),
    ]);
    assert.ok(report.diagnostics.every((diagnostic) => diagnostic.severity === 'incomplete'));
    assert.equal(report.status, 'incomplete');
    assert.match(report.diagnostics[0]?.message ?? '', /expected is a parameter/);
    assert.match(report.diagnostics[1]?.message ?? '', /resting is declared with let or var/);
    assert.match(report.diagnostics[3]?.message ?? '', /style is declared with let or var, so whether its color is the computed style/);
    assert.match(report.diagnostics[4]?.message ?? '', /fill is declared with let or var/);
    assert.match(report.diagnostics[5]?.message ?? '', /rest is destructured from a computed style/);
  });

  test('follows a constant a sibling test file exports into every assertion that compares with it', () => {
    const path = 'packages/ui/src/__tests__/token-value.ts';
    const text = source(path);
    const mutated = text.replace("export const TRANSPARENT = 'rgba(0, 0, 0, 0)';", "export const TRANSPARENT = 'rgb(1, 2, 3)';");
    assert.notEqual(mutated, text);
    assert.deepEqual(
      located(run({ [path]: mutated })).map(({ ruleId, file, line }) => ({ ruleId, file, line })),
      [
        { ruleId: 'ULT-TEST-001', file: 'packages/ui/src/__tests__/badge.test.tsx', line: 107 },
        { ruleId: 'ULT-TEST-001', file: 'packages/ui/src/__tests__/badge.test.tsx', line: 108 },
        { ruleId: 'ULT-TEST-001', file: 'packages/ui/src/__tests__/empty.test.tsx', line: 45 },
        { ruleId: 'ULT-TEST-001', file: 'packages/ui/src/__tests__/table.test.tsx', line: 410 },
      ],
    );
  });

  test("rejects Alert's token-derived proof once it pins the current palette value", () => {
    const text = source(ALERT);
    const mutated = text.replace("tokenValue('background-color', 'var(--ult-color-surface-raised)')", "'rgb(253, 253, 253)'");
    assert.notEqual(mutated, text);
    assert.deepEqual(
      located(run({ [ALERT]: mutated }), ALERT).map(({ ruleId, symbol, target }) => ({ ruleId, symbol, target })),
      [{ ruleId: 'ULT-TEST-001', symbol: 'the neutral tone is ink on the raised surface, not a grey fill', target: 'backgroundColor' }],
    );
  });

  test('gives the same verdicts after a palette value changes', () => {
    const text = source(TOKENS);
    const mutated = text.replace("light1: '#fdfdfd'", "light1: '#f2e8d8'");
    assert.notEqual(mutated, text);
    assert.deepEqual(located(run({ [TOKENS]: mutated, [PROBE]: fixture('assertions/valid.test.tsx') })), []);
    assert.deepEqual(located(run({ [TOKENS]: mutated, ...invalid('packages/ui/src/__tests__') })), pinned(PROBE));
  });

  test('names a fixed color in any CSS notation, and not the transparent one', () => {
    assert.deepEqual(fixedColors('rgb(1, 2, 3)'), ['rgb(1, 2, 3)']);
    assert.deepEqual(fixedColors('0 0 0 1px #3366ff'), ['#3366ff']);
    assert.deepEqual(fixedColors('oklch(0.6 0.1 200 / 0.5)'), ['oklch(0.6 0.1 200 / 0.5)']);
    assert.deepEqual(fixedColors('rgba(0, 0, 0, 0)'), []);
    assert.deepEqual(fixedColors('rgb(0 0 0 / 0)'), []);
    assert.deepEqual(fixedColors('color(display-p3 1 0.5 0)'), ['color(display-p3 1 0.5 0)']);
    assert.deepEqual(fixedColors('color(display-p3 1 0 0)'), ['color(display-p3 1 0 0)']);
    assert.deepEqual(fixedColors('color(display-p3 1 0 0 / 0)'), []);
    assert.deepEqual(fixedColors('hsla(0, 0%, 0%, 0)'), []);
    assert.deepEqual(fixedColors('rgba(1, 2, 3, 0.5)'), ['rgba(1, 2, 3, 0.5)']);
    assert.deepEqual(fixedColors('#0000'), []);
    assert.deepEqual(fixedColors('none'), []);
    assert.deepEqual(fixedColors('issue&#35;12 and #fade-in'), []);
    assert.deepEqual(fixedColors('url("#fade")'), []);
    assert.deepEqual(fixedColors("url(#abc) #3366ff"), ['#3366ff']);
  });
});
