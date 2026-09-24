/**
 * The source dependency graph a verification plan walks, per Selection and dependency expansion under
 * Verification CLI in docs/spec/agent-infrastructure.md. It reuses the architecture checker's workspace
 * scope for the inventory and for resolving specifiers, and the catalogue parser for imports, so a
 * file's dependencies are read the same way everywhere. Built for the checkout and for the base commit
 * alike; nothing here runs a process or loads a module.
 *
 * An edge the graph cannot establish is recorded as unresolved, never dropped: the planner broadens to
 * release when one could hide a dependant.
 */
import { posix } from 'node:path';

import ts from 'typescript';

import { workspaceScope } from '../../packages/analysis/src/workspace.ts';
import type { Classified, SourceKind } from '../../packages/analysis/src/scope.ts';
import type { Files } from '../catalogue/files.ts';
import { BARREL, type Catalogue } from '../catalogue/model.ts';
import { importsOf, lineOf, mdxImports, parse } from '../catalogue/source.ts';

/**
 * `import` and `glob` edges always carry a change to the importer. A `barrel` edge is one name imported
 * from the UI barrel, drawn to the item that exports it; `barrel-name` is the same import's edge to the
 * barrel file itself, followed only when the barrel is what changed, so one component's edit does not
 * reach every file that imports some other name from the barrel.
 */
export type EdgeVia = 'import' | 'glob' | 'barrel' | 'barrel-name' | 'build-output';

export type Edge = { from: string; to: string; via: EdgeVia; specifier: string; line: number };

export type Unresolved = { path: string; line: number; specifier: string; reason: string };

export type Graph = {
  inventory: Classified[];
  /** Source files no classification claims. */
  unclassified: string[];
  kindOf(path: string): SourceKind | undefined;
  has(path: string): boolean;
  /** The edges into `path`: who imports it. */
  dependants(path: string): Edge[];
  /** The edges out of `path`. */
  dependencies(path: string): Edge[];
  unresolved: Unresolved[];
  /** Test files that read inputs no import names (the file system, a fetch, a served URL). */
  opaque: Set<string>;
};

/** Kinds whose imports are not followed: deliberately invalid fixtures. */
const UNPARSED: readonly SourceKind[] = ['fixture'];

/** Kinds whose unresolved imports cannot hide a dependant the plan needs: tooling changes select release. */
const UNRESOLVED_IGNORED: readonly SourceKind[] = ['fixture', 'tooling'];

const OPAQUE_CALLS = new Set(['fetch', 'readFileSync', 'readFile', 'readdirSync', 'readdir', 'existsSync', 'statSync', 'createReadStream']);
const SERVED_URL = /^\/[\w./-]*\.(html|json|js|mjs|css|txt|svg|woff2?)$/;

/** A glob as a regular expression: `**`, `*`, `?` and `{a,b}`, matched against a whole repository path. */
export function globPattern(glob: string): RegExp {
  let source = '';
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index] as string;
    if (char === '*' && glob[index + 1] === '*') {
      const slash = glob[index + 2] === '/';
      source += slash ? '(?:.*/)?' : '.*';
      index += slash ? 2 : 1;
    } else if (char === '*') source += '[^/]*';
    else if (char === '?') source += '[^/]';
    else if (char === '{') {
      const close = glob.indexOf('}', index);
      if (close < 0) source += '\\{';
      else {
        source += `(?:${glob
          .slice(index + 1, close)
          .split(',')
          .map((part) => part.replace(/[.+^$()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*'))
          .join('|')})`;
        index = close;
      }
    } else source += char.replace(/[.+^$()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${source}$`);
}

function packageDirectory(files: Files, path: string): string {
  for (let directory = posix.dirname(path); directory !== '.'; directory = posix.dirname(directory)) {
    if (files.read(`${directory}/package.json`) !== undefined) return directory;
  }
  return '';
}

/** `import.meta.glob(...)` calls: their literal patterns, or a problem when a pattern is computed. */
function globs(file: ts.SourceFile): { patterns: string[]; line: number; problem?: string }[] {
  const found: { patterns: string[]; line: number; problem?: string }[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'glob' &&
      ts.isMetaProperty(node.expression.expression)
    ) {
      const [argument] = node.arguments;
      const literals = argument && ts.isArrayLiteralExpression(argument) ? [...argument.elements] : argument ? [argument] : [];
      const patterns = literals.filter((entry): entry is ts.StringLiteralLike => ts.isStringLiteralLike(entry)).map((entry) => entry.text);
      found.push(
        patterns.length === literals.length && patterns.length > 0
          ? { patterns, line: lineOf(file, node) }
          : { patterns, line: lineOf(file, node), problem: 'an import.meta.glob with a computed pattern' },
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

function readsOutsideImports(file: ts.SourceFile): boolean {
  let found = false;
  const visit = (node: ts.Node) => {
    if (found) return;
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : undefined;
      if (name && OPAQUE_CALLS.has(name)) found = true;
    } else if (ts.isStringLiteralLike(node) && SERVED_URL.test(node.text)) found = true;
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

export function buildGraph(files: Files, catalogue: Catalogue): Graph {
  const scope = workspaceScope(files);
  const kinds = new Map(scope.inventory.map(({ path, kind }) => [path, kind]));
  const parsed = [...scope.inventory.filter(({ kind }) => !UNPARSED.includes(kind)).map(({ path }) => path), ...scope.unclassified];
  const known = new Set([...scope.inventory.map(({ path }) => path), ...scope.unclassified]);
  const outgoing = new Map<string, Edge[]>();
  const incoming = new Map<string, Edge[]>();
  const unresolved: Unresolved[] = [];
  const opaque = new Set<string>();
  const barrelOwners = new Map([...catalogue.exports].map(([name, entry]) => [name, `packages/ui/src/${entry.item}.tsx`]));

  const add = (edge: Edge) => {
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge]);
    incoming.set(edge.to, [...(incoming.get(edge.to) ?? []), edge]);
  };
  const problem = (path: string, line: number, specifier: string, reason: string) => {
    if (!UNRESOLVED_IGNORED.includes(kinds.get(path) as SourceKind)) unresolved.push({ path, line, specifier, reason });
  };
  /** The package directory whose `dist/` holds `target`, when it is build output. */
  const buildOutput = (target: string) => {
    const index = target.split('/').indexOf('dist');
    return index > 0 ? target.split('/').slice(0, index).join('/') : undefined;
  };
  /** Authored files of a package whose build output was imported: the output changes when they do. */
  const packageSources = (directory: string) =>
    [...known].filter((path) => path.startsWith(`${directory}/`) && ['token-source', 'element', 'react-helper', 'react-component'].includes(kinds.get(path) as string));

  for (const path of parsed) {
    const text = files.read(path);
    if (text === undefined) continue;
    const mdx = path.endsWith('.mdx');
    const file = parse(mdx ? `${path}.ts` : path.replace(/\.(m|c)?js$/, '.ts').replace(/\.jsx$/, '.tsx'), mdx ? '' : text);
    const { imports, problems } = mdx ? { imports: mdxImports(path, text), problems: [] } : importsOf(file);
    for (const entry of problems) problem(path, entry.line, 'import()', entry.message);
    if (kinds.get(path) === 'test' && !mdx && readsOutsideImports(file)) opaque.add(path);

    for (const { specifier, names, line } of imports) {
      if (/^(@\/|~\/|#)/.test(specifier)) {
        problem(path, line, specifier, 'a path alias the workspace does not resolve');
        continue;
      }
      const resolution = scope.resolve(specifier, path);
      if (resolution.kind === 'external') continue;
      const relative = specifier.startsWith('.') ? posix.normalize(posix.join(posix.dirname(path), specifier.replace(/\?.*$/, ''))) : undefined;
      const output = resolution.kind === 'file' ? buildOutput(resolution.path) : relative && buildOutput(relative);
      if (output !== undefined) {
        // Build output: it changes whenever its package's authored sources do, built or not.
        const sources = packageSources(output);
        if (sources.length === 0) problem(path, line, specifier, `build output under ${output}/ that no authored source produces`);
        for (const source of sources) add({ from: path, to: source, via: 'build-output', specifier, line });
        continue;
      }
      if (resolution.kind === 'unresolved') {
        problem(path, line, specifier, resolution.reason);
        continue;
      }
      const target = resolution.path;
      if (target === BARREL && names.length > 0) {
        for (const { imported } of names) {
          const owner = barrelOwners.get(imported);
          if (owner) add({ from: path, to: owner, via: 'barrel', specifier, line });
          else problem(path, line, specifier, `the UI barrel exports no "${imported}"`);
        }
        add({ from: path, to: BARREL, via: 'barrel-name', specifier, line });
      } else add({ from: path, to: target, via: 'import', specifier, line });
    }

    if (mdx) continue;
    for (const call of globs(file)) {
      if (call.problem) problem(path, call.line, 'import.meta.glob', call.problem);
      for (const pattern of call.patterns) {
        if (pattern.startsWith('!')) continue;
        const absolute = pattern.startsWith('/')
          ? posix.join(packageDirectory(files, path), pattern.slice(1))
          : posix.normalize(posix.join(posix.dirname(path), pattern));
        const matcher = globPattern(absolute);
        for (const target of known) if (matcher.test(target)) add({ from: path, to: target, via: 'glob', specifier: pattern, line: call.line });
      }
    }
  }

  return {
    inventory: scope.inventory,
    unclassified: scope.unclassified,
    kindOf: (path) => kinds.get(path),
    has: (path) => known.has(path),
    dependants: (path) => incoming.get(path) ?? [],
    dependencies: (path) => outgoing.get(path) ?? [],
    unresolved,
    opaque,
  };
}

export type Reach = { path: string; seed: string; via: Edge[] };

/**
 * Every file that depends on a seed, transitively, with the edge chain that reached it. A barrel-name
 * edge is followed only out of a seed barrel.
 */
export function dependantsOf(graph: Graph, seeds: Iterable<string>): Map<string, Reach> {
  const reached = new Map<string, Reach>();
  const queue: string[] = [];
  const seedSet = new Set(seeds);
  for (const seed of seedSet) {
    reached.set(seed, { path: seed, seed, via: [] });
    queue.push(seed);
  }
  while (queue.length > 0) {
    const path = queue.shift() as string;
    const at = reached.get(path) as Reach;
    for (const edge of graph.dependants(path)) {
      if (edge.via === 'barrel-name' && !seedSet.has(path)) continue;
      if (reached.has(edge.from)) continue;
      reached.set(edge.from, { path: edge.from, seed: at.seed, via: [...at.via, edge] });
      queue.push(edge.from);
    }
  }
  return reached;
}
