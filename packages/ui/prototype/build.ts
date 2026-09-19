// PROTOTYPE build for https://github.com/frankieramirez/ultima/issues/153 — throwaway.
// Compiles ult-button.element.ts with the repo's own StyleX toolchain (Babel +
// @stylexjs/babel-plugin, same options as packages/tokens/scripts/build-tokens.ts)
// and emits:
//   dist/ult-button.js  — a self-contained classic script with the sheet inlined
//   dist/ult-button.css — the atomic stylesheet for a document (light-DOM path)
//   sheet.ts            — the :root->:host rewritten sheet as a module, for bundlers
// Run: node --experimental-strip-types packages/ui/prototype/build.ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const tokensDir = join(here, '../../tokens');
const tokensRequire = createRequire(join(tokensDir, 'package.json'));
const { transformAsync } = tokensRequire('@babel/core');
const styleXPlugin = tokensRequire('@stylexjs/babel-plugin');
const { stylexOptions } = await import('../../../stylex.options.ts');

type StyleXRule = [string, { ltr: string | null }, number];

const SOURCES = [
  join(tokensDir, 'src/tokens.stylex.ts'),
  join(tokensDir, 'src/themes.ts'),
  join(here, 'ult-button.element.ts'),
];

async function compile(filename: string) {
  const result = await transformAsync(readFileSync(filename, 'utf8'), {
    filename,
    cwd: tokensDir,
    babelrc: false,
    configFile: false,
    presets: [tokensRequire.resolve('@babel/preset-typescript')],
    plugins: [styleXPlugin.withOptions(stylexOptions({ dev: false }))],
  });
  const rules = (result?.metadata as { stylex?: StyleXRule[] } | undefined)?.stylex ?? [];
  return { code: result?.code ?? '', rules };
}

const allRules: StyleXRule[] = [];
let elementCode = '';
for (const filename of SOURCES) {
  const { code, rules } = await compile(filename);
  allRules.push(...rules);
  if (filename.endsWith('ult-button.element.ts')) elementCode = code;
}

const css = styleXPlugin.processStylexRules(allRules, true) as string;

// The var-group rules are `:root, .<hash>{...}`; on a shadow root they must land
// on :host or the element has no tokens at all.
const shadowCss = css.replaceAll(':root,', ':host,');

const distDir = join(here, 'dist');
mkdirSync(distDir, { recursive: true });
writeFileSync(join(distDir, 'ult-button.css'), css + '\n');
writeFileSync(join(here, 'sheet.ts'), `export default ${JSON.stringify(shadowCss)};\n`);

const bundle = elementCode
  .replace(/^import SHEET_CSS from ['"]\.\/sheet['"];?/m, `const SHEET_CSS = ${JSON.stringify(shadowCss)};`)
  .replace(/^import .*$/gm, '');

const leftovers = bundle.match(/^import |^export |stylex\.(create|attrs|props)/gm);
if (leftovers) {
  console.error('dist bundle still references imports or runtime stylex:', leftovers);
  process.exit(1);
}

writeFileSync(join(distDir, 'ult-button.js'), bundle + '\n');
console.log(`wrote ${allRules.length} rules, ${css.length} bytes of css, ${bundle.length} bytes of js`);
