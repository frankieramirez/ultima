import { beforeEach } from 'vitest';
import { cdp, page } from 'vitest/browser';

/**
 * Browser files share one page. A leftover hover from the previous file paints
 * Pagination.Page `:hover` with `--ult-color-text`, the same token as the current
 * page, so the documented-state color assert collapses. Move the pointer through
 * CDP so leftover inert overlays cannot intercept a hover target, restore the
 * default viewport, and drop focus.
 */
export async function parkPointer() {
  await cdp().send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: 1270,
    y: 8,
  });
}

beforeEach(async () => {
  await page.viewport(1280, 720);
  await parkPointer();
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body) {
    active.blur();
  }
});
