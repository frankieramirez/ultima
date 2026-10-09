import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import axe from 'axe-core';
import { expect, onTestFinished, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { routeTree } from '../router';
import { engineList, fixtureName, issueUrl, support } from '../support';
import { THEME_STORAGE_KEY } from '../theme';
import '../styles.css';

function mount(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });
  return render(<RouterProvider router={createRouter({ routeTree, history })} />);
}

const modes = { dark: stylex.props(darkTheme, colorScheme.dark), light: stylex.props(lightTheme, colorScheme.light) };
const themeClasses = (mode: keyof typeof modes) => modes[mode].className?.split(/\s+/).filter(Boolean) ?? [];

function prefer(mode: keyof typeof modes) {
  const root = document.documentElement;
  root.classList.remove(...themeClasses('dark'), ...themeClasses('light'));
  root.classList.add(...themeClasses(mode));
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  onTestFinished(() => localStorage.removeItem(THEME_STORAGE_KEY));
}

async function mountSupport() {
  const screen = await mount('/support');
  await expect.element(screen.getByRole('heading', { name: 'Support', level: 1 })).toBeVisible();
  return { screen, text: document.querySelector('main')!.textContent ?? '' };
}

test('the support page renders every tested version, setup and report in the manifest', async () => {
  const { screen, text } = await mountSupport();
  expect(text).toContain(support.run.date.slice(0, 10));
  await expect.element(screen.getByRole('link', { name: support.run.revision.slice(0, 7) })).toHaveAttribute('href', `https://github.com/frankieramirez/ultima/commit/${support.run.revision}`);
  expect(text).toContain(`All ${support.matrix.cells} registered cells passed`);
  for (const version of Object.values(support.browsers)) expect(text).toContain(version);
  const packages = screen.getByRole('table', { name: 'Package versions per fixture' }).element();
  for (const fixture of support.fixtures) {
    expect(packages.textContent).toContain(fixtureName(fixture));
    for (const [name, version] of Object.entries(fixture.versions)) {
      const row = [...packages.querySelectorAll('tbody tr')].find((tr) => tr.firstElementChild?.textContent === name)!;
      expect(row.children[support.fixtures.indexOf(fixture) + 1]!.textContent).toBe(version);
    }
  }
  const reports = screen.getByRole('table', { name: 'Retained reports' }).element();
  for (const fixture of support.fixtures) expect(reports.textContent).toContain(fixture.reportDigest.slice(0, 12));
  expect(text).toContain(support.cli.version);
});

test('every known gap and open evidence gap appears with its issue', async () => {
  const { screen } = await mountSupport();
  const known = screen.getByRole('list', { name: 'Known gaps' }).element();
  expect(known.children).toHaveLength(support.knownGaps.length);
  for (const gap of support.knownGaps) {
    const item = [...known.children].find((li) => li.textContent?.includes(gap.assertion))!;
    expect(item.textContent).toContain(gap.reason);
    expect(item.textContent).toContain(gap.engines.length === support.matrix.engines.length ? 'all engines' : engineList(gap.engines));
    if (gap.issue) expect(item.querySelector('a')?.getAttribute('href')).toBe(issueUrl(gap.issue));
  }
  expect(support.knownGaps.filter((gap) => gap.issue).map((gap) => gap.issue)).toEqual(expect.arrayContaining(['#806', '#807']));
  const open = screen.getByRole('list', { name: 'Open evidence gaps' }).element();
  expect(open.children).toHaveLength(support.openGaps.length);
  for (const gap of support.openGaps) expect(open.textContent).toContain(gap.title);
  const excluded = support.knownGaps.filter((gap) => gap.bundle === 'direction-locale').map((gap) => gap.component);
  expect(excluded.length).toBeGreaterThan(0);
  expect(document.querySelector('main')!.textContent).toContain(`Excluded from the RTL claim: ${excluded.join(', ')}`);
});

test('install and llms.txt link the support page with its run and known-gap issues', async () => {
  const screen = await mount('/install');
  await expect.element(screen.getByRole('link', { name: 'Support' }).first()).toHaveAttribute('href', '/support');
  const guide = await (await fetch('/llms.txt')).text();
  const section = guide.split('\n## Support\n')[1]!.split('\n## ')[0]!;
  expect(section).toContain('https://ultima.systems/support');
  expect(section).toContain(support.run.date.slice(0, 10));
  expect(section).toContain(support.run.revision.slice(0, 7));
  for (const gap of support.knownGaps) if (gap.issue) expect(section).toContain(gap.issue);
});

for (const mode of ['dark', 'light'] as const) {
  test(`the support page passes axe and does not overflow at 390 in ${mode}`, async () => {
    await page.viewport(390, 844);
    onTestFinished(() => page.viewport(1280, 720));
    prefer(mode);
    await mountSupport();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
    const results = await axe.run(document.body);
    expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.html).join(', ')}`)).toEqual([]);
  });
}
