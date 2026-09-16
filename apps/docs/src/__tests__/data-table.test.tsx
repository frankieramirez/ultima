import { StrictMode } from 'react';
import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import DataTableSorting from '../demos/table/data-table-sorting';

const WORD_JOINER = '⁠';

// The docs site mounts under StrictMode, whose second effect pass is what a naive
// first-render guard on the status region would leak an announcement through.
const mount = () =>
  render(
    <StrictMode>
      <DataTableSorting />
    </StrictMode>,
  );

function sortOf(screen: Awaited<ReturnType<typeof mount>>, name: RegExp) {
  return screen.getByRole('columnheader', { name }).element().getAttribute('aria-sort');
}

test('only the sorted column advertises a direction', async () => {
  const screen = await mount();

  expect(sortOf(screen, /Region/)).toBe('none');
  expect(sortOf(screen, /p95/)).toBe('none');
  expect(sortOf(screen, /Requests/)).toBe('none');

  await userEvent.click(screen.getByRole('button', { name: /Region/ }));

  await expect.poll(() => sortOf(screen, /Region/)).toBe('ascending');
  expect(sortOf(screen, /p95/)).toBe('none');
  expect(sortOf(screen, /Requests/)).toBe('none');

  // A number column opens descending: the engine's default, which the recipe does not re-decide.
  await userEvent.click(screen.getByRole('button', { name: /p95/ }));

  await expect.poll(() => sortOf(screen, /p95/)).toBe('descending');
  expect(sortOf(screen, /Region/)).toBe('none');
});

test('a sort reorders the rows and the keyboard does the same thing', async () => {
  const screen = await mount();

  const firstCell = () => screen.container.querySelector('tbody td')?.textContent;
  expect(firstCell()).toBe('us-east-1');

  const region = screen.getByRole('button', { name: /Region/ });
  await userEvent.click(region);
  await expect.poll(firstCell).toBe('ap-south-1');

  expect(document.activeElement).toBe(region.element());

  await userEvent.keyboard('{Enter}');
  await expect.poll(() => sortOf(screen, /Region/)).toBe('descending');
  await expect.poll(firstCell).toBe('us-east-1');

  await userEvent.keyboard(' ');
  await expect.poll(() => sortOf(screen, /Region/)).toBe('none');
});

test('the row-order region is pre-mounted empty and repeats announce', async () => {
  const screen = await mount();

  const status = screen.getByRole('status').element();
  expect(status).toHaveAttribute('aria-atomic', 'true');
  expect(status.textContent).toBe('');
  expect(getComputedStyle(status).display).not.toBe('none');

  const mutations: MutationRecord[] = [];
  const observer = new MutationObserver((records) => mutations.push(...records));
  observer.observe(status, { subtree: true, characterData: true, childList: true });

  await userEvent.click(screen.getByRole('button', { name: /Region/ }));
  await expect.poll(() => status.textContent).toBe('Row order: ap-south-1, eu-west-1, sa-east-1, us-east-1.');

  const descending = 'Row order: us-east-1, sa-east-1, eu-west-1, ap-south-1.';
  await userEvent.click(screen.getByRole('button', { name: /Region/ }));
  await expect.poll(() => status.textContent).toBe(descending);

  const afterRegion = mutations.length;
  expect(afterRegion).toBeGreaterThan(0);

  await userEvent.click(screen.getByRole('button', { name: /p95/ }));
  await expect.poll(() => mutations.length).toBeGreaterThan(afterRegion);
  expect(status.textContent).toBe(`${descending}${WORD_JOINER}`);

  observer.disconnect();
});
