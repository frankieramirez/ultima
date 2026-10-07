// ULT-TOKEN-001 and the value grammar, over the real repository with one file mutated or replaced at a
// time. docs/spec/agent-infrastructure.md, Values and runtime styles.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { CATEGORIES, type Category, type Context, type Piece, categoryOf, checkValue, classifiedProperties } from '../grammar.ts';
import { RUNTIME_VARIABLES } from '../policy.ts';
import { fixture, located, run, source } from './support.ts';

const SEPARATOR = 'packages/ui/src/separator.tsx';
const TOAST = 'packages/ui/src/toast.tsx';
const token = (line: number, column: number, target: string, extra: { symbol?: string; selector?: string } = {}) => ({
  ruleId: 'ULT-TOKEN-001',
  file: SEPARATOR,
  line,
  column,
  symbol: extra.symbol ?? 'styles.root',
  target,
  ...(extra.selector !== undefined && { selector: extra.selector }),
});

/** Check a literal value against a property the way a declaration is checked. */
function check(property: string, value: string, context: Partial<Context> = {}) {
  const pieces: Piece<string>[] = [{ kind: 'text', text: value, at: value }];
  return checkValue(categoryOf(property) as Category, pieces, {
    property,
    variables: RUNTIME_VARIABLES,
    tokenByName: () => undefined,
    ...context,
  }).map((problem) => problem.message);
}

describe('ULT-TOKEN-001', () => {
  test('rejects raw design literals by property, each at its value', () => {
    const report = run({ [SEPARATOR]: fixture('tokens/raw-values.tsx') });
    assert.deepEqual(
      [...new Map(located(report).map((entry) => [`${entry.line}:${entry.column}`, entry])).values()],
      [
        token(7, 22, 'backgroundColor'),
        token(8, 19, 'borderRadius'),
        token(9, 16, 'boxShadow'),
        token(10, 12, 'color'),
        token(11, 15, 'fontSize'),
        token(12, 17, 'fontWeight'),
        token(13, 17, 'lineHeight'),
        token(14, 14, 'padding'),
        token(15, 25, 'transitionDuration'),
        token(16, 31, 'transitionTimingFunction'),
        token(17, 13, 'zIndex'),
      ],
    );
    assert.equal(report.status, 'violations');
  });

  test('follows aliases, spreads, computed keys, nested conditions and token calculations', () => {
    assert.deepEqual(located(run({ [SEPARATOR]: fixture('tokens/hidden.tsx') })), [
      // A pixel offset hidden in a token calculation, reported in the local constant that holds it.
      token(8, 46, 'insetBlockStart'),
      // A raw value in a spread object.
      token(10, 30, 'paddingBlock'),
      // A local alias of one token value.
      token(16, 5, 'gap'),
      // A statically resolvable computed key.
      token(18, 17, 'margin'),
      // A literal under a nested condition, through a computed condition key.
      token(20, 116, 'outlineColor', { selector: ':hover @media (min-width: 40rem)' }),
    ]);
  });

  test('validates token group and key membership, palette reads and runtime variables by item', () => {
    const report = run({ [SEPARATOR]: fixture('tokens/invented.tsx') });
    assert.deepEqual(located(report), [
      token(8, 32, 'translate', { symbol: 'spin.to' }),
      token(14, 22, 'backgroundColor'),
      token(15, 18, 'borderColor'),
      token(16, 15, 'fontSize'),
      token(17, 14, 'padding'),
      token(18, 13, 'margin'),
      token(19, 25, 'transitionDuration'),
      token(20, 12, 'width'),
      token(21, 13, 'height'),
      token(22, 16, 'minHeight'),
    ]);
    const messages = report.diagnostics.map((diagnostic) => diagnostic.message);
    assert.match(messages[1] ?? '', /palette step mithril\.dark3/);
    assert.match(messages[2] ?? '', /color\['--ult-color-nope'\], which no token group declares/);
    assert.match(messages[3] ?? '', /a space token, where it takes a font size/);
    assert.match(messages[6] ?? '', /zero duration 0s/);
    assert.match(messages[7] ?? '', /--toast-height, which Base UI's Toast writes for toast, not separator/);
  });

  test('reports what it cannot resolve as incomplete analysis, never as a pass', () => {
    const report = run({ [SEPARATOR]: fixture('tokens/unresolved.tsx') });
    assert.deepEqual(
      located(report).map(({ ruleId, line, column }) => [ruleId, line, column]),
      [
        ['ULT-ANALYSIS-001', 13, 5],
        ['ULT-ANALYSIS-001', 14, 5],
        ['ULT-ANALYSIS-001', 15, 28],
        ['ULT-ANALYSIS-001', 16, 16],
      ],
    );
    assert.match(report.diagnostics[2]?.message ?? '', /fontVariationSettings is a property the value grammar does not classify/);
    assert.equal(report.status, 'incomplete');
  });

  test('accepts structural values, token calculations, glyph boxes, the clip-hidden recipe and runtime percentages', () => {
    const report = run({ [SEPARATOR]: fixture('tokens/valid.tsx') });
    assert.deepEqual(located(report), []);
  });

  test("keeps Toast's geometry valid, and rejects a design length slipped into it", () => {
    assert.deepEqual(located(run(), TOAST), []);
    const mutated = source(TOAST).replace("const slideDistance = '150%';", "const slideDistance = '24px';");
    assert.notEqual(mutated, source(TOAST));
    const found = located(run({ [TOAST]: mutated }), TOAST);
    assert.ok(found.length > 0);
    assert.ok(found.every((entry) => entry.ruleId === 'ULT-TOKEN-001' && entry.symbol === 'styles.root' && entry.target === 'transform' && entry.line === 13));
  });

  test('holds the zero-duration contracts to their exact part, condition and value', () => {
    const drawer = 'packages/ui/src/drawer.tsx';
    const slower = run({ [drawer]: source(drawer).replace("':is([data-swiping])': '0s'", "':is([data-swiping])': '0.1s'") });
    assert.deepEqual(
      slower.diagnostics.map((diagnostic) => [diagnostic.ruleId, diagnostic.file, diagnostic.exception ?? diagnostic.target]),
      [
        ['ULT-EXCEPTION-001', 'packages/analysis/exceptions.ts', 'drawer-backdrop-swiping-cancels-transition'],
        ['ULT-TOKEN-001', drawer, 'transitionDuration'],
      ],
    );

    const menu = 'packages/ui/src/navigation-menu.tsx';
    const copied = source(menu).replace("':is([data-instant])': '0s' }", "':is([data-instant])': '0s', ':hover': '0s' }");
    assert.notEqual(copied, source(menu));
    assert.deepEqual(
      located(run({ [menu]: copied })).map(({ ruleId, symbol, target, selector }) => [ruleId, symbol, target, selector]),
      [['ULT-TOKEN-001', 'styles.positioner', 'transitionDuration', ':hover']],
    );
  });

  test('checks element tables the same way', () => {
    const badge = 'packages/elements/src/ult-badge.element.ts';
    const mutated = source(badge).replace("paddingInline: space['--ult-space-4']", "paddingInline: '6px'");
    assert.notEqual(mutated, source(badge));
    const found = located(run({ [badge]: mutated }));
    assert.equal(found.length, 1);
    assert.deepEqual([found[0]?.ruleId, found[0]?.target], ['ULT-TOKEN-001', 'paddingInline']);
  });

  test('takes the relativeText constant for a font size and nowhere else', () => {
    const code = 'packages/ui/src/code.tsx';
    assert.deepEqual(located(run(), code), []);
    const padded = source(code).replace("paddingInline: space['--ult-space-2']", 'paddingInline: relativeText.code');
    assert.notEqual(padded, source(code));
    const found = located(run({ [code]: padded }), code);
    assert.deepEqual(found.map(({ ruleId, symbol, target }) => [ruleId, symbol, target]), [['ULT-TOKEN-001', 'variants.inline', 'paddingInline']]);
  });

  test('treats aliases of the StyleX import and of a token group as the same reads', () => {
    const button = 'packages/ui/src/button.tsx';
    const renamed = source(button)
      .replace("import * as stylex from '@stylexjs/stylex';", "import * as sx from '@stylexjs/stylex';\nconst stylex = sx;")
      .replace("color['--ult-color-accent']", "'#8394ff'");
    const found = located(run({ [button]: renamed }));
    assert.ok(found.length >= 1);
    assert.ok(found.every((entry) => entry.ruleId === 'ULT-TOKEN-001' && entry.file === button));
  });
});

describe('the value grammar', () => {
  test('is property-specific: 100% is structural for width and not for fontSize', () => {
    assert.deepEqual(check('width', '100%'), []);
    assert.deepEqual(check('fontSize', '100%'), ['fontSize uses the percentage 100% where it takes a font size']);
    assert.deepEqual(check('opacity', '0.5'), []);
    assert.deepEqual(check('opacity', '2'), ['opacity uses the number 2 where it takes an opacity']);
    assert.deepEqual(check('zIndex', '1'), []);
    assert.deepEqual(check('zIndex', '2'), ['zIndex uses the number 2 where it takes a stacking level']);
  });

  test('allows SVG glyph geometry only in a glyph box, and the 1px box only in the clip-hidden recipe', () => {
    assert.equal(check('width', '1em').length, 1);
    assert.deepEqual(check('width', '1em', { glyph: true }), []);
    assert.equal(check('padding', '1em', { glyph: true }).length, 1);
    assert.equal(check('height', '1px').length, 1);
    assert.deepEqual(check('height', '1px', { clipHidden: true }), []);
    assert.equal(check('padding', '1px', { clipHidden: true }).length, 1);
  });

  test('keeps zero resets apart from zero durations', () => {
    assert.deepEqual(check('margin', '0'), []);
    assert.deepEqual(check('margin', '0px'), []);
    assert.deepEqual(check('transitionDelay', '0s'), []);
    assert.equal(check('transitionDuration', '0s').length, 1);
    assert.equal(check('animationDuration', '0ms').length, 1);
  });

  test('accepts unitless factors in a dimensioned calculation, and not a length', () => {
    assert.deepEqual(check('padding', 'calc(2 * 50%)'), []);
    assert.equal(check('padding', 'calc(50% + 2px)').length, 1);
    assert.deepEqual(check('transform', 'translateY(-50%) rotate(45deg) scale(0.95)'), []);
    assert.equal(check('transform', 'translateY(4px)').length, 1);
    assert.equal(check('transform', 'rotate(4px)').length, 1);
  });

  test('rejects literal colors in every spelling', () => {
    for (const value of ['#fff', 'red', 'rgb(0 0 0)', 'hsl(0 0% 0%)', 'color-mix(in srgb, red, blue)']) {
      assert.equal(check('color', value).length, 1, value);
    }
    assert.deepEqual(check('color', 'currentColor'), []);
    assert.deepEqual(check('backgroundColor', 'transparent'), []);
  });

  test('classifies every property it names, and documents every category', () => {
    const infrastructure = source('docs/spec/agent-infrastructure.md');
    const section = infrastructure.slice(infrastructure.indexOf('### Value grammar'), infrastructure.indexOf('### Target and API distinctions'));
    for (const id of Object.keys(CATEGORIES)) assert.ok(section.includes(`\`${id}\``), `category ${id} is documented`);
    for (const [property, id] of classifiedProperties()) assert.ok(id in CATEGORIES, property);
  });

  test('places every runtime variable on declared items and categories, with an authority', () => {
    for (const variable of RUNTIME_VARIABLES) {
      assert.ok(variable.items.length > 0 && variable.categories.length > 0, variable.name);
      assert.match(variable.authority, /^docs\/(spec|adr)\/[a-z0-9-]+\.md#[a-z0-9-]+$/, variable.name);
      for (const category of variable.categories) assert.ok(category in CATEGORIES, `${variable.name} ${category}`);
    }
  });
});
