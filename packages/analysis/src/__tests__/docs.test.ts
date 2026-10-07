// ULT-DOCS-001, ULT-DOCS-002 and ULT-DOCS-REVIEW-001 over the real repository, with fixtures mounted
// over docs paths, and the comparison against the text scanner they replace.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { Report } from '../diagnostic.ts';
import { EXCEPTIONS, classify } from '../workspace.ts';
import { STATED_EXCEPTIONS, findForbiddenDeclarations } from './legacy-surfaces.ts';
import { fixture, located, repository, run, source } from './support.ts';

const CHROME = 'apps/docs/src/fixture-chrome.tsx';
const PAGE = 'apps/docs/src/content/fixture-page.mdx';
const NO_EXCEPTIONS = "import type { ArchitectureException } from './src/exceptions.ts';\n\nexport default [] satisfies ArchitectureException[];\n";

const docs = (ruleId: string, report: Report, file = CHROME) =>
  located(report, file)
    .filter((diagnostic) => diagnostic.ruleId === ruleId)
    .map(({ line, column, symbol, target }) => [line, column, symbol, target]);

describe('ULT-DOCS-001', () => {
  test('rejects painting declarations through every spelling the syntax resolves', () => {
    const report = run({ [CHROME]: fixture('docs/surfaces-invalid.tsx') });
    assert.deepEqual(docs('ULT-DOCS-001', report), [
      // Each finding sits on the value. The spread's own declaration is reported where it is written,
      // under the style that spreads it.
      [7, 27, 'direct.panel', 'boxShadow'],
      [11, 22, 'direct.panel', 'backgroundColor'],
      [12, 21, 'direct.panel', 'borderRadius'],
      // `[FILL]`, a computed key resolved through its const.
      [13, 13, 'direct.panel', 'backgroundColor'],
      [15, 16, 'direct.panel', 'borderTop'],
      [16, 22, 'direct.panel', 'backgroundImage'],
      [17, 30, 'direct.panel', 'borderColor'],
      // Only the painting branch of a condition object, through a renamed `create` import.
      [23, 67, 'renamed.toned', 'borderInlineStartWidth'],
      [24, 45, 'renamed.dynamic', 'background'],
      [25, 29, 'renamed.hidden', 'scrollbarWidth'],
      [26, 29, 'renamed.tinted', 'scrollbarColor'],
      [27, 47, 'renamed.webkit', '::-webkit-scrollbar'],
      [31, 28, 'pulse.from', 'backgroundColor'],
    ]);
    assert.equal(report.status, 'violations');
  });

  test('passes layout, native scrolling, resets and painting names that are not declarations', () => {
    const report = run({ [CHROME]: fixture('docs/surfaces-valid.tsx') });
    assert.deepEqual(located(report, CHROME), []);
    assert.equal(report.status, 'clean');
  });

  test("follows a condition key into another module's defineConsts, and only there", () => {
    const text = [
      "import * as stylex from '@stylexjs/stylex';",
      "import { color } from '@ultima/tokens/tokens.stylex';",
      "import { breakpoints } from './breakpoints.stylex';",
      "import { layoutStyles } from './layout';",
      'export const styles = stylex.create({',
      "  bar: { backgroundColor: { default: 'transparent', [breakpoints.WIDE]: color['--ult-color-surface'] } },",
      "  other: { backgroundColor: { default: 'transparent', [layoutStyles.gutter]: color['--ult-color-surface'] } },",
      '});',
    ].join('\n');
    const report = run({ [CHROME]: text });
    const found = report.diagnostics.filter((diagnostic) => diagnostic.file === CHROME);
    assert.deepEqual(
      found.map((diagnostic) => [diagnostic.ruleId, diagnostic.start.line, diagnostic.symbol, diagnostic.selector]),
      [
        ['ULT-DOCS-001', 6, 'styles.bar', '@media (min-width: 48rem)'],
        // layoutStyles is a create table, not a defineConsts group: its key stays unestablished.
        ['ULT-ANALYSIS-001', 7, 'styles', undefined],
      ],
    );
  });

  test('an unresolved spread or computed key is incomplete, not a pass', () => {
    const report = run({ [CHROME]: fixture('docs/surfaces-unresolved.tsx') });
    assert.deepEqual(docs('ULT-ANALYSIS-001', report), [
      [10, 13, 'styles', 'stylex'],
      [11, 15, 'styles', 'stylex'],
    ]);
    assert.equal(report.status, 'incomplete');
  });

  test('reports the painting branch with its condition and expression', () => {
    const report = run({ [CHROME]: fixture('docs/surfaces-invalid.tsx') });
    const toned = report.diagnostics.find((diagnostic) => diagnostic.symbol === 'renamed.toned');
    assert.equal(toned?.selector, ':focus-within');
    assert.equal(toned?.expression, 'border.hairline');
    assert.equal(toned?.link, 'docs/spec/ultima.md#the-line-between-a-component-and-page-layout');
  });

  test('a demo keeps its own paint, and a test is a structural scope', () => {
    const report = run({
      'apps/docs/src/demos/button/paint.tsx': fixture('docs/surfaces-invalid.tsx'),
      'apps/docs/src/__tests__/paint.test.tsx': fixture('docs/surfaces-invalid.tsx'),
    });
    assert.deepEqual(located(report), []);
  });

  test('an excepted declaration with a changed value is a new site, and its entry goes stale', () => {
    const swatch = 'apps/docs/src/swatch.tsx';
    const text = source(swatch).replace("borderRadius: radius['--ult-radius-xs']", "borderRadius: radius['--ult-radius-md']");
    const report = run({ [swatch]: text });
    assert.deepEqual(docs('ULT-DOCS-001', report, swatch), [[9, 19, 'styles.chip', 'borderRadius']]);
    const stale = report.diagnostics.filter((diagnostic) => diagnostic.ruleId === 'ULT-EXCEPTION-001');
    assert.deepEqual(stale.map((diagnostic) => [diagnostic.exception, diagnostic.message]), [
      ['swatch-chip-border-radius', 'Exception "swatch-chip-border-radius" matches no site: it is stale.'],
    ]);
  });

  test('a new painting declaration in an excepted file is not covered by the file', () => {
    const header = 'apps/docs/src/header.tsx';
    const text = source(header).replace("    position: 'sticky',", "    position: 'sticky',\n    boxShadow: shadow['--ult-shadow-md'],");
    const report = run({ [header]: text });
    assert.deepEqual(docs('ULT-DOCS-001', report, header), [[text.slice(0, text.indexOf('    boxShadow:')).split('\n').length, 16, 'styles.chrome', 'boxShadow']]);
  });
});

describe('ULT-DOCS-002', () => {
  test('rejects native controls and widget roles in docs chrome', () => {
    const report = run({ [CHROME]: fixture('docs/controls-invalid.tsx') });
    assert.deepEqual(docs('ULT-DOCS-002', report), [
      [9, 8, 'Chrome', '<button>'],
      [10, 8, 'Chrome', '<input>'],
      [11, 8, 'Chrome', '<select>'],
      [12, 10, 'Chrome', '<option>'],
      [14, 8, 'Chrome', '<textarea>'],
      [16, 10, 'Chrome', '<summary>'],
      [18, 12, 'Chrome', 'role="button"'],
      [19, 13, 'Chrome', 'role="switch"'],
      // A prop named render on a docs component is not composition: TextLink is not an Ultima component.
      [20, 35, 'Chrome', '<button>'],
      [21, 22, 'Chrome', '<button>'],
    ]);
    assert.deepEqual(docs('ULT-ANALYSIS-001', report), [[22, 12, 'Chrome', 'role']]);
    assert.match(
      report.diagnostics.find((diagnostic) => diagnostic.start.line === 20)?.message ?? '',
      /TextLink does not resolve to an Ultima component/,
    );
  });

  test('passes semantic markup and render composition resolved to an Ultima component', () => {
    const report = run({ [CHROME]: fixture('docs/controls-valid.tsx') });
    assert.deepEqual(located(report, CHROME), []);
  });

  test('checks the JSX an MDX page executes, located in the page, and not the source it prints', () => {
    const report = run({ [PAGE]: fixture('docs/page.mdx') });
    assert.deepEqual(docs('ULT-DOCS-002', report, PAGE), [
      [5, 2, undefined, '<button>'],
      [7, 6, undefined, 'role="tab"'],
    ]);
    assert.deepEqual(docs('ULT-DOCS-REVIEW-001', report, PAGE), [[11, 2, undefined, '<section>']]);
  });

  test('demos keep native markup to show composition', () => {
    const report = run({ 'apps/docs/src/demos/button/controls.tsx': fixture('docs/controls-invalid.tsx').replace('./text-link', '../../text-link') });
    assert.deepEqual(located(report), []);
  });
});

describe('ULT-DOCS-REVIEW-001', () => {
  test('asks about a handler-driven plain element and never fails the run', () => {
    const report = run({ [CHROME]: fixture('docs/controls-review.tsx') });
    assert.deepEqual(docs('ULT-DOCS-REVIEW-001', report), [
      [5, 8, 'Ambiguous', '<li>'],
      [6, 8, 'Ambiguous', '<li>'],
    ]);
    assert.ok(report.diagnostics.every((diagnostic) => diagnostic.severity === 'advisory'));
    assert.equal(report.status, 'clean');
    assert.match(report.diagnostics[0]?.message ?? '', /cannot establish whether it is a hand-built widget/);
  });
});

describe('the docs rules over the repository', () => {
  test('run clean, with every recorded declaration matched exactly', () => {
    const report = run();
    assert.equal(report.status, 'clean');
    assert.deepEqual(report.diagnostics, []);
    const raw = run({ [EXCEPTIONS]: NO_EXCEPTIONS });
    const count = (ruleId: string) => raw.diagnostics.filter((diagnostic) => diagnostic.ruleId === ruleId).length;
    assert.equal(count('ULT-DOCS-001'), 28);
    assert.equal(count('ULT-DOCS-002'), 1);
    assert.equal(count('ULT-DOCS-REVIEW-001'), 0);
    assert.equal(count('ULT-ANALYSIS-001'), 0);
  });

  test('every file the old allowlist exempted is resolved declaration by declaration', () => {
    const raw = run({ [EXCEPTIONS]: NO_EXCEPTIONS });
    for (const path of STATED_EXCEPTIONS) {
      const file = `apps/docs/${path}`;
      const found = raw.diagnostics.filter((diagnostic) => diagnostic.file === file && diagnostic.ruleId === 'ULT-DOCS-001');
      assert.ok(found.length > 0, `${file} has no painting declaration left; drop it from the record`);
      assert.ok(found.every((diagnostic) => diagnostic.symbol && diagnostic.expression), file);
    }
  });
});

describe('the old scanner against ULT-DOCS-001', () => {
  /** The old scanner's scope: every .ts/.tsx under apps/docs/src outside demos/. */
  const oldScope = () => {
    const paths: string[] = [];
    const walk = (directory: string) => {
      for (const entry of repository.list(directory) ?? []) {
        const path = `${directory}/${entry.name}`;
        if (entry.directory) {
          if (path !== 'apps/docs/src/demos') walk(path);
        } else if (/\.tsx?$/.test(entry.name)) paths.push(path);
      }
    };
    walk('apps/docs/src');
    return paths.sort();
  };

  const counted = (items: string[]) => {
    const map = new Map<string, number>();
    for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
    return map;
  };
  const minus = (a: Map<string, number>, b: Map<string, number>) =>
    [...a].flatMap(([key, n]) => Array.from({ length: Math.max(0, n - (b.get(key) ?? 0)) }, () => key)).sort();

  test('on the repository, differs only by named resets and named extra coverage', () => {
    const raw = run({ [EXCEPTIONS]: NO_EXCEPTIONS });
    const oldFound: string[] = [];
    for (const path of oldScope()) {
      for (const property of findForbiddenDeclarations(source(path))) oldFound.push(`${path} ${property}`);
    }
    // The old scanner counts a declaration once; the new rule reports each painting condition branch.
    const sites = new Set(
      raw.diagnostics.filter((diagnostic) => diagnostic.ruleId === 'ULT-DOCS-001').map((diagnostic) => `${diagnostic.file} ${diagnostic.symbol} ${diagnostic.target}`),
    );
    const newFound = [...sites].map((site) => site.replace(/ \S+ /, ' '));

    // Resets remove a property rather than paint with it (`0`, `none`, `transparent`, `null`).
    assert.deepEqual(minus(counted(oldFound), counted(newFound)), [
      'apps/docs/src/catalogue-preview.tsx borderRadius',
      'apps/docs/src/catalogue-preview.tsx borderWidth',
      'apps/docs/src/demo.tsx backgroundColor',
      'apps/docs/src/demo.tsx backgroundColor',
      'apps/docs/src/demo.tsx borderRadius',
      'apps/docs/src/demo.tsx borderRadius',
      'apps/docs/src/demo.tsx borderWidth',
      'apps/docs/src/docs-style.ts borderRadius',
      'apps/docs/src/landing-scales.tsx borderBottomWidth',
      'apps/docs/src/landing-scales.tsx borderInlineWidth',
      'apps/docs/src/landing-scales.tsx borderRadius',
      'apps/docs/src/landing-scales.tsx borderRadius',
      'apps/docs/src/routes/components.tsx backgroundColor',
      'apps/docs/src/routes/components.tsx backgroundColor',
      'apps/docs/src/routes/components.tsx borderRadius',
      'apps/docs/src/routes/components.tsx borderRadius',
      'apps/docs/src/routes/components.tsx borderWidth',
      'apps/docs/src/routes/components.tsx borderWidth',
      'apps/docs/src/routes/home.tsx borderInlineWidth',
      'apps/docs/src/routes/home.tsx borderRadius',
      'apps/docs/src/routes/home.tsx borderRadius',
      'apps/docs/src/site-search.tsx borderRadius',
      'apps/docs/src/site-search.tsx borderRadius',
      'apps/docs/src/site-search.tsx borderRadius',
      'apps/docs/src/site-search.tsx borderRadius',
      'apps/docs/src/site-search.tsx borderRadius',
      'apps/docs/src/site-search.tsx borderWidth',
      'apps/docs/src/theme-studio-preview.tsx backgroundColor',
    ]);
    assert.deepEqual(minus(counted(newFound), counted(oldFound)), []);
  });

  test('on the repository, the old scope outside docs chrome held nothing to lose', () => {
    // The old glob also read tests, generated wiring and declarations. Tests are a structural scope now;
    // the rest never declared a style.
    const outside = oldScope().filter((path) => classify(path) !== 'docs');
    assert.deepEqual([...new Set(outside.map((path) => classify(path)))].sort(), ['declarations', 'generated', 'test']);
    for (const path of outside.filter((path) => classify(path) !== 'test')) assert.deepEqual(findForbiddenDeclarations(source(path)), [], path);
  });

  // The retired test's own cases, each run through both checks.
  const CASES: [string, string][] = [
    [
      'the four painting properties',
      `const styles = stylex.create({
        panel: {
          backgroundColor: color['--ult-color-surface-raised'],
          borderRadius: radius['--ult-radius-lg'],
          borderTopWidth: border.hairline,
          borderInlineStartColor: color['--ult-color-border'],
          boxShadow: shadow['--ult-shadow-md'],
          borderStyle: 'solid',
          padding: space['--ult-space-6'],
        },
      });`,
    ],
    [
      'a table below a JSX closing tag',
      `const a = stylex.create({ one: { backgroundColor: 'red' } });
      function C() { return (<div className="x"><svg viewBox="0 0 1 1" /></div>); }
      const b = stylex.create({ two: { borderRadius: 'r', borderColor: 'c' } });`,
    ],
    ['a hidden native scrollbar', `stylex.create({ column: { scrollbarWidth: 'none' } });`],
    ['a quoted key and a shorthand', `stylex.create({ card: { 'backgroundColor': 'red', border: '1px solid red' } });`],
    [
      'names that are not live declarations',
      [
        "const example = `stylex.create({ card: { backgroundColor: 'red' } })`;",
        "const css = ':root { background-color: red; border-radius: 4px }';",
        '// borderRadius: radius.lg,',
        '/* boxShadow: shadow.md, */',
        'const styles = stylex.create({',
        "  row: { transitionProperty: 'background-color, border-color', outline: '1px solid red' },",
        '});',
      ].join('\n'),
    ],
  ];

  for (const [name, body] of CASES) {
    test(`agrees on the retired case: ${name}`, () => {
      const text = `import * as stylex from '@stylexjs/stylex';\nimport { border, color, radius, shadow, space } from '@ultima/tokens/tokens.stylex';\n${body}\n`;
      const report = run({ [CHROME]: text });
      const found = report.diagnostics.filter((diagnostic) => diagnostic.file === CHROME && diagnostic.ruleId === 'ULT-DOCS-001');
      assert.deepEqual(found.map((diagnostic) => diagnostic.target), findForbiddenDeclarations(text));
      assert.equal(report.diagnostics.filter((diagnostic) => diagnostic.file === CHROME).length, found.length);
    });
  }

  test('on the invalid fixture, the old scanner sees none of the spellings the syntax resolves', () => {
    // It reads the literal text `stylex.create(`, so a renamed namespace, an aliased import, keyframes,
    // spreads, computed keys, border shorthands and the scrollbar pseudo-element all pass it.
    assert.deepEqual(findForbiddenDeclarations(fixture('docs/surfaces-invalid.tsx')), []);
  });

  test('on the valid fixture, the old scanner flags only the resets and the restored scrollbar', () => {
    assert.deepEqual(findForbiddenDeclarations(fixture('docs/surfaces-valid.tsx')), [
      'borderRadius',
      'borderWidth',
      'backgroundColor',
      'boxShadow',
      'backgroundColor',
      'scrollbarWidth',
    ]);
  });
});
