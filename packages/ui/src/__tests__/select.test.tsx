import { type ComponentProps } from 'react';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Select,
  type SelectIconProps,
  type SelectItemIndicatorProps,
  type SelectItemProps,
  type SelectItemTextProps,
  type SelectLabelProps,
  type SelectPopupProps,
  type SelectSeparatorProps,
  type SelectSize,
  type SelectTriggerProps,
  type SelectValueProps,
} from '@ultima/ui';

function FruitSelect({
  size,
  name,
  labelled = false,
  invalid = false,
  defaultValue,
  defaultOpen = false,
}: {
  size?: SelectSize;
  name?: string;
  labelled?: boolean;
  invalid?: boolean;
  defaultValue?: string | null;
  defaultOpen?: boolean;
}) {
  return (
    <Select.Root
      defaultValue={defaultValue}
      defaultOpen={defaultOpen}
      items={[
        { value: 'orange', label: 'Orange' },
        { value: 'apple', label: 'Apple' },
        { value: 'banana', label: 'Banana' },
      ]}
    >
      {labelled ? <Select.Label>Fruit</Select.Label> : null}
      <Select.Trigger
        size={size}
        aria-label={labelled ? undefined : (name ?? 'Fruit')}
        aria-invalid={invalid ? true : undefined}
      >
        <Select.Value placeholder="Pick a fruit" />
        <Select.Icon />
      </Select.Trigger>
      <Select.Portal>
        <Select.Backdrop />
        <Select.Positioner>
          <Select.Popup>
            <Select.ScrollUpArrow />
            <Select.List>
              <Select.Group>
                <Select.GroupLabel>Citrus</Select.GroupLabel>
                <Select.Item value="orange">
                  <Select.ItemIndicator />
                  <Select.ItemText>Orange</Select.ItemText>
                </Select.Item>
              </Select.Group>
              <Select.Separator />
              <Select.Item value="apple">
                <Select.ItemIndicator />
                <Select.ItemText>Apple</Select.ItemText>
              </Select.Item>
              <Select.Item value="banana" disabled>
                <Select.ItemIndicator />
                <Select.ItemText>Banana</Select.ItemText>
              </Select.Item>
            </Select.List>
            <Select.ScrollDownArrow />
            <Select.Arrow />
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

for (const size of ['sm', 'md', 'lg'] as const) {
  test(`${size} trigger renders with groups, a separator, and a disabled item`, async () => {
    const screen = await render(<FruitSelect size={size} name={`${size} fruit`} />);
    await expect.element(screen.getByRole('combobox', { name: `${size} fruit` })).toBeVisible();
  });
}

test('omitted size matches md', async () => {
  const screen = await render(
    <>
      <FruitSelect name="Default" />
      <FruitSelect size="md" name="Explicit" />
    </>,
  );
  const implicit = screen.getByRole('combobox', { name: 'Default' }).element();
  const explicit = screen.getByRole('combobox', { name: 'Explicit' }).element();
  expect(implicit.className).not.toBe('');
  expect(implicit.className).toBe(explicit.className);
});

test('aria-label names the combobox', async () => {
  const screen = await render(<FruitSelect name="Season" />);
  await expect.element(screen.getByRole('combobox', { name: 'Season' })).toBeVisible();
});

test('Select.Label names the combobox', async () => {
  const screen = await render(<FruitSelect labelled />);
  await expect.element(screen.getByRole('combobox', { name: 'Fruit' })).toBeVisible();
});

test('keyboard focus draws the trigger outline and none on the popup or highlighted item', async () => {
  const screen = await render(<FruitSelect />);
  const trigger = screen.getByRole('combobox', { name: 'Fruit' }).element();
  await userEvent.tab();
  expect(document.activeElement).toBe(trigger);
  expect(parseFloat(getComputedStyle(trigger).outlineWidth)).toBeGreaterThan(0);
  expect(getComputedStyle(trigger).outlineStyle).toBe('solid');
  await userEvent.keyboard('{ArrowDown}');
  const listbox = screen.getByRole('listbox').element();
  await expect.element(listbox).toBeVisible();
  const popup = listbox.parentElement;
  expect(popup).not.toBeNull();
  expect(getComputedStyle(popup!).outlineStyle).toBe('none');
  const highlighted = document.querySelector('[data-highlighted]');
  expect(highlighted).not.toBeNull();
  expect(getComputedStyle(highlighted!).outlineStyle).toBe('none');
});

test('arrows, typeahead, escape, and enter keep the primitive wired', async () => {
  const screen = await render(<FruitSelect />);
  const trigger = screen.getByRole('combobox', { name: 'Fruit' }).element();
  await userEvent.tab();
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(screen.getByRole('listbox')).toBeVisible();
  expect(document.querySelector('[data-highlighted]')).not.toBeNull();
  await userEvent.keyboard('a');
  const apple = screen.getByRole('option', { name: 'Apple' }).element();
  expect(apple).toHaveAttribute('data-highlighted');
  await userEvent.keyboard('{Escape}');
  await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(trigger);
  await userEvent.keyboard('{ArrowDown}');
  await userEvent.keyboard('a');
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('false');
  expect(trigger).toHaveTextContent('Apple');
  expect(document.activeElement).toBe(trigger);
});

test('placeholder, highlight, selected, and invalid change computed styles without naming a value', async () => {
  const screen = await render(
    <>
      <FruitSelect name="Empty" />
      <FruitSelect name="Filled" defaultValue="apple" defaultOpen />
      <FruitSelect name="Invalid" invalid />
    </>,
  );
  const empty = screen.getByRole('combobox', { name: 'Empty' }).element();
  const filled = screen.getByRole('combobox', { name: 'Filled' }).element();
  const invalid = screen.getByRole('combobox', { name: 'Invalid' }).element();
  const placeholder = empty.querySelector('[data-placeholder]');
  const selectedValue = filled.querySelector('[data-placeholder]') ? null : filled.querySelector('span');
  expect(placeholder).not.toBeNull();
  expect(selectedValue).not.toBeNull();
  expect(getComputedStyle(placeholder!).color).not.toBe(getComputedStyle(selectedValue!).color);
  const highlighted = document.querySelector('[data-highlighted]');
  const options = [...document.querySelectorAll('[role="option"]')];
  const idle = options.find((option) => option !== highlighted && !option.hasAttribute('data-disabled'));
  expect(highlighted).not.toBeNull();
  expect(idle).not.toBeUndefined();
  expect(getComputedStyle(highlighted!).backgroundColor).not.toBe(getComputedStyle(idle!).backgroundColor);
  const selected = document.querySelector('[data-selected]');
  const unselected = options.find((option) => option !== selected && !option.hasAttribute('data-disabled'));
  expect(selected).not.toBeNull();
  expect(unselected).not.toBeUndefined();
  expect(getComputedStyle(selected!).fontWeight).not.toBe(getComputedStyle(unselected!).fontWeight);
  expect(getComputedStyle(invalid).borderColor).not.toBe(getComputedStyle(empty).borderColor);
});

test('public prop types expose size on Trigger only and no className on styled parts', () => {
  expectTypeOf<SelectSize>().toEqualTypeOf<'sm' | 'md' | 'lg'>();
  expectTypeOf<SelectTriggerProps>().toHaveProperty('size');
  expectTypeOf<ComponentProps<typeof Select.Root>>().not.toHaveProperty('size');
  expectTypeOf<SelectTriggerProps>().not.toHaveProperty('className');
  expectTypeOf<SelectLabelProps>().not.toHaveProperty('className');
  expectTypeOf<SelectValueProps>().not.toHaveProperty('className');
  expectTypeOf<SelectIconProps>().not.toHaveProperty('className');
  expectTypeOf<SelectPopupProps>().not.toHaveProperty('className');
  expectTypeOf<SelectItemProps>().not.toHaveProperty('className');
  expectTypeOf<SelectItemTextProps>().not.toHaveProperty('className');
  expectTypeOf<SelectItemIndicatorProps>().not.toHaveProperty('className');
  expectTypeOf<SelectSeparatorProps>().not.toHaveProperty('className');
});
