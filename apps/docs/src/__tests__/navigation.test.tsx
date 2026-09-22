import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import axe from 'axe-core';
import { beforeEach, expect, onTestFinished, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { RELEASES, components, componentsInRelease } from '../components';
import { componentPages, pages } from '../navigation';
import { router, routeTree } from '../router';
const NAVIGATION_STORAGE_KEY = 'ultima-navigation';
import { TextLink } from '../text-link';
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

const themeClasses = (mode: keyof typeof modes) => modes[mode].className?.split(/\s+/).filter(Boolean) ?? [];

/** ThemeRoot puts back the class the document carried when it mounted, which outlives its own test. */
function prefer(mode: keyof typeof modes) {
  const root = document.documentElement;
  root.classList.remove(...themeClasses('dark'), ...themeClasses('light'));
  root.classList.add(...themeClasses(mode));
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  onTestFinished(() => localStorage.removeItem(THEME_STORAGE_KEY));
}

const menu = () => page.getByRole('navigation', { name: MENU_LABEL, exact: true });
const menuLink = (name: string) => menu().getByRole('link', { name, exact: true });

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
  expect(componentPages.map(({ label }) => label)).toEqual(components.map(({ name }) => name));
  expect(componentPages.map(({ params }) => params?.name)).toEqual(
    RELEASES.flatMap((release) => componentsInRelease(release).map(({ item }) => item)),
  );
});

test('the header offers the workshop nav and hides the menu trigger on desktop', async () => {
  const screen = await mount('/');

  const site = screen.getByRole('navigation', { name: 'Site', exact: true });
  await expect.element(site.getByRole('link', { name: 'Components' })).toBeVisible();
  await expect.element(site.getByRole('link', { name: 'Tokens' })).toBeVisible();
  await expect.element(site.getByRole('link', { name: 'Documentation' })).toBeVisible();
  await expect.element(site.getByRole('link', { name: 'Studio' })).toBeVisible();
  await expect.element(screen.getByRole('link', { name: 'Ultima home' })).toBeVisible();
  expect(
    getComputedStyle(screen.container.querySelector('header button[aria-label="Toggle navigation"]')!)
      .display,
  ).toBe('none');
});

test('the chrome links fade their hover color on the fast motion token', async () => {
  const screen = await mount('/');
  const site = screen.getByRole('navigation', { name: 'Site', exact: true });
  await expect.element(site.getByRole('link', { name: 'Components' })).toBeVisible();

  const links = [
    ...screen.container.querySelectorAll('header a[href*="github"]'),
    ...screen.container.querySelectorAll('footer a'),
  ];
  expect(links.length).toBe(4);
  for (const link of links) {
    const style = getComputedStyle(link);
    expect(style.transitionProperty).toBe('color');
    expect(style.transitionDuration).toBe('0.12s');
  }
});

test('every site link shows the same focus ring', async () => {
  prefer('dark');
  const screen = await mount('/');
  const site = screen.getByRole('navigation', { name: 'Site', exact: true });
  await expect.element(site.getByRole('link', { name: 'Components' })).toBeVisible();

  const targets = new Set<Element>([
    site.getByRole('link', { name: 'Components' }).element(),
    screen.container.querySelector('header a[href*="github"]')!,
    screen.getByRole('link', { name: 'Installation guide' }).element(),
    screen.getByRole('link', { name: 'MIT license' }).element(),
  ]);
  for (let i = 0; i < 120 && targets.size > 0; i += 1) {
    await userEvent.keyboard('{Tab}');
    const focused = document.activeElement;
    if (focused && targets.has(focused)) {
      const style = getComputedStyle(focused);
      expect(style.outlineStyle).toBe('solid');
      expect(style.outlineWidth).toBe('2px');
      expect(style.outlineColor).toBe('rgb(131, 148, 255)');
      targets.delete(focused);
    }
  }
  expect(targets.size).toBe(0);
});

test('the inline link shows the same focus ring', async () => {
  prefer('dark');
  const screen = await render(<TextLink href="/tokens">/tokens</TextLink>);
  const link = screen.getByRole('link', { name: '/tokens' }).element();

  await userEvent.keyboard('{Tab}');

  expect(document.activeElement).toBe(link);
  const style = getComputedStyle(link);
  expect(style.outlineStyle).toBe('solid');
  expect(style.outlineWidth).toBe('2px');
  expect(style.outlineColor).toBe('rgb(131, 148, 255)');
});

test('the footer carries the mode control and the header does not', async () => {
  const screen = await mount('/');

  const footer = screen.container.querySelector('footer')!;
  expect(footer.textContent).toContain('ULTIMA / THE FINAL SPELL FOR YOUR INTERFACES');
  await expect.element(screen.getByRole('group', { name: 'Color mode' })).toBeVisible();
  expect(footer.contains(screen.getByRole('group', { name: 'Color mode' }).element())).toBe(true);
  expect(screen.container.querySelector('header [role="group"]')).toBeNull();
});

test('the footer mode control switches the theme', async () => {
  onTestFinished(() => localStorage.removeItem(THEME_STORAGE_KEY));
  const screen = await mount('/');

  await userEvent.click(screen.getByRole('button', { name: 'Light', exact: true }).element());

  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  expect([...document.documentElement.classList].some((name) => themeClasses('light').includes(name))).toBe(
    true,
  );
});

test('the article trail is a Breadcrumb landmark that links the section and marks the page current', async () => {
  const install = await mount('/install');
  const installTrail = install.container.querySelector('nav[aria-label="Breadcrumb"]')!;
  expect(installTrail.textContent).toBe('Install');
  expect(installTrail.querySelectorAll('[aria-current="page"]')).toHaveLength(1);

  const tokens = await mount('/tokens');
  const tokensTrail = tokens.container.querySelector('nav[aria-label="Breadcrumb"]')!;
  const docsLink = tokensTrail.querySelector('a[href="/install"]')!;
  expect(docsLink.textContent).toBe('Documentation');
  expect(tokensTrail.querySelector('[aria-current="page"]')?.textContent).toBe('Tokens');

  const component = await mount('/components/alert-dialog');
  const componentTrail = component.container.querySelector('nav[aria-label="Breadcrumb"]')!;
  const sectionLink = componentTrail.querySelector('a[href="/components"]')!;
  expect(sectionLink.textContent).toBe('Components');
  expect(componentTrail.querySelector('[aria-current="page"]')?.textContent).toBe(
    'Alert Dialog',
  );
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
  (menuLink('Studio').element() as HTMLElement).focus();
  await userEvent.keyboard('{Tab}');
  expect(document.activeElement).toBe(menuLink('Button').element());
});

test('the logo returns to the editorial home page, which folds the menu rail away', async () => {
  const screen = await mount('/install');
  expect(menu().element()).toHaveAttribute('data-open');
  await userEvent.click(screen.getByRole('link', { name: 'Ultima home' }).element());
  await expect.element(screen.getByRole('heading', { level: 1, name: /Good interfaces/ })).toBeVisible();
  expect(menu().element()).toHaveAttribute('data-closed');
  await userEvent.click(
    screen
      .getByRole('navigation', { name: 'Site', exact: true })
      .getByRole('link', { name: 'Documentation' })
      .element(),
  );
  const trail = screen.container.querySelector('nav[aria-label="Breadcrumb"]')!;
  expect(trail.querySelector('[aria-current="page"]')?.textContent).toBe('Install');
  expect(menu().element()).toHaveAttribute('data-open');
});

test('a legacy collapsed preference cannot hide desktop navigation', async () => {
  localStorage.setItem(NAVIGATION_STORAGE_KEY, 'closed');
  await mount('/install');
  await expect.element(menuLink('Home')).toBeVisible();
  expect(menu().element()).toHaveAttribute('data-open');
});

test('the panel scrolls the whole catalogue inside the viewport', async () => {
  await mount('/components/button');
  const panel = menu().element();

  await expect.element(menuLink('Toggle Group')).toBeVisible();
  const viewport = panel.querySelector<HTMLElement>('[role="presentation"][tabindex]');
  expect(viewport).not.toBeNull();
  expect(viewport!.scrollHeight).toBeGreaterThan(viewport!.clientHeight);
  expect(panel.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
});

test('a long page scrolls the document while the chrome and the menu rail stay put', async () => {
  const screen = await mount('/components/button');
  await expect.element(page.getByRole('heading', { name: 'Button', level: 1 })).toBeVisible();

  expect(document.documentElement.scrollHeight).toBeGreaterThan(window.innerHeight);
  window.scrollTo(0, 400);
  await expect.poll(() => window.scrollY).toBeGreaterThan(0);

  const header = screen.container.querySelector('header')!;
  expect(getComputedStyle(header).position).toBe('sticky');
  expect(header.getBoundingClientRect().top).toBe(0);

  const panel = menu().element();
  expect(getComputedStyle(panel).position).toBe('sticky');
  expect(panel.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);

  const index = document.querySelector('aside[aria-label="On this page"]')!;
  expect(getComputedStyle(index).position).toBe('sticky');
  expect(index.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);

  expect(screen.container.querySelector('footer')!.getBoundingClientRect().bottom).toBeGreaterThan(
    window.innerHeight,
  );
  window.scrollTo(0, 0);
});

test('the panel and index reach the viewport bottom and still clear the footer', async () => {
  const screen = await mount('/components/button');
  await expect.element(page.getByRole('heading', { name: 'Button', level: 1 })).toBeVisible();

  const panel = menu().element();
  expect(Math.abs(panel.getBoundingClientRect().bottom - window.innerHeight)).toBeLessThan(1);

  const index = document.querySelector('aside[aria-label="On this page"]')!;
  const indexStyle = getComputedStyle(index);
  expect(parseFloat(indexStyle.maxHeight)).toBeCloseTo(window.innerHeight - parseFloat(indexStyle.top), 0);

  const footer = screen.container.querySelector('footer')!;
  window.scrollTo(0, document.documentElement.scrollHeight);
  await expect.poll(() => footer.getBoundingClientRect().top).toBeLessThan(window.innerHeight);
  expect(panel.getBoundingClientRect().bottom).toBeLessThanOrEqual(footer.getBoundingClientRect().top);
  window.scrollTo(0, 0);
});

test('a short page rests the footer on the viewport bottom', async () => {
  const screen = await mount('/lost-in-the-suite');
  await expect.element(screen.getByRole('heading', { name: 'Lost in the aether' })).toBeVisible();

  expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(window.innerHeight);
  const footer = screen.container.querySelector('footer')!.getBoundingClientRect();
  expect(Math.abs(footer.bottom - window.innerHeight)).toBeLessThan(2);
});

test('a fresh navigation lands at the top and back restores the scroll position', async () => {
  const history = createMemoryHistory({ initialEntries: ['/components/button'] });
  const screen = await render(
    <RouterProvider router={createRouter({ routeTree, history, scrollRestoration: true })} />,
  );
  await expect.element(page.getByRole('heading', { name: 'Button', level: 1 })).toBeVisible();

  window.scrollTo(0, 300);
  await expect.poll(() => window.scrollY).toBe(300);

  await userEvent.click(menuLink('Alert').element());
  await expect.element(screen.getByRole('heading', { name: 'Alert', level: 1 })).toBeVisible();
  await expect.poll(() => window.scrollY).toBe(0);

  history.back();
  await expect.element(page.getByRole('heading', { name: 'Button', level: 1 })).toBeVisible();
  await expect.poll(() => window.scrollY).toBe(300);
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
  expect(document.querySelector(`nav[aria-label="${MENU_LABEL}"]`)).toBeNull();

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
  const screen = await mount('/install');
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

test('the index rides a sticky grid column right of the article and the menu paints a styled bar', async () => {
  await page.viewport(2304, 720);
  onTestFinished(() => page.viewport(1280, 720));
  await mount('/install');
  await expect.element(page.getByRole('heading', { name: 'Install', level: 1 })).toBeVisible();

  const index = document.querySelector('aside[aria-label="On this page"]')!;
  expect(getComputedStyle(index).position).toBe('sticky');
  const article = document.querySelector('article')!.getBoundingClientRect();
  expect(article.right).toBeLessThanOrEqual(index.getBoundingClientRect().left);

  const navigation = menu().element();
  expect(getComputedStyle(navigation).scrollbarWidth).not.toBe('none');
  await expect.poll(() => navigation.querySelector('[data-orientation="vertical"]')).not.toBeNull();
  const viewport = navigation.querySelector<HTMLElement>('[role="presentation"][tabindex]')!;
  viewport.scrollTop = 100;
  expect(viewport.scrollTop).toBeGreaterThan(0);
});
