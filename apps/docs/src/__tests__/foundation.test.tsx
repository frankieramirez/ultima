import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import axe from 'axe-core';
import { expect, onTestFinished, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { setupItems } from '../../../../registry/items.config';
import installSource from '../../../../packages/cli/src/install.ts?raw';
import { INSTALL_WRITES } from '../cli-install';
import { pages } from '../navigation';
import { routeTree } from '../router';
import { THEME_STORAGE_KEY } from '../theme';
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

function prefer(mode: keyof typeof modes) {
  const root = document.documentElement;
  root.classList.remove(...themeClasses('dark'), ...themeClasses('light'));
  root.classList.add(...themeClasses(mode));
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  onTestFinished(() => localStorage.removeItem(THEME_STORAGE_KEY));
}

const FOUNDATIONS = [
  { path: '/install', title: 'Install', place: '02', previous: 'Home', next: 'CLI' },
  { path: '/cli', title: 'CLI', place: '03', previous: 'Install', next: 'Elements' },
  { path: '/elements', title: 'Elements', place: '04', previous: 'CLI', next: 'Tokens' },
  { path: '/tokens', title: 'Tokens', place: '05', previous: 'Elements', next: 'Palette' },
  { path: '/palette', title: 'Palette', place: '06', previous: 'Tokens', next: 'Rationale' },
  { path: '/rationale', title: 'Rationale', place: '07', previous: 'Palette', next: 'Studio' },
];

for (const { path, title, place, previous, next } of FOUNDATIONS) {
  test(`${path} leads with its running head and ends with the previous and next pages`, async () => {
    const screen = await mount(path);
    await expect.element(screen.getByRole('heading', { name: title, level: 1 })).toBeVisible();
    expect(document.querySelector('main')?.textContent).toContain(`Foundations · ${place}`);

    const pager = screen.getByRole('navigation', { name: 'Previous and next page' });
    const links = [...pager.element().querySelectorAll('a')].map((link) => link.textContent);
    expect(links).toEqual([`Previous${previous}`, `Next${next}`]);
  });

  for (const mode of ['dark', 'light'] as const) {
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
    ] as const) {
      test(`${path} passes axe and does not overflow in ${mode} at ${width}`, async () => {
        await page.viewport(width, height);
        onTestFinished(() => page.viewport(1280, 720));
        prefer(mode);
        const screen = await mount(path);
        await expect.element(screen.getByRole('heading', { name: title, level: 1 })).toBeVisible();

        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
        const results = await axe.run(document.body);
        expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.html).join(', ')}`)).toEqual([]);
      });
    }
  }
}

test('a trailing slash still finds the page in the site order', async () => {
  const screen = await mount('/install/');
  await expect.element(screen.getByRole('heading', { name: 'Install', level: 1 })).toBeVisible();
  expect(document.querySelector('main')?.textContent).toContain('Foundations · 02');
  const pager = screen.getByRole('navigation', { name: 'Previous and next page' });
  expect([...pager.element().querySelectorAll('a')].map((link) => link.textContent)).toEqual(['PreviousHome', 'NextCLI']);
});

test('the section number stays out of the heading name', async () => {
  const screen = await mount('/install');
  await expect.element(screen.getByRole('heading', { name: 'Commands', exact: true, level: 2 })).toBeVisible();
});

test('each hand step says whether doctor checks it, from the setup item', async () => {
  const screen = await mount('/install');
  await expect.element(screen.getByRole('heading', { name: 'Steps you still do by hand' })).toBeVisible();
  const steps = [...setupItems['setup-vite'].handSteps, ...setupItems['setup-next'].handSteps];
  const badges = [...document.querySelectorAll('main li')].map((item) => item.textContent ?? '');
  expect(badges.filter((text) => text.endsWith('doctor checks this'))).toHaveLength(steps.filter((step) => step.assertion).length);
  expect(badges.filter((text) => text.endsWith("can't be checked"))).toHaveLength(steps.filter((step) => step.unverifiable).length);
});

test('the CLI commands table marks status and diff as the only network commands', async () => {
  const screen = await mount('/cli');
  await expect.element(screen.getByRole('heading', { name: 'Commands' })).toBeVisible();
  const rows = [...document.querySelectorAll('main tbody tr')].map((row) =>
    [...row.querySelectorAll('td')].map((cell) => cell.textContent?.trim()),
  );
  expect(rows.map(([command]) => command)).toEqual([
    'npx ultima-design install',
    'npx ultima-design doctor',
    'npx ultima-design check',
    'npx ultima-design status',
    'npx ultima-design diff <item>',
    'npx ultima-design uninstall',
  ]);
  expect(rows.filter((row) => row[3] === 'Yes').map(([command]) => command)).toEqual([
    'npx ultima-design status',
    'npx ultima-design diff <item>',
  ]);
});

async function railOf(path: string) {
  await page.viewport(1440, 900);
  onTestFinished(() => page.viewport(1280, 720));
  const screen = await mount(path);
  const rail = screen.getByRole('complementary', { name: 'On this page' });
  await expect.element(rail).toBeInTheDocument();
  return [...rail.element().querySelectorAll('li')].map((item) => item.textContent?.replace(/^(\d+|··)/, '$1 '));
}

const RAILS: Record<string, string[]> = {
  '/install': [
    '01 Commands',
    '02 What the setup item installs',
    '03 Steps you still do by hand',
    '04 Tokens without StyleX',
    '05 Web components',
    '06 For an agent',
    '07 Theme adoption',
    '08 Where to go next',
  ],
  '/cli': ['01 Install', '02 Commands', '03 In CI', '04 Other skill installers'],
  '/elements': ['01 Install', '02 How an element reads', '03 Styling', '04 The catalogue'],
  '/rationale': ['01 StyleX', '02 Base UI', '03 Registry-first', '04 Dark-first', '·· Every decision record'],
};

for (const [path, expected] of Object.entries(RAILS)) {
  test(`${path} numbers its section index`, async () => {
    expect(await railOf(path)).toEqual(expected);
  });
}

test('/tokens numbers its section index', async () => {
  const rail = await railOf('/tokens');
  expect(rail.length).toBeGreaterThan(0);
  expect(rail.map((entry) => entry?.slice(0, 2))).toEqual(rail.map((_, index) => String(index + 1).padStart(2, '0')));
  expect(rail.at(-1)).toBe(`${String(rail.length).padStart(2, '0')} Overriding`);
});

for (const path of ['/install', '/cli', '/elements', '/tokens']) {
  test(`${path} gives each § heading the number its rail entry shows`, async () => {
    await railOf(path);
    const counted = [...document.querySelectorAll<HTMLElement>('[data-document-article] h2')].filter((heading) =>
      getComputedStyle(heading).counterIncrement.startsWith('section'),
    );
    expect(counted.length).toBeGreaterThan(0);
    expect(counted.map((heading) => heading.dataset.indexNumber)).toEqual(
      counted.map((_, index) => String(index + 1).padStart(2, '0')),
    );
  });
}

const adrFiles = Object.keys(import.meta.glob('../../../../docs/adr/*.md')).map((path) => path.slice(path.lastIndexOf('/') + 1));

test('the Rationale lists every ADR in docs/adr/ and counts them in its running head', async () => {
  const screen = await mount('/rationale');
  const table = screen.getByRole('table');
  await expect.element(table).toBeVisible();
  const rows = [...table.element().querySelectorAll('tbody tr')];
  expect(adrFiles.length).toBeGreaterThan(0);
  expect(rows.map((row) => row.querySelector('td')?.textContent)).toEqual(adrFiles.map((file) => `ADR ${file.slice(0, 4)}`));
  expect(rows.map((row) => row.querySelector('a')?.getAttribute('href')?.split('/').at(-1))).toEqual(adrFiles);
  expect(rows.every((row) => ['Accepted', 'Amended'].includes(row.querySelector('td:last-child')?.textContent ?? ''))).toBe(true);
  expect(document.querySelector('main')?.textContent).toContain(`4 decisions · ${adrFiles.length} records`);
});

test('the Rationale index jumps to each decision', async () => {
  const screen = await mount('/rationale');
  await expect.element(screen.getByRole('heading', { name: 'StyleX', level: 2 })).toBeVisible();
  const decisions = [...document.querySelectorAll<HTMLElement>('h2[data-index-number]')];
  const jumps = [...document.querySelectorAll('main ol a[href^="#"]')].map((link) => link.getAttribute('href'));
  expect(jumps).toEqual(decisions.map((heading) => `#${heading.id}`));
});

test('the CLI names the files install writes, as packages/cli writes them', async () => {
  const screen = await mount('/cli');
  await expect.element(screen.getByRole('heading', { name: 'The ultima-design skill' })).toBeVisible();
  const shown = [...document.querySelectorAll('main dd')].map((path) => path.textContent);
  const paths = INSTALL_WRITES.flatMap(({ files }) => files.map(({ path }) => path));
  expect(shown).toEqual(paths);
  for (const path of paths) expect(installSource).toContain(`'${path.replace(/\/SKILL\.md$/, '')}'`);
  expect(installSource).toContain("'SKILL.md'");
});

test('the CI workflow on the CLI page runs the two gates', async () => {
  const screen = await mount('/cli');
  await expect.element(screen.getByRole('heading', { name: 'In CI' })).toBeVisible();
  const text = document.querySelector('main')?.textContent ?? '';
  expect(text).toContain('run: npx --no-install ultima-design doctor');
  expect(text).toContain('run: npx --no-install ultima-design check');
});

test('Install ends with cards to the pages a reader goes next', async () => {
  const screen = await mount('/install');
  await expect.element(screen.getByRole('heading', { name: 'Where to go next' })).toBeVisible();
  const links = [...document.querySelectorAll('main h3 a')].map((link) => [link.textContent, link.getAttribute('href')]);
  expect(links).toEqual([
    ['Components', '/components'],
    ['Tokens', '/tokens'],
    ['Theme Studio', '/theme-studio'],
    ['CLI', '/cli'],
    ['Blocks', '/blocks'],
  ]);
  for (const [, href] of links) expect(pages.map(({ to }) => to)).toContain(href);
});
