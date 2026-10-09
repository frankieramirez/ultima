// docs/spec/consumer-lint.md, Doctor diagnostics. Reads package manifests, resolved versions and config
// text only: it never imports or evaluates an ESLint config, installs a package or runs ESLint.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { join, posix } from 'node:path';

import ts from 'typescript';

import { type Diagnostic, type Position, SPEC } from './diagnostic.ts';
import type { Target } from './doctor.ts';
import { position, resolveInstalledVersion } from './setup.ts';

/** The combination every installed lint fixture passed: docs/spec/consumer-lint.md, Compatibility and ownership. */
export const LINT_PINS = { eslint: '9.39.5', 'typescript-eslint': '8.71.1', '@stylexjs/eslint-plugin': '0.19.1' } as const;
/** ESLint and its TypeScript parser are verified by major line; the plugin must match the installed `@stylexjs/stylex` exactly. */
export const VERIFIED_MAJORS = { eslint: 9, '@typescript-eslint/parser': 8 } as const;

const PLUGIN = '@stylexjs/eslint-plugin';
const FRAGMENT = 'ultima.eslint.mjs';
const RECIPE = 'https://ultima.systems/install#stylex-lint';
const LINK = SPEC.replace(/ultima\.md$/, 'consumer-lint.md#doctor-diagnostics');
const FLAT = ['js', 'mjs', 'cjs', 'ts', 'mts', 'cts'].map((extension) => `eslint.config.${extension}`);
const LEGACY = ['.eslintrc.js', '.eslintrc.cjs', '.eslintrc.yaml', '.eslintrc.yml', '.eslintrc.json', '.eslintrc'];
const NOT_CONFIGURED = 'StyleX lint is not configured; syntax validation remains unverified';

type Versions = Record<'eslint' | '@typescript-eslint/parser' | '@stylexjs/eslint-plugin' | '@stylexjs/stylex', string | null>;

export type LintReport = {
  schemaVersion: 1;
  /** `detected` is static presence, never an executed lint pass. */
  state: 'not-applicable' | 'not-configured' | 'unverified' | 'detected';
  reason: string;
  config: string | null;
  versions: Versions;
  tested: typeof LINT_PINS;
  files: string[];
  effective: 'unverified';
  commands: string[];
  diagnostics: Diagnostic[];
};

type Module = { path: string; source: ts.SourceFile; imports: { specifier: string; at: Position }[] };

export function doctorLint(root: string, target: Target | null): LintReport {
  const manifest = readManifest(root);
  const declared = (name: string) => [manifest.dependencies, manifest.devDependencies].some((field) => typeof field === 'object' && field !== null && name in field);
  const resolve = (name: string) => resolveInstalledVersion(root, name) ?? null;
  const versions: Versions = {
    eslint: resolve('eslint'),
    // typescript-eslint releases its packages together, so the meta package stands in under a strict layout.
    '@typescript-eslint/parser': resolve('@typescript-eslint/parser') ?? resolve('typescript-eslint'),
    [PLUGIN]: resolve(PLUGIN),
    '@stylexjs/stylex': resolve('@stylexjs/stylex'),
  };
  const files = probeFiles(root);
  const diagnostics: Diagnostic[] = [];
  const report = (state: LintReport['state'], reason: string, config: string | null): LintReport => ({
    schemaVersion: 1, state, reason, config, versions, tested: LINT_PINS, files, effective: 'unverified',
    commands: state === 'not-applicable' ? [] : [...files.map((file) => `npx --no-install eslint --print-config ${file}`), 'npx --no-install eslint .'],
    diagnostics: diagnostics.sort((a, b) => a.file.localeCompare(b.file) || (a.start?.line ?? 0) - (b.start?.line ?? 0) || a.ruleId.localeCompare(b.ruleId)),
  });
  const advise = (ruleId: string, file: string, message: string, repair: string, start?: Position) =>
    diagnostics.push({ ruleId, severity: 'advisory', file, ...(start && { start }), message, repair: `${repair} Recipe: ${RECIPE}`, link: LINK });

  if (target === null && !declared('@stylexjs/stylex')) {
    return report('not-applicable', 'No StyleX source: no setup item is installed and package.json declares no @stylexjs/stylex.', null);
  }

  const pinned = (name: keyof typeof LINT_PINS) => `${name}@${LINT_PINS[name]}`;
  const flat = FLAT.find((name) => existsSync(join(root, name)));
  const legacy = LEGACY.find((name) => existsSync(join(root, name))) ?? (manifest.eslintConfig !== undefined ? 'package.json' : undefined);
  const config = flat ?? legacy ?? null;
  if (config === null) {
    const create = `save ${FRAGMENT} at the project root and create eslint.config.mjs from the recipe's minimal config.`;
    advise(
      'ULT-LINT-001', '.',
      `${NOT_CONFIGURED}: ${versions.eslint ? 'ESLint is installed, but the project root has no eslint.config.* file' : 'no ESLint package resolves and the project root has no ESLint config'}.`,
      versions.eslint
        ? `Install ${PLUGIN}@${versions['@stylexjs/stylex'] ?? LINT_PINS[PLUGIN]} if it is missing, then ${create}`
        : `Run \`npm install -D --save-exact ${(['eslint', 'typescript-eslint', PLUGIN] as const).map(pinned).join(' ')}\`, then ${create}`,
    );
    return report('not-configured', NOT_CONFIGURED, null);
  }

  if (!flat) {
    advise(
      'ULT-LINT-003', legacy!,
      `${legacy === 'package.json' ? 'package.json "eslintConfig"' : legacy} is an ESLint 8 legacy config, an unverified combination: the recipe is tested with ESLint ${LINT_PINS.eslint} flat config only. Doctor does not read or migrate it.`,
      'Keep the project as it is and confirm the effective config with the commands below, or move to a flat eslint.config.mjs.',
    );
  }
  if (!versions.eslint) {
    advise('ULT-LINT-002', 'package.json', `${config} exists, but eslint does not resolve from the project root, so lint cannot run.`, `Run \`npm install -D --save-exact ${pinned('eslint')}\`, or your package manager's equivalent.`);
  } else if (major(versions.eslint) !== VERIFIED_MAJORS.eslint) {
    advise('ULT-LINT-003', 'package.json', `eslint ${versions.eslint} is an unverified combination; the recipe is tested with ${LINT_PINS.eslint}. Doctor never changes dependencies.`, `Keep your version and confirm the effective config with the commands below, or install ${pinned('eslint')}.`);
  }
  const parser = versions['@typescript-eslint/parser'];
  if (parser && major(parser) !== VERIFIED_MAJORS['@typescript-eslint/parser']) {
    advise('ULT-LINT-003', 'package.json', `@typescript-eslint/parser ${parser} is an unverified combination; the recipe is tested with typescript-eslint ${LINT_PINS['typescript-eslint']}.`, `Keep your version and confirm the effective config with the commands below, or install ${pinned('typescript-eslint')}.`);
  }
  if (!flat) return report('unverified', 'The ESLint config is not a flat config doctor can read; effective configuration is unverified.', config);

  const modules = [readModule(root, flat)];
  const syntax = ts.transpileModule(modules[0]!.source.text, { fileName: flat, reportDiagnostics: true }).diagnostics ?? [];
  const broken = syntax.find((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  if (broken) {
    advise(
      'ULT-LINT-005', flat,
      `${flat} does not parse (${ts.flattenDiagnosticMessageText(broken.messageText, ' ')}), so ESLint cannot load it.`,
      `Repair the syntax, then run \`npx --no-install eslint --print-config ${files[0] ?? '<file>'}\`.`,
      broken.start === undefined ? undefined : position(modules[0]!.source, broken.start),
    );
  }
  for (const { specifier, at } of modules[0]!.imports.filter(({ specifier }) => specifier.startsWith('.') && specifier.endsWith(FRAGMENT))) {
    const path = posix.normalize(specifier);
    if (existsSync(join(root, path))) modules.push(readModule(root, path));
    else advise('ULT-LINT-002', flat, `${flat} imports ${specifier}, which does not exist, so ESLint cannot load the config.`, `Download https://ultima.systems/${FRAGMENT} and save it as ${path}.`, at);
  }
  for (const module of modules) {
    for (const { specifier, at } of module.imports) {
      const name = packageName(specifier);
      if (name === undefined || resolve(name) !== null) continue;
      const repair = name === PLUGIN ? `${PLUGIN}@${versions['@stylexjs/stylex'] ?? LINT_PINS[PLUGIN]}` : name in LINT_PINS ? pinned(name as keyof typeof LINT_PINS) : name;
      advise('ULT-LINT-002', module.path, `${module.path} imports ${specifier}, but ${name} does not resolve from the project root, so ESLint cannot load the config.`, `Run \`npm install -D --save-exact ${repair}\`, or your package manager's equivalent.`, at);
    }
  }

  const registers = modules.some(({ imports }) => imports.some(({ specifier }) => specifier === PLUGIN));
  if (!registers && (declared(PLUGIN) || versions[PLUGIN])) {
    advise('ULT-LINT-003', flat, `${flat} imports neither ${PLUGIN} nor ${FRAGMENT}, though ${PLUGIN} is installed: doctor cannot determine whether this custom integration applies the StyleX rules.`, 'Confirm the effective config with the commands below.');
  } else if (!registers) {
    advise('ULT-LINT-001', flat, `${NOT_CONFIGURED}: ${flat} does not register ${PLUGIN}.`, `Run \`npm install -D --save-exact ${PLUGIN}@${versions['@stylexjs/stylex'] ?? LINT_PINS[PLUGIN]}\`, save ${FRAGMENT} beside ${flat} and append \`ultimaStylex\` after your framework configuration.`);
  } else if (versions[PLUGIN] && versions['@stylexjs/stylex'] && versions[PLUGIN] !== versions['@stylexjs/stylex']) {
    advise('ULT-LINT-003', 'package.json', `${PLUGIN} ${versions[PLUGIN]} differs from @stylexjs/stylex ${versions['@stylexjs/stylex']}, an unverified combination: the recipe requires both at one version.`, `Run \`npm install -D --save-exact ${PLUGIN}@${versions['@stylexjs/stylex']}\`.`);
  }

  for (const module of modules) {
    visit(module.source, (node) => {
      if (!ts.isPropertyAssignment(node)) return;
      const name = propertyName(node.name);
      if (name === '@stylexjs/valid-styles') {
        const level = literalSeverity(node.initializer);
        if (level !== undefined && level < 2) {
          advise('ULT-LINT-006', module.path, `${module.path} sets @stylexjs/valid-styles to ${node.initializer.getText(module.source)}; a supported-recipe pass requires severity 2 (error).`, 'Remove the override or set it to "error", then confirm the effective severity with the commands below.', position(module.source, node.getStart(module.source)));
        }
      }
    });
  }
  for (const { pattern, at } of ignorePatterns(modules[0]!.source)) {
    const matcher = ignoreGlob(pattern);
    for (const file of files.filter((file) => [file, ...ancestors(file)].some((path) => matcher.test(path)))) {
      advise('ULT-LINT-004', flat, `The ignore pattern "${pattern}" in ${flat} covers ${file}; an ignored required file leaves StyleX lint coverage incomplete.`, `Narrow the pattern to build output, then run \`npx --no-install eslint --print-config ${file}\`, which prints undefined for an ignored file.`, at);
    }
  }

  if (diagnostics.some(({ ruleId }) => ruleId === 'ULT-LINT-001')) return report('not-configured', NOT_CONFIGURED, flat);
  if (diagnostics.length > 0) return report('unverified', 'Static reading found a gap or an unverified combination; see the findings.', flat);
  return report('detected', `${flat} registers ${PLUGIN} in a verified combination. Static presence only; ESLint was not run, so the effective config is unverified.`, flat);
}

export function printLint(lint: LintReport): string {
  const lines = ['', 'StyleX lint (static, read-only; ESLint not run):', `  ${lint.state}  ${lint.config ?? '(no ESLint config)'}`, `    ${lint.reason}`];
  if (lint.state !== 'not-applicable') {
    const tested = Object.entries(lint.tested).map(([name, version]) => `${name} ${version}`).join(', ');
    lines.push(`    Resolved: ${Object.entries(lint.versions).map(([name, version]) => `${name} ${version ?? 'unresolved'}`).join(', ')}; tested: ${tested}.`);
    for (const diagnostic of lint.diagnostics) {
      const at = diagnostic.start ? `:${diagnostic.start.line}:${diagnostic.start.column}` : '';
      lines.push('', `  ${diagnostic.file}${at}  ${diagnostic.severity}  ${diagnostic.ruleId}`, `    ${diagnostic.message}`, `    Repair: ${diagnostic.repair}`, `    Spec: ${diagnostic.link}`);
    }
    lines.push('', '  Effective config: unverified. Confirm it from the project root:', ...lint.commands.map((command) => `    ${command}`));
  }
  return `${lines.join('\n')}\n`;
}

function readManifest(root: string): Record<string, unknown> {
  try {
    const json = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as unknown;
    return typeof json === 'object' && json !== null ? (json as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function probeFiles(root: string): string[] {
  const base = existsSync(join(root, 'app')) ? '' : 'src';
  const at = (path: string) => posix.join(base, path);
  const entry = [at('app/page.tsx'), at('App.tsx'), at('main.tsx')].find((path) => existsSync(join(root, path)));
  let component: string | undefined;
  try {
    const name = readdirSync(join(root, at('components/ui'))).filter((file) => file.endsWith('.tsx')).sort()[0];
    component = name && at(`components/ui/${name}`);
  } catch {}
  return [entry, component, at('lib/tokens.stylex.ts'), at('lib/themes.ts')].filter((path): path is string => path !== undefined && existsSync(join(root, path)));
}

function readModule(root: string, path: string): Module {
  const source = ts.createSourceFile(path, readFileSync(join(root, path), 'utf8'), ts.ScriptTarget.Latest, true);
  const imports: Module['imports'] = [];
  const add = (literal: ts.Expression | undefined) => {
    if (literal && ts.isStringLiteralLike(literal)) imports.push({ specifier: literal.text, at: position(source, literal.getStart(source)) });
  };
  visit(source, (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) add(node.moduleSpecifier);
    else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) add(node.arguments[0]);
  });
  return { path, source, imports };
}

function visit(node: ts.Node, callback: (node: ts.Node) => void): void {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
}

function propertyName(name: ts.PropertyName): string | undefined {
  return ts.isIdentifier(name) || ts.isStringLiteralLike(name) ? name.text : undefined;
}

function literalSeverity(value: ts.Expression): number | undefined {
  if (ts.isArrayLiteralExpression(value)) return value.elements[0] && literalSeverity(value.elements[0]);
  if (ts.isNumericLiteral(value)) return Number(value.text);
  if (ts.isStringLiteralLike(value)) return { off: 0, warn: 1, error: 2 }[value.text];
  return undefined;
}

function ignorePatterns(source: ts.SourceFile): { pattern: string; at: Position }[] {
  const patterns: { pattern: string; at: Position }[] = [];
  const collect = (array: ts.Expression | undefined) => {
    if (!array || !ts.isArrayLiteralExpression(array)) return;
    for (const element of array.elements) {
      if (ts.isStringLiteralLike(element) && !element.text.startsWith('!')) patterns.push({ pattern: element.text, at: position(source, element.getStart(source)) });
    }
  };
  visit(source, (node) => {
    if (ts.isPropertyAssignment(node) && propertyName(node.name) === 'ignores') collect(node.initializer);
    else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'globalIgnores') collect(node.arguments[0]);
  });
  return patterns;
}

function ignoreGlob(pattern: string): RegExp {
  const text = pattern.replace(/^\.\//, '').replace(/\/$/, '/**');
  const escape = (value: string) => value.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  let source = '';
  for (let index = 0; index < text.length; index++) {
    const character = text[index]!;
    if (character === '*' && text[index + 1] === '*') {
      const slash = text[index + 2] === '/';
      source += slash ? '(?:.*/)?' : '.*';
      index += slash ? 2 : 1;
    } else if (character === '*') source += '[^/]*';
    else if (character === '?') source += '[^/]';
    else if (character === '{' && text.indexOf('}', index) > index) {
      const end = text.indexOf('}', index);
      source += `(?:${text.slice(index + 1, end).split(',').map(escape).join('|')})`;
      index = end;
    } else source += escape(character);
  }
  return new RegExp(`^${source}$`);
}

function ancestors(file: string): string[] {
  const parts = file.split('/');
  return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('/'));
}

function packageName(specifier: string): string | undefined {
  if (/^(?:\.|\/|[a-z]+:)/.test(specifier) || isBuiltin(specifier)) return undefined;
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function major(version: string): number {
  return Number(version.split('.')[0]);
}
