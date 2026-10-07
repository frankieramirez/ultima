import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router';
import axe from 'axe-core';
import { beforeEach, expect, onTestFinished, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { GROUPS, components, componentsInGroup } from '../components';
import { elements } from '../elements';
import { routeTree } from '../router';
import { THEME_STORAGE_KEY } from '../theme';
import '../styles.css';

beforeEach(() => {
  localStorage.removeItem(THEME_STORAGE_KEY);
  document.documentElement.removeAttribute('class');
});
function mount() {
  return render(
    <RouterProvider
      router={createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: ['/components'] }),
      })}
    />,
  );
}
const entries = (main: Element) =>
  Array.from(main.querySelectorAll('ul > li a[href^="/components/"]')).map(
    (link) => link.getAttribute('href'),
  );

const sections = (main: Element) =>
  Array.from(main.querySelectorAll('section h2'), (heading) => heading.textContent);

test('the directory sections the catalogue by group, alphabetical within each, numbered, without releases or pagination', async () => {
  const screen = await mount();
  const main = screen.getByRole('main');
  expect(sections(main.element())).toEqual([
    '§ 01 Forms 20',
    '§ 02 Overlays 11',
    '§ 03 Data display 9',
    '§ 04 Navigation 5',
    '§ 05 Feedback 5',
    '§ 06 Layout 4',
  ]);
  for (const { id, label } of GROUPS) {
    const section = main.getByRole('region', { name: `${label} ${componentsInGroup(id).length}` });
    expect(entries(section.element())).toEqual(componentsInGroup(id).map((entry) => `/components/${entry.item}`));
  }
  await expect.element(main.getByRole('link', { name: '008 Button', exact: true })).toBeVisible();
  await expect.element(main.getByRole('link', { name: '048 Table', exact: true })).toBeVisible();
  await expect
    .element(main.getByRole('status'))
    .toHaveTextContent(`${components.length} components · A–Z`);
  expect(main.getByRole('group', { name: 'Release' }).query()).toBeNull();
  expect(main.element().textContent).not.toMatch(/All releases|The v0 set/);
  expect(
    main
      .getByRole('button', { name: /Next components|Previous components/ })
      .query(),
  ).toBeNull();
  expect(main.getByRole('combobox', { name: 'Sort order' }).query()).toBeNull();
});

test('the filter searches every group and hides each group with no match', async () => {
  const screen = await mount();
  const main = screen.getByRole('main');
  await userEvent.fill(main.getByRole('searchbox', { name: 'Filter components' }), 'dialog');
  await expect.element(main.getByRole('status')).toHaveTextContent('2 components · A–Z');
  expect(sections(main.element())).toEqual(['§ 02 Overlays 2']);
  expect(entries(main.element())).toEqual(['/components/alert-dialog', '/components/dialog']);
});

test('search combines names and descriptions, empty results clear with focus, and a result opens', async () => {
  const screen = await mount();
  const main = screen.getByRole('main');
  const input = main.getByRole('searchbox', { name: 'Filter components' });
  await userEvent.fill(input, '  bUtToN  ');
  const matches = components.filter((entry) =>
    `${entry.name} ${entry.description}`.toLowerCase().includes('button'),
  );
  await expect
    .element(main.getByRole('status'))
    .toHaveTextContent(`${matches.length} components · A–Z`);
  await expect
    .element(main.getByRole('link', { name: '008 Button', exact: true }))
    .toBeVisible();
  await expect
    .element(
      screen
        .getByRole('navigation', { name: 'Ultima' })
        .getByRole('link', { name: 'Badge', exact: true }),
    )
    .toBeVisible();
  await userEvent.fill(input, 'bounded measurement');
  await expect
    .element(main.getByRole('status'))
    .toHaveTextContent('1 component · A–Z');
  await userEvent.fill(input, 'no-such-component');
  await expect
    .element(
      main.getByRole('heading', { name: 'No components match these filters' }),
    )
    .toBeVisible();
  await userEvent.click(
    main.getByRole('button', { name: 'Clear filters' }).last(),
  );
  await expect.element(input).toHaveValue('');
  await expect.element(input).toHaveFocus();
  await userEvent.fill(input, 'button');
  await userEvent.click(main.getByRole('link', { name: '008 Button', exact: true }));
  await expect
    .element(main.getByRole('heading', { name: 'Button', level: 1 }))
    .toBeVisible();
});

test('search finds an entry near the end of the complete catalogue', async () => {
  const screen = await mount();
  const main = screen.getByRole('main');
  const last = components.at(-1)!;
  await userEvent.fill(
    main.getByRole('searchbox', { name: 'Filter components' }),
    last.name,
  );
  expect(entries(main.element())).toContain(`/components/${last.item}`);
  await userEvent.click(main.getByRole('button', { name: 'Clear filters' }));
  expect(entries(main.element())).toEqual(
    components.map((entry) => `/components/${entry.item}`),
  );
});

test('search includes full descriptions alongside the displayed summaries', async () => {
  const screen = await mount();
  const main = screen.getByRole('main');
  const input = main.getByRole('searchbox', { name: 'Filter components' });
  for (const query of ['  ToNeS  ', 'solid, outline, or ghost']) {
    await userEvent.fill(input, query);
    await expect
      .element(main.getByRole('link', { name: '008 Button', exact: true }))
      .toBeVisible();
  }
});

const status = (main: ReturnType<typeof page.getByRole>) => main.getByRole('status');

test('entries are cards with inert previews outside their links, four columns at 1440', async () => {
  await page.viewport(1440, 900);
  onTestFinished(() => page.viewport(1280, 720));
  const screen = await mount();
  const main = screen.getByRole('main').element();
  const previews = Array.from(main.querySelectorAll<HTMLElement>('section [data-component-preview]'));
  expect(previews).toHaveLength(components.length);
  for (const preview of previews) {
    expect(preview.getAttribute('aria-hidden')).toBe('true');
    expect(preview.inert).toBe(true);
    expect(preview.closest('a')).toBeNull();
  }
  const link = main.querySelector<HTMLAnchorElement>('a[href="/components/button"]')!;
  expect(document.getElementById(link.getAttribute('aria-describedby')!)?.textContent).toBe(
    'Trigger an action with solid, outline, or ghost styling.',
  );
  const card = link.closest('li')!.firstElementChild!;
  expect(getComputedStyle(link, '::after').position).toBe('absolute');
  expect(link.closest('li')!.querySelector('[data-component-preview]')).not.toBeNull();
  expect(card.contains(link)).toBe(true);
  const grid = main.querySelector('section ul')!;
  expect(getComputedStyle(grid).gridTemplateColumns.split(' ')).toHaveLength(4);
});

test('the group chips filter to one group, with counts that follow the query', async () => {
  const screen = await mount();
  const main = screen.getByRole('main');
  const chips = main.getByRole('group', { name: 'Group' });
  await expect.element(chips.getByRole('button', { name: `All ${components.length}` })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(chips.getByRole('button', { name: 'Overlays 11' }));
  expect(sections(main.element())).toEqual(['§ 02 Overlays 11']);
  await expect.element(status(main)).toHaveTextContent('11 components · A–Z');
  await userEvent.click(chips.getByRole('button', { name: 'Overlays 11' }));
  await expect.element(chips.getByRole('button', { name: 'Overlays 11' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.fill(main.getByRole('searchbox', { name: 'Filter components' }), 'dialog');
  await expect.element(chips.getByRole('button', { name: 'All 2' })).toBeVisible();
  await expect.element(chips.getByRole('button', { name: 'Forms 0' })).toBeVisible();
  await userEvent.click(chips.getByRole('button', { name: 'Forms 0' }));
  await expect.element(main.getByRole('heading', { name: 'No components match these filters' })).toBeVisible();
  await userEvent.click(main.getByRole('button', { name: 'Clear filters' }).first());
  await expect.element(chips.getByRole('button', { name: `All ${components.length}` })).toHaveAttribute('aria-pressed', 'true');
  expect(sections(main.element())).toHaveLength(GROUPS.length);
});

test('the HTML element switch keeps the components the Elements page lists, and combines with the query', async () => {
  const screen = await mount();
  const main = screen.getByRole('main');
  const toggle = main.getByRole('switch', { name: 'Has an HTML element' });
  await userEvent.click(toggle);
  await expect.element(status(main)).toHaveTextContent(`${elements.length} components · A–Z`);
  const items = elements.map((element) => element.item);
  expect(entries(main.element()).sort()).toEqual(items.map((item) => `/components/${item}`).sort());
  for (const li of main.element().querySelectorAll('section > ul > li'))
    expect(Array.from(li.querySelectorAll('span'), (span) => span.textContent)).toContain('Element');
  await userEvent.fill(main.getByRole('searchbox', { name: 'Filter components' }), 'button');
  expect(entries(main.element())).toEqual(['/components/button']);
  await userEvent.click(main.getByRole('button', { name: 'Clear filters' }));
  await expect.element(toggle).not.toBeChecked();
  await expect.element(status(main)).toHaveTextContent(`${components.length} components · A–Z`);
});

test('the view toggle swaps the card grid for the list, and clearing the filters keeps it', async () => {
  const screen = await mount();
  const main = screen.getByRole('main');
  const view = main.getByRole('group', { name: 'View' });
  await expect.element(view.getByRole('button', { name: 'Grid' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(view.getByRole('button', { name: 'List' }));
  expect(main.element().querySelectorAll('section [data-component-preview]')).toHaveLength(0);
  expect(entries(main.element())).toEqual(components.map((entry) => `/components/${entry.item}`));
  await userEvent.fill(main.getByRole('searchbox', { name: 'Filter components' }), 'dialog');
  expect(entries(main.element())).toEqual(['/components/alert-dialog', '/components/dialog']);
  await userEvent.click(main.getByRole('button', { name: 'Clear filters' }));
  await expect.element(view.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(main.getByRole('link', { name: '008 Button', exact: true }));
  await expect.element(main.getByRole('heading', { name: 'Button', level: 1 })).toBeVisible();
});

test('slash focuses the filter, and the controls come before the entries in tab order', async () => {
  const screen = await mount();
  const main = screen.getByRole('main');
  const input = main.getByRole('searchbox', { name: 'Filter components' });
  (document.activeElement as HTMLElement | null)?.blur();
  await userEvent.keyboard('/');
  await expect.element(input).toHaveFocus();
  await expect.element(input).toHaveValue('');
  await userEvent.keyboard('/');
  await expect.element(input).toHaveValue('/');
  await userEvent.fill(input, '');
  const root = main.element();
  await userEvent.tab();
  expect(document.activeElement?.getAttribute('role')).toBe('switch');
  await userEvent.tab();
  expect(document.activeElement).toBe(root.querySelector('[aria-label="Grid"]'));
  await userEvent.tab();
  expect(document.activeElement?.textContent).toBe(`All ${components.length}`);
  await userEvent.tab();
  expect(document.activeElement?.getAttribute('href')).toBe('/components/button');
});

test('slash leaves focus in an open search dialog', async () => {
  const screen = await mount();
  const input = screen.getByRole('main').getByRole('searchbox', { name: 'Filter components' }).element() as HTMLInputElement;
  await userEvent.keyboard('{Control>}k{/Control}');
  const dialog = screen.getByRole('dialog');
  await expect.element(dialog).toBeVisible();
  await expect.poll(() => dialog.element().contains(document.activeElement)).toBe(true);
  await userEvent.tab();
  await expect.poll(() => document.activeElement?.tagName).toBe('BUTTON');
  await userEvent.keyboard('/');
  expect(dialog.element().contains(document.activeElement)).toBe(true);
  expect(input.value).toBe('');
});

test('slash leaves focus in the open navigation drawer at 390', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));
  const screen = await mount();
  const input = screen.getByRole('main').getByRole('searchbox', { name: 'Filter components' }).element() as HTMLInputElement;
  await userEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }));
  const drawer = screen.getByRole('dialog');
  await expect.element(drawer).toBeVisible();
  await expect.poll(() => drawer.element().contains(document.activeElement)).toBe(true);
  await userEvent.keyboard('/');
  expect(drawer.element().contains(document.activeElement)).toBe(true);
  expect(input.value).toBe('');
});

test('Shift+Tab up the grid never leaves a focused entry under the stuck toolbar', async () => {
  await page.viewport(1280, 720);
  const screen = await mount();
  const main = screen.getByRole('main').element();
  const toolbar = main.querySelector('section')!.previousElementSibling as HTMLElement;
  const links = Array.from(main.querySelectorAll<HTMLAnchorElement>('section > ul > li a[href^="/components/"]'));
  links.at(-1)!.focus();
  for (let press = 0; press < 16; press += 1) {
    await userEvent.tab({ shift: true });
    const focused = document.activeElement as HTMLElement;
    expect(links).toContain(focused);
    expect(getComputedStyle(toolbar).position).toBe('sticky');
    expect(focused.getBoundingClientRect().top).toBeGreaterThanOrEqual(toolbar.getBoundingClientRect().bottom);
  }
});

test('the grid holds four columns at most, however wide its column', async () => {
  const screen = await mount();
  const grid = screen.getByRole('main').element().querySelector<HTMLElement>('section ul')!;
  grid.style.inlineSize = '120rem';
  expect(getComputedStyle(grid).gridTemplateColumns.split(' ')).toHaveLength(4);
});

for (const mode of ['dark', 'light'])
  for (const width of [390, 768, 1024, 1280, 1440])
    test(`the directory fits at ${width} in ${mode}${width === 390 || width === 1440 ? ' and passes axe' : ''}`, async () => {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
      await page.viewport(width, 900);
      onTestFinished(() => page.viewport(1280, 720));
      const screen = await mount();
      await expect.element(status(screen.getByRole('main'))).toHaveTextContent(`${components.length} components · A–Z`);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      if (width === 390) expect(getComputedStyle(screen.getByRole('main').element().querySelector('section ul')!).gridTemplateColumns.split(' ')).toHaveLength(1);
      if (width !== 390 && width !== 1440) return;
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(
        (await axe.run(document.body)).violations.map(({ id, nodes }) => `${id}: ${nodes.map(({ html }) => html).join(', ')}`),
      ).toEqual([]);
    });

for (const mode of ['dark', 'light'])
  test(`directory search and empty state fit and remain accessible in ${mode} on mobile`, async () => {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    await page.viewport(390, 844);
    onTestFinished(() => page.viewport(1280, 720));
    const screen = await mount();
    const main = screen.getByRole('main');
    await userEvent.fill(
      main.getByRole('searchbox', { name: 'Filter components' }),
      'no-such-component',
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(
      (await axe.run(document.body)).violations.map(
        ({ id, nodes }) => `${id}: ${nodes.map(({ html }) => html).join(', ')}`,
      ),
    ).toEqual([]);
  });
