import { CalendarDate } from '@internationalized/date';
import { Calendar, type CalendarRootProps, type CalendarTableCellTriggerProps } from '@ultima/ui';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { resolved } from './overlay';

function Sample({ children, ...props }: CalendarRootProps) {
  return (
    <Calendar.Root {...props}>
      <Calendar.Label>Release date</Calendar.Label>
      <Calendar.Content>
        <Calendar.View view="day">
          <Calendar.ViewControl view="day">
            <Calendar.PrevTrigger />
            <Calendar.ViewTrigger>
              <Calendar.RangeText />
            </Calendar.ViewTrigger>
            <Calendar.NextTrigger />
          </Calendar.ViewControl>
          <Calendar.Table view="day" />
        </Calendar.View>
      </Calendar.Content>
    </Calendar.Root>
  );
}

function cellTriggers(screen: Awaited<ReturnType<typeof render>>, selector = '') {
  return Array.from(
    screen.container.querySelectorAll<HTMLButtonElement>(
      `[data-part="table-cell-trigger"]${selector}`,
    ),
  );
}

function cellTrigger(
  screen: Awaited<ReturnType<typeof render>>,
  selector: string,
  index: number,
) {
  const el = cellTriggers(screen, selector)[index];
  if (!el) throw new Error(`no cell trigger ${index} matching ${selector}`);
  return el;
}

// Calendar has no axes: the single shape is the inline day grid, and it renders
// with no props beyond the machine's own.
test('a calendar with no props renders a labelled day grid', async () => {
  const screen = await render(<Sample />);
  const grid = screen.getByRole('grid', { name: 'Release date' }).element();
  expect(grid.tagName).toBe('TABLE');
  expect(grid.querySelectorAll('th[scope="col"]').length).toBe(7);
  expect(grid.querySelectorAll('[role="gridcell"]').length).toBeGreaterThan(28);
  expect(cellTriggers(screen).length).toBeGreaterThan(28);
});

test('a day grid fits a narrow container and keeps date selection', async () => {
  const screen = await render(<div style={{ width: 220 }}><Sample /></div>);
  const calendar = screen.container.querySelector('[data-part="root"]')!;
  const bounds = calendar.getBoundingClientRect();
  expect(bounds.width).toBeLessThanOrEqual(220);
  for (const cell of screen.container.querySelectorAll('th, td, [data-part="table-cell-trigger"]')) {
    const box = cell.getBoundingClientRect();
    expect(box.left).toBeGreaterThanOrEqual(bounds.left);
    expect(box.right).toBeLessThanOrEqual(bounds.right + 1);
  }
  const date = cellTrigger(screen, ':not([data-outside-range])', 3);
  await userEvent.click(date);
  expect(date).toHaveAttribute('data-selected');
});

test('the grid keeps the day view keyboard map', async () => {
  const screen = await render(<Sample />);
  const start = cellTrigger(screen, ':not([data-outside-range])', 0);
  start.focus();
  await userEvent.keyboard('{ArrowRight}');
  const moved = document.activeElement as HTMLButtonElement;
  expect(moved).not.toBe(start);
  expect(moved.dataset.part).toBe('table-cell-trigger');
  await userEvent.keyboard('{Enter}');
  expect(moved).toHaveAttribute('data-selected');
  expect(moved.closest('td')).toHaveAttribute('aria-selected', 'true');
});

test('page keys change the month shown in the range text', async () => {
  const screen = await render(<Sample />);
  const rangeText = screen.container.querySelector('[data-part="range-text"]') as HTMLElement;
  const before = rangeText.textContent;
  const start = cellTrigger(screen, ':not([data-outside-range])', 0);
  start.focus();
  await userEvent.keyboard('{PageDown}');
  expect(rangeText.textContent).not.toBe(before);
  await userEvent.keyboard('{PageUp}');
  expect(rangeText.textContent).toBe(before);
});

test('a clicked day marks itself and its cell selected', async () => {
  const screen = await render(<Sample />);
  const day = cellTrigger(screen, ':not([data-outside-range])', 3);
  await userEvent.click(day);
  expect(day).toHaveAttribute('data-selected');
  expect(day.closest('td')).toHaveAttribute('aria-selected', 'true');
});

test('the ring lands on a focused cell trigger and on the nav triggers', async () => {
  const screen = await render(<Sample />);
  const parts = ['prev-trigger', 'view-trigger', 'next-trigger'];
  for (const part of parts) {
    await userEvent.tab();
    const el = document.activeElement as HTMLElement;
    expect(el.dataset.part).toBe(part);
    expect(getComputedStyle(el).outlineStyle).toBe('solid');
    expect(parseFloat(getComputedStyle(el).outlineWidth)).toBeGreaterThan(0);
  }
  await userEvent.tab();
  const cell = document.activeElement as HTMLElement;
  expect(cell.dataset.part).toBe('table-cell-trigger');
  expect(getComputedStyle(cell).outlineStyle).toBe('solid');
  expect(parseFloat(getComputedStyle(cell).outlineWidth)).toBeGreaterThan(0);

  const rangeText = screen.container.querySelector('[data-part="range-text"]') as HTMLElement;
  expect(getComputedStyle(rangeText).outlineStyle).toBe('none');
});

test('the named state attributes drive the cell trigger paint', async () => {
  const screen = await render(<Sample />);
  const days = cellTriggers(screen, ':not([data-outside-range]):not([data-today])');
  const today = cellTrigger(screen, '[data-today]', 0);
  const outside = cellTrigger(screen, '[data-outside-range]', 0);

  const plain = getComputedStyle(days[0]!);
  const todayStyle = getComputedStyle(today);
  expect(
    todayStyle.color !== plain.color || todayStyle.fontWeight !== plain.fontWeight,
  ).toBe(true);
  expect(getComputedStyle(outside).color).not.toBe(plain.color);

  const day = days[0]!;
  const unselected = getComputedStyle(day).backgroundColor;
  await userEvent.click(day);
  await expect.poll(() => getComputedStyle(day).backgroundColor).not.toBe(unselected);
  await expect.poll(() => getComputedStyle(day).color).not.toBe(
    getComputedStyle(days[1]!).color,
  );
});

test('a range selection paints start, end, and the in-between days', async () => {
  const screen = await render(<Sample selectionMode="range" />);
  const days = cellTriggers(screen, ':not([data-outside-range])');
  await userEvent.click(days[3]!);
  await userEvent.click(days[6]!);
  await expect.poll(() => days[6]!.hasAttribute('data-range-end')).toBe(true);
  const start = screen.container.querySelector('[data-range-start]');
  const end = screen.container.querySelector('[data-range-end]');
  const inRange = Array.from(screen.container.querySelectorAll('[data-in-range]'));
  expect(start).toBe(days[3]);
  expect(end).toBe(days[6]);
  expect(inRange.length).toBeGreaterThanOrEqual(4);
  const middle = inRange.find(
    (el) => el !== start && el !== end && (el as HTMLElement).dataset.part === 'table-cell-trigger',
  );
  if (!middle) throw new Error('no in-range middle cell trigger');
  await expect.poll(() => getComputedStyle(middle as HTMLElement).backgroundColor).not.toBe(
    getComputedStyle(days[10]!).backgroundColor,
  );
});

test('the month and year views render their own grids', async () => {
  const screen = await render(
    <Calendar.Root>
      <Calendar.Label>Release date</Calendar.Label>
      <Calendar.Content>
        <Calendar.View view="month">
          <Calendar.Table view="month" />
        </Calendar.View>
        <Calendar.View view="year">
          <Calendar.Table view="year" />
        </Calendar.View>
      </Calendar.Content>
    </Calendar.Root>,
  );
  const monthGrid = screen.container.querySelector('[data-view="month"][data-part="table"]');
  const yearGrid = screen.container.querySelector('[data-view="year"][data-part="table"]');
  expect(monthGrid?.querySelectorAll('[data-part="table-cell-trigger"]').length).toBe(12);
  expect(yearGrid?.querySelectorAll('[data-part="table-cell-trigger"]').length).toBeGreaterThanOrEqual(10);
});

test('the month and year selects drive the grid', async () => {
  const screen = await render(
    <Calendar.Root>
      <Calendar.Label>Release date</Calendar.Label>
      <Calendar.Content>
        <Calendar.View view="day">
          <Calendar.ViewControl view="day">
            <Calendar.MonthSelect />
            <Calendar.YearSelect />
            <Calendar.RangeText />
          </Calendar.ViewControl>
          <Calendar.Table view="day" />
        </Calendar.View>
      </Calendar.Content>
    </Calendar.Root>,
  );
  const selects = Array.from(screen.container.querySelectorAll('select'));
  expect(selects.length).toBe(2);
  const rangeText = screen.container.querySelector('[data-part="range-text"]')!;
  const before = rangeText.textContent;
  const monthSelect = selects[0]!;
  const nextMonth = String((Number(monthSelect.value) + 1) % 12);
  await userEvent.selectOptions(monthSelect, nextMonth);
  await expect.poll(() => rangeText.textContent).not.toBe(before);
});

test('a hidden content part still computes to display none', async () => {
  const screen = await render(<Sample />);
  const content = screen.container.querySelector('[data-part="content"]') as HTMLElement;
  content.setAttribute('hidden', '');
  expect(getComputedStyle(content).display).toBe('none');
});

// Every interaction the grid exposes is the Zag machine's; the file adds no
// behaviour of its own, so there is no Calendar-owned behaviour to prove here.
test('the root type omits the popup and form props and pins inline', () => {
  expectTypeOf<CalendarRootProps>().not.toHaveProperty('className');
  expectTypeOf<CalendarRootProps>().not.toHaveProperty('inline');
  expectTypeOf<CalendarRootProps>().not.toHaveProperty('open');
  expectTypeOf<CalendarRootProps>().not.toHaveProperty('positioning');
  expectTypeOf<CalendarRootProps>().not.toHaveProperty('name');
  expectTypeOf<CalendarRootProps>().toHaveProperty('selectionMode');
  expectTypeOf<CalendarRootProps>().toHaveProperty('style');
});

test('part types expose the style slot and no className or render', () => {
  expectTypeOf<CalendarTableCellTriggerProps>().not.toHaveProperty('className');
  expectTypeOf<CalendarTableCellTriggerProps>().not.toHaveProperty('render');
  expectTypeOf<CalendarTableCellTriggerProps>().toHaveProperty('style');
});

// October 2026 starts on a Thursday, so the 5th to the 8th run Monday to Thursday in one week.
const OCTOBER = new CalendarDate(2026, 10, 1);
const day = (screen: Awaited<ReturnType<typeof render>>, date: string) => {
  const el = screen.container.querySelector<HTMLElement>(`[data-part="table-cell-trigger"][data-value="${date}"]`);
  if (!el) throw new Error(`no day ${date}`);
  return el;
};

test('the days of a range meet in one band, squaring the corners between them', async () => {
  const screen = await render(
    <Sample
      selectionMode="range"
      defaultFocusedValue={OCTOBER}
      defaultValue={[new CalendarDate(2026, 10, 5), new CalendarDate(2026, 10, 8)]}
    />,
  );
  const md = resolved('border-top-left-radius', 'var(--ult-radius-md)');
  const start = getComputedStyle(day(screen, '2026-10-05'));
  const middle = getComputedStyle(day(screen, '2026-10-06'));
  const end = getComputedStyle(day(screen, '2026-10-08'));

  expect(getComputedStyle(day(screen, '2026-10-06').parentElement!).paddingLeft).toBe('0px');
  expect([start.borderTopLeftRadius, start.borderBottomLeftRadius]).toEqual([md, md]);
  expect([start.borderTopRightRadius, start.borderBottomRightRadius]).toEqual(['0px', '0px']);
  expect([middle.borderTopLeftRadius, middle.borderTopRightRadius]).toEqual(['0px', '0px']);
  expect([end.borderTopLeftRadius, end.borderTopRightRadius]).toEqual(['0px', md]);
  expect(getComputedStyle(day(screen, '2026-10-01')).borderTopLeftRadius).toBe(md);
});

test('a band keeps its outer corners where it wraps to the next week', async () => {
  const screen = await render(
    <Sample
      selectionMode="range"
      defaultFocusedValue={OCTOBER}
      defaultValue={[new CalendarDate(2026, 10, 8), new CalendarDate(2026, 10, 14)]}
    />,
  );
  const md = resolved('border-top-left-radius', 'var(--ult-radius-md)');
  expect(getComputedStyle(day(screen, '2026-10-10')).borderTopRightRadius).toBe(md);
  expect(getComputedStyle(day(screen, '2026-10-11')).borderTopLeftRadius).toBe(md);
  expect(getComputedStyle(day(screen, '2026-10-11')).borderTopRightRadius).toBe('0px');
});

test('a disabled day takes the disabled ink rather than fading, and today is ringed', async () => {
  const screen = await render(<Sample defaultFocusedValue={OCTOBER} max={new CalendarDate(2026, 10, 20)} />);
  const late = getComputedStyle(day(screen, '2026-10-24'));
  expect(late.opacity).toBe('1');
  expect(late.color).toBe(resolved('color', 'var(--ult-color-text-disabled)'));

  const live = await render(<Sample />);
  const today = live.container.querySelector<HTMLElement>('[data-today]')!;
  expect(getComputedStyle(today).boxShadow).toContain(resolved('color', 'var(--ult-color-border-strong)'));
});

test('the nav triggers are 32px squares', async () => {
  const screen = await render(<Sample />);
  const prev = screen.container.querySelector<HTMLElement>('[data-part="prev-trigger"]')!;
  const size = resolved('height', 'var(--ult-space-9)');
  expect(getComputedStyle(prev).height).toBe(size);
  expect(getComputedStyle(prev).width).toBe(size);
});
