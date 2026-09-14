import type { ComponentProps, ReactNode } from 'react';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  AlertDialog,
  Button,
  type AlertDialogBackdropProps,
  type AlertDialogDescriptionProps,
  type AlertDialogPopupProps,
  type AlertDialogTitleProps,
  type AlertDialogViewportProps,
} from '@ultima/ui';

import { themeDocument, themes, violations } from './axe';

function SampleAlertDialog({
  open,
  title = 'Delete report',
  extra,
}: {
  open?: boolean;
  title?: string;
  extra?: ReactNode;
}) {
  return (
    <AlertDialog.Root defaultOpen={open}>
      <AlertDialog.Trigger>Open</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop data-testid="backdrop" />
        <AlertDialog.Viewport data-testid="viewport">
          <AlertDialog.Popup data-testid="popup">
            <AlertDialog.Title>{title}</AlertDialog.Title>
            <AlertDialog.Description>This cannot be undone.</AlertDialog.Description>
            {extra}
            <AlertDialog.Close>Cancel</AlertDialog.Close>
            <AlertDialog.Close>Delete</AlertDialog.Close>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

test('mounts closed with Title, Description, and actions unmounted', async () => {
  const screen = await render(<SampleAlertDialog />);
  await expect.element(screen.getByRole('button', { name: 'Open' })).toBeVisible();
  expect(screen.getByRole('alertdialog').query()).toBeNull();
  expect(screen.getByText('Delete report').query()).toBeNull();
  expect(screen.getByText('This cannot be undone.').query()).toBeNull();
  expect(screen.getByRole('button', { name: 'Cancel' }).query()).toBeNull();
});

test('mounts open as alertdialog named by Title and described by Description', async () => {
  const screen = await render(<SampleAlertDialog open />);
  const popup = screen.getByRole('alertdialog', { name: 'Delete report' });
  await expect.element(popup).toBeVisible();
  await expect.element(screen.getByText('This cannot be undone.')).toBeVisible();
  expect(popup.element()).toHaveAccessibleDescription('This cannot be undone.');
  await expect.element(screen.getByRole('button', { name: 'Cancel' })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Delete' })).toBeVisible();
});

test('the alertdialog is named by AlertDialog.Title', async () => {
  const screen = await render(<SampleAlertDialog open title="Remove member" />);
  await expect.element(screen.getByRole('alertdialog', { name: 'Remove member' })).toBeVisible();
});

test('the popup has no outline when it holds focus and a child shows a ring', async () => {
  const screen = await render(
    <SampleAlertDialog
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

test('Escape closes and returns focus to the trigger, Tab loops, and a backdrop click does not close', async () => {
  const screen = await render(
    <SampleAlertDialog extra={<Button data-testid="inside">Continue</Button>} />,
  );
  const trigger = screen.getByRole('button', { name: 'Open' }).element();
  await userEvent.click(trigger);
  await expect.element(screen.getByRole('alertdialog', { name: 'Delete report' })).toBeVisible();

  const last = screen.getByRole('button', { name: 'Delete' }).element();
  const inside = screen.getByTestId('inside').element();
  last.focus();
  await userEvent.tab();
  expect(document.activeElement).toBe(inside);

  await userEvent.click(screen.getByTestId('viewport').element(), { position: { x: 1, y: 1 } });
  await expect.element(screen.getByRole('alertdialog', { name: 'Delete report' })).toBeVisible();

  await userEvent.keyboard('{Escape}');
  await expect.poll(() => screen.getByRole('alertdialog').query()).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

test('opening focuses Cancel, the first action in DOM', async () => {
  const screen = await render(<SampleAlertDialog />);
  await userEvent.click(screen.getByRole('button', { name: 'Open' }).element());
  await expect.element(screen.getByRole('alertdialog', { name: 'Delete report' })).toBeVisible();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }).element());
});

test('data-open on Backdrop makes it visible and a closed alert dialog unmounts the popup', async () => {
  const closed = await render(<SampleAlertDialog />);
  expect(closed.getByTestId('popup').query()).toBeNull();
  expect(closed.getByTestId('backdrop').query()).toBeNull();

  const open = await render(<SampleAlertDialog open />);
  const backdrop = open.getByTestId('backdrop').element();
  expect(backdrop).toHaveAttribute('data-open');
  backdrop.style.transitionDuration = '0s';
  expect(getComputedStyle(backdrop).opacity).not.toBe('0');
  await expect.element(open.getByTestId('popup')).toBeVisible();
});

test('Handle and createHandle sit on the namespace as values', () => {
  expect(typeof AlertDialog.createHandle).toBe('function');
  const handle = AlertDialog.createHandle();
  expect(handle).toBeInstanceOf(AlertDialog.Handle);
});

test('public prop types drop className on styled parts and omit modal and disablePointerDismissal', () => {
  expectTypeOf<AlertDialogPopupProps>().not.toHaveProperty('className');
  expectTypeOf<AlertDialogViewportProps>().not.toHaveProperty('className');
  expectTypeOf<AlertDialogBackdropProps>().not.toHaveProperty('className');
  expectTypeOf<AlertDialogTitleProps>().not.toHaveProperty('className');
  expectTypeOf<AlertDialogDescriptionProps>().not.toHaveProperty('className');
  expectTypeOf<AlertDialogPopupProps>().toHaveProperty('style');
  expectTypeOf<ComponentProps<typeof AlertDialog.Root>>().not.toHaveProperty('modal');
  expectTypeOf<ComponentProps<typeof AlertDialog.Root>>().not.toHaveProperty('disablePointerDismissal');
});

for (const mode of themes) {
  test(`the open popup has no axe violations in ${mode.name}`, async () => {
    themeDocument(mode);
    const screen = await render(
      <main>
        <SampleAlertDialog extra={<Button data-testid="inside">Continue</Button>} />
      </main>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open' }).element());
    await expect.element(screen.getByRole('alertdialog', { name: 'Delete report' })).toBeVisible();

    expect(await violations()).toEqual([]);
  });
}
