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
  await expect.element(main.getByRole('link', { name: /^008 Button Trigger / })).toBeVisible();
  await expect.element(main.getByRole('link', { name: /^048 Table / })).toBeVisible();
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
    .element(main.getByRole('link', { name: /^008 Button Trigger / }))
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
  await userEvent.click(main.getByRole('link', { name: /^008 Button Trigger / }));
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
      .element(main.getByRole('link', { name: /^008 Button Trigger / }))
      .toBeVisible();
  }
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
