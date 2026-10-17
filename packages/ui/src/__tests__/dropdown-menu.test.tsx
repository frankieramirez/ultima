import { expect, expectTypeOf, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button, DropdownMenu, type DropdownMenuItemProps, type DropdownMenuPopupProps } from '@ultima/ui';

import { themeDocument, themes, violations } from './axe';
import { expectArrowOnEdge, resolved } from './overlay';

test('the trigger opens a named menu with named items', async () => {
  const screen = await render(
    <DropdownMenu.Root>
      <DropdownMenu.Trigger render={<button />}>Actions</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Positioner>
          <DropdownMenu.Popup>
            <DropdownMenu.Item>Rename</DropdownMenu.Item>
          </DropdownMenu.Popup>
        </DropdownMenu.Positioner>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>,
  );
  await screen.getByRole('button', { name: 'Actions' }).click();
  await expect.element(page.getByRole('menu', { name: 'Actions' })).toBeVisible();
  await expect.element(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
});

test('all labels align at the left and selection indicators sit at the right', async () => {
  await render(
    <DropdownMenu.Root defaultOpen>
      <DropdownMenu.Trigger>Options</DropdownMenu.Trigger>
      <DropdownMenu.Portal><DropdownMenu.Positioner><DropdownMenu.Popup>
        <DropdownMenu.Item><span data-testid="plain">Rename</span></DropdownMenu.Item>
        <DropdownMenu.CheckboxItem defaultChecked>
          <DropdownMenu.CheckboxItemIndicator data-testid="trailing-check" />
          <span data-testid="checked">Pinned</span>
        </DropdownMenu.CheckboxItem>
        <DropdownMenu.CheckboxItem>
          <DropdownMenu.CheckboxItemIndicator />
          <span data-testid="unchecked">Hidden</span>
        </DropdownMenu.CheckboxItem>
      </DropdownMenu.Popup></DropdownMenu.Positioner></DropdownMenu.Portal>
    </DropdownMenu.Root>,
  );
  await expect.element(page.getByRole('menu')).toBeVisible();
  const left = (name: string) => page.getByTestId(name).element().getBoundingClientRect().left;
  expect(left('plain')).toBe(left('checked'));
  const label = page.getByTestId('checked').element().getBoundingClientRect();
  const indicator = page.getByTestId('trailing-check').element().getBoundingClientRect();
  expect(indicator.left).toBeGreaterThan(label.right);
  expect(Math.abs(indicator.top + indicator.height / 2 - label.top - label.height / 2)).toBeLessThan(1);
  const plain = page.getByRole('menuitem', { name: 'Rename' }).element();
  expect(left('plain') - plain.getBoundingClientRect().left).toBe(parseFloat(getComputedStyle(plain).paddingLeft));
  expect(left('unchecked')).toBe(left('checked'));
});

function MenuFixture({ onActivate = () => {} }: { onActivate?: () => void }) {
  return <DropdownMenu.Root>
    <DropdownMenu.Trigger render={<button />}>Actions</DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Backdrop />
      <DropdownMenu.Positioner>
        <DropdownMenu.Popup>
          <DropdownMenu.Arrow data-testid="arrow" />
          <DropdownMenu.Viewport>
            <DropdownMenu.Group>
              <DropdownMenu.GroupLabel>File</DropdownMenu.GroupLabel>
              <DropdownMenu.Item onClick={onActivate}>Rename</DropdownMenu.Item>
              <DropdownMenu.LinkItem href="#help">Help</DropdownMenu.LinkItem>
              <DropdownMenu.Item disabled>Delete</DropdownMenu.Item>
            </DropdownMenu.Group>
            <DropdownMenu.Separator />
            <DropdownMenu.CheckboxItem>
              <DropdownMenu.CheckboxItemIndicator data-testid="check" />Pinned
            </DropdownMenu.CheckboxItem>
            <DropdownMenu.RadioGroup defaultValue="list">
              <DropdownMenu.RadioItem value="list">
                <DropdownMenu.RadioItemIndicator data-testid="dot" />List
              </DropdownMenu.RadioItem>
              <DropdownMenu.RadioItem value="grid" closeOnClick={false}>
                <DropdownMenu.RadioItemIndicator data-testid="grid-dot" />Grid
              </DropdownMenu.RadioItem>
            </DropdownMenu.RadioGroup>
            <DropdownMenu.SubmenuRoot>
              <DropdownMenu.SubmenuTrigger>More</DropdownMenu.SubmenuTrigger>
              <DropdownMenu.Portal><DropdownMenu.Positioner><DropdownMenu.Popup>
                <DropdownMenu.Item>Archive</DropdownMenu.Item>
              </DropdownMenu.Popup></DropdownMenu.Positioner></DropdownMenu.Portal>
            </DropdownMenu.SubmenuRoot>
          </DropdownMenu.Viewport>
        </DropdownMenu.Popup>
      </DropdownMenu.Positioner>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>;
}

test('keyboard navigation highlights, loops, matches text, activates, and restores focus', async () => {
  const onActivate = vi.fn();
  const screen = await render(<MenuFixture onActivate={onActivate} />);
  const trigger = screen.getByRole('button', { name: 'Actions' });
  await trigger.click();
  const item = page.getByRole('menuitem', { name: 'Rename' });
  const resting = getComputedStyle(item.element()).backgroundColor;
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(item).toHaveAttribute('data-highlighted');
  expect(getComputedStyle(item.element()).outlineWidth).toBe('0px');
  expect(getComputedStyle(item.element()).backgroundColor).not.toBe(resting);
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(page.getByRole('menuitem', { name: 'Help' })).toHaveAttribute('data-highlighted');
  await userEvent.keyboard('{End}{ArrowDown}');
  await expect.element(item).toHaveAttribute('data-highlighted');
  await userEvent.keyboard('h');
  await expect.element(page.getByRole('menuitem', { name: 'Help' })).toHaveAttribute('data-highlighted');
  await userEvent.keyboard('{Home}{Enter}');
  expect(onActivate).toHaveBeenCalledOnce();
  await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
  await expect.element(trigger).toHaveFocus();
  await userEvent.keyboard('{ArrowDown}{Escape}');
  await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
  await expect.element(trigger).toHaveFocus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(item).toHaveFocus();
  await userEvent.tab();
  await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
});

test('checkbox and radio states render their glyphs and disabled items take the disabled ink', async () => {
  const screen = await render(<MenuFixture />);
  await screen.getByRole('button', { name: 'Actions' }).click();
  await expect.element(page.getByRole('group', { name: 'File' })).toBeVisible();
  await expect.element(page.getByRole('separator')).toBeVisible();
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
  expect(getComputedStyle(disabled).opacity).toBe('1');
  expect(getComputedStyle(disabled).color).toBe(resolved('color', 'var(--ult-color-text-disabled)'));
  expect(getComputedStyle(page.getByRole('menuitem', { name: 'Help' }).element()).textDecorationLine).toBe('none');
});

test('items are 32px rows with the small radius inside the popup\'s 8px corner, an icon sharing the label\'s row', async () => {
  await render(
    <DropdownMenu.Root defaultOpen>
      <DropdownMenu.Trigger>Options</DropdownMenu.Trigger>
      <DropdownMenu.Portal><DropdownMenu.Positioner><DropdownMenu.Popup data-testid="popup">
        <DropdownMenu.Item data-testid="item">
          <svg data-testid="icon" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /></svg>
          <span data-testid="label">Rename</span>
        </DropdownMenu.Item>
      </DropdownMenu.Popup></DropdownMenu.Positioner></DropdownMenu.Portal>
    </DropdownMenu.Root>,
  );
  await expect.element(page.getByRole('menu')).toBeVisible();
  const popup = getComputedStyle(page.getByTestId('popup').element());
  const item = page.getByTestId('item').element();
  expect(popup.borderTopLeftRadius).toBe(resolved('border-top-left-radius', 'var(--ult-radius-lg)'));
  expect(popup.paddingTop).toBe(resolved('padding-top', 'var(--ult-space-2)'));
  expect(getComputedStyle(item).borderTopLeftRadius).toBe(resolved('border-top-left-radius', 'var(--ult-radius-sm)'));
  expect(`${item.getBoundingClientRect().height}px`).toBe(resolved('height', 'var(--ult-space-9)'));
  const icon = page.getByTestId('icon').element().getBoundingClientRect();
  const label = page.getByTestId('label').element().getBoundingClientRect();
  expect(icon.right).toBeLessThan(label.left);
  expect(Math.abs(icon.top + icon.height / 2 - label.top - label.height / 2)).toBeLessThan(1);
});

test('the group label is set in tracked capitals, as Select\'s is', async () => {
  const screen = await render(<MenuFixture />);
  await screen.getByRole('button', { name: 'Actions' }).click();
  const label = page.getByText('File').element();
  expect(getComputedStyle(label).textTransform).toBe('uppercase');
  expect(getComputedStyle(label).letterSpacing).not.toBe('normal');
});

test('the arrow straddles the edge facing the trigger', async () => {
  const screen = await render(<MenuFixture />);
  await screen.getByRole('button', { name: 'Actions' }).click();
  const popup = page.getByRole('menu').element();
  await expect.poll(() => getComputedStyle(popup).opacity).toBe('1');
  expectArrowOnEdge(page.getByTestId('arrow').element(), popup, 'up');
});

test('ArrowRight opens the submenu and the open trigger stays highlighted', async () => {
  const screen = await render(<MenuFixture />);
  await screen.getByRole('button', { name: 'Actions' }).click();
  const more = page.getByRole('menuitem', { name: 'More' });
  const resting = getComputedStyle(more.element()).backgroundColor;
  await userEvent.keyboard('{ArrowDown}{End}');
  await expect.element(more).toHaveAttribute('data-highlighted');
  await userEvent.keyboard('{ArrowRight}');
  await expect.element(page.getByRole('menuitem', { name: 'Archive' })).toBeVisible();
  await expect.element(more).toHaveAttribute('data-popup-open');
  more.element().removeAttribute('data-highlighted');
  expect(getComputedStyle(more.element()).backgroundColor).not.toBe(resting);
  expect(more.element().querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
});

test('popup focus has no outline and an Ultima Button trigger retains its ring', async () => {
  const screen = await render(<DropdownMenu.Root>
    <DropdownMenu.Trigger render={<Button />}>Open</DropdownMenu.Trigger>
    <DropdownMenu.Portal><DropdownMenu.Positioner><DropdownMenu.Popup>
      <DropdownMenu.Item>Item</DropdownMenu.Item>
    </DropdownMenu.Popup></DropdownMenu.Positioner></DropdownMenu.Portal>
  </DropdownMenu.Root>);
  await userEvent.tab();
  const trigger = screen.getByRole('button', { name: 'Open' });
  await expect.element(trigger).toHaveFocus();
  expect(parseFloat(getComputedStyle(trigger.element()).outlineWidth)).toBeGreaterThan(0);
  await userEvent.keyboard('{Enter}');
  const popup = page.getByRole('menu');
  await expect.element(popup).toBeVisible();
  (popup.element() as HTMLElement).focus();
  await expect.element(popup).toHaveFocus();
  expect(getComputedStyle(popup.element()).outlineWidth).toBe('0px');
  expect(parseFloat(getComputedStyle(popup.element()).borderTopWidth)).toBeGreaterThan(0);
});

test('styled parts reject className', () => {
  expectTypeOf<DropdownMenuItemProps>().not.toHaveProperty('className');
  expectTypeOf<DropdownMenuPopupProps>().not.toHaveProperty('className');
});

for (const mode of themes) {
  test(`the open popup has no axe violations in ${mode.name}`, async () => {
    themeDocument(mode);
    const screen = await render(
      <main>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger render={<Button />}>Actions</DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Positioner>
              <DropdownMenu.Popup>
                <DropdownMenu.Group>
                  <DropdownMenu.GroupLabel>Run</DropdownMenu.GroupLabel>
                  <DropdownMenu.Item>Rename</DropdownMenu.Item>
                </DropdownMenu.Group>
                <DropdownMenu.Separator />
                <DropdownMenu.CheckboxItem defaultChecked>
                  <DropdownMenu.CheckboxItemIndicator />
                  Pinned
                </DropdownMenu.CheckboxItem>
                <DropdownMenu.Item disabled>Delete</DropdownMenu.Item>
              </DropdownMenu.Popup>
            </DropdownMenu.Positioner>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </main>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Actions' }).element());
    const popup = page.getByRole('menu', { name: 'Actions' });
    await expect.element(popup).toBeVisible();

    expect(await violations(popup.element())).toEqual([]);
  });
}
