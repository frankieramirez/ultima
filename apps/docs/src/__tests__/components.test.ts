import { expect, test } from 'vitest';

import { items } from '../../../../registry/items.config';
import { components } from '../components';

const NOT_A_COMPONENT = ['tokens', 'lib', 'setup-vite', 'setup-next', 'tokens-css'];

const pages = import.meta.glob('../content/components/*.mdx');
const demos = import.meta.glob('../demos/*/*.tsx');

test('the component catalogue exposes the v0 set in specification order', () => {
  expect(components.map(({ item }) => item)).toEqual([
    'button',
    'badge',
    'card',
    'table',
    'tabs',
    'meter',
    'stat',
    'code',
    'tooltip',
    'dialog',
    'dropdown-menu',
    'select',
    'input',
    'switch',
    'sidebar',
    'collapsible',
    'toggle-group',
  ]);
});

test('the catalogue and the registry manifest name the same components', () => {
  const manifest = Object.keys(items).filter((item) => !NOT_A_COMPONENT.includes(item));

  expect([...manifest].sort()).toEqual(components.map(({ item }) => item).sort());
});

test('every catalogue entry has a documentation page and at least one example', () => {
  const documented = Object.keys(pages).map((path) => path.replace(/^.*\/(.+)\.mdx$/, '$1'));
  expect(documented.sort()).toEqual(components.map(({ item }) => item).sort());

  const demonstrated = new Set(Object.keys(demos).map((path) => path.split('/')[2]));
  expect(components.filter(({ item }) => !demonstrated.has(item))).toEqual([]);
});
