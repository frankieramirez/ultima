import { posix } from 'node:path';
import ts from 'typescript';

import type { Aliases } from '../../packages/cli/src/stamp.ts';
import type { Files } from './files.ts';
import type { Catalogue } from './model.ts';
import { exportsOf, importsOf, parse } from './source.ts';

export type ConsumerAliases = Aliases & { components?: string };
export const DEFAULT_ALIASES = { ui: '@/components/ui', lib: '@/lib', components: '@/components' };
export type CopyFile = { source: string; path: string; content: string };
export type CopyBundle = { entry: string; files: CopyFile[]; items: string[]; dependencies: string[] };

export function safePath(path: string): boolean {
  return path !== '' && !path.startsWith('/') && !path.includes('\\') && posix.normalize(path) === path && !path.startsWith('..');
}

export function resolveLocal(files: Files, from: string, specifier: string): string {
  const base = posix.join(posix.dirname(from), specifier);
  const found = [base, `${base}.ts`, `${base}.tsx`, `${base}.json`, `${base}/index.ts`, `${base}/index.tsx`]
    .find((path) => safePath(path) && files.read(path) !== undefined);
  if (!found) throw new Error(`${from}: unresolved local dependency "${specifier}"`);
  return found;
}

/** Only import syntax changes; directives, comments and executable source retain their bytes. */
export function consumerCopy(
  path: string,
  source: string,
  catalogue: Catalogue,
  files: Files,
  aliases: ConsumerAliases = DEFAULT_ALIASES,
): { content: string; items: string[]; dependencies: string[]; locals: string[] } {
  const configured = { ...DEFAULT_ALIASES, ...aliases };
  const file = parse(path, source);
  const items = new Set<string>();
  const dependencies = new Set<string>();
  const locals: string[] = [];
  const edits: { start: number; end: number; text: string }[] = [];
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const fail = (message: string): never => { throw new Error(`${path}: ${message}`); };
  const checkNames = (module: string, names: ts.NamedImportBindings | undefined) => {
    const text = files.read(module);
    if (text === undefined) fail(`unresolved workspace module ${module}`);
    if (names && ts.isNamedImports(names)) {
      const exported = exportsOf(parse(module, text!)).exports;
      for (const name of names.elements) {
        const imported = (name.propertyName ?? name.name).text;
        if (!exported.some((entry) => entry.name === imported)) fail(`${module} exports no "${imported}"`);
      }
    }
  };
  const analysed = importsOf(file);
  if (analysed.problems.length) fail(analysed.problems.map(({ message }) => message).join('; '));
  const collectDependency = (specifier: string) => {
    if (specifier.startsWith('.')) locals.push(resolveLocal(files, path, specifier));
    else if (!specifier.startsWith('@ultima/')) {
      const name = specifier.split('/').slice(0, specifier.startsWith('@') ? 2 : 1).join('/');
      if (!['react', 'react-dom'].includes(name)) dependencies.add(name);
    }
  };
  for (const imported of analysed.imports) {
    const specifier = imported.specifier;
    collectDependency(specifier);
    if (specifier.startsWith('@ultima/') && !file.statements.some((statement) =>
      ts.isImportDeclaration(statement) && statement.moduleSpecifier.getStart(file) === imported.start)) {
      fail('workspace re-exports and dynamic imports require an explicit import declaration');
    }
  }
  const typeDependencies = (node: ts.Node) => {
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
      const specifier = node.argument.literal.text;
      if (specifier.startsWith('@ultima/')) fail('workspace type imports require an explicit import declaration');
      collectDependency(specifier);
    }
    ts.forEachChild(node, typeDependencies);
  };
  typeDependencies(file);
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const specifier = statement.moduleSpecifier.text;
    const clause = statement.importClause;
    if (!specifier.startsWith('@ultima/')) continue;
    if (!clause || clause.name) fail(`workspace import "${specifier}" requires named or namespace exports`);
    const bindings = clause!.namedBindings;
    const groups = new Map<string, ts.ImportSpecifier[]>();
    let target: string | undefined;
    if (specifier === '@ultima/ui') {
      if (!bindings || !ts.isNamedImports(bindings)) fail('the UI barrel requires named exports');
      for (const name of (bindings as ts.NamedImports).elements) {
        const imported = (name.propertyName ?? name.name).text;
        const owner = catalogue.exports.get(imported);
        if (!owner) fail(`@ultima/ui exports no "${imported}"`);
        items.add(owner!.item);
        const module = `${configured.ui}/${owner!.item}`;
        groups.set(module, [...(groups.get(module) ?? []), name]);
      }
    } else {
      const component = catalogue.react.find((entry) => specifier === `@ultima/ui/${entry.id}`);
      const bundle = catalogue.sourceBundles.find((entry) => entry.sources.some((source) =>
        specifier === (entry.id === 'tokens' ? '@ultima/tokens/' : '@ultima/ui/lib/') + posix.basename(source).replace(/\.ts$/, '')));
      const block = catalogue.blocks.find((entry) => specifier.startsWith(`@ultima/blocks/${entry.id}/`));
      if (component) {
        checkNames(component.source, bindings);
        items.add(component.id);
        target = `${configured.ui}/${component.id}`;
      } else if (bundle) {
        const name = specifier.split('/').at(-1)!;
        checkNames(bundle.sources.find((source) => posix.basename(source, '.ts') === name)!, bindings);
        items.add(bundle.id);
        target = `${configured.lib}/${name}`;
      } else if (block) {
        const name = specifier.slice(`@ultima/blocks/${block.id}/`.length);
        if (!block.files.includes(`${name}.tsx`)) fail(`unresolved block module "${specifier}"`);
        checkNames(`${block.directory}/${name}.tsx`, bindings);
        items.add(block.id);
        target = `${configured.components}/${block.id}/${name}`;
      } else fail(`unresolved workspace module "${specifier}"`);
    }
    const declarations = target
      ? [ts.factory.updateImportDeclaration(statement, statement.modifiers, clause, ts.factory.createStringLiteral(target, true), statement.attributes)]
      : [...groups].map(([module, names]) => ts.factory.updateImportDeclaration(statement, statement.modifiers,
          ts.factory.updateImportClause(clause!, clause!.isTypeOnly, undefined, ts.factory.createNamedImports(names)),
          ts.factory.createStringLiteral(module, true), statement.attributes));
    edits.push({ start: statement.getStart(file), end: statement.end, text: declarations.map((node) => {
      ts.setEmitFlags(node, ts.EmitFlags.NoLeadingComments | ts.EmitFlags.NoTrailingComments);
      return printer.printNode(ts.EmitHint.Unspecified, node, file);
    }).join('\n') });
  }
  let content = source;
  for (const edit of edits.reverse()) content = content.slice(0, edit.start) + edit.text + content.slice(edit.end);
  return { content, items: [...items].sort(), dependencies: [...dependencies].sort(), locals };
}

/** Preserve relative imports by retaining the source tree under one consumer directory. */
export function consumerBundle(
  entry: string,
  catalogue: Catalogue,
  files: Files,
  aliases?: ConsumerAliases,
  destinations: Record<string, string> = {},
): CopyBundle {
  const copied = new Map<string, CopyFile>();
  const items = new Set<string>();
  const dependencies = new Set<string>();
  const queue = [entry];
  const destination = (source: string) => destinations[source] ?? `examples/${source.replace(/^apps\/docs\/src\//, '')}`;
  while (queue.length > 0) {
    const source = queue.shift()!;
    if (copied.has(source)) continue;
    if (!safePath(source) || !safePath(destination(source))) throw new Error(`unsafe copy path: ${source}`);
    const text = files.read(source);
    if (text === undefined) throw new Error(`missing copy source: ${source}`);
    const projected = consumerCopy(source, text, catalogue, files, aliases);
    for (const local of projected.locals) {
      const expected = posix.relative(posix.dirname(source), local);
      const actual = posix.relative(posix.dirname(destination(source)), destination(local));
      if (expected !== actual) throw new Error(`${source}: local destination for ${local} changes its relative import`);
      queue.push(local);
    }
    projected.items.forEach((item) => items.add(item));
    projected.dependencies.forEach((dependency) => dependencies.add(dependency));
    if ([...copied.values()].some((file) => file.path === destination(source))) throw new Error(`duplicate copy destination: ${destination(source)}`);
    copied.set(source, { source, path: destination(source), content: projected.content });
  }
  return { entry, files: [...copied.values()], items: [...items].sort(), dependencies: [...dependencies].sort() };
}
