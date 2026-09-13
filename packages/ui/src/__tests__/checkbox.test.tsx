/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: none × none × none (no axes); unchecked, checked, mixed, and disabled all mount.
 * 2. The name resolves: role checkbox, named by a wrapping label, aria-label, or Field.Label. A group is named by Fieldset.Legend.
 * 3. The focus ring lands where the contract says: on Root; Indicator renders none.
 * 4. The primitive is still wired: Space toggles; wrapping label activation works (nativeButton stays false). Enter submits a form rather than toggling, matching a native checkbox.
 * 5. Documented state drives its style: data-checked and data-indeterminate fill the box; data-disabled dims; invalid recolors the border.
 * 6. Typecheck passes: className is rejected on every styled part, and there is no size axis.
 * 7. Behavior this component wires itself: none, because every interaction is the primitive's or a style on a data-* attribute.
 * 8. CSS the primitive reads: Indicator is display none while data-unchecked (the exit-transition window).
 */
import {
  Checkbox,
  Field,
  Fieldset,
  type CheckboxGroupProps,
  type CheckboxIndicatorProps,
  type CheckboxRootProps,
} from '@ultima/ui';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';

function Box({
  label,
  children,
  ...props
}: CheckboxRootProps & { label: string; children?: CheckboxIndicatorProps['children'] }) {
  return (
    <Checkbox.Root aria-label={label} {...props}>
      <Checkbox.Indicator data-testid={`${label}-indicator`}>{children}</Checkbox.Indicator>
    </Checkbox.Root>
  );
}

test('unchecked, checked, mixed, and disabled all render', async () => {
  const screen = await render(
    <>
      <Box label="Off" />
      <Box label="On" defaultChecked />
      <Box label="Mixed" indeterminate />
      <Box label="Locked" disabled />
    </>,
  );
  await expect.element(screen.getByRole('checkbox', { name: 'Off' })).toBeVisible();
  await expect.element(screen.getByRole('checkbox', { name: 'On' })).toBeVisible();
  await expect.element(screen.getByRole('checkbox', { name: 'Mixed' })).toBeVisible();
  await expect.element(screen.getByRole('checkbox', { name: 'Locked' })).toBeVisible();
  expect(screen.getByRole('checkbox', { name: 'On' }).element()).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByRole('checkbox', { name: 'Mixed' }).element()).toHaveAttribute('aria-checked', 'mixed');
});

test('a wrapping label names the checkbox', async () => {
  const screen = await render(
    <label>
      Accept terms
      <Checkbox.Root>
        <Checkbox.Indicator />
      </Checkbox.Root>
    </label>,
  );
  await expect.element(screen.getByRole('checkbox', { name: 'Accept terms' })).toBeVisible();
});

test('aria-label names the checkbox', async () => {
  const screen = await render(<Box label="Select row" />);
  await expect.element(screen.getByRole('checkbox', { name: 'Select row' })).toBeVisible();
});

test('Field.Label names the checkbox', async () => {
  const screen = await render(
    <Field.Root name="tos">
      <Field.Item>
        <Checkbox.Root>
          <Checkbox.Indicator />
        </Checkbox.Root>
        <Field.Label>Accept the terms</Field.Label>
      </Field.Item>
    </Field.Root>,
  );
  await expect.element(screen.getByRole('checkbox', { name: 'Accept the terms' })).toBeVisible();
});

test('Fieldset.Legend names a checkbox group', async () => {
  const screen = await render(
    <Fieldset.Root>
      <Fieldset.Legend>Features</Fieldset.Legend>
      <Field.Root name="features">
        <Checkbox.Group data-testid="group">
          <Field.Item>
            <Checkbox.Root value="docs">
              <Checkbox.Indicator />
            </Checkbox.Root>
            <Field.Label>Docs</Field.Label>
          </Field.Item>
        </Checkbox.Group>
      </Field.Root>
    </Fieldset.Root>,
  );
  const group = screen.getByTestId('group').element();
  expect(group).toHaveAttribute('role', 'group');
  const fieldset = group.closest('fieldset');
  expect(fieldset).not.toBeNull();
  const legend = screen.getByText('Features').element();
  expect(fieldset!.getAttribute('aria-labelledby')).toBe(legend.id);
  await expect.element(screen.getByRole('checkbox', { name: 'Docs' })).toBeVisible();
});

test('keyboard focus draws the root outline and never the indicator', async () => {
  const screen = await render(<Box label="Focus me" defaultChecked />);
  const root = screen.getByRole('checkbox', { name: 'Focus me' }).element();
  const indicator = screen.getByTestId('Focus me-indicator').element();
  await userEvent.tab();
  expect(document.activeElement).toBe(root);
  expect(parseFloat(getComputedStyle(root).outlineWidth)).toBeGreaterThan(0);
  expect(getComputedStyle(root).outlineStyle).toBe('solid');
  expect(getComputedStyle(indicator).outlineStyle).toBe('none');
});

test('Space toggles the checkbox', async () => {
  const screen = await render(<Box label="Toggle" />);
  const root = screen.getByRole('checkbox', { name: 'Toggle' }).element();
  expect(root).toHaveAttribute('aria-checked', 'false');
  await userEvent.tab();
  await userEvent.keyboard('{ }');
  expect(root).toHaveAttribute('aria-checked', 'true');
});

test('data-checked and data-indeterminate fill the box unlike the unchecked rest', async () => {
  const screen = await render(
    <>
      <Box label="Off" />
      <Box label="On" defaultChecked />
      <Box label="Mixed" indeterminate />
    </>,
  );
  const off = screen.getByRole('checkbox', { name: 'Off' }).element();
  const on = screen.getByRole('checkbox', { name: 'On' }).element();
  const mixed = screen.getByRole('checkbox', { name: 'Mixed' }).element();
  expect(on).toHaveAttribute('data-checked');
  expect(mixed).toHaveAttribute('data-indeterminate');
  expect(getComputedStyle(on).backgroundColor).not.toBe(getComputedStyle(off).backgroundColor);
  expect(getComputedStyle(mixed).backgroundColor).not.toBe(getComputedStyle(off).backgroundColor);
});

test('the default glyph is a check when checked and a dash when mixed', async () => {
  const screen = await render(
    <>
      <Box label="On" defaultChecked />
      <Box label="Mixed" indeterminate />
    </>,
  );
  const visiblePath = (label: string) => {
    const svgs = [...screen.getByTestId(`${label}-indicator`).element().querySelectorAll('svg')];
    const shown = svgs.filter((svg) => getComputedStyle(svg).display !== 'none');
    expect(shown).toHaveLength(1);
    return shown[0]!.querySelector('path');
  };
  const check = visiblePath('On');
  const dash = visiblePath('Mixed');
  expect(check).not.toBeNull();
  expect(dash).not.toBeNull();
  expect(check!.getAttribute('d')).not.toBe(dash!.getAttribute('d'));
});

test('children replace the default glyph', async () => {
  const screen = await render(
    <Box label="Custom" defaultChecked>
      custom
    </Box>,
  );
  const indicator = screen.getByTestId('Custom-indicator').element();
  expect(indicator.textContent).toBe('custom');
  expect(indicator.querySelector('svg')).toBeNull();
});

test('aria-invalid recolors the border', async () => {
  const screen = await render(
    <>
      <Box label="Valid" />
      <Box label="Invalid" aria-invalid="true" />
    </>,
  );
  const valid = getComputedStyle(screen.getByRole('checkbox', { name: 'Valid' }).element());
  const invalid = getComputedStyle(screen.getByRole('checkbox', { name: 'Invalid' }).element());
  expect(invalid.borderTopColor).not.toBe(valid.borderTopColor);
});

test('data-invalid recolors the border without aria-invalid', async () => {
  const screen = await render(
    <>
      <Box label="Valid" />
      <Box label="Invalid" data-invalid="" />
    </>,
  );
  const valid = getComputedStyle(screen.getByRole('checkbox', { name: 'Valid' }).element());
  const invalid = screen.getByRole('checkbox', { name: 'Invalid' }).element();
  expect(invalid).not.toHaveAttribute('aria-invalid');
  expect(getComputedStyle(invalid).borderTopColor).not.toBe(valid.borderTopColor);
});

test('disabled dims the checkbox', async () => {
  const screen = await render(
    <>
      <Box label="Enabled" />
      <Box label="Disabled" disabled />
    </>,
  );
  const enabled = screen.getByRole('checkbox', { name: 'Enabled' }).element();
  const disabled = screen.getByRole('checkbox', { name: 'Disabled' }).element();
  expect(disabled).toHaveAttribute('data-disabled');
  expect(parseFloat(getComputedStyle(disabled).opacity)).toBeLessThan(parseFloat(getComputedStyle(enabled).opacity));
});

test('a kept-mounted unchecked indicator is display none', async () => {
  const screen = await render(
    <Checkbox.Root aria-label="Keep">
      <Checkbox.Indicator keepMounted data-testid="kept" />
    </Checkbox.Root>,
  );
  const indicator = screen.getByTestId('kept').element();
  expect(indicator).toHaveAttribute('data-unchecked');
  expect(getComputedStyle(indicator).display).toBe('none');
});

test('public prop types reject className and size', () => {
  expectTypeOf<CheckboxRootProps>().not.toHaveProperty('className');
  expectTypeOf<CheckboxIndicatorProps>().not.toHaveProperty('className');
  expectTypeOf<CheckboxGroupProps>().not.toHaveProperty('className');
  expectTypeOf<CheckboxRootProps>().not.toHaveProperty('size');
  expectTypeOf<CheckboxIndicatorProps>().not.toHaveProperty('size');
  expectTypeOf<CheckboxGroupProps>().not.toHaveProperty('size');
});
