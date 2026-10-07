import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const src = join(dirname(fileURLToPath(import.meta.url)), '../src');
const demos = join(src, 'demos') + sep;
const demoUi = join(src, 'demo-ui.tsx');

/**
 * Resolves `@ultima/ui` to `src/demo-ui.tsx` for modules under `src/demos/`, so their portals mount
 * inside the Neutral boundary that shows them. docs/spec/ultima.md, The docs site theme.
 */
export function demoUiPlugin(): Plugin {
  return {
    name: 'ultima-demo-ui',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source !== '@ultima/ui' || !importer) return null;
      const from = importer.split('?')[0] ?? '';
      return from.startsWith(demos) ? demoUi : null;
    },
  };
}
