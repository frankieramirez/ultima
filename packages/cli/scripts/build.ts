// One bundling step, ESM with a shebang: docs/spec/ultima.md, Consumer CLI, Package and engine.
import { execFileSync } from 'node:child_process';
import { chmodSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const outfile = join(packageDir, 'dist/cli.js');
const { dependencies } = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: packageDir, encoding: 'utf8' }).trim();

await build({
  entryPoints: [join(packageDir, 'src/cli.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  banner: { js: '#!/usr/bin/env node' },
  external: Object.keys(dependencies),
  define: { __ULTIMA_COMMIT__: JSON.stringify(commit) },
  logLevel: 'warning',
});
chmodSync(outfile, 0o755);
