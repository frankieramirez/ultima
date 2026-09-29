import { expect, expectTypeOf, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  ContextMenu,
  type ContextMenuItemProps,
  type ContextMenuPopupProps,
  DropdownMenu,
} from '@ultima/ui';

import { themeDocument, themes, violations } from './axe';

function MenuFixture({ onActivate = () => {} }: { onActivate?: () => void }) {
  return <ContextMenu.Root>
    <ContextMenu.Trigger data-testid="trigger">Report row</ContextMenu.Trigger>
    <ContextMenu.Portal>
      <ContextMenu.Backdrop />
      <ContextMenu.Positioner data-testid="positioner">
        <ContextMenu.Popup aria-label="Row actions">
          <ContextMenu.Arrow data-testid="arrow" />
          <ContextMenu.Group>
            <ContextMenu.GroupLabel>Document</ContextMenu.GroupLabel>
            <ContextMenu.Item data-testid="context-item" onClick={onActivate}>Rename</ContextMenu.Item>
            <ContextMenu.LinkItem href="#help">Help</ContextMenu.LinkItem>
            <ContextMenu.Item disabled>Delete</ContextMenu.Item>
          </ContextMenu.Group>
          <ContextMenu.Separator />
          <ContextMenu.CheckboxItem>
            <ContextMenu.CheckboxItemIndicator data-testid="check" />Pinned
          </ContextMenu.CheckboxItem>
          <ContextMenu.RadioGroup defaultValue="list">
            <ContextMenu.RadioItem value="list">
              <ContextMenu.RadioItemIndicator data-testid="dot" />List
            </ContextMenu.RadioItem>
            <ContextMenu.RadioItem value="grid" closeOnClick={false}>
              <ContextMenu.RadioItemIndicator data-testid="grid-dot" />Grid
            </ContextMenu.RadioItem>
          </ContextMenu.RadioGroup>
          <ContextMenu.SubmenuRoot>
            <ContextMenu.SubmenuTrigger>More</ContextMenu.SubmenuTrigger>
            <ContextMenu.Portal><ContextMenu.Positioner><ContextMenu.Popup>
              <ContextMenu.Item>Archive</ContextMenu.Item>
            </ContextMenu.Popup></ContextMenu.Positioner></ContextMenu.Portal>
          </ContextMenu.SubmenuRoot>
        </ContextMenu.Popup>
      </ContextMenu.Positioner>
    </ContextMenu.Portal>
  </ContextMenu.Root>;
}

async function openAt(testId = 'trigger') {
  await userEvent.click(page.getByTestId(testId).element(), { button: 'right' });
  await expect.element(page.getByRole('menu', { name: 'Row actions' })).toBeVisible();
}

test('every part renders and a right click opens the menu the caller named', async () => {
  await render(<MenuFixture />);
  await openAt();
  await expect.element(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
  await expect.element(page.getByRole('group', { name: 'Document' })).toBeVisible();
  await expect.element(page.getByRole('separator')).toBeVisible();
  await expect.element(page.getByRole('menuitemcheckbox', { name: 'Pinned' })).toBeVisible();
  await expect.element(page.getByRole('menuitemradio', { name: 'List' })).toBeVisible();
  await expect.element(page.getByRole('menuitem', { name: 'More' })).toBeVisible();
  await expect.element(page.getByTestId('arrow')).toBeInTheDocument();
});

test('the trigger carries no Ultima styles and nothing in the menu shows a ring', async () => {
  const screen = await render(<MenuFixture />);
  const trigger = screen.getByTestId('trigger').element();
  expect(trigger.className).toBe('');
  expect(trigger.tagName).toBe('DIV');
  expect(trigger.getAttribute('role')).toBeNull();
  expect([...trigger.attributes].map(({ name }) => name).filter((name) => name.startsWith('aria-'))).toEqual([]);
  expect(trigger.tabIndex).toBeLessThan(0);
  await openAt();
  const popup = page.getByRole('menu', { name: 'Row actions' }).element();
  expect(getComputedStyle(popup).outlineWidth).toBe('0px');
  const item = page.getByRole('menuitem', { name: 'Rename' });
  const resting = getComputedStyle(item.element()).backgroundColor;
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(item).toHaveAttribute('data-highlighted');
  expect(getComputedStyle(item.element()).outlineWidth).toBe('0px');
  expect(getComputedStyle(item.element()).backgroundColor).not.toBe(resting);
});

test('arrows move the highlight, typeahead matches, Enter activates, and Escape closes', async () => {
  const onActivate = vi.fn();
  await render(<MenuFixture onActivate={onActivate} />);
  await openAt();
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(page.getByRole('menuitem', { name: 'Rename' })).toHaveAttribute('data-highlighted');
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(page.getByRole('menuitem', { name: 'Help' })).toHaveAttribute('data-highlighted');
  await userEvent.keyboard('{End}{ArrowDown}');
  await expect.element(page.getByRole('menuitem', { name: 'Rename' })).toHaveAttribute('data-highlighted');
  await userEvent.keyboard('h');
  await expect.element(page.getByRole('menuitem', { name: 'Help' })).toHaveAttribute('data-highlighted');
  await userEvent.keyboard('{Home}{Enter}');
  expect(onActivate).toHaveBeenCalledOnce();
  await expect.element(page.getByRole('menu', { name: 'Row actions' })).not.toBeInTheDocument();
  await openAt();
  await userEvent.keyboard('{Escape}');
  await expect.element(page.getByRole('menu', { name: 'Row actions' })).not.toBeInTheDocument();
});

test('documented state drives the paint: selection glyphs, disabled dimming, and an open submenu', async () => {
  await render(<MenuFixture />);
  await openAt();
  const checkbox = page.getByRole('menuitemcheckbox', { name: 'Pinned' });
  await expect.element(checkbox).toHaveAttribute('aria-checked', 'false');
  await expect.element(page.getByTestId('check')).not.toBeInTheDocument();
  await checkbox.click();
  await expect.element(checkbox).toHaveAttribute('data-checked');
  await expect.element(page.getByTestId('check')).toBeVisible();
  expect(page.getByTestId('check').element().querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  await expect.element(page.getByRole('menuitemradio', { name: 'List' })).toHaveAttribute('data-checked');
  await expect.element(page.getByTestId('dot')).toBeVisible();
  await page.getByRole('menuitemradio', { name: 'Grid' }).click();
  await expect.element(page.getByTestId('grid-dot')).toBeVisible();
  await expect.element(page.getByTestId('dot')).not.toBeInTheDocument();
  const disabled = page.getByRole('menuitem', { name: 'Delete' }).element();
  expect(disabled).toHaveAttribute('data-disabled');
  expect(parseFloat(getComputedStyle(disabled).opacity)).toBeLessThan(parseFloat(getComputedStyle(checkbox.element()).opacity));
  expect(getComputedStyle(page.getByRole('menuitem', { name: 'Help' }).element()).textDecorationLine).toBe('none');

  const more = page.getByRole('menuitem', { name: 'More' });
  const resting = getComputedStyle(more.element()).backgroundColor;
  await userEvent.keyboard('{ArrowDown}{End}{ArrowRight}');
  await expect.element(page.getByRole('menuitem', { name: 'Archive' })).toBeVisible();
  await expect.element(more).toHaveAttribute('data-popup-open');
  more.element().removeAttribute('data-highlighted');
  expect(getComputedStyle(more.element()).backgroundColor).not.toBe(resting);
  expect(more.element().querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
});

test('the positioner seeds the transform origin the popup transitions from', async () => {
  await render(<MenuFixture />);
  await openAt();
  const positioner = page.getByTestId('positioner').element();
  const popup = page.getByRole('menu', { name: 'Row actions' }).element();
  expect(getComputedStyle(positioner).getPropertyValue('--transform-origin').trim()).not.toBe('');
  expect(getComputedStyle(popup).transformOrigin).toBe(getComputedStyle(positioner).getPropertyValue('--transform-origin').trim());
  expect(getComputedStyle(popup).transitionDuration).not.toBe('0s');
});

test('an item paints exactly as a Dropdown Menu item does', async () => {
  await render(
    <>
      <MenuFixture />
      <DropdownMenu.Root defaultOpen modal={false}>
        <DropdownMenu.Trigger render={<button />}>Actions</DropdownMenu.Trigger>
        <DropdownMenu.Portal><DropdownMenu.Positioner><DropdownMenu.Popup>
          <DropdownMenu.Item data-testid="dropdown-item">Rename</DropdownMenu.Item>
        </DropdownMenu.Popup></DropdownMenu.Positioner></DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>,
  );
  await openAt();
  const shared = [
    'display',
    'gridTemplateColumns',
    'alignItems',
    'gap',
    'borderRadius',
    'paddingBlockStart',
    'paddingInlineStart',
    'fontSize',
    'fontFamily',
    'lineHeight',
    'color',
    'cursor',
    'userSelect',
    'outlineWidth',
    'backgroundColor',
    'opacity',
  ] as const;
  const paint = (element: Element) => {
    const computed = getComputedStyle(element);
    return Object.fromEntries(shared.map((property) => [property, computed[property]]));
  };
  const dropdown = paint(page.getByTestId('dropdown-item').element());
  expect(paint(page.getByTestId('context-item').element())).toEqual(dropdown);
});

test('styled parts reject className', () => {
  expectTypeOf<ContextMenuItemProps>().not.toHaveProperty('className');
  expectTypeOf<ContextMenuPopupProps>().not.toHaveProperty('className');
});

for (const mode of themes) {
  test(`the open menu has no axe violations in ${mode.name}`, async () => {
    themeDocument(mode);
    await render(
      <main>
        <MenuFixture />
      </main>,
    );
    await openAt();

    const popup = page.getByRole('menu', { name: 'Row actions' }).element();
    await expect.poll(() => getComputedStyle(popup).opacity).toBe('1');
    expect(await violations(popup)).toEqual([]);
  });
}
