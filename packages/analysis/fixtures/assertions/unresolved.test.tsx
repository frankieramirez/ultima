import { expect, test } from 'vitest';

function expectPaint(element: Element, expected: string) {
  expect(getComputedStyle(element).backgroundColor).toBe(expected);
}

test('values the checker cannot follow', () => {
  const button = document.body;
  let resting = getComputedStyle(button).color;
  button.setAttribute('data-pressed', '');
  expect(getComputedStyle(button).color).not.toBe(resting);
  resting = getComputedStyle(button).color;
  const side = button.dataset.side ?? 'Top';
  expect(getComputedStyle(button)[`border${side}Width` as 'color']).toBe('#3366ff');
  expectPaint(button, getComputedStyle(button).color);
  let style = getComputedStyle(button);
  expect(style.color).toBe('rgb(253, 253, 253)');
  style = getComputedStyle(document.documentElement);
  let fill = getComputedStyle(button).backgroundColor;
  expect(fill).toBe('#151515');
  const { ...rest } = getComputedStyle(button);
  expect(rest).toEqual({ color: '#151515' });
});
