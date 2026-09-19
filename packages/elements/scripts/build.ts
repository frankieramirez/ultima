// Bundle shape (self-contained classic script, injected sheet): docs/spec/ultima.md, Web components.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { transformAsync } from '@babel/core';
import styleXPlugin, { type Rule as StyleXRule } from '@stylexjs/babel-plugin';

import { stylexOptions } from '../../../stylex.options.ts';

const here = dirname(fileURLToPath(import.meta.url));
const packageDir = join(here, '..');
const srcDir = join(packageDir, 'src');
const tokensDir = join(packageDir, '../tokens');
const distDir = join(packageDir, 'dist');

const TOKEN_SOURCES = [
  join(tokensDir, 'src/tokens.stylex.ts'),
  join(tokensDir, 'src/themes.ts'),
];

const elementFiles = readdirSync(srcDir)
  .filter((name) => name.endsWith('.element.ts'))
  .sort((a, b) => a.localeCompare(b));
if (elementFiles.length === 0) {
  console.error('@ultima/elements build: no src/*.element.ts sources');
  process.exit(1);
}

async function compile(filename: string) {
  const result = await transformAsync(readFileSync(filename, 'utf8'), {
    filename,
    cwd: packageDir,
    babelrc: false,
    configFile: false,
    presets: ['@babel/preset-typescript'],
    plugins: [styleXPlugin.withOptions(stylexOptions({ dev: false }))],
  });
  const rules = (result?.metadata as { stylex?: StyleXRule[] } | undefined)?.stylex ?? [];
  return { code: result?.code ?? '', rules };
}

const tokenRules: StyleXRule[] = [];
for (const filename of TOKEN_SOURCES) {
  tokenRules.push(...(await compile(filename)).rules);
}

const elements: { name: string; code: string; rules: StyleXRule[] }[] = [];
for (const file of elementFiles) {
  const filename = join(srcDir, file);
  const { code, rules } = await compile(filename);
  const stripped = code.replace(/^import .*$/gm, '');
  const leftovers = stripped.match(/^import |^export |stylex\.(create|attrs|props)/gm);
  if (leftovers) {
    console.error(`${file}: bundle still references imports or runtime stylex:`, leftovers);
    process.exit(1);
  }
  elements.push({ name: file.replace(/\.element\.ts$/, ''), code: stripped, rules });
}

function dedup(rules: StyleXRule[]): StyleXRule[] {
  const seen = new Set<string>();
  return rules.filter((rule) => {
    if (seen.has(rule[0])) return false;
    seen.add(rule[0]);
    return true;
  });
}

function stamp(): string {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'local';
  }
}

function bundle(rules: StyleXRule[], codes: string[]): string {
  const css = styleXPlugin.processStylexRules(dedup(rules), true) as string;
  const sheet = [
    `const sheet = document.createElement('style');`,
    `sheet.setAttribute('data-ultima-elements', '');`,
    `sheet.textContent = ${JSON.stringify(css)};`,
    `document.head.appendChild(sheet);`,
  ].join('\n');
  const parts = codes.map((code) => `{\n${code}\n}`);
  return `/* @ultima/elements ${stamp()} */\n${sheet}\n${parts.join('\n')}\n`;
}

mkdirSync(distDir, { recursive: true });
for (const element of elements) {
  writeFileSync(
    join(distDir, `${element.name}.js`),
    bundle([...tokenRules, ...element.rules], [element.code]),
  );
}
writeFileSync(
  join(distDir, 'ultima.js'),
  bundle([...tokenRules, ...elements.flatMap((element) => element.rules)], elements.map((e) => e.code)),
);
console.log(`@ultima/elements: wrote ${elements.map((e) => `dist/${e.name}.js`).join(', ')}, dist/ultima.js`);
