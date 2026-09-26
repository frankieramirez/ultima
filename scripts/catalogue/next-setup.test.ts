import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve, matchesGlob } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const source = resolve('registry/static/setup-next');
type BabelConfig = { plugins: [string, { aliases: Record<string, string[]> }][] };
type PostcssConfig = { plugins: Record<string, { include: string[]; exclude: string[] }> };

for (const directory of ['.', 'src', 'custom']) {
  test(`Next setup resolves consumer aliases and extracts ${directory} source`, () => {
    const root = mkdtempSync(join(tmpdir(), 'ultima-next-config-'));
    try {
      writeFileSync(join(root, 'tsconfig.json'), `{
        // Next scaffolds JSONC.
        "compilerOptions": { "paths": { "@/*": ["./${directory}/*"] } },
      }`);
      writeFileSync(join(root, 'base.json'), readFileSync(join(root, 'tsconfig.json')));
      writeFileSync(join(root, 'tsconfig.json'), '{ "extends": "./base.json" }');
      const babel = { exports: {} as BabelConfig };
      runInNewContext(readFileSync(join(source, 'babel.config.js'), 'utf8'), {
        require, module: babel, __dirname: root, process,
      });
      const options = babel.exports.plugins[0]![1];
      assert.deepEqual(Array.from(options.aliases['@/*']!), [resolve(root, directory, '*')]);
      const postcss = { exports: {} as PostcssConfig };
      runInNewContext(readFileSync(join(source, 'postcss.config.js'), 'utf8'), {
        require: (id: string) => id === './babel.config.js' ? babel.exports : require(id),
        module: postcss, __dirname: root,
      });
      const config = postcss.exports.plugins['@stylexjs/postcss-plugin']!;
      for (const file of ['app/page.tsx', 'components/ui/button.tsx', 'lib/tokens.stylex.ts']) {
        const path = join(directory, file);
        assert.ok(config.include.some((glob: string) => matchesGlob(path, glob)), path);
      }
      for (const file of ['node_modules/example/index.ts', '.next/server/app/page.js']) {
        assert.ok(config.exclude.some((glob: string) => matchesGlob(file, glob)), file);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
