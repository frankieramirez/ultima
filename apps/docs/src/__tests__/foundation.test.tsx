import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import axe from 'axe-core';
import { expect, onTestFinished, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { setupItems } from '../../../../registry/items.config';
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
