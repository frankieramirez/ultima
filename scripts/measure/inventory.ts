/**
 * Snapshots the public outputs later slices must preserve: exports, routes,
 * catalogue and release order, registry prose and dependencies, element docs, the
 * browser optimizer lists, and the existing command and check inventory.
 *
 *   pnpm registry:build
 *   node --experimental-strip-types scripts/measure/inventory.ts --out <dir>
 *
 * It reads the built registry rather than building it, so it fails when that output
 * is absent instead of snapshotting a stale or partial one.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { components, RELEASES } from '../../apps/docs/src/components.ts';
import { elements } from '../../apps/docs/src/elements.ts';
import { items, setupItems } from '../../registry/items.config.ts';
import { sha256, sourceIdentity } from './identity.ts';
import { SCHEMA_VERSION } from './protocol.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(join(root, 'package.json'));
const ts = require('typescript') as typeof import('typescript');

const { values } = parseArgs({ options: { out: { type: 'string' } } });
if (!values.out) {
  console.error('usage: inventory.ts --out <dir>');
  process.exit(2);
}
const out = resolve(values.out);
mkdirSync(out, { recursive: true });

const read = (path: string) => readFileSync(join(root, path), 'utf8');
const json = <T>(path: string) => JSON.parse(read(path)) as T;

const registryPath = 'registry/registry.json';
if (!existsSync(join(root, registryPath))) {
  console.error(`${registryPath} is absent: run pnpm registry:build first`);
  process.exit(1);
}

type Manifest = { name: string; exports?: unknown; scripts?: Record<string, string>; dependencies?: Record<string, string> };
const PACKAGES = ['.', 'packages/tokens', 'packages/ui', 'packages/elements', 'packages/cli', 'apps/docs'];

function exportedSymbols(entries: string[], tsconfig: string) {
  const config = ts.getParsedCommandLineOfConfigFile(join(root, tsconfig), {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    },
  });
  if (!config) throw new Error(`cannot read ${tsconfig}`);
  const program = ts.createProgram(entries.map((entry) => join(root, entry)), config.options);
  const checker = program.getTypeChecker();
  return Object.fromEntries(
    entries.map((entry) => {
      const file = program.getSourceFile(join(root, entry));
      const symbol = file && checker.getSymbolAtLocation(file);
      if (!symbol) throw new Error(`no module symbol for ${entry}`);
      const symbols = checker.getExportsOfModule(symbol).map((exported) => {
        const target = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
        const value = (target.flags & ts.SymbolFlags.Value) !== 0;
        const type = (target.flags & (ts.SymbolFlags.Type | ts.SymbolFlags.Namespace)) !== 0;
        return { name: exported.name, value, type };
      });
      return [entry, symbols.sort((a, b) => a.name.localeCompare(b.name))];
    }),
  );
}

const uiSources = readdirSync(join(root, 'packages/ui/src'))
  .filter((name) => name.endsWith('.tsx'))
  .sort()
  .map((name) => `packages/ui/src/${name}`);

const exportsSnapshot = {
  packageExports: Object.fromEntries(
    PACKAGES.map((dir) => {
      const manifest = json<Manifest>(join(dir, 'package.json'));
      return [manifest.name, manifest.exports ?? null];
    }),
  ),
  symbols: {
    ...exportedSymbols(['packages/ui/src/index.ts', 'packages/ui/src/lib/component.ts', 'packages/ui/src/lib/visually-hidden.ts', ...uiSources], 'packages/ui/tsconfig.json'),
    ...exportedSymbols(['packages/tokens/src/index.ts'], 'packages/tokens/tsconfig.json'),
  },
};

const dependents = Object.fromEntries(
  uiSources.map((source) => {
    const name = source.slice('packages/ui/src/'.length, -'.tsx'.length);
    const importers = uiSources.filter((other) => other !== source && new RegExp(`from ['"]@ultima/ui/${name}['"]`).test(read(other)));
    return [name, importers.map((path) => path.slice('packages/ui/src/'.length, -'.tsx'.length))];
  }),
);

const router = read('apps/docs/src/router.tsx');
const writtenPages = [...(router.match(/const writtenPages[\s\S]*?\n};/)?.[0] ?? '').matchAll(/^\s+'?([a-z-]+)'?: \w+Content,$/gm)].map(
  (match) => match[1]!,
);
const routesSnapshot = {
  staticPaths: [...router.matchAll(/path: '([^']+)'/g)].map((match) => match[1]!),
  componentPages: components.map((entry) => ({
    path: `/components/${entry.item}`,
    item: entry.item,
    page: writtenPages.includes(entry.item) ? 'written' : 'placeholder',
  })),
  writtenPagesWithoutCatalogueEntry: writtenPages.filter((page) => !components.some((entry) => entry.item === page)),
  mdxContent: readdirSync(join(root, 'apps/docs/src/content/components')).sort(),
  demoDirectories: readdirSync(join(root, 'apps/docs/src/demos')).sort(),
  staticFiles: readdirSync(join(root, 'apps/docs/public')).sort(),
};

type RegistryItem = {
  name: string;
  type: string;
  title?: string;
  description?: string;
  docs?: string;
  dependencies?: string[];
  devDependencies?: string[];
  registryDependencies?: string[];
  files?: { path: string; type: string; target?: string }[];
};
const registry = json<{ items: RegistryItem[] }>(registryPath);
const registrySnapshot = {
  order: registry.items.map((item) => item.name),
  items: registry.items.map((item) => ({
    name: item.name,
    type: item.type,
    title: item.title ?? null,
    description: item.description ?? null,
    docsSha256: item.docs ? sha256(item.docs) : null,
    docs: item.docs ?? null,
    dependencies: item.dependencies ?? [],
    devDependencies: item.devDependencies ?? [],
    registryDependencies: item.registryDependencies ?? [],
    files: (item.files ?? []).map((file) => ({ path: file.path, type: file.type, target: file.target ?? null })),
  })),
  authoredDescriptions: Object.keys(items),
  setupItems: Object.keys(setupItems),
  served: readdirSync(join(root, 'apps/docs/public/r')).filter((name) => name.endsWith('.json')).sort(),
  llmsTxtSha256: existsSync(join(root, 'apps/docs/public/llms.txt')) ? sha256(read('apps/docs/public/llms.txt')) : null,
};

const catalogueSnapshot = {
  releases: RELEASES,
  components: components.map((entry, index) => ({ index, ...entry })),
  elements: elements.map((entry, index) => ({ index, item: entry.item, tag: entry.tag, tags: entry.tags })),
  uiDependents: dependents,
};

const elementSources = readdirSync(join(root, 'packages/elements/src')).filter((name) => name.endsWith('.element.ts')).sort();
const elementsSnapshot = {
  docsEntries: elements,
  definedTags: elementSources.map((file) => ({
    file: `packages/elements/src/${file}`,
    tags: [...read(`packages/elements/src/${file}`).matchAll(/customElements\.define\('([^']+)'/g)].map((match) => match[1]!),
  })),
  fixture: { path: 'apps/docs/public/elements.html', sha256: sha256(read('apps/docs/public/elements.html')) },
  servedBundles: existsSync(join(root, 'apps/docs/public/elements')) ? readdirSync(join(root, 'apps/docs/public/elements')).sort() : [],
};

const optimizeInclude = (path: string) =>
  [...(read(path).match(/optimizeDeps:\s*{\s*include:\s*\[([\s\S]*?)\]/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1]!);
const optimizerSnapshot = {
  'apps/docs/vitest.config.ts': optimizeInclude('apps/docs/vitest.config.ts'),
  'packages/ui/vitest.config.ts': optimizeInclude('packages/ui/vitest.config.ts'),
  'apps/docs/vite.config.ts': optimizeInclude('apps/docs/vite.config.ts'),
};

const workflows = readdirSync(join(root, '.github/workflows')).sort();
const testFiles = (dir: string) =>
  readdirSync(join(root, dir), { recursive: true, encoding: 'utf8' })
    .filter((name) => /\.test\.tsx?$/.test(name))
    .sort()
    .map((name) => `${dir}/${name}`);
const commandsSnapshot = {
  scripts: Object.fromEntries(
    PACKAGES.map((dir) => {
      const manifest = json<Manifest>(join(dir, 'package.json'));
      return [manifest.name, manifest.scripts ?? {}];
    }),
  ),
  workflows: Object.fromEntries(
    workflows.map((file) => {
      const text = read(`.github/workflows/${file}`);
      return [
        file,
        {
          sha256: sha256(text),
          timeouts: [...text.matchAll(/timeout-minutes: (\d+)/g)].map((match) => Number(match[1])),
          text,
        },
      ];
    }),
  ),
  testFiles: {
    'packages/ui': testFiles('packages/ui/src/__tests__'),
    'packages/tokens': testFiles('packages/tokens/src/__tests__'),
    'packages/elements': testFiles('packages/elements/src/__tests__'),
    'packages/cli': testFiles('packages/cli/src/__tests__'),
    'apps/docs': testFiles('apps/docs/src/__tests__'),
  },
  otherChecks: ['python3 packages/tokens/scripts/palette.py --check', 'scripts/smoke-install.sh [--host <url>] [--keep]'],
  plannedButAbsent: ['pnpm verify', 'pnpm check:architecture', 'catalogue generation and freshness', 'component scaffolding', 'production browser runner'],
};

const snapshots = {
  exports: exportsSnapshot,
  routes: routesSnapshot,
  catalogue: catalogueSnapshot,
  registry: registrySnapshot,
  elements: elementsSnapshot,
  optimizer: optimizerSnapshot,
  commands: commandsSnapshot,
};

const source = sourceIdentity(root);
const index: Record<string, string> = {};
for (const [name, data] of Object.entries(snapshots)) {
  const text = `${JSON.stringify({ schemaVersion: SCHEMA_VERSION, snapshot: name, commit: source.commit, data }, null, 2)}\n`;
  writeFileSync(join(out, `${name}.json`), text);
  index[name] = sha256(text);
}
writeFileSync(join(out, 'index.json'), `${JSON.stringify({ schemaVersion: SCHEMA_VERSION, source, snapshots: index }, null, 2)}\n`);
console.log(`wrote ${Object.keys(snapshots).length} snapshots to ${out}`);
