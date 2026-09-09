import stylex from '@stylexjs/unplugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

import { stylexOptions } from '../../stylex.options.ts';

export default defineConfig({
  plugins: [stylex.vite(stylexOptions({ dev: true })), react()],
  optimizeDeps: {
    include: [
      '@base-ui/react/button',
      '@base-ui/react/input',
      '@base-ui/react/dialog',
      '@base-ui/react/menu',
      '@base-ui/react/meter',
      '@base-ui/react/switch',
      '@base-ui/react/tabs',
      '@base-ui/react/tooltip',
      '@base-ui/react/use-render',
    ],
  },
  test: {
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
});
