import { createRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { Separator, type SeparatorProps } from '@ultima/ui';

const styles = stylex.create({ override: { inlineSize: '50%' } });

test('renders a horizontal separator', async () => {
  const screen = await render(<Separator aria-label="Section divider" />);
  const separator = screen.getByRole('separator').element();
  const parent = separator.parentElement;
  expect(separator.tagName).toBe('DIV');
  expect(separator).toHaveAttribute('aria-label', 'Section divider');
  expect(separator.clientWidth).toBe(parent?.clientWidth);
  expect(getComputedStyle(separator).borderBlockStartWidth).not.toBe('0px');
});

test('renders a vertical separator with its orientation', async () => {
  const screen = await render(<Separator orientation="vertical" />);
  const separator = screen.getByRole('separator').element();
  expect(separator).toHaveAttribute('aria-orientation', 'vertical');
  expect(getComputedStyle(separator).borderInlineStartWidth).not.toBe('0px');
});

test('is static and does not enter the tab order', async () => {
  const screen = await render(<Separator />);
  const separator = screen.getByRole('separator').element();
  expect(separator.tabIndex).toBe(-1);
  expect(getComputedStyle(separator).outlineStyle).toBe('none');
});

test('render and ref reach the root element', async () => {
  const ref = createRef<HTMLDivElement>();
  const screen = await render(<Separator ref={ref} render={<div data-testid="custom" />} />);
  const root = screen.getByTestId('custom').element();
  expect(root.tagName).toBe('DIV');
  expect(ref.current).toBe(root);
});

test('style slot wins and className is rejected', async () => {
  const screen = await render(<Separator data-testid="separator" style={styles.override} />);
  const separator = screen.getByTestId('separator').element();
  expect(separator.clientWidth).toBe((separator.parentElement?.clientWidth ?? 0) / 2);
  expectTypeOf<SeparatorProps>().not.toHaveProperty('className');
  expectTypeOf<SeparatorProps>().toHaveProperty('render');
  expectTypeOf<SeparatorProps>().toHaveProperty('style');
});
