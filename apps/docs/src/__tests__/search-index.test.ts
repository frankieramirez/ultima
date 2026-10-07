import { afterEach, expect, test, vi } from 'vitest';

import type { ComponentEntry } from '../components';
import type { ElementEntry } from '../elements';
import type { BlockEntry } from '../generated/blocks';
import { RECENT_KEY, emptyGroups, readRecent, recordRecent, searchGroups, type SearchSources } from '../search-index';

const component = (item: string, name: string, number: string, description: string): ComponentEntry => ({
  name,
  item,
  number,
  group: 'forms',
  description,
  release: 'v0',
  primitive: null,
});

const block = (id: string, title: string, number: string, built: string[], description = 'A screen.'): BlockEntry => ({
  id,
  title,
  description,
  number,
  install: `npx shadcn add @ultima/${id}`,
  installDocs: '',
  files: [],
  builtFrom: built.map((item) => ({ id: item, title: item, number: '000', kind: 'component' as const })),
  preview: () => null,
});

const element = (item: string, tags: string[]): ElementEntry => ({ item, tag: tags[0]!, tags, attributes: [], example: '' });

const sources: SearchSources = {
  components: [
    component('toggle', 'Toggle', '052', 'A two-state button.'),
    component('button-group', 'Button Group', '009', 'A row of buttons.'),
    component('button', 'Button', '008', 'Three variants.'),
    component('icon-button', 'Icon Button', '030', 'Square.'),
    component('input', 'Input', '031', 'A text field.'),
  ],
  elements: [element('button', ['ult-button']), element('input', ['ult-input', 'ult-input-button'])],
  blocks: [
    block('crm-01', 'CRM 01', '001', ['button', 'input']),
    block('sign-in-01', 'Sign-in 01', '004', ['input']),
    block('settings-01', 'Settings 01', '003', ['button'], 'Has a save button.'),
  ],
  pages: [
    { label: 'Tokens', to: '/tokens' },
    { label: 'Install', to: '/install' },
    { label: 'Studio', to: '/theme-studio' },
    { label: 'Components', to: '/components' },
    { label: 'Blocks', to: '/blocks' },
    { label: 'CLI', to: '/cli' },
  ],
};

const shape = (query: string) => searchGroups(query, sources).map(({ label, items }) => [label, items.map(({ title }) => title)]);

afterEach(() => {
  localStorage.removeItem(RECENT_KEY);
  vi.restoreAllMocks();
});

test('groups keep their order and rank title-starts, then title-contains, then description only', () => {
  expect(shape('BUTTON')).toEqual([
    ['Components', ['Button', 'Button Group', 'Icon Button', 'Toggle']],
    ['Blocks using Button', ['CRM 01', 'Settings 01']],
    ['Elements', ['Button element', 'Input element']],
    ['Blocks', ['Settings 01']],
  ]);
});

test('pages tie alphabetically, Appearance matches its labels and empty groups are hidden', () => {
  expect(shape('o')).toContainEqual(['Pages', ['Blocks', 'Components', 'Theme Studio', 'Tokens']]);
  expect(shape('light')).toEqual([['Appearance', ['Switch to light mode']]]);
  expect(shape('zzz')).toEqual([]);
});

test('Blocks using follows the top component only, inverting Built from in number order', () => {
  expect(shape('input')).toEqual([
    ['Components', ['Input']],
    ['Blocks using Input', ['CRM 01', 'Sign-in 01']],
    ['Elements', ['Input element']],
  ]);
  expect(shape('toggle').map(([label]) => label)).toEqual(['Components']);
});

test('the site index finds Button first and the four blocks built from it', () => {
  const groups = searchGroups('button');
  expect(groups.map(({ label }) => label).slice(0, 3)).toEqual(['Components', 'Blocks using Button', 'Elements']);
  expect(groups[0]!.items.slice(0, 2).map(({ title }) => title)).toEqual(['Button', 'Button Group']);
  expect(groups[1]!.items.map(({ title }) => title)).toEqual(['CRM 01', 'Dashboard 01', 'Settings 01', 'Sign-in 01']);
  expect(groups[2]!.items[0]).toMatchObject({ title: 'Button element', tag: 'ult-button' });
});

test('the empty query shows Go to, then Recent, then Appearance', () => {
  expect(emptyGroups(sources).map(({ label, items }) => [label, items.map(({ title }) => title)])).toEqual([
    ['Go to', ['Components', 'Blocks', 'Install', 'CLI', 'Tokens', 'Theme Studio']],
    ['Appearance', ['Switch to dark mode', 'Switch to light mode', 'Follow the system']],
  ]);
  const [button] = searchGroups('button', sources)[0]!.items;
  recordRecent(button!, sources);
  expect(emptyGroups(sources).map(({ label }) => label)).toEqual(['Go to', 'Recent', 'Appearance']);
});

test('Recent stores kind and id, newest first, five at most', () => {
  const all = searchGroups('o', sources).flatMap(({ items }) => items);
  for (const result of all) recordRecent(result, sources);
  recordRecent(all[0]!, sources);
  const stored = JSON.parse(localStorage.getItem(RECENT_KEY)!);
  expect(stored).toHaveLength(5);
  expect(stored[0]).toEqual({ kind: all[0]!.kind, id: all[0]!.id });
  expect(readRecent(sources).map(({ title }) => title)[0]).toBe(all[0]!.title);
});

test('Recent drops an entry whose item left the index, and ignores what it cannot parse', () => {
  localStorage.setItem(
    RECENT_KEY,
    JSON.stringify([{ kind: 'component', id: 'retired' }, { kind: 'block', id: 'crm-01' }, { kind: 'page', id: '/cli' }, 7]),
  );
  expect(readRecent(sources).map(({ title }) => title)).toEqual(['CRM 01', 'CLI']);
  localStorage.setItem(RECENT_KEY, '{not json');
  expect(readRecent(sources)).toEqual([]);
});

test('blocked storage leaves Recent absent and recording silent', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('blocked', 'SecurityError');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('blocked', 'SecurityError');
  });
  const [button] = searchGroups('button', sources)[0]!.items;
  expect(() => recordRecent(button!, sources)).not.toThrow();
  expect(readRecent(sources)).toEqual([]);
  expect(emptyGroups(sources).map(({ label }) => label)).toEqual(['Go to', 'Appearance']);
});
