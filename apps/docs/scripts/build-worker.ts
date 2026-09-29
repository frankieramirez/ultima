import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

import { THEME_REGISTRY_PATH } from '../../../packages/tokens/src/theme/registry-url.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'dist');
await build({
  configFile: false,
  root,
  publicDir: false,
  build: {
    outDir,
    emptyOutDir: false,
    target: 'es2022',
    minify: false,
    lib: { entry: join(root, 'server/worker.ts'), formats: ['es'], fileName: () => '_worker.js' },
  },
});
writeFileSync(join(outDir, '_routes.json'), `${JSON.stringify({ version: 1, include: [THEME_REGISTRY_PATH], exclude: [] }, null, 2)}\n`);
