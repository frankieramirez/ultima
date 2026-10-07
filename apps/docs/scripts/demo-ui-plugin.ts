import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizePath, type Plugin } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));
const src = normalizePath(join(here, '../src'));
const demos = `${src}/demos/`;
const blocks = `${normalizePath(join(here, '../../../packages/blocks/src'))}/`;
const demoUi = `${src}/demo-ui.tsx`;
const anatomy = `${src}/generated/anatomy`;

/**
 * The docs' one resolution of `@ultima/ui` for the modules it shows. Under `src/demos/` the bare
 * specifier resolves to `src/demo-ui.tsx`, whose portals mount inside the theme boundary showing
 * them (docs/spec/ultima.md, The docs site theme) and whose parts carry the Anatomy marks. Under
 * `src/demos/` and `packages/blocks/src/` a subpath resolves to its marked module, and a block's
 * bare specifier to the marked barrel (docs/spec/ultima.md, Anatomy). Every other importer,
 * `packages/ui`, `demo-ui.tsx` and the marked modules included, keeps the real source.
 */
export function demoUiPlugin(): Plugin {
  return {
    name: 'ultima-demo-ui',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer) return null;
      const match = /^@ultima\/ui(?:\/([a-z0-9-]+))?$/.exec(source);
      if (!match) return null;
      const from = normalizePath(importer.split('?')[0] ?? '');
      const demo = from.startsWith(demos);
      if (!demo && !from.startsWith(blocks)) return null;
      if (!match[1]) return demo ? demoUi : `${anatomy}/index.ts`;
      const marked = `${anatomy}/${match[1]}.tsx`;
      return existsSync(marked) ? marked : null;
    },
  };
}
