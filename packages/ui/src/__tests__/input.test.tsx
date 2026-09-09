import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { Input, type InputProps, type InputSize } from '@ultima/ui';

for (const size of ['sm', 'md', 'lg'] as const) {
  test(`${size} renders`, async () => {
    const screen = await render(<Input size={size} aria-label="Amount" />);
    await expect.element(screen.getByRole('textbox', { name: 'Amount' })).toBeVisible();
  });
}

test('an omitted size matches md', async () => {
  const screen = await render(
    <>
      <Input aria-label="Default" />
      <Input size="md" aria-label="Explicit" />
    </>,
  );
  const implicit = screen.getByRole('textbox', { name: 'Default' }).element();
  const explicit = screen.getByRole('textbox', { name: 'Explicit' }).element();
  expect(implicit.className).not.toBe('');
  expect(implicit.className).toBe(explicit.className);
});

test('a consumer label names the input', async () => {
  const screen = await render(
    <>
      <label htmlFor="email">Email address</label>
      <Input id="email" />
    </>,
  );
  await expect.element(screen.getByRole('textbox', { name: 'Email address' })).toBeVisible();
});

test('aria-label names the input', async () => {
  const screen = await render(<Input aria-label="Search" />);
  await expect.element(screen.getByRole('textbox', { name: 'Search' })).toBeVisible();
});

test('keyboard focus draws the root outline', async () => {
  const screen = await render(<Input aria-label="Focus me" />);
  const input = screen.getByRole('textbox', { name: 'Focus me' }).element();
  await userEvent.tab();
  expect(document.activeElement).toBe(input);
  expect(parseFloat(getComputedStyle(input).outlineWidth)).toBeGreaterThan(0);
  expect(getComputedStyle(input).outlineStyle).toBe('solid');
});

test('typing changes the value', async () => {
  const screen = await render(<Input aria-label="Project" />);
  const input = screen.getByRole('textbox', { name: 'Project' });
  await userEvent.fill(input, 'ultima');
  expect((input.element() as HTMLInputElement).value).toBe('ultima');
});

test('aria-invalid recolors the border', async () => {
  const screen = await render(
    <>
      <Input aria-label="Valid" />
      <Input aria-label="Invalid" aria-invalid="true" />
    </>,
  );
  const valid = getComputedStyle(screen.getByRole('textbox', { name: 'Valid' }).element());
  const invalid = getComputedStyle(screen.getByRole('textbox', { name: 'Invalid' }).element());
  expect(invalid.borderTopColor).not.toBe(valid.borderTopColor);
});

test('disabled dims the input', async () => {
  const screen = await render(
    <>
      <Input aria-label="Enabled" />
      <Input aria-label="Disabled" disabled />
    </>,
  );
  const enabled = screen.getByRole('textbox', { name: 'Enabled' }).element();
  const disabled = screen.getByRole('textbox', { name: 'Disabled' }).element();
  expect(disabled).toHaveAttribute('data-disabled');
  expect(parseFloat(getComputedStyle(disabled).opacity)).toBeLessThan(parseFloat(getComputedStyle(enabled).opacity));
});

test('public prop types expose only supported styling axes', () => {
  expectTypeOf<InputProps>().not.toHaveProperty('className');
  expectTypeOf<InputSize>().toEqualTypeOf<'sm' | 'md' | 'lg'>();
});
