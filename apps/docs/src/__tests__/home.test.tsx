import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { routeTree } from '../router';

function mount(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });
  return render(<RouterProvider router={createRouter({ routeTree, history })} />);
}

test('the landing renders the workshop hero, specimen, and workbench sections', async () => {
  const screen = await mount('/');

  await expect.element(screen.getByRole('heading', { level: 1, name: /good parts/i })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Explore the components' })).toBeVisible();
  await expect.element(screen.getByText('02 / ANATOMY OF AN INTERFACE')).toBeVisible();
  await expect.element(screen.getByRole('region', { name: 'Component specimen' })).toBeVisible();
  // The workbench sits below the fold of the shell's scroll panel, so it is present but not visible.
  expect(screen.getByRole('heading', { name: /to your source/i }).element()).toBeInTheDocument();
  expect(screen.getByText('npx shadcn add @ultima/button').element()).toBeInTheDocument();
});

test('the hero mark paints around its text without breaking the line rhythm', async () => {
  const screen = await mount('/');
  const heading = screen.getByRole('heading', { level: 1, name: /good parts/i }).element();
  const mark = [...heading.querySelectorAll('span')].find((span) => span.textContent === 'good parts.')!;
  const style = getComputedStyle(mark);

  expect(style.marginBlockStart).toBe('0px');
  expect(Number.parseFloat(style.marginInlineStart)).toBe(-Number.parseFloat(style.paddingInlineStart));
  expect(Number.parseFloat(style.marginInlineEnd)).toBe(-Number.parseFloat(style.paddingInlineEnd));
});

test('the specimen tabs and fields are live components', async () => {
  const screen = await mount('/');

  await userEvent.click(screen.getByRole('tab', { name: 'Members' }).element());
  expect(screen.getByRole('tab', { name: 'Members' }).element()).toHaveAttribute('aria-selected', 'true');

  await expect.element(screen.getByRole('textbox', { name: 'Project name' })).toHaveValue('Untitled, but not for long');
  await expect.element(screen.getByRole('textbox', { name: 'Framework' })).toHaveValue('React + StyleX');
});
