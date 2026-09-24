import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { bundledAuthorized, bundledCatalogue, bundledColorDefaults, bundledKit, bundledTokens } from './scripts/bundled.ts';
import { supportedRanges } from './scripts/supported-ranges.ts';

const repository = join(dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
  define: {
    __ULTIMA_SUPPORTED_RANGES__: JSON.stringify(supportedRanges(repository)),
    __ULTIMA_CATALOGUE__: JSON.stringify(bundledCatalogue(repository)),
    __ULTIMA_TOKENS__: JSON.stringify(bundledTokens(repository)),
    __ULTIMA_AUTHORIZED__: JSON.stringify(bundledAuthorized()),
    __ULTIMA_KIT__: JSON.stringify(bundledKit(repository)),
    __ULTIMA_COLOR_DEFAULTS__: JSON.stringify(bundledColorDefaults(repository)),
  },
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    environment: 'node',
  },
});
