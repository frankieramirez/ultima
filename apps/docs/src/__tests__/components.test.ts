import { expect, test } from 'vitest';

import { items } from '../../../../registry/items.config';
import { RELEASES, components, componentsInRelease } from '../components';

const NOT_A_COMPONENT = ['tokens', 'lib', 'setup-vite', 'setup-next', 'tokens-css'];

const pages = import.meta.glob('../content/components/*.mdx');
const demos = import.meta.glob('../demos/*/*.tsx');

test('the component catalogue exposes the v0, v0.1, and v0.2 sets in specification order', () => {
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
    'separator',
    'field',
    'fieldset',
    'checkbox',
    'radio-group',
    'textarea',
    'combobox',
    'slider',
    'alert',
    'alert-dialog',
    'toast',
    'progress',
    'skeleton',
    'spinner',
    'empty',
    'breadcrumb',
    'pagination',
    'navigation-menu',
    'popover',
    'drawer',
    'context-menu',
    'hover-card',
    'menubar',
    'accordion',
    'avatar',
    'scroll-area',
    'toggle',
    'color-field',
    'aspect-ratio',
    'command',
    'calendar',
    'input-group',
    'native-select',
  ]);
});

test('every catalogue entry carries a release, and the menu derives from that field', () => {
  expect(components.every((entry) => RELEASES.includes(entry.release))).toBe(true);
  expect(componentsInRelease('v0').map(({ item }) => item)).toEqual([
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
    'separator',
  ]);
  expect(componentsInRelease('v0.1').map(({ item }) => item)).toEqual([
    'field',
    'fieldset',
    'checkbox',
    'radio-group',
    'textarea',
    'combobox',
    'slider',
    'alert',
    'alert-dialog',
    'toast',
    'progress',
    'skeleton',
    'spinner',
    'empty',
  ]);
  expect(componentsInRelease('v0.2').map(({ item }) => item)).toEqual([
    'breadcrumb',
    'pagination',
    'navigation-menu',
    'popover',
    'drawer',
    'context-menu',
    'hover-card',
    'menubar',
    'accordion',
    'avatar',
    'scroll-area',
    'toggle',
    'color-field',
    'aspect-ratio',
    'command',
    'calendar',
    'input-group',
    'native-select',
  ]);
  expect(RELEASES.flatMap((release) => componentsInRelease(release).map(({ item }) => item))).toEqual(
    components.map(({ item }) => item),
  );
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
