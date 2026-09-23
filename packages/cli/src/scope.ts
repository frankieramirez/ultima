// docs/spec/ultima.md, Consumer CLI, Package and engine, The consumer scope. Module resolution is
// TypeScript's own, over the consumer's tsconfig with its `extends` and project `references`.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import ts from 'typescript';

import { type Diagnostic, SPEC } from './diagnostic.ts';

export type ConsumerScope = {
  /** The tsconfig the scope starts from: `tsconfig.json`, or `--project`. */
  tsconfig: string;
  resolve(specifier: string, from: string): string | null;
  aliases: { ui: string; lib: string };
  /** Where `aliases.ui` and `aliases.lib` point, through the tsconfig `paths`. */
  directories: { ui: string; lib: string };
  components: Record<string, unknown>;
};

// TS18002 and TS18003 say a config matches no files, which a solution-style tsconfig never does.
const NO_INPUTS = new Set([18002, 18003]);

export function consumerScope(root: string, { project }: { project?: string } = {}): ConsumerScope | { incomplete: Diagnostic } {
  const read = readComponents(root);
  if ('incomplete' in read) return read;
  const { components } = read;

  const tsconfig = resolve(root, project ?? 'tsconfig.json');
  const configs = readConfigAndReferences(tsconfig, root);
  if ('incomplete' in configs) return configs;

  const aliases: Record<string, string> = {};
  const directories: Record<string, string> = {};
  for (const key of ['ui', 'lib'] as const) {
    const alias = (components.aliases as Record<string, unknown> | undefined)?.[key];
    if (typeof alias !== 'string') {
      return incomplete('ULT-SCOPE-003', 'components.json', `aliases.${key} is missing, so installed items cannot be found.`, `Set "${key}" inside "aliases".`);
    }
    const directory = aliasDirectory(alias, configs);
    if (!directory) {
      return incomplete(
        'ULT-SCOPE-003',
        'components.json',
        `aliases.${key} is ${alias}, and no "paths" entry in ${relativeName(root, tsconfig)} or its references maps it.`,
        `Add a "paths" entry for ${alias} under compilerOptions, or run \`npx @ultima-systems/cli doctor\` to check the setup.`,
      );
    }
    aliases[key] = alias;
    directories[key] = directory;
  }

  return {
    tsconfig,
    resolve(specifier, from) {
      const config = configs.find(({ fileNames }) => fileNames.includes(from)) ?? configs.find(({ fileNames }) => fileNames.length > 0) ?? configs[0];
      return ts.resolveModuleName(specifier, from, (config as ts.ParsedCommandLine).options, ts.sys).resolvedModule?.resolvedFileName ?? null;
    },
    aliases: aliases as ConsumerScope['aliases'],
    directories: directories as ConsumerScope['directories'],
    components,
  };
}

function readComponents(root: string): { components: Record<string, unknown> } | { incomplete: Diagnostic } {
  const repair = 'Run the setup item for your target; `npx @ultima-systems/cli doctor` names it.';
  const path = join(root, 'components.json');
  if (!existsSync(path)) return incomplete('ULT-SCOPE-001', 'components.json', 'components.json is missing.', repair);
  try {
    const json = JSON.parse(readFileSync(path, 'utf8'));
    if (typeof json === 'object' && json !== null && !Array.isArray(json)) return { components: json };
  } catch (error) {
    return incomplete('ULT-SCOPE-001', 'components.json', `components.json does not parse: ${(error as Error).message}.`, repair);
  }
  return incomplete('ULT-SCOPE-001', 'components.json', 'components.json is not a JSON object.', repair);
}

function readConfigAndReferences(path: string, root: string, seen = new Set<string>()): ts.ParsedCommandLine[] | { incomplete: Diagnostic } {
  const file = relativeName(root, path);
  if (!existsSync(path)) {
    return incomplete('ULT-SCOPE-002', file, `${file} is missing.`, 'Create it, or pass --project <path> to name the tsconfig to use.');
  }
  seen.add(path);
  const { config, error } = ts.readConfigFile(path, ts.sys.readFile);
  const parsed = error ? undefined : ts.parseJsonConfigFileContent(config, ts.sys, dirname(path), undefined, path);
  const failure = error ?? parsed?.errors.find(({ code }) => !NO_INPUTS.has(code));
  if (failure || !parsed) {
    const message = ts.flattenDiagnosticMessageText(failure?.messageText ?? '', ' ');
    return incomplete('ULT-SCOPE-002', file, `${file} does not parse: ${message}`, `Repair ${file}.`);
  }
  const configs = [parsed];
  for (const reference of parsed.projectReferences ?? []) {
    const referenced = ts.resolveProjectReferencePath(reference);
    if (seen.has(referenced)) continue;
    const more = readConfigAndReferences(referenced, root, seen);
    if ('incomplete' in more) return more;
    configs.push(...more);
  }
  return configs;
}

function aliasDirectory(alias: string, configs: ts.ParsedCommandLine[]): string | null {
  for (const { options } of configs) {
    const base = options.baseUrl ?? (options as { pathsBasePath?: string }).pathsBasePath;
    const matches = Object.entries(options.paths ?? {})
      .map(([pattern, targets]) => ({ prefix: pattern.split('*')[0] as string, wildcard: pattern.includes('*'), pattern, targets }))
      .filter(({ prefix, wildcard, pattern }) => (wildcard ? `${alias}/`.startsWith(prefix) : alias === pattern))
      .sort((a, b) => b.prefix.length - a.prefix.length);
    const [match] = matches;
    const [target] = match?.targets ?? [];
    if (!match || !base || target === undefined) continue;
    return resolve(base, match.wildcard ? target.replace('*', alias.slice(match.prefix.length)) : target);
  }
  return null;
}

function relativeName(root: string, path: string): string {
  return path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
}

function incomplete(ruleId: string, file: string, message: string, repair: string): { incomplete: Diagnostic } {
  return { incomplete: { ruleId, severity: 'incomplete', file, message, repair, link: `${SPEC}#package-and-engine` } };
}
