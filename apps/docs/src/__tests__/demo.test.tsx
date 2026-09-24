import { expect, onTestFinished, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { Demo } from '../demo';

function Example() {
  return <span>live</span>;
}

const SHORT = ['export default function Example() {', '  return null;', '}'].join('\n');
const LONG = Array.from({ length: 20 }, (_, index) => `const line${index} = ${index};`).join('\n');

test('a short source is shown whole with no disclosure', async () => {
  const screen = await render(<Demo component={Example} source={SHORT} />);
  expect(screen.container.querySelector('pre')?.textContent).toBe(SHORT);
  expect(screen.container.querySelector('[aria-expanded]')).toBeNull();
  await expect.element(screen.getByRole('button', { name: 'Copy example source' })).toBeVisible();
});

test('a long source rests as a teaser and the whole block expands it in place', async () => {
  const screen = await render(<Demo component={Example} source={LONG} />);
  const pre = screen.container.querySelector('pre')!;
  const source = pre.parentElement!;
  const clipped = () => source.getBoundingClientRect().height < pre.getBoundingClientRect().height;
  expect(pre.textContent).toBe(LONG);
  expect(clipped()).toBe(true);

  const show = screen.getByRole('button', { name: 'Show code' });
  await expect.element(show).toHaveAttribute('aria-expanded', 'false');
  expect(show.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(
    source.getBoundingClientRect().height - 1,
  );

  await userEvent.click(show);
  await expect
    .element(screen.getByRole('button', { name: 'Hide code' }))
    .toHaveAttribute('aria-expanded', 'true');
  expect(clipped()).toBe(false);

  await userEvent.click(screen.getByRole('button', { name: 'Hide code' }));
  await expect.element(screen.getByRole('button', { name: 'Show code' })).toBeVisible();
  expect(clipped()).toBe(true);
});

test('the preview centers its content over a floor', async () => {
  const screen = await render(<Demo component={Example} source={SHORT} />);
  const figure = screen.container.querySelector('figure')!;
  const live = screen.getByText('live').element();
  const preview = live.parentElement!.parentElement!;
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  expect(preview.getBoundingClientRect().height).toBeGreaterThanOrEqual(8 * rem);
  const mid = (rect: DOMRect) => rect.left + rect.width / 2;
  expect(Math.abs(mid(live.getBoundingClientRect()) - mid(figure.getBoundingClientRect()))).toBeLessThan(2);
  expect(figure.querySelector('footer')).toBeNull();
});

test('copy is a 28px icon button in the code area top-right corner that swaps to a check', async () => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: () => Promise.resolve() },
  });
  const screen = await render(<Demo component={Example} source={LONG} />);
  const copy = screen.getByRole('button', { name: 'Copy example source' });
  const button = copy.element();
  const code = screen.container.querySelector('pre')!.parentElement!.getBoundingClientRect();
  const rect = button.getBoundingClientRect();
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);

  expect(rect.width).toBeCloseTo(1.75 * rem, 0);
  expect(rect.height).toBeCloseTo(1.75 * rem, 0);
  expect(rect.top - code.top).toBeCloseTo(0.5 * rem, 0);
  expect(code.right - rect.right).toBeCloseTo(0.5 * rem, 0);

  const glyph = () => button.querySelector('svg')?.outerHTML;
  const resting = glyph();
  await userEvent.click(copy);
  await expect.poll(() => screen.getByRole('status').element().textContent).toMatch(/Copied/);
  expect(glyph()).not.toBe(resting);
});

test('the figure keeps its structure at 390px', async () => {
  await page.viewport(390, 844);
  onTestFinished(() => page.viewport(1280, 720));

  const screen = await render(<Demo component={Example} source={LONG} />);
  const figure = screen.container.querySelector('figure')!;
  expect(getComputedStyle(figure).borderRadius).toBe('0px');
  expect(figure.querySelector('[role="separator"], hr')).not.toBeNull();
  await expect.element(screen.getByRole('button', { name: 'Show code' })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Copy example source' })).toBeVisible();
  expect(figure.scrollWidth).toBeLessThanOrEqual(figure.clientWidth);
});
