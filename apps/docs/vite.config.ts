import mdx from '@mdx-js/rollup';
import stylex from '@stylexjs/unplugin';
import react from '@vitejs/plugin-react';
import remarkGfm from 'remark-gfm';
import { defineConfig } from 'vite';

import { stylexConstsWarmup, stylexOptions } from '../../stylex.options.ts';
import { anatomyPlugin } from './scripts/anatomy-plugin.ts';
import { themeRegistryPlugin } from './scripts/theme-registry-plugin.ts';

export default defineConfig(({ mode }) => ({
  plugins: [
    themeRegistryPlugin(),
    anatomyPlugin(),
    { enforce: 'pre', ...mdx({ remarkPlugins: [remarkGfm] }) },
    // Registered before stylex.vite so its middleware gates the dev CSS endpoint.
    stylexConstsWarmup(['/src/breakpoints.stylex.ts']),
    // StyleX must run before @vitejs/plugin-react so Fast Refresh keeps working.
    stylex.vite(stylexOptions({ dev: mode !== 'production' })),
    react(),
  ],
}));
