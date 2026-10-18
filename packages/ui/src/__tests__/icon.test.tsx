import * as stylex from '@stylexjs/stylex';
import { text } from '@ultima/tokens/tokens.stylex';
import { createRef } from 'react';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { Button, Icon, type IconProps } from '@ultima/ui';

/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: no axes, so one shape; with no props it is an empty `span`, and a
 *    single element child becomes the rendered element.
 * 2. The name resolves: decorative by default, `aria-hidden`; given `aria-label` it is `role="img"`
 *    named by that label.
 * 3. The focus ring lands where the contract says: on nothing; Icon never takes focus.
 * 4. The primitive is still wired: `useRender` carries `render` and `ref`, and a single element child
 *    takes the same path as `render`, with no wrapper.
 * 5. Documented state drives its style: none. Icon has no data-* state of its own.
 * 6. Typecheck passes: className is rejected and the style slot is accepted; no axis unions.
 * 7. Behavior this component wires itself: a `strokeWidth` of 1.5 by default on an icon element, which
 *    the icon's own `strokeWidth` overrides and a plain host element never gets.
 * 8. CSS the primitive reads: no primitive; the contract's own declarations are the `1em` box that
 *    beats a set's width and height attributes, and `flex-shrink: 0`. `data-ult-icon` is what lets
 *    Button trim its padding for an icon that is not an `<svg>`.
 */

const styles = stylex.create({
  large: { fontSize: text['--ult-text-9'] },
  narrow: { display: 'flex', inlineSize: '8px' },
});

/** An icon set's component as the sets write it: a fixed 24px box, or no size at all. */
function Fixed(props: React.ComponentProps<'svg'>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M12 5v14" />
    </svg>
  );
}

/** Drawn the way Lucide draws: a 2px stroke unless the caller passes `strokeWidth`. */
function Stroked({ strokeWidth = 2, ...props }: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} {...props}>
      <path d="M12 5v14" />
    </svg>
  );
}

function Unsized(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M12 5v14" />
    </svg>
  );
}

test('with no props it renders an empty span', async () => {
  const screen = await render(<Icon data-testid="icon" />);
  const icon = screen.getByTestId('icon').element();
  expect(icon.tagName).toBe('SPAN');
  expect(icon.className).not.toBe('');
});

test('a single element child is the rendered element, with no wrapper', async () => {
  const screen = await render(
    <Button>
      <Icon data-testid="icon">
        <Fixed />
      </Icon>
      Download
    </Button>,
  );
  const icon = screen.getByTestId('icon').element();
  expect(icon.tagName.toLowerCase()).toBe('svg');
  expect(icon.parentElement?.tagName).toBe('BUTTON');
  expect(icon).toHaveAttribute('data-ult-icon');
});

test('render takes the same path as an element child', async () => {
  const ref = createRef<HTMLElement>();
  const screen = await render(<Icon data-testid="icon" ref={ref} render={<Fixed />} />);
  const icon = screen.getByTestId('icon').element();
  expect(icon.tagName.toLowerCase()).toBe('svg');
  expect(ref.current).toBe(icon);
});

test('text children, such as an icon font ligature, render inside the span', async () => {
  const screen = await render(<Icon data-testid="icon">home</Icon>);
  const icon = screen.getByTestId('icon').element();
  expect(icon.tagName).toBe('SPAN');
  expect(icon.textContent).toBe('home');
});

test('an icon is decorative unless it is named', async () => {
  const screen = await render(
    <>
      <Icon data-testid="decorative">
        <Fixed />
      </Icon>
      <Icon aria-label="Synced">
        <Fixed />
      </Icon>
    </>,
  );
  const decorative = screen.getByTestId('decorative').element();
  expect(decorative).toHaveAttribute('aria-hidden', 'true');
  expect(decorative).not.toHaveAttribute('role');
  const named = screen.getByRole('img', { name: 'Synced' });
  await expect.element(named).toBeVisible();
  expect(named.element()).not.toHaveAttribute('aria-hidden');
});

test('an icon never enters the tab order', async () => {
  const screen = await render(
    <>
      <Icon aria-label="Synced">
        <Fixed />
      </Icon>
      <button type="button">After</button>
    </>,
  );
  await userEvent.tab();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }).element());
});

test('every set sizes to 1em of the text around it, whatever it wrote on its svg', async () => {
  const screen = await render(
    <Button size="lg">
      <Icon data-testid="fixed">
        <Fixed />
      </Icon>
      <Icon data-testid="unsized">
        <Unsized />
      </Icon>
      Download
    </Button>,
  );
  const button = screen.getByRole('button', { name: 'Download' }).element();
  const em = parseFloat(getComputedStyle(button).fontSize);
  for (const id of ['fixed', 'unsized']) {
    const box = screen.getByTestId(id).element().getBoundingClientRect();
    expect(box.width).toBeCloseTo(em, 1);
    expect(box.height).toBeCloseTo(em, 1);
  }
});

test('the style slot changes the size, and a narrow parent never shrinks it', async () => {
  const screen = await render(
    <>
      <Icon data-testid="large" style={styles.large}>
        <Fixed />
      </Icon>
      <div {...stylex.props(styles.narrow)}>
        <Icon data-testid="squeezed">
          <Fixed />
        </Icon>
        <span>Label that wants the room</span>
      </div>
    </>,
  );
  const large = screen.getByTestId('large').element();
  expect(large.getBoundingClientRect().width).toBeCloseTo(parseFloat(getComputedStyle(large).fontSize), 1);
  const squeezed = screen.getByTestId('squeezed').element();
  expect(getComputedStyle(squeezed).flexShrink).toBe('0');
  expect(squeezed.getBoundingClientRect().width).toBeCloseTo(parseFloat(getComputedStyle(squeezed).fontSize), 1);
});

test('a Button trims its padding for an Icon that is not an svg', async () => {
  const screen = await render(
    <>
      <Button>Plain</Button>
      <Button>
        <Icon>★</Icon>
        Starred
      </Button>
    </>,
  );
  const plain = getComputedStyle(screen.getByRole('button', { name: 'Plain' }).element());
  const withIcon = getComputedStyle(screen.getByRole('button', { name: 'Starred' }).element());
  expect(parseFloat(withIcon.paddingInlineStart)).toBeLessThan(parseFloat(plain.paddingInlineStart));
});

test('a stroked set draws at 1.5 unless the icon names its own stroke', async () => {
  const screen = await render(
    <>
      <Icon data-testid="default">
        <Stroked />
      </Icon>
      <Icon data-testid="own">
        <Stroked strokeWidth={3} />
      </Icon>
      <Icon data-testid="font" render={<span />}>
        home
      </Icon>
    </>,
  );
  expect(screen.getByTestId('default').element()).toHaveAttribute('stroke-width', '1.5');
  expect(screen.getByTestId('own').element()).toHaveAttribute('stroke-width', '3');
  expect(screen.getByTestId('font').element()).not.toHaveAttribute('stroke-width');
});

test('className is rejected and the style slot is accepted', () => {
  expectTypeOf<IconProps>().not.toHaveProperty('className');
  expectTypeOf<IconProps>().toHaveProperty('style');
});
