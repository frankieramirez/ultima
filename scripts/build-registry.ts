/**
 * Generates the shadcn registry from the workspace, per the Registry and install
 * section of docs/spec/ultima.md. Everything under `registry/` except
 * `registry/static/` and `registry/items.config.ts` is output of this script.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
};

type Staged = { name: string; file: RegistryFile; source: string };

/** Checks every segment, so the exclusion holds even if the listing is widened to walk subdirectories. */
function isExcluded(relativePath: string): boolean {
  return relativePath
    .split('/')
    .some((segment) => NEVER_STAGE.has(segment) || /\.test\.tsx?$/.test(segment));
}

function stage(sourceDir: string, extension: string, destination: 'ui' | 'lib', type: string): Staged[] {
  const staged: Staged[] = [];
  for (const entry of readdirSync(sourceDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile() || !entry.name.endsWith(extension) || isExcluded(entry.name)) continue;
    const from = join(sourceDir, entry.name);
    const to = join(STAGE_DIR, destination, entry.name);
    if (existsSync(to)) throw new Error(`two sources stage to registry/ultima/${destination}/${entry.name}`);
    const source = readFileSync(from, 'utf8');
    writeFileSync(to, rewriteImports(source, from));
    staged.push({
      name: entry.name.replace(/\.tsx?$/, ''),
      file: { path: `ultima/${destination}/${entry.name}`, type },
      source,
    });
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

function item(name: string, type: string, files: RegistryFile[], staged: Staged[]): RegistryItem {
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
    files,
    docs,
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
  };
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

function stageSources() {
  rmSync(STAGE_DIR, { recursive: true, force: true });
  mkdirSync(join(STAGE_DIR, 'ui'), { recursive: true });
  mkdirSync(join(STAGE_DIR, 'lib'), { recursive: true });
  mkdirSync(join(STAGE_DIR, 'elements'), { recursive: true });
  copyFileSync(join(TOKENS_DIST, 'tokens.css'), join(STAGE_DIR, 'tokens.css'));
  const elements = elementNames();
  for (const name of elements) {
    copyFileSync(join(ELEMENTS_DIST, `${name}.js`), join(STAGE_DIR, 'elements', `${name}.js`));
  }
  return {
    components: stage(join(root, 'packages/ui/src'), '.tsx', 'ui', 'registry:ui'),
    tokens: stage(join(root, 'packages/tokens/src'), '.ts', 'lib', 'registry:lib'),
    lib: stage(join(root, 'packages/ui/src/lib'), '.ts', 'lib', 'registry:lib'),
    elements,
  };
}

function describeRegistry({ components, tokens, lib, elements }: ReturnType<typeof stageSources>) {
  const registry = {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: 'ultima',
    homepage: HOMEPAGE,
    items: [
      item('tokens', 'registry:lib', tokens.map((staged) => staged.file), tokens),
      item('lib', 'registry:lib', lib.map((staged) => staged.file), lib),
      ...components.map((staged) => item(staged.name, 'registry:ui', [staged.file], [staged])),
      setupItem('setup-vite'),
      setupItem('setup-next'),
      item(
        'tokens-css',
        'registry:item',
        [{ path: 'ultima/tokens.css', type: 'registry:file', target: '~/ultima-tokens.css' }],
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

function publishExports({ components, elements }: ReturnType<typeof stageSources>) {
  for (const name of TOKEN_EXPORTS) {
    copyFileSync(join(TOKENS_DIST, name), join(PUBLIC_DIR, name));
  }
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

requireTokenExports();
requireElementExports();
const staged = stageSources();
const registry = describeRegistry(staged);
writeFileSync(join(REGISTRY_DIR, 'registry.json'), `${JSON.stringify(registry, null, 2)}\n`);
shadcnBuild();
publishExports(staged);
publishElements();

console.log(`registry: built ${registry.items.length} items into apps/docs/public/r`);
