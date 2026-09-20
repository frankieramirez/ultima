import { createRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import { radius } from '@ultima/tokens/tokens.stylex';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { AspectRatio, type AspectRatioProps } from '@ultima/ui';

/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: no axes, so one shape; `ratio` is a required value prop, not an axis.
 * 2. The name resolves: none. The frame has no role and no name; the media inside carries `alt` or is
 *    decorative.
 * 3. The focus ring lands where the contract says: on nothing; the one part renders none.
 * 4. The primitive is still wired: `useRender` carries `render` and `ref`, so a `<figure>` is a
 *    `render` away.
 * 5. Documented state drives its style: none. Aspect Ratio has no data-* state of its own.
 * 6. Typecheck passes: `ratio` is required, className is rejected, and the style slot is accepted.
 * 7. Behavior this component wires itself: none; the file's one runtime declaration is a style, not
 *    a behavior.
 * 8. CSS the primitive reads: no primitive; the contract's own declarations are the `overflow: hidden`
 *    clip and the inline `aspect-ratio` the `ratio` prop writes, which the style slot cannot beat.
 */

const styles = stylex.create({
  wide: { inlineSize: '320px' },
  half: { inlineSize: '50%' },
  rounded: { borderRadius: radius['--ult-radius-lg'] },
  square: { aspectRatio: '1' },
});

test('the ratio prop writes the one inline declaration and the box holds it', async () => {
  const screen = await render(
    <div {...stylex.props(styles.wide)}>
      <AspectRatio data-testid="frame" ratio={2} />
    </div>,
  );
  const frame = screen.getByTestId('frame').element();
  expect(frame.tagName).toBe('DIV');
  expect(getComputedStyle(frame).aspectRatio).toBe('2 / 1');
  const box = frame.getBoundingClientRect();
  expect(box.height).toBeCloseTo(box.width / 2, 0);
});

test('the frame has no role and names nothing; the media inside carries its own name', async () => {
  const screen = await render(
    <AspectRatio ratio={1} data-testid="frame">
      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E" alt="Portrait" />
    </AspectRatio>,
  );
  const frame = screen.getByTestId('frame').element();
  expect(frame).not.toHaveAttribute('role');
  await expect.element(screen.getByRole('img', { name: 'Portrait' })).toBeVisible();
});

test('a decorative frame clips its media to the caller’s radius', async () => {
  const screen = await render(
    <AspectRatio ratio={1} data-testid="frame" style={styles.rounded}>
      <img
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"
        alt=""
        width="400"
        height="600"
      />
    </AspectRatio>,
  );
  const frame = screen.getByTestId('frame').element();
  expect(getComputedStyle(frame).overflow).toBe('hidden');
  expect(getComputedStyle(frame).borderRadius).not.toBe('0px');
});

test('the frame is static and never enters the tab order', async () => {
  const screen = await render(
    <>
      <AspectRatio ratio={1} data-testid="frame" />
      <button type="button">After</button>
    </>,
  );
  const frame = screen.getByTestId('frame').element();
  await userEvent.tab();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }).element());
  expect(getComputedStyle(frame).outlineStyle).toBe('none');
});

test('render and ref reach the root element', async () => {
  const ref = createRef<HTMLDivElement>();
  const screen = await render(<AspectRatio ratio={1} ref={ref} render={<figure data-testid="frame" />} />);
  const frame = screen.getByTestId('frame').element();
  expect(frame.tagName).toBe('FIGURE');
  expect(ref.current).toBe(frame);
});

test('the style slot sizes the box and loses only to the inline ratio', async () => {
  const screen = await render(
    <>
      <AspectRatio data-testid="half" ratio={1} style={styles.half} />
      <AspectRatio data-testid="overridden" ratio={2} style={styles.square} />
    </>,
  );
  const half = screen.getByTestId('half').element();
  expect(half.clientWidth).toBe((half.parentElement?.clientWidth ?? 0) / 2);
  const overridden = screen.getByTestId('overridden').element();
  expect(getComputedStyle(overridden).aspectRatio).toBe('2 / 1');
});

test('public prop types require ratio, expose the style slot, and reject className', () => {
  expectTypeOf<AspectRatioProps['ratio']>().toEqualTypeOf<number>();
  expectTypeOf<AspectRatioProps>().not.toHaveProperty('className');
  expectTypeOf<AspectRatioProps>().toHaveProperty('style');
  expectTypeOf<AspectRatioProps>().toHaveProperty('render');
  expectTypeOf<AspectRatioProps>().not.toHaveProperty('variant');
  expectTypeOf<AspectRatioProps>().not.toHaveProperty('tone');
  expectTypeOf<AspectRatioProps>().not.toHaveProperty('size');
});
