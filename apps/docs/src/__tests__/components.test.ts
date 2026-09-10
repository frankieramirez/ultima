import { expect, test } from 'vitest';

import { components } from '../components';

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
    'collapsible',
  ]);
});
