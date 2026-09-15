import * as stylex from '@stylexjs/stylex';
import { color, text } from '@ultima/tokens/tokens.stylex';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { Spinner, type SpinnerProps } from '@ultima/ui';

import { reducedMotionRules } from './reduced-motion';

/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: no axes and no tone, so one shape, and no props is the whole component.
 * 2. The name resolves: none. The root is aria-hidden, so it is absent from the accessibility tree.
 * 3. The focus ring lands where the contract says: on nothing; the one part renders none.
 * 4. The primitive is still wired: none. Spinner is plain, with no Base UI primitive underneath.
 * 5. Documented state drives its style: none. Spinner has no data-* state of its own.
 * 6. Typecheck passes: className is rejected, style is accepted, and there is no axis to pin.
 * 7. Behavior this component wires itself: none, because every interaction is the primitive's, which
 *    is item 4, or a style reacting to a data-* attribute, which is items 5 and 8.
 * 8. CSS the primitive reads: the rotation animation-name split, not `none` by default and `none`
 *    under prefers-reduced-motion, and the mark still occupying its box there.
 */

const styles = stylex.create({
  large: { fontSize: text['--ult-text-11'] },
  danger: { color: color['--ult-color-danger-text'] },
  success: { color: color['--ult-color-success-text'] },
});

test('a spinner with no props draws a square mark in CSS', async () => {
  const screen = await render(<Spinner data-testid="mark" />);
  await expect.element(screen.getByTestId('mark')).toBeVisible();
  const mark = screen.getByTestId('mark').element();
  expect(mark.tagName).toBe('DIV');
  expect(mark.children).toHaveLength(0);
  const box = mark.getBoundingClientRect();
  expect(box.height).toBeGreaterThan(0);
  expect(box.width).toBeCloseTo(box.height, 1);
  expect(parseFloat(getComputedStyle(mark).borderTopWidth)).toBeGreaterThan(0);
});

test('the root is hidden from the accessibility tree and is not a progress bar', async () => {
  const screen = await render(
    <div>
      <Spinner data-testid="mark" />
      <span>Loading footage</span>
    </div>,
  );
  const mark = screen.getByTestId('mark').element();
  expect(mark).toHaveAttribute('aria-hidden', 'true');
  expect(mark).not.toHaveAttribute('role');
  expect(screen.container.querySelector('[role="status"], [role="alert"], [role="progressbar"]')).toBeNull();
});

test('nothing in a spinner takes focus, and it renders no ring', async () => {
  const screen = await render(
    <>
      <Spinner data-testid="mark" />
      <button type="button">After</button>
    </>,
  );
  await expect.element(screen.getByTestId('mark')).toBeVisible();
  const mark = screen.getByTestId('mark').element();
  await userEvent.tab();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }).element());
  expect(mark.contains(document.activeElement)).toBe(false);
  expect(getComputedStyle(mark).outlineStyle).toBe('none');
});

test('the mark takes its color and its size from the text around it', async () => {
  const screen = await render(
    <>
      <div data-testid="danger-text" {...stylex.props(styles.danger)}>
        <Spinner data-testid="danger" />
      </div>
      <div data-testid="success-text" {...stylex.props(styles.success)}>
        <Spinner data-testid="success" />
      </div>
      <Spinner data-testid="scaled" style={styles.large} />
      <Spinner data-testid="default" />
    </>,
  );
  await expect.element(screen.getByTestId('scaled')).toBeVisible();

  for (const name of ['danger', 'success']) {
    const around = getComputedStyle(screen.getByTestId(`${name}-text`).element()).color;
    expect(getComputedStyle(screen.getByTestId(name).element()).borderRightColor).toBe(around);
  }
  expect(getComputedStyle(screen.getByTestId('danger').element()).borderRightColor).not.toBe(
    getComputedStyle(screen.getByTestId('success').element()).borderRightColor,
  );
  expect(screen.getByTestId('scaled').element().getBoundingClientRect().height).toBeGreaterThan(
    screen.getByTestId('default').element().getBoundingClientRect().height,
  );
});

test('the rotation loops by default and reduced motion turns it off by name', async () => {
  const screen = await render(<Spinner data-testid="mark" />);
  await expect.element(screen.getByTestId('mark')).toBeVisible();
  const mark = screen.getByTestId('mark').element();
  const computed = getComputedStyle(mark);
  expect(computed.animationName).not.toBe('none');
  expect(computed.animationIterationCount).toBe('infinite');
  expect(parseFloat(computed.animationDuration)).toBeGreaterThan(0);

  const stopped = reducedMotionRules('animation-name').filter((rule) => mark.matches(rule.selectorText));
  expect(stopped.length).toBeGreaterThan(0);
  for (const rule of stopped) expect(rule.style.getPropertyValue('animation-name')).toBe('none');
});

test('public prop types expose the style slot and no className', () => {
  expectTypeOf<SpinnerProps>().not.toHaveProperty('className');
  expectTypeOf<SpinnerProps>().toHaveProperty('style');
  expectTypeOf<SpinnerProps>().not.toHaveProperty('tone');
  expectTypeOf<SpinnerProps>().not.toHaveProperty('variant');
  expectTypeOf<SpinnerProps>().not.toHaveProperty('size');
});
