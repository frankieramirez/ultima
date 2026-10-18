import { createRef } from 'react';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { Badge, type BadgeProps, type BadgeTone, type BadgeVariant } from '@ultima/ui';
import { TRANSPARENT, declaredValues, tokenValue } from './token-value';

const variants = ['subtle', 'solid', 'outline'] as const satisfies readonly BadgeVariant[];
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

test('public prop types expose the two axes, the dot, and no className', () => {
  expectTypeOf<BadgeVariant>().toEqualTypeOf<'subtle' | 'solid' | 'outline'>();
  expectTypeOf<BadgeProps>().toHaveProperty('dot');
  expectTypeOf<BadgeTone>().toEqualTypeOf<'neutral' | 'accent' | 'highlight' | 'success' | 'warning' | 'danger'>();
  expectTypeOf<BadgeProps>().not.toHaveProperty('className');
  expectTypeOf<BadgeProps>().toHaveProperty('render');
  expectTypeOf<BadgeProps>().toHaveProperty('style');
});

test('the subtle variant is soft: a tinted fill with no edge, in every tone', async () => {
  const tones = ['neutral', 'accent', 'highlight', 'success', 'warning', 'danger'] as const;
  const screen = await render(<>{tones.map((tone) => <Badge key={tone} tone={tone}>{tone}</Badge>)}</>);
  for (const tone of tones) {
    const badge = getComputedStyle(screen.getByText(tone).element());
    expect(badge.borderTopColor, tone).toBe(TRANSPARENT);
    expect(badge.backgroundColor, tone).not.toBe(TRANSPARENT);
  }
});

test('the label is text step 2 with no added tracking, since a badge is not set in capitals', async () => {
  const screen = await render(<Badge>Beta</Badge>);
  const badge = getComputedStyle(screen.getByText('Beta').element());
  expect(badge.fontSize).toBe(tokenValue('font-size', 'var(--ult-text-2)'));
  expect(badge.letterSpacing).toBe('normal');
});

const roles = { accent: 'accent', highlight: 'highlight', success: 'success', warning: 'warning', danger: 'danger' } as const;

test("the outline variant draws only an edge: no fill, a decorative 0.5px line in the tone's border step", async () => {
  const screen = await render(<>{tones.map((tone) => <Badge key={tone} variant="outline" tone={tone}>{tone}</Badge>)}</>);
  for (const tone of tones) {
    const element = screen.getByText(tone).element();
    const badge = getComputedStyle(element);
    expect(badge.backgroundColor, tone).toBe(TRANSPARENT);
    expect(declaredValues(element, 'border-width').at(-1), tone).toBe('0.5px');
    const edge = tone === 'neutral' ? 'var(--ult-color-border)' : `var(--ult-color-${roles[tone]}-border)`;
    const ink = tone === 'neutral' ? 'var(--ult-color-text-muted)' : `var(--ult-color-${roles[tone]}-text)`;
    expect(badge.borderTopColor, tone).toBe(tokenValue('border-top-color', edge));
    expect(badge.color, tone).toBe(tokenValue('color', ink));
  }
});

test('every variant is the same size, since each one draws the same 0.5px border', async () => {
  const screen = await render(<>{variants.map((variant) => <Badge key={variant} variant={variant}>{variant}</Badge>)}</>);
  const heights = variants.map((variant) => screen.getByText(variant).element().getBoundingClientRect().height);
  expect(new Set(heights).size).toBe(1);
});

test("dot puts a decorative 6px dot before the label, in the tone's solid step on a tint or no fill", async () => {
  const screen = await render(
    <>
      <Badge tone="success" dot data-testid="subtle">Active</Badge>
      <Badge variant="outline" tone="danger" dot data-testid="outline">Failing</Badge>
      <Badge variant="outline" dot data-testid="neutral">Offline</Badge>
    </>,
  );
  const cases = [
    ['subtle', 'var(--ult-color-success)'],
    ['outline', 'var(--ult-color-danger)'],
    ['neutral', 'var(--ult-color-text-subtle)'],
  ] as const;
  for (const [id, fill] of cases) {
    const dot = screen.getByTestId(id).element().firstElementChild as HTMLElement;
    expect(dot.tagName, id).toBe('SPAN');
    expect(dot.getAttribute('aria-hidden'), id).toBe('true');
    expect(dot.textContent, id).toBe('');
    const style = getComputedStyle(dot);
    expect(style.width, id).toBe(tokenValue('width', 'var(--ult-space-3)'));
    expect(style.height, id).toBe(tokenValue('height', 'var(--ult-space-3)'));
    expect(style.backgroundColor, id).toBe(tokenValue('background-color', fill));
  }
  await expect.element(screen.getByText('Active')).toBeVisible();
});

test("on a solid fill the dot keeps the label's contrast ink, or it would vanish into the fill", async () => {
  const screen = await render(<Badge variant="solid" tone="success" dot data-testid="solid">Active</Badge>);
  const dot = screen.getByTestId('solid').element().firstElementChild as HTMLElement;
  expect(getComputedStyle(dot).backgroundColor).toBe(tokenValue('background-color', 'var(--ult-color-success-contrast)'));
});

test('without dot the badge renders its children alone', async () => {
  const screen = await render(<Badge data-testid="plain">Draft</Badge>);
  expect(screen.getByTestId('plain').element().children).toHaveLength(0);
});

test('a leading mark sits a space step from the label, and the badge gives up a step of inline padding to hold it', async () => {
  const screen = await render(
    <>
      <Badge data-testid="plain">Draft</Badge>
      <Badge data-testid="dot" dot>Draft</Badge>
      <Badge data-testid="icon">
        <svg aria-hidden="true" width="1em" height="1em" />
        Draft
      </Badge>
    </>,
  );
  const plain = getComputedStyle(screen.getByTestId('plain').element());
  expect(plain.columnGap).toBe(tokenValue('column-gap', 'var(--ult-space-2)'));
  expect(plain.alignItems).toBe('center');
  expect(plain.paddingLeft).toBe(tokenValue('padding-left', 'var(--ult-space-4)'));
  for (const id of ['dot', 'icon']) {
    const badge = getComputedStyle(screen.getByTestId(id).element());
    expect(badge.paddingLeft, id).toBe(tokenValue('padding-left', 'var(--ult-space-3)'));
    expect(badge.paddingRight, id).toBe(tokenValue('padding-right', 'var(--ult-space-3)'));
  }
});
