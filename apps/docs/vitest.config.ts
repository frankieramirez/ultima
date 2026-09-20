import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import mdx from '@mdx-js/rollup';
import stylex from '@stylexjs/unplugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import remarkGfm from 'remark-gfm';
import { defineConfig } from 'vitest/config';

import { stylexOptions } from '../../stylex.options.ts';

const tokensDir = join(dirname(fileURLToPath(import.meta.url)), '../../packages/tokens');
const tokensRequire = createRequire(join(tokensDir, 'package.json'));

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
      '@base-ui/react/accordion',
      '@base-ui/react/avatar',
      '@base-ui/react/button',
      '@base-ui/react/checkbox',
      '@base-ui/react/checkbox-group',
      '@base-ui/react/collapsible',
      '@base-ui/react/combobox',
      '@base-ui/react/context-menu',
      '@base-ui/react/alert-dialog',
      '@base-ui/react/dialog',
      '@base-ui/react/drawer',
      '@base-ui/react/input',
      '@base-ui/react/field',
      '@base-ui/react/fieldset',
      '@base-ui/react/form',
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
      '@base-ui/react/separator',
      '@base-ui/react/slider',
      '@base-ui/react/switch',
      '@base-ui/react/tabs',
      '@base-ui/react/toast',
      '@base-ui/react/toggle',
      '@base-ui/react/toggle-group',
      '@base-ui/react/tooltip',
      '@base-ui/react/use-render',
      '@phosphor-icons/react',
      '@stylexjs/stylex',
      '@tanstack/highlight/core',
      '@tanstack/highlight/languages/css',
      '@tanstack/highlight/languages/js',
      '@tanstack/highlight/languages/jsx',
      '@tanstack/highlight/languages/plaintext',
      '@tanstack/highlight/languages/shell',
      '@tanstack/highlight/languages/ts',
      '@tanstack/highlight/languages/tsx',
      '@tanstack/react-router',
      '@tanstack/react-table',
      '@zag-js/react',
      '@zag-js/splitter',
      'apca-w3',
      'axe-core',
      'react-dom/client',
      'react-hook-form',
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
      commands: {
        // The exported .stylex.ts compiles where @ultima/tokens' babel stack lives, the same
        // transform scripts/build-tokens.ts runs. The browser test applies the result in a
        // real DOM as its fixture application.
        compileStylexModule: async (_context, source: string) => {
          const { transformAsync } = tokensRequire('@babel/core');
          const pluginModule = tokensRequire('@stylexjs/babel-plugin') as {
            default?: { withOptions: (options: unknown) => unknown };
            withOptions?: (options: unknown) => unknown;
          };
          const withOptions = pluginModule.default?.withOptions ?? pluginModule.withOptions;
          if (!withOptions) throw new Error('@stylexjs/babel-plugin has no withOptions');
          const tokensStylex = join(tokensDir, 'src/tokens.stylex.ts');
          const result = (await transformAsync(
            source.replace("'@/lib/tokens.stylex'", `'${tokensStylex}'`),
            {
              filename: join(tokensDir, 'ultima-theme.stylex.ts'),
              cwd: tokensDir,
              babelrc: false,
              configFile: false,
              presets: [tokensRequire.resolve('@babel/preset-typescript')],
              plugins: [withOptions(stylexOptions({ dev: false }))],
            },
          )) as { code?: string | null; metadata?: { stylex?: unknown } } | null;
          return { code: result?.code ?? '', rules: result?.metadata?.stylex ?? [] };
        },
      },
    },
  },
});
