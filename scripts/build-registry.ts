/**
 * Generates the shadcn registry from the workspace, per the Registry and install
 * section of docs/spec/ultima.md. Everything under `registry/` except
 * `registry/static/` and `registry/items.config.ts` is output of this script.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  REGISTRY_FORMAT,
  catalogueRevision,
  contentHash,
  readStamp,
  stampLine,
  withStamp,
} from '../packages/cli/src/stamp.ts';
import { items } from '../registry/items.config.ts';
import { agentGuide, type GuideComponent } from './build-agent-guide.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const REGISTRY_DIR = join(root, 'registry');
const STAGE_DIR = join(REGISTRY_DIR, 'ultima');
const STATIC_DIR = join(REGISTRY_DIR, 'static');
const PUBLIC_DIR = join(root, 'apps/docs/public');
const OUTPUT_DIR = join(PUBLIC_DIR, 'r');
const SPEC = join(root, 'docs/spec/ultima.md');
const TOKENS_DIST = join(root, 'packages/tokens/dist');
const TOKEN_EXPORTS = ['tokens.css', 'tokens.json'];
const ELEMENTS_DIST = join(root, 'packages/elements/dist');
const ELEMENTS_SRC = join(root, 'packages/elements/src');
const ELEMENTS_PUBLIC = join(PUBLIC_DIR, 'elements');

const HOMEPAGE = 'https://ultima.systems';
const SHADCN = 'shadcn@4.21.0';

const NEVER_STAGE = new Set(['index.ts', 'prototype', '__tests__']);

const PROVIDED_BY_CONSUMER = new Set(['react', 'react-dom']);

type RegistryFile = { path: string; type: string; target?: string };

type HashedFile = RegistryFile & { hash: string };

type Meta = { ultima: { revision: string; files: Record<string, string> } };

type RegistryItem = {
  name: string;
  type: string;
  title: string;
  description: string;
  dependencies?: string[];
  devDependencies?: string[];
  registryDependencies?: string[];
  files: RegistryFile[];
  docs: string;
  meta?: Meta;
};

type Staged = { name: string; file: HashedFile; source: string };

/** Checks every segment, so the exclusion holds even if the listing is widened to walk subdirectories. */
function isExcluded(relativePath: string): boolean {
  return relativePath
    .split('/')
    .some((segment) => NEVER_STAGE.has(segment) || /\.test\.tsx?$/.test(segment));
}

const revision = catalogueRevision(root);

async function stamped(item: string, text: string, scheme: 'c1' | 'b1') {
  const hash = await contentHash(text, scheme);
  return { hash, text: withStamp(text, stampLine(item, revision, hash, scheme === 'c1' ? 'ts' : 'css')) };
}

function meta(files: { path: string; hash: string }[]): Meta {
  return { ultima: { revision, files: Object.fromEntries(files.map(({ path, hash }) => [basename(path), hash])) } };
}

async function stage(
  sourceDir: string,
  extension: string,
  destination: 'ui' | 'lib',
  type: string,
  item?: string,
): Promise<Staged[]> {
  const staged: Staged[] = [];
  for (const entry of readdirSync(sourceDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile() || !entry.name.endsWith(extension) || isExcluded(entry.name)) continue;
    const from = join(sourceDir, entry.name);
    const to = join(STAGE_DIR, destination, entry.name);
    if (existsSync(to)) throw new Error(`two sources stage to registry/ultima/${destination}/${entry.name}`);
    const source = readFileSync(from, 'utf8');
    const name = entry.name.replace(/\.tsx?$/, '');
    const { hash, text } = await stamped(item ?? name, rewriteImports(source, from), 'c1');
    writeFileSync(to, text);
    staged.push({ name, file: { path: `ultima/${destination}/${entry.name}`, type, hash }, source });
  }
  return staged;
}

/**
 * The workspace specifiers Ultima authors against become the `@/registry` ones
 * shadcn rewrites to the consumer's aliases on install.
 */
function rewriteSpecifier(specifier: string, file: string): string {
  if (specifier.startsWith('@ultima/tokens/')) {
    return `@/registry/ultima/lib/${specifier.slice('@ultima/tokens/'.length)}`;
  }
  if (specifier.startsWith('@ultima/ui/lib/')) {
    return `@/registry/ultima/lib/${specifier.slice('@ultima/ui/lib/'.length)}`;
  }
  if (specifier.startsWith('@ultima/ui/')) {
    return `@/registry/ultima/ui/${specifier.slice('@ultima/ui/'.length)}`;
  }
  throw new Error(`${file} imports "${specifier}", a barrel that is never staged; import the module directly`);
}

function rewriteImports(source: string, file: string): string {
  return source.replace(
    /(['"])(@ultima\/[^'"]*)\1/g,
    (_match, quote: string, specifier: string) => `${quote}${rewriteSpecifier(specifier, file)}${quote}`,
  );
}

const IMPORT = /\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)|\bimport\s+['"]([^'"]+)['"]/g;

function specifiersIn(source: string): string[] {
  return [...source.matchAll(IMPORT)].map((match) => (match[1] ?? match[2] ?? match[3]) as string);
}

function packageName(specifier: string): string {
  const segments = specifier.split('/');
  return specifier.startsWith('@') ? segments.slice(0, 2).join('/') : (segments[0] as string);
}

function dependenciesOf(staged: Staged[]): string[] {
  const found = new Set<string>();
  for (const { source } of staged) {
    for (const specifier of specifiersIn(source)) {
      if (specifier.startsWith('.') || specifier.startsWith('@ultima/')) continue;
      const name = packageName(specifier);
      if (!PROVIDED_BY_CONSUMER.has(name)) found.add(name);
    }
  }
  return [...found].sort();
}

function registryDependencyFor(specifier: string): string {
  if (specifier.startsWith('@ultima/tokens/')) return '@ultima/tokens';
  if (specifier.startsWith('@ultima/ui/lib/')) return '@ultima/lib';
  return `@ultima/${specifier.slice('@ultima/ui/'.length)}`;
}

const DEPENDENCY_ORDER = ['@ultima/tokens', '@ultima/lib'];

function registryDependenciesOf(staged: Staged[]): string[] {
  const found = new Set<string>();
  for (const { source } of staged) {
    for (const specifier of specifiersIn(source)) {
      if (specifier.startsWith('@ultima/')) found.add(registryDependencyFor(specifier));
    }
  }
  const rank = (name: string) =>
    DEPENDENCY_ORDER.includes(name) ? DEPENDENCY_ORDER.indexOf(name) : DEPENDENCY_ORDER.length;
  return [...found].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

const described = new Set<string>();

function describe(name: string) {
  const entry = items[name];
  if (!entry) throw new Error(`registry/items.config.ts has no entry for "${name}"`);
  described.add(name);
  return entry;
}

function item(name: string, type: string, files: HashedFile[], staged: Staged[]): RegistryItem {
  const { title, description, docs } = describe(name);
  const dependencies = dependenciesOf(staged);
  const registryDependencies = registryDependenciesOf(staged);
  return {
    name,
    type,
    title,
    description,
    ...(dependencies.length > 0 && { dependencies }),
    ...(registryDependencies.length > 0 && { registryDependencies }),
    files: files.map(({ hash: _, ...file }) => file),
    docs,
    meta: meta(files),
  };
}

function vendoredElementItem(name: string): RegistryItem {
  const { title, description, docs, registryDependencies } = describe(name);
  return {
    name,
    type: 'registry:item',
    title,
    description,
    ...(registryDependencies && registryDependencies.length > 0 && { registryDependencies }),
    files: [{ path: `ultima/elements/${name}.js`, type: 'registry:file', target: `~/${name}.js` }],
    docs,
    meta: meta([{ path: `${name}.js`, hash: stampOf(join(ELEMENTS_DIST, `${name}.js`)) }]),
  };
}

function stampOf(file: string): string {
  const stamp = readStamp(readFileSync(file, 'utf8'));
  if (!stamp) throw new Error(`${file} carries no item stamp; rebuild it`);
  return `${stamp.scheme}:${stamp.hash}`;
}

function filesUnder(dir: string, prefix = ''): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...filesUnder(join(dir, entry.name), path));
    else found.push(path);
  }
  return found;
}

/** Where a file sits under `registry/static/<name>/` is where it installs in the consumer. */
function setupItem(name: string): RegistryItem {
  const { title, description, docs, dependencies, devDependencies } = describe(name);
  return {
    name,
    type: 'registry:item',
    title,
    description,
    ...(dependencies && { dependencies }),
    ...(devDependencies && { devDependencies }),
    files: filesUnder(join(STATIC_DIR, name)).map((path) => ({
      path: `static/${name}/${path}`,
      type: 'registry:file',
      target: `~/${path}`,
    })),
    docs,
  };
}

function requireTokenExports() {
  for (const name of TOKEN_EXPORTS) {
    if (!existsSync(join(TOKENS_DIST, name))) {
      throw new Error(`packages/tokens/dist/${name} is missing; run pnpm --filter @ultima/tokens build first`);
    }
  }
}

function requireElementExports() {
  if (!existsSync(join(ELEMENTS_DIST, 'ultima.js'))) {
    throw new Error(
      'packages/elements/dist/ultima.js is missing; run pnpm --filter @ultima/elements build first',
    );
  }
}

function elementNames(): string[] {
  return readdirSync(ELEMENTS_DIST)
    .filter((name) => name.startsWith('ult-') && name.endsWith('.js') && name !== 'ultima.js')
    .sort((a, b) => a.localeCompare(b))
    .map((name) => name.replace(/\.js$/, ''));
}

async function stageSources() {
  rmSync(STAGE_DIR, { recursive: true, force: true });
  mkdirSync(join(STAGE_DIR, 'ui'), { recursive: true });
  mkdirSync(join(STAGE_DIR, 'lib'), { recursive: true });
  mkdirSync(join(STAGE_DIR, 'elements'), { recursive: true });
  const tokensCss = await stamped('tokens-css', readFileSync(join(TOKENS_DIST, 'tokens.css'), 'utf8'), 'b1');
  writeFileSync(join(STAGE_DIR, 'tokens.css'), tokensCss.text);
  const elements = elementNames();
  for (const name of elements) {
    copyFileSync(join(ELEMENTS_DIST, `${name}.js`), join(STAGE_DIR, 'elements', `${name}.js`));
  }
  return {
    components: await stage(join(root, 'packages/ui/src'), '.tsx', 'ui', 'registry:ui'),
    tokens: await stage(join(root, 'packages/tokens/src'), '.ts', 'lib', 'registry:lib', 'tokens'),
    lib: await stage(join(root, 'packages/ui/src/lib'), '.ts', 'lib', 'registry:lib', 'lib'),
    elements,
    tokensCss,
  };
}

type Sources = Awaited<ReturnType<typeof stageSources>>;

function describeRegistry({ components, tokens, lib, elements, tokensCss }: Sources) {
  const registry = {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: 'ultima',
    homepage: HOMEPAGE,
    // Top-level `meta` is outside shadcn's registry schema, which tolerates it, and
    // `shadcn build` copies registry.json through verbatim when it has no `include`.
    meta: { ultima: { format: REGISTRY_FORMAT } },
    items: [
      item('tokens', 'registry:lib', tokens.map((staged) => staged.file), tokens),
      item('lib', 'registry:lib', lib.map((staged) => staged.file), lib),
      ...components.map((staged) => item(staged.name, 'registry:ui', [staged.file], [staged])),
      setupItem('setup-vite'),
      setupItem('setup-next'),
      item(
        'tokens-css',
        'registry:item',
        [{ path: 'ultima/tokens.css', type: 'registry:file', target: '~/ultima-tokens.css', hash: tokensCss.hash }],
        [],
      ),
      ...elements.map(vendoredElementItem),
    ],
  };
  for (const name of Object.keys(items)) {
    if (!described.has(name)) throw new Error(`registry/items.config.ts entry "${name}" has no file`);
  }
  return registry;
}

function shadcnBuild() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const name of readdirSync(OUTPUT_DIR)) {
    if (name.endsWith('.json')) rmSync(join(OUTPUT_DIR, name));
  }
  // `-c` is required: `shadcn build` resolves files[].path from the cwd, not
  // from the directory of the registry.json its error message names.
  execFileSync('npx', ['-y', SHADCN, 'build', 'registry.json', '-c', 'registry', '-o', '../apps/docs/public/r'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function publishExports({ components, elements, tokensCss }: Sources) {
  writeFileSync(join(PUBLIC_DIR, 'tokens.css'), tokensCss.text);
  copyFileSync(join(TOKENS_DIST, 'tokens.json'), join(PUBLIC_DIR, 'tokens.json'));
  const guide = agentGuide({
    specPath: SPEC,
    tokensJsonPath: join(TOKENS_DIST, 'tokens.json'),
    components: components.map(({ name, source }): GuideComponent => {
      const { title, description } = describe(name);
      return { name, title, description, source };
    }),
    elements: elements.map((name): GuideComponent => {
      const { title, description } = describe(name);
      return {
        name,
        title,
        description,
        source: readFileSync(join(ELEMENTS_SRC, `${name}.element.ts`), 'utf8'),
      };
    }),
  });
  writeFileSync(join(PUBLIC_DIR, 'llms.txt'), guide);
}

function publishElements() {
  rmSync(ELEMENTS_PUBLIC, { recursive: true, force: true });
  cpSync(ELEMENTS_DIST, ELEMENTS_PUBLIC, { recursive: true });
}

async function verifyStamps() {
  const check = async (label: string, text: string, item: string, expected?: string) => {
    const stamp = readStamp(text);
    const stamps = text.split('\n').filter((line) => readStamp(line)).length;
    const hash = stamp && (await contentHash(text, stamp.scheme as 'c1' | 'b1'));
    if (!stamp || stamps !== 1 || stamp.item !== item || hash !== `${stamp.scheme}:${stamp.hash}` || (expected && hash !== expected)) {
      throw new Error(`${label}: the item stamp is missing, repeated, misplaced, or disagrees with meta.ultima`);
    }
  };
  const catalogue = JSON.parse(readFileSync(join(OUTPUT_DIR, 'registry.json'), 'utf8'));
  if (catalogue.meta?.ultima?.format !== REGISTRY_FORMAT) throw new Error('/r/registry.json lost meta.ultima.format');
  for (const { name, meta } of catalogue.items as RegistryItem[]) {
    if (!meta) continue;
    const served = JSON.parse(readFileSync(join(OUTPUT_DIR, `${name}.json`), 'utf8'));
    for (const file of served.files as { path: string; content: string }[]) {
      const expected = meta.ultima.files[basename(file.path)];
      if (served.meta?.ultima?.files?.[basename(file.path)] !== expected) throw new Error(`/r/${name}.json lost meta.ultima`);
      await check(`/r/${name}.json ${file.path}`, file.content, name, expected);
    }
  }
  const tokensCss = (catalogue.items as RegistryItem[]).find((entry) => entry.name === 'tokens-css');
  await check('/tokens.css', readFileSync(join(PUBLIC_DIR, 'tokens.css'), 'utf8'), 'tokens-css', tokensCss?.meta?.ultima.files['tokens.css']);
  for (const file of readdirSync(ELEMENTS_PUBLIC).filter((name) => name.endsWith('.js'))) {
    const name = file.replace(/\.js$/, '');
    const element = (catalogue.items as RegistryItem[]).find((entry) => entry.name === name);
    const text = readFileSync(join(ELEMENTS_PUBLIC, file), 'utf8');
    await check(`/elements/${file}`, text, name === 'ultima' ? 'elements' : name, element?.meta?.ultima.files[file]);
  }
}

requireTokenExports();
requireElementExports();
const staged = await stageSources();
const registry = describeRegistry(staged);
writeFileSync(join(REGISTRY_DIR, 'registry.json'), `${JSON.stringify(registry, null, 2)}\n`);
shadcnBuild();
publishExports(staged);
publishElements();
await verifyStamps();

console.log(`registry: built ${registry.items.length} items into apps/docs/public/r`);
