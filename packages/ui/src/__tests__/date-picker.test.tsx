import { today, getLocalTimeZone } from '@internationalized/date';
import {
  DatePicker,
  type DatePickerControlProps,
  type DatePickerRootProps,
  type DatePickerSize,
} from '@ultima/ui';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { themeDocument, themes, violations } from './axe';

/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: size sm/md/lg on Control, and no props matches md.
 * 2. The name resolves: role textbox on Input, named by DatePicker.Label.
 * 3. The focus ring lands where the contract says: on Control through `:focus-within`;
 *    Content renders none.
 * 4. The primitive is still wired: Trigger opens the popup, Escape closes, a day click
 *    writes the input value and closes, ClearTrigger empties it.
 * 5. Documented state drives its style: data-selected, data-today, and
 *    data-outside-range on the cell triggers.
 * 6. Typecheck passes: className is rejected, DatePickerSize is exactly its three
 *    values, and Root omits `inline`.
 * 7. Behavior this component wires itself: none, because every interaction is the
 *    machine's (item 4) or a style reacting to a data attribute (items 5 and 8).
 * 8. CSS the primitive reads: the machine's `hidden` attribute on Content and
 *    ClearTrigger hides them; no display declaration fights it.
 */

function Sample({
  size,
  label = 'Release date',
  ...props
}: DatePickerRootProps & { size?: DatePickerSize; label?: string }) {
  return (
    <DatePicker.Root {...props}>
      <DatePicker.Label>{label}</DatePicker.Label>
      <DatePicker.Control size={size} data-testid={`${label}-control`}>
        <DatePicker.Input />
        <DatePicker.ClearTrigger />
        <DatePicker.Trigger />
      </DatePicker.Control>
      <DatePicker.Portal>
        <DatePicker.Positioner>
          <DatePicker.Content data-testid={`${label}-content`}>
            <DatePicker.View view="day">
              <DatePicker.ViewControl view="day">
                <DatePicker.PrevTrigger />
                <DatePicker.ViewTrigger>
                  <DatePicker.RangeText />
                </DatePicker.ViewTrigger>
                <DatePicker.NextTrigger />
              </DatePicker.ViewControl>
              <DatePicker.Table view="day" />
            </DatePicker.View>
          </DatePicker.Content>
        </DatePicker.Positioner>
      </DatePicker.Portal>
    </DatePicker.Root>
  );
}

function cellTriggers(selector = '') {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>(`[data-part="table-cell-trigger"]${selector}`),
  );
}

for (const size of ['sm', 'md', 'lg'] as const) {
  test(`${size} control renders with its labelled input and trigger`, async () => {
    const screen = await render(<Sample size={size} label={`${size} date`} />);
    await expect.element(screen.getByRole('textbox', { name: `${size} date` })).toBeVisible();
    expect(screen.getByRole('button').element().dataset.part).toBe('trigger');
  });
}

test('omitted size matches md', async () => {
  const screen = await render(
    <>
      <Sample label="Default" />
      <Sample size="md" label="Explicit" />
    </>,
  );
  const implicit = screen.getByTestId('Default-control').element();
  const explicit = screen.getByTestId('Explicit-control').element();
  expect(implicit.className).not.toBe('');
  expect(implicit.className).toBe(explicit.className);
});

test('the trigger opens the popup and a day click writes the input and closes it', async () => {
  const screen = await render(<Sample />);
  const input = screen.getByRole('textbox', { name: 'Release date' }).element() as HTMLInputElement;
  const content = screen.getByTestId('Release date-content').element();
  const trigger = screen.getByRole('button').element();

  expect(content).toHaveAttribute('hidden');
  await userEvent.click(trigger);
  await expect.poll(() => content.hasAttribute('hidden')).toBe(false);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');

  const grid = document.querySelector('[role="grid"]');
  expect(grid).not.toBeNull();
  const day = cellTriggers(':not([data-outside-range])')[3]!;
  await userEvent.click(day);
  await expect.poll(() => input.value).not.toBe('');
  await expect.poll(() => content.hasAttribute('hidden')).toBe(true);
});

test('Escape closes the popup', async () => {
  const screen = await render(<Sample />);
  const content = screen.getByTestId('Release date-content').element();
  await userEvent.click(screen.getByRole('button').element());
  await expect.poll(() => content.hasAttribute('hidden')).toBe(false);
  await userEvent.keyboard('{Escape}');
  await expect.poll(() => content.hasAttribute('hidden')).toBe(true);
});

test('the clear trigger empties the input', async () => {
  const screen = await render(<Sample defaultValue={[today(getLocalTimeZone())]} />);
  const input = screen.getByRole('textbox', { name: 'Release date' }).element() as HTMLInputElement;
  expect(input.value).not.toBe('');

  const clear = document.querySelector<HTMLButtonElement>('[data-part="clear-trigger"]')!;
  expect(clear).not.toBeNull();
  expect(clear.hasAttribute('hidden')).toBe(false);
  await userEvent.click(clear);
  await expect.poll(() => input.value).toBe('');
});

test('keyboard focus rings the control, and the open content renders none', async () => {
  const screen = await render(<Sample />);
  const control = screen.getByTestId('Release date-control').element();
  await userEvent.tab();
  expect(document.activeElement).toBe(
    screen.getByRole('textbox', { name: 'Release date' }).element(),
  );
  expect(getComputedStyle(control).outlineStyle).toBe('solid');
  expect(parseFloat(getComputedStyle(control).outlineWidth)).toBeGreaterThan(0);

  await userEvent.click(screen.getByRole('button').element());
  const content = screen.getByTestId('Release date-content').element();
  await expect.poll(() => content.hasAttribute('hidden')).toBe(false);
  expect(getComputedStyle(content).outlineStyle).toBe('none');
});

test('the named state attributes drive the cell trigger paint', async () => {
  const screen = await render(<Sample defaultOpen />);
  await expect.poll(() => cellTriggers().length).toBeGreaterThan(28);

  const days = cellTriggers(':not([data-outside-range]):not([data-today])');
  const today = cellTriggers('[data-today]')[0]!;
  const outside = cellTriggers('[data-outside-range]')[0]!;

  const plain = getComputedStyle(days[0]!);
  const todayStyle = getComputedStyle(today);
  expect(todayStyle.color !== plain.color || todayStyle.fontWeight !== plain.fontWeight).toBe(true);
  expect(getComputedStyle(outside).color).not.toBe(plain.color);

  const day = days[0]!;
  const unselected = getComputedStyle(day).backgroundColor;
  await userEvent.click(day);
  await expect.poll(() => getComputedStyle(day).backgroundColor).not.toBe(unselected);
  await expect.poll(() => getComputedStyle(day).color).not.toBe(getComputedStyle(days[1]!).color);
});

test('a hidden content and an empty clear trigger compute to display none', async () => {
  const screen = await render(<Sample />);
  const content = screen.getByTestId('Release date-content').element();
  const clear = document.querySelector<HTMLButtonElement>('[data-part="clear-trigger"]')!;

  expect(content).toHaveAttribute('hidden');
  expect(getComputedStyle(content).display).toBe('none');
  expect(clear).toHaveAttribute('hidden');
  expect(getComputedStyle(clear).display).toBe('none');
});

test('the namespace carries the machine anatomy plus Portal', () => {
  const parts = [
    'Root',
    'Label',
    'Control',
    'Input',
    'Trigger',
    'ClearTrigger',
    'PresetTrigger',
    'Content',
    'Positioner',
    'Portal',
    'ViewControl',
    'PrevTrigger',
    'NextTrigger',
    'ViewTrigger',
    'RangeText',
    'View',
    'Table',
    'TableHead',
    'TableBody',
    'TableRow',
    'TableHeader',
    'TableCell',
    'TableCellTrigger',
    'MonthSelect',
    'YearSelect',
  ];
  expect(parts).toHaveLength(25);
  expect(parts.filter((part) => part in DatePicker)).toEqual(parts);
});

test('the root type omits inline and the control carries the size axis', () => {
  expectTypeOf<DatePickerRootProps>().not.toHaveProperty('className');
  expectTypeOf<DatePickerRootProps>().not.toHaveProperty('inline');
  expectTypeOf<DatePickerRootProps>().toHaveProperty('open');
  expectTypeOf<DatePickerRootProps>().toHaveProperty('positioning');
  expectTypeOf<DatePickerRootProps>().toHaveProperty('selectionMode');
  expectTypeOf<DatePickerRootProps>().toHaveProperty('style');
  expectTypeOf<DatePickerSize>().toEqualTypeOf<'sm' | 'md' | 'lg'>();
});

test('part types expose the style slot and no className or render', () => {
  expectTypeOf<DatePickerControlProps>().not.toHaveProperty('className');
  expectTypeOf<DatePickerControlProps>().not.toHaveProperty('render');
  expectTypeOf<DatePickerControlProps>().toHaveProperty('style');
  expectTypeOf<DatePickerControlProps>().toHaveProperty('size');
});

for (const mode of themes) {
  test(`the open popup has no axe violations in ${mode.name}`, async () => {
    themeDocument(mode);
    const screen = await render(
      <main>
        <Sample defaultOpen defaultValue={[today(getLocalTimeZone())]} />
      </main>,
    );
    await expect.poll(
      () => screen.getByTestId('Release date-content').element().hasAttribute('hidden'),
    ).toBe(false);

    expect(await violations(screen.getByTestId('Release date-content').element())).toEqual([]);
  });
}
