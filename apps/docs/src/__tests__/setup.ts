import { afterAll } from 'vitest';
import { cdp } from 'vitest/browser';

/**
 * Chromium holds each finished file's shared memory in TMPDIR (Playwright launches it with
 * --disable-dev-shm-usage) until the renderer collects garbage. A full TMPDIR fails the next file's
 * iframe load, which Vitest reports as "Cannot connect to the iframe". Vitest collects only once
 * TMPDIR has under 4 GB free, so every file collects on its way out.
 */
afterAll(async () => {
  await cdp().send('HeapProfiler.collectGarbage');
});
