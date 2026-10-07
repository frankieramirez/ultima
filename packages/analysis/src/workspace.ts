// The workspace scope: this repository's source inventory, aliases and staging, derived from its file
// conventions and the typed catalogue rather than a second list. Every workspace path and alias a rule
// needs is named here and nowhere else. docs/spec/agent-infrastructure.md, Authority and source scopes.
import { posix } from 'node:path';

import ts from 'typescript';

import type { Files } from '../../../scripts/catalogue/files.ts';
import { loadCatalogue } from '../../../scripts/catalogue/model.ts';
import { headingAnchors } from '../../../scripts/catalogue/source.ts';
import { registryPlan, stagedSources } from '../../../scripts/catalogue/staging.ts';
import type { Diagnostic } from './diagnostic.ts';
import { POLICY, STYLE_POLICY, packageName } from './policy.ts';
import { createTypeProgram } from './program.ts';
import { RULES } from './rules.ts';
import type { Classified, RegistryInputs, Resolution, Scope, SourceKind, Staged } from './scope.ts';

export const EXCEPTIONS = 'packages/analysis/exceptions.ts';

/** Catalogue codes that mean the metadata itself cannot be read, so no membership can be established. */
const UNREADABLE = ['not-data', 'invalid-descriptor', 'unexpected-descriptor', 'duplicate-id'];

const SOURCE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|mdx)$/;

/** Structural exclusions. None is an exception for a production file. */
const EXCLUDED: { match: (path: string, name: string) => boolean; path: string; reason: string }[] = [
  { match: (_, name) => name === 'node_modules', path: '**/node_modules', reason: 'vendored dependencies' },
  { match: (_, name) => name === 'dist', path: '**/dist', reason: 'build output' },
  { match: (path) => path === 'registry/ultima', path: 'registry/ultima', reason: 'registry build output' },
  { match: (path) => path === 'apps/docs/public', path: 'apps/docs/public', reason: 'static assets and the generated element bundles' },
  { match: (_, name) => name.startsWith('.'), path: '.*', reason: 'Git, CI and agent configuration' },
];

/** First match wins. Fixtures, tests, declarations and generated wiring are claimed before any production pattern. */
const CLASSES: readonly [RegExp, SourceKind][] = [
  [/^packages\/analysis\/fixtures\//, 'fixture'],
  [/(^|\/)__tests__\//, 'test'],
  [/\.(test|spec)\.[cm]?[jt]sx?$/, 'test'],
  // Scenario bindings and their fixtures for the docs site's browser and production runners.
  [/^apps\/[^/]+\/tests\//, 'test'],
  [/\.d\.ts$/, 'declarations'],
  [/^packages\/ui\/src\/index\.ts$/, 'generated'],
  [/^apps\/docs\/src\/generated\/[^/]+\.ts$/, 'generated'],
  [/^scripts\/generated\/[^/]+\.ts$/, 'generated'],
  [/^registry\/items\.config\.ts$/, 'generated'],
  [/^packages\/tokens\/src\/.+\.ts$/, 'token-source'],
  [/^packages\/ui\/src\/lib\/[^/]+\.ts$/, 'react-helper'],
  [/^packages\/ui\/src\/[^/]+\.tsx$/, 'react-component'],
  [/^packages\/elements\/src\/[^/]+\.element\.ts$/, 'element'],
  [/^packages\/blocks\/src\/[^/]+\/[^/]+\.tsx$/, 'block'],
  [/^apps\/docs\/src\/demos\/[^/]+\/[^/]+\.tsx?$/, 'demo'],
  [/^apps\/docs\/src\/content\/.+\.mdx$/, 'content'],
  [/^apps\/docs\/src\/[^/]+(\/[^/]+)?\.tsx?$/, 'docs'],
  [/^apps\/docs\/server\/.+\.ts$/, 'docs'],
  [/^registry\/metadata\/.+\.ts$/, 'metadata'],
  [/^registry\/static\//, 'setup-template'],
  [/^scripts\/.+\.ts$/, 'tooling'],
  [/^(apps|packages)\/[^/]+\/scripts\/.+\.ts$/, 'tooling'],
  [/^packages\/(analysis|cli)\/src\/.+\.ts$/, 'tooling'],
  [/^packages\/analysis\/exceptions\.ts$/, 'tooling'],
  [/^(apps|packages)\/[^/]+\/(vite|vitest)\.config\.ts$/, 'tooling'],
  [/^stylex\.options\.ts$/, 'tooling'],
];

export function classify(path: string): SourceKind | undefined {
  return CLASSES.find(([pattern]) => pattern.test(path))?.[1];
}

type WorkspacePackage = { name: string; directory: string; exports: Record<string, string> };

function workspacePackages(files: Files): WorkspacePackage[] {
  const found: WorkspacePackage[] = [];
  for (const group of ['packages', 'apps']) {
    for (const entry of files.list(group) ?? []) {
      if (!entry.directory) continue;
      const directory = `${group}/${entry.name}`;
      const text = files.read(`${directory}/package.json`);
      if (text === undefined) continue;
      try {
        const json = JSON.parse(text) as { name?: unknown; exports?: unknown };
        if (typeof json.name !== 'string') continue;
        const exports: Record<string, string> = {};
        if (typeof json.exports === 'string') exports['.'] = json.exports;
        else if (json.exports && typeof json.exports === 'object') {
          for (const [key, value] of Object.entries(json.exports)) if (typeof value === 'string') exports[key] = value;
        }
        found.push({ name: json.name, directory, exports });
      } catch {
        // An unparseable manifest resolves nothing; imports of it are reported where they occur.
      }
    }
  }
  return found;
}

function relativeCandidates(base: string): string[] {
  const withoutJs = base.replace(/\.(m|c)?jsx?$/, '');
  return [base, `${base}.ts`, `${base}.tsx`, `${withoutJs}.ts`, `${withoutJs}.tsx`, `${base}/index.ts`, `${base}/index.tsx`];
}

export function workspaceScope(files: Files): Scope {
  const problems: Diagnostic[] = [];
  const inventory: Classified[] = [];
  const unclassified: string[] = [];
  const excluded = EXCLUDED.map(({ path, reason }) => ({ path, reason }));

  const walk = (directory: string) => {
    for (const entry of files.list(directory) ?? []) {
      const path = directory ? `${directory}/${entry.name}` : entry.name;
      if (entry.directory) {
        if (!EXCLUDED.some((rule) => rule.match(path, entry.name))) walk(path);
        continue;
      }
      if (!SOURCE.test(entry.name)) continue;
      const kind = classify(path);
      if (kind) inventory.push({ path, kind });
      else unclassified.push(path);
    }
  };
  walk('');
  const kinds = new Map(inventory.map(({ path, kind }) => [path, kind]));

  const { catalogue, diagnostics } = loadCatalogue(files);
  const broken = diagnostics.filter((diagnostic) => UNREADABLE.includes(diagnostic.code));
  // With unreadable metadata, a component that looks unclaimed may only have lost its descriptor.
  const unclaimed = broken.length > 0 ? [] : diagnostics
    .filter((diagnostic) => diagnostic.code === 'source-without-metadata')
    .filter((diagnostic) => ['react-component', 'element'].includes(kinds.get(diagnostic.path) as string))
    .map((diagnostic) => ({ path: diagnostic.path, message: diagnostic.message }));
  for (const diagnostic of broken) {
    problems.push({
      ruleId: 'ULT-ANALYSIS-001',
      severity: 'incomplete',
      file: diagnostic.path.replace(/:\d+$/, ''),
      start: { line: 1, column: 1 },
      end: { line: 1, column: 1 },
      message: `The catalogue cannot classify the component sources: ${diagnostic.message} (${diagnostic.code}).`,
      repair: 'Run pnpm catalogue:check and fix the metadata it names.',
      link: RULES['ULT-ANALYSIS-001'].link,
    });
  }

  const located = (path: string) => {
    const match = /^(.*):(\d+)$/.exec(path);
    return match ? { file: match[1] as string, line: Number(match[2]) } : { file: path };
  };
  const unclaimedPaths = new Set(unclaimed.map((entry) => entry.path));
  const { sources, collisions } = stagedSources(files);
  const descriptors = new Map<string, { kind: string; path: string }>();
  for (const [kind, ids] of [
    ['react', catalogue.react.map((entry) => entry.id)],
    ['element', catalogue.elements.map((entry) => entry.id)],
    ['setup', catalogue.setup.map((entry) => entry.id)],
    ['source-bundle', catalogue.sourceBundles.map((entry) => entry.id)],
    ['artifact', catalogue.artifacts.map((entry) => entry.id)],
    ['block', catalogue.blocks.map((entry) => entry.id)],
  ] as const) {
    for (const id of ids) descriptors.set(id, { kind, path: `registry/metadata/${kind}/${id}.ts` });
  }
  // Unreadable metadata is incomplete analysis, reported above; a component source no descriptor
  // claims is ULT-SOURCE-001. Every other catalogue finding is about registry membership.
  const registry: RegistryInputs | undefined =
    broken.length > 0
      ? undefined
      : {
          findings: diagnostics
            .filter((diagnostic) => !(diagnostic.code === 'source-without-metadata' && unclaimedPaths.has(diagnostic.path)))
            .map((diagnostic) => ({ code: diagnostic.code, ...located(diagnostic.path), message: diagnostic.message })),
          sources,
          collisions,
          plan: registryPlan(sources, catalogue.elements.map((entry) => entry.id)),
          descriptors,
        };

  const packages = workspacePackages(files);

  const resolvePackage = (specifier: string): Resolution => {
    const owner = packages.find((candidate) => specifier === candidate.name || specifier.startsWith(`${candidate.name}/`));
    if (!owner) return { kind: 'external', package: packageName(specifier) };
    const subpath = specifier === owner.name ? '.' : `.${specifier.slice(owner.name.length)}`;
    let target = owner.exports[subpath];
    if (target === undefined) {
      for (const [key, value] of Object.entries(owner.exports)) {
        const star = key.indexOf('*');
        if (star < 0) continue;
        const [prefix, suffix] = [key.slice(0, star), key.slice(star + 1)];
        if (subpath.startsWith(prefix) && subpath.endsWith(suffix) && subpath.length >= key.length - 1) {
          target = value.replace('*', subpath.slice(prefix.length, subpath.length - suffix.length));
          break;
        }
      }
    }
    if (target === undefined) return { kind: 'unresolved', via: 'package', reason: `${owner.name} exports no "${subpath}"` };
    const path = posix.normalize(posix.join(owner.directory, target));
    if (path.startsWith('..')) return { kind: 'unresolved', via: 'package', reason: `"${specifier}" leaves the repository` };
    // A declared export of build output resolves without the build: the static check never runs one.
    const built = path.split('/').some((segment, index, segments) => {
      const prefix = segments.slice(0, index + 1).join('/');
      return index < segments.length - 1 && EXCLUDED.some((rule) => rule.match(prefix, segment));
    });
    if (!built && files.read(path) === undefined) return { kind: 'unresolved', via: 'package', reason: `${path} does not exist` };
    return { kind: 'file', path, via: 'package' };
  };

  const resolve = (raw: string, from: string): Resolution => {
    const specifier = raw.replace(/\?.*$/, '');
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      const base = posix.normalize(posix.join(posix.dirname(from), specifier));
      if (base.startsWith('..') || specifier.startsWith('/')) return { kind: 'unresolved', via: 'relative', reason: `"${raw}" leaves the repository` };
      const path = relativeCandidates(base).find((candidate) => files.read(candidate) !== undefined);
      return path ? { kind: 'file', path, via: 'relative' } : { kind: 'unresolved', via: 'relative', reason: `"${raw}" from ${from}` };
    }
    if (specifier.startsWith('node:')) return { kind: 'external', package: specifier };
    return resolvePackage(specifier);
  };

  /** The package specifier that reaches `path`, read back from the exports that resolve to it. */
  const specifierOf = (path: string): string | undefined => {
    for (const owner of packages) {
      for (const [key, value] of Object.entries(owner.exports)) {
        const target = posix.normalize(posix.join(owner.directory, value));
        const star = target.indexOf('*');
        if (star < 0) {
          if (target === path) return key === '.' ? owner.name : `${owner.name}/${key.slice(2)}`;
          continue;
        }
        const [prefix, suffix] = [target.slice(0, star), target.slice(star + 1)];
        if (path.startsWith(prefix) && path.endsWith(suffix)) {
          const middle = path.slice(prefix.length, path.length - suffix.length);
          if (!middle.includes('/')) return `${owner.name}/${key.slice(2).replace('*', middle)}`;
        }
      }
    }
    return undefined;
  };

  const staged = new Map<string, Staged>();
  for (const bundle of catalogue.sourceBundles) {
    for (const source of bundle.sources) {
      const kind = kinds.get(source);
      const specifier = specifierOf(source);
      if ((kind === 'token-source' || kind === 'react-helper') && specifier) staged.set(source, { item: bundle.id, kind, specifier });
    }
  }
  for (const entry of catalogue.react) {
    const specifier = specifierOf(entry.source);
    if (specifier) staged.set(entry.source, { item: entry.id, kind: 'react-component', specifier });
  }
  const items = new Map<string, string>([
    ...catalogue.react.map((entry): [string, string] => [entry.source, entry.id]),
    ...catalogue.elements.map((entry): [string, string] => [entry.source, entry.id]),
    ...catalogue.blocks.flatMap((entry) => entry.files.map((name): [string, string] => [`${entry.directory}/${name}`, entry.id])),
  ]);

  const anchorCache = new Map<string, Set<string> | undefined>();

  const compilerOptions = (): ts.CompilerOptions => {
    const text = files.read('tsconfig.base.json') ?? '{}';
    const { config } = ts.parseConfigFileTextToJson('tsconfig.base.json', text);
    return ts.convertCompilerOptionsFromJson((config as { compilerOptions?: object } | undefined)?.compilerOptions ?? {}, '/').options;
  };

  return {
    name: 'workspace',
    files,
    inventory,
    unclassified,
    excluded,
    kindOf: (path) => kinds.get(path),
    resolve,
    staged: (path) => staged.get(path),
    itemOf: (path) => items.get(path),
    policy: POLICY,
    styles: STYLE_POLICY,
    tokenSources: inventory.filter(({ path, kind }) => kind === 'token-source' && path.endsWith('.stylex.ts')).map(({ path }) => path),
    globalStyles: [
      {
        // The self-hosted IBM Plex faces and the document reset, imported once by each docs entry.
        stylesheet: 'apps/docs/src/styles.css',
        importers: ['apps/docs/src/main.tsx'],
        authority: 'docs/spec/ultima.md#typefaces',
      },
    ],
    testPlacement: ['packages/ui', 'packages/elements', 'packages/tokens', 'packages/blocks'].map((directory) => ({
      package: `${directory}/`,
      tests: `${directory}/src/__tests__/`,
    })),
    unclaimed,
    anchors(document) {
      if (!anchorCache.has(document)) {
        const text = files.read(document);
        anchorCache.set(document, text === undefined ? undefined : headingAnchors(text));
      }
      return anchorCache.get(document);
    },
    ...(registry && { registry }),
    types: {
      // Production sources only: an import of docs or tooling is ULT-IMPORT-001's finding, not something to type.
      program: (roots) =>
        createTypeProgram(files, resolve, compilerOptions(), roots, (path) =>
          ['react-component', 'react-helper', 'token-source', 'declarations'].includes(kinds.get(path) as string),
        ),
      styleSlot: { path: 'packages/ui/src/lib/component.ts', name: 'StyleProp' },
    },
    exceptions: { path: EXCEPTIONS, text: files.read(EXCEPTIONS) },
    problems,
  };
}
