import { expect } from 'vitest';

export type Points = 'up' | 'down' | 'left' | 'right';

const TRANSPARENT = 'rgba(0, 0, 0, 0)';

const OUTWARD: Record<Points, readonly ['Top' | 'Bottom', 'Left' | 'Right']> = {
  up: ['Top', 'Left'],
  down: ['Bottom', 'Right'],
  right: ['Top', 'Right'],
  left: ['Bottom', 'Left'],
};

/**
 * The arrow is a square turned 45deg whose centre sits on the popup's edge facing the anchor,
 * so half of it shows outside, and only the two sides that form the visible tip draw a hairline.
 */
export function expectArrowOnEdge(arrow: Element, popup: Element, points: Points): void {
  const a = arrow.getBoundingClientRect();
  const p = popup.getBoundingClientRect();
  const centre = { x: (a.left + a.right) / 2, y: (a.top + a.bottom) / 2 };
  const edge = { up: [centre.y, p.top], down: [centre.y, p.bottom], left: [centre.x, p.left], right: [centre.x, p.right] }[points];
  expect(Math.abs((edge[0] as number) - (edge[1] as number)), `arrow centre on the ${points} edge`).toBeLessThan(1.5);

  const style = getComputedStyle(arrow);
  const outward = OUTWARD[points];
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    const colour = style.getPropertyValue(`border-${side.toLowerCase()}-color`);
    if ((outward as readonly string[]).includes(side)) expect(colour, `${side} hairline`).not.toBe(TRANSPARENT);
    else expect(colour, `${side} hairline`).toBe(TRANSPARENT);
  }
}

/**
 * A section micro-label: 12px tracked capitals at regular weight, with its own snug leading
 * rather than whatever its popup or panel sets.
 */
export function expectMicroLabel(element: Element) {
  const style = getComputedStyle(element);
  expect(style.fontSize).toBe(resolved('font-size', 'var(--ult-text-2)'));
  expect(style.fontWeight).toBe(resolved('font-weight', 'var(--ult-font-weight-regular)'));
  expect(style.lineHeight).toBe(resolved('line-height', 'calc(var(--ult-text-2) * var(--ult-font-leading-snug))'));
  expect(style.textTransform).toBe('uppercase');
}

/** What a token resolves to for one property, read off a probe so units and colour forms match. */
export function resolved(property: string, value: string): string {
  const probe = document.createElement('div');
  probe.style.setProperty(property, value);
  document.body.append(probe);
  const out = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return out;
}

/** A token's length in pixels, read off a probe. */
export function px(value: string): number {
  return parseFloat(resolved('width', value));
}

/**
 * Dialogs are cards: the larger corner and shadow, card padding, and a description that sits a
 * fixed step under the title instead of on the UA's paragraph margins.
 */
export function expectCardSurface(popup: Element, description: Element): void {
  const style = getComputedStyle(popup);
  expect(style.borderTopLeftRadius).toBe(resolved('border-top-left-radius', 'var(--ult-radius-xl)'));
  expect(style.boxShadow).toBe(resolved('box-shadow', 'var(--ult-shadow-lg)'));
  expect(style.paddingTop).toBe(resolved('padding-top', 'var(--ult-space-8)'));

  const text = getComputedStyle(description);
  const title = description.previousElementSibling as Element;
  const step = description.getBoundingClientRect().top - title.getBoundingClientRect().bottom;
  expect(step, 'title to description').toBeCloseTo(px('var(--ult-space-4)'), 0);
  expect(text.marginBottom).toBe('0px');
  const leading = parseFloat(getComputedStyle(description).getPropertyValue('--ult-font-leading-normal'));
  expect(parseFloat(text.lineHeight)).toBeCloseTo(leading * parseFloat(text.fontSize), 1);
}

/**
 * A modal holds its panel width whatever it carries (7 space step 12s, or the viewport's content
 * box when that is narrower), stacks its parts a padding apart, and ends its actions on the end
 * edge a step apart.
 */
export function expectModalRhythm(viewport: Element, popup: Element, header: Element, footer: Element): void {
  const frame = getComputedStyle(viewport);
  const room = viewport.clientWidth - parseFloat(frame.paddingLeft) - parseFloat(frame.paddingRight);
  const width = popup.getBoundingClientRect().width;
  expect(width, 'panel width').toBeCloseTo(Math.min(7 * px('var(--ult-space-12)'), room), 0);

  const next = header.nextElementSibling as Element;
  const below = next.getBoundingClientRect().top - header.getBoundingClientRect().bottom;
  expect(below, 'header to body').toBeCloseTo(px('var(--ult-space-8)'), 0);
  const above = footer.getBoundingClientRect().top - (footer.previousElementSibling as Element).getBoundingClientRect().bottom;
  expect(above, 'body to footer').toBeCloseTo(px('var(--ult-space-8)'), 0);

  const actions = [...footer.children].map((child) => child.getBoundingClientRect());
  const last = actions.at(-1) as DOMRect;
  expect(last.right, 'actions end on the end edge').toBeCloseTo(footer.getBoundingClientRect().right, 0);
  if (actions.length > 1) expect(last.left - (actions.at(-2) as DOMRect).right, 'between actions').toBeCloseTo(px('var(--ult-space-4)'), 0);
}
