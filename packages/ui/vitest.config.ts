import stylex from '@stylexjs/unplugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

import { stylexOptions } from '../../stylex.options.ts';

export default defineConfig({
  plugins: [stylex.vite(stylexOptions({ dev: true })), react()],
  optimizeDeps: {
    include: [
      '@base-ui/react/accordion',
      '@base-ui/react/autocomplete',
      '@base-ui/react/avatar',
      '@base-ui/react/button',
      '@base-ui/react/separator',
      '@base-ui/react/checkbox',
      '@base-ui/react/checkbox-group',
      '@base-ui/react/collapsible',
      '@base-ui/react/combobox',
      '@base-ui/react/context-menu',
      '@base-ui/react/input',
      '@base-ui/react/field',
      '@base-ui/react/fieldset',
      '@base-ui/react/alert-dialog',
      '@base-ui/react/dialog',
      '@base-ui/react/drawer',
      '@base-ui/react/menu',
      '@base-ui/react/menubar',
      '@base-ui/react/meter',
      '@base-ui/react/navigation-menu',
      '@base-ui/react/popover',
      '@base-ui/react/preview-card',
      '@base-ui/react/progress',
      '@base-ui/react/radio',
      '@base-ui/react/radio-group',
      '@base-ui/react/scroll-area',
      '@base-ui/react/select',
      '@base-ui/react/slider',
      '@base-ui/react/switch',
      '@base-ui/react/tabs',
      '@base-ui/react/toast',
      '@base-ui/react/toggle',
      '@base-ui/react/toggle-group',
      '@base-ui/react/tooltip',
      '@base-ui/react/use-render',
    ],
  },
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
