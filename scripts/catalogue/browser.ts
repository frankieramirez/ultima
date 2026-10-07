import { posix } from 'node:path';

import ts from 'typescript';

import type { Files } from './files.ts';
import type { Diagnostic } from './model.ts';
import { type Import, importsOf, lineOf, mdxImports, parse } from './source.ts';

/** A Vitest browser project: its package, and the files its config loads before any test. */
export type BrowserProject = { id: 'ui' | 'docs' | 'blocks'; directory: string; setup: string[] };

export const BROWSER_PROJECTS: BrowserProject[] = [
  { id: 'ui', directory: 'packages/ui', setup: ['packages/ui/src/__tests__/setup.ts'] },
  { id: 'docs', directory: 'apps/docs', setup: [] },
  { id: 'blocks', directory: 'packages/blocks', setup: ['packages/blocks/src/__tests__/setup.ts'] },
];

export type PolicyEntry = { specifier: string; reason: string; source: string };

/** Per project: bare specifiers to prebundle although no import names them, and discovered ones Vite must not prebundle. */
export type OptimizerPolicy = Record<BrowserProject['id'], { add: PolicyEntry[]; exclude: PolicyEntry[] }>;

export type OptimizerPlan = {
  include: Record<BrowserProject['id'], string[]>;
  /** For each included specifier, the first file that imports it, or the policy entry that adds it. */
  provenance: Record<BrowserProject['id'], Map<string, string>>;
};

const CODE = /\.(tsx?|mdx)$/;

function packageName(specifier: string): string {
  const segments = specifier.split('/');
  return specifier.startsWith('@') ? segments.slice(0, 2).join('/') : (segments[0] as string);
}

/** Code-unit order, the same on every host and locale. */
export function ordinal(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function globPattern(from: string, glob: string): RegExp {
  const absolute = posix.normalize(posix.join(posix.dirname(from), glob));
  let pattern = '';
  for (let index = 0; index < absolute.length; index += 1) {
    const char = absolute[index] as string;
    if (absolute.startsWith('**/', index)) {
      pattern += '(?:.*/)?';
      index += 2;
    } else if (char === '*') pattern += '[^/]*';
    else if (char === '{') {
      const end = absolute.indexOf('}', index);
      pattern += `(?:${absolute.slice(index + 1, end).split(',').map((part) => part.replace(/[.+^$()|[\]\\]/g, '\\$&')).join('|')})`;
      index = end;
    } else pattern += char.replace(/[.+?^$()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${pattern}$`);
}

function moduleGlobsOf(file: ts.SourceFile): { patterns: string[]; line: number }[] {
  const found: { patterns: string[]; line: number }[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'glob' &&
      node.expression.expression.getText(file) === 'import.meta'
    ) {
      const [first, options] = node.arguments;
      const query =
        options &&
        ts.isObjectLiteralExpression(options) &&
        options.properties.some((property) => property.name?.getText(file) === 'query');
      const patterns = first && ts.isArrayLiteralExpression(first) ? [...first.elements] : first ? [first] : [];
      if (!query) {
        found.push({
          patterns: patterns.filter(ts.isStringLiteralLike).map((pattern) => pattern.text),
          line: lineOf(file, node),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

/**
 * The bare runtime specifiers each browser-test project reaches from its tests and setup files,
 * through local, workspace and MDX imports. `generated` stands in for the committed projections, and
 * `barrel` maps each public UI name to the component file that exports it.
 */
export function browserDependencies(
  files: Files,
  generated: Map<string, string>,
  barrel: Map<string, string>,
  policy: OptimizerPolicy,
): { plan: OptimizerPlan; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const read = (path: string) => generated.get(path) ?? files.read(path);

  const filesUnder = (directory: string): string[] =>
    (files.list(directory) ?? []).flatMap((entry) =>
      entry.directory ? filesUnder(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`],
    );

  const workspace = new Map<string, { directory: string; exports: Record<string, string> }>();
  for (const area of ['packages', 'apps']) {
    for (const entry of files.list(area) ?? []) {
      const manifest = read(`${area}/${entry.name}/package.json`);
      if (!entry.directory || manifest === undefined) continue;
      const { name, exports } = JSON.parse(manifest) as { name: string; exports?: Record<string, string> };
      workspace.set(name, { directory: `${area}/${entry.name}`, exports: exports ?? {} });
    }
  }

  const resolveFile = (base: string): string | undefined =>
    [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => read(candidate) !== undefined);

  const resolveWorkspace = (specifier: string): string | undefined => {
    const name = packageName(specifier);
    const target = workspace.get(name);
    if (!target) return undefined;
    const subpath = `.${specifier.slice(name.length)}`;
    for (const [key, value] of Object.entries(target.exports)) {
      const star = key.indexOf('*');
      const matched =
        star === -1
          ? key === subpath && value
          : subpath.startsWith(key.slice(0, star)) &&
            subpath.endsWith(key.slice(star + 1)) &&
            value.replace('*', subpath.slice(star, subpath.length - (key.length - star - 1)));
      if (matched) return posix.normalize(posix.join(target.directory, matched));
    }
    return undefined;
  };

  const owningManifest = (path: string) => {
    const directory = [...workspace.values()].map((entry) => entry.directory).find((dir) => path.startsWith(`${dir}/`));
    const manifest = JSON.parse((directory && read(`${directory}/package.json`)) ?? '{}') as Record<string, Record<string, string>>;
    return {
      manifest: `${directory}/package.json`,
      names: new Set([...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.devDependencies ?? {})]),
    };
  };

  const include = {} as OptimizerPlan['include'];
  const provenance = {} as OptimizerPlan['provenance'];
  for (const project of BROWSER_PROJECTS) {
    const tests = filesUnder(`${project.directory}/src/__tests__`).filter((path) => /\.test\.tsx?$/.test(path));
    const found = new Map<string, string>();
    const queue = [...tests, ...project.setup.filter((path) => read(path) !== undefined)];
    const visited = new Set<string>();
    const report = (path: string, message: string) => diagnostics.push({ code: 'unresolved-import', path, message });

    const follow = (path: string, where: string, specifier: string) => {
      if (!CODE.test(path)) return;
      if (read(path) === undefined) report(where, `"${specifier}" resolves to ${path}, which is missing`);
      else queue.push(path);
    };

    while (queue.length > 0) {
      const path = queue.shift() as string;
      if (visited.has(path)) continue;
      visited.add(path);
      const text = read(path) as string;
      let imports: Import[];
      if (path.endsWith('.mdx')) imports = mdxImports(path, text);
      else {
        const file = parse(path, text);
        const analysed = importsOf(file);
        for (const problem of analysed.problems) report(`${path}:${problem.line}`, problem.message);
        imports = analysed.imports;
        for (const { patterns, line } of moduleGlobsOf(file)) {
          const tests = patterns.map((pattern) => globPattern(path, pattern));
          const directory = posix.normalize(posix.join(posix.dirname(path), patterns[0]?.split('*')[0] ?? '.'));
          const matches = filesUnder(directory.replace(/\/$/, '')).filter((candidate) => tests.some((test) => test.test(candidate)));
          if (matches.length === 0) report(`${path}:${line}`, `import.meta.glob(${JSON.stringify(patterns)}) matches no file`);
          queue.push(...matches.filter((match) => CODE.test(match)));
        }
      }
      for (const { specifier, typeOnly, names, line } of imports) {
        const where = `${path}:${line}`;
        if (typeOnly || (names.length > 0 && names.every((name) => name.typeOnly))) continue;
        if (specifier.includes('?') || specifier.startsWith('node:')) continue;
        if (specifier.startsWith('.')) {
          const base = posix.normalize(posix.join(posix.dirname(path), specifier));
          const resolved = resolveFile(base);
          if (resolved) follow(resolved, where, specifier);
          else if (CODE.test(base) || !/\.[a-z0-9]+$/i.test(base)) report(where, `"${specifier}" resolves to no file`);
        } else if (workspace.has(packageName(specifier))) {
          if (specifier === '@ultima/ui') {
            for (const { imported } of names) {
              const owner = barrel.get(imported);
              if (owner) follow(owner, where, specifier);
              else report(where, `@ultima/ui exports no "${imported}"`);
            }
            continue;
          }
          const resolved = resolveWorkspace(specifier);
          if (resolved) follow(resolved, where, specifier);
          else report(where, `"${specifier}" is not in its workspace package's exports`);
        } else if (!found.has(specifier)) found.set(specifier, where);
      }
    }

    const { add, exclude } = policy[project.id];
    const excluded = new Set(exclude.map((entry) => entry.specifier));
    for (const entry of exclude) {
      if (!found.has(entry.specifier)) {
        diagnostics.push({
          code: 'stale-policy',
          path: entry.source,
          message: `${project.id} excludes "${entry.specifier}", which no ${project.id} browser test imports`,
        });
      }
    }
    for (const entry of add) {
      if (found.has(entry.specifier)) {
        diagnostics.push({
          code: 'stale-policy',
          path: entry.source,
          message: `${project.id} adds "${entry.specifier}", which ${found.get(entry.specifier)} already imports`,
        });
      }
      found.set(entry.specifier, `policy: ${entry.reason}`);
    }
    for (const [specifier, where] of found) {
      const importer = where.startsWith('policy: ') ? `${project.directory}/package.json` : where;
      const { manifest, names } = owningManifest(importer);
      if (!excluded.has(specifier) && !names.has(packageName(specifier))) {
        diagnostics.push({
          code: 'unresolved-dependency',
          path: importer,
          message: `"${specifier}" is not a dependency of ${manifest}; declare it there or exclude it in scripts/catalogue/optimizer-policy.ts`,
        });
      }
    }
    const kept = [...found.keys()].filter((specifier) => !excluded.has(specifier)).sort(ordinal);
    include[project.id] = kept;
    provenance[project.id] = new Map(kept.map((specifier) => [specifier, found.get(specifier) as string]));
  }
  return { plan: { include, provenance }, diagnostics };
}
