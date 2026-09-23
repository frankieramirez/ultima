// docs/spec/ultima.md, Consumer CLI, Doctor, What it checks: the assertion kinds a setup
// item's hand steps declare, executed over file reads and syntax trees.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

import ts from 'typescript';

import type { Diagnostic, Position, Unsupported } from './diagnostic.ts';
import type { Assertion, HandStep } from './hand-steps.ts';

export type StepContext = {
  root: string;
  setupCommand: string;
  dependencies: string[];
  devDependencies: string[];
  aliases: string[];
  link: string;
};

const NOT_YET_CHECKED = 'Declared, but this version of doctor does not check it yet.';

export function checkStep(step: HandStep, context: StepContext): { diagnostics: Diagnostic[]; unsupported?: Unsupported } {
  if (step.assertion === undefined) return { diagnostics: [], unsupported: { step: step.prose, reason: step.unverifiable } };
  const assertion: Assertion = step.assertion;
  switch (assertion.kind) {
    case 'file-present':
      return { diagnostics: filePresent(assertion.path, context) };
    case 'config-references':
      return {
        diagnostics:
          'package' in assertion
            ? configReferences(assertion.file, assertion.package, context)
            : dependenciesDeclared(context),
      };
    case 'import-present':
      return { diagnostics: importPresent(assertion.importers, assertion.specifier, context) };
    case 'plugin-first':
      return { diagnostics: pluginFirst(assertion.plugin, assertion.from, context) };
    case 'alias-resolves':
      return { diagnostics: [...aliasesResolve(assertion.tsconfigs, context), ...noLiteralAtDirectory(context)] };
    case 'layered-resets':
    case 'version-in-range':
      return { diagnostics: [], unsupported: { step: step.prose, reason: NOT_YET_CHECKED } };
  }
}

type Finding = Omit<Diagnostic, 'link' | 'severity'> & { severity?: Diagnostic['severity'] };

function finding(context: StepContext, { severity = 'blocking', ...rest }: Finding): Diagnostic {
  return { ...rest, severity, link: context.link };
}

function filePresent(path: string, context: StepContext): Diagnostic[] {
  if (existsSync(join(context.root, path))) return [];
  return [
    finding(context, {
      ruleId: 'ULT-SETUP-012',
      file: path,
      message: `${path} is missing; the setup item installs it.`,
      repair: `Run \`${context.setupCommand}\`; it installs ${path}.`,
    }),
  ];
}

function dependenciesDeclared(context: StepContext): Diagnostic[] {
  const file = 'package.json';
  let json: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  try {
    json = JSON.parse(readFileSync(join(context.root, file), 'utf8'));
  } catch (error) {
    return [
      finding(context, {
        ruleId: 'ULT-SETUP-011',
        severity: 'incomplete',
        file,
        message: `package.json does not parse: ${(error as Error).message}.`,
        repair: 'Repair the JSON.',
      }),
    ];
  }
  const declared = new Set([...Object.keys(json.dependencies ?? {}), ...Object.keys(json.devDependencies ?? {})]);
  return [
    ...context.dependencies.map((name) => [name, ''] as const),
    ...context.devDependencies.map((name) => [name, '-D '] as const),
  ]
    .filter(([name]) => !declared.has(name))
    .map(([name, flag]) =>
      finding(context, {
        ruleId: 'ULT-SETUP-011',
        file,
        message: `${name} is not declared in package.json; the setup item needs it.`,
        repair: `Run \`npm install ${flag}${name}\`, or your package manager's equivalent.`,
      }),
    );
}

function configReferences(file: string, name: string, context: StepContext): Diagnostic[] {
  const parsed = parse(file, 'ULT-SETUP-014', context);
  if ('diagnostics' in parsed) return parsed.diagnostics;
  let found = false;
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteralLike(node) && (node.text === name || node.text.startsWith(`${name}/`))) found = true;
    if (!found) ts.forEachChild(node, visit);
  };
  visit(parsed.source);
  if (found) return [];
  return [
    finding(context, {
      ruleId: 'ULT-SETUP-014',
      file,
      message: `${file} does not reference ${name}, so StyleX never compiles. This is usually your own file, kept when the setup item's overwrite was declined.`,
      repair: `Add ${name} to ${file} as the setup item's copy does, or run \`${context.setupCommand} --overwrite\` if the file holds nothing of yours.`,
    }),
  ];
}

function importPresent(importers: string[], specifier: string, context: StepContext): Diagnostic[] {
  const importer = importers.find((candidate) => existsSync(join(context.root, candidate)));
  if (!importer) {
    return [
      finding(context, {
        ruleId: 'ULT-SETUP-015',
        file: importers[0] ?? '.',
        message: `None of ${importers.join(', ')} exists, so nothing imports ${specifier}.`,
        repair: `Import '${specifier}' from your root layout.`,
      }),
    ];
  }
  const parsed = parse(importer, 'ULT-SETUP-015', context);
  if ('diagnostics' in parsed) return parsed.diagnostics;

  const diagnostics: Diagnostic[] = [];
  const directory = dirname(importer);
  const target = join(directory, specifier);
  if (!existsSync(join(context.root, target))) {
    diagnostics.push(
      finding(context, {
        ruleId: 'ULT-SETUP-015',
        file: target,
        message: `${target} is missing; it has to sit beside ${importer}.`,
        repair: `Move ${specifier.replace(/^\.\//, '')} into ${directory}/.`,
      }),
    );
  }
  const imported = parsed.source.statements.some(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === specifier,
  );
  if (!imported) {
    diagnostics.push(
      finding(context, {
        ruleId: 'ULT-SETUP-015',
        file: importer,
        message: `${importer} does not import '${specifier}', so no StyleX rule reaches the page.`,
        repair: `Add \`import '${specifier}';\` to ${importer}.`,
      }),
    );
  }
  return diagnostics;
}

const VITE_CONFIGS = ['vite.config.ts', 'vite.config.mts', 'vite.config.cts', 'vite.config.js', 'vite.config.mjs', 'vite.config.cjs'];

function pluginFirst(plugin: string, from: string, context: StepContext): Diagnostic[] {
  const ruleId = 'ULT-SETUP-013';
  const file = VITE_CONFIGS.find((candidate) => existsSync(join(context.root, candidate)));
  const repair = `Import it with \`import { ${plugin} } from '${from}.ts'\` and put \`${plugin}()\` first in plugins.`;
  if (!file) {
    return [finding(context, { ruleId, file: 'vite.config.ts', message: 'No vite.config.* file exists.', repair })];
  }
  const parsed = parse(file, ruleId, context);
  if ('diagnostics' in parsed) return parsed.diagnostics;
  const { source } = parsed;
  const at = (node: ts.Node) => ({ start: position(source, node.getStart(source)), end: position(source, node.getEnd()) });

  const local = localPluginName(source, plugin, from);
  if (!local) {
    return [finding(context, { ruleId, file, message: `${file} does not import ${plugin} from '${from}'.`, repair })];
  }

  const exported = source.statements.find(
    (statement): statement is ts.ExportAssignment => ts.isExportAssignment(statement) && !statement.isExportEquals,
  );
  const unresolved = (node: ts.Node, what: string): Diagnostic =>
    finding(context, {
      ruleId: 'ULT-ANALYSIS-001',
      severity: 'incomplete',
      file,
      ...(node === source ? {} : at(node)),
      message: `doctor cannot resolve ${what} statically, so whether ${plugin}() comes first in plugins is unknown.`,
      repair: `Write plugins as an array literal with ${plugin}() first, in an object the default export returns directly.`,
    });
  if (!exported) return [unresolved(source, 'the default export')];

  const diagnostics: Diagnostic[] = [];
  for (const config of configObjects(source, exported.expression)) {
    if (!ts.isObjectLiteralExpression(config)) {
      diagnostics.push(unresolved(config, `\`${config.getText(source)}\``));
      continue;
    }
    const property = config.properties.find(
      (candidate) => !ts.isSpreadAssignment(candidate) && candidate.name && propertyName(candidate.name) === 'plugins',
    );
    if (!property) {
      if (config.properties.some(ts.isSpreadAssignment)) diagnostics.push(unresolved(config, 'the config object'));
      else diagnostics.push(finding(context, { ruleId, file, ...at(config), message: 'The config has no plugins.', repair }));
      continue;
    }
    const value = ts.isPropertyAssignment(property)
      ? resolveIdentifier(source, property.initializer)
      : ts.isShorthandPropertyAssignment(property)
        ? resolveIdentifier(source, property.name)
        : property;
    if (!ts.isArrayLiteralExpression(value)) {
      diagnostics.push(unresolved(value, `\`plugins: ${value.getText(source)}\``));
      continue;
    }
    const [first] = value.elements;
    const call = first && ts.isSpreadElement(first) ? first.expression : first;
    const isPlugin = call && ts.isCallExpression(call) && ts.isIdentifier(call.expression) && call.expression.text === local;
    if (!isPlugin) {
      diagnostics.push(
        finding(context, {
          ruleId,
          file,
          ...at(value),
          message: `${plugin}() is not the first entry in plugins, so StyleX compiles after a plugin that has already transformed the source.`,
          repair: `Move \`${local}()\` to the front: \`plugins: [${local}(), …]\`.`,
        }),
      );
    }
  }
  return diagnostics;
}

function localPluginName(source: ts.SourceFile, plugin: string, from: string): string | undefined {
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (statement.moduleSpecifier.text.replace(/\.[mc]?[jt]s$/, '') !== from) continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    const element = bindings.elements.find((candidate) => (candidate.propertyName ?? candidate.name).text === plugin);
    if (element) return element.name.text;
  }
  return undefined;
}

function configObjects(source: ts.SourceFile, expression: ts.Expression): ts.Node[] {
  const node = resolveIdentifier(source, skipWrappers(expression));
  if (ts.isObjectLiteralExpression(node)) return [node];
  if (ts.isConditionalExpression(node)) {
    return [...configObjects(source, node.whenTrue), ...configObjects(source, node.whenFalse)];
  }
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'defineConfig') {
    const [argument] = node.arguments;
    return argument && node.arguments.length === 1 ? configObjects(source, argument) : [node];
  }
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node)) {
    if (!node.body) return [node];
    if (!ts.isBlock(node.body)) return configObjects(source, node.body);
    const returns: ts.Expression[] = [];
    const visit = (child: ts.Node) => {
      if (ts.isFunctionLike(child)) return;
      if (ts.isReturnStatement(child) && child.expression) returns.push(child.expression);
      ts.forEachChild(child, visit);
    };
    ts.forEachChild(node.body, visit);
    return returns.length > 0 ? returns.flatMap((returned) => configObjects(source, returned)) : [node];
  }
  return [node];
}

function skipWrappers(node: ts.Expression): ts.Expression {
  while (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isAwaitExpression(node)
  ) {
    node = node.expression;
  }
  return node;
}

function resolveIdentifier(source: ts.SourceFile, node: ts.Expression): ts.Node {
  node = skipWrappers(node);
  if (!ts.isIdentifier(node)) return node;
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === node.text) return statement;
    if (!ts.isVariableStatement(statement) || !(statement.declarationList.flags & ts.NodeFlags.Const)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === node.text && declaration.initializer) {
        return resolveIdentifier(source, declaration.initializer);
      }
    }
  }
  return node;
}

function propertyName(name: ts.PropertyName): string | undefined {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined;
}

type TsConfig = { paths?: Record<string, string[]>; pathsBase?: string; baseUrl?: string };

function aliasesResolve(tsconfigs: string[], context: StepContext): Diagnostic[] {
  const ruleId = 'ULT-SETUP-009';
  const present = tsconfigs.filter((file) => existsSync(join(context.root, file)));
  const suggestion = `"paths": { "@/*": ["${existsSync(join(context.root, 'src')) ? './src/*' : './*'}"] }`;
  if (present.length === 0) {
    return [
      finding(context, {
        ruleId,
        file: tsconfigs[0] ?? 'tsconfig.json',
        message: `None of ${tsconfigs.join(', ')} exists, so the @/ aliases resolve nowhere.`,
        repair: `Create tsconfig.json with ${suggestion} under compilerOptions.`,
      }),
    ];
  }
  const diagnostics: Diagnostic[] = [];
  for (const file of present) {
    const config = readTsConfig(join(context.root, file));
    if ('error' in config) {
      diagnostics.push(
        finding(context, { ruleId, severity: 'incomplete', file, message: config.error, repair: 'Repair the tsconfig chain.' }),
      );
      continue;
    }
    const { paths } = config;
    const failures = paths
      ? context.aliases.flatMap((alias) => {
          const why = aliasFailure(alias, paths, config.baseUrl ?? config.pathsBase ?? context.root, context.root);
          return why ? [`${alias} ${why}`] : [];
        })
      : [];
    if (paths && failures.length === 0) continue;
    const text = readFileSync(join(context.root, file), 'utf8');
    const source = ts.parseJsonText(file, text);
    diagnostics.push(
      finding(context, {
        ruleId,
        file,
        ...jsonPosition(source, ['compilerOptions', 'paths']),
        message: `${
          paths
            ? `${file} does not resolve every @/ alias in components.json: ${failures.join('; ')}.`
            : `${file} has no compilerOptions.paths, so no @/ alias in components.json resolves.`
        } The shadcn CLI then writes into a literal ./@/ directory.`,
        repair: `Add ${suggestion} under compilerOptions in ${file}.`,
      }),
    );
  }
  return diagnostics;
}

function aliasFailure(alias: string, paths: Record<string, string[]>, base: string, root: string): string | undefined {
  let best: { pattern: string; target: string | undefined } | undefined;
  for (const [pattern, targets] of Object.entries(paths)) {
    const star = pattern.indexOf('*');
    const matches =
      star === -1
        ? pattern === alias
        : alias.startsWith(pattern.slice(0, star)) && alias.endsWith(pattern.slice(star + 1));
    if (matches && (!best || pattern.length > best.pattern.length)) best = { pattern, target: targets[0] };
  }
  if (!best?.target) return 'matches no compilerOptions.paths entry';
  const star = best.target.indexOf('*');
  const directory = resolve(base, star === -1 ? dirname(best.target) : best.target.slice(0, star));
  const inside = relative(root, directory);
  if (inside.startsWith('..') || isAbsolute(inside)) return `maps outside the project, to ${directory}`;
  if (!existsSync(directory) || !statSync(directory).isDirectory()) {
    return `maps into ${inside || '.'}/, which does not exist`;
  }
  return undefined;
}

function readTsConfig(path: string, seen = new Set<string>()): TsConfig | { error: string } {
  if (seen.has(path)) return { error: `${path} extends itself.` };
  seen.add(path);
  const { config, error } = ts.readConfigFile(path, ts.sys.readFile);
  if (error || typeof config !== 'object' || config === null) {
    return { error: `${path} does not parse: ${ts.flattenDiagnosticMessageText(error?.messageText ?? 'not an object', ' ')}.` };
  }
  const { extends: parents = [], compilerOptions = {} } = config as {
    extends?: string | string[];
    compilerOptions?: { paths?: Record<string, string[]>; baseUrl?: string };
  };
  let inherited: TsConfig = {};
  for (const parent of typeof parents === 'string' ? [parents] : parents) {
    const parentPath = resolveExtends(parent, dirname(path));
    if (!parentPath) return { error: `${path} extends ${parent}, which does not resolve.` };
    const read = readTsConfig(parentPath, seen);
    if ('error' in read) return read;
    inherited = { ...inherited, ...read };
  }
  const { paths, baseUrl } = compilerOptions;
  return {
    ...inherited,
    ...(paths && { paths, pathsBase: dirname(path) }),
    ...(baseUrl !== undefined && { baseUrl: resolve(dirname(path), baseUrl) }),
  };
}

function resolveExtends(specifier: string, from: string): string | undefined {
  const candidates =
    specifier.startsWith('.') || isAbsolute(specifier)
      ? [resolve(from, specifier), resolve(from, `${specifier}.json`)]
      : [join(from, 'node_modules', specifier), join(from, 'node_modules', `${specifier}.json`), join(from, 'node_modules', specifier, 'tsconfig.json')];
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
}

function noLiteralAtDirectory(context: StepContext): Diagnostic[] {
  const path = join(context.root, '@');
  if (!existsSync(path) || !statSync(path).isDirectory()) return [];
  return [
    finding(context, {
      ruleId: 'ULT-SETUP-010',
      file: '@',
      message: 'A literal ./@/ directory holds files the shadcn CLI wrote while the @/ alias did not resolve.',
      repair: 'Once the @/ aliases resolve, move the contents of ./@/ into the directory @/ maps to, then delete ./@/.',
    }),
  ];
}

function parse(file: string, ruleId: string, context: StepContext): { source: ts.SourceFile } | { diagnostics: Diagnostic[] } {
  const path = join(context.root, file);
  if (!existsSync(path)) {
    return {
      diagnostics: [
        finding(context, {
          ruleId,
          file,
          message: `${file} is missing.`,
          repair: `Run \`${context.setupCommand}\`; it installs ${file}.`,
        }),
      ],
    };
  }
  const source = ts.createSourceFile(file, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  const [error] = (source as unknown as { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics;
  if (!error) return { source };
  return {
    diagnostics: [
      finding(context, {
        ruleId,
        severity: 'incomplete',
        file,
        start: position(source, error.start ?? 0),
        message: `${file} does not parse: ${ts.flattenDiagnosticMessageText(error.messageText, ' ')}`,
        repair: `Repair the syntax in ${file}.`,
      }),
    ],
  };
}

function position(source: ts.SourceFile, offset: number): Position {
  const { line, character } = source.getLineAndCharacterOfPosition(offset);
  return { line: line + 1, column: character + 1 };
}

export function jsonPosition(source: ts.JsonSourceFile, path: string[]): { start?: Position; end?: Position } {
  let node: ts.Expression | undefined = source.statements[0]?.expression;
  let found: ts.Expression | undefined;
  for (const key of path) {
    if (!node || !ts.isObjectLiteralExpression(node)) break;
    const property = node.properties.find(
      (candidate): candidate is ts.PropertyAssignment =>
        ts.isPropertyAssignment(candidate) && ts.isStringLiteral(candidate.name) && candidate.name.text === key,
    );
    if (!property) break;
    node = found = property.initializer;
  }
  if (!found) return {};
  return { start: position(source, found.getStart(source)), end: position(source, found.getEnd()) };
}
