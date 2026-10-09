// Installed by the Ultima setup-vite registry item.
// Add `ultimaStylex()` to `plugins` in vite.config.ts, before the React plugin.
import path from 'node:path';

import stylexVite from '@stylexjs/unplugin/vite';
import type { PluginOption } from 'vite';

const root = import.meta.dirname;

/**
 * `@stylexjs/unplugin` ships CommonJS type declarations for an ESM entry, so
 * under Node module resolution TypeScript hands back the module object rather
 * than the plugin factory. The cast is the whole of the workaround.
 */
const stylex = stylexVite as unknown as (options: Record<string, unknown>) => PluginOption;

export function ultimaStylex() {
  return [
    {
      name: 'ultima:alias',
      config: () => ({ resolve: { alias: { '@': path.join(root, 'src') } } }),
    },
    stylex({
      dev: process.env.NODE_ENV !== 'production',
      runtimeInjection: false,
      useCSSLayers: true,
      aliases: { '@/*': [path.join(root, 'src', '*')] },
      unstable_moduleResolution: { type: 'commonJS', rootDir: root },
    }),
  ];
}
