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

  await expect.element(screen.getByRole('heading', { level: 1, name: /Yours to change/i })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Explore the components' })).toBeVisible();
  await expect.element(screen.getByRole('heading', { name: 'Meet the components.' })).toBeVisible();
  await expect.element(screen.getByRole('region', { name: 'Component specimen' })).toBeVisible();
  // The workbench sits below the fold of the shell's scroll panel, so it is present but not visible.
  expect(screen.getByRole('heading', { name: /Start with one/i }).element()).toBeInTheDocument();
  expect(screen.getByText('npx shadcn add @ultima/button').element()).toBeInTheDocument();
});

test('the hero mark paints around its text without breaking the line rhythm', async () => {
  const screen = await mount('/');
  const heading = screen.getByRole('heading', { level: 1, name: /Yours to change/i }).element();
  const mark = [...heading.querySelectorAll('span')].find((span) => span.textContent === 'Yours to change.')!;
  const style = getComputedStyle(mark);

  expect(style.marginBlockStart).toBe('0px');
  expect(Number.parseFloat(style.marginInlineStart)).toBe(-Number.parseFloat(style.paddingInlineStart));
  expect(Number.parseFloat(style.marginInlineEnd)).toBe(-Number.parseFloat(style.paddingInlineEnd));
});

test('the specimen uses live components with the kit default radius', async () => {
  const screen = await mount('/');
  await userEvent.click(screen.getByRole('tab', { name: 'Usage' }));
  await expect.element(screen.getByRole('tab', { name: 'Usage' })).toHaveAttribute('aria-selected', 'true');
  const specimen = screen.getByRole('region', { name: 'Component specimen' });
  expect(getComputedStyle(specimen.getByRole('button', { name: 'Solid', exact: true }).element()).borderRadius).toBe('10px');
});

test('the workbench tabs the two setup targets and copies the active pair', async () => {
  const written: string[] = [];
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: (text: string) => (written.push(text), Promise.resolve()) },
  });
  const screen = await mount('/');
  const list = screen.getByRole('tablist', { name: 'Setup target' });
  expect(list.element()).toBeInTheDocument();

  const vite = list.getByRole('tab', { name: 'Vite' });
  const next = list.getByRole('tab', { name: 'Next.js' });
  expect(vite.element()).toHaveAttribute('aria-selected', 'true');
  const panel = () =>
    document.getElementById(list.element().querySelector('[aria-selected="true"]')!.getAttribute('aria-controls')!)!;
  expect(panel().textContent).toContain('https://ultima.systems/r/setup-vite.json');
  expect(panel().querySelectorAll('pre code span').length).toBeGreaterThan(0);

  await userEvent.click(screen.getByRole('button', { name: 'Copy Vite install commands' }).element());
  expect(written.at(-1)).toBe(
    'npx shadcn add https://ultima.systems/r/setup-vite.json\nnpx shadcn add @ultima/button',
  );

  await userEvent.click(next.element());
  expect(next.element()).toHaveAttribute('aria-selected', 'true');
  expect(panel().textContent).toContain('https://ultima.systems/r/setup-next.json');
  expect(panel().querySelectorAll('pre code span').length).toBeGreaterThan(0);

  await userEvent.click(screen.getByRole('button', { name: 'Copy Next.js install commands' }).element());
  expect(written.at(-1)).toBe(
    'npx shadcn add https://ultima.systems/r/setup-next.json\nnpx shadcn add @ultima/button',
  );
});
