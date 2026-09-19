import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import * as stylex from '@stylexjs/stylex';
import { Toggle, type ToggleProps, type ToggleSize, type ToggleVariant } from '@ultima/ui';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

const themes = [
  { name: 'dark', theme: darkTheme, scheme: colorScheme.dark },
  { name: 'light', theme: lightTheme, scheme: colorScheme.light },
];

for (const variant of ['outline', 'ghost'] as const) {
  for (const size of ['sm', 'md', 'lg'] as const) {
    test(`${variant} / ${size} renders`, async () => {
      const screen = await render(
        <Toggle variant={variant} size={size}>
          Bold
        </Toggle>,
      );
      await expect.element(screen.getByRole('button', { name: 'Bold' })).toBeVisible();
    });
  }
}

test('omitted axes match outline / md', async () => {
  const screen = await render(
    <>
      <Toggle>Default</Toggle>
      <Toggle variant="outline" size="md">
        Explicit
      </Toggle>
    </>,
  );
  const implicit = screen.getByRole('button', { name: 'Default' }).element();
  const explicit = screen.getByRole('button', { name: 'Explicit' }).element();
  expect(implicit.className).not.toBe('');
  expect(implicit.className).toBe(explicit.className);
});

test('a toggle is named by its text', async () => {
  const screen = await render(<Toggle>Bold</Toggle>);
  await expect.element(screen.getByRole('button', { name: 'Bold' })).toBeVisible();
});

test('an icon-only toggle is named by aria-label', async () => {
  const screen = await render(
    <Toggle aria-label="Bold">
      <svg aria-hidden="true" viewBox="0 0 16 16" width="1em" height="1em" />
    </Toggle>,
  );
  await expect.element(screen.getByRole('button', { name: 'Bold' })).toBeVisible();
});

test('keyboard focus draws the ring on a native tab stop', async () => {
  const screen = await render(
    <>
      <Toggle>First</Toggle>
      <Toggle>Second</Toggle>
    </>,
  );
  const first = screen.getByRole('button', { name: 'First' }).element();
  const second = screen.getByRole('button', { name: 'Second' }).element();
  await userEvent.tab();
  expect(document.activeElement).toBe(first);
  expect(parseFloat(getComputedStyle(first).outlineWidth)).toBeGreaterThan(0);
  expect(getComputedStyle(first).outlineStyle).toBe('solid');
  await userEvent.tab();
  expect(document.activeElement).toBe(second);
});

test('clicking flips aria-pressed', async () => {
  const onPressedChange = vi.fn();
  const screen = await render(<Toggle onPressedChange={onPressedChange}>Bold</Toggle>);
  const toggle = screen.getByRole('button', { name: 'Bold' }).element();
  expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await userEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(onPressedChange).toHaveBeenCalledWith(true, expect.anything());
  await userEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

for (const key of ['{Enter}', '{ }'] as const) {
  test(`${key} presses the focused toggle`, async () => {
    const screen = await render(<Toggle>Bold</Toggle>);
    const toggle = screen.getByRole('button', { name: 'Bold' }).element();
    await userEvent.tab();
    expect(document.activeElement).toBe(toggle);
    await userEvent.keyboard(key);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });
}

test('a controlled toggle follows pressed', async () => {
  const screen = await render(
    <>
      <Toggle pressed>Unpinned</Toggle>
      <Toggle pressed={false}>Pinned</Toggle>
    </>,
  );
  expect(screen.getByRole('button', { name: 'Unpinned' }).element()).toHaveAttribute('aria-pressed', 'true');
  const pinned = screen.getByRole('button', { name: 'Pinned' }).element();
  expect(pinned).toHaveAttribute('aria-pressed', 'false');
  await userEvent.click(pinned);
  expect(pinned).toHaveAttribute('aria-pressed', 'false');
});

for (const mode of themes) {
  test(`hovering the pressed toggle keeps its paint in ${mode.name}`, async () => {
    const screen = await render(
      <div {...stylex.props(mode.theme, mode.scheme)}>
        <Toggle defaultPressed>On</Toggle>
        <Toggle>Off</Toggle>
      </div>,
    );
    const pressed = screen.getByRole('button', { name: 'On' }).element();
    const resting = screen.getByRole('button', { name: 'Off' }).element();
    expect(pressed).toHaveAttribute('data-pressed');
    expect(resting).not.toHaveAttribute('data-pressed');

    const painted = getComputedStyle(pressed).backgroundColor;
    expect(painted).not.toBe(getComputedStyle(resting).backgroundColor);

    await userEvent.hover(pressed);
    expect(getComputedStyle(pressed).backgroundColor).toBe(painted);
  });
}

test('the props carry no value and take no type argument', () => {
  expectTypeOf<ToggleProps>().not.toHaveProperty('className');
  expectTypeOf<ToggleProps>().not.toHaveProperty('value');
  expectTypeOf<ToggleProps>().toHaveProperty('style');
  expectTypeOf<ToggleVariant>().toEqualTypeOf<'outline' | 'ghost'>();
  expectTypeOf<ToggleSize>().toEqualTypeOf<'sm' | 'md' | 'lg'>();
  // @ts-expect-error `value` is omitted from the standalone toggle's surface
  const noValue: ToggleProps = { value: 'bold' };
  void noValue;
  // @ts-expect-error `Toggle` takes no type argument; the generic was dropped with `value`
  <Toggle<string> />;
});
