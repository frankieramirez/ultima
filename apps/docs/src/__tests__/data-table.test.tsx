import { StrictMode } from 'react';
import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import DataTableRowSelection from '../demos/table/data-table-row-selection';
import DataTableSorting from '../demos/table/data-table-sorting';

const WORD_JOINER = '⁠';

// Checkbox's dash glyph, which is the visible half of `aria-checked="mixed"`.
const DASH = 'M5 12h14';

// The docs site mounts under StrictMode, whose second effect pass is what a naive
// first-render guard on the status region would leak an announcement through.
const mount = () =>
  render(
    <StrictMode>
      <DataTableSorting />
    </StrictMode>,
  );

const mountSelection = () =>
  render(
    <StrictMode>
      <DataTableRowSelection />
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

function selectAll(screen: Awaited<ReturnType<typeof mountSelection>>) {
  return screen.getByRole('checkbox', { name: 'Select all regions' }).element();
}

test('the select-all tracks the body through mixed', async () => {
  const screen = await mountSelection();

  expect(selectAll(screen)).toHaveAttribute('aria-checked', 'false');

  await userEvent.click(screen.getByRole('checkbox', { name: 'Select us-east-1' }));
  await expect.poll(() => selectAll(screen).getAttribute('aria-checked')).toBe('mixed');

  const glyphs = [...selectAll(screen).querySelectorAll('svg')];
  const visible = glyphs.filter((glyph) => getComputedStyle(glyph).display !== 'none');

  expect(visible.map((glyph) => glyph.querySelector('path')?.getAttribute('d'))).toEqual([DASH]);

  for (const region of ['eu-west-1', 'ap-south-1', 'sa-east-1']) {
    await userEvent.click(screen.getByRole('checkbox', { name: `Select ${region}` }));
  }
  await expect.poll(() => selectAll(screen).getAttribute('aria-checked')).toBe('true');

  await userEvent.click(selectAll(screen));
  await expect.poll(() => selectAll(screen).getAttribute('aria-checked')).toBe('false');
  expect(screen.getByRole('checkbox', { name: 'Select us-east-1' }).element()).toHaveAttribute('aria-checked', 'false');
});

test('the select-all selects every row and no two names are alike', async () => {
  const screen = await mountSelection();

  await userEvent.click(selectAll(screen));

  const checkboxes = [...screen.container.querySelectorAll('[role="checkbox"]')];
  const names = checkboxes.map((checkbox) => checkbox.getAttribute('aria-label'));

  expect(names).toEqual(['Select all regions', 'Select us-east-1', 'Select eu-west-1', 'Select ap-south-1', 'Select sa-east-1']);
  expect(new Set(names).size).toBe(names.length);
  expect(checkboxes.every((checkbox) => checkbox.getAttribute('aria-checked') === 'true')).toBe(true);
});

test('the row-count region carries the selection count and is pre-mounted empty', async () => {
  const screen = await mountSelection();

  const status = screen.getByRole('status').element();
  expect(status).toHaveAttribute('aria-atomic', 'true');
  expect(status.textContent).toBe('');
  expect(getComputedStyle(status).display).not.toBe('none');

  await userEvent.click(screen.getByRole('checkbox', { name: 'Select eu-west-1' }));
  await expect.poll(() => status.textContent).toBe('4 rows shown, 1 selected.');

  await userEvent.click(selectAll(screen));
  await expect.poll(() => status.textContent).toBe('4 rows shown, 4 selected.');

  await userEvent.click(selectAll(screen));
  await expect.poll(() => status.textContent).toBe('4 rows shown, 0 selected.');
});
