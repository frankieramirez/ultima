/**
 * Finds scenario registrations by reading source: an import that resolves to one of the registration
 * helpers, then each call of the imported binding with a literal ID and target. Nothing is loaded or
 * executed, and a human test title is never read.
 */
import { posix } from 'node:path';

import ts from 'typescript';

import type { Files } from '../catalogue/files.ts';
import { lineOf, parse } from '../catalogue/source.ts';
import { TARGETS, type Target } from './schema.ts';

export const HELPERS = {
  'scripts/verification/register.ts': 'scenario',
  'scripts/verification/production.ts': 'productionScenario',
} as const;

/** Where each target's canonical bindings live. */
export const TARGET_DIRECTORIES: Record<Target, string> = {
  'ui-vitest': 'packages/ui/src/__tests__',
  'docs-vitest': 'apps/docs/src/__tests__',
  'elements-vitest': 'packages/elements/src/__tests__',
  production: 'apps/docs/tests/production',
};

/** Every authored tree a registration could hide in; a helper import outside its target's directory is misplaced. */
const SCANNED = ['packages', 'apps/docs/src', 'apps/docs/tests'];
const SKIPPED = new Set(['node_modules', 'dist', 'generated']);

export type Binding = { id: string; target: Target; path: string; line: number };
export type BindingProblem = { code: 'dynamic-registration' | 'misplaced-binding'; path: string; message: string };

function sourceFiles(files: Files, directory: string): string[] {
  return (files.list(directory) ?? []).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.directory) return SKIPPED.has(entry.name) ? [] : sourceFiles(files, path);
    return /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [path] : [];
  });
}

function resolve(from: string, specifier: string): string {
  const base = posix.normalize(posix.join(posix.dirname(from), specifier));
  return /\.(ts|tsx)$/.test(base) ? base : `${base}.ts`;
}

function literalText(node: ts.Expression | undefined): string | undefined {
  return node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : undefined;
}

export function discoverBindings(files: Files): { bindings: Binding[]; problems: BindingProblem[]; read: string[] } {
  const bindings: Binding[] = [];
  const problems: BindingProblem[] = [];
  const read: string[] = [];
  const helperPaths = Object.keys(HELPERS);

  for (const path of SCANNED.flatMap((directory) => sourceFiles(files, directory))) {
    const text = files.read(path) as string;
    if (!text.includes('verification/')) continue;
    read.push(path);
    const file = parse(path, text);
    const at = (node: ts.Node) => `${path}:${lineOf(file, node)}`;

    /** Local names that call a helper directly, and namespaces whose property does. */
    const direct = new Map<string, string>();
    const namespaces = new Map<string, string>();
    for (const statement of file.statements) {
      const specifier =
        (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
        statement.moduleSpecifier &&
        ts.isStringLiteral(statement.moduleSpecifier)
          ? statement.moduleSpecifier.text
          : undefined;
      if (!specifier?.startsWith('.')) continue;
      const helper = resolve(path, specifier);
      if (!helperPaths.includes(helper)) continue;
      const exported = HELPERS[helper as keyof typeof HELPERS];
      if (ts.isExportDeclaration(statement)) {
        problems.push({ code: 'dynamic-registration', path: at(statement), message: `re-exporting ${helper} hides its registrations; import it where the test is` });
        continue;
      }
      const clause = (statement as ts.ImportDeclaration).importClause;
      const bindingsClause = clause?.namedBindings;
      if (bindingsClause && ts.isNamespaceImport(bindingsClause)) namespaces.set(bindingsClause.name.text, exported);
      else if (bindingsClause && ts.isNamedImports(bindingsClause)) {
        for (const element of bindingsClause.elements) {
          if ((element.propertyName ?? element.name).text === exported && !element.isTypeOnly && !clause?.isTypeOnly) {
            direct.set(element.name.text, exported);
          }
        }
      }
    }
    if (direct.size === 0 && namespaces.size === 0) continue;

    const target = (Object.entries(TARGET_DIRECTORIES) as [Target, string][]).find(([, directory]) => path.startsWith(`${directory}/`))?.[0];

    const calleeOf = (node: ts.Node): boolean => {
      if (ts.isIdentifier(node)) return direct.has(node.text);
      return ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && namespaces.get(node.expression.text) === node.name.text;
    };

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) return;
      if (ts.isCallExpression(node) && calleeOf(node.expression)) {
        const [idArgument, targetArgument] = node.arguments;
        const id = literalText(idArgument);
        const declared = literalText(targetArgument);
        if (id === undefined || declared === undefined) {
          problems.push({
            code: 'dynamic-registration',
            path: at(node),
            message: 'a registration needs a literal scenario ID and a literal target; write them out so discovery can read them',
          });
        } else if (!(TARGETS as readonly string[]).includes(declared)) {
          problems.push({ code: 'dynamic-registration', path: at(node), message: `"${declared}" is not a target: ${TARGETS.join(', ')}` });
        } else if (declared !== target) {
          problems.push({
            code: 'misplaced-binding',
            path: at(node),
            message: `a ${declared} binding lives under ${TARGET_DIRECTORIES[declared as Target]}/`,
          });
        } else bindings.push({ id, target, path, line: lineOf(file, node) });
        node.arguments.slice(2).forEach(visit);
        return;
      }
      if (
        ts.isIdentifier(node) &&
        direct.has(node.text) &&
        !(ts.isCallExpression(node.parent) && node.parent.expression === node) &&
        !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node)
      ) {
        problems.push({ code: 'dynamic-registration', path: at(node), message: `"${node.text}" is only supported as a direct call` });
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  return { bindings, problems, read };
}
