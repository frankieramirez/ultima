// ULT-SOURCE-001: one source file per component, the React client directive, module-scope StyleX
// tables, test placement and incomplete scaffold markers. docs/spec/agent-infrastructure.md, Rule
// catalogue; docs/spec/ultima.md, One file per component.
import ts from 'typescript';

import type { Diagnostic } from '../diagnostic.ts';
import { DOCS_KINDS, PRODUCTION_KINDS, type SourceKind } from '../scope.ts';
import type { Parsed } from '../sources.ts';
import type { Context } from './context.ts';

const INFRA = 'docs/spec/agent-infrastructure.md';
const SCOPES = `${INFRA}#authority-and-source-scopes`;
const ONE_FILE = 'docs/spec/ultima.md#one-file-per-component';
const TESTS = 'docs/spec/ultima.md#what-a-build-ticket-proves';
const SCAFFOLD = `${INFRA}#scaffolding`;

export const INCOMPLETE_MARKER = '@ultima-scaffold-incomplete';

/** Kinds whose StyleX tables must sit at module scope: every component and element file, and the shared helpers. */
const TABLE_KINDS: readonly SourceKind[] = ['react-component', 'react-helper', 'element'];
/** Kinds a scaffold writes into, where a leftover marker means unfinished work. Tooling may print the marker. */
const MARKER_KINDS: readonly SourceKind[] = [...PRODUCTION_KINDS, ...DOCS_KINDS, 'test', 'metadata'];
const TABLE_CALLS = new Set(['create', 'keyframes']);

function fileStart(path: string, fields: Pick<Diagnostic, 'message' | 'repair' | 'link'> & { target?: string }): Diagnostic {
  return {
    ruleId: 'ULT-SOURCE-001',
    severity: 'blocking',
    file: path,
    start: { line: 1, column: 1 },
    end: { line: 1, column: 1 },
    ...fields,
  };
}

export function checkSource(context: Context): void {
  const { scope } = context;

  for (const path of scope.unclassified) {
    context.diagnostics.push(
      fileStart(path, {
        message: 'No source scope classifies this file, so no rule can say what it may contain or import.',
        repair: 'Move it to the location its role uses (a component file, a helper, a demo, a test under src/__tests__/), or classify the new location in the scope inventory.',
        link: SCOPES,
      }),
    );
  }

  for (const { path, message } of scope.unclaimed) {
    context.diagnostics.push(
      fileStart(path, {
        message: `A component source must be one registry item of the same name: ${message}.`,
        repair: 'Add its descriptor under registry/metadata/, or fold the code into the component file that owns it.',
        link: ONE_FILE,
      }),
    );
  }

  for (const { path, kind } of scope.inventory) {
    if (kind === 'test') {
      const owner = scope.testPlacement.find((placement) => path.startsWith(placement.package));
      if (owner && !path.startsWith(owner.tests)) {
        context.diagnostics.push(
          fileStart(path, {
            message: `A test sits outside ${owner.tests}.`,
            repair: `Move it under ${owner.tests}; tests never live beside the component.`,
            link: TESTS,
          }),
        );
      }
    }

    if (MARKER_KINDS.includes(kind)) checkMarker(context, path);

    if (kind === 'react-component') {
      const parsed = context.source(path);
      if (parsed) checkDirective(context, parsed);
    }
    if (TABLE_KINDS.includes(kind)) {
      const parsed = context.source(path);
      if (parsed) checkTables(context, parsed);
    }
  }
}

function checkMarker(context: Context, path: string): void {
  const text = context.scope.files.read(path);
  if (text === undefined) return;
  const examples = path.endsWith('.mdx') ? (context.source(path)?.examples ?? []) : [];
  for (let at = text.indexOf(INCOMPLETE_MARKER); at !== -1; at = text.indexOf(INCOMPLETE_MARKER, at + 1)) {
    if (examples.some((range) => at >= range.start && at < range.end)) continue;
    const parsed: Parsed = context.source(path) ?? { path, text, segments: [], elements: [], examples: [], problems: [] };
    context.report({
      ruleId: 'ULT-SOURCE-001',
      parsed,
      start: at,
      end: at + INCOMPLETE_MARKER.length,
      target: INCOMPLETE_MARKER,
      message: 'An incomplete scaffold marker remains: the generated skeleton has not been completed.',
      repair: 'Finish the contract the marker names, then delete the marker.',
      link: SCAFFOLD,
    });
  }
}

function checkDirective(context: Context, parsed: Parsed): void {
  const file = (parsed.segments[0] as Parsed['segments'][number]).file;
  const first = file.statements[0];
  const directive =
    first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === 'use client';
  if (directive) return;
  context.report({
    ruleId: 'ULT-SOURCE-001',
    parsed,
    start: first ? first.getStart(file) : 0,
    end: first ? first.getEnd() : 0,
    target: 'use client',
    message: "A React component file does not start with the 'use client' directive.",
    repair: "Make 'use client'; the file's first statement.",
    link: ONE_FILE,
  });
}

function topLevelName(node: ts.Node): string | undefined {
  let current: ts.Node = node;
  while (current.parent && !ts.isSourceFile(current.parent)) current = current.parent;
  if ((ts.isFunctionDeclaration(current) || ts.isClassDeclaration(current)) && current.name) return current.name.text;
  if (ts.isVariableStatement(current)) {
    const [first] = current.declarationList.declarations;
    if (first && ts.isIdentifier(first.name)) return first.name.text;
  }
  return undefined;
}

const WRAPPERS = (node: ts.Node) =>
  ts.isParenthesizedExpression(node) ||
  ts.isAsExpression(node) ||
  ts.isSatisfiesExpression(node) ||
  ts.isTypeAssertionExpression(node) ||
  ts.isNonNullExpression(node);

/** A module-scope `const` initializer, through type-only wrappers. */
function isModuleScopeInitializer(node: ts.Node): ts.VariableDeclaration | undefined {
  let current = node;
  while (current.parent && WRAPPERS(current.parent)) current = current.parent;
  const declaration = current.parent;
  if (!declaration || !ts.isVariableDeclaration(declaration) || declaration.initializer !== current) return undefined;
  const list = declaration.parent;
  if (!ts.isVariableDeclarationList(list) || !(list.flags & ts.NodeFlags.Const)) return undefined;
  const statement = list.parent;
  return ts.isVariableStatement(statement) && ts.isSourceFile(statement.parent) ? declaration : undefined;
}

/** The StyleX bindings a file holds: the namespace or default import, and `create`/`keyframes` under any local name. */
function styleXBindings(file: ts.SourceFile): { namespaces: Set<string>; calls: Map<string, string> } {
  const namespaces = new Set<string>();
  /** Local name to the StyleX function it is. */
  const calls = new Map<string, string>();
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (statement.moduleSpecifier.text !== '@stylexjs/stylex') continue;
    const clause = statement.importClause;
    if (!clause || clause.isTypeOnly) continue;
    if (clause.name) namespaces.add(clause.name.text);
    const bindings = clause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) namespaces.add(bindings.name.text);
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        const imported = (element.propertyName ?? element.name).text;
        if (!element.isTypeOnly && TABLE_CALLS.has(imported)) calls.set(element.name.text, imported);
      }
    }
  }
  // Module-scope aliases: `const sx = stylex`, `const make = stylex.create`, `const { create } = stylex`.
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement) || !(statement.declarationList.flags & ts.NodeFlags.Const)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const init = declaration.initializer;
      if (!init) continue;
      if (ts.isIdentifier(declaration.name)) {
        if (ts.isIdentifier(init) && namespaces.has(init.text)) namespaces.add(declaration.name.text);
        else if (ts.isIdentifier(init) && calls.has(init.text)) calls.set(declaration.name.text, calls.get(init.text) as string);
        else if (ts.isPropertyAccessExpression(init) && ts.isIdentifier(init.expression) && namespaces.has(init.expression.text) && TABLE_CALLS.has(init.name.text)) {
          calls.set(declaration.name.text, init.name.text);
        }
      } else if (ts.isObjectBindingPattern(declaration.name) && ts.isIdentifier(init) && namespaces.has(init.text)) {
        for (const element of declaration.name.elements) {
          const imported = element.propertyName ?? element.name;
          if (ts.isIdentifier(imported) && TABLE_CALLS.has(imported.text) && ts.isIdentifier(element.name)) calls.set(element.name.text, imported.text);
        }
      }
    }
  }
  return { namespaces, calls };
}

/** An identifier in a declaration or type position, which is never a use of the binding's value. */
function isDeclarationOrType(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (!parent) return true;
  if (ts.isImportClause(parent) || ts.isNamespaceImport(parent) || ts.isImportSpecifier(parent)) return true;
  if (ts.isQualifiedName(parent) || ts.isTypeQueryNode(parent) || ts.isTypeReferenceNode(parent)) return true;
  if ((ts.isVariableDeclaration(parent) || ts.isBindingElement(parent)) && parent.name === node) return true;
  if (ts.isBindingElement(parent) && parent.propertyName === node) return true;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return true;
  if ((ts.isPropertyAssignment(parent) || ts.isPropertyDeclaration(parent) || ts.isPropertySignature(parent)) && parent.name === node) return true;
  return false;
}

function checkTables(context: Context, parsed: Parsed): void {
  const file = (parsed.segments[0] as Parsed['segments'][number]).file;
  const { namespaces, calls } = styleXBindings(file);
  if (namespaces.size === 0 && calls.size === 0) return;

  const escape = (node: ts.Node, what: string) =>
    context.report({
      ruleId: 'ULT-ANALYSIS-001',
      parsed,
      start: node.getStart(file),
      end: node.getEnd(),
      ...(topLevelName(node) && { symbol: topLevelName(node) }),
      target: 'stylex',
      message: `${what}, so the checker cannot find every StyleX table in the file.`,
      repair: 'Call stylex.create or stylex.keyframes directly, or through a module-scope const alias.',
      link: 'docs/spec/agent-infrastructure.md#values-and-runtime-styles',
    });

  const table = (call: ts.CallExpression, name: string) => {
    if (isModuleScopeInitializer(call)) return;
    context.report({
      ruleId: 'ULT-SOURCE-001',
      parsed,
      start: call.getStart(file),
      end: call.getEnd(),
      ...(topLevelName(call) && { symbol: topLevelName(call) }),
      target: `stylex.${name}`,
      message: `A stylex.${name} table is not a module-scope const, so it is rebuilt at run time or hidden from the compiler.`,
      repair: `Move the stylex.${name} call to a module-scope const and read it from there.`,
      link: ONE_FILE,
    });
  };

  const visit = (node: ts.Node) => {
    if (ts.isIdentifier(node) && !isDeclarationOrType(node)) {
      const parent = node.parent;
      if (namespaces.has(node.text)) {
        let member: string | undefined;
        let access: ts.Expression | undefined;
        if (parent && ts.isPropertyAccessExpression(parent) && parent.expression === node) {
          member = parent.name.text;
          access = parent;
        } else if (parent && ts.isElementAccessExpression(parent) && parent.expression === node) {
          if (ts.isStringLiteralLike(parent.argumentExpression)) {
            member = parent.argumentExpression.text;
            access = parent;
          } else escape(parent, 'StyleX is read through a computed member');
        } else if (!isModuleScopeInitializer(node)) escape(node, 'The StyleX namespace is used as a value');
        if (member && access && TABLE_CALLS.has(member)) {
          const call = access.parent;
          if (call && ts.isCallExpression(call) && call.expression === access) table(call, member);
          else if (!isModuleScopeInitializer(access)) escape(access, `stylex.${member} is passed on as a value`);
        }
      } else if (calls.has(node.text)) {
        if (parent && ts.isCallExpression(parent) && parent.expression === node) table(parent, calls.get(node.text) as string);
        else if (!isModuleScopeInitializer(node)) escape(node, `The StyleX ${node.text} binding is passed on as a value`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}
