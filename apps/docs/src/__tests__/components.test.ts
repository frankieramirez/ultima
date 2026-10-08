import { expect, test } from 'vitest';

import { items } from '../../../../registry/items.config';
import { GROUPS, components, componentsInGroup } from '../components';
import { blocks } from '../generated/blocks';

const NOT_A_COMPONENT = ['tokens', 'lib', 'setup-vite', 'setup-next', 'tokens-css', 'design-md', ...blocks.map(({ id }) => id)];

const pages = import.meta.glob('../content/components/*.mdx');
const demos = import.meta.glob('../demos/*/*.tsx');

test('the catalogue lists each group as one contiguous alphabetical run, in display order', () => {
  expect(GROUPS.flatMap(({ id }) => componentsInGroup(id).map(({ item }) => item))).toEqual(components.map(({ item }) => item));
  for (const { id } of GROUPS) {
    const names = componentsInGroup(id).map(({ name }) => name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  }
  expect(new Set(components.map(({ item }) => item)).size).toBe(components.length);
});

test('the six groups hold the counts the Components directory frame shows', () => {
  expect(Object.fromEntries(GROUPS.map(({ label, id }) => [label, componentsInGroup(id).length]))).toEqual({
    Forms: 20,
    Overlays: 11,
    'Data display': 9,
    Navigation: 5,
    Feedback: 5,
    Layout: 4,
  });
});

test('catalogue numbers follow id order, padded to three digits', () => {
  const numbers = Object.fromEntries(components.map(({ name, number }) => [name, number]));
  expect(numbers).toMatchObject({
    Avatar: '005',
    Button: '008',
    Card: '011',
    'Date Picker': '019',
    Input: '027',
    Meter: '031',
    Sidebar: '042',
    Stat: '046',
    Table: '048',
    Tabs: '049',
  });
});

test('each React registry record carries its group as categories, and /llms.txt has one heading per group', async () => {
  for (const { item, group } of components) {
    const record = (await (await fetch(`/r/${item}.json`)).json()) as { categories?: string[] };
    expect(record.categories, item).toEqual([group]);
  }
  const guide = await (await fetch('/llms.txt')).text();
  const section = guide.slice(guide.indexOf('\n## Components\n'), guide.indexOf('\n## ', guide.indexOf('\n## Components\n') + 1));
  expect([...section.matchAll(/^### (.+)$/gm)].map((match) => match[1])).toEqual(GROUPS.map(({ label }) => label));
});

test('the catalogue and the registry manifest name the same components', () => {
  const manifest = Object.keys(items).filter(
    (item) => !NOT_A_COMPONENT.includes(item) && !item.startsWith('ult-'),
  );

  expect([...manifest].sort()).toEqual(components.map(({ item }) => item).sort());
});

test('the generated agent guide publishes local theme discovery and offline freshness within its size limit', async () => {
  const guide = await (await fetch('/llms.txt')).text();
  expect(guide).toContain('## Discover and maintain the product theme');
  expect(guide).toContain('npx ultima-design doctor --theme');
  expect(guide).toContain('npx --no-install ultima-design');
  expect(guide).toContain('Consumer prose outside a marked generated region stays byte-for-byte intact');
  expect(guide).toContain('source identity, compared scope/modes, actual differences and a repair');
  expect(guide).not.toContain('The flag is not currently available');
  expect(new TextEncoder().encode(guide).length).toBeLessThanOrEqual(64 * 1024);
});

test('every catalogue entry has a documentation page and at least one example', () => {
  const documented = Object.keys(pages).map((path) => path.replace(/^.*\/(.+)\.mdx$/, '$1'));
  expect(documented.sort()).toEqual(components.map(({ item }) => item).sort());

  const demonstrated = new Set(Object.keys(demos).map((path) => path.split('/')[2]));
  expect(components.filter(({ item }) => !demonstrated.has(item))).toEqual([]);
});
