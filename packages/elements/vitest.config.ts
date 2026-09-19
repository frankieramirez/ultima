import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false,
    projects: [
      {
        test: {
          name: 'browser',
          include: ['src/__tests__/**/*.test.ts'],
          exclude: ['src/__tests__/**/*.node.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
            viewport: { width: 1280, height: 720 },
          },
        },
      },
      {
        test: {
          name: 'node',
          include: ['src/__tests__/**/*.node.test.ts'],
        },
      },
    ],
  },
});
