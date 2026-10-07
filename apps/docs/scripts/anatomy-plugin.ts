import { existsSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const ANATOMY = join(root, 'apps/docs/src/generated/anatomy');
const MARKED_IMPORTERS = [join(root, 'apps/docs/src/demos'), join(root, 'packages/blocks/src')].map((directory) => directory + sep);

/**
 * Resolves `@ultima/ui` and `@ultima/ui/<name>` to the generated marked modules for an importer under
 * `MARKED_IMPORTERS`, per [Anatomy](../../../docs/spec/ultima.md#anatomy). Every other importer, `packages/ui`
 * and the generated modules themselves included, keeps the real source.
 */
export function anatomyPlugin(): Plugin {
  return {
    name: 'ultima-anatomy',
    enforce: 'pre',
    resolveId(source, importer) {
      const from = importer?.split('?')[0];
      if (!from || !MARKED_IMPORTERS.some((directory) => from.startsWith(directory))) return null;
      const match = /^@ultima\/ui(?:\/([a-z0-9-]+))?$/.exec(source);
      if (!match) return null;
      const target = join(ANATOMY, match[1] ? `${match[1]}.tsx` : 'index.ts');
      return existsSync(target) ? target : null;
    },
  };
}
