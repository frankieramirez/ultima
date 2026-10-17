import { expect, test } from 'vitest';

import { TRANSPARENT, tokenValue } from './token-value';

const RECOLOURED = 'rgb(12, 34, 56)';
const read = (element: Element, name = '--ult-color-surface') => getComputedStyle(element).getPropertyValue(name).trim();

test('compares computed values, never a palette literal', () => {
  const button = document.body;
  // Before and after a documented state change.
  const before = getComputedStyle(button).backgroundColor;
  button.setAttribute('data-pressed', '');
  expect(getComputedStyle(button).backgroundColor).not.toBe(before);
  // The installed token, read through a probe.
  expect(getComputedStyle(button).color).toBe(tokenValue('color', 'var(--ult-color-text)'));
  // Paint that draws nothing is not a palette value.
  expect(getComputedStyle(button).borderTopColor).toBe('rgba(0, 0, 0, 0)');
  expect(getComputedStyle(button).outlineColor).toBe(TRANSPARENT);
  // A literal the test installs as an override, compared through the computed result.
  button.style.setProperty('--ult-color-accent', RECOLOURED);
  expect(getComputedStyle(button).backgroundColor).not.toBe(before);
  // A token's own value, which the test itself installed.
  expect(read(button)).toBe('#010203');
  // Hex text that is not a computed color.
  expect((button as unknown as HTMLInputElement).value).toBe('#ffaa00');
  expect(['#3021', '#3019']).toEqual(['#3021', '#3019']);
  // A non-paint property.
  expect(getComputedStyle(button).outlineStyle).toBe('none');
  // An SVG paint server reference names an element, not a color.
  expect(getComputedStyle(button).fill).toBe('url("#fade")');
  // A let-held or destructured computed style compared on a non-paint property, or with a computed value.
  let computed = getComputedStyle(button);
  expect(computed.visibility).toBe('hidden');
  computed = getComputedStyle(document.documentElement);
  expect(computed.color).not.toBe(before);
  const { display, color } = getComputedStyle(button);
  expect(display).toBe('block');
  expect(color).toBe(tokenValue('color', 'var(--ult-color-text)'));
});
