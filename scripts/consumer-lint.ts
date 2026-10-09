import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { appendFile, copyFile, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { toStylex } from '../packages/tokens/src/theme/export.ts';
import type { ThemeDraft } from '../packages/tokens/src/theme/draft.ts';
import { repository, type Run } from './consumer-helpers.ts';
import { LINT_CASES, type ConsumerLayout, type ConsumerReport } from './consumer-report.ts';

/** The hosted fragment, served at https://ultima.systems/ultima.eslint.mjs and downloaded from the loopback registry here. */
export const LINT_FRAGMENT = 'apps/docs/public/ultima.eslint.mjs';
/** The combination the installed fixtures pass, which docs/spec/consumer-lint.md and the install walkthrough publish. */
export const LINT_PINS = { eslint: '9.39.5', 'typescript-eslint': '8.71.1', '@stylexjs/eslint-plugin': '0.19.1' } as const;
/** The supplied severities: 2 error, 1 warning, 0 off. */
export const LINT_RULES: Record<string, number> = { '@stylexjs/valid-styles': 2, '@stylexjs/no-unused': 1, '@stylexjs/valid-shorthands': 1, '@stylexjs/no-conflicting-props': 1, '@stylexjs/sort-keys': 0 };
/** The install command for a project without ESLint, as the walkthrough prints it. */
export const LINT_INSTALL = ['install', '-D', '--save-exact', ...Object.entries(LINT_PINS).map(([name, version]) => `${name}@${version}`)];
/** The complete config for a project without ESLint, byte for byte as the install walkthrough shows it. */
export const MINIMAL_CONFIG = `import tseslint from 'typescript-eslint';
import { ultimaStylex } from './ultima.eslint.mjs';

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/out/**', '**/coverage/**'] },
  {
    files: ultimaStylex.files,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  ultimaStylex,
];
`;
/** The two edits the walkthrough asks of create-next-app's eslint.config.mjs: the import, and the fragment after Next's configs. */
export const NEXT_IMPORT = "import { ultimaStylex } from './ultima.eslint.mjs';";
const NEXT_ANCHOR = '  ...nextTs,\n';

/** How the proof keeps Node processes off the network: a kernel network namespace where the host allows one, and always the preload guard. */
export type NetworkDenial = 'unshare -rn and node preload' | 'node preload';
type Command = { argv: string[]; cwd: string; exit: number | null; network: NetworkDenial | 'allowed'; log: string };
type Probe = { path: string; ignored: boolean; parser: string | null; rules: Record<string, unknown> };
export type LintVerdict = { verdict: 'passed' | 'failed' | 'incomplete'; reasons: string[] };
type LintSnapshot = { id: string; failures: string[]; observation: Record<string, unknown>; commands: Command[]; reproduce: string };

const PRELOAD = `// The lint proof's network guard: every Node process it starts throws on a socket to anything but loopback.
const net = require('node:net');
const local = (host) => host === undefined || host === 'localhost' || host === '127.0.0.1' || host === '::1';
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  const options = first !== null && typeof first === 'object' ? first : { port: first, host: typeof args[1] === 'string' ? args[1] : undefined };
  if (options.path === undefined && !local(options.host)) throw Object.assign(new Error('network denied by the lint proof: ' + options.host + ':' + options.port), { code: 'ULTIMA_OFFLINE' });
  return connect.apply(this, args);
};
`;

/** Where a layout's compiler-included sources live: \`src/\` except the Next root layout. */
const sourceRoot = (layout: ConsumerLayout) => layout === 'next-app' ? '' : 'src';
const at = (layout: ConsumerLayout, path: string) => join(sourceRoot(layout), path);
export const lintPaths = (layout: ConsumerLayout) => ({
  entry: layout === 'vite' ? 'src/App.tsx' : at(layout, 'app/page.tsx'),
  ui: at(layout, 'components/ui'),
  lib: at(layout, 'lib'),
  component: at(layout, 'components/ui/button.tsx'),
  tokens: at(layout, 'lib/tokens.stylex.ts'),
  themes: at(layout, 'lib/themes.ts'),
  generatedTheme: at(layout, 'lib/ultima-theme.js'),
  block: at(layout, 'components/settings-01/settings-01.tsx'),
  semantic: at(layout, 'LintSemantic.tsx'),
  fixtures: at(layout, 'lint-fixtures'),
  ignored: at(layout, 'lint-ignored'),
});

export const severity = (value: unknown): number => {
  const level = Array.isArray(value) ? value[0] : value;
  return level === 'error' ? 2 : level === 'warn' ? 1 : level === 'off' || level === undefined ? 0 : typeof level === 'number' ? level : -1;
};

/**
 * ESLint 9 and typescript-eslint 8 are the only verified lines, and the plugin must match the StyleX
 * runtime exactly. Anything else is unverified, never a pass.
 */
export function combinationProblems(versions: Record<string, string | null | undefined>): string[] {
  const problems: string[] = [];
  const major = (name: string) => Number(versions[name]?.split('.')[0]);
  if (!versions.eslint) problems.push('eslint is not installed');
  else if (major('eslint') !== 9) problems.push(`eslint ${versions.eslint} is unverified; the tested line is ${LINT_PINS.eslint}`);
  if (!versions['@typescript-eslint/parser']) problems.push('the typescript-eslint parser is not installed');
  else if (major('@typescript-eslint/parser') !== 8) problems.push(`@typescript-eslint/parser ${versions['@typescript-eslint/parser']} is unverified; the tested line is ${LINT_PINS['typescript-eslint']}`);
  if (!versions['@stylexjs/eslint-plugin']) problems.push('@stylexjs/eslint-plugin is not installed');
  else if (versions['@stylexjs/eslint-plugin'] !== versions['@stylexjs/stylex']) problems.push(`@stylexjs/eslint-plugin ${versions['@stylexjs/eslint-plugin']} differs from @stylexjs/stylex ${versions['@stylexjs/stylex']}`);
  return problems;
}

/**
 * The proof's reading of one lint run: a missing executable, a crash, an unverified combination or an
 * ignored required file is incomplete; a disabled \`valid-styles\` or a lint error fails; only a clean
 * completed run over every required file passes.
 */
export function lintVerdict(exit: number | null, probes: Probe[], versions: Record<string, string | null | undefined>, output = ''): LintVerdict {
  const incomplete: string[] = [];
  if (exit === null || exit > 1) {
    // ESLint's crash banner and version line say nothing about the cause; the next line names the missing package or config.
    const cause = output.split('\n').map((line) => line.trim()).filter((line) => line && !/^Oops! Something went wrong|^ESLint: \d/.test(line)).slice(0, 2).join(' ');
    incomplete.push(`eslint did not complete (exit ${exit}): ${cause.slice(0, 400) || 'no output'}`);
  }
  incomplete.push(...combinationProblems(versions));
  for (const probe of probes) {
    if (probe.ignored) incomplete.push(`required file is ignored: ${probe.path}`);
    else if (/\.[mc]?tsx?$/.test(probe.path) && !/typescript-eslint/.test(probe.parser ?? '')) incomplete.push(`${probe.path} is not parsed by typescript-eslint (${probe.parser})`);
  }
  if (incomplete.length) return { verdict: 'incomplete', reasons: incomplete };
  const failed = probes.filter((probe) => severity(probe.rules['@stylexjs/valid-styles']) !== 2).map((probe) => `@stylexjs/valid-styles is not an error for ${probe.path}`);
  if (exit === 1) failed.push('eslint reported errors');
  return failed.length ? { verdict: 'failed', reasons: failed } : { verdict: 'passed', reasons: [] };
}

type Message = { ruleId: string | null; severity: number; message: string; line: number; column: number };
type FileResult = { filePath: string; messages: Message[]; errorCount: number; warningCount: number };
const messages = (results: FileResult[], app: string) => results.flatMap((result) => result.messages.map((message) => ({ file: relative(app, result.filePath), ...message })));

const SEMANTIC = `import * as stylex from '@stylexjs/stylex';
import { color, radius, space } from '@/lib/tokens.stylex';

const NARROW = '@media (max-width: 40rem)';

const styles = stylex.create({
  panel: {
    backgroundColor: color['--ult-color-surface-raised'],
    color: color['--ult-color-text'],
    borderRadius: radius['--ult-radius-md'],
    padding: { default: space['--ult-space-6'], [NARROW]: space['--ult-space-3'] },
    ':hover': { backgroundColor: color['--ult-color-surface'] },
  },
  meter: (inline: string) => ({ inlineSize: inline }),
});

export function LintSemantic({ value }: { value: number }) {
  return (
    <div {...stylex.props(styles.panel)}>
      <div {...stylex.props(styles.meter(\`\${value}%\`))}>Semantic tokens, a responsive condition and a dynamic style</div>
    </div>
  );
}
`;
const INVALID = `import * as stylex from '@stylexjs/stylex';
import { color } from '@/lib/tokens.stylex';

const styles = stylex.create({
  label: { colro: color['--ult-color-text'] },
});

export function InvalidProperty() {
  return <p {...stylex.props(styles.label)}>Invalid property</p>;
}
`;
const WARNINGS = `import * as stylex from '@stylexjs/stylex';
import { color } from '@/lib/tokens.stylex';

const styles = stylex.create({
  used: { color: color['--ult-color-text'], margin: '0 auto' },
  unused: { color: color['--ult-color-text-muted'] },
});

export function WarningOnly() {
  return <p {...stylex.props(styles.used)}>Warnings only</p>;
}
`;
const UNRELATED_NEXT = `'use client';
import { useState } from 'react';

export function ConditionalHook({ open }: { open: boolean }) {
  if (open) {
    const [count] = useState(0);
    return <p>{count}</p>;
  }
  return null;
}
`;
const UNRELATED_VITE = `export function stop(): void {
  debugger;
}
`;

/**
 * Installs every positive StyleX catalogue source, the fragment from the loopback registry and the lint
 * dependencies, and writes the config the walkthrough documents. Vite has no ESLint until this runs, so
 * its no-ESLint observation is taken here, before installation.
 */
export async function lintScene(app: string, layout: ConsumerLayout, registry: { url: string; folder: string }, draft: ThemeDraft, execute: Run, output: string): Promise<{ items: string[]; before?: LintSnapshot }> {
  const paths = lintPaths(layout);
  const manifest = JSON.parse(await readFile(join(registry.folder, 'r/registry.json'), 'utf8')) as { items: { name: string; type: string }[] };
  const items = manifest.items.filter((item) => item.type === 'registry:ui' || item.type === 'registry:block').map((item) => item.name).sort();
  await execute(app, 'npx', ['-y', 'shadcn@latest', 'add', ...items.map((id) => `@ultima/${id}`), '--yes', '--overwrite']);
  await writeFile(join(dirname(app), 'deny-network.cjs'), PRELOAD);
  const before = layout === 'vite' ? await noEslint(app, layout, output) : undefined;
  // The docs host serves apps/docs/public; the loopback registry stands in for it.
  await copyFile(join(repository, LINT_FRAGMENT), join(registry.folder, 'ultima.eslint.mjs'));
  const response = await fetch(`${registry.url}/ultima.eslint.mjs`);
  assert.ok(response.ok, 'the loopback registry must serve ultima.eslint.mjs');
  const fragment = await response.text();
  assert.equal(fragment, await readFile(join(repository, LINT_FRAGMENT), 'utf8'), 'the downloaded fragment must be the hosted bytes');
  await writeFile(join(app, 'ultima.eslint.mjs'), fragment);
  const config = join(app, 'eslint.config.mjs');
  if (layout === 'vite') {
    assert.ok(!existsSync(config), 'create-vite no longer ships without ESLint; this layout needs the existing-config path');
    await execute(app, 'npm', LINT_INSTALL);
    await writeFile(config, MINIMAL_CONFIG);
  } else {
    await execute(app, 'npm', ['install', '-D', '--save-exact', `@stylexjs/eslint-plugin@${LINT_PINS['@stylexjs/eslint-plugin']}`]);
    const scaffolded = await readFile(config, 'utf8');
    assert.ok(scaffolded.includes(NEXT_ANCHOR), 'create-next-app no longer composes nextTs; update the walkthrough');
    await writeFile(config, `${NEXT_IMPORT}\n${scaffolded.replace(NEXT_ANCHOR, `${NEXT_ANCHOR}  ultimaStylex,\n`)}`);
  }
  await writeFile(join(app, paths.semantic), SEMANTIC);
  await writeFile(join(app, paths.generatedTheme), toStylex(draft));
  await writeFile(join(app, paths.generatedTheme.replace(/\.js$/, '.d.ts')), `import type * as stylex from '@stylexjs/stylex';
export const ultimaTheme: Record<'dark' | 'light', ReturnType<typeof stylex.createTheme>[]>;
export const colorScheme: Record<'dark' | 'light', stylex.StyleXStyles>;
`);
  const entry = join(app, paths.entry);
  const source = await readFile(entry, 'utf8');
  const rendered = source.replace(/return (<ThemeConsumer[^;]*\/>);/, 'return <><LintSemantic value={40} />$1</>;');
  assert.notEqual(rendered, source, 'the scene entry no longer returns ThemeConsumer');
  await writeFile(entry, `import { LintSemantic } from '${layout === 'vite' ? './' : '../'}LintSemantic';\n${rendered}`);
  return { items, before };
}

let denial: NetworkDenial | undefined;
function networkDenial(): NetworkDenial {
  denial ??= spawnSync('unshare', ['-rn', 'true'], { stdio: 'ignore' }).status === 0 ? 'unshare -rn and node preload' : 'node preload';
  return denial;
}

/** Runs a command offline, capturing its exit instead of throwing, and keeps its output as an artifact. */
async function offline(app: string, output: string, log: string, command: string, args: string[], commands: Command[]): Promise<{ exit: number | null; stdout: string; stderr: string }> {
  const network = networkDenial();
  const preload = join(dirname(app), 'deny-network.cjs');
  const env = { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --require ${preload}`.trim(), npm_config_offline: 'true' };
  const [file, argv] = network.startsWith('unshare') ? ['unshare', ['-rn', command, ...args]] : [command, args];
  const result = await new Promise<{ exit: number | null; stdout: string; stderr: string }>((done) => {
    const child = spawn(file, argv, { cwd: app, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
    child.on('error', (error) => done({ exit: null, stdout, stderr: `${stderr}${String(error)}` }));
    child.on('close', (code) => done({ exit: code, stdout, stderr }));
  });
  await writeFile(join(output, log), `$ ${[command, ...args].join(' ')}\nexit ${result.exit}\n--- stdout\n${result.stdout}\n--- stderr\n${result.stderr}`);
  await appendFile(join(output, '..', 'commands.log'), `${JSON.stringify({ cwd: app, command, args, network, exit: result.exit })}\n`).catch(() => {});
  commands.push({ argv: [command, ...args], cwd: '.', exit: result.exit, network, log });
  return result;
}

async function versionsOf(app: string): Promise<Record<string, string | null>> {
  const names = ['eslint', 'typescript-eslint', '@typescript-eslint/parser', '@stylexjs/eslint-plugin', '@stylexjs/stylex', 'typescript', 'eslint-config-next', 'oxlint'];
  const entries = await Promise.all(names.map(async (name) => {
    try { return [name, (JSON.parse(await readFile(join(app, 'node_modules', name, 'package.json'), 'utf8')) as { version: string }).version] as const; }
    catch { return [name, null] as const; }
  }));
  return Object.fromEntries(entries);
}

/** Every source file under the installed catalogue directories, which a positive run must lint. */
async function catalogueFiles(app: string, layout: ConsumerLayout, items: string[]): Promise<string[]> {
  const paths = lintPaths(layout);
  const folders = [paths.ui, paths.lib, ...items.filter((id) => existsSync(join(app, at(layout, `components/${id}`)))).map((id) => at(layout, `components/${id}`))];
  const files: string[] = [];
  const walk = async (folder: string) => {
    for (const entry of await readdir(join(app, folder), { withFileTypes: true })) {
      const path = join(folder, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (/\.(?:[mc]?[jt]sx?)$/.test(entry.name)) files.push(path);
    }
  };
  for (const folder of folders) await walk(folder);
  return [...files, paths.semantic, paths.generatedTheme, 'ultima.eslint.mjs'].sort();
}

/** A hash of every project file outside dependencies and build output. */
async function tree(app: string): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  const walk = async (folder: string) => {
    for (const entry of await readdir(join(app, folder), { withFileTypes: true })) {
      if (['node_modules', '.next', 'dist', '.git'].includes(entry.name)) continue;
      const path = join(folder, entry.name);
      if (entry.isDirectory()) await walk(path);
      else hashes[path] = createHash('sha256').update(await readFile(join(app, path))).digest('hex');
    }
  };
  await walk('');
  return hashes;
}

async function noEslint(app: string, layout: ConsumerLayout, output: string): Promise<LintSnapshot> {
  const commands: Command[] = [];
  const id = `${layout}/lint/node/no-eslint`;
  await mkdir(output, { recursive: true });
  const config = join(app, 'eslint.config.mjs');
  const hidden = join(app, 'eslint.config.mjs.hidden');
  if (layout !== 'vite') await rename(config, hidden);
  try {
    const run = await offline(app, output, 'no-eslint.0.log', 'npx', ['--no-install', 'eslint', '.'], commands);
    const verdict = lintVerdict(run.exit, [], await versionsOf(app), `${run.stderr}\n${run.stdout}`);
    const failures = verdict.verdict === 'incomplete' ? [] : [`a project without ${layout === 'vite' ? 'ESLint' : 'an ESLint config'} reads as ${verdict.verdict}, not incomplete`];
    return { id, failures, observation: { setup: layout === 'vite' ? 'no ESLint installed' : 'no eslint.config.*', exit: run.exit, verdict }, commands, reproduce: '' };
  } finally { if (layout !== 'vite') await rename(hidden, config); }
}

/**
 * Runs every lint case in docs/spec/consumer-lint.md#verification-and-delivery against the installed
 * project, offline, then compiles it once. Each temporary edit is undone before the next case.
 */
export async function lintProof(app: string, layout: ConsumerLayout, execute: Run, report: ConsumerReport, output: string, scene: { items: string[]; before?: LintSnapshot }): Promise<void> {
  const reproduce = `node --experimental-strip-types scripts/consumer-proof.ts --layout ${layout} --delivery-path css --exercise lint`;
  const paths = lintPaths(layout);
  const lintOutput = join(output, 'lint');
  await mkdir(lintOutput, { recursive: true });
  const config = join(app, 'eslint.config.mjs');
  const composed = await readFile(config, 'utf8');
  const record = async (name: string, snapshot: Omit<LintSnapshot, 'id' | 'reproduce'>) => {
    const id = `${layout}/lint/node/${name}`;
    await writeFile(join(lintOutput, `${name}.values.json`), `${JSON.stringify({ ...snapshot, id, reproduce }, null, 2)}\n`);
    report.executed.push(id);
    report.cases.push({ id, status: snapshot.failures.length ? 'failed' : 'passed', snapshot: `lint/${name}.values.json`, failures: snapshot.failures });
  };
  const eslint = (commands: Command[], log: string, args: string[]) => offline(app, lintOutput, log, 'npx', ['--no-install', 'eslint', ...args], commands);
  const lintJson = async (commands: Command[], log: string, targets: string[]) => {
    const run = await eslint(commands, log, ['--format', 'json', ...targets]);
    let results: FileResult[] = [];
    try { results = JSON.parse(run.stdout) as FileResult[]; } catch { /* a crashed run prints no report; its exit says so */ }
    return { ...run, results, messages: messages(results, app) };
  };
  const probe = async (commands: Command[], log: string, path: string): Promise<Probe> => {
    const run = await eslint(commands, log, ['--print-config', path]);
    if (run.exit !== 0) return { path, ignored: false, parser: null, rules: {} };
    const text = run.stdout.trim();
    if (text === 'undefined' || text === '') return { path, ignored: true, parser: null, rules: {} };
    const value = JSON.parse(text) as { languageOptions?: { parser?: string }; rules?: Record<string, unknown> };
    return { path, ignored: false, parser: value.languageOptions?.parser ?? null, rules: value.rules ?? {} };
  };
  const ultima = async (commands: Command[], log: string, args: string[]) => {
    const run = await offline(app, lintOutput, log, 'npx', ['--no-install', 'ultima-design', ...args, '--json'], commands);
    let value: { counts?: { errors: number; advisories: number }; diagnostics?: { ruleId: string; severity: string; file: string }[] } = {};
    try { value = JSON.parse(run.stdout); } catch { /* recorded as an unreadable report below */ }
    return { exit: run.exit, counts: value.counts ?? null, rules: (value.diagnostics ?? []).map((diagnostic) => `${diagnostic.severity} ${diagnostic.ruleId}`) };
  };
  /** Writes a fixture under lint-fixtures, runs the case, and removes it again. */
  const withFixture = async <T>(name: string, content: string, body: (path: string) => Promise<T>): Promise<T> => {
    const path = join(paths.fixtures, `${name}.tsx`);
    await mkdir(join(app, paths.fixtures), { recursive: true });
    await writeFile(join(app, path), content);
    try { return await body(path); } finally { await rm(join(app, paths.fixtures), { recursive: true, force: true }); }
  };
  const withConfig = async <T>(content: string, body: () => Promise<T>): Promise<T> => {
    await writeFile(config, content);
    try { return await body(); } finally { await writeFile(config, composed); }
  };
  const insertAfterFragment = (blocks: string) => {
    assert.ok(composed.includes('  ultimaStylex,\n'), 'the composed config no longer appends ultimaStylex on its own line');
    return composed.replace('  ultimaStylex,\n', `  ultimaStylex,\n${blocks}`);
  };
  const required = [paths.entry, paths.component, paths.tokens, paths.themes, paths.generatedTheme, paths.block, paths.semantic];
  const versions = await versionsOf(app);
  const guard = async (name: string, body: (commands: Command[]) => Promise<{ failures: string[]; observation: Record<string, unknown> }>) => {
    const commands: Command[] = [];
    try { await record(name, { ...(await body(commands)), commands }); }
    catch (error) { await record(name, { failures: [String(error)], observation: {}, commands }); }
  };

  await guard('config', async (commands) => {
    const probes = [];
    for (const [index, path] of required.entries()) probes.push(await probe(commands, `config.${index}.log`, path));
    const failures: string[] = [];
    for (const item of probes) {
      if (item.ignored) failures.push(`${item.path} is ignored`);
      if (/\.tsx?$/.test(item.path) && !/typescript-eslint/.test(item.parser ?? '')) failures.push(`${item.path} parser: ${item.parser}`);
      for (const [rule, level] of Object.entries(LINT_RULES)) if (severity(item.rules[rule]) !== level) failures.push(`${item.path} ${rule}: expected ${level}, got ${JSON.stringify(item.rules[rule])}`);
      const options = item.rules['@stylexjs/valid-styles'];
      if (!Array.isArray(options) || (options[1] as { allowOuterPseudoAndMedia?: boolean } | undefined)?.allowOuterPseudoAndMedia !== true) failures.push(`${item.path} valid-styles lacks allowOuterPseudoAndMedia`);
    }
    failures.push(...combinationProblems(versions));
    return { failures, observation: { versions, probes: probes.map(({ path, ignored, parser, rules }) => ({ path, ignored, parser, rules: Object.fromEntries(Object.keys(LINT_RULES).map((rule) => [rule, rules[rule] ?? null])) })) } };
  });

  let coverage: string[] = [];
  await guard('catalogue', async (commands) => {
    const run = await lintJson(commands, 'catalogue.0.log', ['.']);
    const linted = new Set(run.results.map((result) => relative(app, result.filePath)));
    const expected = await catalogueFiles(app, layout, scene.items);
    coverage = [...linted].sort();
    const missing = expected.filter((path) => !linted.has(path));
    const errors = run.messages.filter((message) => message.severity === 2);
    const check = await ultima(commands, 'catalogue.1.log', ['check']);
    const probes = [];
    for (const [index, path] of required.entries()) probes.push(await probe(commands, `catalogue.${index + 2}.log`, path));
    const verdict = lintVerdict(run.exit, probes, versions, run.stderr);
    const failures = [
      ...(verdict.verdict === 'passed' ? [] : verdict.reasons),
      ...errors.map((message) => `${message.file}:${message.line}:${message.column} ${message.ruleId}: ${message.message}`),
      ...missing.map((path) => `not linted: ${path}`),
      ...(check.exit === 0 && check.counts?.errors === 0 ? [] : [`ultima-design check exited ${check.exit}: ${check.rules.join(', ')}`]),
    ];
    const warnings: Record<string, string[]> = {};
    for (const message of run.messages.filter((entry) => entry.severity === 1)) (warnings[message.ruleId ?? 'none'] ??= []).push(`${message.file}:${message.line}`);
    return { failures, observation: { exit: run.exit, verdict, files: linted.size, catalogueFiles: expected.length, items: scene.items, warnings, check } };
  });

  await guard('invalid-property', (commands) => withFixture('invalid-property', INVALID, async (path) => {
    const run = await lintJson(commands, 'invalid-property.0.log', [path]);
    const check = await ultima(commands, 'invalid-property.1.log', ['check', '--files', path]);
    const validity = run.messages.filter((message) => message.ruleId === '@stylexjs/valid-styles' && message.severity === 2);
    const failures = [
      ...(run.exit === 1 ? [] : [`eslint exited ${run.exit}, expected 1`]),
      ...(validity.length ? [] : ['no @stylexjs/valid-styles error']),
      ...(check.counts?.errors === 0 ? [] : [`Ultima check blocks the invalid property: ${check.rules.join(', ')}`]),
    ];
    return { failures, observation: { exit: run.exit, diagnostics: run.messages, check } };
  }));

  const palette = await readFile(join(repository, 'packages/analysis/fixtures/app/palette.tsx'), 'utf8');
  await guard('palette-constant', (commands) => withFixture('palette-constant', palette, async (path) => {
    const run = await lintJson(commands, 'palette-constant.0.log', [path]);
    const check = await ultima(commands, 'palette-constant.1.log', ['check', '--files', path]);
    const failures = [
      ...(run.exit === 0 && !run.messages.some((message) => message.ruleId === '@stylexjs/valid-styles') ? [] : [`StyleX validity rejects the palette read (exit ${run.exit})`]),
      ...(check.exit === 1 && check.rules.includes('blocking ULT-APP-PALETTE-001') ? [] : [`Ultima check did not block the palette read: exit ${check.exit}, ${check.rules.join(', ')}`]),
    ];
    return { failures, observation: { exit: run.exit, diagnostics: run.messages, check } };
  }));

  const paint = await readFile(join(repository, 'packages/analysis/fixtures/app/paint.tsx'), 'utf8');
  await guard('raw-paint', (commands) => withFixture('raw-paint', paint, async (path) => {
    const run = await lintJson(commands, 'raw-paint.0.log', [path]);
    const check = await ultima(commands, 'raw-paint.1.log', ['check', '--files', path]);
    const strict = await ultima(commands, 'raw-paint.2.log', ['check', '--strict', '--files', path]);
    const failures = [
      ...(run.exit === 0 && !run.messages.some((message) => message.ruleId === '@stylexjs/valid-styles') ? [] : [`StyleX validity rejects raw paint (exit ${run.exit})`]),
      ...(check.exit === 0 && check.rules.includes('advisory ULT-APP-PAINT-001') ? [] : [`Ultima check did not advise on raw paint: exit ${check.exit}, ${check.rules.join(', ')}`]),
      ...(strict.exit === 1 ? [] : [`check --strict exited ${strict.exit}, expected 1`]),
    ];
    return { failures, observation: { exit: run.exit, diagnostics: run.messages, check, strict } };
  }));

  await guard('warning-only', (commands) => withFixture('warning-only', WARNINGS, async (path) => {
    const warnings = await lintJson(commands, 'warning-only.0.log', [path]);
    await writeFile(join(app, path), WARNINGS.replace("color: color['--ult-color-text-muted']", "colro: color['--ult-color-text-muted']"));
    const mixed = await lintJson(commands, 'warning-only.1.log', [path]);
    const failures = [
      ...(warnings.exit === 0 ? [] : [`warning-only lint exited ${warnings.exit}, expected 0`]),
      ...(warnings.messages.some((message) => message.ruleId === '@stylexjs/no-unused' && message.severity === 1) ? [] : ['no @stylexjs/no-unused warning']),
      ...(warnings.messages.some((message) => message.severity === 2) ? ['the warning fixture reported an error'] : []),
      ...(mixed.exit === 1 && mixed.messages.some((message) => message.ruleId === '@stylexjs/valid-styles' && message.severity === 2) ? [] : [`a validity error beside the warnings exited ${mixed.exit}, expected 1`]),
    ];
    return { failures, observation: { warningOnly: { exit: warnings.exit, diagnostics: warnings.messages }, withError: { exit: mixed.exit, diagnostics: mixed.messages } } };
  }));

  await guard('composition', async (commands) => {
    const existing = layout === 'vite' ? "  { name: 'consumer/rules', rules: { 'no-debugger': 'error' } },\n" : '';
    const prior = `${existing}  { ignores: ['**/lint-ignored/**'] },\n  { name: 'consumer/prior-stylex', files: ['**/*.tsx'], plugins: { '@stylexjs': stylex }, rules: { '@stylexjs/sort-keys': 'warn' } },\n`;
    const content = `import stylex from '@stylexjs/eslint-plugin';\n${composed.replace('  ultimaStylex,\n', `${prior}  ultimaStylex,\n  { name: 'consumer/overrides', files: ['**/*.tsx'], rules: { '@stylexjs/sort-keys': 'warn' } },\n`)}`;
    return withConfig(content, () => withFixture('unrelated', layout === 'vite' ? UNRELATED_VITE : UNRELATED_NEXT, async (path) => {
      const ignoredPath = join(paths.ignored, 'invalid-property.tsx');
      await mkdir(join(app, paths.ignored), { recursive: true });
      await writeFile(join(app, ignoredPath), INVALID);
      try {
        const entry = await probe(commands, 'composition.0.log', paths.entry);
        const ignored = await probe(commands, 'composition.1.log', ignoredPath);
        const run = await lintJson(commands, 'composition.2.log', [path, paths.semantic]);
        const unrelated = layout === 'vite' ? 'no-debugger' : 'react-hooks/rules-of-hooks';
        const kept = layout === 'vite' ? { 'no-debugger': 2 } : { 'react-hooks/rules-of-hooks': 2, '@next/next/no-html-link-for-pages': 1, '@typescript-eslint/no-unused-vars': 1 };
        const failures = [
          ...(run.exit === 1 && run.messages.some((message) => message.ruleId === unrelated && message.severity === 2) ? [] : [`the unrelated ${unrelated} error did not fail the run (exit ${run.exit})`]),
          ...(run.messages.some((message) => message.file === paths.semantic && message.severity === 2) ? [`the composed config errors on ${paths.semantic}`] : []),
          ...(ignored.ignored ? [] : ['the custom ignore was lost']),
          ...Object.entries(kept).filter(([rule, level]) => severity(entry.rules[rule]) < level).map(([rule]) => `existing rule ${rule} was lost: ${JSON.stringify(entry.rules[rule])}`),
          ...(severity(entry.rules['@stylexjs/valid-styles']) === 2 ? [] : ['valid-styles is no longer an error']),
          ...(severity(entry.rules['@stylexjs/sort-keys']) === 1 ? [] : [`the later consumer override did not win: sort-keys ${JSON.stringify(entry.rules['@stylexjs/sort-keys'])}`]),
        ];
        return { failures, observation: { config: content, exit: run.exit, diagnostics: run.messages, entry: { parser: entry.parser, rules: Object.fromEntries([...Object.keys(kept), ...Object.keys(LINT_RULES)].map((rule) => [rule, entry.rules[rule] ?? null])) }, ignored: ignored.ignored } };
      } finally { await rm(join(app, paths.ignored), { recursive: true, force: true }); }
    }));
  });

  const absent = scene.before ?? await noEslint(app, layout, lintOutput);
  await record('no-eslint', { failures: absent.failures, observation: absent.observation, commands: absent.commands });

  /** A broken setup must read as incomplete or failed, never passed. */
  const negative = (name: string, wanted: 'incomplete' | 'failed', setup: () => Promise<() => Promise<void>>) => guard(name, async (commands) => {
    const undo = await setup();
    try {
      const run = await lintJson(commands, `${name}.0.log`, [paths.semantic, paths.component]);
      const probes = [];
      for (const [index, path] of [paths.entry, paths.component].entries()) probes.push(await probe(commands, `${name}.${index + 1}.log`, path));
      const verdict = lintVerdict(run.exit, probes, await versionsOf(app), `${run.stderr}\n${run.stdout}`);
      return { failures: verdict.verdict === wanted ? [] : [`expected ${wanted}, read ${verdict.verdict}: ${verdict.reasons.join('; ')}`], observation: { exit: run.exit, verdict } };
    } finally { await undo(); }
  });
  const plugin = join(app, 'node_modules/@stylexjs/eslint-plugin');
  await negative('missing-plugin', 'incomplete', async () => {
    await rename(plugin, `${plugin}.hidden`);
    return () => rename(`${plugin}.hidden`, plugin);
  });
  await negative('incompatible-package', 'incomplete', async () => {
    const manifest = join(plugin, 'package.json');
    const original = await readFile(manifest, 'utf8');
    await writeFile(manifest, original.replace(/"version":\s*"[^"]+"/, '"version": "0.18.3"'));
    return () => writeFile(manifest, original);
  });
  await negative('bad-config', 'incomplete', async () => {
    await writeFile(config, `${composed}\nexport const broken = [;\n`);
    return () => writeFile(config, composed);
  });
  await negative('ignored-tsx', 'incomplete', async () => {
    await writeFile(config, insertAfterFragment(`  { ignores: ['${paths.ui}/**'] },\n`));
    return () => writeFile(config, composed);
  });
  await negative('severity-override', 'failed', async () => {
    await writeFile(config, insertAfterFragment("  { rules: { '@stylexjs/valid-styles': 'off' } },\n"));
    return () => writeFile(config, composed);
  });

  await guard('offline', async (commands) => {
    const control = await offline(app, lintOutput, 'offline.0.log', 'node', ['-e', "fetch('https://registry.npmjs.org/').then(() => process.exit(0), () => process.exit(7))"], commands);
    const before = await tree(app);
    const lint = await eslint(commands, 'offline.1.log', ['.']);
    const runs = [];
    for (const [index, command] of ['doctor', 'check', 'doctor', 'check'].entries()) {
      const run = await offline(app, lintOutput, `offline.${index + 2}.log`, 'npx', ['--no-install', 'ultima-design', command, '--json'], commands);
      runs.push({ command, exit: run.exit, stdout: run.stdout });
    }
    const after = await tree(app);
    const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((path) => before[path] !== after[path]);
    const failures = [
      ...(control.exit === 7 ? [] : [`the network guard let a request through (exit ${control.exit})`]),
      ...(lint.exit === 0 ? [] : [`offline eslint exited ${lint.exit}`]),
      ...runs.filter((run) => run.exit === null || run.exit > 1).map((run) => `offline ${run.command} exited ${run.exit}`),
      ...(runs[0]!.stdout === runs[2]!.stdout && runs[1]!.stdout === runs[3]!.stdout ? [] : ['repeated doctor or check output differs']),
      ...changed.map((path) => `changed while linting offline: ${path}`),
    ];
    return { failures, observation: { network: networkDenial(), control: control.exit, lint: lint.exit, doctor: runs[0]!.exit, check: runs[1]!.exit, files: Object.keys(before).length, changed } };
  });

  await guard('compile', async (commands) => {
    let log = '';
    const failures: string[] = [];
    try { log = await execute(app, 'npm', ['run', 'build']); } catch (error) { failures.push(String(error)); log = String(error); }
    await writeFile(join(lintOutput, 'compile.0.log'), log);
    commands.push({ argv: ['npm', 'run', 'build'], cwd: '.', exit: failures.length ? 1 : 0, network: 'allowed', log: 'compile.0.log' });
    return { failures, observation: { linted: paths.semantic } };
  });

  const scripts = (JSON.parse(await readFile(join(app, 'package.json'), 'utf8')) as { scripts?: Record<string, string> }).scripts ?? {};
  report.lint = {
    fragment: { path: 'ultima.eslint.mjs', digest: createHash('sha256').update(await readFile(join(app, 'ultima.eslint.mjs'))).digest('hex') },
    config: layout === 'vite' ? 'minimal' : 'create-next-app with the fragment appended',
    lintScript: scripts.lint ?? null,
    network: networkDenial(),
    versions,
    files: coverage,
  };
  for (const [name, version] of Object.entries(versions)) if (version) report.versions[name] = version;
}

assert.deepEqual([...LINT_CASES].sort(), ['bad-config', 'catalogue', 'compile', 'composition', 'config', 'ignored-tsx', 'incompatible-package', 'invalid-property', 'missing-plugin', 'no-eslint', 'offline', 'palette-constant', 'raw-paint', 'severity-override', 'warning-only'], 'consumer-report.ts must list every lint case');

/** What the verifier requires of a retained lint snapshot. */
export function lintSnapshotProblems(snapshot: unknown, row: { id: string; status: string; failures: string[] }, exists: (log: string) => boolean): string[] {
  const value = snapshot as Partial<LintSnapshot> | null;
  const problems: string[] = [];
  if (!value || value.id !== row.id || JSON.stringify(value.failures) !== JSON.stringify(row.failures)) problems.push('snapshot disagrees with its case');
  const name = row.id.split('/').at(-1)!;
  if (!LINT_CASES.includes(name)) problems.push('unknown lint case');
  const commands = Array.isArray(value?.commands) ? value.commands : [];
  if (row.status === 'passed' && commands.length === 0) problems.push('a passing lint case ran no command');
  for (const command of commands) {
    if (!Array.isArray(command?.argv) || typeof command.log !== 'string' || !exists(command.log)) problems.push('missing command log');
    else if (name !== 'compile' && command.network === 'allowed') problems.push(`ran with network: ${command.argv.join(' ')}`);
  }
  return problems;
}
