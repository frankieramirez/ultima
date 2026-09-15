import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Combobox,
  type ComboboxChipProps,
  type ComboboxClearProps,
  type ComboboxEmptyProps,
  type ComboboxIconProps,
  type ComboboxInputGroupProps,
  type ComboboxInputProps,
  type ComboboxItemIndicatorProps,
  type ComboboxItemProps,
  type ComboboxLabelProps,
  type ComboboxListProps,
  type ComboboxPopupProps,
  type ComboboxSeparatorProps,
  type ComboboxSize,
  type ComboboxStatusProps,
  type ComboboxTriggerProps,
} from '@ultima/ui';

import { themeDocument, themes, violations } from './axe';

/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: size sm/md/lg on InputGroup, and no props matches md.
 * 2. The name resolves: role combobox, named by a `<label htmlFor>` over Combobox.Input.
 * 3. The focus ring lands where the contract says: on InputGroup through `:focus-within`;
 *    the popup, the list, and a highlighted item render none.
 * 4. The primitive is still wired: typing filters, arrows highlight, Enter selects, Escape closes.
 * 5. Documented state drives its style: data-highlighted, data-selected, data-placeholder,
 *    data-visible on Clear, and the invalid selector on InputGroup.
 * 6. Typecheck passes: className is rejected, and ComboboxSize is exactly its three values.
 * 7. Behavior this component wires itself: none, because every interaction is Base UI's
 *    (item 4) or a style reacting to a data attribute (items 5 and 8).
 * 8. CSS the primitive reads: List is the scroll container, and Popup tracks --anchor-width.
 */

const SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Evocation', 'Illusion', 'Necromancy'];

function SchoolCombobox({
  size,
  name = 'School',
  invalid = false,
  defaultValue,
  defaultOpen = false,
  items = SCHOOLS,
}: {
  size?: ComboboxSize;
  name?: string;
  invalid?: boolean;
  defaultValue?: string | null;
  defaultOpen?: boolean;
  items?: string[];
}) {
  return (
    <Combobox.Root items={items} defaultValue={defaultValue} defaultOpen={defaultOpen}>
      <label htmlFor={`${name}-input`}>{name}</label>
      <Combobox.InputGroup size={size} data-testid={`${name}-group`} aria-invalid={invalid ? true : undefined}>
        <Combobox.Input id={`${name}-input`} placeholder="Search schools" />
        <Combobox.Clear aria-label={`Clear ${name}`} data-testid={`${name}-clear`} />
        <Combobox.Trigger aria-label={`Open ${name}`}>
          <Combobox.Icon />
        </Combobox.Trigger>
      </Combobox.InputGroup>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4}>
          <Combobox.Popup data-testid={`${name}-popup`}>
            <Combobox.Status />
            <Combobox.Empty>No school matches.</Combobox.Empty>
            <Combobox.List data-testid={`${name}-list`}>
              {(school: string) => (
                <Combobox.Item key={school} value={school}>
                  <Combobox.ItemIndicator />
                  {school}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

for (const size of ['sm', 'md', 'lg'] as const) {
  test(`${size} input group renders with its input, clear, and trigger`, async () => {
    const screen = await render(<SchoolCombobox size={size} name={`${size} school`} />);
    await expect.element(screen.getByRole('combobox', { name: `${size} school` })).toBeVisible();
    await expect.element(screen.getByRole('button', { name: `Open ${size} school` })).toBeVisible();
  });
}

test('omitted size matches md', async () => {
  const screen = await render(
    <>
      <SchoolCombobox name="Default" />
      <SchoolCombobox size="md" name="Explicit" />
    </>,
  );
  const implicit = screen.getByTestId('Default-group').element();
  const explicit = screen.getByTestId('Explicit-group').element();
  expect(implicit.className).not.toBe('');
  expect(implicit.className).toBe(explicit.className);
});

test('a label names the input, and Combobox.Label names the trigger', async () => {
  const screen = await render(
    <>
      <SchoolCombobox name="School" />
      <Combobox.Root items={SCHOOLS}>
        <Combobox.Label>Rank</Combobox.Label>
        <Combobox.Trigger>
          <Combobox.Value placeholder="Pick a rank" />
          <Combobox.Icon />
        </Combobox.Trigger>
      </Combobox.Root>
    </>,
  );
  await expect.element(screen.getByRole('combobox', { name: 'School' })).toBeVisible();
  await expect.element(screen.getByRole('combobox', { name: 'Rank' })).toBeVisible();
});

test('keyboard focus rings the input group, and the popup, list, and highlight show none', async () => {
  const screen = await render(<SchoolCombobox />);
  const group = screen.getByTestId('School-group').element();
  await userEvent.tab();
  expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'School' }).element());
  expect(parseFloat(getComputedStyle(group).outlineWidth)).toBeGreaterThan(0);
  expect(getComputedStyle(group).outlineStyle).toBe('solid');
  await userEvent.keyboard('{ArrowDown}');
  const popup = screen.getByTestId('School-popup').element();
  const list = screen.getByTestId('School-list').element();
  await expect.element(popup).toBeVisible();
  expect(getComputedStyle(popup).outlineStyle).toBe('none');
  expect(getComputedStyle(list).outlineStyle).toBe('none');
  const highlighted = document.querySelector('[data-highlighted]');
  expect(highlighted).not.toBeNull();
  expect(getComputedStyle(highlighted!).outlineStyle).toBe('none');
});

test('the input group owns the box, so the input and trigger draw no border of their own', async () => {
  const screen = await render(<SchoolCombobox />);
  const group = screen.getByTestId('School-group').element();
  const input = screen.getByRole('combobox', { name: 'School' }).element();
  const trigger = screen.getByRole('button', { name: 'Open School' }).element();
  expect(getComputedStyle(group).borderStyle).toBe('solid');
  expect(getComputedStyle(input).borderStyle).toBe('none');
  expect(getComputedStyle(trigger).borderStyle).toBe('none');
});

test('typing filters, arrows highlight, Enter selects, and Escape closes', async () => {
  const screen = await render(<SchoolCombobox />);
  const input = screen.getByRole('combobox', { name: 'School' }).element() as HTMLInputElement;
  await userEvent.tab();
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(screen.getByRole('listbox')).toBeVisible();
  await expect.poll(() => document.querySelectorAll('[role="option"]').length).toBe(SCHOOLS.length);
  await userEvent.fill(input, 'div');
  await expect.poll(() => document.querySelectorAll('[role="option"]').length).toBe(1);
  await expect.element(screen.getByRole('option', { name: 'Divination' })).toBeVisible();
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => document.querySelector('[data-highlighted]')).not.toBeNull();
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => input.value).toBe('Divination');
  await expect.poll(() => input.getAttribute('aria-expanded')).toBe('false');
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(screen.getByRole('listbox')).toBeVisible();
  await userEvent.keyboard('{Escape}');
  await expect.poll(() => input.getAttribute('aria-expanded')).toBe('false');
});

test('the empty part announces a filter that matches nothing', async () => {
  const screen = await render(<SchoolCombobox />);
  const input = screen.getByRole('combobox', { name: 'School' }).element() as HTMLInputElement;
  await userEvent.click(input);
  await userEvent.fill(input, 'zzz');
  const empty = screen.getByText('No school matches.');
  await expect.element(empty).toBeVisible();
  expect(empty.element().closest('[role="status"]')).not.toBeNull();
});

test('placeholder, clear visibility, and invalid change computed styles', async () => {
  const screen = await render(
    <>
      <SchoolCombobox name="Empty" />
      <SchoolCombobox name="Filled" defaultValue="Illusion" />
      <SchoolCombobox name="Invalid" invalid />
    </>,
  );
  const empty = screen.getByTestId('Empty-group').element();
  const invalid = screen.getByTestId('Invalid-group').element();
  expect(getComputedStyle(invalid).borderColor).not.toBe(getComputedStyle(empty).borderColor);

  const emptyTrigger = screen.getByRole('button', { name: 'Open Empty' }).element();
  const filledTrigger = screen.getByRole('button', { name: 'Open Filled' }).element();
  expect(emptyTrigger).toHaveAttribute('data-placeholder');
  expect(filledTrigger).not.toHaveAttribute('data-placeholder');
  expect(getComputedStyle(emptyTrigger).color).not.toBe(getComputedStyle(filledTrigger).color);

  expect(document.querySelector('[data-testid="Empty-clear"]')).toBeNull();
  const filledClear = screen.getByTestId('Filled-clear').element();
  expect(filledClear).toHaveAttribute('data-visible');
  const shown = getComputedStyle(filledClear).display;
  expect(shown).not.toBe('none');
  filledClear.removeAttribute('data-visible');
  expect(getComputedStyle(filledClear).display).toBe('none');
});

/** An open popup makes its siblings inert, so the open fixture renders alone. */
test('highlight and selection change computed styles', async () => {
  await render(<SchoolCombobox name="Filled" defaultValue="Illusion" />);
  await userEvent.tab();
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => document.querySelector('[data-highlighted]')).not.toBeNull();
  const options = [...document.querySelectorAll('[role="option"]')];
  const highlighted = document.querySelector('[data-highlighted]');
  const idle = options.find((option) => option !== highlighted);
  expect(highlighted).not.toBeNull();
  expect(idle).not.toBeUndefined();
  expect(getComputedStyle(highlighted!).backgroundColor).not.toBe(getComputedStyle(idle!).backgroundColor);
  const selected = document.querySelector('[data-selected]');
  const unselected = options.find((option) => option !== selected);
  expect(selected).not.toBeNull();
  expect(unselected).not.toBeUndefined();
  expect(getComputedStyle(selected!).fontWeight).not.toBe(getComputedStyle(unselected!).fontWeight);
});

test('the list scrolls and the popup tracks the anchor width', async () => {
  const many = Array.from({ length: 60 }, (_, index) => `School ${index + 1}`);
  const screen = await render(
    <div style={{ width: '320px' }}>
      <SchoolCombobox name="Long" items={many} defaultOpen />
    </div>,
  );
  const group = screen.getByTestId('Long-group').element();
  const popup = screen.getByTestId('Long-popup').element();
  const list = screen.getByTestId('Long-list').element();

  const listStyle = getComputedStyle(list);
  expect(listStyle.overflowY).toBe('auto');
  expect(listStyle.overscrollBehaviorY).toBe('contain');
  expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
  list.scrollTop = 40;
  expect(list.scrollTop).toBeGreaterThan(0);
  expect(popup.scrollHeight).toBe(popup.clientHeight);

  expect(Math.round(popup.getBoundingClientRect().width)).toBe(Math.round(group.getBoundingClientRect().width));
});

test('public prop types expose size on InputGroup only and no className on styled parts', () => {
  expectTypeOf<ComboboxSize>().toEqualTypeOf<'sm' | 'md' | 'lg'>();
  expectTypeOf<ComboboxInputGroupProps>().toHaveProperty('size');
  expectTypeOf<ComboboxInputGroupProps['size']>().toEqualTypeOf<ComboboxSize | undefined>();
  expectTypeOf<ComboboxInputGroupProps>().not.toHaveProperty('className');
  expectTypeOf<ComboboxLabelProps>().not.toHaveProperty('className');
  expectTypeOf<ComboboxInputProps>().not.toHaveProperty('className');
  expectTypeOf<ComboboxTriggerProps>().not.toHaveProperty('className');
  expectTypeOf<ComboboxIconProps>().not.toHaveProperty('className');
  expectTypeOf<ComboboxClearProps>().not.toHaveProperty('className');
  expectTypeOf<ComboboxChipProps>().not.toHaveProperty('className');
  expectTypeOf<ComboboxPopupProps>().not.toHaveProperty('className');
  expectTypeOf<ComboboxListProps>().not.toHaveProperty('className');
  expectTypeOf<ComboboxItemProps>().not.toHaveProperty('className');
  expectTypeOf<ComboboxItemIndicatorProps>().not.toHaveProperty('className');
  expectTypeOf<ComboboxSeparatorProps>().not.toHaveProperty('className');
  expectTypeOf<ComboboxStatusProps>().not.toHaveProperty('className');
  expectTypeOf<ComboboxEmptyProps>().not.toHaveProperty('className');
});

test('the namespace carries every Base UI part and the three collection values', () => {
  const parts = [
    'Root',
    'Label',
    'Value',
    'Input',
    'InputGroup',
    'Trigger',
    'Icon',
    'Clear',
    'Chips',
    'Chip',
    'ChipRemove',
    'Portal',
    'Backdrop',
    'Positioner',
    'Popup',
    'Arrow',
    'List',
    'Row',
    'Collection',
    'Item',
    'ItemIndicator',
    'Group',
    'GroupLabel',
    'Separator',
    'Status',
    'Empty',
  ];
  expect(parts).toHaveLength(26);
  expect(parts.filter((part) => part in Combobox)).toEqual(parts);
  expect(typeof Combobox.useFilter).toBe('function');
  expect(typeof Combobox.useFilteredItems).toBe('function');
  expect(typeof Combobox.createItems).toBe('function');
});

for (const mode of themes) {
  test(`the open popup has no axe violations in ${mode.name}`, async () => {
    themeDocument(mode);
    const screen = await render(
      <main>
        <SchoolCombobox defaultOpen />
      </main>,
    );
    await expect.element(screen.getByRole('listbox')).toBeVisible();

    expect(await violations(screen.getByTestId('School-popup').element())).toEqual([]);
  });
}
