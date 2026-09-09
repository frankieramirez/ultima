import stylex from '@stylexjs/unplugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { stylexOptions } from '../../stylex.options.ts';

export default defineConfig(({ mode }) => ({
  plugins: [
    // StyleX must run before @vitejs/plugin-react so Fast Refresh keeps working.
    stylex.vite(stylexOptions({ dev: mode !== 'production' })),
    react(),
  ],
}));
