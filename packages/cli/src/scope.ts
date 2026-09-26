// docs/spec/ultima.md, Consumer CLI, Package and engine, The consumer scope. Module resolution is
// TypeScript's own, over the consumer's tsconfig with its `extends` and project `references`. The
// scope is the engine's: `check` runs `@ultima/analysis` over it, and `status` and `diff` read its
// aliases and directories.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';

import { CONSUMER_RULES, type Classified, type InstalledItem, POLICY, type Resolution, STYLE_POLICY, type Scope, type SourceKind } from '@ultima/analysis/consumer';
import ts from 'typescript';

import { type Files, diskFiles } from '../../../scripts/catalogue/files.ts';
import { type Diagnostic, SPEC } from './diagnostic.ts';
import { readStamp } from './stamp.ts';

declare const __ULTIMA_CATALOGUE__: { item: string; folder: 'ui' | 'lib'; name: string }[];
declare const __ULTIMA_TOKENS__: string;
declare const __ULTIMA_AUTHORIZED__: NonNullable<Scope['authorized']>;
declare const __ULTIMA_KIT__: Omit<InstalledItem, 'specifier'>[];
declare const __ULTIMA_COLOR_DEFAULTS__: NonNullable<Scope['colorDefaults']>;

export type ConsumerScope = Scope & {
  root: string;
  /** The tsconfig the scope starts from: `tsconfig.json`, or `--project`. */
  tsconfig: string;
  /** An absolute specifier resolution from an absolute file, for the commands that work on disk paths. */
  resolveFile(specifier: string, from: string): string | null;
  aliases: { ui: string; lib: string };
  /** Where `aliases.ui` and `aliases.lib` point, through the tsconfig `paths`. */
  directories: { ui: string; lib: string };
  components: Record<string, unknown>;
  /** Paths `--files` named that the scope does not hold, with the reason, listed and skipped. */
  skipped: { path: string; reason: string }[];
};

/** Where the bundled token source is read from: no file in a project has this path. */
const BUNDLED_TOKENS = '<ultima>/tokens.stylex.ts';

const SOURCE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const TEST = /(^|\/)__tests__\/|\.(test|spec)\.[cm]?[jt]sx?$/;
const CSS_IMPORT = /(?:^|[;\n])\s*import\s+(?:[^'";]*?\s+from\s+)?(['"])([^'"]+\.css)(\?[^'"]*)?\1/g;

/** Structural exclusions, never read. */
const EXCLUDED = [
  { segment: 'node_modules', reason: 'installed dependencies' },
  { segment: 'dist', reason: 'build output' },
  { segment: 'build', reason: 'build output' },
  { segment: '.next', reason: 'build output' },
  { segment: '.output', reason: 'build output' },
  { segment: 'coverage', reason: 'build output' },
];

// TS18002 and TS18003 say a config matches no files, which a solution-style tsconfig never does.
const NO_INPUTS = new Set([18002, 18003]);

export function consumerScope(
  root: string,
  { project, files: named }: { project?: string; files?: string[] } = {},
): ConsumerScope | { incomplete: Diagnostic } {
  const read = readComponents(root);
  if ('incomplete' in read) return read;
  const { components } = read;

  const tsconfig = resolve(root, project ?? 'tsconfig.json');
  const configs = readConfigAndReferences(tsconfig, root);
  if ('incomplete' in configs) return configs;

  const aliases: Record<string, string> = {};
  const directories: Record<string, string> = {};
  for (const key of ['ui', 'lib'] as const) {
    const alias = (components.aliases as Record<string, unknown> | undefined)?.[key];
    if (typeof alias !== 'string') {
      return incomplete('ULT-SCOPE-003', 'components.json', `aliases.${key} is missing, so installed items cannot be found.`, `Set "${key}" inside "aliases".`);
    }
    const directory = aliasDirectory(alias, configs);
    if (!directory) {
      return incomplete(
        'ULT-SCOPE-003',
        'components.json',
        `aliases.${key} is ${alias}, and no "paths" entry in ${relativeName(root, tsconfig)} or its references maps it.`,
        `Add a "paths" entry for ${alias} under compilerOptions, or run \`npx ultima-design doctor\` to check the setup.`,
      );
    }
    aliases[key] = alias;
    directories[key] = directory;
  }

  const optionsFor = (from: string) =>
    ((configs.find(({ fileNames }) => fileNames.includes(from)) ?? configs.find(({ fileNames }) => fileNames.length > 0) ?? configs[0]) as ts.ParsedCommandLine).options;
  const resolveFile = (specifier: string, from: string) =>
    ts.resolveModuleName(specifier, from, optionsFor(from), ts.sys).resolvedModule?.resolvedFileName ?? null;
  const toScope = (absolute: string) => relative(root, absolute).split(sep).join('/');
  const inside = (path: string) => path !== '' && !path.startsWith('../') && path !== '..';

  /** A path the tsconfig `paths` map a specifier to, tried in order. */
  const mapped = (specifier: string, from: string): string[] => {
    const options = optionsFor(from);
    const base = options.baseUrl ?? (options as { pathsBasePath?: string }).pathsBasePath;
    if (!base) return [];
    return Object.entries(options.paths ?? {}).flatMap(([pattern, targets]) => {
      const [prefix = '', suffix = ''] = pattern.split('*');
      const wildcard = pattern.includes('*');
      if (wildcard ? !(specifier.startsWith(prefix) && specifier.endsWith(suffix)) : specifier !== pattern) return [];
      const middle = wildcard ? specifier.slice(prefix.length, specifier.length - suffix.length) : '';
      return targets.map((target) => resolve(base, target.replace('*', middle)));
    });
  };

  const resolveScoped = (raw: string, from: string): Resolution => {
    const specifier = raw.replace(/\?.*$/, '');
    const absoluteFrom = join(root, from);
    const relativeSpecifier = specifier.startsWith('.') || specifier.startsWith('/');
    if (specifier.endsWith('.css')) {
      const candidates = relativeSpecifier ? [resolve(dirname(absoluteFrom), specifier)] : mapped(specifier, absoluteFrom);
      const found = candidates.find((candidate) => existsSync(candidate));
      if (found && inside(toScope(found)) && !excludedPath(toScope(found))) return { kind: 'file', path: toScope(found), via: relativeSpecifier ? 'relative' : 'package' };
      if (relativeSpecifier || candidates.length > 0) return { kind: 'unresolved', via: relativeSpecifier ? 'relative' : 'package', reason: `"${raw}" from ${from}` };
      return { kind: 'external', package: packageOf(specifier) };
    }
    const resolved = ts.resolveModuleName(specifier, absoluteFrom, optionsFor(absoluteFrom), ts.sys).resolvedModule;
    const path = resolved && !resolved.isExternalLibraryImport ? toScope(resolved.resolvedFileName) : undefined;
    if (path !== undefined && inside(path) && !excludedPath(path)) return { kind: 'file', path, via: relativeSpecifier ? 'relative' : 'package' };
    if (relativeSpecifier) return { kind: 'unresolved', via: 'relative', reason: `"${raw}" from ${from}` };
    if (!resolved && mapped(specifier, absoluteFrom).length > 0) return { kind: 'unresolved', via: 'package', reason: `"${raw}" matches a tsconfig path and resolves to no file` };
    return { kind: 'external', package: specifier.startsWith('node:') ? specifier : packageOf(specifier) };
  };

  const files = bundledFiles(diskFiles(root));
  const items = new Map<string, string | undefined>();
  const itemOf = (path: string): string | undefined => {
    if (items.has(path)) return items.get(path);
    const directory = dirname(join(root, path));
    const folder = directory === directories.ui ? 'ui' : directory === directories.lib ? 'lib' : undefined;
    let item: string | undefined;
    if (folder) {
      const text = files.read(path);
      const stamp = text === undefined ? null : readStamp(text);
      item = stamp?.item ?? __ULTIMA_CATALOGUE__.find((entry) => entry.folder === folder && entry.name === basename(path))?.item;
    }
    items.set(path, item);
    return item;
  };
  const tokenSources = [
    ...(existsSync(directories.lib as string) ? readdirSync(directories.lib as string) : [])
      .filter((name) => name.endsWith('.stylex.ts'))
      .map((name) => toScope(join(directories.lib as string, name)))
      .filter((path) => itemOf(path) === 'tokens'),
    BUNDLED_TOKENS,
  ];

  // Every installed React item, found in `aliases.ui` whatever files the run reads, in catalogue order.
  let kit: InstalledItem[] | undefined;
  const installed = () => {
    if (kit) return kit;
    const found = new Map<string, string>();
    for (const name of existsSync(directories.ui as string) ? readdirSync(directories.ui as string) : []) {
      if (!SOURCE.test(name) || TEST.test(name)) continue;
      const item = itemOf(toScope(join(directories.ui as string, name)));
      if (item !== undefined && !found.has(item)) found.set(item, `${aliases.ui}/${name.replace(SOURCE, '')}`);
    }
    return (kit = __ULTIMA_KIT__.flatMap((entry) => {
      const specifier = found.get(entry.item);
      return specifier === undefined ? [] : [{ ...entry, specifier }];
    }));
  };

  let built: { inventory: Classified[]; skipped: ConsumerScope['skipped'] } | undefined;
  const build = () => {
    if (built) return built;
    const everything = inventoryOf(root, configs, resolveScoped, toScope);
    if (named === undefined) return (built = { inventory: everything, skipped: [] });
    const held = new Map(everything.map((entry) => [entry.path, entry]));
    const inventory: Classified[] = [];
    const skipped: ConsumerScope['skipped'] = [];
    for (const path of [...new Set(named.map((name) => toScope(resolve(root, name))))]) {
      const entry = held.get(path);
      if (entry) inventory.push(entry);
      else skipped.push({ path, reason: existsSync(join(root, path)) ? 'outside the consumer scope' : 'does not exist' });
    }
    return (built = { inventory, skipped });
  };

  return {
    name: 'consumer',
    root,
    tsconfig,
    resolveFile,
    aliases: aliases as ConsumerScope['aliases'],
    directories: directories as ConsumerScope['directories'],
    components,
    files,
    get inventory() {
      return build().inventory;
    },
    get skipped() {
      return build().skipped;
    },
    unclassified: [],
    excluded: [
      ...EXCLUDED.map(({ segment, reason }) => ({ path: `**/${segment}`, reason })),
      { path: 'tests', reason: 'test files: *.test.*, *.spec.* and __tests__/' },
      { path: 'tsconfig exclusions', reason: 'files the tsconfig excludes' },
    ],
    kindOf: (path) => build().inventory.find((entry) => entry.path === path)?.kind,
    resolve: resolveScoped,
    staged: () => undefined,
    itemOf,
    policy: POLICY,
    styles: STYLE_POLICY,
    tokenSources,
    globalStyles: [],
    testPlacement: [],
    unclaimed: [],
    anchors: () => undefined,
    rules: CONSUMER_RULES,
    authorized: __ULTIMA_AUTHORIZED__,
    kit: { installed },
    colorDefaults: __ULTIMA_COLOR_DEFAULTS__,
    problems: [],
  };
}

/** The project's files, plus the bundled token source at a path no project file can take. */
function bundledFiles(disk: Files): Files {
  return { ...disk, read: (path) => (path === BUNDLED_TOKENS ? __ULTIMA_TOKENS__ : disk.read(path)) };
}

function excludedPath(path: string): boolean {
  return path.split('/').some((segment) => EXCLUDED.some((entry) => entry.segment === segment));
}

function packageOf(specifier: string): string {
  const segments = specifier.split('/');
  return specifier.startsWith('@') ? segments.slice(0, 2).join('/') : (segments[0] as string);
}

/** The program's source files, tests and build output left out, and the CSS they import statically. */
function inventoryOf(
  root: string,
  configs: ts.ParsedCommandLine[],
  resolveScoped: (specifier: string, from: string) => Resolution,
  toScope: (absolute: string) => string,
): Classified[] {
  const outputs = configs.flatMap(({ options }) => [options.outDir, options.declarationDir].filter((dir): dir is string => dir !== undefined)).map(toScope);
  const sources = new Set<string>();
  for (const { fileNames } of configs) {
    for (const fileName of fileNames) {
      const path = toScope(fileName);
      if (path.startsWith('../') || !SOURCE.test(path) || path.endsWith('.d.ts') || TEST.test(path) || excludedPath(path)) continue;
      if (outputs.some((output) => path.startsWith(`${output}/`))) continue;
      sources.add(path);
    }
  }
  const kinds = new Map<string, SourceKind>([...sources].map((path) => [path, 'app']));
  for (const path of sources) {
    let text: string;
    try {
      if (!statSync(join(root, path)).isFile()) continue;
      text = readFileSync(join(root, path), 'utf8');
    } catch {
      continue;
    }
    for (const match of text.matchAll(CSS_IMPORT)) {
      const resolution = resolveScoped(match[2] as string, path);
      if (resolution.kind === 'file' && !kinds.has(resolution.path)) kinds.set(resolution.path, 'stylesheet');
    }
  }
  return [...kinds].map(([path, kind]) => ({ path, kind })).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

function readComponents(root: string): { components: Record<string, unknown> } | { incomplete: Diagnostic } {
  const repair = 'Run the setup item for your target; `npx ultima-design doctor` names it.';
  const path = join(root, 'components.json');
  if (!existsSync(path)) return incomplete('ULT-SCOPE-001', 'components.json', 'components.json is missing.', repair);
  try {
    const json = JSON.parse(readFileSync(path, 'utf8'));
    if (typeof json === 'object' && json !== null && !Array.isArray(json)) return { components: json };
  } catch (error) {
    return incomplete('ULT-SCOPE-001', 'components.json', `components.json does not parse: ${(error as Error).message}.`, repair);
  }
  return incomplete('ULT-SCOPE-001', 'components.json', 'components.json is not a JSON object.', repair);
}

function readConfigAndReferences(path: string, root: string, seen = new Set<string>()): ts.ParsedCommandLine[] | { incomplete: Diagnostic } {
  const file = relativeName(root, path);
  if (!existsSync(path)) {
    return incomplete('ULT-SCOPE-002', file, `${file} is missing.`, 'Create it, or pass --project <path> to name the tsconfig to use.');
  }
  seen.add(path);
  const { config, error } = ts.readConfigFile(path, ts.sys.readFile);
  const parsed = error ? undefined : ts.parseJsonConfigFileContent(config, ts.sys, dirname(path), undefined, path);
  const failure = error ?? parsed?.errors.find(({ code }) => !NO_INPUTS.has(code));
  if (failure || !parsed) {
    const message = ts.flattenDiagnosticMessageText(failure?.messageText ?? '', ' ');
    return incomplete('ULT-SCOPE-002', file, `${file} does not parse: ${message}`, `Repair ${file}.`);
  }
  const configs = [parsed];
  for (const reference of parsed.projectReferences ?? []) {
    const referenced = ts.resolveProjectReferencePath(reference);
    if (seen.has(referenced)) continue;
    const more = readConfigAndReferences(referenced, root, seen);
    if ('incomplete' in more) return more;
    configs.push(...more);
  }
  return configs;
}

function aliasDirectory(alias: string, configs: ts.ParsedCommandLine[]): string | null {
  for (const { options } of configs) {
    const base = options.baseUrl ?? (options as { pathsBasePath?: string }).pathsBasePath;
    const matches = Object.entries(options.paths ?? {})
      .map(([pattern, targets]) => ({ prefix: pattern.split('*')[0] as string, wildcard: pattern.includes('*'), pattern, targets }))
      .filter(({ prefix, wildcard, pattern }) => (wildcard ? `${alias}/`.startsWith(prefix) : alias === pattern))
      .sort((a, b) => b.prefix.length - a.prefix.length);
    const [match] = matches;
    const [target] = match?.targets ?? [];
    if (!match || !base || target === undefined) continue;
    return resolve(base, match.wildcard ? target.replace('*', alias.slice(match.prefix.length)) : target);
  }
  return null;
}

function relativeName(root: string, path: string): string {
  return path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
}

function incomplete(ruleId: string, file: string, message: string, repair: string): { incomplete: Diagnostic } {
  return { incomplete: { ruleId, severity: 'incomplete', file, message, repair, link: `${SPEC}#package-and-engine` } };
}
