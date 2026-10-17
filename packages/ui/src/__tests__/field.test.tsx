/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: none × none × none (no axes), and no props matches the declared default.
 * 2. The name resolves: role textbox, named by Field.Label.
 * 3. The focus ring lands where the contract says: on none of Field's parts; the control brings its own.
 * 4. The primitive is still wired: Description and Error merge into aria-describedby; aria-invalid / data-invalid reach the control.
 * 5. Documented state drives its style: invalid paints the control's danger border; disabled + invalid keeps data-invalid; disabled gives Label the disabled ink and leaves Description readable.
 * 6. Typecheck passes: className is rejected on every styled part.
 * 7. Behavior this component wires itself: none, because every interaction is the primitive's or a style on a data-* attribute.
 * 8. CSS the primitive reads: none, because Field has no clause-2 declarations.
 */
import { Field, Input, type FieldErrorProps, type FieldRootProps } from '@ultima/ui';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { resolved } from './overlay';

test('a field with no props renders its parts', async () => {
  const screen = await render(
    <Field.Root name="email">
      <Field.Label>Email</Field.Label>
      <Input />
      <Field.Description>We never share this.</Field.Description>
    </Field.Root>,
  );
  await expect.element(screen.getByRole('textbox', { name: 'Email' })).toBeVisible();
  await expect.element(screen.getByText('We never share this.')).toBeVisible();
});

test('Field.Label names the control', async () => {
  const screen = await render(
    <Field.Root name="project">
      <Field.Label>Project name</Field.Label>
      <Input />
    </Field.Root>,
  );
  await expect.element(screen.getByRole('textbox', { name: 'Project name' })).toBeVisible();
});

test('Field parts draw no focus ring', async () => {
  const screen = await render(
    <Field.Root name="email" data-testid="root">
      <Field.Label data-testid="label">Email</Field.Label>
      <Input />
      <Field.Description data-testid="description">Hint</Field.Description>
      <Field.Error match data-testid="error">
        Broken
      </Field.Error>
    </Field.Root>,
  );
  for (const id of ['root', 'label', 'description', 'error'] as const) {
    expect(getComputedStyle(screen.getByTestId(id).element()).outlineStyle).toBe('none');
  }
});

test('Description and Error merge into aria-describedby', async () => {
  const screen = await render(
    <Field.Root name="email" invalid>
      <Field.Label>Email</Field.Label>
      <Input data-testid="control" />
      <Field.Description>We never share this.</Field.Description>
      <Field.Error match>Enter a valid email address.</Field.Error>
    </Field.Root>,
  );
  const control = screen.getByTestId('control').element();
  const describedBy = control.getAttribute('aria-describedby');
  expect(describedBy).toBeTruthy();
  const ids = describedBy!.split(/\s+/);
  expect(ids.length).toBeGreaterThanOrEqual(2);
  const description = screen.getByText('We never share this.').element();
  const error = screen.getByText('Enter a valid email address.').element();
  expect(ids).toContain(description.id);
  expect(ids).toContain(error.id);
});

test('invalid sets aria-invalid and Error has no live role', async () => {
  const screen = await render(
    <Field.Root name="email" invalid>
      <Field.Label>Email</Field.Label>
      <Input data-testid="control" />
      <Field.Error match data-testid="error">
        Enter a valid email address.
      </Field.Error>
    </Field.Root>,
  );
  const control = screen.getByTestId('control').element();
  expect(control).toHaveAttribute('aria-invalid', 'true');
  expect(control).toHaveAttribute('data-invalid');
  const error = screen.getByTestId('error').element();
  expect(error.getAttribute('role')).toBeNull();
  expect(error.getAttribute('aria-live')).toBeNull();
});

test('disabled while invalid keeps data-invalid and the danger border', async () => {
  const screen = await render(
    <>
      <Field.Root name="valid">
        <Field.Label>Valid</Field.Label>
        <Input data-testid="valid" />
      </Field.Root>
      <Field.Root name="broken" invalid>
        <Field.Label>Broken</Field.Label>
        <Input data-testid="broken" disabled />
        <Field.Error match>Still shown.</Field.Error>
      </Field.Root>
    </>,
  );
  const valid = screen.getByTestId('valid').element();
  const broken = screen.getByTestId('broken').element();
  expect(broken).not.toHaveAttribute('aria-invalid');
  expect(broken).toHaveAttribute('data-invalid');
  expect(broken).toHaveAttribute('data-disabled');
  expect(getComputedStyle(broken).borderTopColor).not.toBe(getComputedStyle(valid).borderTopColor);
  await expect.element(screen.getByText('Still shown.')).toBeVisible();
});

test('a disabled field gives its label the disabled ink and keeps its description readable', async () => {
  const screen = await render(
    <>
      <Field.Root name="live">
        <Field.Label>Live</Field.Label>
        <Input />
        <Field.Description>Live help.</Field.Description>
      </Field.Root>
      <Field.Root name="off" disabled>
        <Field.Label>Off</Field.Label>
        <Input />
        <Field.Description>Off help.</Field.Description>
      </Field.Root>
    </>,
  );
  const live = getComputedStyle(screen.getByText('Live', { exact: true }).element());
  const off = getComputedStyle(screen.getByText('Off', { exact: true }).element());
  expect(live.color).toBe(resolved('color', 'var(--ult-color-text)'));
  expect(live.fontSize).toBe(resolved('font-size', 'var(--ult-text-4)'));
  expect(live.fontWeight).toBe(resolved('font-weight', 'var(--ult-font-weight-medium)'));
  expect(live.lineHeight).toBe(resolved('line-height', 'calc(var(--ult-text-4) * var(--ult-font-leading-snug))'));
  expect(off.opacity).toBe('1');
  expect(off.color).toBe(resolved('color', 'var(--ult-color-text-disabled)'));
  const help = getComputedStyle(screen.getByText('Off help.').element());
  expect(help.opacity).toBe('1');
  expect(help.color).toBe(getComputedStyle(screen.getByText('Live help.').element()).color);
});

test('a label that wraps keeps its lines apart', async () => {
  const screen = await render(
    <Field.Root name="long">
      <Field.Label>Where should we send invoices and payment receipts?</Field.Label>
      <Input />
    </Field.Root>,
  );
  const label = getComputedStyle(screen.getByText(/invoices/).element());
  expect(Number.parseFloat(label.lineHeight)).toBeGreaterThan(Number.parseFloat(label.fontSize));
});

test('Item puts the control on the first line of a wrapping label', async () => {
  const screen = await render(
    <Field.Root name="terms">
      <Field.Item data-testid="item">
        <Input type="checkbox" />
        <Field.Label>I agree to the terms of service and the data processing addendum</Field.Label>
      </Field.Item>
    </Field.Root>,
  );
  expect(getComputedStyle(screen.getByTestId('item').element()).alignItems).toBe('flex-start');
});

test('public prop types reject className', () => {
  expectTypeOf<FieldRootProps>().not.toHaveProperty('className');
  expectTypeOf<FieldErrorProps>().not.toHaveProperty('className');
});

test('Control and Validity pass through on the namespace', () => {
  expect(Field.Control).toBeTruthy();
  expect(Field.Validity).toBeTruthy();
});
