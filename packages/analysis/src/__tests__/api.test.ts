// ULT-API-001 and ULT-API-002 over the real repository with one component mutated at a time, the part
// inventory by category, and real TypeScript compiles of consumer programs against the public API.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import ts from 'typescript';

import { checkApi } from '../rules/api.ts';
import { createContext } from '../rules/context.ts';
import { workspaceScope } from '../workspace.ts';
import { fixture, located, overlay, repository, run, source } from './support.ts';

const BUTTON = 'packages/ui/src/button.tsx';
const CARD = 'packages/ui/src/card.tsx';
const SEPARATOR = 'packages/ui/src/separator.tsx';
const ASPECT = 'packages/ui/src/aspect-ratio.tsx';

/** The real file with each `[from, to]` replaced once; a replacement that matches nothing fails the test. */
function mutate(path: string, ...edits: [string, string][]): Record<string, string> {
  let text = source(path);
  for (const [from, to] of edits) {
    assert.ok(text.includes(from), `${path} contains ${from}`);
    text = text.replace(from, to);
  }
  return { [path]: text };
}

const BUTTON_PROPS = 'type ButtonProps = PartProps<ComponentProps<typeof BaseButton>> & {';
const BUTTON_RENDER = '<BaseButton {...props} {...stylex.props(styles.root, variants[variant][tone], sizes[size], style)} />';

function only(report: ReturnType<typeof run>, ruleId: string) {
  return located(report).filter((entry) => entry.ruleId === ruleId);
}

describe('ULT-API-001', () => {
  test('rejects public className and a native style on a styled wrapper', () => {
    const report = run(mutate(BUTTON, [BUTTON_PROPS, 'type ButtonProps = ComponentProps<typeof BaseButton> & {']));
    assert.deepEqual(only(report, 'ULT-API-001'), [
      { ruleId: 'ULT-API-001', file: BUTTON, line: 116, column: 17, symbol: 'Button', target: 'className' },
      { ruleId: 'ULT-API-001', file: BUTTON, line: 116, column: 17, symbol: 'Button', target: 'style' },
    ]);
    assert.match(report.diagnostics.find((diagnostic) => diagnostic.target === 'style')?.message ?? '', /not the StyleX slot/);
  });

  test('rejects an index signature and any props, which defeat every other check', () => {
    assert.deepEqual(only(run(mutate(BUTTON, [BUTTON_PROPS, 'type ButtonProps = PartProps<ComponentProps<typeof BaseButton>> & { [prop: string]: unknown;'])), 'ULT-API-001'), [
      { ruleId: 'ULT-API-001', file: BUTTON, line: 116, column: 17, symbol: 'Button', target: 'props' },
    ]);
    assert.deepEqual(only(run(mutate(BUTTON, ['sizes[size], style)} />;\n}', 'sizes[size], style)} />;\n}\n'], ['style, ...props }: ButtonProps)', 'style, ...props }: any)'])), 'ULT-API-001'), [
      { ruleId: 'ULT-API-001', file: BUTTON, line: 116, column: 17, symbol: 'Button', target: 'props' },
    ]);
  });

  test('rejects a style prop that is missing, or widened to admit native CSSProperties', () => {
    const missing = run(mutate(BUTTON, [BUTTON_PROPS, "type ButtonProps = Omit<PartProps<ComponentProps<typeof BaseButton>>, 'style'> & {"]));
    assert.ok(only(missing, 'ULT-API-001').some((entry) => entry.target === 'style'));
    const widened = run(
      mutate(BUTTON, [BUTTON_PROPS, "type ButtonProps = Omit<PartProps<ComponentProps<typeof BaseButton>>, 'style'> & { style?: StyleProp | import('react').CSSProperties;"], [
        "import type { PartProps } from '@ultima/ui/lib/component';",
        "import type { PartProps, StyleProp } from '@ultima/ui/lib/component';",
      ]),
    );
    assert.deepEqual(only(widened, 'ULT-API-001'), [{ ruleId: 'ULT-API-001', file: BUTTON, line: 116, column: 17, symbol: 'Button', target: 'style' }]);
  });

  test('checks render and ref by part category', () => {
    // A plain slot that promises render but renders a fixed <div>.
    const slot = run(mutate(CARD, ['type CardHeaderProps = PlainProps<\'div\'>;', "type CardHeaderProps = PartProps<useRender.ComponentProps<'div'>>;"]));
    assert.deepEqual(only(slot, 'ULT-API-001').map((entry) => [entry.symbol, entry.target]), [['Card.Header', 'render']]);
    // A plain root through useRender whose props lost render.
    const root = run(mutate(CARD, ["type CardRootProps = PartProps<useRender.ComponentProps<'div'>>;", "type CardRootProps = Omit<PartProps<useRender.ComponentProps<'div'>>, 'render'>;"]));
    assert.deepEqual(only(root, 'ULT-API-001').map((entry) => [entry.symbol, entry.target]), [['Card.Root', 'render']]);
    // A styled wrapper that dropped the Base UI part's render and ref.
    const wrapper = run(mutate(BUTTON, [BUTTON_PROPS, "type ButtonProps = Omit<PartProps<ComponentProps<typeof BaseButton>>, 'render' | 'ref'> & {"]));
    assert.deepEqual(only(wrapper, 'ULT-API-001').map((entry) => entry.target).sort(), ['ref', 'render']);
  });

  test('rejects a public hook or function typed any', () => {
    const report = run(mutate(SEPARATOR, ['export { Separator,', 'function useSeparator(): any {\n  return null;\n}\n\nexport { useSeparator, Separator,']));
    assert.deepEqual(only(report, 'ULT-API-001'), [{ ruleId: 'ULT-API-001', file: SEPARATOR, line: 50, column: 10, symbol: 'useSeparator', target: 'return' }]);
  });

  test('reports a namespace member it cannot resolve as incomplete, never as a pass', () => {
    const report = run({ [SEPARATOR]: fixture('api/unresolved-namespace.tsx') });
    assert.deepEqual(located(report), [{ ruleId: 'ULT-ANALYSIS-001', file: SEPARATOR, line: 18, column: 27, symbol: 'Separator', target: 'export' }]);
    assert.equal(report.status, 'incomplete');
  });
});

describe('ULT-API-002', () => {
  test("rejects the caller's slot moved before the part's defaults", () => {
    const report = run(mutate(BUTTON, [BUTTON_RENDER, '<BaseButton {...props} {...stylex.props(style, styles.root, variants[variant][tone], sizes[size])} />']));
    assert.deepEqual(located(report), [{ ruleId: 'ULT-API-002', file: BUTTON, line: 117, column: 50, symbol: 'Button', target: 'style' }]);
  });

  test('rejects a later spread or class assignment that discards the merged result', () => {
    const spread = run(mutate(BUTTON, [BUTTON_RENDER, '<BaseButton {...stylex.props(styles.root, variants[variant][tone], sizes[size], style)} {...props} />']));
    assert.deepEqual(located(spread), [{ ruleId: 'ULT-API-002', file: BUTTON, line: 117, column: 98, symbol: 'Button', target: 'style' }]);
    const className = run(mutate(BUTTON, [BUTTON_RENDER, `${BUTTON_RENDER.slice(0, -3)} className="later" />`]));
    assert.deepEqual(located(className), [{ ruleId: 'ULT-API-002', file: BUTTON, line: 117, column: 109, symbol: 'Button', target: 'style' }]);
    const inProps = run(mutate(CARD, ['props: { ...props, ...stylex.props(styles.root, style) }', 'props: { ...stylex.props(styles.root, style), ...props }']));
    assert.deepEqual(only(inProps, 'ULT-API-002').map((entry) => entry.symbol), ['Root']);
  });

  test('rejects a slot destructured and dropped, or never destructured at all', () => {
    const dropped = run(mutate(BUTTON, [BUTTON_RENDER, '<BaseButton {...props} {...stylex.props(styles.root, variants[variant][tone], sizes[size])} />']));
    assert.deepEqual(located(dropped), [{ ruleId: 'ULT-API-002', file: BUTTON, line: 116, column: 68, symbol: 'Button', target: 'style' }]);
    const whole = run({ [SEPARATOR]: fixture('api/undestructured.tsx') });
    assert.deepEqual(located(whole), [{ ruleId: 'ULT-API-002', file: SEPARATOR, line: 16, column: 20, symbol: 'Separator', target: 'style' }]);
  });

  test('preserves the documented runtime-style merge, and rejects a later style that drops StyleX', () => {
    assert.deepEqual(located(run(), ASPECT), []);
    const report = run(mutate(ASPECT, ['style: { ...injected, aspectRatio: ratio }', 'style: { aspectRatio: ratio }']));
    assert.deepEqual(only(report, 'ULT-API-002').map((entry) => [entry.line, entry.symbol]), [[25, 'AspectRatio']]);
  });

  test('preserves primitive prop-getter merges in any argument order', () => {
    // Resizable.Panel merges Zag's getter, then the slot, then the caller's remaining props.
    assert.match(source('packages/ui/src/resizable.tsx'), /mergeProps\(api\.getPanelProps\(\{ id \}\), stylex\.props\(style\), props\)/);
    assert.deepEqual(located(run(), 'packages/ui/src/resizable.tsx'), []);
  });

  test('reports a slot in a form it cannot follow as incomplete', () => {
    const report = run(mutate(SEPARATOR, ['styles[orientation], style)', 'styles[orientation], orientation ? style : null)']));
    assert.deepEqual(located(report), [{ ruleId: 'ULT-ANALYSIS-001', file: SEPARATOR, line: 43, column: 127, symbol: 'Separator', target: 'style' }]);
  });
});

describe('the public part inventory', () => {
  const scope = workspaceScope(repository);
  const context = createContext(scope);
  const components = scope.inventory.filter((entry) => entry.kind === 'react-component').map((entry) => entry.path);
  const inventory = checkApi(context, components);
  const category = (name: string) => inventory.find((entry) => entry.name === name)?.category;

  test('covers every component file and classifies every public export', () => {
    // The one raw site is ThemeModeScript's nonvisual <script>, excepted as theme-mode-script-no-style-slot.
    assert.deepEqual(context.diagnostics.map((diagnostic) => [diagnostic.ruleId, diagnostic.file, diagnostic.symbol]), [['ULT-API-001', 'packages/ui/src/theme-mode.tsx', 'ThemeModeScript']]);
    assert.deepEqual([...new Set(inventory.map((entry) => entry.file))].sort(), [...components].sort());
    assert.ok(inventory.every((entry) => !['unresolved', 'undetermined'].includes(entry.category)));
  });

  test('tells styled wrappers, plain roots and slots, Zag parts, hooks and pass-throughs apart', () => {
    assert.equal(category('Button'), 'styled-wrapper');
    assert.equal(category('Dialog.Popup'), 'styled-wrapper');
    assert.equal(category('Card.Root'), 'plain-root');
    assert.equal(category('Card.Header'), 'plain-slot');
    assert.equal(category('Calendar.Label'), 'zag-part');
    assert.equal(category('Resizable.Panel'), 'zag-part');
    assert.equal(category('useSidebar'), 'hook-or-function');
    assert.equal(category('Pagination.getPages'), 'hook-or-function');
    // An unchanged primitive keeps the primitive's contract, className included.
    assert.equal(category('Dialog.Close'), 'pass-through');
    assert.equal(category('ColorField.Portal'), 'composed');
    const counts = new Map<string, number>();
    for (const entry of inventory) counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    for (const kind of ['styled-wrapper', 'plain-root', 'plain-slot', 'zag-part', 'pass-through', 'hook-or-function']) assert.ok((counts.get(kind) ?? 0) > 0, kind);
  });
});

describe('consumer programs against the public API', () => {
  const PROGRAM = 'apps/docs/src/consumer-program.tsx';
  const compile = (name: string) => {
    const text = fixture(`consumer/${name}.tsx`);
    const scope = workspaceScope(overlay(repository, { [PROGRAM]: text }));
    const program = (scope.types as NonNullable<typeof scope.types>).program([PROGRAM]);
    return {
      text,
      diagnostics: program.diagnostics(PROGRAM).map((diagnostic) => ({
        code: `TS${diagnostic.code}`,
        line: ts.getLineAndCharacterOfPosition(diagnostic.file as ts.SourceFile, diagnostic.start as number).line + 1,
      })),
    };
  };

  test('a valid consumer compiles with no diagnostic', () => {
    assert.deepEqual(compile('valid').diagnostics, []);
  });

  test('each escape in an invalid consumer receives its TypeScript diagnostic, and nothing else does', () => {
    const { text, diagnostics } = compile('invalid');
    const expected = text
      .split('\n')
      .flatMap((line, index) => {
        const match = /expect (TS\d+)/.exec(line);
        return match ? [{ code: match[1] as string, line: index + 2 }] : [];
      });
    assert.equal(expected.length, 6);
    assert.deepEqual(diagnostics, expected);
  });
});
