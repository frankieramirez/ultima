/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: none × sm/md/lg × none, and no props matches the declared default (md).
 * 2. The name resolves: role textbox, named by a consumer label, aria-label, or Field.Label.
 * 3. The focus ring lands where the contract says: on Root; nothing else to ring.
 * 4. The primitive is still wired: native textarea; Enter inserts a newline and does not submit.
 * 5. Documented state drives its style: aria-invalid and data-invalid recolor the border; disabled dims.
 * 6. Typecheck passes: className is rejected, and the size union is sm | md | lg.
 * 7. Behavior this component wires itself: none, because every interaction is the primitive's or a style on a data-* attribute.
 * 8. CSS the primitive reads: none, because Textarea has no clause-2 declarations.
 */
import { Field, Textarea, type TextareaProps, type TextareaSize } from '@ultima/ui';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';

for (const size of ['sm', 'md', 'lg'] as const) {
  test(`${size} renders`, async () => {
    const screen = await render(<Textarea size={size} aria-label="Notes" />);
    await expect.element(screen.getByRole('textbox', { name: 'Notes' })).toBeVisible();
  });
}

test('an omitted size matches md', async () => {
  const screen = await render(
    <>
      <Textarea aria-label="Default" />
      <Textarea size="md" aria-label="Explicit" />
    </>,
  );
  const implicit = screen.getByRole('textbox', { name: 'Default' }).element();
  const explicit = screen.getByRole('textbox', { name: 'Explicit' }).element();
  expect(implicit.className).not.toBe('');
  expect(implicit.className).toBe(explicit.className);
});

test('a consumer label names the textarea', async () => {
  const screen = await render(
    <>
      <label htmlFor="bio">Biography</label>
      <Textarea id="bio" />
    </>,
  );
  await expect.element(screen.getByRole('textbox', { name: 'Biography' })).toBeVisible();
});

test('aria-label names the textarea', async () => {
  const screen = await render(<Textarea aria-label="Comments" />);
  await expect.element(screen.getByRole('textbox', { name: 'Comments' })).toBeVisible();
});

test('Field.Label names the textarea', async () => {
  const screen = await render(
    <Field.Root name="notes">
      <Field.Label>Notes</Field.Label>
      <Textarea />
    </Field.Root>,
  );
  await expect.element(screen.getByRole('textbox', { name: 'Notes' })).toBeVisible();
});

test('keyboard focus draws the root outline', async () => {
  const screen = await render(<Textarea aria-label="Focus me" />);
  const area = screen.getByRole('textbox', { name: 'Focus me' }).element();
  await userEvent.tab();
  expect(document.activeElement).toBe(area);
  expect(parseFloat(getComputedStyle(area).outlineWidth)).toBeGreaterThan(0);
  expect(getComputedStyle(area).outlineStyle).toBe('solid');
});

test('Enter inserts a newline and does not submit a wrapping form', async () => {
  const submitted: string[] = [];
  const screen = await render(
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submitted.push('yes');
      }}
    >
      <Textarea aria-label="Body" />
      <button type="submit">Save</button>
    </form>,
  );
  const area = screen.getByRole('textbox', { name: 'Body' });
  await userEvent.click(area);
  await userEvent.keyboard('hello{Enter}world');
  expect((area.element() as HTMLTextAreaElement).value).toBe('hello\nworld');
  expect(submitted).toEqual([]);
});

test('aria-invalid recolors the border', async () => {
  const screen = await render(
    <>
      <Textarea aria-label="Valid" />
      <Textarea aria-label="Invalid" aria-invalid="true" />
    </>,
  );
  const valid = getComputedStyle(screen.getByRole('textbox', { name: 'Valid' }).element());
  const invalid = getComputedStyle(screen.getByRole('textbox', { name: 'Invalid' }).element());
  expect(invalid.borderTopColor).not.toBe(valid.borderTopColor);
});

test('data-invalid recolors the border without aria-invalid', async () => {
  const screen = await render(
    <>
      <Textarea aria-label="Valid" />
      <Textarea aria-label="Invalid" data-invalid="" />
    </>,
  );
  const valid = getComputedStyle(screen.getByRole('textbox', { name: 'Valid' }).element());
  const invalid = screen.getByRole('textbox', { name: 'Invalid' }).element();
  expect(invalid).not.toHaveAttribute('aria-invalid');
  expect(getComputedStyle(invalid).borderTopColor).not.toBe(valid.borderTopColor);
});

test('disabled dims the textarea', async () => {
  const screen = await render(
    <>
      <Textarea aria-label="Enabled" />
      <Textarea aria-label="Disabled" disabled />
    </>,
  );
  const enabled = screen.getByRole('textbox', { name: 'Enabled' }).element();
  const disabled = screen.getByRole('textbox', { name: 'Disabled' }).element();
  expect(disabled).toHaveAttribute('data-disabled');
  expect(parseFloat(getComputedStyle(disabled).opacity)).toBeLessThan(parseFloat(getComputedStyle(enabled).opacity));
});

test('size sets min-height rather than height, and resize is vertical', async () => {
  const screen = await render(
    <>
      <Textarea size="sm" aria-label="Small" />
      <Textarea size="md" aria-label="Medium" />
      <Textarea size="lg" aria-label="Large" />
    </>,
  );
  const sm = getComputedStyle(screen.getByRole('textbox', { name: 'Small' }).element());
  const md = getComputedStyle(screen.getByRole('textbox', { name: 'Medium' }).element());
  const lg = getComputedStyle(screen.getByRole('textbox', { name: 'Large' }).element());
  expect(sm.resize).toBe('vertical');
  expect(md.resize).toBe('vertical');
  expect(lg.resize).toBe('vertical');
  expect(parseFloat(sm.minHeight)).toBeGreaterThan(0);
  expect(parseFloat(md.minHeight)).toBeGreaterThan(parseFloat(sm.minHeight));
  expect(parseFloat(lg.minHeight)).toBeGreaterThan(parseFloat(md.minHeight));
});

test('public prop types expose only supported styling axes', () => {
  expectTypeOf<TextareaProps>().not.toHaveProperty('className');
  expectTypeOf<TextareaSize>().toEqualTypeOf<'sm' | 'md' | 'lg'>();
});
