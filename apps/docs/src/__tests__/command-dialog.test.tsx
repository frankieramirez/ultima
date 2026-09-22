import { StrictMode } from 'react';
import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import CommandDialog from '../demos/command/command-dialog';

const mount = () =>
  render(
    <StrictMode>
      <CommandDialog />
    </StrictMode>,
  );

const dialog = () => document.querySelector('[role="dialog"]');

test('Ctrl+K opens the palette with focus on the input', async () => {
  const screen = await mount();
  expect(dialog()).toBeNull();

  await userEvent.keyboard('{Control>}k{/Control}');

  await expect.element(screen.getByRole('dialog', { name: 'Command menu' })).toBeVisible();
  const input = screen.getByRole('combobox', { name: 'Search actions' });
  await expect.poll(() => document.activeElement).toBe(input.element());
  await expect.element(screen.getByRole('listbox')).toBeVisible();
});

test('a filtered Enter runs the highlighted action and closes the dialog', async () => {
  const screen = await mount();
  await userEvent.click(screen.getByRole('button', { name: /Search actions/ }));
  await expect.element(screen.getByRole('dialog')).toBeVisible();

  const input = screen.getByRole('combobox', { name: 'Search actions' });
  await userEvent.fill(input, 'Export');
  await expect.poll(() => document.querySelectorAll('[role="option"]').length).toBe(1);

  await userEvent.keyboard('{Enter}');
  await expect.poll(dialog).toBeNull();
  await expect.element(screen.getByText('Ran “Export PDF”')).toBeVisible();
});

test('Escape closes and focus returns to the trigger', async () => {
  const screen = await mount();
  const trigger = screen.getByRole('button', { name: /Search actions/ });
  await userEvent.click(trigger);
  await expect.element(screen.getByRole('dialog')).toBeVisible();

  await userEvent.keyboard('{Escape}');
  await expect.poll(dialog).toBeNull();
  await expect.poll(() => document.activeElement).toBe(trigger.element());
});

test('Tab loops the input, the close that reveals on focus, and the scroll region', async () => {
  const screen = await mount();
  await userEvent.click(screen.getByRole('button', { name: /Search actions/ }));
  await expect.element(screen.getByRole('dialog')).toBeVisible();

  const input = screen.getByRole('combobox', { name: 'Search actions' }).element();
  const close = screen.getByRole('button', { name: 'Close' }).element();
  await expect.poll(() => document.activeElement).toBe(input);
  expect(getComputedStyle(close).clipPath).toBe('inset(50%)');

  await userEvent.tab();
  expect(document.activeElement).toBe(close);
  await expect.poll(() => getComputedStyle(close).clipPath).toBe('none');
  expect(close.getBoundingClientRect().width).toBeGreaterThan(1);

  await userEvent.tab();
  const viewport = document.activeElement;
  expect(viewport).not.toBe(input);
  expect(viewport).not.toBe(close);
  expect(viewport!.getAttribute('role')).toBe('presentation');

  await userEvent.tab();
  expect(document.activeElement).toBe(input);
});
