import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import axe from 'axe-core';
import { beforeEach, expect, onTestFinished, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { components } from '../components';
import { routeTree } from '../router';
import { THEME_STORAGE_KEY } from '../theme';
import '../styles.css';

beforeEach(() => {
  localStorage.removeItem(THEME_STORAGE_KEY);
  document.documentElement.removeAttribute('class');
});

function mount() {
  const history = createMemoryHistory({ initialEntries: ['/components'] });
  return render(<RouterProvider router={createRouter({ routeTree, history })} />);
}

test('text filtering matches names and descriptions without changing site navigation', async () => {
  const screen = await mount();
  const main = screen.getByRole('main');
  const input = main.getByRole('textbox', { name: 'Filter components' });
  await userEvent.fill(input, '  bUtToN  ');
  const buttonMatches = components.filter((component) =>
    `${component.name} ${component.description}`.toLowerCase().includes('button'),
  );
  await expect.element(main.getByRole('status')).toHaveTextContent(
    `${buttonMatches.length} component${buttonMatches.length === 1 ? '' : 's'}`,
  );
<<<<<<< HEAD
  await expect.element(main.getByRole('link', { name: /^Button A / })).toBeVisible();
=======
  await expect.element(main.getByRole('link', { name: /^Button / })).toBeVisible();
>>>>>>> origin/main
  expect(main.getByRole('link', { name: /^Badge / }).query()).toBeNull();
  await expect.element(screen.getByRole('navigation', { name: 'Ultima' }).getByRole('link', { name: 'Badge', exact: true })).toBeVisible();
  await userEvent.fill(input, 'bounded measurement');
  await expect.element(main.getByRole('link', { name: /^Meter / })).toBeVisible();
  await expect.element(main.getByRole('status')).toHaveTextContent('1 component');
});

test('release and text filters combine, empty results recover, and clear restores focus', async () => {
  const screen = await mount();
  const main = screen.getByRole('main');
  const clear = main.getByRole('button', { name: 'Clear filters' });
  await expect.element(clear).toBeDisabled();
  const release = main.getByRole('combobox', { name: 'Release' });
  release.element().focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(screen.getByRole('listbox')).toBeVisible();
  await userEvent.keyboard('{End}');
  await expect.element(screen.getByRole('option', { name: 'v0.2', exact: true })).toHaveAttribute('data-highlighted');
  await userEvent.keyboard('{Enter}');
  await expect.element(release).toHaveTextContent('v0.2');
  await expect.element(main.getByRole('status')).toHaveTextContent(`${components.filter((component) => component.release === 'v0.2').length} components`);
  expect(main.getByRole('heading', { name: 'The v0 set' }).query()).toBeNull();
  const input = main.getByRole('textbox', { name: 'Filter components' });
  await userEvent.fill(input, 'button');
  await expect.element(main.getByRole('status')).toHaveTextContent('2 components');
  await expect.element(main.getByRole('link', { name: /^Toggle / })).toBeVisible();
  await userEvent.fill(input, 'no-such-component');
  await expect.element(main.getByRole('status')).toHaveTextContent('0 components');
  await expect.element(main.getByText('No components match these filters.')).toBeVisible();
  await userEvent.click(clear);
  await expect.element(input).toHaveValue('');
  await expect.element(input).toHaveFocus();
  await expect.element(release).toHaveTextContent('All releases');
  await expect.element(main.getByRole('status')).toHaveTextContent(`${components.length} components`);
  await expect.element(clear).toBeDisabled();
  await userEvent.click(main.getByRole('link', { name: /^Button A / }));
  await expect.element(main.getByRole('heading', { level: 1, name: 'Button' })).toBeVisible();
});

for (const theme of ['dark', 'light']) {
  test(`filter controls and empty results remain accessible on a narrow screen in ${theme}`, async () => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    await page.viewport(390, 844);
    onTestFinished(() => page.viewport(1280, 720));
    const screen = await mount();
    const main = screen.getByRole('main');
    const input = main.getByRole('textbox', { name: 'Filter components' });
    await expect.element(input).toBeVisible();
    expect(input.element().getBoundingClientRect().right).toBeLessThanOrEqual(390);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    await userEvent.fill(input, 'no-such-component');
    await Promise.all(document.getAnimations().map((animation) => animation.finished));
    const empty = await axe.run(document.body);
    expect(empty.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) }))).toEqual([]);
    await userEvent.click(main.getByRole('combobox', { name: 'Release' }));
    await expect.element(screen.getByRole('option', { name: 'v0.1', exact: true })).toBeVisible();
    await Promise.all(document.getAnimations().map((animation) => animation.finished));
    const opened = await axe.run(screen.getByRole('listbox').element());
    expect(opened.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) }))).toEqual([]);
    await userEvent.keyboard('{Escape}');
    await expect.element(main.getByRole('combobox', { name: 'Release' })).toHaveFocus();
    const sort = main.getByRole('combobox', { name: 'Sort order' });
    await userEvent.click(sort);
    await expect.element(screen.getByRole('option', { name: 'Name A–Z', exact: true })).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    await Promise.all(document.getAnimations().map((animation) => animation.finished));
    expect((await axe.run(screen.getByRole('listbox').element())).violations).toEqual([]);
    await userEvent.keyboard('{Escape}');
    await expect.element(sort).toHaveFocus();
  });
}

test('sort labels render immediately, keyboard sorting stays within groups, and clear retains order', async () => {
  const screen = await mount();
  const main = screen.getByRole('main');
  const sort = main.getByRole('combobox', { name: 'Sort order' });
  await expect.element(sort).toHaveTextContent('Catalogue order');
  const groups = () => Array.from(main.element().querySelectorAll('ul')).map((list) =>
    Array.from(list.querySelectorAll('a[href^="/components/"]')).map((link) => link.getAttribute('href'))).filter((group) => group.length > 0);
  const original = groups();
  sort.element().focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(screen.getByRole('listbox')).toBeVisible();
  await userEvent.keyboard('{End}');
  await expect.element(screen.getByRole('option', { name: 'Name Z–A', exact: true })).toHaveAttribute('data-highlighted');
  await userEvent.keyboard('{Enter}');
  await expect.element(sort).toHaveTextContent('Name Z–A');
  expect(groups()).toEqual(original.map((group) => [...group].sort().reverse()));
  await expect.element(main.getByRole('button', { name: 'Clear filters' })).toBeDisabled();
  const input = main.getByRole('textbox', { name: 'Filter components' });
  await userEvent.fill(input, 'no-such-component');
  await userEvent.click(main.getByRole('button', { name: 'Clear filters' }));
  await expect.element(input).toHaveFocus();
  await expect.element(sort).toHaveTextContent('Name Z–A');
  expect(groups()).toEqual(original.map((group) => [...group].sort().reverse()));
  sort.element().focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(screen.getByRole('listbox')).toBeVisible();
  await userEvent.keyboard('{Home}{ArrowDown}');
  await expect.element(screen.getByRole('option', { name: 'Name A–Z', exact: true })).toHaveAttribute('data-highlighted');
  await userEvent.keyboard('{Enter}');
  await expect.element(sort).toHaveTextContent('Name A–Z');
  expect(groups()).toEqual(original.map((group) => [...group].sort()));
  sort.element().focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(screen.getByRole('listbox')).toBeVisible();
  await userEvent.keyboard('{Home}');
  await expect.element(screen.getByRole('option', { name: 'Catalogue order', exact: true })).toHaveAttribute('data-highlighted');
  await userEvent.keyboard('{Enter}');
  await expect.element(sort).toHaveTextContent('Catalogue order');
  expect(groups()).toEqual(original);
});
