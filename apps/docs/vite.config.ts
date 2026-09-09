import mdx from '@mdx-js/rollup';
import stylex from '@stylexjs/unplugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { stylexOptions } from '../../stylex.options.ts';

export default defineConfig(({ mode }) => ({
  plugins: [
    { enforce: 'pre', ...mdx() },
    // StyleX must run before @vitejs/plugin-react so Fast Refresh keeps working.
    stylex.vite(stylexOptions({ dev: mode !== 'production' })),
    react(),
  ],
}));
