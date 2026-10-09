// Syntax-aware edits `init` proposes for an existing project: docs/spec/consumer-setup.md, File and edit contract.
// Each reads the file's syntax tree and returns text insertions at positions in the original, so comments,
// formatting and every option it does not name survive. Nothing here executes configuration.
import postcss, { type ChildNode, type Container, type Rule } from 'postcss';
import ts from 'typescript';

import { unlayeredResets } from './setup.ts';

export type Edit = { start: number; end: number; text: string };

/** Either the edits that bring the file to the wanted shape (none when it already has it), or why it needs manual repair. */
export type EditResult = { edits: Edit[] } | { conflict: string };

export function applyEdits(text: string, edits: Edit[]): string {
  return [...edits].sort((a, b) => b.start - a.start).reduce((result, { start, end, text: insert }) => result.slice(0, start) + insert + result.slice(end), text);
}

function lineStart(text: string, offset: number): number {
  return text.lastIndexOf('\n', offset - 1) + 1;
}

function indentAt(text: string, offset: number): string {
  return /^[ \t]*/.exec(text.slice(lineStart(text, offset)))?.[0] ?? '';
}

// JSON and JSONC: package.json, tsconfig*.json, components.json.

export type Json = { source: ts.JsonSourceFile; value: Record<string, unknown> };

/** Parses JSON with comments and trailing commas, as tsconfig allows. Null when it does not parse to an object. */
export function parseJson(file: string, text: string): Json | null {
  const { config, error } = ts.parseConfigFileTextToJson(file, text);
  if (error || typeof config !== 'object' || config === null || Array.isArray(config)) return null;
  return { source: ts.parseJsonText(file, text), value: config as Record<string, unknown> };
}

function rootObject(source: ts.JsonSourceFile): ts.ObjectLiteralExpression | undefined {
  const expression = source.statements[0]?.expression;
  return expression && ts.isObjectLiteralExpression(expression) ? expression : undefined;
}

function keyOf(property: ts.ObjectLiteralElementLike): string | undefined {
  return ts.isPropertyAssignment(property) && (ts.isStringLiteral(property.name) || ts.isIdentifier(property.name)) ? property.name.text : undefined;
}

/** The object literal at `path` from the root, `null` when a key on the way is absent, `undefined` when one is not an object. */
export function objectAt(source: ts.JsonSourceFile, path: string[]): ts.ObjectLiteralExpression | null | undefined {
  let node = rootObject(source);
  for (const key of path) {
    if (!node) return undefined;
    const property = node.properties.find((candidate) => keyOf(candidate) === key) as ts.PropertyAssignment | undefined;
    if (!property) return null;
    node = ts.isObjectLiteralExpression(property.initializer) ? property.initializer : undefined;
  }
  return node;
}

/**
 * Adds `"key": value` to `object`, last, or with `sorted` in alphabetical position when the existing keys are
 * sorted, as package.json dependency maps are. Indentation follows the neighbouring properties.
 */
export function insertProperty(text: string, source: ts.JsonSourceFile, object: ts.ObjectLiteralExpression, key: string, value: string, sorted = false): Edit {
  const open = object.getStart(source);
  const close = object.getEnd() - 1;
  const entry = `${JSON.stringify(key)}: ${value}`;
  const properties = object.properties;
  if (properties.length === 0) {
    const outer = indentAt(text, open);
    return { start: open + 1, end: close, text: `\n${outer}  ${entry}\n${outer}` };
  }
  const first = properties[0] as ts.ObjectLiteralElementLike;
  const inline = !text.slice(open, close).includes('\n');
  const indent = inline ? ' ' : `\n${indentAt(text, first.getStart(source))}`;
  const keys = properties.map(keyOf);
  const ordered = sorted && keys.every((name, index) => name !== undefined && (index === 0 || (keys[index - 1] as string) <= name));
  const next = ordered ? properties.find((property) => (keyOf(property) as string) > key) : undefined;
  if (next) return { start: next.getStart(source), end: next.getStart(source), text: `${entry},${indent}` };
  const last = properties[properties.length - 1] as ts.ObjectLiteralElementLike;
  const trailing = /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*,/.exec(text.slice(last.getEnd(), close));
  if (trailing) {
    const comma = last.getEnd() + trailing[0].length;
    const at = comma + (/^[ \t]*\/\/[^\n]*/.exec(text.slice(comma))?.[0].length ?? 0);
    return { start: at, end: at, text: `${indent}${entry},` };
  }
  return { start: last.getEnd(), end: last.getEnd(), text: `,${indent}${entry}` };
}

/**
 * Sets `path` (ending in a key) to `value` in a JSONC document, creating the missing objects on the way.
 * Null when a key on the way holds something other than an object.
 */
export function ensureJsonPath(text: string, file: string, path: string[], value: string, sorted = false): Edit | null {
  const parsed = parseJson(file, text);
  if (!parsed) return null;
  for (let depth = path.length - 1; depth >= 0; depth -= 1) {
    const object = objectAt(parsed.source, path.slice(0, depth));
    if (object === undefined) return null;
    if (object === null) continue;
    const nested = path.slice(depth + 1).reduceRight((inner, key) => `{ ${JSON.stringify(key)}: ${inner} }`, value);
    return insertProperty(text, parsed.source, object, path[depth] as string, nested, sorted && depth === path.length - 1);
  }
  return null;
}

// TypeScript modules: vite.config.ts and the Next root layout.

function parseModule(file: string, text: string): ts.SourceFile {
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

function hasSyntaxErrors(source: ts.SourceFile): boolean {
  return ((source as unknown as { parseDiagnostics?: unknown[] }).parseDiagnostics?.length ?? 0) > 0;
}

function importStyle(source: ts.SourceFile): { quote: string; semi: string } {
  const imports = source.statements.filter(ts.isImportDeclaration);
  const quote = imports[0]?.moduleSpecifier.getText(source).startsWith('"') ? '"' : "'";
  const semi = imports.length === 0 || imports.some((statement) => statement.getText(source).endsWith(';')) ? ';' : '';
  return { quote, semi };
}

/** Where a new import goes: after the last import, or before the first import `before` matches. */
function importInsertion(text: string, source: ts.SourceFile, line: string, before?: (specifier: string) => boolean): Edit {
  const imports = source.statements.filter(ts.isImportDeclaration);
  const ahead = before && imports.find((statement) => ts.isStringLiteral(statement.moduleSpecifier) && before(statement.moduleSpecifier.text));
  if (ahead) {
    const at = lineStart(text, ahead.getStart(source));
    return { start: at, end: at, text: `${line}\n` };
  }
  const last = imports.at(-1);
  if (last) return { start: last.getEnd(), end: last.getEnd(), text: `\n${line}` };
  const first = source.statements.find((statement) => !(ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression)));
  const at = first ? lineStart(text, first.getStart(source)) : text.length;
  return { start: at, end: at, text: `${line}\n${first ? '\n' : ''}` };
}

/** Adds a side-effect import of `specifier`, once. `before` names imports it must precede, such as the theme stylesheet. */
export function sideEffectImport(file: string, text: string, specifier: string, before?: (specifier: string) => boolean): EditResult {
  const source = parseModule(file, text);
  if (hasSyntaxErrors(source)) return { conflict: `${file} does not parse` };
  const present = source.statements.some((statement) => ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text === specifier);
  if (present) return { edits: [] };
  const { quote, semi } = importStyle(source);
  return { edits: [importInsertion(text, source, `import ${quote}${specifier}${quote}${semi}`, before)] };
}

const REACT_PLUGINS = ['@vitejs/plugin-react', '@vitejs/plugin-react-swc'];

function stripWrappers(node: ts.Expression): ts.Expression {
  while (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) node = node.expression;
  return node;
}

/**
 * Puts `ultimaStylex()` first in a recognized vite.config.ts: a default export of an object literal, or of
 * `defineConfig` called with one, whose `plugins` is an array literal that calls the React plugin. Anything
 * computed (a function, a conditional, a variable or spread plugin list) is left for manual repair.
 */
export function viteConfigEdits(file: string, text: string): EditResult {
  const source = parseModule(file, text);
  if (hasSyntaxErrors(source)) return { conflict: `${file} does not parse` };
  let react: string | undefined;
  let stylex: string | undefined;
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const from = statement.moduleSpecifier.text;
    const clause = statement.importClause;
    if (REACT_PLUGINS.includes(from) && clause?.name) react = clause.name.text;
    if (from.replace(/\.[mc]?[jt]s$/, '') === './ultima.vite' && clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      stylex = clause.namedBindings.elements.find((element) => (element.propertyName ?? element.name).text === 'ultimaStylex')?.name.text;
    }
  }
  if (!react) return { conflict: `${file} has no default import of ${REACT_PLUGINS.join(' or ')}` };
  const exported = source.statements.find((statement): statement is ts.ExportAssignment => ts.isExportAssignment(statement) && !statement.isExportEquals);
  if (!exported) return { conflict: `${file} has no default export` };
  let config = stripWrappers(exported.expression);
  if (ts.isCallExpression(config) && ts.isIdentifier(config.expression) && config.expression.text === 'defineConfig' && config.arguments.length === 1) {
    config = stripWrappers(config.arguments[0] as ts.Expression);
  }
  if (!ts.isObjectLiteralExpression(config)) return { conflict: `${file} computes its config (${config.getText(source).slice(0, 40)}…), which init does not execute` };
  const plugins = config.properties.find((property) => ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) && property.name.text === 'plugins');
  if (!plugins || !ts.isPropertyAssignment(plugins)) return { conflict: `${file} has no plugins array to add ultimaStylex() to` };
  const list = stripWrappers(plugins.initializer);
  if (!ts.isArrayLiteralExpression(list)) return { conflict: `${file} computes plugins (${list.getText(source).slice(0, 40)}), which init does not execute` };
  const isCall = (element: ts.Expression | undefined, name: string | undefined) => element !== undefined && ts.isCallExpression(element) && ts.isIdentifier(element.expression) && element.expression.text === name;
  if (!list.elements.some((element) => isCall(element, react))) return { conflict: `${file} does not call ${react}() inside plugins` };
  if (stylex) {
    return isCall(list.elements[0], stylex) ? { edits: [] } : { conflict: `${file} imports ultimaStylex but does not call it first in plugins` };
  }
  const first = list.elements[0] as ts.Expression;
  const multiline = text.slice(list.getStart(source), first.getStart(source)).includes('\n');
  const call = { start: first.getStart(source), end: first.getStart(source), text: multiline ? `ultimaStylex(),\n${indentAt(text, first.getStart(source))}` : 'ultimaStylex(), ' };
  const { quote, semi } = importStyle(source);
  return { edits: [importInsertion(text, source, `import { ultimaStylex } from ${quote}./ultima.vite.ts${quote}${semi}`), call] };
}

// CSS: the reset rules an entry stylesheet holds outside any layer.

/**
 * Wraps each run of unlayered reset rules in `@layer reset { … }` where it stands, so their order and every
 * application or theme rule around them stay put. A reset is a selector doctor's own test flags. A selector list
 * that mixes resets with other selectors is split in place: the resets move into the layer, the others keep the
 * same declarations where they were. A selector list with comments in it is left for manual repair.
 */
export function layerResets(file: string, text: string): EditResult {
  let root: postcss.Root;
  try {
    root = postcss.parse(text, { from: file });
  } catch (error) {
    return { conflict: `${file} does not parse as CSS: ${(error as { reason?: string }).reason ?? (error as Error).message}` };
  }
  const resets = new Set<Rule>();
  const mixed = new Map<Rule, string[]>();
  const unknown: string[] = [];
  root.walkRules((rule) => {
    const found = unlayeredResets(rule);
    if (found.length === 0) return;
    if (found.length === rule.selectors.length) resets.add(rule);
    else if ((rule.raws as { selector?: unknown }).selector || rule.selector.includes('/*')) unknown.push(`\`${rule.selector}\` (line ${rule.source?.start?.line ?? '?'})`);
    else mixed.set(rule, found);
  });
  if (unknown.length > 0) return { conflict: `${file} has comments inside the reset selector list ${unknown.join(', ')}` };

  const runs: Rule[][] = [];
  const visit = (container: Container) => {
    let run: Rule[] = [];
    const close = () => {
      if (run.length > 0) runs.push(run);
      run = [];
    };
    container.each((node: ChildNode) => {
      if (node.type === 'rule' && resets.has(node)) run.push(node);
      else if (node.type !== 'comment') close();
      if ('nodes' in node && node.type === 'atrule') visit(node);
    });
    close();
  };
  visit(root);

  const layered = (indent: string, body: string) => `${indent}@layer reset {\n${body.split('\n').map((line) => (line.trim() === '' ? line : `  ${line}`)).join('\n')}\n${indent}}`;
  const splits = [...mixed].map(([rule, found]): Edit => {
    const begin = rule.source?.start?.offset ?? 0;
    const end = rule.source?.end?.offset ?? text.length;
    const brace = begin + rule.selector.length + (rule.raws.between ?? '').length;
    const block = text.slice(brace, end);
    const from = lineStart(text, begin);
    const inline = text.slice(from, begin).trim() !== '';
    const indent = inline ? '' : text.slice(from, begin);
    const join = (selectors: string[]) => selectors.join(rule.selector.includes('\n') ? `,\n${indent}` : ', ');
    const between = rule.raws.between ?? ' ';
    const others = rule.selectors.filter((selector) => !found.includes(selector.trim()));
    const reset = layered(indent, `${indent}${join(found)}${between}${block}`);
    return { start: inline ? begin : from, end, text: `${inline ? reset.trimStart() : reset}\n${indent}${join(others)}${between}${block}` };
  });

  const edits = runs.map((run): Edit => {
    const first = run[0] as Rule;
    const last = run[run.length - 1] as Rule;
    const begin = first.source?.start?.offset ?? 0;
    const end = last.source?.end?.offset ?? text.length;
    const from = lineStart(text, begin);
    if (text.slice(from, begin).trim() !== '') return { start: begin, end, text: `@layer reset { ${text.slice(begin, end)} }` };
    return { start: from, end, text: layered(text.slice(from, begin), text.slice(from, end)) };
  });
  return { edits: [...edits, ...splits] };
}
