import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { createRef } from 'react';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { Button, type ButtonProps, type ButtonSize, type ButtonTone, type ButtonVariant } from '@ultima/ui';

test('a button is named by its text', async () => {
  const screen = await render(<Button>Save changes</Button>);
  await expect.element(screen.getByRole('button', { name: 'Save changes' })).toBeVisible();
});

for (const variant of ['solid', 'outline', 'ghost'] as const) {
  for (const size of ['sm', 'md', 'lg'] as const) {
    for (const tone of ['accent', 'danger'] as const) {
      test(`${variant} / ${size} / ${tone} renders`, async () => {
        const screen = await render(<Button variant={variant} size={size} tone={tone}>Action</Button>);
        await expect.element(screen.getByRole('button', { name: 'Action' })).toBeVisible();
      });
    }
  }
}

test('omitted axes match solid / md / accent', async () => {
  const screen = await render(<><Button>Default</Button><Button variant="solid" size="md" tone="accent">Explicit</Button></>);
  const implicit = screen.getByRole('button', { name: 'Default' }).element();
  const explicit = screen.getByRole('button', { name: 'Explicit' }).element();
  expect(implicit.className).not.toBe('');
  expect(implicit.className).toBe(explicit.className);
});

test('keyboard focus draws the root outline', async () => {
  const screen = await render(<Button>Focus me</Button>);
  const button = screen.getByRole('button', { name: 'Focus me' }).element();
  await userEvent.tab();
  expect(document.activeElement).toBe(button);
  expect(parseFloat(getComputedStyle(button).outlineWidth)).toBeGreaterThan(0);
  expect(getComputedStyle(button).outlineStyle).toBe('solid');
});

test('disabled prevents activation and its data attribute dims the root', async () => {
  const onClick = vi.fn();
  const screen = await render(<Button disabled onClick={onClick}>Disabled</Button>);
  const button = screen.getByRole('button', { name: 'Disabled' }).element();
  expect(button).toHaveAttribute('data-disabled');
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  expect(onClick).not.toHaveBeenCalled();
  const disabledOpacity = parseFloat(getComputedStyle(button).opacity);
  button.removeAttribute('data-disabled');
  expect(disabledOpacity).toBeLessThan(parseFloat(getComputedStyle(button).opacity));
  expect(getComputedStyle(button).cursor).toBe('pointer');
});

const overrides = stylex.create({ icon: { paddingInline: space['--ult-space-4'] } });

test('caller padding overrides the size table', async () => {
  const screen = await render(<><Button>Normal</Button><Button aria-label="Add" style={overrides.icon}>+</Button></>);
  const normal = getComputedStyle(screen.getByRole('button', { name: 'Normal' }).element());
  const icon = getComputedStyle(screen.getByRole('button', { name: 'Add' }).element());
  expect(icon.paddingInlineStart).toBe(icon.paddingBlockStart);
  expect(icon.paddingInlineStart).not.toBe(normal.paddingInlineStart);
});

test('render and ref reach the underlying element', async () => {
  const ref = createRef<HTMLButtonElement>();
  const screen = await render(<Button ref={ref} render={<button data-custom="yes" />}>Custom</Button>);
  expect(ref.current).toBe(screen.getByRole('button', { name: 'Custom' }).element());
  expect(ref.current).toHaveAttribute('data-custom', 'yes');
});

test('rendered as a link, the label keeps no underline', async () => {
  const screen = await render(<Button render={<a href="#install" />} nativeButton={false}>Install</Button>);
  const link = screen.getByRole('button', { name: 'Install' }).element();
  expect(link.tagName).toBe('A');
  expect(getComputedStyle(link).textDecorationLine).toBe('none');
});

test('public prop types expose only supported styling axes', () => {
  expectTypeOf<ButtonProps>().not.toHaveProperty('className');
  expectTypeOf<ButtonTone>().toEqualTypeOf<'accent' | 'danger'>();
  expectTypeOf<ButtonVariant>().toEqualTypeOf<'solid' | 'outline' | 'ghost'>();
  expectTypeOf<ButtonSize>().toEqualTypeOf<'sm' | 'md' | 'lg'>();
});
