import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';

import { routeTree } from '../router';
import '../styles.css';

function mount(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });
  return render(<RouterProvider router={createRouter({ routeTree, history })} />);
}

test('Commands is one tab list with a fence per target, Vite first', async () => {
  const screen = await mount('/install');
  const list = screen.getByRole('tablist', { name: 'Setup target' });
  await expect.element(list).toBeVisible();
  expect(document.querySelectorAll('[role="tablist"]')).toHaveLength(1);

  const vite = screen.getByRole('tab', { name: 'Vite' });
  const next = screen.getByRole('tab', { name: 'Next.js' });
  await expect.element(vite).toHaveAttribute('aria-selected', 'true');

  const panel = screen.getByRole('tabpanel');
  expect(panel.element().querySelector('pre')?.textContent).toContain('/r/setup-vite.json');
  expect(panel.element().textContent).toContain('npx shadcn add @ultima/button');

  await userEvent.click(next);
  await expect.element(next).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tabpanel').element().querySelector('pre')?.textContent).toContain(
    '/r/setup-next.json',
  );
});

test('the per-target prose stays as labelled runs outside the tabs', async () => {
  const screen = await mount('/install');
  await expect.element(screen.getByRole('tablist', { name: 'Setup target' })).toBeVisible();
  const runs = [...document.querySelectorAll('p > strong:first-child')].map((node) => node.textContent);
  expect(runs).toEqual(expect.arrayContaining(['Vite.', 'Next.js App Router.', 'Both.', 'Next.js.']));
  for (const strong of document.querySelectorAll('p > strong:first-child')) {
    expect(strong.closest('[role="tabpanel"]')).toBeNull();
  }
});

test('no install paragraph reads like a table of inline-code chips', async () => {
  const screen = await mount('/install');
  await expect.element(screen.getByRole('heading', { name: 'Install', level: 1 })).toBeVisible();
  const paragraphs = document.querySelectorAll('main p');
  expect(paragraphs.length).toBeGreaterThan(10);
  for (const paragraph of paragraphs) {
    expect(paragraph.querySelectorAll('code').length, paragraph.textContent ?? '').toBeLessThanOrEqual(4);
  }
});
