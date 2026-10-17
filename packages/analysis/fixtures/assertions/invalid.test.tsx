import { expect, test } from 'vitest';

import { ACCENT_HEX } from './palette-values';

const ACCENT = 'rgb(51, 102, 255)';
const PINNED = ACCENT;
const PALETTE = { surface: '#151515', ring: ['#3366ff'] };
const paint = (element: Element) => getComputedStyle(element).backgroundColor;

test('pins palette values', async () => {
  const button = document.body;
  const style = getComputedStyle(button);
  expect(style.backgroundColor).toBe('rgb(51, 102, 255)');
  expect(getComputedStyle(button).color).toBe('#3366ff');
  expect(style.borderTopColor).not.toBe(PINNED);
  expect(style.outlineColor).toEqual(PALETTE.ring[0]);
  expect(paint(button)).toBe(`rgb(${51}, 102, 255)`);
  await expect.poll(() => getComputedStyle(button).backgroundColor).toBe(PALETTE.surface);
  expect(style.getPropertyValue('border-top-color')).toBe('oklch(0.62 0.19 259)');
  expect(style.color).toBe(ACCENT_HEX);
  const { backgroundColor, borderTopColor: edge } = getComputedStyle(button);
  expect(backgroundColor).toBe('#151515');
  expect(edge).toBe(ACCENT);
  expect(style.backgroundColor).toBe('color(display-p3 1 0 0)');
});
