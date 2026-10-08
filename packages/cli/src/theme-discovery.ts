import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

import postcss from 'postcss';
import ts from 'typescript';

import type { Target } from './doctor.ts';
import { consumerScope } from './scope.ts';
import { THEME_TOKEN } from './theme-content.ts';

export type ActiveArtifact = { boundary: string; path: string; kind: 'css' | 'stylex'; imports: string[] };
export type DiscoveryProblem = { boundary: string; path: string; reason: string };
export type Discovery = { artifacts: ActiveArtifact[]; problems: DiscoveryProblem[]; files: string[]; tokenSources: string[] };
const EXCLUDED = new Set(['node_modules', '.git', '.next', '.output', '.scratch', 'dist', 'build', 'coverage', '__tests__']);

export function localFiles(root: string): string[] {
  const files: string[] = [];
  const walk = (folder: string) => {
    for (const item of readdirSync(join(root, folder), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (EXCLUDED.has(item.name) || item.isSymbolicLink()) continue;
      const path = join(folder, item.name);
      if (item.isDirectory()) walk(path);
      else if (item.isFile() && !/\.(test|spec)\.[cm]?[jt]sx?$|\.d\.ts$/.test(path)) files.push(path);
    }
  };
  walk('');
  return files;
}

export function discoverThemes(root: string, target: Target | null): Discovery {
  const result: Discovery = { artifacts: [], problems: [], files: [], tokenSources: [] };
  try { result.files = localFiles(root); } catch (error) {
    result.problems.push({ boundary: '.', path: '.', reason: `Local inventory could not be read: ${String(error)}` });
    return result;
  }
  const scope = consumerScope(root);
  if ('incomplete' in scope) {
    result.problems.push({ boundary: '.', path: scope.incomplete.file, reason: scope.incomplete.message });
    return result;
  }
  const sourcePaths = new Set(scope.inventory.map(({ path }) => path));
  const problem = (boundary: string, path: string, reason: string) => { result.problems.push({ boundary, path, reason }); };
  const entries = target === 'next'
    ? result.files.filter((path) => /^(?:src\/)?app\/(?:.*\/)?(?:layout|page)\.[jt]sx?$/.test(path))
    : result.files.filter((path) => /^(?:src\/)?main\.[jt]sx?$/.test(path));
  if (target === 'vite' && existsSync(join(root, 'index.html'))) {
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    for (const match of html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi)) {
      const path = match[1]!.replace(/^\//, '');
      if (sourcePaths.has(path) && !entries.includes(path)) entries.push(path);
      else if (!sourcePaths.has(path)) problem('index.html', path, 'Entry script is outside the statically resolved local program.');
    }
    for (const match of html.matchAll(/<link\b[^>]*href=["']([^"']+\.css)["'][^>]*>/gi)) {
      const path = match[1]!.replace(/^\//, '');
      if (result.files.includes(path)) entries.push(path);
      else problem('index.html', path, 'Stylesheet is not locally resolvable.');
    }
  }
  if (!entries.length) problem('.', '.', 'No supported local application entry or layout could be resolved.');
  const read = (path: string) => readFileSync(join(root, path), 'utf8');
  const safe = (path: string) => {
    const absolute = realpathSync(join(root, path));
    const rel = relative(realpathSync(root), absolute);
    return rel !== '..' && !rel.startsWith('../') && !rel.split('/').some((segment) => EXCLUDED.has(segment));
  };
  for (const entry of entries) {
    const seen = new Set<string>();
    const active: ActiveArtifact[] = [];
    const cssTokens = new Map<string, Set<string>>();
    const visit = (path: string, imports: string[]) => {
      if (seen.has(path)) return;
      seen.add(path);
      if (!safe(path)) { problem(entry, path, 'Import leaves the local application tree.'); return; }
      const text = read(path);
      if (path.endsWith('.css')) {
        const css = postcss.parse(text);
        const names = new Set<string>();
        css.walkDecls((decl) => { if (THEME_TOKEN.test(decl.prop)) names.add(decl.prop); });
        if (names.size || /ultima-theme:provenance/.test(text)) {
          cssTokens.set(path, names);
          active.push({ boundary: entry, path, kind: 'css', imports });
        }
        css.walkAtRules('import', (rule) => {
          const specifier = /^(?:url\(\s*)?["']([^"']+)["']\s*\)?/.exec(rule.params)?.[1];
          if (!specifier) { problem(entry, path, `Unsupported CSS import: ${rule.params}`); return; }
          const local = relative(root, resolve(dirname(join(root, path)), specifier));
          if (specifier.startsWith('.') && result.files.includes(local)) visit(local, [...imports, local]);
          else problem(entry, path, `CSS import is not locally resolved: ${specifier}`);
        });
        return;
      }
      const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      if ((source as ts.SourceFile & { parseDiagnostics: unknown[] }).parseDiagnostics.length) { problem(entry, path, 'Application source does not parse.'); return; }
      if ((/\bcreateTheme\s*\(/.test(text) && /--ult-/.test(text)) || /ultima-theme:provenance/.test(text)) {
        active.push({ boundary: entry, path, kind: 'stylex', imports });
      }
      const importModule = (specifier: string, typeOnly = false) => {
        if (typeOnly) return;
        const found = scope.resolve(specifier, path);
        if (found.kind === 'file') {
          if (!found.path.endsWith('.css') && !sourcePaths.has(found.path)) { problem(entry, path, `Import is excluded from the local program: ${specifier}`); return; }
          visit(found.path, [...imports, found.path]);
        } else if (found.kind === 'unresolved' || specifier.endsWith('.css')) problem(entry, path, `Import cannot be resolved locally: ${specifier}`);
      };
      for (const statement of source.statements) {
        if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
          importModule(statement.moduleSpecifier.text, statement.importClause?.isTypeOnly);
          const binding = statement.importClause?.namedBindings;
          if (binding && ts.isNamedImports(binding)) for (const element of binding.elements) {
            if ((element.propertyName?.text ?? element.name.text) !== 'ultimaTheme') continue;
            const name = element.name.text;
            const references: ts.Node[] = [];
            const find = (node: ts.Node) => {
              if (ts.isIdentifier(node) && node.text === name && !ts.isImportSpecifier(node.parent)) references.push(node);
              ts.forEachChild(node, find);
            };
            find(source);
            if (!references.length) problem(entry, path, `Imported ${name} is not statically applied to a boundary.`);
            for (const reference of references) {
              const parent = reference.parent;
              if (!ts.isPropertyAccessExpression(parent) || !['dark', 'light'].includes(parent.name.text)) {
                problem(entry, path, `Computed or unsupported ${name} mode selection; rendering must be verified separately.`);
              } else {
                let container: ts.Node | undefined = parent.parent;
                while (container && !ts.isCallExpression(container) && !ts.isStatement(container)) container = container.parent;
                if (!container || !ts.isCallExpression(container) || container.expression.getText(source) !== 'stylex.props') {
                  problem(entry, path, `${name}.${parent.name.text} is not statically applied through stylex.props.`);
                }
              }
            }
          }
        } else if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) importModule(statement.moduleSpecifier.text, statement.isTypeOnly);
      }
      const dynamic = (node: ts.Node) => {
        if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(source) === 'require')) {
          problem(entry, path, `Dynamic import or require is not a static theme association: ${node.getText(source)}`);
        }
        if (ts.isObjectLiteralExpression(node) && node.properties.some((member) => ts.isPropertyAssignment(member)
          && ts.isStringLiteral(member.name) && THEME_TOKEN.test(member.name.text))
          && !(ts.isCallExpression(node.parent) && ts.isPropertyAccessExpression(node.parent.expression)
            && ['createTheme', 'defineVars'].includes(node.parent.expression.name.text))) {
          problem(entry, path, 'Inline semantic token overrides require scoped reconciliation; no linked export freshness can be established.');
        }
        ts.forEachChild(node, dynamic);
      };
      dynamic(source);
    };
    try { visit(entry, [entry]); } catch (error) { problem(entry, entry, `Discovery could not complete: ${String(error)}`); }
    for (const artifact of active) {
      const overlaps = [...cssTokens].filter(([path, names]) => path !== artifact.path && [...names].some((name) => cssTokens.get(artifact.path)?.has(name)));
      if (overlaps.length) problem(entry, artifact.path, `Multiple active CSS sources overlap theme tokens: ${overlaps.map(([path]) => path).join(', ')}. Preserve cascade order and resolve the override before certifying freshness.`);
    }
    result.artifacts.push(...active);
  }
  result.tokenSources = [...new Set(scope.tokenSources.filter((path) => result.files.includes(path)))];
  return result;
}
