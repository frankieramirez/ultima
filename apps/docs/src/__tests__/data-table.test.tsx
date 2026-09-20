import { StrictMode } from 'react';
import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import DataTableFiltering from '../demos/table/data-table-filtering';
import DataTablePagination from '../demos/table/data-table-pagination';
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

const mountFiltering = () =>
  render(
    <StrictMode>
      <DataTableFiltering />
    </StrictMode>,
  );

const mountPagination = () =>
  render(
    <StrictMode>
      <DataTablePagination />
    </StrictMode>,
  );

function bodyRows(screen: Awaited<ReturnType<typeof mount>>) {
  return [...screen.container.querySelectorAll('tbody tr')];
}

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

test('the faceted menu narrows the table to the checked areas without closing', async () => {
  const screen = await mountFiltering();

  expect(bodyRows(screen)).toHaveLength(8);

  await userEvent.click(screen.getByRole('button', { name: 'Filter by area' }));
  const menu = screen.getByRole('menu');
  await expect.element(menu).toBeVisible();

  const americas = menu.getByRole('menuitemcheckbox', { name: 'Americas (4)' });
  expect(americas.element()).toHaveAttribute('aria-checked', 'false');

  await userEvent.click(americas);
  await expect.poll(() => bodyRows(screen).length).toBe(4);
  expect(americas.element()).toHaveAttribute('aria-checked', 'true');

  await userEvent.click(menu.getByRole('menuitemcheckbox', { name: 'Europe (2)' }));
  await expect.poll(() => bodyRows(screen).length).toBe(6);

  await userEvent.click(americas);
  await expect.poll(() => bodyRows(screen).length).toBe(2);
  expect(americas.element()).toHaveAttribute('aria-checked', 'false');
});

test('the search box filters across columns and the count is announced', async () => {
  const screen = await mountFiltering();

  const status = screen.getByRole('status').element();
  expect(status).toHaveAttribute('aria-atomic', 'true');
  expect(status.textContent).toBe('');
  expect(getComputedStyle(status).display).not.toBe('none');

  const search = screen.getByRole('searchbox', { name: 'Search regions' });

  await userEvent.fill(search, 'europe');
  await expect.poll(() => bodyRows(screen).length).toBe(2);
  await expect.poll(() => status.textContent).toBe('Showing 2 of 8 rows.');

  await userEvent.fill(search, 'us-west');
  await expect.poll(() => bodyRows(screen).length).toBe(1);
  await expect.poll(() => status.textContent).toBe('Showing 1 of 8 rows.');

  await userEvent.fill(search, '');
  await expect.poll(() => bodyRows(screen).length).toBe(8);
  await expect.poll(() => status.textContent).toBe('Showing 8 of 8 rows.');
});

test('the two pagination landmarks carry distinct names and drive one table', async () => {
  const screen = await mountPagination();

  const above = screen.getByRole('navigation', { name: 'Pagination above the table' });
  const below = screen.getByRole('navigation', { name: 'Pagination below the table' });

  const firstCell = () => screen.container.querySelector('tbody td')?.textContent;
  expect(bodyRows(screen)).toHaveLength(5);
  expect(firstCell()).toBe('us-east-1');
  expect(above.getByRole('button', { name: '1' }).element()).toHaveAttribute('aria-current', 'page');

  await userEvent.click(below.getByRole('button', { name: 'Next' }));
  await expect.poll(firstCell).toBe('eu-west-1');
  await expect.poll(() => bodyRows(screen).length).toBe(5);

  expect(above.getByRole('button', { name: '2' }).element()).toHaveAttribute('aria-current', 'page');
  expect(below.getByRole('button', { name: '2' }).element()).toHaveAttribute('aria-current', 'page');
});

test('the ends stay put on the first and last page and the range is announced', async () => {
  const screen = await mountPagination();

  const below = screen.getByRole('navigation', { name: 'Pagination below the table' });
  const status = screen.getByRole('status').element();
  const firstCell = () => screen.container.querySelector('tbody td')?.textContent;

  expect(status).toHaveAttribute('aria-atomic', 'true');
  expect(status.textContent).toBe('');
  expect(getComputedStyle(status).display).not.toBe('none');

  const previous = below.getByRole('button', { name: 'Previous' }).element();
  expect(previous).toHaveAttribute('aria-disabled', 'true');
  // Playwright refuses to click an aria-disabled element; a DOM click is what the
  // component's own swallow has to absorb.
  previous.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  expect(firstCell()).toBe('us-east-1');

  await userEvent.click(below.getByRole('button', { name: '5' }));
  await expect.poll(firstCell).toBe('il-central-1');
  await expect.poll(() => bodyRows(screen).length).toBe(4);
  await expect.poll(() => status.textContent).toBe('Showing 21 through 24 of 24 rows.');

  await expect.poll(() => below.getByRole('button', { name: 'Next' }).element().getAttribute('aria-disabled')).toBe('true');
});

test('the page-size select re-slices the table around the top row', async () => {
  const screen = await mountPagination();

  const below = screen.getByRole('navigation', { name: 'Pagination below the table' });
  const status = screen.getByRole('status').element();

  await userEvent.click(below.getByRole('button', { name: 'Next' }));
  await expect.poll(() => bodyRows(screen).length).toBe(5);

  await userEvent.click(screen.getByRole('combobox', { name: 'Rows per page' }));
  await userEvent.click(screen.getByRole('option', { name: '10 rows' }));

  await expect.poll(() => bodyRows(screen).length).toBe(10);
  await expect.poll(() => status.textContent).toBe('Showing 1 through 10 of 24 rows.');
  await expect.poll(() => below.getByRole('button', { name: '3' }).element().getAttribute('aria-current')).toBeNull();
  expect(below.getByRole('button', { name: '1' }).element()).toHaveAttribute('aria-current', 'page');
});
