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

import { resolved } from './overlay';

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

test('disabled mutes the input and quiets the swatch edge, with no fade', async () => {
  const screen = await render(
    <>
      <Tree hexName="Enabled" swatchName="Enabled swatch" />
      <Tree disabled hexName="Disabled" swatchName="Disabled swatch" />
    </>,
  );
  const disabledSwatch = screen.getByRole('button', { name: 'Disabled swatch' }).element();
  const enabledInput = screen.getByRole('textbox', { name: 'Enabled' }).element();
  const disabledInput = screen.getByRole('textbox', { name: 'Disabled' }).element();
  expect(getComputedStyle(disabledSwatch).opacity).toBe('1');
  expect(getComputedStyle(disabledSwatch).borderTopColor).toBe(resolved('border-top-color', 'var(--ult-color-border)'));
  expect(getComputedStyle(disabledInput).opacity).toBe('1');
  expect(getComputedStyle(disabledInput).backgroundColor).not.toBe(getComputedStyle(enabledInput).backgroundColor);
  expect(getComputedStyle(disabledInput).color).toBe(resolved('color', 'var(--ult-color-text-disabled)'));
});

test('the input wears the field recipe: 14px text, a hover edge, and the ring outside the edge', async () => {
  const screen = await render(<Tree />);
  const input = screen.getByRole('textbox', { name: 'Hex' }).element();
  const swatch = screen.getByRole('button', { name: 'Pick color' }).element();
  expect(getComputedStyle(input).fontSize).toBe(resolved('font-size', 'var(--ult-text-4)'));
  expect(getComputedStyle(input).outlineOffset).toBe('2px');
  await userEvent.hover(input);
  await expect.poll(() => getComputedStyle(input).borderTopColor).toBe(resolved('border-top-color', 'var(--ult-color-border-hover)'));
  await userEvent.hover(swatch);
  await expect.poll(() => getComputedStyle(swatch).borderTopColor).toBe(resolved('border-top-color', 'var(--ult-color-border-hover)'));
});

test('the picker channels are compact fields on the control corner', async () => {
  const screen = await render(<Tree defaultOpen />);
  const red = screen.getByRole('spinbutton', { name: 'Red' }).element();
  expect(getComputedStyle(red).borderTopLeftRadius).toBe(resolved('border-top-left-radius', 'var(--ult-radius-md)'));
  expect(getComputedStyle(red).backgroundColor).toBe(resolved('background-color', 'var(--ult-color-field)'));
  expect(getComputedStyle(red).fontSize).toBe(resolved('font-size', 'var(--ult-text-4)'));
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

/** The hue slider's parts, from its named range input: Base UI nests the input inside the thumb. */
function hueParts() {
  const input = page.getByRole('slider', { name: 'Hue' }).element() as HTMLInputElement;
  const thumb = input.parentElement as HTMLElement;
  const track = thumb.parentElement as HTMLElement;
  const control = track.parentElement as HTMLElement;
  return { input, thumb, track, control };
}

test("the hue thumb is Slider's: 16px of paper inside the 3:1 edge, resting at shadow-sm, whose edge darkens on hover", async () => {
  await render(<Tree defaultOpen />);
  await expect.element(page.getByRole('slider', { name: 'Hue' })).toBeInTheDocument();
  const { thumb } = hueParts();
  const style = getComputedStyle(thumb);
  expect(thumb.getBoundingClientRect().width).toBe(16);
  expect(thumb.getBoundingClientRect().height).toBe(16);
  expect(style.borderTopLeftRadius).toBe(resolved('border-top-left-radius', 'var(--ult-radius-full)'));
  expect(style.backgroundColor).toBe(resolved('background-color', 'var(--ult-color-field)'));
  expect(style.borderTopStyle).toBe('solid');
  expect(style.borderTopWidth).toBe('1px');
  expect(style.borderTopColor).toBe(resolved('border-top-color', 'var(--ult-color-border-strong)'));
  expect(style.boxShadow).toBe(resolved('box-shadow', 'var(--ult-shadow-sm)'));
  await userEvent.hover(thumb);
  await expect.poll(() => getComputedStyle(thumb).borderTopColor).toBe(resolved('border-top-color', 'var(--ult-color-border-hover)'));
});

test('the hue thumb stands taller than the strip, so its edge always crosses the popup surface', async () => {
  await render(<Tree defaultOpen />);
  await expect.element(page.getByRole('slider', { name: 'Hue' })).toBeInTheDocument();
  const { thumb, track } = hueParts();
  const thumbBox = thumb.getBoundingClientRect();
  const trackBox = track.getBoundingClientRect();
  expect(trackBox.height).toBe(6);
  expect(thumbBox.top).toBeLessThan(trackBox.top);
  expect(thumbBox.bottom).toBeGreaterThan(trackBox.bottom);
  expect(getComputedStyle(track).backgroundImage).toContain('linear-gradient');
  expect(getComputedStyle(track).borderTopStyle).toBe('solid');
  expect(getComputedStyle(track).borderTopColor).toBe(resolved('border-top-color', 'var(--ult-color-border)'));
});

test('keyboard focus rings the hue thumb 2px outside its edge, inside the control, and the strip shows none', async () => {
  await render(<Tree defaultOpen />);
  await expect.element(page.getByRole('slider', { name: 'Hue' })).toBeInTheDocument();
  const { input, thumb, track, control } = hueParts();
  expect(getComputedStyle(thumb).outlineStyle).toBe('none');

  (page.getByRole('slider', { name: 'Saturation and brightness' }).element() as HTMLElement).focus();
  await userEvent.tab();
  expect(document.activeElement).toBe(input);

  const ring = getComputedStyle(thumb);
  expect(ring.outlineStyle).toBe('solid');
  expect(ring.outlineWidth).toBe('2px');
  expect(ring.outlineOffset).toBe('2px');
  expect(ring.outlineColor).toBe(resolved('outline-color', 'var(--ult-color-border-focus)'));
  // The ring's outer edge is the thumb plus the gap and the ring on each side, and the control holds it.
  const reach = parseFloat(ring.outlineOffset) + parseFloat(ring.outlineWidth);
  expect(thumb.getBoundingClientRect().height + 2 * reach).toBeLessThanOrEqual(control.getBoundingClientRect().height);
  for (const part of [track, control]) expect(getComputedStyle(part).outlineStyle).toBe('none');
});

test('arrows on the hue slider turn the hue and commit the color', async () => {
  const screen = await render(<Tree defaultOpen defaultValue="#ff0000" />);
  await expect.element(page.getByRole('slider', { name: 'Hue' })).toBeInTheDocument();
  (page.getByRole('slider', { name: 'Saturation and brightness' }).element() as HTMLElement).focus();
  await userEvent.tab();
  await userEvent.keyboard('{ArrowRight}');
  expect(page.getByRole('slider', { name: 'Hue' }).element()).toHaveAttribute('aria-valuenow', '1');
  expect((screen.getByRole('textbox', { name: 'Hex' }).element() as HTMLInputElement).value).toBe('#ff0400');
});

test('a disabled hue thumb takes the disabled colours and drops its shadow, and the strip keeps its hues', async () => {
  await render(<Tree defaultOpen disabled />);
  await expect.element(page.getByRole('slider', { name: 'Hue' })).toBeInTheDocument();
  const { input, thumb, track } = hueParts();
  expect(input).toBeDisabled();
  const style = getComputedStyle(thumb);
  expect(style.opacity).toBe('1');
  expect(style.backgroundColor).toBe(resolved('background-color', 'var(--ult-color-surface-sunken)'));
  expect(style.borderTopColor).toBe(resolved('border-top-color', 'var(--ult-color-border)'));
  expect(style.boxShadow).toBe('none');
  expect(getComputedStyle(track).backgroundImage).toContain('linear-gradient');
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
    await expect.poll(() => getComputedStyle(page.getByRole('dialog', { name: 'Color picker' }).element()).opacity).toBe('1');
    expect(
      await violations({
        include: [page.getByRole('dialog', { name: 'Color picker' }).element()],
        exclude: [['[data-base-ui-focus-guard]']],
      }),
    ).toEqual([]);
  });
}
