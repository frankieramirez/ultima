import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { Skeleton, type SkeletonProps } from '@ultima/ui';

import { reducedMotionRules } from './reduced-motion';

/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: no axes, so one shape, and no props is the whole component.
 * 2. The name resolves: none. The root is aria-hidden, so it is absent from the accessibility tree.
 * 3. The focus ring lands where the contract says: on nothing; the one part renders none.
 * 4. The primitive is still wired: none. Skeleton is plain, with no Base UI primitive underneath.
 * 5. Documented state drives its style: none. Skeleton has no data-* state of its own.
 * 6. Typecheck passes: className is rejected, style is accepted, and there is no axis to pin.
 * 7. Behavior this component wires itself: none, because every interaction is the primitive's, which
 *    is item 4, or a style reacting to a data-* attribute, which is items 5 and 8.
 * 8. CSS the primitive reads: the pulse animation-name split, not `none` by default and `none` under
 *    prefers-reduced-motion, plus the size the style slot has to be able to override.
 */

const sizes = stylex.create({ tall: { height: space['--ult-space-11'] } });

test('a skeleton with no props paints a sized placeholder', async () => {
  const screen = await render(<Skeleton data-testid="line" />);
  await expect.element(screen.getByTestId('line')).toBeVisible();
  const line = screen.getByTestId('line').element();
  expect(line.tagName).toBe('DIV');
  expect(line.className).not.toBe('');
  const box = line.getBoundingClientRect();
  expect(box.height).toBeGreaterThan(0);
  expect(box.width).toBeGreaterThan(0);
});

test('the root is hidden from the accessibility tree and names nothing', async () => {
  const screen = await render(
    <div>
      <Skeleton data-testid="line" aria-label="ignored" />
    </div>,
  );
  const line = screen.getByTestId('line').element();
  expect(line).toHaveAttribute('aria-hidden', 'true');
  expect(line).not.toHaveAttribute('role');
  expect(screen.container.querySelector('[role="status"], [role="alert"], [role="progressbar"]')).toBeNull();
});

test('nothing in a skeleton takes focus, and it renders no ring', async () => {
  const screen = await render(
    <>
      <Skeleton data-testid="line" />
      <button type="button">After</button>
    </>,
  );
  await expect.element(screen.getByTestId('line')).toBeVisible();
  const line = screen.getByTestId('line').element();
  await userEvent.tab();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }).element());
  expect(line.contains(document.activeElement)).toBe(false);
  expect(getComputedStyle(line).outlineStyle).toBe('none');
});

test('the style slot sizes the placeholder and wins over the default', async () => {
  const screen = await render(
    <>
      <Skeleton data-testid="default" />
      <Skeleton data-testid="tall" style={sizes.tall} />
    </>,
  );
  await expect.element(screen.getByTestId('tall')).toBeVisible();
  const fallback = screen.getByTestId('default').element().getBoundingClientRect();
  const tall = screen.getByTestId('tall').element().getBoundingClientRect();
  expect(tall.height).toBeGreaterThan(fallback.height);
});

test('the pulse loops by default and reduced motion turns it off by name', async () => {
  const screen = await render(<Skeleton data-testid="line" />);
  await expect.element(screen.getByTestId('line')).toBeVisible();
  const line = screen.getByTestId('line').element();
  const computed = getComputedStyle(line);
  expect(computed.animationName).not.toBe('none');
  expect(computed.animationIterationCount).toBe('infinite');
  expect(parseFloat(computed.animationDuration)).toBeGreaterThan(0);

  const stopped = reducedMotionRules('animation-name').filter((rule) => line.matches(rule.selectorText));
  expect(stopped.length).toBeGreaterThan(0);
  for (const rule of stopped) expect(rule.style.getPropertyValue('animation-name')).toBe('none');
});

test('public prop types expose the style slot and no className', () => {
  expectTypeOf<SkeletonProps>().not.toHaveProperty('className');
  expectTypeOf<SkeletonProps>().toHaveProperty('style');
  expectTypeOf<SkeletonProps>().not.toHaveProperty('tone');
  expectTypeOf<SkeletonProps>().not.toHaveProperty('variant');
  expectTypeOf<SkeletonProps>().not.toHaveProperty('size');
});
