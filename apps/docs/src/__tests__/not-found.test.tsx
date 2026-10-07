import * as stylex from '@stylexjs/stylex';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { routeTree } from '../router';
import { headings } from '../typography';
import '../styles.css';

async function mount(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });
  const testRouter = createRouter({ routeTree, history });
  const screen = await render(<RouterProvider router={testRouter} />);
  return { screen, router: testRouter };
}

test('the not-found page renders inside the document chrome', async () => {
  const { screen } = await mount('/lost-in-the-suite');

  const trail = screen.container.querySelector('nav[aria-label="Breadcrumb"]')!;
  expect(trail.textContent).toBe('Not Found');
  const heading = screen.getByRole('heading', { name: 'Lost in the aether', level: 1 });
  await expect.element(heading).toBeVisible();
  expect(screen.container.querySelector('article')?.contains(heading.element())).toBe(true);
});

test('the not-found title takes the same treatment as a page title', async () => {
  const probe = await render(<h1 {...stylex.props(headings.h1)}>Page title</h1>);
  const expected = getComputedStyle(probe.container.querySelector('h1')!);
  expect(expected.fontWeight).toBe('500');

  const second = await mount('/lost-in-the-suite');
  await expect.element(
    second.screen.getByRole('heading', { name: 'Lost in the aether', level: 1 }),
  ).toBeVisible();
  const actual = getComputedStyle(second.screen.container.querySelector('h1')!);

  expect({
    fontSize: actual.fontSize,
    fontWeight: actual.fontWeight,
    letterSpacing: actual.letterSpacing,
    lineHeight: actual.lineHeight,
  }).toEqual({
    fontSize: expected.fontSize,
    fontWeight: expected.fontWeight,
    letterSpacing: expected.letterSpacing,
    lineHeight: expected.lineHeight,
  });
});

test('a route change to an unknown path focuses the not-found heading', async () => {
  const { screen, router } = await mount('/install');
  await expect.element(screen.getByRole('heading', { name: 'Install', level: 1 })).toBeVisible();

  router.history.push('/lost-in-the-suite');

  const heading = screen.getByRole('heading', { name: 'Lost in the aether', level: 1 });
  await expect.element(heading).toBeVisible();
  await expect.poll(() => document.activeElement).toBe(heading.element());
});
