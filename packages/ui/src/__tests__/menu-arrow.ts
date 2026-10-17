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

/** What a token resolves to for one property, read off a probe so units and colour forms match. */
export function resolved(property: string, value: string): string {
  const probe = document.createElement('div');
  probe.style.setProperty(property, value);
  document.body.append(probe);
  const out = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return out;
}
