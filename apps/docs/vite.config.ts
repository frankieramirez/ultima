import { fileURLToPath } from 'node:url';
import stylex from '@stylexjs/unplugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const rootDir = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig(({ mode }) => ({
  plugins: [
    // StyleX must run before @vitejs/plugin-react so Fast Refresh keeps working.
    stylex.vite({
      dev: mode !== 'production',
      runtimeInjection: false,
      useCSSLayers: true,
      unstable_moduleResolution: { type: 'commonJS', rootDir },
    }),
    react(),
  ],
}));
