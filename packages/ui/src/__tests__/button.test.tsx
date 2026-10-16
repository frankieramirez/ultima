import * as stylex from '@stylexjs/stylex';
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

const overrides = stylex.create({ icon: { aspectRatio: 1, paddingInline: 0 } });

test('the icon-only recipe is square at every size', async () => {
  const screen = await render(
    <>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Button key={size} size={size} aria-label={`Add ${size}`} style={overrides.icon}>+</Button>
      ))}
    </>,
  );
  for (const size of ['sm', 'md', 'lg'] as const) {
    const rect = screen.getByRole('button', { name: `Add ${size}` }).element().getBoundingClientRect();
    expect(rect.width).toBeCloseTo(rect.height, 0);
  }
});

test('caller padding overrides the size table', async () => {
  const screen = await render(<><Button>Normal</Button><Button aria-label="Add" style={overrides.icon}>+</Button></>);
  const normal = getComputedStyle(screen.getByRole('button', { name: 'Normal' }).element());
  const icon = getComputedStyle(screen.getByRole('button', { name: 'Add' }).element());
  expect(icon.paddingInlineStart).toBe('0px');
  expect(icon.paddingInlineStart).not.toBe(normal.paddingInlineStart);
});

test('a disabled button keeps its resting fill under the pointer', async () => {
  const screen = await render(<><Button>Live</Button><Button disabled>Off</Button></>);
  const settle = () => new Promise((resolve) => setTimeout(resolve, 300));
  const live = screen.getByRole('button', { name: 'Live' }).element();
  const off = screen.getByRole('button', { name: 'Off' }).element();
  const liveResting = getComputedStyle(live).backgroundColor;
  const offResting = getComputedStyle(off).backgroundColor;
  await userEvent.hover(live);
  await settle();
  expect(getComputedStyle(live).backgroundColor).not.toBe(liveResting);
  await userEvent.hover(off);
  await settle();
  expect(off.matches(':hover')).toBe(true);
  expect(getComputedStyle(off).backgroundColor).toBe(offResting);
});

test('a long label stays on one line', async () => {
  const screen = await render(<div style={{ width: 40 }}><Button>Save all changes now</Button></div>);
  expect(getComputedStyle(screen.getByRole('button').element()).whiteSpace).toBe('nowrap');
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
