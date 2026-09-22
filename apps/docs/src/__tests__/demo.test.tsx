import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
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
