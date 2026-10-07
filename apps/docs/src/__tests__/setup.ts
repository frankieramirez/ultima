import { afterEach } from 'vitest';
import { cdp } from 'vitest/browser';
import { cleanup } from 'vitest-browser-react';

/**
 * Detached preview frames retain Chromium resources until the renderer collects garbage. Files
 * that repeatedly mount the full docs app can exhaust its module loaders before the file ends.
 * Unmount first, then collect after each test so the next preview can load.
 */
afterEach(async () => {
  await cleanup();
  await cdp().send('HeapProfiler.collectGarbage');
});
