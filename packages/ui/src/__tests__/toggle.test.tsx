import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import * as stylex from '@stylexjs/stylex';
import { Button, Toggle, type ToggleProps, type ToggleSize, type ToggleVariant } from '@ultima/ui';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { hoversOnlyWhereHover } from './hover';
import { resolved } from './overlay';

const themes = [
  { name: 'dark', theme: darkTheme, scheme: colorScheme.dark },
  { name: 'light', theme: lightTheme, scheme: colorScheme.light },
];

test('every variant by size cell renders', async () => {
  const cells = (['outline', 'ghost'] as const).flatMap((variant) => (['sm', 'md', 'lg'] as const).map((size) => ({ variant, size, name: `${variant} ${size}` })));
  const screen = await render(
    <>
      {cells.map(({ variant, size, name }) => (
        <Toggle key={name} variant={variant} size={size}>
          {name}
        </Toggle>
      ))}
    </>,
  );
  for (const { name } of cells) await expect.element(screen.getByRole('button', { name })).toBeVisible();
});

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

test('a toggle restates Button: the same height, padding and lift at every size', async () => {
  const screen = await render(
    <>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <span key={size}>
          <Toggle size={size}>{`Toggle ${size}`}</Toggle>
          <Button variant="outline" size={size}>{`Button ${size}`}</Button>
        </span>
      ))}
    </>,
  );
  for (const size of ['sm', 'md', 'lg'] as const) {
    const toggle = getComputedStyle(screen.getByRole('button', { name: `Toggle ${size}` }).element());
    const button = getComputedStyle(screen.getByRole('button', { name: `Button ${size}` }).element());
    expect(toggle.height).toBe(button.height);
    expect(toggle.paddingInlineStart).toBe(button.paddingInlineStart);
    expect(toggle.boxShadow).toBe(button.boxShadow);
  }
});

test('a toggle holding an icon gives up one space step on each side', async () => {
  const icon = <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" />;
  const screen = await render(
    <>
      <Toggle>Plain</Toggle>
      <Toggle aria-label="With icon">{icon}</Toggle>
    </>,
  );
  const plain = getComputedStyle(screen.getByRole('button', { name: 'Plain' }).element());
  const withIcon = getComputedStyle(screen.getByRole('button', { name: 'With icon' }).element());
  expect(parseFloat(withIcon.paddingInlineStart)).toBe(parseFloat(plain.paddingInlineStart) - 4);
});

test('a disabled toggle takes the muted fill and ink instead of fading, pressed or not', async () => {
  const screen = await render(
    <>
      <Toggle disabled>Off</Toggle>
      <Toggle disabled defaultPressed>Pinned off</Toggle>
    </>,
  );
  for (const name of ['Off', 'Pinned off']) {
    const style = getComputedStyle(screen.getByRole('button', { name }).element());
    expect(style.opacity).toBe('1');
    expect(style.backgroundColor).toBe(resolved('background-color', 'var(--ult-color-surface-sunken)'));
    expect(style.color).toBe(resolved('color', 'var(--ult-color-text-disabled)'));
    expect(style.boxShadow).toBe('none');
  }
});

test('a pressed outline toggle sets its lift down, and hover answers only where the device hovers', async () => {
  const screen = await render(
    <>
      <Toggle>Resting</Toggle>
      <Toggle defaultPressed>Pressed</Toggle>
    </>,
  );
  const resting = screen.getByRole('button', { name: 'Resting' }).element();
  expect(getComputedStyle(resting).boxShadow).not.toBe('none');
  expect(getComputedStyle(screen.getByRole('button', { name: 'Pressed' }).element()).boxShadow).toBe('none');
  expect(hoversOnlyWhereHover(resting)).toBe(true);
});
