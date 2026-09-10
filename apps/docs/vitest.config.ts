import stylex from '@stylexjs/unplugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

import { stylexOptions } from '../../stylex.options.ts';

export default defineConfig({
  plugins: [stylex.vite(stylexOptions({ dev: true })), react()],
  test: {
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
