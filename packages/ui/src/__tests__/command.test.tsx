import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Command,
  type CommandClearProps,
  type CommandEmptyProps,
  type CommandGroupLabelProps,
  type CommandIconProps,
  type CommandInputGroupProps,
  type CommandInputProps,
  type CommandItemProps,
  type CommandListProps,
  type CommandPopupProps,
  type CommandSeparatorProps,
  type CommandSize,
  type CommandStatusProps,
  type CommandTriggerProps,
} from '@ultima/ui';

import { themeDocument, themes, violations } from './axe';

/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: size sm/md/lg on InputGroup, and no props matches md.
 * 2. The name resolves: role combobox, named by a `<label htmlFor>` over Command.Input.
 * 3. The focus ring lands where the contract says: on InputGroup through `:focus-within`;
 *    the popup, the list, and a highlighted item render none.
 * 4. The primitive is still wired: typing filters, arrows highlight, Enter activates the
 *    highlighted item, Escape closes the popup.
 * 5. Documented state drives its style: data-highlighted, data-visible on Clear, and the
 *    invalid selector on InputGroup.
 * 6. Typecheck passes: className is rejected, and CommandSize is exactly its three values.
 * 7. Behavior this component wires itself: none, because every interaction is Base UI's
 *    (item 4) or a style reacting to a data attribute (items 5 and 8).
 * 8. CSS the primitive reads: List is the scroll container, and Popup tracks --anchor-width.
 */

const ACTIONS = ['Open report', 'Duplicate tab', 'Toggle sidebar', 'New file', 'Close window', 'Export PDF'];

function CommandFixture({
  size,
  name = 'Command',
  invalid = false,
  defaultValue,
  defaultOpen = false,
  items = ACTIONS,
}: {
  size?: CommandSize;
  name?: string;
  invalid?: boolean;
  defaultValue?: string;
  defaultOpen?: boolean;
  items?: string[];
}) {
  return (
    <Command.Root items={items} defaultValue={defaultValue} defaultOpen={defaultOpen}>
      <label htmlFor={`${name}-input`}>{name}</label>
      <Command.InputGroup
        size={size}
        data-testid={`${name}-group`}
        aria-invalid={invalid ? true : undefined}
      >
        <Command.Input id={`${name}-input`} placeholder="Search actions" />
        <Command.Clear aria-label={`Clear ${name}`} data-testid={`${name}-clear`} />
        <Command.Trigger aria-label={`Open ${name}`}>
          <Command.Icon />
        </Command.Trigger>
      </Command.InputGroup>
      <Command.Portal>
        <Command.Positioner sideOffset={4}>
          <Command.Popup data-testid={`${name}-popup`}>
            <Command.Status />
            <Command.Empty>No action matches.</Command.Empty>
            <Command.List data-testid={`${name}-list`}>
              {(action: string) => (
                <Command.Item key={action} value={action}>
                  {action}
                </Command.Item>
              )}
            </Command.List>
          </Command.Popup>
        </Command.Positioner>
      </Command.Portal>
    </Command.Root>
  );
}

for (const size of ['sm', 'md', 'lg'] as const) {
  test(`${size} input group renders with its input, clear, and trigger`, async () => {
    const screen = await render(<CommandFixture size={size} name={`${size} command`} />);
    await expect.element(screen.getByRole('combobox', { name: `${size} command` })).toBeVisible();
    await expect.element(screen.getByRole('button', { name: `Open ${size} command` })).toBeVisible();
  });
}

test('omitted size matches md', async () => {
  const screen = await render(
    <>
      <CommandFixture name="Default" />
      <CommandFixture size="md" name="Explicit" />
    </>,
  );
  const implicit = screen.getByTestId('Default-group').element();
  const explicit = screen.getByTestId('Explicit-group').element();
  expect(implicit.className).not.toBe('');
  expect(implicit.className).toBe(explicit.className);
});

test('a label names the input', async () => {
  const screen = await render(<CommandFixture name="Actions" />);
  await expect.element(screen.getByRole('combobox', { name: 'Actions' })).toBeVisible();
});

test('keyboard focus rings the input group, and the popup, list, and highlight show none', async () => {
  const screen = await render(<CommandFixture />);
  const group = screen.getByTestId('Command-group').element();
  await userEvent.tab();
  expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Command' }).element());
  expect(parseFloat(getComputedStyle(group).outlineWidth)).toBeGreaterThan(0);
  expect(getComputedStyle(group).outlineStyle).toBe('solid');
  await userEvent.keyboard('{ArrowDown}');
  const popup = screen.getByTestId('Command-popup').element();
  const list = screen.getByTestId('Command-list').element();
  await expect.element(popup).toBeVisible();
  expect(getComputedStyle(popup).outlineStyle).toBe('none');
  expect(getComputedStyle(list).outlineStyle).toBe('none');
  await userEvent.keyboard('{ArrowDown}');
  const highlighted = document.querySelector('[data-highlighted]');
  expect(highlighted).not.toBeNull();
  expect(getComputedStyle(highlighted!).outlineStyle).toBe('none');
});

test('the input group owns the box, so the input and trigger draw no border of their own', async () => {
  const screen = await render(<CommandFixture />);
  const group = screen.getByTestId('Command-group').element();
  const input = screen.getByRole('combobox', { name: 'Command' }).element();
  const trigger = screen.getByRole('button', { name: 'Open Command' }).element();
  expect(getComputedStyle(group).borderStyle).toBe('solid');
  expect(getComputedStyle(input).borderStyle).toBe('none');
  expect(getComputedStyle(trigger).borderStyle).toBe('none');
});

test('typing filters, arrows highlight, Enter activates, and Escape closes', async () => {
  const screen = await render(<CommandFixture />);
  const input = screen.getByRole('combobox', { name: 'Command' }).element() as HTMLInputElement;
  await userEvent.tab();
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(screen.getByRole('listbox')).toBeVisible();
  await expect.poll(() => document.querySelectorAll('[role="option"]').length).toBe(ACTIONS.length);
  await userEvent.fill(input, 'toggle');
  await expect.poll(() => document.querySelectorAll('[role="option"]').length).toBe(1);
  await expect.element(screen.getByRole('option', { name: 'Toggle sidebar' })).toBeVisible();
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => document.querySelector('[data-highlighted]')).not.toBeNull();
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => input.value).toBe('Toggle sidebar');
  await expect.poll(() => input.getAttribute('aria-expanded')).toBe('false');
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(screen.getByRole('listbox')).toBeVisible();
  await userEvent.keyboard('{Escape}');
  await expect.poll(() => input.getAttribute('aria-expanded')).toBe('false');
});

test('the empty part announces a filter that matches nothing', async () => {
  const screen = await render(<CommandFixture />);
  const input = screen.getByRole('combobox', { name: 'Command' }).element() as HTMLInputElement;
  await userEvent.click(input);
  await userEvent.fill(input, 'zzz');
  const empty = screen.getByText('No action matches.');
  await expect.element(empty).toBeVisible();
  expect(empty.element().closest('[role="status"]')).not.toBeNull();
});

test('clear visibility and invalid change computed styles', async () => {
  const screen = await render(
    <>
      <CommandFixture name="Empty" />
      <CommandFixture name="Filled" defaultValue="Toggle sidebar" />
      <CommandFixture name="Invalid" invalid />
    </>,
  );
  const empty = screen.getByTestId('Empty-group').element();
  const invalid = screen.getByTestId('Invalid-group').element();
  expect(getComputedStyle(invalid).borderColor).not.toBe(getComputedStyle(empty).borderColor);

  expect(document.querySelector('[data-testid="Empty-clear"]')).toBeNull();
  const filledClear = screen.getByTestId('Filled-clear').element();
  expect(filledClear).toHaveAttribute('data-visible');
  expect(getComputedStyle(filledClear).display).not.toBe('none');
  filledClear.removeAttribute('data-visible');
  expect(getComputedStyle(filledClear).display).toBe('none');
});

/** An open popup makes its siblings inert, so the open fixture renders alone. */
test('the highlight changes the item background', async () => {
  await render(<CommandFixture name="Open" />);
  await userEvent.tab();
  await userEvent.keyboard('{ArrowDown}');
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => document.querySelector('[data-highlighted]')).not.toBeNull();
  const options = [...document.querySelectorAll('[role="option"]')];
  const highlighted = document.querySelector('[data-highlighted]');
  const idle = options.find((option) => option !== highlighted);
  expect(highlighted).not.toBeNull();
  expect(idle).not.toBeUndefined();
  expect(getComputedStyle(highlighted!).backgroundColor).not.toBe(getComputedStyle(idle!).backgroundColor);
});

test('an inline root renders the list in place, with no popup', async () => {
  let activated = '';
  const screen = await render(
    <Command.Root open inline items={ACTIONS}>
      <label htmlFor="inline-input">Inline</label>
      <Command.InputGroup>
        <Command.Input id="inline-input" placeholder="Search actions" />
      </Command.InputGroup>
      <Command.Empty>No action matches.</Command.Empty>
      <Command.List data-testid="inline-list">
        {(action: string) => (
          <Command.Item key={action} value={action} onClick={() => (activated = action)}>
            {action}
          </Command.Item>
        )}
      </Command.List>
    </Command.Root>,
  );
  const input = screen.getByRole('combobox', { name: 'Inline' }).element() as HTMLInputElement;
  const list = screen.getByTestId('inline-list').element();
  await expect.element(screen.getByRole('listbox')).toBeVisible();
  await expect.poll(() => list.querySelectorAll('[role="option"]').length).toBe(ACTIONS.length);
  expect(list.closest('[data-testid]')).toBe(list);
  await userEvent.fill(input, 'new');
  await expect.poll(() => list.querySelectorAll('[role="option"]').length).toBe(1);
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => list.querySelector('[data-highlighted]')).not.toBeNull();
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => activated).toBe('New file');
  // The inline arrangement is an action palette, so activation leaves the query alone.
  expect(input.value).toBe('new');
});

test('the list scrolls and the popup tracks the anchor width', async () => {
  const many = Array.from({ length: 60 }, (_, index) => `Action ${index + 1}`);
  const screen = await render(
    <div style={{ width: '320px' }}>
      <CommandFixture name="Long" items={many} defaultOpen />
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
  expectTypeOf<CommandSize>().toEqualTypeOf<'sm' | 'md' | 'lg'>();
  expectTypeOf<CommandInputGroupProps>().toHaveProperty('size');
  expectTypeOf<CommandInputGroupProps['size']>().toEqualTypeOf<CommandSize | undefined>();
  expectTypeOf<CommandInputGroupProps>().not.toHaveProperty('className');
  expectTypeOf<CommandInputProps>().not.toHaveProperty('className');
  expectTypeOf<CommandTriggerProps>().not.toHaveProperty('className');
  expectTypeOf<CommandIconProps>().not.toHaveProperty('className');
  expectTypeOf<CommandClearProps>().not.toHaveProperty('className');
  expectTypeOf<CommandPopupProps>().not.toHaveProperty('className');
  expectTypeOf<CommandListProps>().not.toHaveProperty('className');
  expectTypeOf<CommandItemProps>().not.toHaveProperty('className');
  expectTypeOf<CommandGroupLabelProps>().not.toHaveProperty('className');
  expectTypeOf<CommandSeparatorProps>().not.toHaveProperty('className');
  expectTypeOf<CommandStatusProps>().not.toHaveProperty('className');
  expectTypeOf<CommandEmptyProps>().not.toHaveProperty('className');
});

test('the namespace carries every Base UI autocomplete part and the two collection values', () => {
  const parts = [
    'Root',
    'Value',
    'Trigger',
    'Input',
    'InputGroup',
    'Icon',
    'Clear',
    'List',
    'Status',
    'Portal',
    'Backdrop',
    'Positioner',
    'Popup',
    'Arrow',
    'Group',
    'GroupLabel',
    'Item',
    'Row',
    'Collection',
    'Empty',
    'Separator',
  ];
  expect(parts).toHaveLength(21);
  expect(parts.filter((part) => part in Command)).toEqual(parts);
  expect(typeof Command.useFilter).toBe('function');
  expect(typeof Command.useFilteredItems).toBe('function');
});

for (const mode of themes) {
  test(`the open popup has no axe violations in ${mode.name}`, async () => {
    themeDocument(mode);
    const screen = await render(
      <main>
        <CommandFixture defaultOpen />
      </main>,
    );
    await expect.element(screen.getByRole('listbox')).toBeVisible();

    expect(await violations(screen.getByTestId('Command-popup').element())).toEqual([]);
  });
}
