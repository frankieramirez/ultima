import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizePath, type Plugin } from 'vite';

const src = normalizePath(join(dirname(fileURLToPath(import.meta.url)), '../src'));
const demos = `${src}/demos/`;
const demoUi = `${src}/demo-ui.tsx`;

/**
 * Resolves `@ultima/ui` to `src/demo-ui.tsx` for modules under `src/demos/`, so their portals mount
 * inside the theme boundary that shows them. docs/spec/ultima.md, The docs site theme.
 */
export function demoUiPlugin(): Plugin {
  return {
    name: 'ultima-demo-ui',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source !== '@ultima/ui' || !importer) return null;
      return normalizePath(importer.split('?')[0] ?? '').startsWith(demos) ? demoUi : null;
    },
  };
}

