import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { diskFiles } from './files.ts';
import { loadCatalogue } from './model.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const snapshot = (name: string) =>
  JSON.parse(readFileSync(join(root, 'docs/evidence/baseline/inventory', `${name}.json`), 'utf8'));

const { catalogue, diagnostics } = loadCatalogue(diskFiles(root));
const differences: string[] = [];
const expect = (label: string, actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    differences.push(`${label}\n    model:    ${JSON.stringify(actual)}\n    baseline: ${JSON.stringify(expected)}`);
  }
};

for (const diagnostic of diagnostics) differences.push(`${diagnostic.code} ${diagnostic.path}: ${diagnostic.message}`);

const registry = snapshot('registry');
const asId = (dependency: string) => dependency.replace(/^@ultima\//, '').replace(/^https:\/\/ultima\.systems\/r\/(.*)\.json$/, '$1');
type BaselineItem = { name: string; title: string; description: string; docs: string; dependencies?: string[]; devDependencies?: string[]; registryDependencies?: string[] };
const baselineItems = new Map<string, BaselineItem>(registry.data.items.map((item: BaselineItem) => [item.name, item]));
expect('registry item set', [...catalogue.registryItems].sort(), [...baselineItems.keys()].sort());

const derived = new Map<string, { title: string; description: string; docs?: string; dependencies: string[]; registryDependencies: string[] }>([
  ...catalogue.react.map((entry) => [entry.id, { ...entry, docs: entry.installDocs }] as const),
  ...catalogue.sourceBundles.map((entry) => [entry.id, { ...entry, docs: entry.installDocs }] as const),
  ...catalogue.elements.map((entry) => [entry.id, { ...entry, docs: entry.installDocs, dependencies: [] as string[] }] as const),
  ...catalogue.artifacts.map((entry) => [entry.id, { ...entry, docs: entry.installDocs, dependencies: [] as string[], registryDependencies: [] as string[] }] as const),
  ...catalogue.setup.map((entry) => [entry.id, { ...entry, registryDependencies: entry.registryDependencies ?? [] }] as const),
]);
for (const [id, item] of baselineItems) {
  const model = derived.get(id);
  if (!model) continue;
  expect(`${id} title`, model.title, item.title);
  expect(`${id} description`, model.description, item.description);
  if (model.docs !== undefined) expect(`${id} docs`, model.docs, item.docs);
  expect(`${id} dependencies`, model.dependencies, item.dependencies ?? []);
  expect(`${id} registryDependencies`, model.registryDependencies, (item.registryDependencies ?? []).map(asId));
}
for (const setup of catalogue.setup) {
  const item = baselineItems.get(setup.id);
  expect(`${setup.id} devDependencies`, setup.devDependencies, item?.devDependencies ?? []);
}

const docsCatalogue = snapshot('catalogue');
expect('release order', catalogue.releases.map((release) => release.id), docsCatalogue.data.releases);
expect(
  'docs catalogue order',
  catalogue.react.map((entry) => [entry.title, entry.id, entry.docsDescription ?? entry.description, entry.release]),
  docsCatalogue.data.components.map((entry: Record<string, string>) => [entry.name, entry.item, entry.description, entry.release]),
);

const elementDocs = snapshot('elements');
expect(
  'element docs',
  catalogue.elements.map((entry) => ({
    item: entry.reactItem,
    tag: entry.id,
    tags: entry.tags,
    attributes: entry.attributes.map(({ names, on, values }) => ({ name: names.join(', '), on, values })),
    example: entry.example,
  })),
  elementDocs.data.docsEntries,
);

const symbols = snapshot('exports').data.symbols as Record<string, { name: string; value: boolean; type: boolean }[]>;
const sorted = (names: string[]) => [...names].sort((a, b) => a.localeCompare(b));
for (const entry of catalogue.react) {
  expect(
    `${entry.source} exports`,
    sorted(entry.exports.map((item) => `${item.name}:${item.kind}`)),
    sorted((symbols[entry.source] ?? []).map((item) => `${item.name}:${item.value ? 'value' : 'type'}`)),
  );
}
expect(
  'barrel exports',
  sorted([...catalogue.exports.values()].map((item) => `${item.name}:${item.kind}`)),
  sorted(symbols['packages/ui/src/index.ts']!.map((item) => `${item.name}:${item.value ? 'value' : 'type'}`)),
);

if (differences.length > 0) {
  console.log(differences.join('\n'));
  process.exit(1);
}
console.log(
  `catalogue: ${catalogue.registryItems.length} registry items, ${catalogue.react.length} React entries, ` +
    `${catalogue.elements.length} element families, ${catalogue.exports.size} public exports and ` +
    `${catalogue.recipes.length} recipes agree with the baseline at ${registry.commit}`,
);
