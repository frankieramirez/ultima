import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { supportedRanges } from './scripts/supported-ranges.ts';

export default defineConfig({
  define: {
    __ULTIMA_SUPPORTED_RANGES__: JSON.stringify(supportedRanges(join(dirname(fileURLToPath(import.meta.url)), '../..'))),
  },
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    environment: 'node',
  },
});
