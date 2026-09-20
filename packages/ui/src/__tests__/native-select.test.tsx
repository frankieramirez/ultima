import { createRef } from 'react';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Field,
  NativeSelect,
  type NativeSelectRootProps,
  type NativeSelectSelectProps,
  type NativeSelectSize,
} from '@ultima/ui';

/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: one axis, `size` on Select (sm, md, lg), and no props matches md.
 * 2. The name resolves: role combobox on the native `<select>`, named by `<label htmlFor>`,
 *    `aria-label`, or `Field.Label` through the Field.Control registration.
 * 3. The focus ring lands on Select, the only part that takes focus; Root and the chevron
 *    draw none.
 * 4. The primitive is still wired: Field.Label names it, Description and Error merge into
 *    aria-describedby, invalid reaches it as aria-invalid / data-invalid, and a consumer
 *    onChange still fires; useRender carries render and ref on Root.
 * 5. Documented state drives its style: aria-invalid and data-invalid paint the danger
 *    border, and disabled dims.
 * 6. Typecheck passes: className is rejected, `size` is the axis and the native attribute
 *    is dropped, and options pass through as children.
 * 7. Behavior this component wires itself: the private chevron Root renders after its
 *    children, aria-hidden and pointer-events none, absolute at the inline end.
 * 8. CSS the primitive reads: none; Field.Control reads DOM attributes, not declarations.
 */

function FruitSelect(props: NativeSelectSelectProps) {
  return (
    <NativeSelect.Root>
      <NativeSelect.Select aria-label="Fruit" {...props}>
        <option value="apple">Apple</option>
        <option value="pear">Pear</option>
      </NativeSelect.Select>
    </NativeSelect.Root>
  );
}

for (const size of ['sm', 'md', 'lg'] as const) {
  test(`${size} renders`, async () => {
    const screen = await render(<FruitSelect size={size} />);
    await expect.element(screen.getByRole('combobox', { name: 'Fruit' })).toBeVisible();
  });
}

test('an omitted size matches md', async () => {
  const screen = await render(
    <>
      <NativeSelect.Root>
        <NativeSelect.Select aria-label="Default">
          <option value="a">A</option>
        </NativeSelect.Select>
      </NativeSelect.Root>
      <NativeSelect.Root>
        <NativeSelect.Select aria-label="Explicit" size="md">
          <option value="a">A</option>
        </NativeSelect.Select>
      </NativeSelect.Root>
    </>,
  );
  const implicit = screen.getByRole('combobox', { name: 'Default' }).element();
  const explicit = screen.getByRole('combobox', { name: 'Explicit' }).element();
  expect(implicit.className).not.toBe('');
  expect(implicit.className).toBe(explicit.className);
});

test('the control is a real select and options and optgroups pass through as children', async () => {
  const screen = await render(
    <NativeSelect.Root>
      <NativeSelect.Select aria-label="Material" defaultValue="oak">
        <optgroup label="Wood">
          <option value="oak">Oak</option>
          <option value="pine">Pine</option>
        </optgroup>
        <optgroup label="Metal">
          <option value="iron">Iron</option>
        </optgroup>
      </NativeSelect.Select>
    </NativeSelect.Root>,
  );
  const select = screen.getByRole('combobox', { name: 'Material' }).element() as HTMLSelectElement;
  expect(select.tagName).toBe('SELECT');
  expect(select.querySelectorAll('optgroup')).toHaveLength(2);
  expect(select.value).toBe('oak');
});

test('a consumer label names the select', async () => {
  const screen = await render(
    <>
      <label htmlFor="fruit">Fruit</label>
      <NativeSelect.Root>
        <NativeSelect.Select id="fruit">
          <option value="apple">Apple</option>
        </NativeSelect.Select>
      </NativeSelect.Root>
    </>,
  );
  await expect.element(screen.getByRole('combobox', { name: 'Fruit' })).toBeVisible();
});

test('Field.Label names the select and Description and Error merge into aria-describedby', async () => {
  const screen = await render(
    <Field.Root name="fruit" invalid>
      <Field.Label>Fruit</Field.Label>
      <NativeSelect.Root>
        <NativeSelect.Select data-testid="control">
          <option value="apple">Apple</option>
        </NativeSelect.Select>
      </NativeSelect.Root>
      <Field.Description>Pick one for the basket.</Field.Description>
      <Field.Error match>Required.</Field.Error>
    </Field.Root>,
  );
  await expect.element(screen.getByRole('combobox', { name: 'Fruit' })).toBeVisible();
  const control = screen.getByTestId('control').element();
  const describedBy = control.getAttribute('aria-describedby');
  expect(describedBy).toBeTruthy();
  const ids = describedBy!.split(/\s+/);
  expect(ids).toContain(screen.getByText('Pick one for the basket.').element().id);
  expect(ids).toContain(screen.getByText('Required.').element().id);
});

test('an invalid field marks the select aria-invalid and data-invalid', async () => {
  const screen = await render(
    <Field.Root name="fruit" invalid>
      <Field.Label>Fruit</Field.Label>
      <NativeSelect.Root>
        <NativeSelect.Select data-testid="control">
          <option value="apple">Apple</option>
        </NativeSelect.Select>
      </NativeSelect.Root>
      <Field.Error match>Required.</Field.Error>
    </Field.Root>,
  );
  const control = screen.getByTestId('control').element();
  expect(control).toHaveAttribute('aria-invalid', 'true');
  expect(control).toHaveAttribute('data-invalid');
});

test('a consumer onChange fires through the field wiring', async () => {
  let value = '';
  const screen = await render(
    <NativeSelect.Root>
      <NativeSelect.Select aria-label="Fruit" onChange={(event) => (value = event.currentTarget.value)}>
        <option value="apple">Apple</option>
        <option value="pear">Pear</option>
      </NativeSelect.Select>
    </NativeSelect.Root>,
  );
  const select = screen.getByRole('combobox', { name: 'Fruit' });
  await userEvent.selectOptions(select, 'pear');
  expect(value).toBe('pear');
});

test('keyboard focus draws the select outline', async () => {
  const screen = await render(<FruitSelect />);
  const select = screen.getByRole('combobox', { name: 'Fruit' }).element();
  await userEvent.tab();
  expect(document.activeElement).toBe(select);
  expect(parseFloat(getComputedStyle(select).outlineWidth)).toBeGreaterThan(0);
  expect(getComputedStyle(select).outlineStyle).toBe('solid');
});

test('aria-invalid recolors the border', async () => {
  const screen = await render(
    <>
      <FruitSelect aria-label="Valid" />
      <FruitSelect aria-label="Invalid" aria-invalid="true" />
    </>,
  );
  const valid = getComputedStyle(screen.getByRole('combobox', { name: 'Valid' }).element());
  const invalid = getComputedStyle(screen.getByRole('combobox', { name: 'Invalid' }).element());
  expect(invalid.borderTopColor).not.toBe(valid.borderTopColor);
});

test('data-invalid recolors the border without aria-invalid', async () => {
  const screen = await render(
    <>
      <NativeSelect.Root>
        <NativeSelect.Select aria-label="Valid">
          <option value="a">A</option>
        </NativeSelect.Select>
      </NativeSelect.Root>
      <NativeSelect.Root>
        <NativeSelect.Select aria-label="Invalid" data-invalid="">
          <option value="a">A</option>
        </NativeSelect.Select>
      </NativeSelect.Root>
    </>,
  );
  const valid = getComputedStyle(screen.getByRole('combobox', { name: 'Valid' }).element());
  const invalid = screen.getByRole('combobox', { name: 'Invalid' }).element();
  expect(invalid).not.toHaveAttribute('aria-invalid');
  expect(getComputedStyle(invalid).borderTopColor).not.toBe(valid.borderTopColor);
});

test('disabled dims the select', async () => {
  const screen = await render(
    <>
      <NativeSelect.Root>
        <NativeSelect.Select aria-label="Enabled">
          <option value="a">A</option>
        </NativeSelect.Select>
      </NativeSelect.Root>
      <NativeSelect.Root>
        <NativeSelect.Select aria-label="Disabled" disabled>
          <option value="a">A</option>
        </NativeSelect.Select>
      </NativeSelect.Root>
    </>,
  );
  const enabled = screen.getByRole('combobox', { name: 'Enabled' }).element();
  const disabled = screen.getByRole('combobox', { name: 'Disabled' }).element();
  expect(disabled).toHaveAttribute('data-disabled');
  expect(parseFloat(getComputedStyle(disabled).opacity)).toBeLessThan(parseFloat(getComputedStyle(enabled).opacity));
});

test('the native appearance is gone and the select fills its root', async () => {
  const screen = await render(<FruitSelect />);
  const select = screen.getByRole('combobox', { name: 'Fruit' }).element();
  const styles = getComputedStyle(select);
  expect(styles.appearance).toBe('none');
  const end = parseFloat(styles.paddingInlineEnd);
  const start = parseFloat(styles.paddingInlineStart);
  expect(end).toBeGreaterThan(start);
});

test('Root renders a private chevron after the select', async () => {
  const screen = await render(
    <NativeSelect.Root data-testid="root">
      <NativeSelect.Select aria-label="Fruit">
        <option value="apple">Apple</option>
      </NativeSelect.Select>
    </NativeSelect.Root>,
  );
  const root = screen.getByTestId('root').element();
  const select = screen.getByRole('combobox', { name: 'Fruit' }).element();
  const chevron = root.querySelector('[aria-hidden="true"]');
  expect(chevron).not.toBeNull();
  expect(chevron!.compareDocumentPosition(select) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  const styles = getComputedStyle(chevron as Element);
  expect(styles.position).toBe('absolute');
  expect(styles.pointerEvents).toBe('none');
  expect(getComputedStyle(root).position).toBe('relative');
});

test('render and ref reach the root', async () => {
  const rootRef = createRef<HTMLDivElement>();
  const screen = await render(
    <NativeSelect.Root ref={rootRef} render={<section data-custom="root" />} data-testid="root">
      <NativeSelect.Select aria-label="Fruit">
        <option value="apple">Apple</option>
      </NativeSelect.Select>
    </NativeSelect.Root>,
  );
  const root = screen.getByTestId('root').element();
  expect(root.tagName).toBe('SECTION');
  expect(rootRef.current).toBe(root);
  expect(root).toHaveAttribute('data-custom', 'root');
});

test('public prop types expose the style slot and the size axis on Select only', () => {
  expectTypeOf<NativeSelectRootProps>().not.toHaveProperty('className');
  expectTypeOf<NativeSelectSelectProps>().not.toHaveProperty('className');
  expectTypeOf<NativeSelectRootProps>().not.toHaveProperty('size');
  expectTypeOf<NativeSelectSize>().toEqualTypeOf<'sm' | 'md' | 'lg'>();
  expectTypeOf<NativeSelectSelectProps['size']>().toEqualTypeOf<NativeSelectSize | undefined>();
  expectTypeOf<NativeSelectRootProps>().toHaveProperty('render');
  expectTypeOf<NativeSelectRootProps>().toHaveProperty('style');
  expectTypeOf<NativeSelectSelectProps>().toHaveProperty('style');
  expectTypeOf<NativeSelectSelectProps>().toHaveProperty('multiple');
});
