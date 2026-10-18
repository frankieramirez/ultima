import { StrictMode } from 'react';
import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import BarChart from '../demos/chart/bar';

// The pointer half of Chart's interaction contract, on the canonical demo: hover activates the bar
// under the pointer, and the tooltip and the marker follow it. packages/ui's chart test owns the keyboard.

const bars = (container: Element) => [...container.querySelectorAll('svg rect')];
const tooltip = (container: Element) => container.querySelector('figure > div[aria-hidden="true"]');
const marker = (container: Element) => container.querySelector('figure > span[aria-hidden="true"]');

test('hovering a bar shows its tooltip and marker, and leaving the plot clears both', async () => {
  const screen = await render(
    <StrictMode>
      <BarChart />
    </StrictMode>,
  );
  await expect.poll(() => bars(screen.container).length).toBe(7);
  expect(tooltip(screen.container)).toBeNull();
  expect(marker(screen.container)).toBeNull();

  const tuesday = bars(screen.container)[1] as SVGRectElement;
  await userEvent.hover(tuesday);
  await expect.poll(() => tooltip(screen.container)?.textContent).toBe('Tue, 91,700 requests');
  const ring = (marker(screen.container) as HTMLElement).getBoundingClientRect();
  const bar = tuesday.getBoundingClientRect();
  expect(ring.left + ring.width / 2).toBeCloseTo(bar.left + bar.width / 2, 0);
  expect(ring.top + ring.height / 2).toBeCloseTo(bar.top, 0);
  expect(screen.container.querySelector('[role="status"]')?.textContent).toBe('Tue, 91,700 requests');

  await userEvent.hover(bars(screen.container)[5] as SVGRectElement);
  await expect.poll(() => tooltip(screen.container)?.textContent).toBe('Sat, 41,500 requests');

  await userEvent.hover(screen.getByRole('table').element());
  await expect.poll(() => tooltip(screen.container)).toBeNull();
  expect(marker(screen.container)).toBeNull();
});
