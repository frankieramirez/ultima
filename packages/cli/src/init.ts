// `init` for a new project: docs/spec/consumer-setup.md. It plans from typed recipe data, shows the plan, and applies
// it in private staging beside the destination, publishing into the absent destination only after doctor, check,
// typecheck and build pass. A failed run keeps its staging and logs and leaves the destination absent. A directory
// that already holds an application goes to existing.ts instead.
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  appendFileSync,
  chmodSync,
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { createTwoFilesPatch } from 'diff';

import { type AgentPlan, type AgentResult, agentResult, agentStep, describeAgents, planAgents } from './agents.ts';
import { type ExistingPlan, applyExistingFile, initExisting, isExistingProject } from './existing.ts';
import { CLI_VERSION, HARNESSES, type Harness } from './install.ts';
import { rollback } from './journal.ts';
import { MANAGERS, type Manager, type ManualStep, RECIPES, type Recipe, forManager, normalizeScaffold, sha256 } from './recipe.ts';
import { compareVersions } from './setup.ts';

declare const __ULTIMA_COMMIT__: string | undefined;

export const PLAN_KIND = 'ultima-init-plan';
export const PLAN_VERSION = 1;
export const DEFAULT_REGISTRY = 'https://ultima.systems/r/{name}.json';
export const REGISTRY = /^https?:\/\/[^\s]+\/r\/\{name\}\.json$/;
const NAME = /^[a-z0-9][a-z0-9._-]*$/;
const CHECKS = ['doctor', 'check', 'typecheck', 'build'] as const;
export type CheckName = (typeof CHECKS)[number];

export type InitRequest = {
  destination: string;
  framework: string;
  layout: string;
  packageManager: Manager;
  registry: string;
  cliTarball: string | null;
  /** `--harness`, replacing `install`'s detection; null detects. */
  harnesses: Harness[] | null;
};

export type Command = { command: string; args: string[]; cwd: 'staging' | 'app' };

export type Operation =
  | { id: string; kind: 'run'; command: Command }
  | { id: string; kind: 'verify-scaffold'; files: Record<string, string> }
  | { id: string; kind: 'write'; path: string; content: string; replaces: string | null; diff: string }
  | { id: string; kind: 'move'; from: string; to: string; sha256: string }
  | { id: string; kind: 'remove'; path: string; sha256: string }
  | { id: string; kind: 'verify-versions'; versions: Record<string, string> }
  /** Hands the plan's `agents` to `install`, which writes only what the plan listed. */
  | { id: string; kind: 'install-agents' }
  | { id: string; kind: 'check'; check: CheckName; command: Command };

export type Plan = {
  kind: typeof PLAN_KIND;
  schemaVersion: typeof PLAN_VERSION;
  cli: { name: 'ultima-design'; version: string; commit: string | null };
  recipe: { id: string; revision: number; title: string; sha256: string };
  request: InitRequest;
  target: { destination: string; name: string; framework: string; layout: string; packageManager: { name: Manager; version: string } };
  inputs: { node: string; destination: 'absent'; parent: string; cliTarball: { path: string; sha256: string } | null };
  payloads: { item: string; url: string; sha256: string }[];
  dependencies: { dependencies: Record<string, string>; devDependencies: Record<string, string> };
  operations: Operation[];
  discard: string[];
  preview: Recipe['preview'];
  agents: AgentPlan;
  manualSteps: ManualStep[];
  planHash: string;
};

export type Exec = (command: string, args: string[], cwd: string, log: string) => Promise<number>;
export type Fetch = (url: string) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;
export type InitIO = { interactive: boolean; ask(question: string): Promise<boolean>; out(text: string): void; err(text: string): void };
export type InitDeps = {
  exec: Exec;
  fetch: Fetch;
  recipes: Recipe[];
  managerVersion(manager: Manager, cwd: string): string | null;
};

type Outcome = { code: 0 | 1 | 2 | 3; message: string };
const fail = (code: 1 | 2 | 3, message: string): Outcome => ({ code, message });

export const defaultDeps: InitDeps = {
  exec: (command, args, cwd, log) =>
    new Promise((done) => {
      const fd = openSync(log, 'a');
      const child = spawn(command, args, { cwd, stdio: ['ignore', fd, fd] });
      child.on('error', (error) => {
        closeSync(fd);
        appendFileSync(log, `${String(error)}\n`);
        done(127);
      });
      child.on('close', (code) => {
        closeSync(fd);
        done(code ?? 1);
      });
    }),
  fetch: (url) => fetch(url),
  recipes: RECIPES,
  managerVersion: (manager, cwd) => {
    const result = spawnSync(manager, ['--version'], { cwd, encoding: 'utf8' });
    return result.status === 0 ? result.stdout.trim() : null;
  },
};

const USAGE =
  'usage: ultima init <directory> --framework vite|next [--layout root|src] [--package-manager npm|pnpm] [--harness <name>]... [--plan [--json]] [--registry <url>] [--cli-tarball <path>]\n       ultima init <existing-app> [--framework vite|next] [--package-manager npm|pnpm] [--harness <name>]... [--plan [--json]] [--registry <url>] [--cli-tarball <path>]\n       ultima init --apply <plan.json> [--json]\n       ultima init [<existing-app>] --rollback <run-id>';

export async function init(argv: string[], io: InitIO, deps: InitDeps = defaultDeps): Promise<number> {
  let args;
  try {
    args = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        framework: { type: 'string' },
        layout: { type: 'string' },
        'package-manager': { type: 'string' },
        harness: { type: 'string', multiple: true },
        plan: { type: 'boolean' },
        json: { type: 'boolean' },
        apply: { type: 'string' },
        registry: { type: 'string' },
        'cli-tarball': { type: 'string' },
        rollback: { type: 'string' },
      },
    });
  } catch (error) {
    return usage(io, (error as Error).message);
  }
  const { values, positionals } = args;
  const json = values.json ?? false;
  if (values.apply !== undefined) {
    const extra = [...positionals, ...Object.keys(values).filter((flag) => flag !== 'apply' && flag !== 'json')];
    if (extra.length > 0) return usage(io, `--apply takes only the plan path, so nothing can change the reviewed operations; got ${extra.join(', ')}`);
    return applyFile(resolve(values.apply), json, io, deps);
  }
  if (values.rollback !== undefined) {
    const extra = Object.keys(values).filter((flag) => flag !== 'rollback');
    if (extra.length > 0 || positionals.length > 1) return usage(io, `--rollback takes the run id and, at most, the application directory; got ${[...positionals.slice(1), ...extra].join(', ')}`);
    const directory = resolve(positionals[0] ?? '.');
    if (!isExistingProject(directory)) return usage(io, `${directory} holds no package.json; name the application the run set up`);
    return rollback(realpathSync(directory), values.rollback, io);
  }
  if (positionals.length !== 1) return usage(io, positionals.length === 0 ? 'name the directory to create' : `init takes one directory, got ${positionals.join(' ')}`);
  const unknown = values.harness?.find((name) => !(HARNESSES as string[]).includes(name));
  if (unknown !== undefined) return usage(io, `--harness takes ${HARNESSES.join(', ')}, got ${unknown}`);
  if (isExistingProject(resolve(positionals[0] as string))) return existing(resolve(positionals[0] as string), values, io, deps);
  const frameworks = [...new Set(deps.recipes.map(({ framework }) => framework as string))];
  if (values.framework === undefined) return usage(io, `a new project needs --framework ${frameworks.join(' or ')}`);
  if (!frameworks.includes(values.framework)) return usage(io, `--framework takes ${frameworks.join(' or ')}, got ${values.framework}`);
  const layouts = deps.recipes.filter(({ framework }) => framework === values.framework).map(({ layout }) => layout as string);
  const layout = values.layout ?? (layouts[0] as string);
  if (!layouts.includes(layout)) return usage(io, `--layout takes ${layouts.join(' or ')} for ${values.framework}, got ${layout}`);
  const manager = values['package-manager'] ?? 'npm';
  if (!(MANAGERS as string[]).includes(manager)) return usage(io, `--package-manager takes ${MANAGERS.join(' or ')}, got ${manager}`);
  if (json && !values.plan) return usage(io, '--json prints a plan or an apply result: pass --plan --json, or --apply <plan.json> --json');
  if (!values.plan && !io.interactive) {
    return usage(io, 'init writes only a reviewed plan outside a terminal: run --plan --json > plan.json, then --apply plan.json');
  }
  const request: InitRequest = {
    destination: resolve(positionals[0] as string),
    framework: values.framework,
    layout,
    packageManager: manager as Manager,
    registry: values.registry ?? DEFAULT_REGISTRY,
    cliTarball: values['cli-tarball'] === undefined ? null : resolve(values['cli-tarball']),
    harnesses: harnessesOf(values.harness),
  };
  const planned = await planInit(request, deps);
  if ('code' in planned) return report(io, planned);
  if (values.plan) {
    io.out(json ? `${JSON.stringify(planned, null, 2)}\n` : printPlan(planned));
    return 0;
  }
  io.out(printPlan(planned));
  if (!(await io.ask(`Create ${planned.target.destination}?`))) {
    io.out('Cancelled. Nothing was written.\n');
    return 3;
  }
  return apply(planned, false, io, deps);
}

/** An existing application: detection settles the framework, layout and manager, and the flags may only confirm them. */
function existing(
  directory: string,
  values: { framework?: string; 'package-manager'?: string; harness?: string[]; plan?: boolean; json?: boolean; registry?: string; 'cli-tarball'?: string },
  io: InitIO,
  deps: InitDeps,
): Promise<number> | number {
  const { framework, 'package-manager': manager } = values;
  if (framework !== undefined && framework !== 'vite' && framework !== 'next') return usage(io, `--framework takes vite or next for an existing application, got ${framework}`);
  if (manager !== undefined && !(MANAGERS as string[]).includes(manager)) return usage(io, `--package-manager takes ${MANAGERS.join(' or ')}, got ${manager}`);
  if (values.json && !values.plan) return usage(io, '--json prints a plan or an apply result: pass --plan --json, or --apply <plan.json> --json');
  if (!values.plan && !io.interactive) return usage(io, 'init writes only a reviewed plan outside a terminal: run --plan --json > plan.json, then --apply plan.json');
  const request = {
    mode: 'existing' as const,
    root: realpathSync(directory),
    framework: (framework ?? null) as 'vite' | 'next' | null,
    packageManager: (manager ?? null) as Manager | null,
    registry: values.registry ?? DEFAULT_REGISTRY,
    cliTarball: values['cli-tarball'] === undefined ? null : resolve(values['cli-tarball']),
    harnesses: harnessesOf(values.harness),
  };
  return initExisting(request, { plan: values.plan ?? false, json: values.json ?? false }, io, deps);
}

/** Repeated flags name each harness once, in the order install lists them. */
function harnessesOf(names: string[] | undefined): Harness[] | null {
  return names === undefined ? null : HARNESSES.filter((harness) => names.includes(harness));
}

/** A request's harnesses as a plan file records them: null, or known names. */
export function validHarnesses(value: unknown): boolean {
  return value === null || (Array.isArray(value) && value.every((name) => (HARNESSES as unknown[]).includes(name)));
}

function usage(io: InitIO, message: string): number {
  io.err(`ultima: ${message}\n${USAGE}\n`);
  return 2;
}

function report(io: InitIO, outcome: Outcome): number {
  io.err(`ultima init: ${outcome.message}\n`);
  return outcome.code;
}

/** Everything `--plan` shows and `--apply` rechecks. Reads only: it never creates a file or directory. */
export async function planInit(request: InitRequest, deps: InitDeps): Promise<Plan | Outcome> {
  const selected = deps.recipes.find(({ framework, layout }) => framework === request.framework && layout === request.layout);
  if (!selected) return fail(2, `no recipe for --framework ${request.framework} --layout ${request.layout}`);
  const recipe = forManager(selected, request.packageManager);
  if (compareVersions(process.versions.node, recipe.node) < 0) {
    return fail(1, `recipe ${recipe.id} is tested on Node ${recipe.node} or later, and this is Node ${process.versions.node}; upgrade Node and plan again`);
  }
  const name = basename(request.destination);
  if (!NAME.test(name)) return fail(2, `${name} is not a lowercase package name; name the directory with a-z, 0-9, ".", "_" or "-"`);
  if (!REGISTRY.test(request.registry)) return fail(2, `--registry takes a URL ending in /r/{name}.json, got ${request.registry}`);
  const parent = dirname(request.destination);
  if (!isDirectory(parent)) return fail(2, `${parent} is not a directory; create it first`);
  if (exists(request.destination)) {
    return fail(1, `${request.destination} already exists and holds no package.json. init creates a new directory, or sets up an existing application from its root`);
  }
  const workspace = enclosingWorkspace(parent);
  if (workspace) return fail(1, `${request.destination} would sit inside the workspace at ${workspace}, which init does not change; choose a directory outside it`);
  let cliTarball: Plan['inputs']['cliTarball'] = null;
  if (request.cliTarball !== null) {
    if (!request.cliTarball.endsWith('.tgz') || !isFile(request.cliTarball)) return fail(2, `--cli-tarball takes a packed ultima-design .tgz, got ${request.cliTarball}`);
    cliTarball = { path: request.cliTarball, sha256: sha256(readFileSync(request.cliTarball)) };
  }
  const managerVersion = deps.managerVersion(request.packageManager, parent);
  if (managerVersion === null) return fail(3, `${request.packageManager} did not report a version; install it or choose another --package-manager`);

  const payloads = await registryPayloads(request.registry, [recipe.setupItem, ...recipe.items], deps.fetch);
  if ('code' in payloads) return payloads;

  const cli = cliTarball ? `file:${cliTarball.path}` : CLI_VERSION;
  const fill = (text: string) => text.replaceAll('{{name}}', name).replaceAll('{{pnpm}}', managerVersion).replaceAll('{{cli}}', JSON.stringify(cli).slice(1, -1));
  const devDependencies = { ...recipe.devDependencies, 'ultima-design': cli };
  const versions = { ...recipe.dependencies, ...recipe.devDependencies, 'ultima-design': CLI_VERSION };
  const write = (file: Recipe['files'][number]): Operation => {
    const after = fill(file.after);
    const before = file.before === undefined ? null : fill(file.before);
    const replaces = before === null ? recipe.scaffoldFiles[file.path] ?? null : sha256(before);
    const header = before === null ? `replaces the scaffold example, sha256 ${replaces?.slice(0, 12)}` : '';
    return { id: `write ${file.path}`, kind: 'write', path: file.path, content: after, replaces, diff: createTwoFilesPatch(file.path, file.path, before ?? '', after, header, '') };
  };
  const { packageManager: pm } = request;
  const dlx = (pkg: { package: string; version: string }, rest: string[], cwd: Command['cwd']): Command =>
    pm === 'npm' ? { command: 'npx', args: ['--yes', `${pkg.package}@${pkg.version}`, ...rest], cwd } : { command: 'pnpm', args: ['dlx', `${pkg.package}@${pkg.version}`, ...rest], cwd };
  const exec = (rest: string[]): Command => (pm === 'npm' ? { command: 'npm', args: ['exec', '--no', '--', ...rest], cwd: 'app' } : { command: 'pnpm', args: ['exec', ...rest], cwd: 'app' });
  const setup = payloads.items.find(({ item }) => item === recipe.setupItem);
  const components = setup?.files.find(({ path }) => path === 'components.json');
  const moves: Operation[] = [];
  for (const { from, to } of recipe.moves) {
    const file = setup?.files.find(({ path }) => path === from);
    if (!file) return fail(1, `${recipe.setupItem} no longer installs ${from}, which recipe ${recipe.id} moves to ${to}`);
    moves.push({ id: `move ${from}`, kind: 'move', from, to, sha256: sha256(file.content) });
  }
  const checks: Record<CheckName, Command> = {
    doctor: exec(['ultima', 'doctor']),
    check: exec(['ultima', 'check']),
    typecheck: exec(recipe.typecheck),
    build: { command: pm, args: ['run', 'build'], cwd: 'app' },
  };

  const operations: Operation[] = [
    { id: 'scaffold', kind: 'run', command: dlx(recipe.scaffold, [name, ...recipe.scaffold.args], 'staging') },
    { id: 'verify scaffold', kind: 'verify-scaffold', files: recipe.scaffoldFiles },
    ...recipe.aliasFiles.map(write),
    { id: 'install', kind: 'run', command: { command: pm, args: pm === 'npm' ? ['install'] : ['install', '--no-frozen-lockfile'], cwd: 'app' } },
    { id: `add ${recipe.setupItem}`, kind: 'run', command: dlx(recipe.shadcn, ['add', request.registry.replace('{name}', recipe.setupItem), '--yes'], 'app') },
    ...(components ? componentsWrite(components.content, request.registry, recipe.css) : []),
    { id: `add ${recipe.items.join(', ')}`, kind: 'run', command: dlx(recipe.shadcn, ['add', ...recipe.items.map((item) => `@ultima/${item}`), '--yes'], 'app') },
    ...moves,
    ...recipe.files.map(write),
    ...recipe.removes.map((path): Operation => ({ id: `remove ${path}`, kind: 'remove', path, sha256: recipe.scaffoldFiles[path] ?? '' })),
    { id: 'verify versions', kind: 'verify-versions', versions },
    ...(recipe.typegen ? [{ id: 'typegen', kind: 'run', command: exec(recipe.typegen) } satisfies Operation] : []),
    ...CHECKS.map((check): Operation => ({ id: check, kind: 'check', check, command: checks[check] })),
  ];

  // The destination does not exist yet, so its Git root is never its own and agent setup is always the consumer's step.
  const { agents } = planAgents(request.destination, { exists: false, harnesses: request.harnesses, pm });
  const agentManual = agentStep(agents, name);

  const body: Omit<Plan, 'planHash'> = {
    kind: PLAN_KIND,
    schemaVersion: PLAN_VERSION,
    cli: { name: 'ultima-design', version: CLI_VERSION, commit: typeof __ULTIMA_COMMIT__ === 'string' ? __ULTIMA_COMMIT__ : null },
    recipe: { id: recipe.id, revision: recipe.revision, title: recipe.title, sha256: sha256(JSON.stringify(recipe)) },
    request,
    target: { destination: request.destination, name, framework: recipe.framework, layout: recipe.layout, packageManager: { name: pm, version: managerVersion } },
    inputs: { node: process.versions.node, destination: 'absent', parent, cliTarball },
    payloads: payloads.hashes,
    dependencies: { dependencies: recipe.dependencies, devDependencies },
    operations,
    discard: recipe.discard,
    preview: recipe.preview,
    agents,
    manualSteps: [...recipe.manualSteps, ...(agentManual ? [agentManual] : [])],
  };
  return { ...body, planHash: planHash(body) };
}

export function planHash(body: object): string {
  return sha256(JSON.stringify(body));
}

/** Points the installed `components.json` at the layout's CSS entry and the requested registry, when the setup item's differ. */
function componentsWrite(content: string, registry: string, css: string): Operation[] {
  const json = JSON.parse(content);
  if (json.tailwind?.css === css && json.registries?.['@ultima'] === registry) return [];
  const after = `${JSON.stringify({ ...json, tailwind: { ...json.tailwind, css }, registries: { ...json.registries, '@ultima': registry } }, null, 2)}\n`;
  return [{ id: 'write components.json', kind: 'write', path: 'components.json', content: after, replaces: sha256(content), diff: createTwoFilesPatch('components.json', 'components.json', content, after, '', '') }];
}

/** A registry item as served: `path` is the target without `~/`, or the served path; `target` is empty when the item's type places the file. */
export type RegistryItem = {
  item: string;
  files: { path: string; type: string; target: string; content: string }[];
  dependencies: string[];
  devDependencies: string[];
  /** The `@ultima` items it installs with, without the namespace. */
  registryDependencies: string[];
};

export async function registryPayloads(registry: string, roots: string[], fetchUrl: Fetch): Promise<{ hashes: Plan['payloads']; items: RegistryItem[] } | Outcome> {
  const hashes: Plan['payloads'] = [];
  const items: RegistryItem[] = [];
  const queue = [...roots];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const item = queue.shift() as string;
    if (seen.has(item)) continue;
    seen.add(item);
    const url = registry.replace('{name}', item);
    let text: string;
    try {
      const response = await fetchUrl(url);
      if (!response.ok) return fail(3, `${url} answered ${response.status}; check the network and --registry`);
      text = await response.text();
    } catch (error) {
      return fail(3, `${url} could not be fetched (${(error as Error).message}); check the network and --registry`);
    }
    let json: { registryDependencies?: string[]; dependencies?: string[]; devDependencies?: string[]; files?: { path: string; type?: string; target?: string; content?: string }[] };
    try {
      json = JSON.parse(text);
    } catch {
      return fail(3, `${url} is not a registry item`);
    }
    hashes.push({ item, url, sha256: sha256(text) });
    const ultima = (json.registryDependencies ?? []).flatMap((dependency) => (dependency.startsWith('@ultima/') ? [dependency.slice('@ultima/'.length)] : []));
    items.push({
      item,
      files: (json.files ?? []).map(({ path, type, target, content }) => ({ path: (target ?? path).replace(/^~\//, ''), type: type ?? '', target: (target ?? '').replace(/^~\//, ''), content: content ?? '' })),
      dependencies: json.dependencies ?? [],
      devDependencies: json.devDependencies ?? [],
      registryDependencies: ultima,
    });
    queue.push(...ultima);
  }
  hashes.sort((a, b) => a.item.localeCompare(b.item));
  return { hashes, items };
}

async function applyFile(path: string, json: boolean, io: InitIO, deps: InitDeps): Promise<number> {
  let plan: Plan;
  try {
    plan = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    return usage(io, `--apply could not read a plan from ${path}: ${(error as Error).message}`);
  }
  if (plan?.kind !== PLAN_KIND || plan.schemaVersion !== PLAN_VERSION) {
    return report(io, fail(3, `${path} is not a version ${PLAN_VERSION} init plan; plan again with this CLI`));
  }
  const { planHash: recorded, ...body } = plan;
  if (planHash(body) !== recorded) return report(io, fail(1, `${path} was edited after it was planned; nothing was written. Plan again and apply the new plan unchanged`));
  if ((plan as unknown as ExistingPlan).mode === 'existing') return applyExistingFile(path, plan as unknown as ExistingPlan, json, io, deps);
  if (!validRequest(plan.request)) return report(io, fail(1, `${path} holds an invalid request; nothing was written. Plan again`));
  const fresh = await planInit(plan.request, deps);
  if ('code' in fresh) return report(io, fresh);
  if (fresh.planHash !== recorded) {
    const changed = (['cli', 'recipe', 'target', 'inputs', 'payloads', 'dependencies', 'operations'] as const).filter(
      (key) => JSON.stringify(fresh[key]) !== JSON.stringify(plan[key]),
    );
    return report(io, fail(1, `${path} is stale: ${changed.join(', ') || 'its inputs'} changed since it was planned; nothing was written. Plan again`));
  }
  return apply(fresh, json, io, deps);
}

function validRequest(request: unknown): request is InitRequest {
  const value = request as InitRequest | null;
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.destination === 'string' &&
    value.destination === resolve(value.destination) &&
    typeof value.framework === 'string' &&
    typeof value.layout === 'string' &&
    (MANAGERS as string[]).includes(value.packageManager) &&
    typeof value.registry === 'string' &&
    (value.cliTarball === null || typeof value.cliTarball === 'string') &&
    validHarnesses(value.harnesses)
  );
}

type Result = {
  command: 'init';
  status: 'completed' | 'failed' | 'incomplete';
  destination: string;
  planHash: string;
  runId: string;
  staging: string | null;
  logs: string;
  operations: { id: string; status: 'done' | 'failed' | 'not run'; log?: string }[];
  checks: Partial<Record<CheckName, 'passed' | 'failed'>>;
  versions: Record<string, string>;
  files: { created: string[]; edited: string[]; removed: string[]; preserved: string[] };
  previewMounted: boolean;
  browserChecks: 'not run';
  agents: AgentResult;
  manualSteps: ManualStep[];
  outcomes: Outcomes;
  error?: string;
};

/** Each outcome reported separately: an application can be ready while its agent setup waits. */
export type Outcomes = {
  application: 'ready' | 'incomplete' | 'failed';
  agents: AgentResult['status'];
  staticChecks: 'passed' | 'failed' | 'not run';
  build: 'passed' | 'failed' | 'not run';
  browser: 'not run';
  manualSteps: { required: number; optional: number };
};

export function outcomes(status: Result['status'], checks: Result['checks'], agents: AgentResult, steps: ManualStep[]): Outcomes {
  const statics = (['doctor', 'check', 'typecheck'] as const).map((check) => checks[check]);
  return {
    application: status === 'completed' ? 'ready' : status,
    agents: agents.status,
    staticChecks: statics.includes('failed') ? 'failed' : statics.every((check) => check === 'passed') ? 'passed' : 'not run',
    build: checks.build ?? 'not run',
    browser: 'not run',
    manualSteps: { required: steps.filter(({ required }) => required).length, optional: steps.filter(({ required }) => !required).length },
  };
}

export function summaryLines(application: string, checks: Result['checks'], agents: AgentResult, steps: ManualStep[], noBuild?: string): string[] {
  const required = steps.filter((step) => step.required).length;
  return [
    `Application    ${application}`,
    `Agent setup    ${describeAgents(agents, agents.status)}`,
    `Static checks  ${(['doctor', 'check', 'typecheck'] as const).map((check) => `${check} ${checks[check] ?? 'not run'}`).join(', ')}`,
    `Build          ${checks.build ?? (noBuild ? `not run: ${noBuild}` : 'not run')}`,
    'Browser        not run: init runs no browser checks',
    `Manual steps   ${required} required, ${steps.length - required} optional${steps.length > 0 ? ', listed below' : ''}`,
  ];
}

export function stepLines(steps: ManualStep[]): string[] {
  return steps.flatMap((step, index) => [
    `  ${index + 1}. ${step.title} (${step.required ? 'required' : 'optional'})`,
    `     File    ${step.file}`,
    `     Edit    ${step.edit}`,
    `     Verify  ${step.verify}`,
  ]);
}

async function apply(plan: Plan, json: boolean, io: InitIO, deps: InitDeps): Promise<number> {
  const progress = json ? io.err : io.out;
  const { destination, name } = plan.target;
  if (exists(destination)) return report(io, fail(1, `${destination} already exists; nothing was written`));
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomBytes(3).toString('hex')}`;
  const staging = mkdtempSync(join(dirname(destination), `.ultima-init-${name}-`));
  chmodSync(staging, 0o700);
  const app = join(staging, name);
  const logs = join(staging, 'logs');
  mkdirSync(logs);
  const result: Result = {
    command: 'init',
    status: 'incomplete',
    destination,
    planHash: plan.planHash,
    runId,
    staging,
    logs,
    operations: plan.operations.map(({ id }) => ({ id, status: 'not run' })),
    checks: {},
    versions: {},
    files: { created: [], edited: [], removed: [], preserved: [] },
    previewMounted: false,
    browserChecks: 'not run',
    agents: agentResult(plan.agents, 'not run'),
    manualSteps: plan.manualSteps,
    outcomes: undefined as unknown as Outcomes,
  };
  writeFileSync(join(logs, 'plan.json'), `${JSON.stringify(plan, null, 2)}\n`);

  const stop = (index: number, code: 1 | 3, message: string): number => {
    result.status = code === 1 ? 'failed' : 'incomplete';
    result.error = `${plan.operations[index]?.id ?? 'publish'}: ${message}`;
    result.outcomes = outcomes(result.status, result.checks, result.agents, result.manualSteps);
    if (index < result.operations.length) (result.operations[index] as Result['operations'][number]).status = 'failed';
    writeFileSync(join(logs, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
    if (json) io.out(`${JSON.stringify(result, null, 2)}\n`);
    io.err(`ultima init: stopped at ${result.error}\n${destination} was not created. Staging and logs are kept at ${staging}\n`);
    return code;
  };

  for (const [index, operation] of plan.operations.entries()) {
    const row = result.operations[index] as Result['operations'][number];
    progress(`${operation.kind === 'run' || operation.kind === 'check' ? `${operation.id}: ${commandLine(operation.command)}` : operation.id}\n`);
    if (operation.kind === 'run' || operation.kind === 'check') {
      const log = join(logs, `${String(index + 1).padStart(2, '0')}-${operation.id.replace(/[^a-z0-9]+/gi, '-')}.log`);
      row.log = log;
      appendFileSync(log, `$ ${commandLine(operation.command)}\n`);
      const code = await deps.exec(operation.command.command, operation.command.args, operation.command.cwd === 'staging' ? staging : app, log);
      if (operation.kind === 'check') result.checks[operation.check] = code === 0 ? 'passed' : 'failed';
      if (code !== 0) return stop(index, operation.kind === 'check' ? 1 : 3, `exited ${code}; see ${log}`);
    } else if (operation.kind === 'verify-scaffold') {
      const problem = scaffoldProblem(app, name, operation.files);
      if (problem) return stop(index, 1, `${problem}. The scaffold no longer matches recipe ${plan.recipe.id}`);
    } else if (operation.kind === 'write') {
      const path = join(app, operation.path);
      const current = isFile(path) ? sha256(readFileSync(path)) : null;
      if (current !== operation.replaces) return stop(index, 1, `${operation.path} is not the file the plan expected to replace`);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, operation.content);
    } else if (operation.kind === 'move') {
      const from = join(app, operation.from);
      const to = join(app, operation.to);
      if (!isFile(from) || sha256(readFileSync(from)) !== operation.sha256) return stop(index, 1, `${operation.from} is not the file ${plan.recipe.id} expected the setup item to install`);
      if (exists(to)) return stop(index, 1, `${operation.to} already exists`);
      mkdirSync(dirname(to), { recursive: true });
      renameSync(from, to);
      removeEmptyParents(app, dirname(from));
    } else if (operation.kind === 'remove') {
      const path = join(app, operation.path);
      if (!isFile(path) || sha256(readFileSync(path)) !== operation.sha256) return stop(index, 1, `${operation.path} is not the scaffold example the plan expected to remove`);
      rmSync(path);
      removeEmptyParents(app, dirname(path));
    } else if (operation.kind === 'install-agents') {
      return stop(index, 3, 'a new project defers agent setup, so its plan never installs agent files');
    } else {
      const mismatched = Object.entries(operation.versions).flatMap(([name, expected]) => {
        const actual = installedVersion(app, name);
        if (actual) result.versions[name] = actual;
        return actual === expected ? [] : [`${name} resolved to ${actual ?? 'nothing'}, the recipe pins ${expected}`];
      });
      if (mismatched.length > 0) return stop(index, 1, mismatched.join('; '));
    }
    row.status = 'done';
  }

  for (const path of plan.discard) rmSync(join(app, path), { recursive: true, force: true });
  result.files = fileReport(app, plan);
  result.previewMounted = true;
  const claimFailure = claimDestination(destination);
  if (claimFailure) return stop(plan.operations.length, 1, `${destination} appeared during apply (${claimFailure}); it was left untouched`);
  for (const entry of readdirSync(app)) renameSync(join(app, entry), join(destination, entry));
  const kept = join(destination, 'node_modules/.ultima-init', runId);
  result.status = 'completed';
  result.outcomes = outcomes(result.status, result.checks, result.agents, result.manualSteps);
  result.staging = null;
  result.logs = kept;
  result.operations = result.operations.map((row) => (row.log ? { ...row, log: row.log.replace(logs, kept) } : row));
  writeFileSync(join(logs, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  mkdirSync(dirname(kept), { recursive: true });
  renameSync(logs, kept);
  rmSync(staging, { recursive: true, force: true });
  io.out(json ? `${JSON.stringify(result, null, 2)}\n` : printResult(plan, result));
  return 0;
}

function scaffoldProblem(app: string, name: string, expected: Record<string, string>): string | null {
  if (!isDirectory(app)) return `the scaffold wrote no ${name} directory`;
  const actual = listFiles(app);
  const extra = actual.filter((path) => !(path in expected));
  const missing = Object.keys(expected).filter((path) => !actual.includes(path));
  const changed = actual.filter((path) => path in expected && sha256(normalizeScaffold(path, readFileSync(join(app, path)), name)) !== expected[path]);
  const problems = [
    extra.length > 0 && `unexpected ${extra.join(', ')}`,
    missing.length > 0 && `missing ${missing.join(', ')}`,
    changed.length > 0 && `changed ${changed.join(', ')}`,
  ].filter(Boolean);
  return problems.length > 0 ? problems.join('; ') : null;
}

function fileReport(app: string, plan: Plan): Result['files'] {
  const scaffold = Object.keys((plan.operations.find(({ kind }) => kind === 'verify-scaffold') as { files: Record<string, string> }).files);
  const written = new Set(plan.operations.flatMap((operation) => (operation.kind === 'write' ? [operation.path] : [])));
  const removed = plan.operations.flatMap((operation) => (operation.kind === 'remove' ? [operation.path] : []));
  const now = listFiles(app, ['node_modules', 'dist', '.next']);
  return {
    created: now.filter((path) => !scaffold.includes(path)),
    edited: [...written].filter((path) => scaffold.includes(path)),
    removed,
    preserved: scaffold.filter((path) => !written.has(path) && !removed.includes(path)),
  };
}

function listFiles(root: string, skip: string[] = [], prefix = ''): string[] {
  return readdirSync(join(root, prefix), { withFileTypes: true })
    .flatMap((entry) => {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (skip.includes(path)) return [];
      return entry.isDirectory() ? listFiles(root, skip, path) : [path];
    })
    .sort();
}

function removeEmptyParents(root: string, directory: string) {
  while (directory !== root && readdirSync(directory).length === 0) {
    rmSync(directory, { recursive: true });
    directory = dirname(directory);
  }
}

function readJson(path: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function installedVersion(app: string, name: string): string | null {
  const version = readJson(join(app, 'node_modules', name, 'package.json'))?.version;
  return typeof version === 'string' ? version : null;
}

function enclosingWorkspace(directory: string): string | null {
  for (let current = directory; ; current = dirname(current)) {
    if (existsSync(join(current, 'pnpm-workspace.yaml')) || readJson(join(current, 'package.json'))?.workspaces) return current;
    if (dirname(current) === current) return null;
  }
}

/** Creates the destination, failing with its errno code when anything already exists there. */
function claimDestination(destination: string): string | null {
  try {
    mkdirSync(destination);
    return null;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code ?? 'unknown error';
  }
}

function exists(path: string): boolean {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function isFile(path: string): boolean {
  try {
    return lstatSync(path).isFile();
  } catch {
    return false;
  }
}

export function commandLine({ command, args }: Command): string {
  return [command, ...args].map((part) => (/^[\w@./:{}=+-]+$/.test(part) ? part : `'${part.replaceAll("'", "'\\''")}'`)).join(' ');
}

export function printPlan(plan: Plan): string {
  const { target } = plan;
  const lines = [
    'ultima init',
    '',
    `Target    ${target.destination} (created only after every check passes)`,
    `Recipe    ${plan.recipe.id} revision ${plan.recipe.revision}: ${plan.recipe.title}`,
    `Layout    ${target.framework} ${target.layout}`,
    `Manager   ${target.packageManager.name} ${target.packageManager.version}`,
    `Registry  ${plan.request.registry}`,
    `Agents    ${describeAgents(plan.agents)}`,
    `Plan      sha256 ${plan.planHash}`,
    '',
    'Dependencies, exact:',
    ...Object.entries(plan.dependencies.dependencies).map(([name, version]) => `  ${name} ${version}`),
    ...Object.entries(plan.dependencies.devDependencies).map(([name, version]) => `  ${name} ${version} (dev)`),
    '',
    `Steps, in a private staging directory beside ${target.name}:`,
    ...plan.operations.map((operation, index) => {
      const step = `  ${String(index + 1).padStart(2)}. `;
      if (operation.kind === 'run' || operation.kind === 'check') return `${step}${operation.id}: ${commandLine(operation.command)}`;
      if (operation.kind === 'verify-scaffold') return `${step}verify the scaffold's ${Object.keys(operation.files).length} files against the recipe`;
      if (operation.kind === 'verify-versions') return `${step}verify every installed version against the recipe`;
      return `${step}${operation.id}`;
    }),
    `  ${String(plan.operations.length + 1).padStart(2)}. publish to ${target.destination}`,
    '',
    'File changes:',
    ...plan.operations.flatMap((operation) => {
      if (operation.kind === 'write') return [operation.diff.split('\n').slice(1).join('\n')];
      if (operation.kind === 'move') return [`${operation.from}: moved to ${operation.to}, the layout's app directory\n`];
      if (operation.kind === 'remove') return [`${operation.path}: removed, the scaffold example the preview replaces\n`];
      return [];
    }),
    'Steps left to you after setup:',
    ...stepLines(plan.manualSteps),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function printResult(plan: Plan, result: Result): string {
  const pm = plan.target.packageManager.name;
  const list = (paths: string[]) => (paths.length > 0 ? paths.join(', ') : 'none');
  const lines = [
    `Created ${result.destination} from ${plan.recipe.id} revision ${plan.recipe.revision}.`,
    '',
    ...summaryLines('ready: the preview is mounted', result.checks, result.agents, result.manualSteps),
    '',
    `Created    ${list(result.files.created)}`,
    `Edited     ${list(result.files.edited)}`,
    `Removed    ${list(result.files.removed)}`,
    `Preserved  ${list(result.files.preserved)}`,
    '',
    `Versions   ${Object.entries(result.versions).map(([name, version]) => `${name} ${version}`).join(', ')}`,
    `Logs       ${result.logs}`,
    `Recovery   init wrote nothing outside ${result.destination}; delete it to undo this run.`,
    '',
    `The preview is mounted on / from ${plan.preview.file}.`,
    `  cd ${plan.target.name}`,
    `  ${pm} run dev        ${plan.preview.dev}`,
    `  ${pm} run build`,
    `  ${`${pm} run ${plan.preview.production.script}`.padEnd(pm.length + 16)}${plan.preview.production.url}`,
    '',
    'Steps left to you:',
    ...stepLines(result.manualSteps),
    '',
  ];
  return `${lines.join('\n')}\n`;
}
