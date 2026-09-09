import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { Switch, type SwitchRootProps, type SwitchThumbProps } from '@ultima/ui';

test('unchecked, checked, and disabled all render', async () => {
  const screen = await render(
    <>
      <Switch.Root aria-label="Off"><Switch.Thumb /></Switch.Root>
      <Switch.Root aria-label="On" defaultChecked><Switch.Thumb /></Switch.Root>
      <Switch.Root aria-label="Locked" disabled><Switch.Thumb /></Switch.Root>
    </>,
  );
  await expect.element(screen.getByRole('switch', { name: 'Off' })).toBeVisible();
  await expect.element(screen.getByRole('switch', { name: 'On' })).toBeVisible();
  await expect.element(screen.getByRole('switch', { name: 'Locked' })).toBeVisible();
});

test('a wrapping label names the switch', async () => {
  const screen = await render(
    <label>
      Notifications
      <Switch.Root><Switch.Thumb /></Switch.Root>
    </label>,
  );
  await expect.element(screen.getByRole('switch', { name: 'Notifications' })).toBeVisible();
});

test('aria-label names the switch', async () => {
  const screen = await render(<Switch.Root aria-label="Dark mode"><Switch.Thumb /></Switch.Root>);
  await expect.element(screen.getByRole('switch', { name: 'Dark mode' })).toBeVisible();
});

test('keyboard focus draws the root outline and never the thumb', async () => {
  const screen = await render(
    <Switch.Root aria-label="Focus me"><Switch.Thumb data-testid="thumb" /></Switch.Root>,
  );
  const root = screen.getByRole('switch', { name: 'Focus me' }).element();
  const thumb = screen.getByTestId('thumb').element();
  await userEvent.tab();
  expect(document.activeElement).toBe(root);
  expect(parseFloat(getComputedStyle(root).outlineWidth)).toBeGreaterThan(0);
  expect(getComputedStyle(root).outlineStyle).toBe('solid');
  expect(getComputedStyle(thumb).outlineStyle).toBe('none');
});

for (const key of ['{ }', '{Enter}'] as const) {
  test(`${key} toggles the switch`, async () => {
    const screen = await render(<Switch.Root aria-label="Toggle"><Switch.Thumb /></Switch.Root>);
    const root = screen.getByRole('switch', { name: 'Toggle' }).element();
    expect(root).toHaveAttribute('aria-checked', 'false');
    await userEvent.tab();
    await userEvent.keyboard(key);
    expect(root).toHaveAttribute('aria-checked', 'true');
  });
}

test('data-checked moves the thumb and repaints the track', async () => {
  const screen = await render(
    <>
      <Switch.Root aria-label="Off"><Switch.Thumb data-testid="off-thumb" /></Switch.Root>
      <Switch.Root aria-label="On" defaultChecked><Switch.Thumb data-testid="on-thumb" /></Switch.Root>
    </>,
  );
  const off = screen.getByRole('switch', { name: 'Off' }).element();
  const on = screen.getByRole('switch', { name: 'On' }).element();
  expect(on).toHaveAttribute('data-checked');
  expect(getComputedStyle(on).backgroundColor).not.toBe(getComputedStyle(off).backgroundColor);
  const offThumb = getComputedStyle(screen.getByTestId('off-thumb').element()).translate;
  const onThumb = getComputedStyle(screen.getByTestId('on-thumb').element()).translate;
  expect(onThumb).not.toBe(offThumb);
  expect(parseFloat(onThumb)).toBeGreaterThan(0);
});

test('public prop types expose only supported styling axes', () => {
  expectTypeOf<SwitchRootProps>().not.toHaveProperty('className');
  expectTypeOf<SwitchThumbProps>().not.toHaveProperty('className');
});
