import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { routeTree } from '../router';

function mount(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });
  return render(<RouterProvider router={createRouter({ routeTree, history })} />);
}

function durationTokenSeconds(name: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value.endsWith('ms') ? Number.parseFloat(value) / 1000 : Number.parseFloat(value);
}

test('the hero enters once on the motion tokens, so reduced motion collapses it there', async () => {
  const screen = await mount('/');
  const heading = screen.getByRole('heading', { level: 1, name: 'A system for building interfaces.' });
  await expect.element(heading).toBeVisible();

  const style = getComputedStyle(heading.element());
  expect(style.animationName).not.toBe('none');
  expect(Number.parseFloat(style.animationDuration)).toBe(durationTokenSeconds('--ult-motion-slow'));
  expect(Number.parseFloat(style.animationDelay)).toBe(durationTokenSeconds('--ult-motion-fast'));
  expect(style.animationIterationCount).toBe('1');
  expect(getComputedStyle(heading.getByText('interfaces.').element()).color).not.toBe(style.color);

  await userEvent.click(screen.getByRole('link', { name: 'Installation guide' }).element());
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Install' })).toBeVisible();
  await userEvent.click(screen.getByRole('link', { name: 'Ultima home' }).element());
  const replay = screen.getByRole('heading', { level: 1, name: 'A system for building interfaces.' });
  await expect.element(replay).toBeVisible();
  expect(getComputedStyle(replay.element()).animationName).toBe('none');
});
