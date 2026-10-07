import { posix } from 'node:path';

import type {
  ArtifactDescriptor,
  BlockDescriptor,
  Descriptor,
  ElementDescriptor,
  Group,
  ReactDescriptor,
  RecipeDescriptor,
  Release,
  SetupDescriptor,
  SourceBundleDescriptor,
} from '../../registry/metadata/schema.ts';
import { KINDS, type Kind, groupProblems, readLiteral, releaseProblems, shapeProblems } from './descriptors.ts';
import { ordinal } from './browser.ts';
import type { Files } from './files.ts';
import {
  type Export,
  type Import,
  exportsOf,
  headingAnchors,
  importsOf,
  mdxImports,
  parse,
  registeredTags,
  stringTable,
} from './source.ts';

export type DiagnosticCode =
  | 'not-data'
  | 'invalid-descriptor'
  | 'unexpected-descriptor'
  | 'duplicate-id'
  | 'duplicate-order'
  | 'unknown-release'
  | 'unknown-group'
  | 'broken-anchor'
  | 'path-outside'
  | 'missing-file'
  | 'source-without-metadata'
  | 'missing-reference'
  | 'invalid-primary-export'
  | 'invalid-export'
  | 'duplicate-export'
  | 'unresolved-import'
  | 'tooling-import'
  | 'dependency-cycle'
  | 'tag-mismatch'
  | 'invalid-enum-reference'
  | 'demo-not-on-page'
  | 'unresolved-dependency'
  | 'stale-policy';

export type Diagnostic = { code: DiagnosticCode; path: string; message: string };

export function formatDiagnostics(diagnostics: Diagnostic[]): string {
  return diagnostics.map((d) => `  ${d.code} ${d.path}: ${d.message}`).join('\n');
}

export type Dependencies = {
  /** npm packages, sorted. */
  dependencies: string[];
  /** Registry item IDs, tokens and lib first. */
  registryDependencies: string[];
};

export type ReactEntry = ReactDescriptor &
  Dependencies & {
    source: string;
    page: string;
    test: string;
    demos: string;
    exports: Export[];
    imports: Import[];
    number: string;
  };

export type ElementEntry = Omit<ElementDescriptor, 'attributes'> & {
  source: string;
  test: string;
  /** `values` is the source table a `symbol` names, or the authored text. */
  attributes: { names: string[]; on: string; values: readonly string[] | string }[];
};

export type SourceBundleEntry = SourceBundleDescriptor & Dependencies & { sources: string[] };

/** What a consumer installs to run the recipe's demos: registry items and npm packages. */
export type RecipeEntry = RecipeDescriptor & Dependencies;

/** A component the block imports or a recipe it follows, with its catalogue number among its own kind. */
export type BuiltFrom = { id: string; title: string; number: string; kind: 'component' | 'recipe' };

export type BlockEntry = BlockDescriptor &
  Dependencies & {
    number: string;
    /** `packages/blocks/src/<id>`. */
    directory: string;
    /** The block's file names, the entry `<id>.tsx` first, then alphabetically; each installs to `@components/<id>/<name>`. */
    files: string[];
    test: string;
    /** The components it imports in number order, then the recipes it follows in number order. */
    builtFrom: BuiltFrom[];
  };

export type Catalogue = {
  releases: Release[];
  /** In display order. */
  groups: Group[];
  /** In docs order: release position, then `order`. */
  react: ReactEntry[];
  /** In docs family order. */
  elements: ElementEntry[];
  setup: SetupDescriptor[];
  sourceBundles: SourceBundleEntry[];
  artifacts: ArtifactDescriptor[];
  recipes: RecipeEntry[];
  /** In number order. */
  blocks: BlockEntry[];
  /** The UI barrel's plan: each public name and the React item whose file exports it. */
  exports: Map<string, Export & { item: string }>;
  /** Every installable record. Recipes are never among them. */
  registryItems: string[];
  /** React items only; a recipe lives on its page's section. */
  componentRoutes: string[];
};

const METADATA = 'registry/metadata';
const UI_SOURCE = 'packages/ui/src';
const UI_TESTS = 'packages/ui/src/__tests__';
const PAGES = 'apps/docs/src/content/components';
const DEMOS = 'apps/docs/src/demos';
const ELEMENT_SOURCE = 'packages/elements/src';
const ELEMENT_TESTS = 'packages/elements/src/__tests__';
const STATIC = 'registry/static';
export const BLOCK_SOURCE = 'packages/blocks/src';
const BLOCK_TESTS = 'packages/blocks/src/__tests__';
export const BARREL = 'packages/ui/src/index.ts';

const INVENTORIES = {
  tokens: { directory: 'packages/tokens/src', specifier: '@ultima/tokens/' },
  lib: { directory: 'packages/ui/src/lib', specifier: '@ultima/ui/lib/' },
} as const;

const ARTIFACT_OUTPUTS = { 'tokens-build': 'packages/tokens/dist/' } as const;

const PROVIDED_BY_CONSUMER = new Set(['react', 'react-dom']);

const DEPENDENCY_ORDER = ['tokens', 'lib'];

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const ATTRIBUTE = /^[a-z][a-z0-9-]*$/;

function packageName(specifier: string): string {
  const segments = specifier.split('/');
  return specifier.startsWith('@') ? segments.slice(0, 2).join('/') : (segments[0] as string);
}

function registryOrder(ids: Iterable<string>): string[] {
  const rank = (id: string) => (DEPENDENCY_ORDER.includes(id) ? DEPENDENCY_ORDER.indexOf(id) : DEPENDENCY_ORDER.length);
  return [...new Set(ids)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/**
 * The catalogue number of each id: its position in code-unit id order, padded to three digits. It is a
 * display ordinal that shifts when an item is added, never an identity. Each kind numbers separately.
 */
export function catalogueNumbers(ids: readonly string[]): Map<string, string> {
  return new Map([...ids].sort(ordinal).map((id, index) => [id, String(index + 1).padStart(3, '0')]));
}

function isSafeRepositoryPath(path: string): boolean {
  return path !== '' && !path.startsWith('/') && !path.includes('\\') && posix.normalize(path) === path && !path.startsWith('..');
}

export function loadCatalogue(files: Files): { catalogue: Catalogue; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const report = (code: DiagnosticCode, path: string, message: string) => diagnostics.push({ code, path, message });

  const anchorCache = new Map<string, Set<string> | undefined>();
  const anchorsOf = (path: string) => {
    if (!anchorCache.has(path)) {
      const text = files.read(path);
      anchorCache.set(path, text === undefined ? undefined : headingAnchors(text));
    }
    return anchorCache.get(path);
  };

  const filesIn = (directory: string, extension: string) =>
    (files.list(directory) ?? []).filter((entry) => !entry.directory && entry.name.endsWith(extension)).map((entry) => entry.name);

  const filesUnder = (directory: string, prefix = ''): string[] =>
    (files.list(directory) ?? []).flatMap((entry) => {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      return entry.directory ? filesUnder(`${directory}/${entry.name}`, path) : [path];
    });

  const resolveRelative = (from: string, specifier: string): string => {
    const base = posix.normalize(posix.join(posix.dirname(from), specifier));
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
      if (files.read(candidate) !== undefined) return candidate;
    }
    return base;
  };

  const definitions = <T extends { id: string }>(name: 'release' | 'group', check: (value: unknown) => string[]): T[] => {
    const path = `${METADATA}/${name}s.ts`;
    const text = files.read(path);
    let defined: T[] = [];
    if (text === undefined) report('missing-file', path, `the ${name} definitions are missing`);
    else {
      const { value, problems } = readLiteral(path, text);
      for (const problem of problems) report('not-data', path, problem);
      const shape = problems.length === 0 ? check(value) : [];
      for (const problem of shape) report('invalid-descriptor', path, problem);
      if (problems.length === 0 && shape.length === 0) defined = value as T[];
    }
    defined.forEach(({ id }, index) => {
      if (defined.findIndex((entry) => entry.id === id) !== index) report('duplicate-id', path, `${name} "${id}" is defined twice`);
    });
    return defined;
  };
  const releases = definitions<Release>('release', releaseProblems);
  const releaseIds = releases.map((release) => release.id);
  const groups = definitions<Group>('group', groupProblems);
  const groupIds = groups.map((group) => group.id);

  const loaded: { path: string; descriptor: Descriptor }[] = [];
  for (const entry of files.list(METADATA) ?? []) {
    const path = `${METADATA}/${entry.name}`;
    if (!entry.directory) {
      if (!['schema.ts', 'releases.ts', 'groups.ts'].includes(entry.name)) {
        report('unexpected-descriptor', path, 'metadata holds schema.ts, releases.ts, groups.ts and one directory per kind');
      }
      continue;
    }
    if (!(KINDS as readonly string[]).includes(entry.name)) {
      report('unexpected-descriptor', path, `"${entry.name}" is not a kind: ${KINDS.join(', ')}`);
      continue;
    }
    const kind = entry.name as Kind;
    for (const file of files.list(path) ?? []) {
      const filePath = `${path}/${file.name}`;
      if (file.directory || !file.name.endsWith('.ts')) {
        report('unexpected-descriptor', filePath, 'a descriptor is one .ts file named for its id');
        continue;
      }
      const { value, problems } = readLiteral(filePath, files.read(filePath) as string);
      for (const problem of problems) report('not-data', filePath, problem);
      if (problems.length > 0) continue;
      const declared = (value as { kind?: unknown } | undefined)?.kind;
      if (declared !== kind) {
        report('invalid-descriptor', filePath, `kind "${String(declared)}" sits under ${kind}/`);
        continue;
      }
      const shape = shapeProblems(kind, value);
      for (const problem of shape) report('invalid-descriptor', filePath, problem);
      if (shape.length > 0) continue;
      const descriptor = value as Descriptor;
      const id = file.name.replace(/\.ts$/, '');
      if (descriptor.id !== id) report('invalid-descriptor', filePath, `id "${descriptor.id}" does not match the file name`);
      else if (!KEBAB.test(id)) report('invalid-descriptor', filePath, `id "${id}" is not kebab-case`);
      else loaded.push({ path: filePath, descriptor });
    }
  }

  const byId = new Map<string, { path: string; descriptor: Descriptor }>();
  for (const record of loaded) {
    const earlier = byId.get(record.descriptor.id);
    if (earlier) report('duplicate-id', record.path, `id "${record.descriptor.id}" is also ${earlier.path}`);
    else byId.set(record.descriptor.id, record);
  }
  const records = [...byId.values()];
  const pathOf = (id: string) => byId.get(id)?.path ?? METADATA;
  const ofKind = <K extends Descriptor['kind']>(kind: K) =>
    records.map((record) => record.descriptor).filter((d): d is Extract<Descriptor, { kind: K }> => d.kind === kind);

  for (const { path, descriptor } of records) {
    const match = /^(docs\/spec\/[a-z0-9-]+\.md)#(.+)$/.exec(descriptor.contract);
    if (!match) report('broken-anchor', path, `contract "${descriptor.contract}" is not docs/spec/<file>.md#<anchor>`);
    else if (!anchorsOf(match[1] as string)) report('broken-anchor', path, `${match[1]} does not exist`);
    else if (!anchorsOf(match[1] as string)?.has(match[2] as string)) {
      report('broken-anchor', path, `${match[1]} has no heading #${match[2]}`);
    }
  }

  const checkOrder = (items: { id: string; order: number; group: string }[]) => {
    const taken = new Map<string, string>();
    for (const { id, order, group } of items) {
      const key = `${group}\u0000${order}`;
      const holder = taken.get(key);
      if (holder) report('duplicate-order', pathOf(id), `order ${order} in ${group} is also "${holder}"`);
      else taken.set(key, id);
    }
  };

  const reactIds = new Set(ofKind('react').map((d) => d.id));

  const inventorySources = (inventory: keyof typeof INVENTORIES) => {
    const { directory } = INVENTORIES[inventory];
    return filesIn(directory, '.ts')
      .filter((name) => name !== 'index.ts' && !/\.test\.tsx?$/.test(name))
      .map((name) => `${directory}/${name}`);
  };

  const registryItemFor = (specifier: string): string | undefined => {
    for (const [inventory, { specifier: prefix }] of Object.entries(INVENTORIES)) {
      if (!specifier.startsWith(prefix)) continue;
      const file = `${INVENTORIES[inventory as keyof typeof INVENTORIES].directory}/${specifier.slice(prefix.length)}.ts`;
      return inventorySources(inventory as keyof typeof INVENTORIES).includes(file) ? inventory : undefined;
    }
    const name = specifier.slice('@ultima/ui/'.length);
    return specifier.startsWith('@ultima/ui/') && reactIds.has(name) ? name : undefined;
  };

  const isTooling = (specifier: string) =>
    specifier === 'typescript' || /(^|\/)(registry\/metadata|scripts)(\/|$)/.test(specifier);

  const installDependenciesOf = (path: string, imports: Import[], ownSources: string[] = []): Dependencies => {
    const dependencies = new Set<string>();
    const registry = new Set<string>();
    for (const { specifier, line } of imports) {
      const where = `${path}:${line}`;
      if (specifier.startsWith('.')) {
        const resolved = resolveRelative(path, specifier);
        if (isTooling(resolved)) report('tooling-import', where, `"${specifier}" reaches contributor tooling`);
        else if (!ownSources.includes(resolved)) report('unresolved-import', where, `"${specifier}" is not a staged registry item`);
      } else if (specifier.startsWith('@ultima/')) {
        const item = registryItemFor(specifier);
        if (item) registry.add(item);
        else report('unresolved-import', where, `"${specifier}" is a barrel or a module no registry item stages`);
      } else if (isTooling(specifier)) report('tooling-import', where, `"${specifier}" is contributor tooling`);
      else if (!PROVIDED_BY_CONSUMER.has(packageName(specifier))) dependencies.add(packageName(specifier));
    }
    return { dependencies: [...dependencies].sort((a, b) => a.localeCompare(b)), registryDependencies: registryOrder(registry) };
  };

  const analyse = (path: string) => {
    const text = files.read(path);
    if (text === undefined) return undefined;
    const file = parse(path, text);
    const { imports, problems } = importsOf(file);
    for (const problem of problems) report('unresolved-import', `${path}:${problem.line}`, problem.message);
    return { file, imports };
  };

  const releaseRank = (release: string) => releaseIds.indexOf(release);
  const react: ReactEntry[] = [];
  const numbers = catalogueNumbers(ofKind('react').map((d) => d.id));
  for (const descriptor of ofKind('react')) {
    const path = pathOf(descriptor.id);
    if (!releaseIds.includes(descriptor.release)) report('unknown-release', path, `release "${descriptor.release}" is not defined`);
    if (!(groupIds as string[]).includes(descriptor.group)) {
      report('unknown-group', path, `group "${descriptor.group}" is not defined in ${METADATA}/groups.ts`);
    }
    const entry = {
      ...descriptor,
      number: numbers.get(descriptor.id) as string,
      source: `${UI_SOURCE}/${descriptor.id}.tsx`,
      page: `${PAGES}/${descriptor.id}.mdx`,
      test: `${UI_TESTS}/${descriptor.id}.test.tsx`,
      demos: `${DEMOS}/${descriptor.id}`,
    };
    for (const required of [entry.source, entry.page, entry.test]) {
      if (files.read(required) === undefined) report('missing-file', path, `${required} is missing`);
    }
    if (filesIn(entry.demos, '.tsx').length === 0) report('missing-file', path, `${entry.demos}/ holds no demo`);
    const analysed = analyse(entry.source);
    const exported = analysed ? exportsOf(analysed.file) : { exports: [], problems: [] };
    for (const problem of exported.problems) report('invalid-export', `${entry.source}:${problem.line}`, problem.message);
    for (const item of exported.exports) {
      if (item.declaration === 'none') report('invalid-export', `${entry.source}:${item.line}`, `"${item.local}" is not declared`);
    }
    if (analysed) {
      const primary = exported.exports.find((item) => item.name === descriptor.primaryExport);
      if (!primary || primary.kind !== 'value' || primary.typeOnly || primary.declaration === 'import') {
        report('invalid-primary-export', path, `${entry.source} exports no root function or namespace "${descriptor.primaryExport}"`);
      }
    }
    react.push({
      ...entry,
      exports: exported.exports,
      imports: analysed?.imports ?? [],
      ...installDependenciesOf(entry.source, analysed?.imports ?? []),
    });
  }
  react.sort((a, b) => releaseRank(a.release) - releaseRank(b.release) || a.order - b.order);
  checkOrder(react.map(({ id, order, release }) => ({ id, order, group: `release ${release}` })));

  const exportPlan = new Map<string, Export & { item: string }>();
  for (const entry of react) {
    for (const item of entry.exports) {
      const holder = exportPlan.get(item.name);
      if (holder) report('duplicate-export', `${entry.source}:${item.line}`, `"${item.name}" is also exported by ${holder.item}`);
      else exportPlan.set(item.name, { ...item, item: entry.id });
    }
  }

  const sourceBundles: SourceBundleEntry[] = [];
  for (const descriptor of ofKind('source-bundle')) {
    const path = pathOf(descriptor.id);
    if (descriptor.id !== descriptor.inventory) {
      report('invalid-descriptor', path, `the ${descriptor.inventory} inventory stages as the "${descriptor.inventory}" item`);
      continue;
    }
    const sources = inventorySources(descriptor.inventory);
    if (sources.length === 0) report('missing-file', path, `${INVENTORIES[descriptor.inventory].directory}/ holds no source`);
    const imports = sources.flatMap((source) => (analyse(source)?.imports ?? []).map((item) => ({ source, item })));
    const derived = sources.map((source) =>
      installDependenciesOf(source, imports.filter((entry) => entry.source === source).map((entry) => entry.item), sources),
    );
    sourceBundles.push({
      ...descriptor,
      sources,
      dependencies: [...new Set(derived.flatMap((d) => d.dependencies))].sort((a, b) => a.localeCompare(b)),
      registryDependencies: registryOrder(derived.flatMap((d) => d.registryDependencies).filter((id) => id !== descriptor.id)),
    });
  }

  const elements: ElementEntry[] = [];
  for (const descriptor of ofKind('element')) {
    const path = pathOf(descriptor.id);
    if (descriptor.id !== `ult-${descriptor.reactItem}`) {
      report('invalid-descriptor', path, `an element family is named ult-<react item>, so "${descriptor.id}" needs reactItem "${descriptor.id.replace(/^ult-/, '')}"`);
    }
    if (!reactIds.has(descriptor.reactItem)) report('missing-reference', path, `reactItem "${descriptor.reactItem}" is not a React item`);
    const source = `${ELEMENT_SOURCE}/${descriptor.id}.element.ts`;
    const test = `${ELEMENT_TESTS}/${descriptor.id}.test.ts`;
    if (files.read(test) === undefined) report('missing-file', path, `${test} is missing`);
    const analysed = analyse(source);
    if (!analysed) report('missing-file', path, `${source} is missing`);
    else {
      for (const { specifier, line } of analysed.imports) {
        if (isTooling(specifier) || (specifier.startsWith('.') && isTooling(resolveRelative(source, specifier)))) {
          report('tooling-import', `${source}:${line}`, `"${specifier}" reaches contributor tooling`);
        }
      }
      const registered = registeredTags(analysed.file);
      for (const problem of registered.problems) report('tag-mismatch', `${source}:${problem.line}`, problem.message);
      if (descriptor.tags[0] !== descriptor.id) report('tag-mismatch', path, `tags must list the root "${descriptor.id}" first`);
      if (new Set(descriptor.tags).size !== descriptor.tags.length) report('tag-mismatch', path, 'tags repeats a tag');
      for (const tag of descriptor.tags) {
        if (!registered.tags.includes(tag)) report('tag-mismatch', path, `${source} registers no <${tag}>`);
      }
      for (const tag of registered.tags) {
        if (!descriptor.tags.includes(tag)) report('tag-mismatch', path, `<${tag}> is registered but missing from tags`);
      }
    }
    const attributes = descriptor.attributes.map((attribute) => {
      if (!descriptor.tags.includes(attribute.on)) report('tag-mismatch', path, `attribute on <${attribute.on}>, outside the family`);
      for (const name of attribute.names) {
        if (!ATTRIBUTE.test(name)) report('invalid-descriptor', path, `"${name}" is not one attribute name`);
      }
      let values: readonly string[] | string = attribute.text ?? [];
      if (attribute.symbol !== undefined) {
        const table = analysed && stringTable(analysed.file, attribute.symbol);
        if (!table) report('invalid-enum-reference', path, `${source} has no module-scope string table ${attribute.symbol}`);
        values = table ?? [];
      }
      return { names: attribute.names, on: attribute.on, values };
    });
    elements.push({ ...descriptor, source, test, attributes });
  }
  elements.sort((a, b) => a.order - b.order);
  checkOrder(elements.map(({ id, order }) => ({ id, order, group: 'elements' })));

  for (const descriptor of ofKind('setup')) {
    const path = pathOf(descriptor.id);
    const directory = `${STATIC}/${descriptor.id}`;
    const present = filesUnder(directory);
    const declared = descriptor.files.map((file) => file.path);
    if (present.length === 0) report('missing-file', path, `${directory}/ holds no file`);
    for (const file of descriptor.files) {
      if (!isSafeRepositoryPath(file.path)) report('path-outside', path, `"${file.path}" leaves ${directory}/`);
      else if (!present.includes(file.path)) report('missing-file', path, `${directory}/${file.path} is missing`);
      if (!file.target.startsWith('~/') || !isSafeRepositoryPath(file.target.slice(2))) {
        report('path-outside', path, `target "${file.target}" is not inside the consumer project`);
      }
    }
    if (new Set(declared).size !== declared.length) report('invalid-descriptor', path, 'files repeats a path');
    for (const file of present) {
      if (!declared.includes(file)) report('source-without-metadata', `${directory}/${file}`, `not declared by ${path}`);
    }
  }

  for (const descriptor of ofKind('artifact')) {
    const path = pathOf(descriptor.id);
    if (!isSafeRepositoryPath(descriptor.output) || !descriptor.output.startsWith(ARTIFACT_OUTPUTS[descriptor.producer])) {
      report('path-outside', path, `${descriptor.producer} writes under ${ARTIFACT_OUTPUTS[descriptor.producer]}, not "${descriptor.output}"`);
    }
    if (!descriptor.target.startsWith('~/') || !isSafeRepositoryPath(descriptor.target.slice(2))) {
      report('path-outside', path, `target "${descriptor.target}" is not inside the consumer project`);
    }
  }

  const recipes: RecipeEntry[] = [];
  for (const descriptor of ofKind('recipe')) {
    const path = pathOf(descriptor.id);
    if (!releaseIds.includes(descriptor.release)) report('unknown-release', path, `release "${descriptor.release}" is not defined`);
    const page = `${PAGES}/${descriptor.page}.mdx`;
    const pageText = reactIds.has(descriptor.page) ? files.read(page) : undefined;
    if (!reactIds.has(descriptor.page)) report('missing-reference', path, `page "${descriptor.page}" is not a React item`);
    else if (!anchorsOf(page)?.has(descriptor.section)) report('broken-anchor', path, `${page} has no heading #${descriptor.section}`);
    const live = new Set(
      pageText === undefined
        ? []
        : mdxImports(page, pageText)
            .filter((item) => item.specifier.startsWith('.') && !item.specifier.includes('?'))
            .map((item) => resolveRelative(page, item.specifier)),
    );
    const registry = new Set<string>();
    const dependencies = new Set<string>();
    const queue: string[] = [];
    for (const demo of descriptor.demos) {
      if (!isSafeRepositoryPath(demo) || !demo.startsWith(`${DEMOS}/${descriptor.page}/`)) {
        report('path-outside', path, `demo "${demo}" is outside ${DEMOS}/${descriptor.page}/`);
      } else if (files.read(demo) === undefined) report('missing-file', path, `${demo} is missing`);
      else {
        if (pageText !== undefined && !live.has(demo)) report('demo-not-on-page', path, `${page} does not import ${demo}`);
        queue.push(demo);
      }
    }
    const barrelNames = (where: string, names: Import['names']) => {
      for (const { imported } of names) {
        const owner = exportPlan.get(imported);
        if (owner) registry.add(owner.item);
        else report('unresolved-import', where, `@ultima/ui exports no "${imported}"`);
      }
    };
    for (const visited = new Set<string>(); queue.length > 0; ) {
      const file = queue.shift() as string;
      if (visited.has(file)) continue;
      visited.add(file);
      for (const { specifier, names, line } of analyse(file)?.imports ?? []) {
        const where = `${file}:${line}`;
        if (specifier.includes('?')) continue;
        if (specifier === '@ultima/ui') barrelNames(where, names);
        else if (specifier.startsWith('@ultima/')) {
          const item = registryItemFor(specifier);
          if (item) registry.add(item);
          else report('unresolved-import', where, `"${specifier}" is not a registry item`);
        } else if (specifier.startsWith('.')) {
          const resolved = resolveRelative(file, specifier);
          if (resolved === BARREL) barrelNames(where, names);
          else if (files.read(resolved) !== undefined) queue.push(resolved);
          else report('unresolved-import', where, `"${specifier}" resolves to no file`);
        } else if (!PROVIDED_BY_CONSUMER.has(packageName(specifier))) dependencies.add(packageName(specifier));
      }
    }
    recipes.push({
      ...descriptor,
      dependencies: [...dependencies].sort((a, b) => a.localeCompare(b)),
      registryDependencies: registryOrder(registry),
    });
  }

  const blocks: BlockEntry[] = [];
  const blockNumbers = catalogueNumbers(ofKind('block').map((d) => d.id));
  const recipeNumbers = catalogueNumbers(recipes.map((entry) => entry.id));
  for (const descriptor of ofKind('block')) {
    const path = pathOf(descriptor.id);
    const directory = `${BLOCK_SOURCE}/${descriptor.id}`;
    const entryFile = `${descriptor.id}.tsx`;
    const test = `${BLOCK_TESTS}/${descriptor.id}.test.tsx`;
    const listed = files.list(directory) ?? [];
    for (const entry of listed) {
      if (entry.directory || !entry.name.endsWith('.tsx')) report('path-outside', `${directory}/${entry.name}`, 'a block folder holds only its .tsx files');
    }
    const names = listed.filter((entry) => !entry.directory && entry.name.endsWith('.tsx')).map((entry) => entry.name);
    if (!names.includes(entryFile)) report('missing-file', path, `${directory}/${entryFile} is missing`);
    if (files.read(test) === undefined) report('missing-file', path, `${test} is missing`);
    const ordered = [...names.filter((name) => name === entryFile), ...names.filter((name) => name !== entryFile).sort(ordinal)];
    const sources = ordered.map((name) => `${directory}/${name}`);
    const derived = sources.map((source) => {
      const analysed = analyse(source);
      if (source.endsWith(`/${entryFile}`) && analysed) {
        const exported = exportsOf(analysed.file);
        const primary = exported.exports.find((item) => item.name === descriptor.primaryExport);
        if (!primary || primary.kind !== 'value' || primary.typeOnly || primary.declaration === 'import') {
          report('invalid-primary-export', path, `${source} exports no root component "${descriptor.primaryExport}"`);
        }
      }
      return installDependenciesOf(source, analysed?.imports ?? [], sources);
    });
    const registryDependencies = registryOrder(derived.flatMap((d) => d.registryDependencies));
    const components = registryDependencies
      .filter((id) => reactIds.has(id))
      .map((id) => react.find((entry) => entry.id === id) as ReactEntry)
      .map((entry): BuiltFrom => ({ id: entry.id, title: entry.title, number: entry.number, kind: 'component' }))
      .sort((a, b) => ordinal(a.number, b.number));
    const followed: BuiltFrom[] = [];
    for (const { id } of descriptor.recipes) {
      const recipe = recipes.find((entry) => entry.id === id);
      if (!recipe) report('missing-reference', path, `recipe "${id}" is not a recipe descriptor`);
      else followed.push({ id, title: recipe.title, number: recipeNumbers.get(id) as string, kind: 'recipe' });
    }
    blocks.push({
      ...descriptor,
      number: blockNumbers.get(descriptor.id) as string,
      directory,
      files: ordered,
      test,
      dependencies: [...new Set(derived.flatMap((d) => d.dependencies))].sort((a, b) => a.localeCompare(b)),
      registryDependencies,
      builtFrom: [...components, ...followed.sort((a, b) => ordinal(a.number, b.number))],
    });
  }
  blocks.sort((a, b) => ordinal(a.number, b.number));

  const described = (ids: Set<string>, directory: string, suffix: string) => {
    for (const name of filesIn(directory, suffix)) {
      if (!ids.has(name.slice(0, -suffix.length))) {
        report('source-without-metadata', `${directory}/${name}`, 'no descriptor under registry/metadata/ claims it');
      }
    }
  };
  described(reactIds, UI_SOURCE, '.tsx');
  described(reactIds, PAGES, '.mdx');
  described(new Set(ofKind('element').map((d) => d.id)), ELEMENT_SOURCE, '.element.ts');
  const blockIds = new Set(ofKind('block').map((d) => d.id));
  for (const entry of files.list(BLOCK_SOURCE) ?? []) {
    if (entry.name === '__tests__') continue;
    if (!entry.directory) report('path-outside', `${BLOCK_SOURCE}/${entry.name}`, 'packages/blocks/src/ holds one directory per block');
    else if (!blockIds.has(entry.name)) report('source-without-metadata', `${BLOCK_SOURCE}/${entry.name}`, 'no block descriptor under registry/metadata/ claims it');
  }
  const setupIds = new Set(ofKind('setup').map((d) => d.id));
  for (const entry of files.list(STATIC) ?? []) {
    if (entry.directory && !setupIds.has(entry.name)) {
      report('source-without-metadata', `${STATIC}/${entry.name}`, 'no setup descriptor claims it');
    }
  }

  const setup = ofKind('setup');
  const registryItems = records.map((record) => record.descriptor).filter((d) => d.kind !== 'recipe').map((d) => d.id);
  const edges = new Map<string, string[]>([
    ...react.map((entry): [string, string[]] => [entry.id, entry.registryDependencies]),
    ...sourceBundles.map((entry): [string, string[]] => [entry.id, entry.registryDependencies]),
    ...elements.map((entry): [string, string[]] => [entry.id, entry.registryDependencies]),
    ...setup.map((entry): [string, string[]] => [entry.id, entry.registryDependencies ?? []]),
    ...blocks.map((entry): [string, string[]] => [entry.id, entry.registryDependencies]),
  ]);
  for (const [id, targets] of [...edges, ...recipes.map((r): [string, string[]] => [r.id, r.registryDependencies])]) {
    for (const target of targets) {
      if (!registryItems.includes(target)) report('missing-reference', pathOf(id), `registry dependency "${target}" is not an installable item`);
    }
  }
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (id: string, trail: string[]) => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') {
      report('dependency-cycle', pathOf(id), [...trail.slice(trail.indexOf(id)), id].join(' -> '));
      return;
    }
    state.set(id, 'visiting');
    for (const target of edges.get(id) ?? []) visit(target, [...trail, id]);
    state.set(id, 'done');
  };
  for (const id of [...edges.keys()].sort()) visit(id, []);

  return {
    catalogue: {
      releases,
      groups,
      react,
      elements,
      setup: setup.sort((a, b) => a.id.localeCompare(b.id)),
      sourceBundles,
      artifacts: ofKind('artifact'),
      recipes,
      blocks,
      exports: exportPlan,
      registryItems,
      componentRoutes: react.map((entry) => entry.id),
    },
    diagnostics,
  };
}
