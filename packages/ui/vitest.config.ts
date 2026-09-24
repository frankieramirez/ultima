import stylex from '@stylexjs/unplugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

import { uiOptimizerInclude } from '../../scripts/generated/browser-dependencies.ts';
import { stylexOptions } from '../../stylex.options.ts';

export default defineConfig({
  plugins: [stylex.vite(stylexOptions({ dev: true })), react()],
  optimizeDeps: { include: uiOptimizerInclude },
  test: {
    fileParallelism: false,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
      viewport: { width: 1280, height: 720 },
    },
  },
});
