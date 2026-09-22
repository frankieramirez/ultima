import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';

import { ELEMENTS_BUNDLE, elements } from '../elements';
import { routeTree } from '../router';
import '../styles.css';

function mount(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });
  return render(<RouterProvider router={createRouter({ routeTree, history })} />);
}

const sources = import.meta.glob('../../../../packages/elements/src/*.element.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function sourceOf(item: string): string {
  const entry = Object.entries(sources).find(([path]) => path.endsWith(`/ult-${item}.element.ts`));
  if (!entry) throw new Error(`no element source for ${item}`);
  return entry[1];
}

test('the catalogue restates every element file: tags and observed attributes', () => {
  expect(elements.length).toBe(Object.keys(sources).length);
  for (const element of elements) {
    const source = sourceOf(element.item);
    for (const tag of element.tags) expect(source).toContain(`customElements.define('${tag}'`);
    const defined = [...source.matchAll(/customElements\.define\('([a-z-]+)'/g)].map((match) => match[1]);
    expect([...element.tags].sort()).toEqual([...new Set(defined)].sort());
    for (const attribute of element.attributes) {
      for (const name of attribute.name.split(',').map((part) => part.trim())) {
        expect(source, `${element.tag}: ${name}`).toContain(`'${name}'`);
      }
      if (Array.isArray(attribute.values)) {
        for (const value of attribute.values) expect(source).toContain(`'${value}'`);
      }
    }
  }
});

test('the section names the tag, both install paths, the attributes, and upgrades a live example', async () => {
  const screen = await mount('/components/button');
  await expect.element(screen.getByRole('heading', { level: 2, name: 'Web component' })).toBeVisible();
  const section = screen.getByRole('heading', { level: 2, name: 'Web component' }).element().parentElement!;
  expect(section.textContent).toContain('<ult-button>');
  const fences = [...section.querySelectorAll('pre')].map((pre) => pre.textContent ?? '');
  expect(fences.some((text) => text.includes('npx shadcn add @ultima/ult-button'))).toBe(true);
  expect(fences.some((text) => text.includes('/elements/ult-button.js'))).toBe(true);
  const rows = [...section.querySelectorAll('tbody tr')].filter((row) => row.textContent?.includes('ult-button'));
  expect(rows.length).toBe(4);
  expect(rows[0]?.textContent).toContain('variant');
  expect(rows[0]?.textContent).toContain('solid');

  expect(document.querySelector(`script[src="${ELEMENTS_BUNDLE}"]`)).not.toBeNull();
  const live = screen.container.querySelector('[data-element-demo] ult-button')!;
  expect(live).not.toBeNull();
  await expect.poll(() => live.querySelector('button')).not.toBeNull();
  expect(live.querySelector('button')?.textContent).toBe('Save');
});

test('every element page carries the section under its own heading', async () => {
  for (const element of elements) {
    const screen = await mount(`/components/${element.item}`);
    await expect.element(screen.getByRole('heading', { level: 2, name: 'Web component' })).toBeVisible();
    expect(screen.container.textContent).toContain(`<${element.tag}>`);
    const index = document.querySelector('aside[aria-label="On this page"]');
    expect(index?.textContent).toContain('Web component');
    screen.unmount();
  }
});

test('the Elements page is in the menu and links every element to its section', async () => {
  const screen = await mount('/elements');
  await expect.element(page.getByRole('heading', { level: 1, name: 'Elements' })).toBeVisible();
  const menu = screen.getByRole('navigation', { name: 'Ultima', exact: true });
  await expect
    .element(menu.getByRole('link', { name: 'Elements', exact: true }))
    .toHaveAttribute('aria-current', 'page');
  const links = screen.container.querySelectorAll('article a[href$="#web-component"]');
  expect(links.length).toBe(elements.length);
  await userEvent.click(links[0] as HTMLElement);
  await expect.element(page.getByRole('heading', { level: 1, name: 'Button' })).toBeVisible();
});
