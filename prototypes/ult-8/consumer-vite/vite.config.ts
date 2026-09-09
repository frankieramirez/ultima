// PROTOTYPE (ULT-8). Installed by the Ultima setup-vite registry item.
import path from 'node:path';
import stylex from '@stylexjs/unplugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const root = import.meta.dirname;

export default defineConfig(({ mode }) => ({
  plugins: [
    // StyleX must run before @vitejs/plugin-react so Fast Refresh keeps working.
    stylex.vite({
      dev: mode !== 'production',
      runtimeInjection: false,
      useCSSLayers: true,
      aliases: { '@/*': [path.join(root, 'src', '*')] },
      unstable_moduleResolution: { type: 'commonJS', rootDir: root },
    }),
    react(),
  ],
  resolve: {
    alias: { '@': path.join(root, 'src') },
  },
}));
