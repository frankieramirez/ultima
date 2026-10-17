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

type SelectorPart = { type: string; kind?: string };

/**
 * StyleX writes its stock token definitions as `:root, .x… { --ult-…: … }` and
 * normally puts them in its lowest layer, so the unlayered theme CSS overrides
 * them. When any component also declares a keyframes animation, StyleX 0.19
 * leaves that lowest group outside every layer, after the theme, where the stock
 * values win. Wrapping `:root` in `:where()` takes its specificity to zero, so
 * the theme's `:root` and `[data-theme]` rules win wherever they land.
 */
const rootWithoutSpecificity = {
  Selector(selector: SelectorPart[]) {
    const at = selector.findIndex((part) => part.type === 'pseudo-class' && part.kind === 'root');
    if (at === -1) return undefined;
    const where = { type: 'pseudo-class', kind: 'where', selectors: [[selector[at]]] };
    return [...selector.slice(0, at), where, ...selector.slice(at + 1)];
  },
};

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
      lightningcssOptions: { visitor: rootWithoutSpecificity },
      aliases: { '@/*': [path.join(root, 'src', '*')] },
      unstable_moduleResolution: { type: 'commonJS', rootDir: root },
    }),
  ];
}
