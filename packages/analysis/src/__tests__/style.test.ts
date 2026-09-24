// ULT-STYLE-001 over the real repository with one file mutated or replaced at a time.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { fixture, located, run, source } from './support.ts';

const SEPARATOR = 'packages/ui/src/separator.tsx';
const BADGE = 'packages/elements/src/ult-badge.element.ts';
const PAGE = 'apps/docs/src/content/components/separator.mdx';
const style = (file: string, line: number, column: number, target: string, symbol?: string) => ({
  ruleId: 'ULT-STYLE-001',
  file,
  line,
  column,
  ...(symbol !== undefined && { symbol }),
  target,
});

describe('ULT-STYLE-001', () => {
  test('rejects alternative styling engines and authored stylesheet imports', () => {
    const report = run({ [SEPARATOR]: fixture('style/engines.tsx') });
    assert.deepEqual(
      located(report).filter((entry) => entry.ruleId === 'ULT-STYLE-001'),
      [
        style(SEPARATOR, 3, 20, 'styled-components'),
        style(SEPARATOR, 4, 21, '@emotion/react'),
        style(SEPARATOR, 5, 18, 'clsx'),
        style(SEPARATOR, 6, 8, './separator.css'),
      ],
    );
  });

  test('keeps the docs global stylesheet to its entry modules', () => {
    assert.deepEqual(located(run(), 'apps/docs/src/main.tsx'), []);
    const prose = 'apps/docs/src/prose.tsx';
    const report = run({ [prose]: `import './styles.css';\n${source(prose)}` });
    assert.deepEqual(located(report), [style(prose, 1, 8, './styles.css')]);
    assert.match(report.diagnostics[0]?.message ?? '', /the documented global stylesheet/);
  });

  test('rejects a stylesheet injected at run time', () => {
    assert.deepEqual(located(run({ [SEPARATOR]: fixture('style/injection.tsx') })), [
      style(SEPARATOR, 4, 17, "document.createElement('style')", 'Separator'),
      style(SEPARATOR, 6, 3, 'adoptedStyleSheets', 'Separator'),
      style(SEPARATOR, 6, 34, 'new CSSStyleSheet()', 'Separator'),
      style(SEPARATOR, 9, 7, '<style>', 'Separator'),
      style(SEPARATOR, 10, 7, '<link>', 'Separator'),
    ]);
  });

  test('accepts a primitive merge and a runtime value, and rejects inline design styles', () => {
    assert.deepEqual(located(run({ [SEPARATOR]: fixture('style/inline.tsx') })), [
      style(SEPARATOR, 14, 29, 'padding', 'Separator'),
      style(SEPARATOR, 15, 29, 'padding', 'Separator'),
      style(SEPARATOR, 16, 18, 'style', 'Separator'),
    ]);
  });

  test("checks an element's style writes, and accepts structural and measured ones", () => {
    assert.deepEqual(located(run({ [BADGE]: fixture('style/element.ts') })), [
      style(BADGE, 19, 24, 'color', 'UltBadge'),
      style(BADGE, 20, 37, '--gap', 'UltBadge'),
      style(BADGE, 21, 26, 'padding', 'UltBadge'),
    ]);
  });

  test("keeps the tabs element's primitive bridge to Zag's variables", () => {
    const tabs = 'packages/elements/src/ult-tabs.element.ts';
    assert.deepEqual(located(run(), tabs), []);
    const mutated = source(tabs).replace("style.setProperty('--active-tab-left', 'var(--left)');", "style.setProperty('--active-tab-left', '4px');");
    assert.notEqual(mutated, source(tabs));
    const found = located(run({ [tabs]: mutated }));
    assert.deepEqual(
      found.map(({ ruleId, target }) => [ruleId, target]),
      [['ULT-STYLE-001', '--active-tab-left']],
    );
  });

  test('checks executable MDX, and leaves printed examples alone', () => {
    assert.deepEqual(located(run({ [PAGE]: fixture('style/page.mdx') })), [style(PAGE, 10, 22, 'color'), style(PAGE, 12, 1, '<style>')]);
  });

  test("keeps the Theme Studio preview's draft variables to their one excepted site", () => {
    const preview = 'apps/docs/src/theme-studio-preview.tsx';
    const text = source(preview);
    const report = run({ [preview]: text.replace('style={{ ...pane.style, ...previewVars(table) } as CSSProperties}', 'style={{ ...pane.style, ...previewVars(table), color: \'red\' } as CSSProperties}') });
    assert.deepEqual(
      located(report).map(({ ruleId, target }) => [ruleId, target]),
      [['ULT-STYLE-001', 'color']],
    );
  });
});
