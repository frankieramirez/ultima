import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { diskFiles } from './files.ts';
import { check } from './generate.ts';
import { BARREL, loadCatalogue } from './model.ts';
import { exportsOf, parse } from './source.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const { catalogue, diagnostics } = loadCatalogue(diskFiles(root));

describe('the repository catalogue', () => {
  test('loads without a diagnostic', () => assert.deepEqual(diagnostics, []));

  test('covers every kind', () => {
    assert.ok(catalogue.react.length > 0 && catalogue.elements.length > 0 && catalogue.recipes.length > 0);
    assert.deepEqual(catalogue.setup.map((entry) => entry.id), ['setup-next', 'setup-vite']);
    assert.deepEqual(catalogue.sourceBundles.map((entry) => entry.id).sort(), ['lib', 'tokens']);
    assert.deepEqual(catalogue.artifacts.map((entry) => entry.id), ['design-md', 'tokens-css']);
  });

  test('matches the committed generated wiring byte for byte', () => {
    assert.deepEqual(check(root), { diagnostics: [], freshness: { added: [], changed: [], stale: [] } });
  });

  test('re-exports from the barrel exactly what the component files export, modifiers included', () => {
    const barrel = exportsOf(parse(BARREL, readFileSync(join(root, BARREL), 'utf8'))).exports;
    const key = (item: string, name: string, typeOnly: boolean) => `${item}:${typeOnly ? 'type ' : ''}${name}`;
    assert.deepEqual(
      barrel.map((item) => key((item.from as string).replace('./', ''), item.name, item.typeOnly)).sort(),
      [...catalogue.exports.values()].map((item) => key(item.item, item.name, item.kind === 'type')).sort(),
    );
  });

  test('keeps recipes out of the registry and the component routes', () => {
    for (const recipe of catalogue.recipes) {
      assert.equal(catalogue.registryItems.includes(recipe.id), false);
      assert.equal(catalogue.componentRoutes.includes(recipe.id), false);
      assert.ok(recipe.registryDependencies.includes(recipe.page), `${recipe.id} composes its own page's item`);
    }
  });
});
