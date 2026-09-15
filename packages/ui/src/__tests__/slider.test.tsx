import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import * as stylex from '@stylexjs/stylex';
import {
  Slider,
  type SliderControlProps,
  type SliderIndicatorProps,
  type SliderLabelProps,
  type SliderRootProps,
  type SliderThumbProps,
  type SliderTrackProps,
  type SliderValueProps,
} from '@ultima/ui';

/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: no axes, so the one combination is the component itself, single
 *    thumb and range, the parts carry the same classes with no props as with every prop passed, and
 *    the style slot reaches the unstyled Root.
 * 2. The name resolves: role slider on the nested range input, named by Slider.Label, or by a
 *    per-thumb aria-label in a range.
 * 3. The focus ring lands where the contract says: on Thumb, via :has(:focus-visible); Root,
 *    Control, Track, and Indicator render none.
 * 4. The primitive is still wired: arrows step, Shift+arrow takes largeStep, Home and End reach the
 *    bounds, and the indicator's inline width tracks the value.
 * 5. Documented state drives its style: data-orientation flips the track's cross axis, data-dragging
 *    raises the thumb, and data-disabled dims the control.
 * 6. Typecheck passes: className is rejected on every part, and no part takes a tone.
 * 7. Behavior this component wires itself: none, because every interaction is the primitive's, which
 *    is item 4, or a style reacting to a data-* attribute, which is items 5 and 8.
 * 8. CSS the primitive reads: Control's touch-action and user-select, which a touch drag needs, and
 *    Track's explicit cross-axis size, which the indicator inherits.
 */

function Volume({ name = 'Volume', ...props }: { name?: string } & Partial<SliderRootTestProps>) {
  return (
    <Slider.Root defaultValue={40} {...props}>
      <Slider.Label>{name}</Slider.Label>
      <Slider.Value />
      <Slider.Control data-testid="control">
        <Slider.Track>
          <Slider.Indicator />
          <Slider.Thumb />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}

type SliderRootTestProps = Pick<SliderRootProps, 'style'> & {
  defaultValue: number;
  format: Intl.NumberFormatOptions;
  disabled: boolean;
  orientation: 'horizontal' | 'vertical';
  step: number;
  largeStep: number;
  min: number;
  max: number;
};

const slotted = stylex.create({ root: { display: 'grid' } });

const groupOf = (thumb: Element) => thumb.closest('[role="group"]') as HTMLElement;
const controlOf = (group: Element) => group.querySelector('[data-testid="control"]') as HTMLElement;
const trackOf = (group: Element) => controlOf(group).firstElementChild as HTMLElement;
const indicatorOf = (group: Element) => trackOf(group).firstElementChild as HTMLElement;
const thumbOf = (group: Element, index = 0) => trackOf(group).children[index + 1] as HTMLElement;

test('a slider renders with one thumb, and with one thumb per value', async () => {
  const screen = await render(
    <>
      <Volume name="Volume" />
      <Slider.Root defaultValue={[25, 75]}>
        <Slider.Label>Price range</Slider.Label>
        <Slider.Control data-testid="control">
          <Slider.Track>
            <Slider.Indicator />
            <Slider.Thumb index={0} aria-label="Lowest price" />
            <Slider.Thumb index={1} aria-label="Highest price" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </>,
  );
  await expect.element(screen.getByRole('slider', { name: 'Volume' })).toBeVisible();
  await expect.element(screen.getByRole('slider', { name: 'Lowest price' })).toBeVisible();
  await expect.element(screen.getByRole('slider', { name: 'Highest price' })).toBeVisible();
});

test('the style slot reaches every part, including the root that carries no Ultima styles', async () => {
  const screen = await render(
    <>
      <Volume name="plain" />
      <Volume name="styled" style={slotted.root} />
    </>,
  );
  const plain = groupOf(screen.getByRole('slider', { name: 'plain' }).element());
  const styled = groupOf(screen.getByRole('slider', { name: 'styled' }).element());

  expect(getComputedStyle(plain).display).not.toBe('grid');
  expect(getComputedStyle(styled).display).toBe('grid');
});

test('passing the pass-through props explicitly styles the parts the same as omitting them', async () => {
  const screen = await render(
    <>
      <Volume name="implicit" />
      <Volume name="explicit" min={0} max={100} step={1} largeStep={10} orientation="horizontal" />
    </>,
  );
  const implicit = groupOf(screen.getByRole('slider', { name: 'implicit' }).element());
  const explicit = groupOf(screen.getByRole('slider', { name: 'explicit' }).element());

  for (const part of [controlOf, trackOf, indicatorOf] as const) {
    expect(part(implicit).className).not.toBe('');
    expect(part(implicit).className).toBe(part(explicit).className);
  }
  expect(thumbOf(implicit).className).toBe(thumbOf(explicit).className);
});

test('Slider.Label names the thumb, and a range names each thumb apart', async () => {
  const screen = await render(
    <>
      <Volume name="Volume" />
      <Slider.Root defaultValue={[25, 75]}>
        <Slider.Label>Price range</Slider.Label>
        <Slider.Control data-testid="control">
          <Slider.Track>
            <Slider.Indicator />
            <Slider.Thumb index={0} aria-label="Lowest price" />
            <Slider.Thumb index={1} aria-label="Highest price" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </>,
  );
  expect(screen.getByRole('slider', { name: 'Volume' }).element()).toHaveAttribute('aria-labelledby');
  expect(screen.getByRole('slider', { name: 'Lowest price' }).element()).toHaveAttribute(
    'aria-label',
    'Lowest price',
  );
  expect(groupOf(screen.getByRole('slider', { name: 'Volume' }).element())).toHaveAttribute('role', 'group');
});

test('the thumb shows the ring on keyboard focus, and no other part renders one', async () => {
  const screen = await render(
    <>
      <button type="button">Before</button>
      <Volume />
    </>,
  );
  const group = groupOf(screen.getByRole('slider').element());
  const thumb = thumbOf(group);

  expect(getComputedStyle(thumb).outlineStyle).toBe('none');
  await userEvent.click(screen.getByRole('button', { name: 'Before' }));
  await userEvent.tab();
  expect(document.activeElement).toBe(screen.getByRole('slider').element());
  expect(getComputedStyle(thumb).outlineStyle).not.toBe('none');
  expect(parseFloat(getComputedStyle(thumb).outlineWidth)).toBeGreaterThan(0);

  for (const part of [group, controlOf(group), trackOf(group), indicatorOf(group)]) {
    expect(getComputedStyle(part).outlineStyle).toBe('none');
  }
});

test('the keyboard Base UI owns still moves the value', async () => {
  const screen = await render(
    <>
      <button type="button">Before</button>
      <Volume step={1} largeStep={10} />
    </>,
  );
  const input = screen.getByRole('slider').element();
  await userEvent.click(screen.getByRole('button', { name: 'Before' }));
  await userEvent.tab();

  await userEvent.keyboard('{ArrowRight}');
  expect(input).toHaveAttribute('aria-valuenow', '41');
  await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}');
  expect(input).toHaveAttribute('aria-valuenow', '51');
  await userEvent.keyboard('{PageDown}');
  expect(input).toHaveAttribute('aria-valuenow', '41');
  await userEvent.keyboard('{Home}');
  expect(input).toHaveAttribute('aria-valuenow', '0');
  await userEvent.keyboard('{End}');
  expect(input).toHaveAttribute('aria-valuenow', '100');
});

test('the indicator fills the share of the track the value names', async () => {
  const screen = await render(<Volume />);
  await expect.element(screen.getByRole('slider')).toBeVisible();
  const group = groupOf(screen.getByRole('slider').element());

  expect(indicatorOf(group).getBoundingClientRect().width).toBeCloseTo(
    trackOf(group).getBoundingClientRect().width * 0.4,
    1,
  );
});

test('the value is an output that does not announce, and the thumb speaks the formatted number', async () => {
  const screen = await render(<Volume format={{ style: 'percent' }} />);
  await expect.element(screen.getByRole('slider')).toBeVisible();
  const output = groupOf(screen.getByRole('slider').element()).querySelector('output') as HTMLElement;

  expect(output).toHaveAttribute('aria-live', 'off');
  expect(output).toHaveAttribute('for');
  expect(output.textContent).not.toBe('');
  expect(screen.getByRole('slider').element()).toHaveAttribute('aria-valuetext', output.textContent);
});

test('data-orientation swaps which axis the track sizes', async () => {
  const screen = await render(
    <>
      <Volume name="across" />
      <Volume name="up" orientation="vertical" />
    </>,
  );
  const across = trackOf(groupOf(screen.getByRole('slider', { name: 'across' }).element()));
  const up = trackOf(groupOf(screen.getByRole('slider', { name: 'up' }).element()));

  expect(across).toHaveAttribute('data-orientation', 'horizontal');
  expect(up).toHaveAttribute('data-orientation', 'vertical');
  expect(getComputedStyle(across).height).not.toBe(getComputedStyle(up).height);
  expect(getComputedStyle(across).width).not.toBe(getComputedStyle(up).width);
});

test('data-disabled dims the control, and data-dragging raises the thumb', async () => {
  const screen = await render(
    <>
      <Volume name="live" />
      <Volume name="locked" disabled />
    </>,
  );
  const live = groupOf(screen.getByRole('slider', { name: 'live' }).element());
  const locked = groupOf(screen.getByRole('slider', { name: 'locked' }).element());

  expect(controlOf(locked)).toHaveAttribute('data-disabled');
  expect(parseFloat(getComputedStyle(controlOf(locked)).opacity)).toBeLessThan(
    parseFloat(getComputedStyle(controlOf(live)).opacity),
  );

  const thumb = thumbOf(live);
  const resting = getComputedStyle(thumb).boxShadow;
  thumb.setAttribute('data-dragging', '');
  expect(getComputedStyle(thumb).boxShadow).not.toBe(resting);
});

test('the control refuses the gestures that would scroll or select instead of dragging', async () => {
  const screen = await render(<Volume />);
  await expect.element(screen.getByRole('slider')).toBeVisible();
  const control = getComputedStyle(controlOf(groupOf(screen.getByRole('slider').element())));

  expect(control.touchAction).toBe('none');
  expect(control.userSelect).toBe('none');
});

test('the track has the cross-axis size the indicator inherits', async () => {
  const screen = await render(<Volume />);
  await expect.element(screen.getByRole('slider')).toBeVisible();
  const group = groupOf(screen.getByRole('slider').element());

  expect(parseFloat(getComputedStyle(trackOf(group)).height)).toBeGreaterThan(0);
  expect(indicatorOf(group).getBoundingClientRect().height).toBeCloseTo(
    trackOf(group).getBoundingClientRect().height,
    1,
  );
});

test('public prop types expose only the style slot, and no axis', () => {
  expectTypeOf<SliderRootProps>().not.toHaveProperty('className');
  expectTypeOf<SliderLabelProps>().not.toHaveProperty('className');
  expectTypeOf<SliderValueProps>().not.toHaveProperty('className');
  expectTypeOf<SliderControlProps>().not.toHaveProperty('className');
  expectTypeOf<SliderTrackProps>().not.toHaveProperty('className');
  expectTypeOf<SliderIndicatorProps>().not.toHaveProperty('className');
  expectTypeOf<SliderThumbProps>().not.toHaveProperty('className');

  expectTypeOf<SliderRootProps>().toHaveProperty('style');
  expectTypeOf<SliderControlProps>().toHaveProperty('style');
  expectTypeOf<SliderThumbProps>().toHaveProperty('style');
  expectTypeOf<SliderThumbProps>().toHaveProperty('index');

  expectTypeOf<SliderRootProps>().not.toHaveProperty('tone');
  expectTypeOf<SliderLabelProps>().not.toHaveProperty('tone');
  expectTypeOf<SliderIndicatorProps>().not.toHaveProperty('tone');
  expectTypeOf<SliderThumbProps>().not.toHaveProperty('tone');
  expectTypeOf<SliderControlProps>().not.toHaveProperty('variant');
  expectTypeOf<SliderControlProps>().not.toHaveProperty('size');
});
