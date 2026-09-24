// Bundle shape (self-contained classic script, injected sheet): docs/spec/ultima.md, Web components.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import { transformAsync } from '@babel/core';
import styleXPlugin, { type Rule as StyleXRule } from '@stylexjs/babel-plugin';

import { stylexOptions } from '../../../stylex.options.ts';
import { catalogueRevision, contentHash, stampLine, withStamp } from '../../cli/src/stamp.ts';
import { diskFiles } from '../../../scripts/catalogue/files.ts';
import { formatDiagnostics, loadCatalogue } from '../../../scripts/catalogue/model.ts';
import { bundleArtifact } from './bundle.ts';

const here = dirname(fileURLToPath(import.meta.url));
const packageDir = join(here, '..');
const srcDir = join(packageDir, 'src');
const tokensDir = join(packageDir, '../tokens');
const distDir = join(packageDir, 'dist');
const stageDir = join(distDir, '.stage');

const TOKEN_SOURCES = [
  join(tokensDir, 'src/tokens.stylex.ts'),
  join(tokensDir, 'src/themes.ts'),
];

// Gzipped KB budgets; the Zag 1.44.0 prototype measurements are recorded in ADR
// 0008's consequences, and the shipped family with its full part set measures
// above the prototype's number.
const BUDGET_KB: Record<string, number> = {
  'ult-button': 5,
  'ult-tabs': 17,
  'ult-tooltip': 26,
  ultima: 40,
};

const COMPILE_TIME_SCOPES = ['@stylexjs/', '@ultima/'];
const COMPILE_TIME_IMPORT = new RegExp(
  `^import\\b[^'"]*['"](?:${COMPILE_TIME_SCOPES.join('|')})[^'"]*['"];?[ \\t]*$`,
  'gm',
);

const { catalogue, diagnostics } = loadCatalogue(diskFiles(join(packageDir, '../..')));
if (diagnostics.length > 0) {
  console.error(`@ultima/elements build: the catalogue under registry/metadata/ is invalid\n${formatDiagnostics(diagnostics)}`);
  process.exit(1);
}
const elementFiles = catalogue.elements.map((entry) => `${entry.id}.element.ts`).sort((a, b) => a.localeCompare(b));
if (elementFiles.length === 0) {
  console.error('@ultima/elements build: registry/metadata/element/ describes no family');
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
  const stripped = code.replace(COMPILE_TIME_IMPORT, '');
  const leftovers = stripped.match(/^export |stylex\.(create|attrs|props)/gm);
  if (leftovers) {
    console.error(`${file}: compiled source still has exports or runtime stylex:`, leftovers);
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

const revision = catalogueRevision(packageDir);

async function wrap(item: string, rules: StyleXRule[], code: string): Promise<string> {
  const css = styleXPlugin.processStylexRules(dedup(rules), true) as string;
  const sheet = [
    `const sheet = document.createElement('style');`,
    `sheet.setAttribute('data-ultima-elements', '');`,
    `sheet.textContent = ${JSON.stringify(css)};`,
    `document.head.appendChild(sheet);`,
  ].join('\n');
  const contents = `${sheet}\n${code}\n`;
  return withStamp(contents, stampLine(item, revision, await contentHash(contents, 'b1'), 'css'));
}

rmSync(stageDir, { recursive: true, force: true });
mkdirSync(stageDir, { recursive: true });
for (const element of elements) {
  writeFileSync(join(stageDir, `${element.name}.js`), element.code);
}
writeFileSync(
  join(stageDir, 'ultima.js'),
  `${elements.map((element) => `import './${element.name}.js';`).join('\n')}\n`,
);

const artifacts = [
  ...elements.map((element) => ({
    name: element.name,
    entry: join(stageDir, `${element.name}.js`),
    rules: [...tokenRules, ...element.rules],
  })),
  {
    name: 'ultima',
    entry: join(stageDir, 'ultima.js'),
    rules: [...tokenRules, ...elements.flatMap((element) => element.rules)],
  },
];

mkdirSync(distDir, { recursive: true });
for (const artifact of artifacts) {
  const item = artifact.name === 'ultima' ? 'elements' : artifact.name;
  const contents = await wrap(item, artifact.rules, await bundleArtifact(artifact.entry));
  writeFileSync(join(distDir, `${artifact.name}.js`), contents);
  const gzipped = gzipSync(contents, { level: 9 }).length;
  const size = `${contents.length} B, ${(gzipped / 1024).toFixed(1)} KB gzipped`;
  const budget = BUDGET_KB[artifact.name];
  if (budget !== undefined && gzipped > budget * 1024) {
    console.error(
      `@ultima/elements: dist/${artifact.name}.js is ${size}, over the recorded ${budget} KB budget`,
    );
    process.exit(1);
  }
  console.log(
    `@ultima/elements: wrote dist/${artifact.name}.js (${size}${budget !== undefined ? `, budget ${budget} KB` : ''})`,
  );
}
rmSync(stageDir, { recursive: true, force: true });
