// One bundling step, ESM with a shebang: docs/spec/ultima.md, Consumer CLI, Package and engine.
import { execFileSync } from 'node:child_process';
import { chmodSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

import { setupItems } from '../../../registry/items.config.ts';
import { bundledAuthorized, bundledCatalogue, bundledKit, bundledTokens } from './bundled.ts';
import { supportedRanges } from './supported-ranges.ts';

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const outfile = join(packageDir, 'dist/cli.js');
const { dependencies } = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
const spec = readFileSync(join(packageDir, '../../docs/spec/ultima.md'), 'utf8').split('\n');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: packageDir, encoding: 'utf8' }).trim();

function specLines(): Record<string, number> {
  const section = spec.indexOf('### What the consumer still does by hand');
  const end = spec.findIndex((line, index) => index > section && line.startsWith('#'));
  const lines: Record<string, number> = {};
  for (const { handSteps } of Object.values(setupItems)) {
    for (const { spec: lead } of handSteps) {
      if (!lead || lead in lines) continue;
      const index = spec.findIndex((line, at) => at > section && at < end && line.startsWith(`- **${lead}**`));
      if (section === -1 || index === -1) {
        throw new Error(`no "- **${lead}**" bullet under What the consumer still does by hand in docs/spec/ultima.md`);
      }
      lines[lead] = index + 1;
    }
  }
  return lines;
}

await build({
  entryPoints: [join(packageDir, 'src/cli.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  banner: { js: '#!/usr/bin/env node' },
  external: Object.keys(dependencies),
  define: {
    __ULTIMA_COMMIT__: JSON.stringify(commit),
    __ULTIMA_SPEC_LINES__: JSON.stringify(specLines()),
    __ULTIMA_SUPPORTED_RANGES__: JSON.stringify(supportedRanges(join(packageDir, '../..'))),
    __ULTIMA_CATALOGUE__: JSON.stringify(bundledCatalogue(join(packageDir, '../..'))),
    __ULTIMA_TOKENS__: JSON.stringify(bundledTokens(join(packageDir, '../..'))),
    __ULTIMA_AUTHORIZED__: JSON.stringify(bundledAuthorized()),
    __ULTIMA_KIT__: JSON.stringify(bundledKit(join(packageDir, '../..'))),
  },
  logLevel: 'warning',
});
chmodSync(outfile, 0o755);
