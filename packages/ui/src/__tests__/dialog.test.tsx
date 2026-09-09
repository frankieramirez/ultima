import type { ReactNode } from 'react';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Button,
  Dialog,
  type DialogBackdropProps,
  type DialogDescriptionProps,
  type DialogPopupProps,
  type DialogTitleProps,
  type DialogViewportProps,
} from '@ultima/ui';

function SampleDialog({
  open,
  title = 'Archive run',
  extra,
}: {
  open?: boolean;
  title?: string;
  extra?: ReactNode;
}) {
  return (
    <Dialog.Root defaultOpen={open}>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop data-testid="backdrop" />
        <Dialog.Viewport>
          <Dialog.Popup data-testid="popup">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Description>This cannot be undone.</Dialog.Description>
            {extra}
            <Dialog.Close>Close</Dialog.Close>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

test('mounts closed with Title, Description, and Close unmounted', async () => {
  const screen = await render(<SampleDialog />);
  await expect.element(screen.getByRole('button', { name: 'Open' })).toBeVisible();
  expect(screen.getByRole('dialog').query()).toBeNull();
  expect(screen.getByText('Archive run').query()).toBeNull();
  expect(screen.getByText('This cannot be undone.').query()).toBeNull();
  expect(screen.getByRole('button', { name: 'Close' }).query()).toBeNull();
});

test('mounts open with Title, Description, and Close', async () => {
  const screen = await render(<SampleDialog open />);
  await expect.element(screen.getByRole('dialog', { name: 'Archive run' })).toBeVisible();
  await expect.element(screen.getByText('This cannot be undone.')).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Close' })).toBeVisible();
});

test('the dialog is named by Dialog.Title', async () => {
  const screen = await render(<SampleDialog open title="Confirm delete" />);
  await expect.element(screen.getByRole('dialog', { name: 'Confirm delete' })).toBeVisible();
});

test('the popup has no outline when it holds focus and a child shows a ring', async () => {
  const screen = await render(
    <SampleDialog
      open
      extra={
        <Button data-testid="inside" autoFocus>
          Continue
        </Button>
      }
    />,
  );
  const popup = screen.getByTestId('popup').element();
  popup.focus();
  expect(document.activeElement).toBe(popup);
  expect(getComputedStyle(popup).outlineWidth).toBe('0px');

  const inside = screen.getByTestId('inside').element();
  await userEvent.tab();
  expect(document.activeElement).toBe(inside);
  expect(parseFloat(getComputedStyle(inside).outlineWidth)).toBeGreaterThan(0);
});

test('Escape closes and returns focus to the trigger, and Tab loops inside', async () => {
  const screen = await render(
    <SampleDialog extra={<Button data-testid="inside">Continue</Button>} />,
  );
  const trigger = screen.getByRole('button', { name: 'Open' }).element();
  await userEvent.click(trigger);
  await expect.element(screen.getByRole('dialog', { name: 'Archive run' })).toBeVisible();

  const close = screen.getByRole('button', { name: 'Close' }).element();
  const inside = screen.getByTestId('inside').element();
  close.focus();
  await userEvent.tab();
  expect(document.activeElement).toBe(inside);

  await userEvent.keyboard('{Escape}');
  expect(screen.getByRole('dialog').query()).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

test('data-open on Backdrop makes it visible and a closed dialog unmounts the popup', async () => {
  const closed = await render(<SampleDialog />);
  expect(closed.getByTestId('popup').query()).toBeNull();
  expect(closed.getByTestId('backdrop').query()).toBeNull();

  const open = await render(<SampleDialog open />);
  const backdrop = open.getByTestId('backdrop').element();
  expect(backdrop).toHaveAttribute('data-open');
  backdrop.style.transitionDuration = '0s';
  expect(getComputedStyle(backdrop).opacity).not.toBe('0');
  await expect.element(open.getByTestId('popup')).toBeVisible();
});

test('public prop types drop className on styled parts', () => {
  expectTypeOf<DialogPopupProps>().not.toHaveProperty('className');
  expectTypeOf<DialogViewportProps>().not.toHaveProperty('className');
  expectTypeOf<DialogBackdropProps>().not.toHaveProperty('className');
  expectTypeOf<DialogTitleProps>().not.toHaveProperty('className');
  expectTypeOf<DialogDescriptionProps>().not.toHaveProperty('className');
  expectTypeOf<DialogPopupProps>().toHaveProperty('style');
});
