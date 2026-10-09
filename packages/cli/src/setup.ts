// docs/spec/ultima.md, Consumer CLI, Doctor, What it checks: the assertion kinds a setup
// item's hand steps declare, executed over file reads and syntax trees.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';

import postcss, { type AtRule, type Root, type Rule } from 'postcss';
import selectorParser from 'postcss-selector-parser';
import ts from 'typescript';

import type { Diagnostic, Position, Unsupported } from './diagnostic.ts';
import type { Assertion, HandStep } from './hand-steps.ts';

export type SupportedRanges = Record<string, { floor: string; ceiling: string }>;

export type StepContext = {
  root: string;
  setupCommand: string;
  dependencies: string[];
  devDependencies: string[];
  aliases: string[];
  supportedRanges: SupportedRanges;
  link: string;
};

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
      return { diagnostics: layeredResets(assertion.entries, context) };
    case 'version-in-range':
      return { diagnostics: versionInRange(assertion.packages, context) };
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

function versionInRange(packages: string[], context: StepContext): Diagnostic[] {
  const ruleId = 'ULT-SETUP-017';
  const file = 'package.json';
  let text: string;
  let json: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  try {
    text = readFileSync(join(context.root, file), 'utf8');
    json = JSON.parse(text);
  } catch {
    return [];
  }
  const source = ts.parseJsonText(file, text);
  const pnp = existsSync(join(context.root, '.pnp.cjs'));
  const diagnostics: Diagnostic[] = [];
  const resolved: [string, string][] = [];
  for (const name of packages) {
    const field = (['dependencies', 'devDependencies'] as const).find((key) => json[key]?.[name] !== undefined);
    if (!field) continue;
    const at = jsonPosition(source, [field, name]);
    const version = resolveInstalledVersion(context.root, name);
    if (!version) {
      diagnostics.push(
        finding(context, {
          ruleId,
          severity: 'incomplete',
          file,
          ...at,
          message: pnp
            ? `${name} is declared but does not resolve: Yarn Plug'n'Play leaves no node_modules to read its version from.`
            : `${name} is declared but does not resolve from the project root, so its version is unknown.`,
          repair: pnp
            ? 'Set `nodeLinker: node-modules` in .yarnrc.yml and run `yarn install`.'
            : "Run `npm install`, or your package manager's equivalent.",
        }),
      );
      continue;
    }
    resolved.push([name, version]);
    const range = context.supportedRanges[name];
    if (!range) throw new Error(`this build of the CLI bundles no supported range for ${name}`);
    if (compareVersions(version, range.floor) < 0) {
      diagnostics.push(
        finding(context, {
          ruleId,
          file,
          ...at,
          message: `${name} resolves to ${version}, below the supported floor ${range.floor}.`,
          repair: `Run \`npm install ${name}@${range.ceiling}\`, or your package manager's equivalent.`,
        }),
      );
    } else if (compareVersions(version, range.ceiling) > 0) {
      diagnostics.push(
        finding(context, {
          ruleId,
          severity: 'advisory',
          file,
          ...at,
          message: `${name} resolves to ${version}, above ${range.ceiling}, the newest version this CLI was tested with.`,
          repair: `Nothing to do if it works; \`npm install ${name}@${range.ceiling}\` returns to the tested version.`,
        }),
      );
    }
  }
  if (new Set(resolved.map(([, version]) => version)).size > 1) {
    diagnostics.push(
      finding(context, {
        ruleId,
        file,
        message: `${resolved.map(([name, version]) => `${name} ${version}`).join(' and ')} differ; the StyleX runtime and compiler must be one release.`,
        repair: `Run \`npm install ${resolved
          .map(([name]) => `${name}@${context.supportedRanges[name]?.ceiling}`)
          .join(' ')}\`, or your package manager's equivalent.`,
      }),
    );
  }
  return diagnostics;
}

/** The version `name` resolves to from `root`, read from its installed package.json, the way Node looks it up. */
export function resolveInstalledVersion(root: string, name: string): string | undefined {
  for (let directory = root; ; directory = dirname(directory)) {
    const manifest = join(directory, 'node_modules', name, 'package.json');
    if (existsSync(manifest)) {
      try {
        const { version } = JSON.parse(readFileSync(manifest, 'utf8')) as { version?: unknown };
        return typeof version === 'string' ? version : undefined;
      } catch {
        return undefined;
      }
    }
    if (dirname(directory) === directory) return undefined;
  }
}

/** Orders x.y.z versions; a prerelease sorts below its release. */
export function compareVersions(a: string, b: string): number {
  const parse = (version: string) => {
    const [core = '', prerelease] = version.split(/-(.*)/s);
    return { parts: core.split('.').map(Number), prerelease };
  };
  const left = parse(a);
  const right = parse(b);
  for (let index = 0; index < 3; index++) {
    const difference = (left.parts[index] ?? 0) - (right.parts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return Number(!left.prerelease) - Number(!right.prerelease);
}

const SCRIPTS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];

export function themeModeWithoutRootTheme(root: string, entries: string[]): string | undefined {
  const aliases = aliasConfig(root);
  let ui: string;
  try {
    ui = JSON.parse(readFileSync(join(root, 'components.json'), 'utf8')).aliases.ui;
    if (typeof ui !== 'string') return;
  } catch { return; }
  const item = resolveImport(`${ui}/theme-mode`, join(root, 'entry.ts'), false, root, aliases);
  if (!item) return;
  const seen = new Set<string>();
  const modes = new Set<string>();
  const follow = (specifier: string, from: string, css: boolean) => {
    const path = resolveImport(specifier, from, css, root, aliases);
    if (path) visit(path);
  };
  const visit = (path: string): void => {
    if (seen.has(path)) return;
    seen.add(path);
    let text: string;
    try { text = readFileSync(path, 'utf8'); } catch { return; }
    if (extname(path) === '.css') {
      try {
        const sheet = postcss.parse(text);
        sheet.walkAtRules(/^import$/i, (rule) => {
          const { specifier } = importParams(rule.params);
          if (specifier) follow(specifier, path, true);
        });
        sheet.walkRules((rule) => {
          if (rule.parent?.type === 'rule') return;
          for (let parent: postcss.Node | undefined = rule.parent; parent; parent = parent.parent) {
            if (parent.type === 'rule' || (parent.type === 'atrule' && ['scope', 'container'].includes((parent as AtRule).name.toLowerCase()))) return;
          }
          const declarations = rule.nodes.filter((node) => node.type === 'decl');
          if (!declarations.some((node) => node.prop.startsWith('--ult-')) || !declarations.some((node) => node.prop === 'color-scheme')) return;
          selectorParser((selectors) => {
            selectors.each((selector) => {
              const nodes = selector.nodes;
              if (nodes.some((node) => !(node.type === 'attribute' && node.attribute === 'data-theme' && node.operator === '=') && !(node.type === 'tag' && node.value === 'html') && !(node.type === 'pseudo' && node.value === ':root'))) return;
              for (const node of nodes) if (node.type === 'attribute' && node.attribute === 'data-theme' && node.operator === '=' && (node.value === 'dark' || node.value === 'light')) modes.add(node.value);
            });
          }).processSync(rule.selector);
        });
      } catch { /* A broken stylesheet cannot prove a root theme. */ }
    } else if (SCRIPTS.includes(extname(path))) {
      const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
      for (const statement of source.statements) {
        if (ts.isImportDeclaration(statement) && !statement.importClause?.isTypeOnly && ts.isStringLiteral(statement.moduleSpecifier)) follow(statement.moduleSpecifier.text, path, false);
        if (ts.isExportDeclaration(statement) && !statement.isTypeOnly && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) follow(statement.moduleSpecifier.text, path, false);
      }
    } else if (extname(path) === '.html') {
      for (const link of text.matchAll(/<(link|script)\b[^>]*>/gi)) {
        const attributes = Object.fromEntries([...link[0].matchAll(/([\w-]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/g)].map(([, key = '', value = '']) => [key.toLowerCase(), value.replace(/^["']|["']$/g, '')]));
        if (attributes.rel === 'stylesheet' && attributes.href && !isRemoteHref(attributes.href)) follow(attributes.href.startsWith('/') ? `.${attributes.href}` : attributes.href, path, true);
        if (link[1]?.toLowerCase() === 'script' && attributes.type === 'module' && attributes.src && !isRemoteHref(attributes.src)) follow(attributes.src.startsWith('/') ? `.${attributes.src}` : attributes.src, path, false);
      }
    }
  };
  for (const path of entries.flatMap((entry) => expandEntry(entry, root))) visit(path);
  return modes.has('dark') && modes.has('light') ? undefined : relative(root, item).split(sep).join('/');
}

type ImportSite = { file: string; start: Position; end: Position; specifier: string; fromStylesheet: boolean };

function layeredResets(entries: string[], context: StepContext): Diagnostic[] {
  const ruleId = 'ULT-SETUP-016';
  const files = entries.flatMap((entry) => expandEntry(entry, context.root));
  if (files.length === 0) {
    return [
      finding(context, {
        ruleId,
        severity: 'incomplete',
        file: entries[0] ?? '.',
        message: `None of ${entries.join(', ')} exists, so no stylesheet could be followed from the entry.`,
        repair: 'Restore the entry the target scaffold ships.',
      }),
    ];
  }
  const diagnostics: Diagnostic[] = [];
  const seen = new Set<string>();
  const aliases = aliasConfig(context.root);
  const name = (path: string) => relative(context.root, path).split(sep).join('/');

  const visit = (path: string, packageSite: ImportSite | undefined) => {
    if (seen.has(path)) return;
    seen.add(path);
    const extension = extname(path);
    if (extension === '.html') return visitHtml(path);
    if (SCRIPTS.includes(extension)) return visitScript(path);
    if (extension === '.css') return visitStylesheet(path, packageSite);
  };

  const follow = (specifier: string, from: string, site: ImportSite, stylesheet: boolean) => {
    const target = resolveImport(specifier, from, stylesheet, context.root, aliases);
    if (target) return visit(target, isPackage(target, context.root) ? site : undefined);
    if (!isProjectSpecifier(specifier, aliases) && (stylesheet || extname(specifier) === '.css')) {
      diagnostics.push(
        finding(context, {
          ruleId: 'ULT-ANALYSIS-001',
          severity: 'incomplete',
          file: site.file,
          start: site.start,
          end: site.end,
          message: `doctor cannot resolve the stylesheet '${specifier}', so whether it holds an unlayered reset is unknown.`,
          repair: `Install the package that provides '${specifier}', or remove the import.`,
        }),
      );
    }
  };

  const visitScript = (path: string) => {
    const file = name(path);
    const parsed = parse(file, ruleId, context);
    if ('diagnostics' in parsed) return diagnostics.push(...parsed.diagnostics);
    const { source } = parsed;
    for (const statement of source.statements) {
      const specifier =
        (ts.isImportDeclaration(statement) && !statement.importClause?.isTypeOnly) ||
        (ts.isExportDeclaration(statement) && !statement.isTypeOnly)
          ? statement.moduleSpecifier
          : undefined;
      if (!specifier || !ts.isStringLiteral(specifier)) continue;
      follow(specifier.text, path, {
        file,
        start: position(source, statement.getStart(source)),
        end: position(source, statement.getEnd()),
        specifier: specifier.text,
        fromStylesheet: false,
      }, false);
    }
  };

  const visitHtml = (path: string) => {
    const file = name(path);
    const text = readFileSync(path, 'utf8');
    const at = (offset: number) => {
      const lines = text.slice(0, offset).split('\n');
      return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
    };
    for (const link of text.matchAll(/<link\b[^>]*>/gi)) {
      const attributes = Object.fromEntries(
        [...link[0].matchAll(/([\w-]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/g)].map(([, key = '', value = '']) => [
          key.toLowerCase(),
          value.replace(/^["']|["']$/g, ''),
        ]),
      );
      const { rel, href } = attributes;
      if (rel?.toLowerCase() !== 'stylesheet' || !href || isRemoteHref(href)) continue;
      const site = { file, start: at(link.index), end: at(link.index + link[0].length), specifier: href, fromStylesheet: false };
      follow(href.startsWith('/') ? `.${href}` : href, path, site, true);
    }
    const css = styleTagsInPlace(text);
    if (css.trim()) checkRules(file, path, css, undefined);
  };

  const visitStylesheet = (path: string, packageSite: ImportSite | undefined) => {
    const file = name(path);
    const root = checkRules(file, path, readFileSync(path, 'utf8'), packageSite);
    root?.walkAtRules(/^import$/i, (rule) => {
      const { specifier, layered } = importParams(rule.params);
      if (!specifier || layered) return;
      const inner: ImportSite = packageSite ?? {
        file,
        start: { line: rule.source?.start?.line ?? 1, column: rule.source?.start?.column ?? 1 },
        end: { line: rule.source?.end?.line ?? 1, column: (rule.source?.end?.column ?? 0) + 1 },
        specifier,
        fromStylesheet: true,
      };
      follow(specifier, path, inner, true);
    });
  };

  const reported = new Set<ImportSite>();
  const checkRules = (file: string, path: string, text: string, packageSite: ImportSite | undefined): Root | undefined => {
    let root: Root;
    try {
      root = postcss.parse(text, { from: path });
    } catch (error) {
      const { line = 1, column = 1, reason } = error as { line?: number; column?: number; reason?: string };
      diagnostics.push(
        finding(context, {
          ruleId,
          severity: 'incomplete',
          file: packageSite?.file ?? file,
          start: packageSite?.start ?? { line, column },
          message: `${file} does not parse as CSS: ${reason ?? (error as Error).message}.`,
          repair: `Repair the syntax in ${file}.`,
        }),
      );
      return undefined;
    }
    root.walkRules((rule) => {
      const resets = unlayeredResets(rule);
      if (resets.length === 0) return;
      const shown = resets.map((selector) => `\`${selector}\``).join(', ');
      if (packageSite) {
        if (reported.has(packageSite)) return;
        reported.add(packageSite);
        diagnostics.push(
          finding(context, {
            ruleId,
            file: packageSite.file,
            start: packageSite.start,
            end: packageSite.end,
            message: `${file} holds an unlayered reset (${shown}), which beats every component style.`,
            repair: packageSite.fromStylesheet
              ? `Import it into a layer: \`@import "${packageSite.specifier}" layer(reset);\`.`
              : `Remove this import and add \`@import "${packageSite.specifier}" layer(reset);\` to your global stylesheet.`,
          }),
        );
        return;
      }
      diagnostics.push(
        finding(context, {
          ruleId,
          file,
          start: { line: rule.source?.start?.line ?? 1, column: rule.source?.start?.column ?? 1 },
          end: { line: rule.source?.end?.line ?? 1, column: (rule.source?.end?.column ?? 0) + 1 },
          message: `${shown} is an unlayered reset, which beats every component style.`,
          repair: 'Wrap the reset in `@layer reset { … }`.',
        }),
      );
    });
    return root;
  };

  for (const file of files) visit(file, undefined);
  return diagnostics;
}

function expandEntry(entry: string, root: string): string[] {
  if (!entry.endsWith('.*')) return existsSync(join(root, entry)) ? [join(root, entry)] : [];
  const directory = join(root, dirname(entry));
  const stem = entry.slice(entry.lastIndexOf('/') + 1, -1);
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.startsWith(stem) && SCRIPTS.includes(name.slice(stem.length - 1)))
    .map((name) => join(directory, name));
}

/** Conditional at-rules: a rule inside one still applies to the whole page when it applies. */
const UNSCOPED_AT_RULES = ['media', 'supports', 'container'];

const LEGACY_PSEUDO_ELEMENTS = [':before', ':after', ':first-line', ':first-letter'];

export function unlayeredResets(rule: Rule): string[] {
  for (let parent = rule.parent; parent && parent.type !== 'root'; parent = parent.parent) {
    if (parent.type !== 'atrule') return [];
    const name = (parent as AtRule).name.toLowerCase();
    if (name === 'layer' || !UNSCOPED_AT_RULES.includes(name)) return [];
  }
  const resets: string[] = [];
  selectorParser((selectors) => {
    selectors.each((selector) => {
      const nodes = selector.nodes.filter((node) => node.type !== 'comment');
      const [subject, ...rest] = nodes;
      const pseudoElement = (node: selectorParser.Node) =>
        node.type === 'pseudo' &&
        (node.value.startsWith('::') || LEGACY_PSEUDO_ELEMENTS.includes(node.value.toLowerCase()));
      const reset =
        subject !== undefined &&
        (subject.type === 'universal' ||
          (subject.type === 'tag' && !['html', 'body'].includes(subject.value.toLowerCase())) ||
          pseudoElement(subject)) &&
        rest.every(pseudoElement);
      if (reset) resets.push(selector.toString().trim());
    });
  }).processSync(rule.selector);
  return resets;
}

function importParams(params: string): { specifier: string | undefined; layered: boolean } {
  const [first, ...rest] = postcss.list.space(params);
  if (!first) return { specifier: undefined, layered: false };
  const url = /^url\(\s*(.*?)\s*\)$/i.exec(first)?.[1] ?? first;
  return { specifier: url.replace(/^["']|["']$/g, ''), layered: rest.some((part) => /^layer(\(|$)/i.test(part)) };
}

function isRemoteHref(href: string): boolean {
  return /^[a-z]+:|^\/\//i.test(href);
}

/** The bodies of the file's <style> tags, with everything else blanked so positions stay the file's. */
function styleTagsInPlace(html: string): string {
  let css = html.replace(/[^\n]/g, ' ');
  for (const style of html.matchAll(/(<style\b[^>]*>)([\s\S]*?)<\/style>/gi)) {
    const start = style.index + (style[1]?.length ?? 0);
    const body = style[2] ?? '';
    css = css.slice(0, start) + body + css.slice(start + body.length);
  }
  return css;
}

function isProjectSpecifier(specifier: string, aliases: Aliases): boolean {
  return specifier.startsWith('.') || specifier.startsWith('/') || aliasCandidates(specifier, aliases).length > 0;
}

function isPackage(path: string, root: string): boolean {
  return relative(root, path).split(sep).includes('node_modules');
}

type Aliases = { paths: Record<string, string[]>; base: string } | undefined;

function aliasConfig(root: string): Aliases {
  for (const file of ['tsconfig.app.json', 'tsconfig.json']) {
    if (!existsSync(join(root, file))) continue;
    const config = readTsConfig(join(root, file));
    if (!('error' in config) && config.paths) return { paths: config.paths, base: config.baseUrl ?? config.pathsBase ?? root };
  }
  return undefined;
}

function aliasCandidates(specifier: string, aliases: Aliases): string[] {
  if (!aliases) return [];
  const candidates: string[] = [];
  for (const [pattern, targets] of Object.entries(aliases.paths)) {
    const star = pattern.indexOf('*');
    const prefix = star === -1 ? pattern : pattern.slice(0, star);
    const suffix = star === -1 ? '' : pattern.slice(star + 1);
    if (star === -1 ? specifier !== pattern : !specifier.startsWith(prefix) || !specifier.endsWith(suffix)) continue;
    const matched = specifier.slice(prefix.length, specifier.length - suffix.length);
    for (const target of targets) candidates.push(resolve(aliases.base, target.replace('*', matched)));
  }
  return candidates;
}

function resolveImport(
  specifier: string,
  from: string,
  stylesheet: boolean,
  root: string,
  aliases: Aliases,
): string | undefined {
  const candidates: string[] = [];
  if (specifier.startsWith('.') || isAbsolute(specifier)) candidates.push(resolve(dirname(from), specifier));
  else {
    // CSS resolves a bare @import beside the file first, the way postcss-import and Vite do.
    if (stylesheet) candidates.push(resolve(dirname(from), specifier));
    candidates.push(...aliasCandidates(specifier, aliases));
    if (stylesheet || extname(specifier) === '.css') {
      for (let directory = root; ; directory = dirname(directory)) {
        candidates.push(...packageStylesheet(join(directory, 'node_modules'), specifier));
        if (dirname(directory) === directory) break;
      }
    }
  }
  const isFile = (path: string) => existsSync(path) && statSync(path).isFile();
  for (const candidate of candidates) {
    const found = [
      candidate,
      ...SCRIPTS.map((extension) => `${candidate}${extension}`),
      ...SCRIPTS.map((extension) => candidate.replace(/\.[mc]?jsx?$/, extension)),
      ...SCRIPTS.map((extension) => join(candidate, `index${extension}`)),
    ].find(isFile);
    if (found) return found;
  }
  return undefined;
}

function packageStylesheet(modules: string, specifier: string): string[] {
  const direct = join(modules, specifier);
  const manifest = join(direct, 'package.json');
  if (!existsSync(manifest)) return [direct];
  try {
    const { style, exports } = JSON.parse(readFileSync(manifest, 'utf8')) as { style?: unknown; exports?: unknown };
    const dot = (typeof exports === 'object' && exports !== null ? (exports as Record<string, unknown>)['.'] : undefined) as
      | { style?: unknown }
      | undefined;
    const entry = typeof dot === 'object' && dot !== null && typeof dot.style === 'string' ? dot.style : style;
    return typeof entry === 'string' ? [join(direct, entry)] : [];
  } catch {
    return [];
  }
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
