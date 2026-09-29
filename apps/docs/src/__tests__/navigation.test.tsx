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
// Folded, the panel is `visibility: hidden` and so out of the accessibility tree a role query reads.
const menuPanel = () => document.querySelector<HTMLElement>(`nav[aria-label="${MENU_LABEL}"]`)!;
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
  expect([...site.element().querySelectorAll('a')].map((link) => link.textContent)).toEqual([
    'Install',
    'Components',
    'Tokens',
    'Studio',
  ]);
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

for (const path of ['/', '/install', '/tokens', '/components', '/components/button', '/theme-studio', '/lost-in-the-suite']) {
  test(`the first Tab on ${path} lands on the skip link, which hands focus to the content`, async () => {
    const screen = await mount(path);
    await expect.element(screen.getByRole('link', { name: 'Ultima home' })).toBeVisible();

    const skip = screen.getByRole('link', { name: 'Skip to content' }).element() as HTMLElement;
    expect(skip.getBoundingClientRect().height).toBeLessThanOrEqual(1);

    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(skip);
    expect(skip.getBoundingClientRect().height).toBeGreaterThan(1);
    expect(getComputedStyle(skip).outlineStyle).toBe('solid');

    await userEvent.keyboard('{Enter}');
    const content = document.getElementById('main')!;
    await expect.poll(() => document.activeElement).toBe(content);
    expect(content.contains(document.querySelector('header'))).toBe(false);
    expect(content.contains(menu().query())).toBe(false);

    await userEvent.keyboard('{Tab}');
    expect(content.contains(document.activeElement)).toBe(true);
  });
}

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

test('the header link for the current page reads text and medium weight through aria-current', async () => {
  prefer('dark');
  const screen = await mount('/components/button');
  const site = screen.getByRole('navigation', { name: 'Site', exact: true });
  await expect.element(site.getByRole('link', { name: 'Components' })).toBeVisible();

  const current = site.element().querySelectorAll('[aria-current="page"]');
  expect([...current].map((link) => link.textContent)).toEqual(['Components']);
  const text = getComputedStyle(screen.getByRole('heading', { name: 'Button', level: 1 }).element()).color;
  expect(getComputedStyle(current[0]!).color).toBe(text);
  expect(getComputedStyle(current[0]!).fontWeight).toBe('500');
  expect(getComputedStyle(current[0]!).backgroundColor).toBe('rgba(0, 0, 0, 0)');

  const resting = site.getByRole('link', { name: 'Tokens' }).element();
  expect(resting).not.toHaveAttribute('aria-current');
  expect(getComputedStyle(resting).color).not.toBe(text);
  expect(getComputedStyle(resting).fontWeight).toBe('400');
});

test('no chrome surface names the install page Documentation', async () => {
  for (const path of ['/', '/install', '/tokens', '/elements', '/rationale']) {
    const screen = await mount(path);
    await expect.poll(() => screen.container.querySelector('h1')).not.toBeNull();
    const installLinks = [...screen.container.querySelectorAll('a[href="/install"]')];
    expect(installLinks.length).toBeGreaterThan(0);
    expect(installLinks.map((link) => link.textContent?.trim())).not.toContain('Documentation');
  }
});

test('above the breakpoint the header carries the mode control and the footer hides its own', async () => {
  const screen = await mount('/');

  const footer = screen.container.querySelector('footer')!;
  expect(footer.textContent).toContain('ULTIMA / A SYSTEM FOR BUILDING INTERFACES');
  const control = screen.getByRole('group', { name: 'Color mode' });
  await expect.element(control).toBeVisible();
  expect(screen.container.querySelector('header')!.contains(control.element())).toBe(true);
  expect(getComputedStyle(footer.querySelector('[aria-label="Color mode"]')!).display).toBe('none');
});

test('the Studio, which renders no footer, keeps the mode control in its header', async () => {
  const screen = await mount('/theme-studio');
  const control = screen.getByRole('group', { name: 'Color mode' });
  await expect.element(control).toBeVisible();
  expect(screen.container.querySelector('header')!.contains(control.element())).toBe(true);
});

test('below the breakpoint the footer carries the mode control and the header hides its own', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));
  const screen = await mount('/install');

  const control = screen.getByRole('group', { name: 'Color mode' });
  await expect.element(control).toBeVisible();
  expect(screen.container.querySelector('footer')!.contains(control.element())).toBe(true);
  expect(getComputedStyle(screen.container.querySelector('header [aria-label="Color mode"]')!).display).toBe(
    'none',
  );
});

test('the mode control switches the theme', async () => {
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
  expect(docsLink.textContent).toBe('Install');
  expect(tokensTrail.querySelector('[aria-current="page"]')?.textContent).toBe('Tokens');

  const component = await mount('/components/alert-dialog');
  const componentTrail = component.container.querySelector('nav[aria-label="Breadcrumb"]')!;
  const sectionLink = componentTrail.querySelector('a[href="/components"]')!;
  expect(sectionLink.textContent).toBe('Components');
  const currentCrumb = componentTrail.querySelector('[aria-current="page"]')!;
  expect(currentCrumb.textContent).toBe('Alert Dialog');
  expect(currentCrumb).toHaveAttribute('href', '/components/alert-dialog');
  expect(componentTrail.querySelector('[role="presentation"]')?.textContent).toBe('/');
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
      .getByRole('link', { name: 'Install' })
      .element(),
  );
  const trail = screen.container.querySelector('nav[aria-label="Breadcrumb"]')!;
  expect(trail.querySelector('[aria-current="page"]')?.textContent).toBe('Install');
  expect(menu().element()).toHaveAttribute('data-open');
});

for (const theme of ['dark', 'light'] as const) {
  test(`a direct load of the home page renders the menu rail folded in ${theme}`, async () => {
    prefer(theme);
    const screen = await mount('/');
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();

    expect(menuPanel()).toHaveAttribute('data-closed');
    expect(menuPanel().getBoundingClientRect().width).toBe(0);
    // Hidden rather than only narrowed, so its links leave the tab order and the page reaches the viewport.
    expect(getComputedStyle(menuPanel()).visibility).toBe('hidden');
  });
}

test('leaving the home page slides the menu rail open rather than snapping it', async () => {
  const screen = await mount('/');
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();
  const panel = menuPanel();
  expect(panel).toHaveAttribute('data-closed');

  // Sampled on the frame the route opens the panel, before a 200ms transition can finish.
  const opened = new Promise<{ transitions: string[]; width: number }>((resolve) => {
    const observer = new MutationObserver(() => {
      if (!panel.hasAttribute('data-open')) return;
      observer.disconnect();
      resolve({
        transitions: panel.getAnimations().map((animation) => (animation as CSSTransition).transitionProperty),
        width: panel.getBoundingClientRect().width,
      });
    });
    observer.observe(panel, { attributes: true });
  });
  await userEvent.click(screen.getByRole('button', { name: 'Explore the components' }).element());

  const { transitions, width } = await opened;
  // Chromium names a logical property's transition by the physical one it resolves to.
  expect(transitions).toContain('width');
  expect(width).toBeLessThan(1);
  await expect.poll(() => panel.getBoundingClientRect().width).toBeGreaterThan(200);
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

for (const path of ['/install', '/']) {
  test(`below the breakpoint the header trigger opens the menu on ${path}, and a destination dismisses it`, async () => {
    await page.viewport(390, 844);
    onTestFinished(() => page.viewport(1280, 720));

    const screen = await mount(path);
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
}

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

test('the index stays right of the article and the menu scrolls without a visible bar', async () => {
  await page.viewport(2304, 720);
  onTestFinished(() => page.viewport(1280, 720));
  await mount('/install');
  await expect.element(page.getByRole('heading', { name: 'Install', level: 1 })).toBeVisible();

  const index = document.querySelector('aside[aria-label="On this page"]')!;
  expect(getComputedStyle(index).position).toBe('sticky');
  const article = document.querySelector('article')!.getBoundingClientRect();
  expect(article.right).toBeLessThanOrEqual(index.getBoundingClientRect().left);

  const navigation = menu().element();
  expect(navigation.querySelector('[data-orientation="vertical"]')).toBeNull();
  const viewport = navigation.querySelector<HTMLElement>('[role="presentation"][tabindex]')!;
  expect(getComputedStyle(viewport).scrollbarWidth).toBe('none');
  viewport.focus();
  await userEvent.keyboard('{End}');
  await expect.poll(() => viewport.scrollTop).toBeGreaterThan(0);
});

for (const width of [390, 1024, 1440]) {
  test(`the header logo stays aligned from home to the catalogue at ${width}px`, async () => {
    await page.viewport(width, 844);
    onTestFinished(() => page.viewport(1280, 720));
    const screen = await mount('/');
    const logo = () => screen.getByRole('link', { name: 'Ultima home' }).element().getBoundingClientRect().left;
    const before = logo();
    await userEvent.click(screen.getByRole('button', { name: 'Explore the components' }).element());
    await expect.element(screen.getByRole('heading', { name: 'Components', level: 1 })).toBeVisible();
    expect(logo()).toBe(before);
  });
}
