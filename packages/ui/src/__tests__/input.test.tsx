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

test('data-invalid recolors the border without aria-invalid', async () => {
  const screen = await render(
    <>
      <Input aria-label="Valid" />
      <Input aria-label="Invalid" data-invalid="" />
    </>,
  );
  const valid = getComputedStyle(screen.getByRole('textbox', { name: 'Valid' }).element());
  const invalid = screen.getByRole('textbox', { name: 'Invalid' }).element();
  expect(invalid).not.toHaveAttribute('aria-invalid');
  expect(getComputedStyle(invalid).borderTopColor).not.toBe(valid.borderTopColor);
});

test('disabled takes the muted fill and ink, not opacity', async () => {
  const screen = await render(
    <>
      <Input aria-label="Enabled" />
      <Input aria-label="Disabled" disabled />
    </>,
  );
  const enabled = screen.getByRole('textbox', { name: 'Enabled' }).element();
  const disabled = screen.getByRole('textbox', { name: 'Disabled' }).element();
  expect(disabled).toHaveAttribute('data-disabled');
  expect(getComputedStyle(disabled).opacity).toBe('1');
  expect(getComputedStyle(disabled).backgroundColor).not.toBe(getComputedStyle(enabled).backgroundColor);
  expect(getComputedStyle(disabled).color).not.toBe(getComputedStyle(enabled).color);
});

test('public prop types expose only supported styling axes', () => {
  expectTypeOf<InputProps>().not.toHaveProperty('className');
  expectTypeOf<InputSize>().toEqualTypeOf<'sm' | 'md' | 'lg'>();
});

const settle = () => new Promise((resolve) => setTimeout(resolve, 300));

test('hover darkens the edge, not the fill, and a disabled field keeps its resting edge', async () => {
  const screen = await render(
    <>
      <Input aria-label="Live" />
      <Input aria-label="Off" disabled />
    </>,
  );
  const live = screen.getByRole('textbox', { name: 'Live' }).element();
  const off = screen.getByRole('textbox', { name: 'Off' }).element();
  const liveResting = getComputedStyle(live);
  const [liveEdge, liveFill] = [liveResting.borderTopColor, liveResting.backgroundColor];
  const offEdge = getComputedStyle(off).borderTopColor;
  await userEvent.hover(live);
  await settle();
  expect(getComputedStyle(live).borderTopColor).not.toBe(liveEdge);
  expect(getComputedStyle(live).backgroundColor).toBe(liveFill);
  await userEvent.hover(off);
  await settle();
  expect(off.matches(':hover')).toBe(true);
  expect(getComputedStyle(off).borderTopColor).toBe(offEdge);
});

test('the focus outline lies over the edge', async () => {
  const screen = await render(<Input aria-label="Focus" />);
  await userEvent.tab();
  expect(getComputedStyle(screen.getByRole('textbox', { name: 'Focus' }).element()).outlineOffset).toBe('-1px');
});

test('field text is 14px at every size below lg', async () => {
  const screen = await render(
    <>
      <Input aria-label="Small" size="sm" />
      <Input aria-label="Medium" />
    </>,
  );
  for (const name of ['Small', 'Medium']) {
    expect(getComputedStyle(screen.getByRole('textbox', { name }).element()).fontSize).toBe('14px');
  }
});

test('the placeholder is drawn at full opacity', async () => {
  const screen = await render(<Input aria-label="Email" placeholder="you@example.com" />);
  const input = screen.getByRole('textbox', { name: 'Email' }).element();
  expect(getComputedStyle(input, '::placeholder').opacity).toBe('1');
});
