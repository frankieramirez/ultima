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
import { resolved } from './overlay';

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
  // Selection shows with the check; the weight holds so the label doesn't shift.
  expect(getComputedStyle(selected!).fontWeight).toBe(getComputedStyle(unselected!).fontWeight);
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

test('items are 32px rows with the small radius in the popup\'s 4px inset, and the check trails', async () => {
  await render(<SchoolCombobox name="Filled" defaultValue="Illusion" defaultOpen />);
  const popup = document.querySelector('[data-testid="Filled-popup"]')!;
  const list = document.querySelector('[data-testid="Filled-list"]')!;
  await expect.poll(() => document.querySelector('[role="option"][data-selected]')).not.toBeNull();
  const inset = resolved('padding-top', 'var(--ult-space-2)');
  expect(getComputedStyle(popup).paddingLeft).toBe(inset);
  expect(getComputedStyle(list).paddingTop).toBe(inset);

  const selected = document.querySelector('[role="option"][data-selected]')!;
  const row = selected.getBoundingClientRect();
  expect(`${row.height}px`).toBe(resolved('height', 'var(--ult-space-9)'));
  expect(getComputedStyle(selected).borderTopLeftRadius).toBe(resolved('border-top-left-radius', 'var(--ult-radius-sm)'));
  // The label starts at the row's own padding, and the check sits that same step in from the far edge.
  const step = parseFloat(resolved('padding-top', 'var(--ult-space-4)'));
  expect(getComputedStyle(selected).paddingLeft).toBe(`${step}px`);
  const check = selected.querySelector('svg')!.parentElement!.getBoundingClientRect();
  expect(Math.abs(row.right - check.right - step)).toBeLessThan(1);
});

test('the input group is Input Group\'s field: a hover edge, an inset ring, and the disabled ink instead of dimming', async () => {
  const screen = await render(
    <>
      <SchoolCombobox name="School" />
      <Combobox.Root items={SCHOOLS} disabled>
        <Combobox.InputGroup data-testid="off-group">
          <Combobox.Input aria-label="Off" />
        </Combobox.InputGroup>
      </Combobox.Root>
    </>,
  );
  const group = screen.getByTestId('School-group');
  expect(getComputedStyle(group.element()).fontSize).toBe(resolved('font-size', 'var(--ult-text-4)'));
  await group.hover();
  await expect.poll(() => getComputedStyle(group.element()).borderTopColor).toBe(resolved('border-top-color', 'var(--ult-color-border-hover)'));
  await userEvent.tab();
  // Outside the edge with a gap, as on every other control.
  expect(parseFloat(getComputedStyle(group.element()).outlineOffset)).toBeGreaterThan(0);

  const off = screen.getByTestId('off-group').element();
  expect(getComputedStyle(off).opacity).toBe('1');
  expect(getComputedStyle(off).color).toBe(resolved('color', 'var(--ult-color-text-disabled)'));
});

function Reagents({ name, values, disabled, width }: { name: string; values: string[]; disabled?: boolean; width?: number }) {
  return (
    <div style={{ inlineSize: width }}>
      <Combobox.Root items={SCHOOLS} multiple defaultValue={values} disabled={disabled}>
        <Combobox.InputGroup data-testid={`${name}-group`}>
          <Combobox.Chips data-testid={`${name}-chips`}>
            <Combobox.Value>
              {(selected: string[]) =>
                selected.map((school) => (
                  <Combobox.Chip key={school} data-testid={`${name}-chip`}>
                    {school}
                    <Combobox.ChipRemove aria-label={`Remove ${school}`} data-testid={`${name}-remove`} />
                  </Combobox.Chip>
                ))
              }
            </Combobox.Value>
            <Combobox.Input aria-label={name} data-testid={`${name}-input`} />
          </Combobox.Chips>
        </Combobox.InputGroup>
      </Combobox.Root>
    </div>
  );
}

test('a disabled chip takes the disabled ink instead of fading, one fill step above the sunken field', async () => {
  const screen = await render(
    <>
      <Reagents name="live" values={['Illusion']} />
      <Reagents name="off" values={['Illusion']} disabled />
    </>,
  );
  const live = getComputedStyle(screen.getByTestId('live-chip').element());
  const off = getComputedStyle(screen.getByTestId('off-chip').element());
  expect(live.color).toBe(resolved('color', 'var(--ult-color-text)'));
  expect(live.backgroundColor).toBe(resolved('background-color', 'var(--ult-color-accent-subtle)'));
  expect(off.opacity).toBe('1');
  expect(off.color).toBe(resolved('color', 'var(--ult-color-text-disabled)'));
  expect(off.backgroundColor).toBe(resolved('background-color', 'var(--ult-color-surface-hover)'));
});

test('a chip is a 24px tinted inset with no border, and its remove button a 16px target 4px from its edges', async () => {
  const screen = await render(<Reagents name="r" values={['Illusion']} />);
  const chip = screen.getByTestId('r-chip').element();
  const style = getComputedStyle(chip);
  const box = chip.getBoundingClientRect();
  expect(`${box.height}px`).toBe(resolved('height', 'var(--ult-space-8)'));
  expect(style.borderTopStyle).toBe('none');
  expect(style.borderTopLeftRadius).toBe(resolved('border-top-left-radius', 'var(--ult-radius-sm)'));
  expect(style.fontSize).toBe(resolved('font-size', 'var(--ult-text-3)'));
  expect(style.paddingInlineStart).toBe(resolved('padding-left', 'var(--ult-space-4)'));

  const remove = screen.getByTestId('r-remove').element().getBoundingClientRect();
  const step = parseFloat(resolved('padding-top', 'var(--ult-space-2)'));
  expect(`${remove.width}px`).toBe(resolved('width', 'var(--ult-space-6)'));
  expect(`${remove.height}px`).toBe(resolved('height', 'var(--ult-space-6)'));
  expect(Math.abs(remove.top - box.top - step)).toBeLessThan(1);
  expect(Math.abs(box.right - remove.right - step)).toBeLessThan(1);
});

test('chips wrap in rows 4px apart, keep the single-row inset, and the input wraps only under 64px', async () => {
  const screen = await render(
    <>
      <Reagents name="one" values={['Illusion']} width={320} />
      <Reagents name="many" values={['Abjuration', 'Conjuration', 'Divination', 'Evocation', 'Necromancy']} width={320} />
    </>,
  );
  const gap = resolved('row-gap', 'var(--ult-space-2)');
  const chips = getComputedStyle(screen.getByTestId('many-chips').element());
  expect(chips.display).toBe('flex');
  expect(chips.flexWrap).toBe('wrap');
  expect(chips.rowGap).toBe(gap);
  expect(chips.columnGap).toBe(gap);
  expect(getComputedStyle(screen.getByTestId('many-input').element()).flexBasis).toBe(resolved('flex-basis', 'var(--ult-space-12)'));

  // One row sits centred in the 40px control, the chip's top and start inset matching.
  const group = screen.getByTestId('one-group').element();
  const outer = group.getBoundingClientRect();
  const edge = parseFloat(getComputedStyle(group).borderTopWidth);
  const chip = screen.getByTestId('one-chip').element().getBoundingClientRect();
  expect(`${outer.height}px`).toBe(resolved('height', 'var(--ult-space-10)'));
  const top = chip.top - outer.top - edge;
  const start = chip.left - outer.left - edge;
  expect(Math.abs(top - start)).toBeLessThanOrEqual(1);

  // A wrapped field keeps that inset above its first row and below its last.
  const many = screen.getByTestId('many-group').element();
  const box = many.getBoundingClientRect();
  const rows = screen.getByTestId('many-chip').elements().map((el) => el.getBoundingClientRect());
  expect(new Set(rows.map((r) => Math.round(r.top))).size).toBeGreaterThan(1);
  const input = screen.getByTestId('many-input').element().getBoundingClientRect();
  const bottom = Math.max(input.bottom, ...rows.map((r) => r.bottom));
  expect(Math.abs(rows[0]!.top - box.top - edge - top)).toBeLessThanOrEqual(1);
  expect(Math.abs(box.bottom - edge - bottom - top)).toBeLessThanOrEqual(1);
});

test('the arrow key moves focus onto a chip, and the chip shows the ring outside its edge', async () => {
  const screen = await render(<Reagents name="k" values={['Illusion', 'Necromancy']} />);
  await screen.getByTestId('k-input').click();
  await userEvent.keyboard('{Escape}');
  await userEvent.keyboard('{ArrowLeft}');
  const [first, second] = screen.getByTestId('k-chip').elements() as [HTMLElement, HTMLElement];
  await expect.poll(() => document.activeElement).toBe(second);
  const style = getComputedStyle(second);
  expect(style.outlineStyle).toBe('solid');
  expect(style.outlineWidth).toBe('2px');
  expect(style.outlineColor).toBe(resolved('color', 'var(--ult-color-border-focus)'));
  expect(parseFloat(style.outlineOffset)).toBeGreaterThan(0);
  expect(getComputedStyle(first).outlineStyle).toBe('none');
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
