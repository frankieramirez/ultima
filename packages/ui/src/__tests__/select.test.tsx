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

import { themeDocument, themes, violations } from './axe';

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
          <Select.Popup data-testid="popup">
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
  await expect.poll(() => document.activeElement).toBe(trigger);
  await userEvent.keyboard('{ArrowDown}');
  await userEvent.keyboard('a');
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('false');
  expect(trigger).toHaveTextContent('Apple');
  await expect.poll(() => document.activeElement).toBe(trigger);
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

const settle = () => new Promise((resolve) => setTimeout(resolve, 300));

function Plain({ name, disabled = false, defaultOpen = false }: { name: string; disabled?: boolean; defaultOpen?: boolean }) {
  return (
    <Select.Root items={[{ value: 'oak', label: 'Oak' }]} disabled={disabled} defaultOpen={defaultOpen}>
      <Select.Trigger aria-label={name}>
        <Select.Value placeholder="Pick a material from the crafting list" />
        <Select.Icon />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner>
          <Select.Popup data-testid={`${name} popup`}>
            <Select.List>
              <Select.Item value="oak" data-testid={`${name} item`}>
                <Select.ItemIndicator />
                <Select.ItemText>Oak</Select.ItemText>
              </Select.Item>
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

test('hover darkens the trigger edge, not the fill, and a disabled trigger keeps its resting edge', async () => {
  const screen = await render(
    <>
      <Plain name="Live" />
      <Plain name="Off" disabled />
    </>,
  );
  const live = screen.getByRole('combobox', { name: 'Live' }).element();
  const off = screen.getByRole('combobox', { name: 'Off' }).element();
  const [liveEdge, liveFill] = [getComputedStyle(live).borderTopColor, getComputedStyle(live).backgroundColor];
  const offEdge = getComputedStyle(off).borderTopColor;
  await userEvent.hover(live);
  await settle();
  expect(getComputedStyle(live).borderTopColor).not.toBe(liveEdge);
  expect(getComputedStyle(live).backgroundColor).toBe(liveFill);
  await userEvent.hover(off);
  await settle();
  expect(off.matches(':hover')).toBe(true);
  expect(getComputedStyle(off).borderTopColor).toBe(offEdge);
});

test('a disabled trigger takes the muted fill and ink, not opacity', async () => {
  const screen = await render(
    <>
      <Plain name="Live" />
      <Plain name="Off" disabled />
    </>,
  );
  const live = getComputedStyle(screen.getByRole('combobox', { name: 'Live' }).element());
  const off = getComputedStyle(screen.getByRole('combobox', { name: 'Off' }).element());
  expect(off.opacity).toBe('1');
  expect(off.backgroundColor).not.toBe(live.backgroundColor);
  expect(off.color).not.toBe(live.color);
});

test('the focus outline sits outside the trigger edge with a gap', async () => {
  const screen = await render(<Plain name="Focus" />);
  await userEvent.tab();
  expect(getComputedStyle(screen.getByRole('combobox', { name: 'Focus' }).element()).outlineOffset).toBe('2px');
});

test('items are 32px rows with the small radius', async () => {
  const screen = await render(<Plain name="Rows" defaultOpen />);
  const item = screen.getByTestId('Rows item').element();
  await expect.element(item).toBeVisible();
  expect(item.getBoundingClientRect().height).toBeGreaterThanOrEqual(32);
  expect(getComputedStyle(item).borderTopLeftRadius).toBe('4px');
});

test('the check sits at the trailing edge, and a label without an icon starts at the item padding', async () => {
  const screen = await render(
    <Select.Root items={[{ value: 'oak', label: 'Oak' }, { value: 'pine', label: 'Pine' }]} defaultValue="oak" defaultOpen>
      <Select.Trigger aria-label="Wood">
        <Select.Value />
        <Select.Icon />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner>
          <Select.Popup>
            <Select.List>
              {['oak', 'pine'].map((value) => (
                <Select.Item key={value} value={value} data-testid={`${value} item`}>
                  <Select.ItemIndicator data-testid={`${value} check`} />
                  <Select.ItemText data-testid={`${value} text`}>{value}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>,
  );
  await expect.element(screen.getByTestId('oak check')).toBeVisible();
  const box = (id: string) => screen.getByTestId(id).element().getBoundingClientRect();
  expect(box('oak check').left).toBeGreaterThanOrEqual(box('oak text').right);
  for (const value of ['oak', 'pine']) {
    const padding = Number.parseFloat(getComputedStyle(screen.getByTestId(`${value} item`).element()).paddingLeft);
    expect(box(`${value} text`).left - box(`${value} item`).left).toBeCloseTo(padding, 0);
  }
});

test('an open trigger holds the hover edge, and its popup is never narrower than the trigger', async () => {
  const screen = await render(
    <>
      <Plain name="Closed" />
      <Plain name="Open" defaultOpen />
    </>,
  );
  const closed = screen.getByRole('combobox', { name: 'Closed' }).element();
  const open = screen.getByRole('combobox', { name: 'Open' }).element();
  await expect.element(screen.getByTestId('Open popup')).toBeVisible();
  await settle();
  expect(open.matches(':hover')).toBe(false);
  expect(getComputedStyle(open).borderTopColor).not.toBe(getComputedStyle(closed).borderTopColor);
  const popup = screen.getByTestId('Open popup').element();
  // --anchor-width is rounded to a whole pixel, so allow one.
  expect(popup.getBoundingClientRect().width).toBeGreaterThanOrEqual(open.getBoundingClientRect().width - 1);
});

test('items set their own leading rather than inheriting the page', async () => {
  const screen = await render(<Plain name="Leading" defaultOpen />);
  await expect.element(screen.getByTestId('Leading item')).toBeVisible();
  expect(getComputedStyle(screen.getByTestId('Leading item').element()).lineHeight).not.toBe('normal');
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

for (const mode of themes) {
  test(`the open popup has no axe violations in ${mode.name}`, async () => {
    themeDocument(mode);
    const screen = await render(
      <main>
        <FruitSelect labelled />
      </main>,
    );
    await userEvent.click(screen.getByRole('combobox', { name: 'Fruit' }).element());
    await expect.element(screen.getByRole('listbox')).toBeVisible();

    await expect.poll(() => getComputedStyle(screen.getByTestId('popup').element()).opacity).toBe('1');
    expect(await violations(screen.getByTestId('popup').element())).toEqual([]);
  });
}

test('an invalid trigger keeps its danger edge while disabled', async () => {
  const Invalid = ({ name, disabled = false }: { name: string; disabled?: boolean }) => (
    <Select.Root items={[{ value: 'oak', label: 'Oak' }]} disabled={disabled}>
      <Select.Trigger aria-label={name} aria-invalid="true">
        <Select.Value placeholder="Pick" />
      </Select.Trigger>
    </Select.Root>
  );
  const screen = await render(
    <>
      <Invalid name="Invalid" />
      <Invalid name="Invalid off" disabled />
    </>,
  );
  const edge = (name: string) => getComputedStyle(screen.getByRole('combobox', { name }).element()).borderTopColor;
  expect(edge('Invalid off')).toBe(edge('Invalid'));
});
