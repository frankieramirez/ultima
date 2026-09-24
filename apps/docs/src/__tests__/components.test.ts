import { expect, test } from 'vitest';

import { items } from '../../../../registry/items.config';
import { RELEASES, components, componentsInRelease } from '../components';

const NOT_A_COMPONENT = ['tokens', 'lib', 'setup-vite', 'setup-next', 'tokens-css'];

const pages = import.meta.glob('../content/components/*.mdx');
const demos = import.meta.glob('../demos/*/*.tsx');

test('the catalogue lists each release as one contiguous run, in release order', () => {
  expect(components.every((entry) => RELEASES.includes(entry.release))).toBe(true);
  expect(RELEASES.every((release) => componentsInRelease(release).length > 0)).toBe(true);
  expect(RELEASES.flatMap((release) => componentsInRelease(release).map(({ item }) => item))).toEqual(
    components.map(({ item }) => item),
  );
  expect(new Set(components.map(({ item }) => item)).size).toBe(components.length);
});

test('the catalogue and the registry manifest name the same components', () => {
  const manifest = Object.keys(items).filter(
    (item) => !NOT_A_COMPONENT.includes(item) && !item.startsWith('ult-'),
  );

  expect([...manifest].sort()).toEqual(components.map(({ item }) => item).sort());
});

test('every catalogue entry has a documentation page and at least one example', () => {
  const documented = Object.keys(pages).map((path) => path.replace(/^.*\/(.+)\.mdx$/, '$1'));
  expect(documented.sort()).toEqual(components.map(({ item }) => item).sort());

  const demonstrated = new Set(Object.keys(demos).map((path) => path.split('/')[2]));
  expect(components.filter(({ item }) => !demonstrated.has(item))).toEqual([]);
});
