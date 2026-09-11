import mdx from '@mdx-js/rollup';
import stylex from '@stylexjs/unplugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import remarkGfm from 'remark-gfm';
import { defineConfig } from 'vitest/config';

import { stylexOptions } from '../../stylex.options.ts';

export default defineConfig({
  plugins: [
    { enforce: 'pre', ...mdx({ remarkPlugins: [remarkGfm] }) },
    stylex.vite(stylexOptions({ dev: true })),
    react(),
  ],
  // Discovering one of these mid-run reloads the page under the tests, which Vitest reports as a
  // flake rather than a failure, so the application's dependencies are declared up front.
  optimizeDeps: {
    include: [
      '@base-ui/react/button',
      '@base-ui/react/collapsible',
      '@base-ui/react/dialog',
      '@base-ui/react/input',
      '@base-ui/react/menu',
      '@base-ui/react/meter',
      '@base-ui/react/select',
      '@base-ui/react/switch',
      '@base-ui/react/tabs',
      '@base-ui/react/toggle',
      '@base-ui/react/toggle-group',
      '@base-ui/react/tooltip',
      '@base-ui/react/use-render',
      '@phosphor-icons/react',
      '@stylexjs/stylex',
      '@tanstack/react-router',
      'apca-w3',
      'axe-core',
      'vitest-browser-react',
    ],
  },
  test: {
    // One browser: a file that clicks and resizes the viewport does it to the page every other
    // file is rendering in, and a demo left under the moving pointer opens the Tooltip being swept.
    fileParallelism: false,
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
