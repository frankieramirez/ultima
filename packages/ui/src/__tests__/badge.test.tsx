import { createRef } from 'react';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { Badge, type BadgeProps, type BadgeTone, type BadgeVariant } from '@ultima/ui';

const variants = ['subtle', 'solid'] as const satisfies readonly BadgeVariant[];
const tones = ['neutral', 'accent', 'highlight', 'success', 'warning', 'danger'] as const satisfies readonly BadgeTone[];

/** `data-style-src` is StyleX's development source marker, not a component state. */
function stateAttributes(element: Element) {
  return element.getAttributeNames().filter((name) => name.startsWith('data-') && name !== 'data-style-src');
}

test('every variant by tone cell mounts', async () => {
  const screen = await render(
    <>
      {variants.map((variant) =>
        tones.map((tone) => (
          <Badge key={`${variant} ${tone}`} variant={variant} tone={tone}>
            {`${variant} ${tone}`}
          </Badge>
        )),
      )}
    </>,
  );
  for (const variant of variants) {
    for (const tone of tones) {
      await expect.element(screen.getByText(`${variant} ${tone}`)).toBeVisible();
    }
  }
});

test('no props is the subtle variant in the neutral tone', async () => {
  const screen = await render(
    <>
      <Badge>implicit</Badge>
      <Badge variant="subtle" tone="neutral">
        explicit
      </Badge>
      <Badge variant="solid" tone="accent">
        other
      </Badge>
    </>,
  );
  const implicit = screen.getByText('implicit').element();
  expect(implicit.className).not.toBe('');
  expect(implicit.className).toBe(screen.getByText('explicit').element().className);
  expect(implicit.className).not.toBe(screen.getByText('other').element().className);
});

test('the badge is a span queryable by its text', async () => {
  const screen = await render(<Badge tone="success">Passing</Badge>);
  const badge = screen.getByText('Passing').element();
  expect(badge.tagName).toBe('SPAN');
  await expect.element(screen.getByText('Passing')).toBeVisible();
});

test('tabbing past a badge focuses nothing inside it', async () => {
  const screen = await render(
    <div data-testid="wrap">
      <Badge>Static</Badge>
    </div>,
  );
  const wrap = screen.getByTestId('wrap').element();
  await userEvent.tab();
  expect(wrap.contains(document.activeElement)).toBe(false);
  expect(getComputedStyle(wrap.firstElementChild as Element).outlineStyle).toBe('none');
});

test('render and ref reach the badge element', async () => {
  const ref = createRef<HTMLElement>();
  const screen = await render(
    <Badge ref={ref} tone="danger" render={<em data-custom="yes" />}>
      Failing
    </Badge>,
  );
  const badge = screen.getByText('Failing').element();
  expect(badge.tagName).toBe('EM');
  expect(ref.current).toBe(badge);
  expect(badge).toHaveAttribute('data-custom', 'yes');
});

test('the badge carries no state: no data attributes, and hover changes nothing', async () => {
  const screen = await render(<Badge>Static</Badge>);
  const badge = screen.getByText('Static').element();
  expect(stateAttributes(badge)).toEqual([]);
  const before = getComputedStyle(badge).backgroundColor;
  await userEvent.hover(badge);
  expect(getComputedStyle(badge).backgroundColor).toBe(before);
});

test('public prop types expose the two axes and no className', () => {
  expectTypeOf<BadgeVariant>().toEqualTypeOf<'subtle' | 'solid'>();
  expectTypeOf<BadgeTone>().toEqualTypeOf<'neutral' | 'accent' | 'highlight' | 'success' | 'warning' | 'danger'>();
  expectTypeOf<BadgeProps>().not.toHaveProperty('className');
  expectTypeOf<BadgeProps>().toHaveProperty('render');
  expectTypeOf<BadgeProps>().toHaveProperty('style');
});
