// ULT-IMPORT-001 and ULT-PRIMITIVE-001 over the real repository with one import added at a time.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { type Expected, afterFirstLine, fixture, located, run, source } from './support.ts';

const SEPARATOR = 'packages/ui/src/separator.tsx';
const BADGE = 'packages/elements/src/ult-badge.element.ts';
const TOKENS = 'packages/tokens/src/tokens.stylex.ts';
const HELPER = 'packages/ui/src/lib/visually-hidden.ts';
const CHROME = 'apps/docs/src/prose.tsx';
const PAGE = 'apps/docs/src/content/components/separator.mdx';

/** Add one import to a real file and return what the checker reports for that file. */
function withImport(path: string, statement: string): Expected[] {
  const text = source(path);
  const changed = path.endsWith('.tsx') && /^['"]use client['"]/.test(text) ? afterFirstLine(text, statement) : `${statement}\n${text}`;
  return located(run({ [path]: changed }), path);
}

function only(path: string, statement: string, ruleId: string): Expected {
  const found = withImport(path, statement);
  assert.equal(found.length, 1, `${statement}: ${JSON.stringify(found)}`);
  assert.equal(found[0]?.ruleId, ruleId, statement);
  return found[0] as Expected;
}

describe('ULT-IMPORT-001', () => {
  test('rejects a relative sibling import at the specifier, and names the staged spelling', () => {
    assert.deepEqual(withImport(SEPARATOR, "import { Dialog } from './dialog';"), [
      { ruleId: 'ULT-IMPORT-001', file: SEPARATOR, line: 2, column: 24, symbol: 'Dialog', target: './dialog' },
    ]);
    const report = run({ [SEPARATOR]: afterFirstLine(source(SEPARATOR), "import { Dialog } from './dialog';") });
    assert.match(report.diagnostics[0]?.repair ?? '', /"@ultima\/ui\/dialog"/);
    assert.equal(report.diagnostics[0]?.link, 'docs/spec/ultima.md#one-file-per-component');
  });

  test('rejects the same boundary crossed by re-export and by a literal dynamic import', () => {
    only(SEPARATOR, "export { Dialog } from './dialog';", 'ULT-IMPORT-001');
    only(SEPARATOR, "const lazy = () => import('./dialog');", 'ULT-IMPORT-001');
  });

  test('resolves alternate spellings before classifying the target', () => {
    const tokens = only(SEPARATOR, "import { space } from '../../tokens/src/tokens.stylex';", 'ULT-IMPORT-001');
    assert.equal(tokens.target, '../../tokens/src/tokens.stylex');
    const report = run({ [SEPARATOR]: afterFirstLine(source(SEPARATOR), "import { space } from '../../tokens/src/tokens.stylex.ts';") });
    assert.match(report.diagnostics[0]?.repair ?? '', /"@ultima\/tokens\/tokens\.stylex"/);
    only(SEPARATOR, "import { useRender } from './lib/component';", 'ULT-IMPORT-001');
    only(SEPARATOR, "import { Prose } from '@ultima/ui/../../../apps/docs/src/prose';", 'ULT-IMPORT-001');
  });

  test('rejects barrels and module paths no registry item stages', () => {
    only(SEPARATOR, "import { Dialog } from '@ultima/ui';", 'ULT-IMPORT-001');
    only(SEPARATOR, "import { palette } from '@ultima/tokens';", 'ULT-IMPORT-001');
    only(SEPARATOR, "import { palette } from '@ultima/tokens/palette';", 'ULT-IMPORT-001');
  });

  test('keeps production targets off docs, tests, fixtures, tooling and generated output', () => {
    for (const statement of [
      "import { Prose } from '../../../apps/docs/src/prose';",
      "import Variants from '../../../apps/docs/src/demos/button/variants';",
      "import { render } from './__tests__/button.test';",
      "import '../../analysis/fixtures/source/marker';",
      "import { loadCatalogue } from '../../../scripts/catalogue/model.ts';",
      "import { setupItems } from '../../../registry/items.config';",
      "import type { ReactDescriptor } from '../../../registry/metadata/schema.ts';",
    ]) {
      only(SEPARATOR, statement, 'ULT-IMPORT-001');
    }
  });

  test('enforces dependency direction between the layers', () => {
    only(TOKENS, "import { Button } from '@ultima/ui/button';", 'ULT-IMPORT-001');
    only(TOKENS, "import { ultButton } from '../../elements/src/ult-button.element';", 'ULT-IMPORT-001');
    only(HELPER, "import { Button } from '@ultima/ui/button';", 'ULT-IMPORT-001');
    only(BADGE, "import { Tabs } from '../../elements/src/ult-tabs.element';", 'ULT-IMPORT-001');
  });

  test('rejects unclassified dependencies and recipe engines in production code', () => {
    const unknown = only(SEPARATOR, "import pad from 'left-pad';", 'ULT-IMPORT-001');
    assert.equal(unknown.target, 'left-pad');
    only(SEPARATOR, "import { readFileSync } from 'node:fs';", 'ULT-IMPORT-001');
    only(SEPARATOR, "import useEmbla from 'embla-carousel-react';", 'ULT-IMPORT-001');
    only(BADGE, "import { scaleLinear } from 'd3-scale';", 'ULT-IMPORT-001');
  });

  test('keeps the docs application off tooling, fixtures and tests, at the original MDX location', () => {
    only(CHROME, "import { loadCatalogue } from '../../../scripts/catalogue/model.ts';", 'ULT-IMPORT-001');
    only(CHROME, "import '../../../packages/analysis/fixtures/source/marker';", 'ULT-IMPORT-001');
    assert.deepEqual(located(run({ [PAGE]: fixture('imports/page-imports-tooling.mdx') }), PAGE), [
      { ruleId: 'ULT-IMPORT-001', file: PAGE, line: 7, column: 31, symbol: 'loadCatalogue', target: '../../../../../scripts/catalogue/model.ts' },
      { ruleId: 'ULT-IMPORT-001', file: PAGE, line: 9, column: 15, target: '../../../../../scripts/catalogue/files.ts' },
    ]);
  });

  test('lets the docs application read generated wiring, recipe engines and icon sets', () => {
    for (const statement of [
      "import { setupItems } from '../../../registry/items.config';",
      "import useEmbla from 'embla-carousel-react';",
      "import { Sun } from '@phosphor-icons/react';",
    ]) {
      assert.deepEqual(withImport(CHROME, statement), [], statement);
    }
  });

  test('reports a computed dynamic import and CommonJS as unresolved analysis', () => {
    const report = run({ [SEPARATOR]: fixture('imports/computed-imports.tsx') });
    assert.deepEqual(located(report), [
      { ruleId: 'ULT-IMPORT-001', file: SEPARATOR, line: 9, column: 25, target: './dialog' },
      { ruleId: 'ULT-ANALYSIS-001', file: SEPARATOR, line: 10, column: 26, target: 'import()' },
      { ruleId: 'ULT-ANALYSIS-001', file: SEPARATOR, line: 11, column: 18, target: 'require' },
    ]);
    assert.equal(report.status, 'violations', 'an established violation outranks the incomplete analysis');
  });

  test('reports an import that resolves to no file as unresolved analysis, making the run incomplete', () => {
    const found = only(SEPARATOR, "import { Nope } from './nope';", 'ULT-ANALYSIS-001');
    assert.equal(found.target, './nope');
    assert.equal(run({ [SEPARATOR]: afterFirstLine(source(SEPARATOR), "import { Nope } from './nope';") }).status, 'incomplete');
  });

  test('accepts declared composition, staged helpers and type-only helper imports', () => {
    assert.match(source('packages/ui/src/sidebar.tsx'), /from "@ultima\/ui\/dialog"/);
    for (const statement of [
      "import { Dialog } from '@ultima/ui/dialog';",
      "import { visuallyHidden } from '@ultima/ui/lib/visually-hidden';",
      "import type { PartProps as Part } from '@ultima/ui/lib/component';",
      "import { useState } from 'react';",
      "import { Dialog as BaseDialog } from '@base-ui/react/dialog';",
    ]) {
      assert.deepEqual(withImport(SEPARATOR, statement), [], statement);
    }
  });
});

describe('ULT-PRIMITIVE-001', () => {
  test('bounds React Zag to the entries Base UI ships no primitive for', () => {
    const zag = only(SEPARATOR, "import { useMachine } from '@zag-js/react';", 'ULT-PRIMITIVE-001');
    assert.equal(zag.target, '@zag-js/react');
    only(SEPARATOR, "import * as splitter from '@zag-js/splitter';", 'ULT-PRIMITIVE-001');
    only(SEPARATOR, "import { CalendarDate } from '@internationalized/date';", 'ULT-PRIMITIVE-001');
    for (const path of ['packages/ui/src/calendar.tsx', 'packages/ui/src/date-picker.tsx', 'packages/ui/src/resizable.tsx']) {
      assert.match(source(path), /from ['"]@zag-js\/react['"]/, path);
      assert.deepEqual(located(run(), path), [], path);
    }
  });

  test('rejects a third primitive library and icon packages', () => {
    only(SEPARATOR, "import * as Popover from '@radix-ui/react-popover';", 'ULT-PRIMITIVE-001');
    only(SEPARATOR, "import { useButton } from 'react-aria';", 'ULT-PRIMITIVE-001');
    const icon = only(SEPARATOR, "import { Check } from 'lucide-react';", 'ULT-PRIMITIVE-001');
    assert.equal(icon.target, 'lucide-react');
    only(SEPARATOR, "import { Check } from '@phosphor-icons/react';", 'ULT-PRIMITIVE-001');
    only(SEPARATOR, "import { CheckIcon } from '@radix-ui/react-icons';", 'ULT-PRIMITIVE-001');
  });

  test('keeps elements React-free on their Zag vanilla layer', () => {
    for (const statement of [
      "import { useState } from 'react';",
      "import { Tabs } from '@base-ui/react/tabs';",
      "import { useMachine } from '@zag-js/react';",
      "import { Button } from '@ultima/ui/button';",
      "import type { PartProps } from '@ultima/ui/lib/component';",
    ]) {
      only(BADGE, statement, 'ULT-PRIMITIVE-001');
    }
    assert.match(source('packages/elements/src/ult-tabs.element.ts'), /from ['"]@zag-js\/vanilla['"]/);
    assert.deepEqual(withImport(BADGE, "import * as tabs from '@zag-js/tabs';"), []);
  });
});
