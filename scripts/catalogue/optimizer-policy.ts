import type { OptimizerPolicy } from './browser.ts';

/**
 * What import discovery cannot decide for the browser-test optimizer. Discovery proposes every bare
 * runtime specifier a project's tests reach; an entry here adds one no import names, or keeps a
 * discovered one out. Each carries its reason and where the need comes from.
 */
export const optimizerPolicy: OptimizerPolicy = {
  ui: {
    add: [],
    exclude: [
      {
        specifier: 'react',
        reason: '@vitejs/plugin-react already prebundles react and its JSX runtimes',
        source: 'packages/ui/vitest.config.ts',
      },
      {
        specifier: 'vitest',
        reason: 'Vitest serves its own runtime to the browser; it is never prebundled',
        source: 'packages/ui/vitest.config.ts',
      },
      {
        specifier: 'vitest/browser',
        reason: 'Vitest serves its own runtime to the browser; it is never prebundled',
        source: 'packages/ui/vitest.config.ts',
      },
    ],
  },
  docs: {
    add: [
      {
        specifier: 'react-dom/client',
        reason: 'vitest-browser-react imports it when a test first renders; discovered then, it reloads the page mid-run',
        source: 'apps/docs/vitest.config.ts',
      },
    ],
    exclude: [
      {
        specifier: 'react',
        reason: '@vitejs/plugin-react already prebundles react and its JSX runtimes',
        source: 'apps/docs/vitest.config.ts',
      },
      {
        specifier: 'vitest',
        reason: 'Vitest serves its own runtime to the browser; it is never prebundled',
        source: 'apps/docs/vitest.config.ts',
      },
      {
        specifier: 'vitest/browser',
        reason: 'Vitest serves its own runtime to the browser; it is never prebundled',
        source: 'apps/docs/vitest.config.ts',
      },
    ],
  },
};
