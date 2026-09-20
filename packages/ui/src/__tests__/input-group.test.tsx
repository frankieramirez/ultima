import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Field,
  InputGroup,
  type InputGroupAddonProps,
  type InputGroupAlign,
  type InputGroupInputProps,
  type InputGroupRootProps,
  type InputGroupSize,
} from '@ultima/ui';

/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: size sm/md/lg on Root, align start/end on Addon, and no props
 *    matches md and start.
 * 2. The name resolves: role textbox, named by the inner input's own label — `<label htmlFor>`,
 *    `aria-label`, or `Field.Label`; Root has no role.
 * 3. The focus ring lands where the contract says: on Root through `:focus-within`; the input
 *    and the addons render none.
 * 4. The primitive is still wired: typing changes the value, and a Field's label and invalid
 *    state reach the inner input.
 * 5. Documented state drives its style: `aria-invalid` and `data-invalid` on the input recolor
 *    Root's border through `:has()`, and a disabled input dims Root through `:has(:disabled)`.
 * 6. Typecheck passes: className is rejected, and the size and align unions are exactly their
 *    values.
 * 7. Behavior this component wires itself: none, because every interaction is the inner input's
 *    own (item 4) or a style reacting to `:has()` (item 5).
 * 8. CSS the primitive reads: none; nothing here is a second-clause part — the box, the ring,
 *    and the state reads are Ultima's own declarations, asserted at items 3 and 5.
 */

for (const size of ['sm', 'md', 'lg'] as const) {
  test(`${size} renders the box with its input`, async () => {
    const screen = await render(
      <InputGroup.Root size={size}>
        <InputGroup.Input aria-label={`${size} search`} placeholder="Search" />
      </InputGroup.Root>,
    );
    await expect.element(screen.getByRole('textbox', { name: `${size} search` })).toBeVisible();
  });
}

for (const align of ['start', 'end'] as const) {
  test(`${align} addon renders`, async () => {
    const screen = await render(
      <InputGroup.Root>
        <InputGroup.Addon align={align}>addon</InputGroup.Addon>
        <InputGroup.Input aria-label={`${align} field`} />
      </InputGroup.Root>,
    );
    await expect.element(screen.getByText('addon')).toBeVisible();
  });
}

test('omitted props match the md size and start align defaults', async () => {
  const screen = await render(
    <>
      <InputGroup.Root data-testid="default-root">
        <InputGroup.Addon data-testid="default-addon">a</InputGroup.Addon>
        <InputGroup.Input aria-label="Default" />
      </InputGroup.Root>
      <InputGroup.Root size="md" data-testid="explicit-root">
        <InputGroup.Addon align="start" data-testid="explicit-addon">b</InputGroup.Addon>
        <InputGroup.Input aria-label="Explicit" />
      </InputGroup.Root>
    </>,
  );
  const defaultRoot = screen.getByTestId('default-root').element();
  const explicitRoot = screen.getByTestId('explicit-root').element();
  expect(defaultRoot.className).not.toBe('');
  expect(defaultRoot.className).toBe(explicitRoot.className);
  expect(screen.getByTestId('default-addon').element().className).toBe(
    screen.getByTestId('explicit-addon').element().className,
  );
});

test('an end addon lands after the input regardless of DOM order', async () => {
  const screen = await render(
    <InputGroup.Root>
      <InputGroup.Addon align="end" data-testid="trailing">
        end
      </InputGroup.Addon>
      <InputGroup.Input aria-label="Field" />
      <InputGroup.Addon data-testid="leading">start</InputGroup.Addon>
    </InputGroup.Root>,
  );
  const leading = screen.getByTestId('leading').element().getBoundingClientRect();
  const trailing = screen.getByTestId('trailing').element().getBoundingClientRect();
  const input = screen.getByRole('textbox', { name: 'Field' }).element().getBoundingClientRect();
  expect(leading.right).toBeLessThanOrEqual(input.left);
  expect(trailing.left).toBeGreaterThanOrEqual(input.right);
});

test('a consumer label names the input, and Root takes no role', async () => {
  const screen = await render(
    <>
      <label htmlFor="email">Email address</label>
      <InputGroup.Root data-testid="box">
        <InputGroup.Input id="email" />
      </InputGroup.Root>
    </>,
  );
  await expect.element(screen.getByRole('textbox', { name: 'Email address' })).toBeVisible();
  expect(screen.getByTestId('box').element()).not.toHaveAttribute('role');
});

test('keyboard focus rings the box while the input inside draws none', async () => {
  const screen = await render(
    <InputGroup.Root data-testid="box">
      <InputGroup.Addon>@</InputGroup.Addon>
      <InputGroup.Input aria-label="Handle" />
    </InputGroup.Root>,
  );
  const box = screen.getByTestId('box').element();
  const input = screen.getByRole('textbox', { name: 'Handle' }).element();
  await userEvent.tab();
  expect(document.activeElement).toBe(input);
  expect(parseFloat(getComputedStyle(box).outlineWidth)).toBeGreaterThan(0);
  expect(getComputedStyle(box).outlineStyle).toBe('solid');
  expect(getComputedStyle(input).outlineStyle).toBe('none');
});

test('typing changes the value', async () => {
  const screen = await render(
    <InputGroup.Root>
      <InputGroup.Input aria-label="Project" />
    </InputGroup.Root>,
  );
  const input = screen.getByRole('textbox', { name: 'Project' });
  await userEvent.fill(input, 'ultima');
  expect((input.element() as HTMLInputElement).value).toBe('ultima');
});

test('aria-invalid on the input recolors the box border', async () => {
  const screen = await render(
    <>
      <InputGroup.Root data-testid="valid-box">
        <InputGroup.Input aria-label="Valid" />
      </InputGroup.Root>
      <InputGroup.Root data-testid="invalid-box">
        <InputGroup.Input aria-label="Invalid" aria-invalid="true" />
      </InputGroup.Root>
    </>,
  );
  const valid = getComputedStyle(screen.getByTestId('valid-box').element());
  const invalid = getComputedStyle(screen.getByTestId('invalid-box').element());
  expect(invalid.borderTopColor).not.toBe(valid.borderTopColor);
});

test('data-invalid on the input recolors the box border without aria-invalid', async () => {
  const screen = await render(
    <>
      <InputGroup.Root data-testid="valid-box">
        <InputGroup.Input aria-label="Valid" />
      </InputGroup.Root>
      <InputGroup.Root data-testid="invalid-box">
        <InputGroup.Input aria-label="Invalid" data-invalid="" />
      </InputGroup.Root>
    </>,
  );
  const valid = getComputedStyle(screen.getByTestId('valid-box').element());
  const invalidBox = screen.getByTestId('invalid-box').element();
  const invalidInput = screen.getByRole('textbox', { name: 'Invalid' }).element();
  expect(invalidInput).not.toHaveAttribute('aria-invalid');
  expect(getComputedStyle(invalidBox).borderTopColor).not.toBe(valid.borderTopColor);
});

test('a Field labels and invalidates the inner input', async () => {
  const screen = await render(
    <>
      <Field.Root name="name">
        <Field.Label>Name</Field.Label>
        <InputGroup.Root data-testid="valid-box">
          <InputGroup.Input />
        </InputGroup.Root>
      </Field.Root>
      <Field.Root name="email" invalid>
        <Field.Label>Email</Field.Label>
        <InputGroup.Root data-testid="invalid-box">
          <InputGroup.Input type="email" defaultValue="not-an-email" />
        </InputGroup.Root>
      </Field.Root>
    </>,
  );
  await expect.element(screen.getByRole('textbox', { name: 'Email' })).toBeVisible();
  const input = screen.getByRole('textbox', { name: 'Email' }).element();
  expect(input).toHaveAttribute('data-invalid');
  const valid = getComputedStyle(screen.getByTestId('valid-box').element());
  const invalid = getComputedStyle(screen.getByTestId('invalid-box').element());
  expect(invalid.borderTopColor).not.toBe(valid.borderTopColor);
});

test('a disabled input dims the box', async () => {
  const screen = await render(
    <>
      <InputGroup.Root data-testid="enabled-box">
        <InputGroup.Input aria-label="Enabled" />
      </InputGroup.Root>
      <InputGroup.Root data-testid="disabled-box">
        <InputGroup.Input aria-label="Disabled" disabled />
      </InputGroup.Root>
    </>,
  );
  const enabled = screen.getByTestId('enabled-box').element();
  const disabled = screen.getByTestId('disabled-box').element();
  expect(parseFloat(getComputedStyle(disabled).opacity)).toBeLessThan(
    parseFloat(getComputedStyle(enabled).opacity),
  );
});

test('public prop types expose size on Root, align on Addon, and no className', () => {
  expectTypeOf<InputGroupSize>().toEqualTypeOf<'sm' | 'md' | 'lg'>();
  expectTypeOf<InputGroupAlign>().toEqualTypeOf<'start' | 'end'>();
  expectTypeOf<InputGroupRootProps>().toHaveProperty('size');
  expectTypeOf<InputGroupRootProps>().not.toHaveProperty('align');
  expectTypeOf<InputGroupAddonProps>().toHaveProperty('align');
  expectTypeOf<InputGroupAddonProps>().not.toHaveProperty('size');
  expectTypeOf<InputGroupRootProps>().not.toHaveProperty('className');
  expectTypeOf<InputGroupInputProps>().not.toHaveProperty('className');
  expectTypeOf<InputGroupAddonProps>().not.toHaveProperty('className');
});
