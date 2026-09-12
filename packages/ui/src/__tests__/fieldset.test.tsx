/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: none × none × none (no axes), and no props matches the declared default.
 * 2. The name resolves: role group, named by Fieldset.Legend via aria-labelledby.
 * 3. The focus ring lands where the contract says: on none; Fieldset is static.
 * 4. The primitive is still wired: Root is a real fieldset; Legend labels it.
 * 5. Documented state drives its style: none, because Fieldset has no interactive data-* paint.
 * 6. Typecheck passes: className is rejected on every styled part.
 * 7. Behavior this component wires itself: none, because every interaction is the primitive's or a style on a data-* attribute.
 * 8. CSS the primitive reads: none, because Fieldset has no clause-2 declarations beyond the UA reset.
 */
import { Field, Fieldset, Input, type FieldsetLegendProps, type FieldsetRootProps } from '@ultima/ui';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';

test('a fieldset with no props renders its parts', async () => {
  const screen = await render(
    <Fieldset.Root>
      <Fieldset.Legend>Account</Fieldset.Legend>
      <Field.Root name="email">
        <Field.Label>Email</Field.Label>
        <Input />
      </Field.Root>
    </Fieldset.Root>,
  );
  await expect.element(screen.getByText('Account')).toBeVisible();
  await expect.element(screen.getByRole('textbox', { name: 'Email' })).toBeVisible();
});

test('Legend names the fieldset through aria-labelledby', async () => {
  const screen = await render(
    <Fieldset.Root data-testid="set">
      <Fieldset.Legend>Notifications (required)</Fieldset.Legend>
      <Field.Root name="channel">
        <Field.Label>Channel</Field.Label>
        <Input />
      </Field.Root>
    </Fieldset.Root>,
  );
  const root = screen.getByTestId('set').element();
  expect(root.tagName).toBe('FIELDSET');
  const legend = screen.getByText('Notifications (required)').element();
  expect(root.getAttribute('aria-labelledby')).toBe(legend.id);
});

test('Fieldset parts draw no focus ring', async () => {
  const screen = await render(
    <Fieldset.Root data-testid="root">
      <Fieldset.Legend data-testid="legend">Account</Fieldset.Legend>
    </Fieldset.Root>,
  );
  expect(getComputedStyle(screen.getByTestId('root').element()).outlineStyle).toBe('none');
  expect(getComputedStyle(screen.getByTestId('legend').element()).outlineStyle).toBe('none');
});

test('Root resets the UA fieldset chrome', async () => {
  const screen = await render(
    <Fieldset.Root data-testid="root">
      <Fieldset.Legend>Account</Fieldset.Legend>
    </Fieldset.Root>,
  );
  const root = screen.getByTestId('root').element();
  const styles = getComputedStyle(root);
  expect(styles.borderTopWidth).toBe('0px');
  expect(styles.paddingTop).toBe('0px');
  expect(styles.marginTop).toBe('0px');
});

test('public prop types reject className', () => {
  expectTypeOf<FieldsetRootProps>().not.toHaveProperty('className');
  expectTypeOf<FieldsetLegendProps>().not.toHaveProperty('className');
});
