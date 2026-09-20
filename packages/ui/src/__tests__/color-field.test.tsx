import {
  ColorField,
  Field,
  useColorField,
  type ColorFieldInputProps,
  type ColorFieldSize,
  type ColorFieldSwatchProps,
} from '@ultima/ui';
import source from '../color-field?raw';
import { expect, expectTypeOf, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { themeDocument, themes, violations } from './axe';

function Tree({
  hexName = 'Hex',
  swatchName = 'Pick color',
  ...props
}: { hexName?: string; swatchName?: string } & Parameters<typeof ColorField.Root>[0]) {
  return (
    <ColorField.Root defaultValue="#3366ff" {...props}>
      <ColorField.Swatch aria-label={swatchName} />
      <ColorField.Input aria-label={hexName} />
      <ColorField.Portal>
        <ColorField.Positioner>
          <ColorField.Popup>
            <ColorField.Picker />
          </ColorField.Popup>
        </ColorField.Positioner>
      </ColorField.Portal>
    </ColorField.Root>
  );
}

for (const size of ['sm', 'md', 'lg'] as const) {
  test(`${size} renders`, async () => {
    const screen = await render(<Tree size={size} />);
    await expect.element(screen.getByRole('button', { name: 'Pick color' })).toBeVisible();
    await expect.element(screen.getByRole('textbox', { name: 'Hex' })).toBeVisible();
  });
}

test('an omitted size matches md', async () => {
  const screen = await render(
    <>
      <Tree hexName="Default" swatchName="Default swatch" />
      <Tree size="md" hexName="Explicit" swatchName="Explicit swatch" />
    </>,
  );
  const implicit = screen.getByRole('textbox', { name: 'Default' }).element();
  const explicit = screen.getByRole('textbox', { name: 'Explicit' }).element();
  expect(implicit.className).not.toBe('');
  expect(implicit.className).toBe(explicit.className);
});

test('useColorField outside Root throws', async () => {
  function Outside() {
    useColorField();
    return null;
  }
  await expect(render(<Outside />)).rejects.toThrowError('useColorField must be used inside ColorField.Root');
});

test('a Field.Label names the hex input, and the swatch is named by aria-label', async () => {
  const screen = await render(
    <Field.Root name="accent">
      <Field.Label>Accent</Field.Label>
      <ColorField.Root defaultValue="#3366ff">
        <ColorField.Swatch aria-label="Pick accent" />
        <ColorField.Input />
      </ColorField.Root>
    </Field.Root>,
  );
  await expect.element(screen.getByRole('textbox', { name: 'Accent' })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Pick accent' })).toBeVisible();
});

test('the open popup is a dialog named Color picker by default', async () => {
  const screen = await render(<Tree />);
  await screen.getByRole('button', { name: 'Pick color' }).click();
  await expect.element(page.getByRole('dialog', { name: 'Color picker' })).toBeVisible();
});

test('the ring is on the swatch and the input; the popup shows none', async () => {
  const screen = await render(<Tree />);
  await userEvent.tab();
  const swatch = screen.getByRole('button', { name: 'Pick color' }).element();
  expect(document.activeElement).toBe(swatch);
  expect(getComputedStyle(swatch).outlineStyle).toBe('solid');
  expect(parseFloat(getComputedStyle(swatch).outlineWidth)).toBeGreaterThan(0);

  await userEvent.tab();
  const input = screen.getByRole('textbox', { name: 'Hex' }).element();
  expect(document.activeElement).toBe(input);
  expect(getComputedStyle(input).outlineStyle).toBe('solid');
  expect(parseFloat(getComputedStyle(input).outlineWidth)).toBeGreaterThan(0);

  await screen.getByRole('button', { name: 'Pick color' }).click();
  const popup = page.getByRole('dialog', { name: 'Color picker' }).element();
  await expect.element(page.getByRole('dialog', { name: 'Color picker' })).toBeVisible();
  popup.focus();
  expect(getComputedStyle(popup).outlineStyle).toBe('none');
});

test('Escape closes the picker and returns focus to the swatch', async () => {
  const screen = await render(<Tree />);
  await screen.getByRole('button', { name: 'Pick color' }).click();
  await expect.element(page.getByRole('dialog', { name: 'Color picker' })).toBeVisible();
  await userEvent.keyboard('{Escape}');
  await expect.element(page.getByRole('dialog', { name: 'Color picker' })).not.toBeInTheDocument();
  await expect.element(screen.getByRole('button', { name: 'Pick color' })).toHaveFocus();
});

test('aria-invalid recolors the hex input border', async () => {
  const screen = await render(
    <>
      <Tree hexName="Valid" swatchName="Valid swatch" />
      <ColorField.Root defaultValue="#3366ff">
        <ColorField.Input aria-label="Invalid" aria-invalid="true" />
      </ColorField.Root>
    </>,
  );
  const valid = getComputedStyle(screen.getByRole('textbox', { name: 'Valid' }).element());
  const invalid = getComputedStyle(screen.getByRole('textbox', { name: 'Invalid' }).element());
  expect(invalid.borderTopColor).not.toBe(valid.borderTopColor);
});

test('disabled dims the swatch and the input', async () => {
  const screen = await render(
    <>
      <Tree hexName="Enabled" swatchName="Enabled swatch" />
      <Tree disabled hexName="Disabled" swatchName="Disabled swatch" />
    </>,
  );
  const enabledSwatch = screen.getByRole('button', { name: 'Enabled swatch' }).element();
  const disabledSwatch = screen.getByRole('button', { name: 'Disabled swatch' }).element();
  const enabledInput = screen.getByRole('textbox', { name: 'Enabled' }).element();
  const disabledInput = screen.getByRole('textbox', { name: 'Disabled' }).element();
  expect(parseFloat(getComputedStyle(disabledSwatch).opacity)).toBeLessThan(
    parseFloat(getComputedStyle(enabledSwatch).opacity),
  );
  expect(parseFloat(getComputedStyle(disabledInput).opacity)).toBeLessThan(
    parseFloat(getComputedStyle(enabledInput).opacity),
  );
});

test('typing a valid hex commits the value, and invalid text is invalid inside a Field', async () => {
  const screen = await render(
    <Field.Root name="accent" validationMode="onChange">
      <Field.Label>Accent</Field.Label>
      <ColorField.Root defaultValue="#3366ff">
        <ColorField.Swatch aria-label="Pick accent" />
        <ColorField.Input />
        <ColorField.Portal>
          <ColorField.Positioner>
            <ColorField.Popup>
              <ColorField.Picker />
            </ColorField.Popup>
          </ColorField.Positioner>
        </ColorField.Portal>
      </ColorField.Root>
      <Field.Error match="patternMismatch">Enter a valid six-digit hex.</Field.Error>
    </Field.Root>,
  );

  const input = screen.getByRole('textbox', { name: 'Accent' });
  await userEvent.fill(input, '#ffaa00');
  expect((input.element() as HTMLInputElement).value).toBe('#ffaa00');

  await userEvent.fill(input, 'not-hex');
  expect((input.element() as HTMLInputElement).value).toBe('not-hex');
  expect(input.element()).toHaveAttribute('aria-invalid', 'true');
  await expect.element(screen.getByText('Enter a valid six-digit hex.')).toBeVisible();
});

test('committing a color through the picker updates the value', async () => {
  const screen = await render(<Tree />);
  const swatch = screen.getByRole('button', { name: 'Pick color' }).element();
  const before = getComputedStyle(swatch).backgroundColor;
  await screen.getByRole('button', { name: 'Pick color' }).click();
  const pickerHex = page.getByRole('textbox', { name: 'HEX' });
  await expect.element(pickerHex).toBeVisible();
  await userEvent.fill(pickerHex, '#cc2244');
  expect((screen.getByRole('textbox', { name: 'Hex' }).element() as HTMLInputElement).value).toBe('#cc2244');
  expect(getComputedStyle(swatch).backgroundColor).not.toBe(before);
});

test('the saturation-brightness area is the surface a pointer drag reads', async () => {
  const screen = await render(<Tree />);
  await screen.getByRole('button', { name: 'Pick color' }).click();
  const area = page.getByRole('slider', { name: 'Saturation and brightness' }).element();
  await expect.element(page.getByRole('slider', { name: 'Saturation and brightness' })).toBeVisible();
  expect(getComputedStyle(area).touchAction).toBe('none');
  expect(getComputedStyle(area).userSelect).toBe('none');
});

test('the file imports Popover, sets no keepMounted, and imports no Input item', () => {
  const imports = [...source.matchAll(/from '([^']+)'/g)].map(([, specifier]) => specifier);
  expect(imports).toContain('@ultima/ui/popover');
  expect(imports).not.toContain('@ultima/ui/input');
  expect(source).not.toContain('keepMounted');
});

test('className is rejected and size is the only axis', () => {
  expectTypeOf<ColorFieldInputProps>().not.toHaveProperty('className');
  expectTypeOf<ColorFieldSwatchProps>().not.toHaveProperty('className');
  expectTypeOf<ColorFieldSize>().toEqualTypeOf<'sm' | 'md' | 'lg'>();
});

for (const mode of themes) {
  test(`the open color field has no axe violations in ${mode.name}`, async () => {
    themeDocument(mode);
    const screen = await render(
      <main>
        <Tree />
      </main>,
    );
    await screen.getByRole('button', { name: 'Pick color' }).click();
    await expect.element(page.getByRole('dialog', { name: 'Color picker' })).toBeVisible();
    expect(
      await violations({
        include: [page.getByRole('dialog', { name: 'Color picker' }).element()],
        exclude: [['[data-base-ui-focus-guard]']],
      }),
    ).toEqual([]);
  });
}
