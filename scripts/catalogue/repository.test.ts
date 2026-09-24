import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { RELEASE_LABELS, RELEASES, components } from '../../apps/docs/src/components.ts';
import { elements as docsElements } from '../../apps/docs/src/elements.ts';
import { items, setupItems } from '../../registry/items.config.ts';
import { diskFiles } from './files.ts';
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
    assert.deepEqual(catalogue.artifacts.map((entry) => entry.id), ['tokens-css']);
  });

  test('agrees with apps/docs/src/components.ts on releases, order and visitor prose', () => {
    assert.deepEqual(catalogue.releases.map((release) => release.id), [...RELEASES]);
    assert.deepEqual(Object.fromEntries(catalogue.releases.map((r) => [r.id, r.label])), RELEASE_LABELS);
    assert.deepEqual(
      catalogue.react.map((entry) => ({
        name: entry.title,
        item: entry.id,
        description: entry.docsDescription ?? entry.description,
        release: entry.release,
      })),
      components,
    );
  });

  test('agrees with apps/docs/src/elements.ts, its values read from element source', () => {
    assert.deepEqual(
      catalogue.elements.map((entry) => ({
        item: entry.reactItem,
        tag: entry.id,
        tags: entry.tags,
        attributes: entry.attributes.map(({ names, on, values }) => ({ name: names.join(', '), on, values })),
        example: entry.example,
      })),
      docsElements,
    );
  });

  test('agrees with registry/items.config.ts on every installable record', () => {
    const installable = [...catalogue.react, ...catalogue.sourceBundles, ...catalogue.elements, ...catalogue.artifacts];
    assert.deepEqual(
      Object.fromEntries(
        installable.map((entry) => [
          entry.id,
          {
            title: entry.title,
            description: entry.description,
            docs: entry.installDocs,
            ...(entry.kind === 'element' && {
              registryDependencies: entry.registryDependencies.map((id) => `https://ultima.systems/r/${id}.json`),
            }),
          },
        ]),
      ),
      items,
    );
    assert.deepEqual(
      Object.fromEntries(
        catalogue.setup.map(({ id, title, description, dependencies, devDependencies, handSteps, checks }) => [
          id,
          { title, description, dependencies, devDependencies, handSteps, checks },
        ]),
      ),
      setupItems,
    );
  });

  test('plans the same public exports as packages/ui/src/index.ts, modifiers included', () => {
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
