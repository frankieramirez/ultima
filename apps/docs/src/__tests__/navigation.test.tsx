import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import axe from 'axe-core';
import { beforeEach, expect, onTestFinished, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { components } from '../components';
import { componentPages, pages } from '../navigation';
import { router, routeTree } from '../router';
const NAVIGATION_STORAGE_KEY = 'ultima-navigation';
import { THEME_STORAGE_KEY } from '../theme';
import { MENU_LABEL } from '../site-menu';
// axe resolves a text contrast against the nearest painted ancestor, and the application's ground
// is on `body` rather than on a component, so without this the shell is measured over nothing.
import '../styles.css';

function mount(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });
  return render(<RouterProvider router={createRouter({ routeTree, history })} />);
}

const modes = {
  dark: stylex.props(darkTheme, colorScheme.dark),
  light: stylex.props(lightTheme, colorScheme.light),
};

const themeClasses = (mode: keyof typeof modes) =>
  modes[mode].className?.split(/\s+/).filter(Boolean) ?? [];

/** ThemeRoot puts back the class the document carried when it mounted, which outlives its own test. */
function prefer(mode: keyof typeof modes) {
  const root = document.documentElement;
  root.classList.remove(...themeClasses('dark'), ...themeClasses('light'));
  root.classList.add(...themeClasses(mode));
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  onTestFinished(() => localStorage.removeItem(THEME_STORAGE_KEY));
}

const menu = () => page.getByRole('navigation', { name: MENU_LABEL, exact: true });
const menuLink = (name: string) => menu().getByRole('link', { name: `--${name.toLowerCase().replaceAll(' ', '-')}`, exact: true });

beforeEach(() => {
  localStorage.removeItem(NAVIGATION_STORAGE_KEY);
});

test('every destination in the menu is a route the router serves', () => {
  const served = new Set(Object.keys(router.routesByPath));
  const destinations = [...pages, ...componentPages].map(({ to }) => to);

  expect(destinations.length).toBe(pages.length + components.length);
  expect(destinations.filter((to) => !served.has(to))).toEqual([]);
});

test('the menu derives its component entries from the catalogue release field', () => {
  expect(componentPages.map(({ params }) => params?.name)).toEqual(components.map(({ item }) => item));
  expect(componentPages.map(({ label }) => label)).toEqual(components.map(({ item }) => `--${item}`));
  expect(components.map(({ release }) => release)).toEqual(components.map(() => 'v0'));
});

test('the header offers a home link and hides the menu trigger on desktop', async () => {
  const screen = await mount('/');

  const navigations = document.querySelectorAll('nav');
  expect(navigations.length).toBe(1);
  expect(navigations[0]).toHaveAttribute('aria-label', MENU_LABEL);
  await expect.element(screen.getByRole('link', { name: 'Ultima home' })).toBeVisible();
  expect(getComputedStyle(screen.container.querySelector('header button[aria-label="Toggle navigation"]')!).display).toBe('none');
  await expect.element(screen.getByRole('group', { name: 'Color mode' })).toBeVisible();
});

test('a direct load of a component page marks that link current in the flat catalogue', async () => {
  await mount('/components/sidebar');
  await expect.element(menuLink('Sidebar')).toBeVisible();

  expect(menuLink('Sidebar').element()).toHaveAttribute('aria-current', 'page');
  expect(menu().element().querySelectorAll('[aria-current="page"]').length).toBe(1);
  await expect.element(menuLink('Button')).toBeVisible();
});

test('the overview link stays resting on a component page, so one link is current per set', async () => {
  await mount('/components/button');
  await expect.element(menuLink('Button')).toBeVisible();

  expect(menuLink('Home').element()).not.toHaveAttribute('aria-current');
  expect(menuLink('Button').element()).toHaveAttribute('aria-current', 'page');
});

test('choosing a destination routes, moves the current row, and focuses the new heading', async () => {
  const screen = await mount('/install');
  await expect.element(menuLink('Tokens')).toBeVisible();

  await userEvent.click(menuLink('Tokens').element());

  const heading = screen.getByRole('heading', { name: 'Tokens', level: 1 });
  await expect.element(heading).toBeVisible();
  expect(menuLink('Tokens').element()).toHaveAttribute('aria-current', 'page');
  await expect.poll(() => document.activeElement).toBe(heading.element());
});

test('a direct load leaves focus alone', async () => {
  await mount('/tokens');

  await expect.element(page.getByRole('heading', { name: 'Tokens', level: 1 })).toBeVisible();
  expect(document.activeElement).toBe(document.body);
});

test('the flat catalogue follows the page links in keyboard order', async () => {
  await mount('/install');
  await expect.element(menuLink('Install')).toBeVisible();
  (menuLink('Rationale').element() as HTMLElement).focus();
  await userEvent.keyboard('{Tab}');
  expect(document.activeElement).toBe(menuLink('Button').element());
});

test('the logo returns to home without hiding desktop navigation', async () => {
  const screen = await mount('/install');
  await userEvent.click(screen.getByRole('link', { name: 'Ultima home' }).element());
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Exceptional interfaces. Down to the variable.' })).toBeVisible();
  expect(document.querySelector('nav')).toHaveAttribute('data-open');
});

test('a legacy collapsed preference cannot hide desktop navigation', async () => {
  localStorage.setItem(NAVIGATION_STORAGE_KEY, 'closed');
  await mount('/');
  expect(document.querySelector('nav')).toHaveAttribute('data-open');
});

test('the panel scrolls the whole catalogue inside the viewport', async () => {
  await mount('/components/button');
  const panel = menu().element();

  await expect.element(menuLink('Toggle Group')).toBeVisible();
  expect(panel.scrollHeight).toBeGreaterThan(panel.clientHeight);
  expect(panel.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
});

test('long component examples scroll inside the shell without a second page scrollbar', async () => {
  await mount('/components/button');
  await expect.element(page.getByRole('heading', { name: 'Button', level: 1 })).toBeVisible();

  expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(window.innerHeight);
});

for (const theme of ['dark', 'light'] as const) {
  test(`the landing page passes axe in ${theme}`, async () => {
    prefer(theme);
    const screen = await mount('/');
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();

    const results = await axe.run(document.body);
    expect(results.violations.map(describe)).toEqual([]);
  });

  test(`the shell passes axe in ${theme}`, async () => {
    prefer(theme);
    const screen = await mount('/components');
    await expect.element(screen.getByRole('heading', { name: 'Components', level: 1 })).toBeVisible();

    const results = await axe.run(document.body);
    expect(results.violations.map(describe)).toEqual([]);
  });
}

test('below the breakpoint the header trigger opens the menu, and a destination dismisses it', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));

  const screen = await mount('/install');
  expect(document.querySelector('nav')).toBeNull();

  await userEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }).element());
  const popup = screen.getByRole('dialog', { name: MENU_LABEL }).element();
  await expect.poll(() => popup.contains(document.activeElement)).toBe(true);

  await userEvent.click(menuLink('Palette').element());

  await expect.poll(() => document.querySelector('[role="dialog"]')).toBeNull();
  const heading = screen.getByRole('heading', { name: 'Palette', level: 1 });
  await expect.element(heading).toBeVisible();
  await expect.poll(() => document.activeElement).toBe(heading.element());
});

test('the close control dismisses the menu and hands focus back to the trigger', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));

  const screen = await mount('/');
  const trigger = screen.getByRole('button', { name: 'Toggle navigation' }).element();
  await userEvent.click(trigger);
  await expect.element(screen.getByRole('dialog', { name: MENU_LABEL })).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Close navigation' }).element());

  await expect.poll(() => document.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

test('the close control is not rendered above the breakpoint', async () => {
  const screen = await mount('/');
  await expect.element(menuLink('Home')).toBeVisible();

  expect(screen.container.querySelector('[aria-label="Close navigation"]')).toBeNull();
});

for (const theme of ['dark', 'light'] as const) {
  test(`the open mobile menu passes axe in ${theme}`, async () => {
    await page.viewport(390, 844);
    onTestFinished(() => page.viewport(1280, 720));
    prefer(theme);

    const screen = await mount('/install');
    await userEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }).element());
    const popup = screen.getByRole('dialog', { name: MENU_LABEL });
    await expect.element(popup).toBeVisible();

    // The sweep is the menu itself: the page behind it sits under Dialog's backdrop, and axe reads
    // a dimmed header as text that fails contrast rather than as content a reader is done with.
    const results = await axe.run(popup.element());
    expect(results.violations.map(describe)).toEqual([]);
  });
}

function describe(violation: axe.Result) {
  return `${violation.id}: ${violation.nodes.map((node) => node.html).join(', ')}`;
}


test('wide articles are centered on the viewport and the menu scrolls without a visible bar', async () => {
  await page.viewport(2304, 720);
  onTestFinished(() => page.viewport(1280, 720));
  await mount('/install');
  await expect.element(page.getByRole('heading', { name: 'Install', level: 1 })).toBeVisible();
  const article = document.querySelector('article')!.getBoundingClientRect();
  expect(Math.abs(article.left + article.width / 2 - window.innerWidth / 2)).toBeLessThan(1);
  const navigation = document.querySelector('nav')!;
  expect(getComputedStyle(navigation).scrollbarWidth).toBe('none');
  navigation.scrollTop = 100;
  expect(navigation.scrollTop).toBeGreaterThan(0);
});
