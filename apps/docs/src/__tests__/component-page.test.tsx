import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import axe from 'axe-core';
import { expect, onTestFinished, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { components } from '../components';
import { componentPages } from '../generated/component-pages';
import { proseComponents } from '../prose';
import { renderWithRouter } from './render-with-router';
import { routeTree } from '../router';
import { THEME_STORAGE_KEY } from '../theme';
// axe resolves a text contrast against the nearest painted ancestor, and the ground is on `body`.
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

function seedDocumentTheme(mode: keyof typeof modes) {
  const root = document.documentElement;
  root.classList.remove(...themeClasses('dark'), ...themeClasses('light'));
  root.classList.add(...themeClasses(mode));
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  onTestFinished(() => localStorage.removeItem(THEME_STORAGE_KEY));
}

async function at(width: number, path: string) {
  await page.viewport(width, 900);
  onTestFinished(() => page.viewport(1280, 720));
  const screen = await mount(path);
  await expect.element(screen.getByRole('main').getByRole('heading', { level: 1 }).first()).toBeVisible();
  return screen;
}

const text = (node: Element | null) => node?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

test('Button opens on a running head, its title, the source facts and the install command', async () => {
  const screen = await at(1440, '/components/button');
  const article = document.querySelector('article')!;

  expect([...article.querySelector('p')!.children].map(text)).toEqual(['Plate 008', '@ultima/button', 'Base UI · Button']);
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Button' })).toBeVisible();

  const facts = [...article.querySelectorAll('dl')].map((row) => [
    text(row.querySelector('dt')),
    text(row.querySelector('dd')),
    row.querySelector('a')?.getAttribute('href'),
  ]);
  expect(facts).toEqual([
    ['Source', 'button.tsx', 'https://github.com/frankieramirez/ultima/blob/main/packages/ui/src/button.tsx'],
    ['Primitive', 'Base UI Button', 'https://base-ui.com/react/components/button'],
    ['HTML element', '<ult-button>', '#web-component'],
  ]);

  const managers = screen.getByRole('tablist', { name: 'Package manager' });
  await expect.element(managers.getByRole('tab', { name: 'npx' })).toHaveAttribute('aria-selected', 'true');
  await expect.element(screen.getByText('npx shadcn add @ultima/button', { exact: true })).toBeVisible();
  await userEvent.click(managers.getByRole('tab', { name: 'pnpm' }));
  await expect.element(screen.getByText('pnpm dlx shadcn add @ultima/button', { exact: true })).toBeVisible();
  await userEvent.click(managers.getByRole('tab', { name: 'bun' }));
  await expect.element(screen.getByText('bunx shadcn add @ultima/button', { exact: true })).toBeVisible();
});

test('the sections are numbered, the examples are plates, and the rail lists the sections', async () => {
  const screen = await at(1440, '/components/button');
  const article = document.querySelector('article')!;

  expect([...article.querySelectorAll('h2')].map(text)).toEqual(['Examples', 'Props', 'Accessibility', 'Web component']);
  for (const [name, value] of [
    ['Examples', '§ 01'],
    ['Props', '§ 02'],
    ['Accessibility', '§ 03'],
  ]) {
    const heading = screen.getByRole('heading', { level: 2, name }).element();
    expect(text(heading.previousElementSibling)).toBe(value);
  }
  const rail = screen.getByRole('complementary', { name: 'On this page' }).element();
  expect([...rail.querySelectorAll('a')].map((link) => [text(link.querySelector('[aria-hidden]')), link.lastChild?.textContent])).toEqual([
    ['01', 'Examples'],
    ['02', 'Props'],
    ['03', 'Accessibility'],
    ['··', 'Web component'],
  ]);

  const plates = [...article.querySelectorAll('figure')].filter((figure) => figure.querySelector('h3'));
  expect(plates.map((figure) => text(figure.querySelector('h3')))).toEqual(['Variants', 'Sizes', 'Tones', 'Disabled']);
  expect(text(plates[0]!.querySelector('figcaption'))).toBe('Choose the emphasis an action needs.');
  const [variants, sizes] = plates.map((figure) => figure.getBoundingClientRect());
  expect(variants!.top).toBe(sizes!.top);
  expect(Math.abs(variants!.width - sizes!.width)).toBeLessThanOrEqual(1);
  expect(sizes!.left).toBeGreaterThan(variants!.right);
  await expect.element(screen.getByRole('heading', { level: 3, name: 'With an icon' })).toBeVisible();

  const notes = screen.getByRole('heading', { level: 2, name: 'Accessibility' }).element().closest('section')!;
  expect([...notes.querySelectorAll('h3')].map(text)).toEqual(['Name', 'Focus ring', 'Keyboard']);
});

test('the pager steps to the neighbours in catalogue-number order', async () => {
  const screen = await at(1440, '/components/button');
  const pager = screen.getByRole('navigation', { name: 'Previous and next components' });
  await expect.element(pager.getByRole('link', { name: /Previous · 007\s*Breadcrumb/ })).toBeVisible();
  await userEvent.click(pager.getByRole('link', { name: /Next · 009\s*Button Group/ }));
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Button Group' })).toBeVisible();
  await screen.unmount();

  const first = [...components].sort((a, b) => a.number.localeCompare(b.number))[0]!;
  const opening = await mount(`/components/${first.item}`);
  const ends = opening.getByRole('navigation', { name: 'Previous and next components' }).element();
  expect(ends.querySelectorAll('a')).toHaveLength(1);
  expect(text(ends)).toMatch(/^Next · 002/);
});

test('below the breakpoint the Docs bar runs edge to edge with the trail and the section menu', async () => {
  const screen = await at(390, '/components/button');
  const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
  await expect.element(trail.getByRole('link', { name: 'Components' })).toHaveAttribute('href', '/components');
  await expect.element(trail.getByRole('link', { name: 'Button' })).toHaveAttribute('aria-current', 'page');

  const bar = trail.element().parentElement!;
  expect(bar.getBoundingClientRect().left).toBe(0);
  expect(bar.getBoundingClientRect().width).toBe(390);
  const rule = bar.nextElementSibling!;
  expect(rule.getAttribute('role')).toBe('separator');
  expect(rule.getBoundingClientRect().width).toBe(390);

  await userEvent.click(screen.getByRole('button', { name: 'On this page' }));
  const menu = page.getByRole('menu');
  await expect.element(menu.getByRole('menuitem', { name: 'Props' })).toHaveAttribute('href', '#props');
  expect([...menu.element().querySelectorAll('[role="menuitem"]')].map(text)).toEqual([
    'Examples',
    'Props',
    'Accessibility',
    'Web component',
  ]);
  await userEvent.keyboard('{Escape}');

  const plates = [...document.querySelectorAll('article figure')].slice(0, 2).map((figure) => figure.getBoundingClientRect());
  expect(plates[1]!.top).toBeGreaterThan(plates[0]!.bottom);
});

test('below the breakpoint three examples show and one control opens the rest', async () => {
  const screen = await at(390, '/components/button');
  const later = screen.getByRole('heading', { level: 3, name: 'Disabled' });
  await expect.element(screen.getByRole('heading', { level: 3, name: 'Tones' })).toBeVisible();
  expect(later.query()).toBeNull();
  const more = screen.getByRole('button', { name: '2 more examples' });
  await expect.element(more).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(more);
  await expect.element(later).toBeVisible();
  await expect.element(screen.getByRole('heading', { level: 3, name: 'With an icon' })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Fewer examples' })).toHaveAttribute('aria-expanded', 'true');
});

test('a link into a folded example opens the rest', async () => {
  await page.viewport(390, 900);
  onTestFinished(() => page.viewport(1280, 720));
  const screen = await mount('/components/button#with-an-icon');
  await expect.element(screen.getByRole('heading', { level: 3, name: 'With an icon' })).toBeVisible();
});

test('below the breakpoint a props table reads as one entry per prop', async () => {
  const screen = await at(390, '/components/button');
  const section = screen.getByRole('heading', { level: 2, name: 'Props' }).element().closest('section')!;
  expect(section.querySelector('table')!.checkVisibility()).toBe(false);
  const entries = [...section.querySelectorAll('li')];
  expect(entries.map((entry) => text(entry.querySelector('span')))).toEqual(['variant', 'size', 'tone', 'style', 'render']);
  expect(text(entries[0]!)).toContain("default 'solid'");
});

test('above the breakpoint the Docs bar is gone and the running head names the package', async () => {
  await at(1440, '/components/button');
  expect(document.querySelector('article nav[aria-label="Breadcrumb"]')!.checkVisibility()).toBe(false);
});

for (const mode of ['dark', 'light'] as const)
  for (const width of [390, 1440])
    test(`every component page renders without horizontal overflow at ${width}px in ${mode}`, async () => {
      await page.viewport(width, 900);
      onTestFinished(() => page.viewport(1280, 720));
      seedDocumentTheme(mode);
      const overflowing: string[] = [];
      for (const { item } of components) {
        const screen = await mount(`/components/${item}`);
        await expect.element(screen.getByRole('main').getByRole('heading', { level: 1 }).first()).toBeVisible();
        if (document.documentElement.scrollWidth > width) overflowing.push(item);
        await screen.unmount();
      }
      expect(overflowing).toEqual([]);
    });

for (const mode of ['dark', 'light'] as const)
  for (const width of [1440, 390])
    for (const item of ['button', 'dialog', 'table', 'sidebar'])
      test(`/components/${item} passes axe at ${width}px in ${mode}`, async () => {
        seedDocumentTheme(mode);
        await at(width, `/components/${item}`);
        const results = await axe.run(document.body);
        expect(results.violations.map(({ id, nodes }) => `${id}: ${nodes.map(({ html }) => html).join(', ')}`)).toEqual([]);
      });

test('a prose section between the examples stands as its own numbered section, never folded', async () => {
  const screen = await at(390, '/components/accordion');
  const article = document.querySelector('article')!;
  expect([...article.querySelectorAll('h2')].map(text)).toEqual([
    'Examples',
    'The heading level is yours',
    'Panel content padding',
    'Explicit values',
    'Which disclosure, where',
    'Props',
    'Accessibility',
  ]);
  const examples = screen.getByRole('heading', { level: 2, name: 'Examples' }).element().closest('section')!;
  const titles = [...examples.querySelectorAll('h3')].filter((heading) => !heading.closest('[data-component-preview]'));
  expect(titles.map(text)).toEqual(['The trigger is the control', 'A caret', 'Controlled']);
  expect(screen.getByRole('button', { name: /more example/ }).query()).toBeNull();
  await expect.element(screen.getByRole('heading', { level: 2, name: 'Which disclosure, where' })).toBeVisible();
  expect(text(screen.getByRole('heading', { level: 2, name: 'Panel content padding' }).element().previousElementSibling)).toBe('§ 03');
});

test('a prose section before the first example leads the page', async () => {
  await at(1440, '/components/table');
  const headings = [...document.querySelectorAll('article h2')].map(text);
  expect(headings.slice(0, 2)).toEqual(['Anatomy', 'Examples']);
  const rail = document.querySelector('aside[aria-label="On this page"]')!;
  expect([...rail.querySelectorAll('a')].map((link) => link.lastChild?.textContent)).toContain('Anatomy');
});

test('every paragraph a component page authors at the top level reaches the rendered article', async () => {
  const missing: string[] = [];
  for (const { item } of components) {
    const Content = componentPages[item]!;
    const authored = await renderWithRouter(<div data-authored><Content components={proseComponents} /></div>);
    await expect.element(authored.getByRole('heading', { level: 1 }).first()).toBeVisible();
    const paragraphs = [...document.querySelectorAll('[data-authored] > p')].map(text);
    await authored.unmount();
    expect(paragraphs.length).toBeGreaterThan(0);

    const screen = await mount(`/components/${item}`);
    await expect.element(screen.getByRole('main').getByRole('heading', { level: 1 }).first()).toBeVisible();
    const article = text(document.querySelector('article'));
    for (const paragraph of paragraphs) if (!article.includes(paragraph)) missing.push(`${item}: ${paragraph.slice(0, 60)}`);
    await screen.unmount();
  }
  expect(missing).toEqual([]);
});

test('paging to another component lays its plates out as a fresh load does', async () => {
  const widths = () =>
    [...document.querySelectorAll('article figure')]
      .filter((figure) => figure.querySelector('h3'))
      .map((figure) => Math.round(figure.getBoundingClientRect().width));
  const paged = await at(1440, '/components/tabs');
  await userEvent.click(paged.getByRole('navigation', { name: 'Previous and next components' }).getByRole('link', { name: /Next/ }));
  await expect.element(paged.getByRole('heading', { level: 1, name: 'Textarea' })).toBeVisible();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const afterPaging = widths();
  await paged.unmount();

  const fresh = await mount('/components/textarea');
  await expect.element(fresh.getByRole('heading', { level: 1, name: 'Textarea' })).toBeVisible();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  expect(afterPaging.length).toBeGreaterThan(0);
  expect(afterPaging).toEqual(widths());
});

for (const width of [1440, 390]) {
  test(`inline code sizes to its plate caption, body prose and table cell at ${width}`, async () => {
    const screen = await at(width, '/components/calendar');
    const article = document.querySelector('article')!;
    const places = {
      caption: article.querySelector('figcaption code'),
      prose: [...article.querySelectorAll('p code')].find((code) => !code.closest('figcaption')),
      cell: article.querySelector('td code'),
    };
    const size = (node: Element) => parseFloat(getComputedStyle(node).fontSize);
    for (const [place, code] of Object.entries(places)) {
      expect(code, place).toBeTruthy();
      expect(size(code!) / size(code!.parentElement!), place).toBeGreaterThan(0.86);
      expect(size(code!) / size(code!.parentElement!), place).toBeLessThan(0.89);
    }
    await userEvent.click(screen.getByRole('tab', { name: 'Code' }).first());
    const blocks = [...article.querySelectorAll('pre')];
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) expect(getComputedStyle(block).fontSize).toBe('14px');
  });
}
