// The tested policy: dependency categories, the bounded Zag allowance, classification and authority links.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { loadCatalogue } from '../../../../scripts/catalogue/model.ts';
import { CATEGORIES, POLICY, ZAG_REACT_ITEMS, allows, categoryOf } from '../policy.ts';
import { RULES } from '../rules.ts';
import { classify, workspaceScope } from '../workspace.ts';
import { repository } from './support.ts';

const scope = workspaceScope(repository);

function resolves(link: string): boolean {
  const [document, anchor] = link.split('#');
  const anchors = scope.anchors(document as string);
  return anchors !== undefined && (anchor === undefined || anchors.has(anchor));
}

describe('the dependency policy', () => {
  test('links every category and rule to an existing heading', () => {
    for (const rule of CATEGORIES) assert.ok(resolves(rule.authority), `${rule.category}: ${rule.authority}`);
    for (const [id, rule] of Object.entries(RULES)) assert.ok(resolves(rule.link), `${id}: ${rule.link}`);
  });

  test('classifies the packages production code imports today', () => {
    const expected: [string, string][] = [
      ['react', 'react'],
      ['@stylexjs/stylex', 'styling'],
      ['@base-ui/react', 'base-ui'],
      ['@zag-js/react', 'zag-react'],
      ['@zag-js/vanilla', 'zag-vanilla'],
      ['@zag-js/date-picker', 'zag-machine'],
      ['@internationalized/date', 'zag-companion'],
      ['@radix-ui/react-icons', 'icon'],
      ['@radix-ui/react-dialog', 'foreign-primitive'],
      ['embla-carousel-react', 'engine'],
    ];
    for (const [name, category] of expected) assert.equal(categoryOf(POLICY, name)?.category, category, name);
    assert.equal(categoryOf(POLICY, 'left-pad'), undefined);
  });

  test('bounds the React Zag allowance to named items that exist', () => {
    const react = new Set(loadCatalogue(repository).catalogue.react.map((entry) => entry.id));
    for (const item of ZAG_REACT_ITEMS) assert.ok(react.has(item), item);
    assert.equal(allows(POLICY, 'react-component', 'zag-react', 'date-picker'), true);
    assert.equal(allows(POLICY, 'react-component', 'zag-react', 'dialog'), false);
    assert.equal(allows(POLICY, 'react-component', 'zag-react', undefined), false);
    assert.equal(allows(POLICY, 'element', 'zag-vanilla', 'ult-tabs'), true);
    assert.equal(allows(POLICY, 'element', 'react', 'ult-tabs'), false);
    assert.equal(allows(POLICY, 'token-source', 'base-ui', undefined), false);
  });
});

describe('the workspace classification', () => {
  test('claims fixtures, tests and generated wiring before any production pattern', () => {
    const cases: [string, string | undefined][] = [
      ['packages/analysis/fixtures/source/no-directive.tsx', 'fixture'],
      ['packages/ui/src/__tests__/button.test.tsx', 'test'],
      ['packages/ui/src/button.test.tsx', 'test'],
      ['apps/docs/tests/production/dialog.keyboard-dismissal.ts', 'test'],
      ['packages/ui/src/raw.d.ts', 'declarations'],
      ['packages/ui/src/index.ts', 'generated'],
      ['packages/ui/src/button.tsx', 'react-component'],
      ['packages/ui/src/lib/component.ts', 'react-helper'],
      ['packages/tokens/src/theme/codec.ts', 'token-source'],
      ['packages/elements/src/ult-tabs.element.ts', 'element'],
      ['apps/docs/src/demos/button/variants.tsx', 'demo'],
      ['apps/docs/src/content/components/button.mdx', 'content'],
      ['apps/docs/src/routes/home.tsx', 'docs'],
      ['apps/docs/server/worker.ts', 'docs'],
      ['apps/docs/server/worker.test.ts', 'test'],
      ['registry/metadata/react/button.ts', 'metadata'],
      ['scripts/check-architecture.ts', 'tooling'],
      ['packages/ui/src/parts/button.tsx', undefined],
      ['packages/ui/src/button.ts', undefined],
      ['packages/elements/src/helpers.ts', undefined],
      ['packages/new/src/index.ts', undefined],
    ];
    for (const [path, kind] of cases) assert.equal(classify(path), kind, path);
  });

  test('resolves package exports, relative paths and build outputs', () => {
    const from = 'packages/ui/src/separator.tsx';
    assert.deepEqual(scope.resolve('@ultima/ui/dialog', from), { kind: 'file', path: 'packages/ui/src/dialog.tsx', via: 'package' });
    assert.deepEqual(scope.resolve('@ultima/tokens/tokens.stylex', from), { kind: 'file', path: 'packages/tokens/src/tokens.stylex.ts', via: 'package' });
    assert.deepEqual(scope.resolve('./dialog', from), { kind: 'file', path: 'packages/ui/src/dialog.tsx', via: 'relative' });
    assert.deepEqual(scope.resolve('@ultima/tokens/tokens.json', from), { kind: 'file', path: 'packages/tokens/dist/tokens.json', via: 'package' });
    assert.deepEqual(scope.resolve('@base-ui/react/dialog', from), { kind: 'external', package: '@base-ui/react' });
    assert.equal(scope.resolve('@ultima/tokens/palette', from).kind, 'unresolved');
    assert.equal(scope.staged('packages/ui/src/dialog.tsx')?.specifier, '@ultima/ui/dialog');
    assert.equal(scope.staged('packages/ui/src/lib/component.ts')?.specifier, '@ultima/ui/lib/component');
    assert.equal(scope.staged('packages/tokens/src/tokens.stylex.ts')?.specifier, '@ultima/tokens/tokens.stylex');
    assert.equal(scope.staged('packages/tokens/src/index.ts'), undefined);
  });
});
