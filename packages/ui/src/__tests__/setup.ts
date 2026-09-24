import { afterAll, beforeEach } from 'vitest';
import { cdp, page } from 'vitest/browser';

/**
 * Browser files share one page. A leftover hover from the previous file opens delay-0
 * overlays on mount, paints Pagination.Page `:hover` with `--ult-color-text` (the same
 * token as the current page), and a leftover viewport leaks into the next file's first
 * paint. Move the pointer through CDP so leftover inert overlays cannot intercept a hover
 * target, restore the default viewport, and drop focus.
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

/**
 * Chromium holds each finished file's shared memory in TMPDIR (Playwright launches it with
 * --disable-dev-shm-usage) until the renderer collects garbage, gigabytes over this suite. A full
 * TMPDIR fails the next file's iframe load, which Vitest reports as "Cannot connect to the iframe".
 * Vitest collects only once TMPDIR has under 4 GB free, so every file collects on its way out.
 */
afterAll(async () => {
  await cdp().send('HeapProfiler.collectGarbage');
});
