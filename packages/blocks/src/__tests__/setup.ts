import { afterAll, beforeEach } from 'vitest';
import { cdp, page } from 'vitest/browser';

/**
 * Browser files share one page, so a viewport, a hover or focus left by the previous test leaks into
 * the next one's first paint. Restore the default viewport, move the pointer to a corner through CDP,
 * and drop focus.
 */
beforeEach(async () => {
  await page.viewport(1280, 720);
  await cdp().send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1270, y: 8 });
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body) active.blur();
});

/** Each finished file's shared memory waits in TMPDIR until the renderer collects it. */
afterAll(async () => {
  await cdp().send('HeapProfiler.collectGarbage');
});
