/**
 * Generates the shadcn registry from the workspace, per the Registry and install
 * section of docs/spec/ultima.md. Items, prose and dependencies come from the
 * catalogue model over `registry/metadata/`. Everything under `registry/` except
 * `registry/static/`, `registry/metadata/` and the generated `registry/items.config.ts`
 * is output of this script.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BASE_THEME, BASE_THEME_MARKER } from '../packages/cli/src/base-theme.ts';
import {
  REGISTRY_FORMAT,
  catalogueRevision,
  contentHash,
  readStamp,
  stampLine,
  withStamp,
} from '../packages/cli/src/stamp.ts';
import type { SetupDescriptor } from '../registry/metadata/schema.ts';
import { markedFiles } from './catalogue/anatomy-guard.ts';
import { agentGuide, type GuideBlock, type GuideComponent } from './build-agent-guide.ts';
import { ordinal } from './catalogue/browser.ts';
import { diskFiles } from './catalogue/files.ts';
import { compositionProjection } from './catalogue/compositions.ts';
import { formatDiagnostics, loadCatalogue } from './catalogue/model.ts';
import { registryUrl } from './catalogue/projections.ts';
import { type StagedSource, registryPlan, stagedSources, stagedSpecifier } from './catalogue/staging.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const REGISTRY_DIR = join(root, 'registry');
const STAGE_DIR = join(REGISTRY_DIR, 'ultima');
const STATIC_DIR = join(REGISTRY_DIR, 'static');
const PUBLIC_DIR = join(root, 'apps/docs/public');
const OUTPUT_DIR = join(PUBLIC_DIR, 'r');
const SPEC = join(root, 'docs/spec/ultima.md');
const TOKENS_DIST = join(root, 'packages/tokens/dist');
const TOKEN_EXPORTS = ['tokens.css', 'tokens.json', 'DESIGN.md'];
const ELEMENTS_DIST = join(root, 'packages/elements/dist');
const ELEMENTS_SRC = join(root, 'packages/elements/src');
const ELEMENTS_PUBLIC = join(PUBLIC_DIR, 'elements');

const HOMEPAGE = 'https://ultima.systems';
const SHADCN = 'shadcn@4.21.0';

type RegistryFile = { path: string; type: string; target?: string };

type HashedFile = RegistryFile & { hash: string };

type Meta = { ultima: { revision: string; files: Record<string, string>; baseTheme?: string } };

type RegistryItem = {
  name: string;
  type: string;
  title: string;
  description: string;
  categories?: string[];
  dependencies?: string[];
  devDependencies?: string[];
  registryDependencies?: string[];
  files: RegistryFile[];
  docs: string;
  meta?: Meta;
};

type Staged = { name: string; file: HashedFile; source: string };

const revision = catalogueRevision(root);

const files = diskFiles(root);
const { catalogue, diagnostics } = loadCatalogue(files);
if (diagnostics.length > 0) throw new Error(`the catalogue under registry/metadata/ is invalid:\n${formatDiagnostics(diagnostics)}`);

type Description = {
  title: string;
  description: string;
  docs: string;
  dependencies: string[];
  /** Blocks only: the type packages of their engines. */
  devDependencies?: string[];
  registryDependencies: string[];
  /** React items only: shadcn's own field, holding the item's catalogue group. */
  categories?: string[];
};

const descriptions = new Map<string, Description>([
  ...catalogue.sourceBundles.map((entry): [string, Description] => [
    entry.id,
    { ...entry, docs: entry.installDocs, registryDependencies: entry.registryDependencies.map((id) => `@ultima/${id}`) },
  ]),
  ...catalogue.react.map((entry): [string, Description] => [
    entry.id,
    {
      ...entry,
      docs: entry.installDocs,
      registryDependencies: entry.registryDependencies.map((id) => `@ultima/${id}`),
      categories: [entry.group],
    },
  ]),
  ...catalogue.artifacts.map((entry): [string, Description] => [
    entry.id,
    { ...entry, docs: entry.installDocs, dependencies: [], registryDependencies: [] },
  ]),
  ...catalogue.elements.map((entry): [string, Description] => [
    entry.id,
    { ...entry, docs: entry.installDocs, dependencies: [], registryDependencies: entry.registryDependencies.map(registryUrl) },
  ]),
  ...catalogue.blocks.map((entry): [string, Description] => [
    entry.id,
    { ...entry, docs: entry.installDocs, registryDependencies: entry.registryDependencies.map((id) => `@ultima/${id}`) },
  ]),
]);

async function stamped(item: string, text: string, scheme: 'c1' | 'b1') {
  if (item === 'tokens' || item === 'tokens-css') text = withStamp(text, scheme === 'c1' ? `// ${BASE_THEME_MARKER}` : `/* ${BASE_THEME_MARKER} */`);
  const hash = await contentHash(text, scheme);
  return { hash, text: withStamp(text, stampLine(item, revision, hash, scheme === 'c1' ? 'ts' : 'css')) };
}

function meta(files: { path: string; hash: string }[], baseTheme?: string): Meta {
  return { ultima: { revision, files: Object.fromEntries(files.map(({ path, hash }) => [basename(path), hash])), ...(baseTheme && { baseTheme }) } };
}

async function stage(sources: StagedSource[]): Promise<Staged[]> {
  const staged: Staged[] = [];
  for (const { source: path, item, staged: to, type, target } of sources) {
    const source = readFileSync(join(root, path), 'utf8');
    const name = basename(path).replace(/\.tsx?$/, '');
    const { hash, text } = await stamped(item, rewriteImports(source, path), 'c1');
    mkdirSync(dirname(join(REGISTRY_DIR, to)), { recursive: true });
    writeFileSync(join(REGISTRY_DIR, to), text);
    staged.push({ name, file: { path: to, type, ...(target && { target }), hash }, source });
  }
  return staged;
}

/**
 * The workspace specifiers Ultima authors against become the `@/registry` ones
 * shadcn rewrites to the consumer's aliases on install.
 */
function rewriteSpecifier(specifier: string, file: string): string {
  const rewritten = stagedSpecifier(specifier);
  if (rewritten === undefined) throw new Error(`${file} imports "${specifier}", a barrel that is never staged; import the module directly`);
  return rewritten;
}

function rewriteImports(source: string, file: string): string {
  return source.replace(
    /(['"])(@ultima\/[^'"]*)\1/g,
    (_match, quote: string, specifier: string) => `${quote}${rewriteSpecifier(specifier, file)}${quote}`,
  );
}

const described = new Set<string>();

function describe(name: string): Description {
  const entry = descriptions.get(name);
  if (!entry) throw new Error(`registry/metadata/ has no installable descriptor for "${name}"`);
  described.add(name);
  return entry;
}

function item(name: string, type: string, files: HashedFile[]): RegistryItem {
  const { title, description, docs, dependencies, devDependencies = [], registryDependencies, categories } = describe(name);
  return {
    name,
    type,
    title,
    description,
    ...(categories && { categories }),
    ...(dependencies.length > 0 && { dependencies }),
    ...(devDependencies.length > 0 && { devDependencies }),
    ...(registryDependencies.length > 0 && { registryDependencies }),
    files: files.map(({ hash: _, ...file }) => file),
    docs,
    meta: meta(files, name === 'tokens' || name === 'tokens-css' ? BASE_THEME : undefined),
  };
}

function vendoredElementItem(name: string): RegistryItem {
  const { title, description, docs, registryDependencies } = describe(name);
  return {
    name,
    type: 'registry:item',
    title,
    description,
    ...(registryDependencies.length > 0 && { registryDependencies }),
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

function handStepDocs(handSteps: SetupDescriptor['handSteps']): string {
  const steps = handSteps.map(({ prose }, index) => `${index + 1}. ${prose}`);
  return ['Steps you still do by hand:', ...steps, '', 'Then: npx shadcn add @ultima/button'].join('\n');
}

function setupItem(name: string): RegistryItem {
  const setup = catalogue.setup.find((entry) => entry.id === name);
  if (!setup) throw new Error(`registry/metadata/setup/ has no "${name}" descriptor`);
  described.add(name);
  const { title, description, dependencies, devDependencies, handSteps } = setup;
  return {
    name,
    type: 'registry:item',
    title,
    description,
    dependencies,
    devDependencies,
    files: setup.files.map(({ path, type, target }) => ({ path: `static/${name}/${path}`, type, target })),
    docs: handStepDocs(handSteps),
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
  const names = catalogue.elements.map((entry) => entry.id).sort((a, b) => a.localeCompare(b));
  for (const name of names) {
    if (!existsSync(join(ELEMENTS_DIST, `${name}.js`))) {
      throw new Error(`packages/elements/dist/${name}.js is missing; run pnpm --filter @ultima/elements build first`);
    }
  }
  return names;
}

async function stageSources() {
  rmSync(STAGE_DIR, { recursive: true, force: true });
  mkdirSync(join(STAGE_DIR, 'ui'), { recursive: true });
  mkdirSync(join(STAGE_DIR, 'lib'), { recursive: true });
  mkdirSync(join(STAGE_DIR, 'elements'), { recursive: true });
  const tokensCss = await stamped('tokens-css', readFileSync(join(TOKENS_DIST, 'tokens.css'), 'utf8'), 'b1');
  writeFileSync(join(STAGE_DIR, 'tokens.css'), tokensCss.text);
  copyFileSync(join(TOKENS_DIST, 'DESIGN.md'), join(STAGE_DIR, 'DESIGN.md'));
  const elements = elementNames();
  for (const name of elements) {
    copyFileSync(join(ELEMENTS_DIST, `${name}.js`), join(STAGE_DIR, 'elements', `${name}.js`));
  }
  const { sources, collisions } = stagedSources(files);
  for (const collision of collisions) {
    throw new Error(`${collision.source} and ${collision.with} both stage to registry/${collision.staged}`);
  }
  const all = await stage(sources);
  const of = (item: string) => all.filter((_, index) => (sources[index] as StagedSource).item === item);
  return {
    sources,
    components: all.filter((_, index) => (sources[index] as StagedSource).type === 'registry:ui'),
    blocks: catalogue.blocks.map(({ id }) => of(id)),
    tokens: of('tokens'),
    lib: of('lib'),
    elements,
    tokensCss,
  };
}

type Sources = Awaited<ReturnType<typeof stageSources>>;

function describeRegistry({ sources, components, blocks, tokens, lib, elements, tokensCss }: Sources) {
  const staged = new Map([...components.map((entry): [string, HashedFile[]] => [entry.name, [entry.file]])]);
  staged.set('tokens', tokens.map((entry) => entry.file));
  staged.set('lib', lib.map((entry) => entry.file));
  catalogue.blocks.forEach(({ id }, index) => staged.set(id, (blocks[index] ?? []).map((entry) => entry.file)));
  const registry = {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: 'ultima',
    homepage: HOMEPAGE,
    // Top-level `meta` is outside shadcn's registry schema, which tolerates it, and
    // `shadcn build` copies registry.json through verbatim when it has no `include`.
    meta: { ultima: { format: REGISTRY_FORMAT } },
    items: registryPlan(sources, elements).map(({ name, from }) => {
      if (from === 'setup') return setupItem(name);
      if (from === 'block') return item(name, 'registry:block', staged.get(name) ?? []);
      if (from === 'element') return vendoredElementItem(name);
      if (from === 'artifact') {
        if (name === 'design-md') {
          const { title, description, docs } = describe(name);
          return {
            name,
            type: 'registry:item',
            title,
            description,
            docs,
            files: [{ path: 'ultima/DESIGN.md', type: 'registry:file', target: '~/DESIGN.md' }],
          };
        }
        return item(name, 'registry:item', [
          { path: 'ultima/tokens.css', type: 'registry:file', target: '~/ultima-tokens.css', hash: tokensCss.hash },
        ]);
      }
      return item(name, name === 'tokens' || name === 'lib' ? 'registry:lib' : 'registry:ui', staged.get(name) ?? []);
    }),
  };
  for (const name of catalogue.registryItems) {
    if (!described.has(name)) throw new Error(`registry/metadata/ item "${name}" has no file`);
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
  const composition = compositionProjection(files, catalogue);
  if (composition.diagnostics.length > 0) throw new Error(formatDiagnostics(composition.diagnostics));
  const guide = agentGuide({
    specPath: SPEC,
    tokensJsonPath: join(TOKENS_DIST, 'tokens.json'),
    recipes: composition.recipes,
    examples: composition.examples,
    groups: catalogue.groups.map(({ id, label }) => ({
      label,
      components: components
        .filter(({ name }) => catalogue.react.find((entry) => entry.id === name)?.group === id)
        .sort((a, b) => ordinal(a.name, b.name))
        .map(({ name, source }): GuideComponent => {
          const { title, description } = describe(name);
          return { name, title, description, source, primaryExport: catalogue.react.find((entry) => entry.id === name)!.primaryExport };
        }),
    })),
    elements: elements.map((name): GuideComponent => {
      const { title, description } = describe(name);
      return {
        name,
        title,
        description,
        source: readFileSync(join(ELEMENTS_SRC, `${name}.element.ts`), 'utf8'),
      };
    }),
    blocks: catalogue.blocks.map(
      ({ id, title, description, primaryExport, builtFrom }): GuideBlock => ({
        name: id,
        title,
        description,
        primaryExport,
        builtFrom: builtFrom.map((entry) => entry.title),
      }),
    ),
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

function verifyUnmarked() {
  const marked = markedFiles(PUBLIC_DIR);
  if (marked.length > 0) {
    throw new Error(`${marked.map((path) => path.slice(root.length + 1)).join(', ')} carries a data-anatomy mark; Anatomy marks only what the docs imports`);
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
verifyUnmarked();

console.log(`registry: built ${registry.items.length} items into apps/docs/public/r`);
