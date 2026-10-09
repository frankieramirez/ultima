// `init` for an existing application: docs/spec/consumer-setup.md, File and edit contract, existing-project column.
// Detection names one application and layout; the plan holds every edit as content and diff, and every conflict
// stops planning before anything is written. Apply plans again and requires the identical hash, then edits in
// place under a recovery journal (journal.ts), and a rerun continues an unfinished run. Agent setup goes to `install`
// through agents.ts.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

import { createTwoFilesPatch } from 'diff';
import ts from 'typescript';

import { type AgentPlan, type AgentResult, agentResult, agentStep, applyAgents, describeAgents, planAgents } from './agents.ts';
import { type Conflict, type Detection, type Framework, detect, escapes } from './detect.ts';
import { type EditResult, applyEdits, ensureJsonPath, layerResets, objectAt, parseJson, sideEffectImport, viteConfigEdits } from './edits.ts';
import {
  type Command,
  DEFAULT_REGISTRY,
  type InitDeps,
  type InitIO,
  type Operation,
  type Outcomes,
  PLAN_KIND,
  PLAN_VERSION,
  REGISTRY,
  type RegistryItem,
  commandLine,
  outcomes,
  planHash,
  registryPayloads,
  stepLines,
  summaryLines,
  validHarnesses,
} from './init.ts';
import { CLI_VERSION, type Harness } from './install.ts';
import { type Journal, createJournal, initCli, loadJournal, hashes, newRunId, recordOutputs, recoveryDirectory, rememberOriginals, saveJournal, unfinishedJournal, writeInPlace } from './journal.ts';
import { MANAGERS, type Manager, type ManualStep, VITE, VITE_PREVIEW, sha256 } from './recipe.ts';
import { checkStep, compareVersions, resolveInstalledVersion } from './setup.ts';
import { contentHash, readStamp } from './stamp.ts';

declare const __ULTIMA_COMMIT__: string | undefined;

export type ExistingRequest = {
  mode: 'existing';
  root: string;
  framework: Framework | null;
  packageManager: Manager | null;
  registry: string;
  cliTarball: string | null;
  /** `--harness`, replacing `install`'s detection; null detects. */
  harnesses: Harness[] | null;
};

/** A tested line: `floor` inclusive, `below` exclusive, `tested` the version an added dependency is pinned to. */
type Band = { tested: string; floor: string; below: string };

const STYLEX = ['@stylexjs/stylex', '@stylexjs/unplugin', '@stylexjs/babel-plugin', '@stylexjs/postcss-plugin'];
const STYLEX_BAND: Band = { tested: '0.19.0', floor: '0.19.0', below: '0.20.0' };
const REACT_BAND: Band = { tested: '19.3.0', floor: '19.0.0', below: '20.0.0' };

/** The recipe `init` follows in an existing application. Pins equal the new-project recipe's where both name a package. */
export type ExistingRecipe = {
  id: string;
  revision: number;
  framework: Framework;
  title: string;
  setupItem: string;
  items: string[];
  shadcn: { package: string; version: string };
  bands: Record<string, Band>;
  /** Stylesheet entries doctor follows for unlayered resets. */
  resetEntries: (detection: Detection) => string[];
  devUrl: string;
};

const SHARED_BANDS: Record<string, Band> = {
  react: REACT_BAND,
  'react-dom': REACT_BAND,
  typescript: { tested: '6.0.3', floor: '5.0.0', below: '7.0.0' },
  '@base-ui/react': { tested: '1.8.0', floor: '1.8.0', below: '2.0.0' },
  ...Object.fromEntries(STYLEX.map((name) => [name, STYLEX_BAND])),
};

export const EXISTING_RECIPES: Record<Framework, ExistingRecipe> = {
  vite: {
    id: 'vite-react-ts-existing',
    revision: 1,
    framework: 'vite',
    title: 'Existing Vite React TypeScript application, src layout',
    setupItem: 'setup-vite',
    items: ['button', 'card', 'dialog'],
    shadcn: VITE.shadcn,
    bands: { ...SHARED_BANDS, vite: { tested: '8.3.4', floor: '8.0.0', below: '9.0.0' }, unplugin: { tested: '2.3.11', floor: '2.3.0', below: '3.0.0' } },
    resetEntries: () => ['index.html', 'src/main.*'],
    devUrl: 'http://localhost:5173/',
  },
  next: {
    id: 'next-app-existing',
    revision: 1,
    framework: 'next',
    title: 'Existing Next App Router TypeScript application',
    setupItem: 'setup-next',
    items: ['button', 'card', 'dialog'],
    shadcn: VITE.shadcn,
    bands: { ...SHARED_BANDS, next: { tested: '16.4.0', floor: '16.0.0', below: '17.0.0' } },
    resetEntries: (detection) => [detection.entry],
    devUrl: 'http://localhost:3000/ultima-preview',
  },
};

/** The line every preview file `init` writes carries, so a rerun knows the file is its own, edited or not. */
export const PREVIEW_MARK = 'written by `ultima-design init`';

function previewBody(name: string, lead: string, intro: string): string {
  const replaced = VITE_PREVIEW.replace('export default function App()', `export default function ${name}()`)
    .replace("/** Ultima's starter screen, written by `ultima-design init`. It is yours: edit it or replace it. */", `/** ${intro} */`)
    .replace('Button, Card and Dialog are installed under src/components/ui. Edit src/App.tsx to start building.', lead);
  if (!replaced.includes(PREVIEW_MARK) || !replaced.includes(lead) || replaced.includes('function App()')) throw new Error('the Vite preview no longer has the shape the existing-project preview adapts');
  return replaced;
}

const VITE_PREVIEW_FILE = 'src/ultima-preview.tsx';
const viteExistingPreview = () =>
  previewBody(
    'UltimaPreview',
    'Button, Card and Dialog are installed. This screen lives in src/ultima-preview.tsx; delete it when you no longer need it.',
    "Ultima's preview screen, written by `ultima-design init`. Mount it from your application or router. It is yours: edit it or delete it.",
  );
const nextPreview = (layout: string) =>
  `'use client';\n\n${previewBody(
    'UltimaPreview',
    `Button, Card and Dialog are installed. This route lives in ${layout}/ultima-preview; delete the folder when you no longer need it.`,
    "Ultima's preview, written by `ultima-design init`, behind the client boundary its route page renders. It is yours: edit it or delete it.",
  )}`;
const NEXT_PAGE = `import type { Metadata } from 'next';

import UltimaPreview from './preview';

export const metadata: Metadata = { title: 'Ultima preview' };

/** Ultima's preview route, written by \`ultima-design init\`. A server page; the interactive preview is a client component. */
export default function Page() {
  return <UltimaPreview />;
}
`;

const ROOT_DOCUMENTS = ['README.md', 'AGENTS.md', 'CLAUDE.md', 'DESIGN.md', 'ultima-theme.css', 'ultima-theme.json', '.cursorrules', '.cursor/rules', '.github/copilot-instructions.md', '.claude', '.codex', '.agents'];

export type ExistingPlan = {
  kind: typeof PLAN_KIND;
  schemaVersion: typeof PLAN_VERSION;
  mode: 'existing';
  cli: { name: 'ultima-design'; version: string; commit: string | null };
  recipe: { id: string; revision: number; title: string; sha256: string };
  request: ExistingRequest;
  target: {
    root: string;
    framework: Framework;
    layout: Detection['layout'];
    sourceRoot: string;
    entry: string;
    packageManager: { name: Manager; version: string; source: Detection['manager']['source']; lockfile: string | null };
  };
  /** The sha256 of every file planning read, null when absent, and the resolved version of every tested package. */
  inputs: { node: string; files: Record<string, string | null>; versions: Record<string, string | null>; cliTarball: { path: string; sha256: string } | null };
  payloads: { item: string; url: string; sha256: string }[];
  dependencies: { added: { dependencies: Record<string, string>; devDependencies: Record<string, string> }; present: Record<string, string> };
  items: { add: string[]; present: string[]; creates: string[] };
  operations: Operation[];
  preserved: string[];
  theme: { css: boolean; json: boolean; design: boolean; importedFrom: string | null };
  preview: { path: string; url: string; mounted: boolean; mountStep: string | null };
  agents: AgentPlan;
  manualSteps: ManualStep[];
  /** The unfinished run this plan continues: dependencies it declared that are not installed yet, items it left partly installed. */
  resume: { runId: string; install: Record<string, string>; items: string[] } | null;
  planHash: string;
};

type Outcome = { code: 1 | 2 | 3; message: string; conflicts?: Conflict[] };
const fail = (code: 1 | 2 | 3, message: string): Outcome => ({ code, message });

export function isExistingProject(directory: string): boolean {
  try {
    return statSync(directory).isDirectory() && existsSync(join(directory, 'package.json'));
  } catch {
    return false;
  }
}

export async function initExisting(request: ExistingRequest, mode: { plan: boolean; json: boolean }, io: InitIO, deps: InitDeps): Promise<number> {
  const planned = await planExisting(request, deps);
  if ('code' in planned) return report(io, planned, mode.json);
  if (mode.plan) {
    io.out(mode.json ? `${JSON.stringify(planned, null, 2)}\n` : printExistingPlan(planned));
    return 0;
  }
  io.out(printExistingPlan(planned));
  if (!(await io.ask(`Apply this plan to ${planned.target.root}?`))) {
    io.out('Cancelled. Nothing was written.\n');
    return 3;
  }
  return applyExisting(planned, false, io, deps);
}

function report(io: InitIO, outcome: Outcome, json: boolean): number {
  if (outcome.conflicts && outcome.conflicts.length > 0) {
    if (json) io.out(`${JSON.stringify({ kind: PLAN_KIND, schemaVersion: PLAN_VERSION, mode: 'existing', status: 'blocked', conflicts: outcome.conflicts }, null, 2)}\n`);
    const lines = outcome.conflicts.map(({ file, message, repair }) => `  - ${file}: ${message}\n    Repair: ${repair}`);
    io.err(`ultima init: ${outcome.message}\n${lines.join('\n')}\nNothing was written. Repair each one, then plan again.\n`);
  } else {
    io.err(`ultima init: ${outcome.message}\n`);
  }
  return outcome.code;
}

/** Re-plans a reviewed plan file's request and applies it only when the fresh plan is identical. */
export async function applyExistingFile(path: string, plan: ExistingPlan, json: boolean, io: InitIO, deps: InitDeps): Promise<number> {
  const request = plan.request as Partial<ExistingRequest> | undefined;
  const valid =
    request?.mode === 'existing' &&
    typeof request.root === 'string' &&
    request.root === resolve(request.root) &&
    (request.framework === null || request.framework === 'vite' || request.framework === 'next') &&
    (request.packageManager === null || (MANAGERS as unknown[]).includes(request.packageManager)) &&
    typeof request.registry === 'string' &&
    (request.cliTarball === null || typeof request.cliTarball === 'string') &&
    validHarnesses(request.harnesses);
  if (!valid) return report(io, fail(1, `${path} holds an invalid request; nothing was written. Plan again`), json);
  if (!isExistingProject(plan.request.root)) return report(io, fail(1, `${plan.request.root} is no longer an application directory; nothing was written. Plan again`), json);
  const fresh = await planExisting(plan.request, deps);
  if ('code' in fresh) return report(io, { ...fresh, message: `${fresh.message} (${path} cannot apply)` }, json);
  if (fresh.planHash !== plan.planHash) {
    const changed = (['cli', 'recipe', 'target', 'inputs', 'payloads', 'dependencies', 'items', 'operations', 'preview', 'agents'] as const).filter(
      (key) => JSON.stringify(fresh[key]) !== JSON.stringify(plan[key]),
    );
    return report(io, fail(1, `${path} is stale: ${changed.join(', ') || 'its inputs'} changed since it was planned; nothing was written. Plan again`), json);
  }
  return applyExisting(fresh, json, io, deps);
}

/** Everything `--plan` shows and `--apply` rechecks for an existing application. Reads only. */
export async function planExisting(request: ExistingRequest, deps: InitDeps): Promise<ExistingPlan | Outcome> {
  if (!REGISTRY.test(request.registry)) return fail(2, `--registry takes a URL ending in /r/{name}.json, got ${request.registry}`);
  let cliTarball: ExistingPlan['inputs']['cliTarball'] = null;
  if (request.cliTarball !== null) {
    if (!request.cliTarball.endsWith('.tgz') || !existsSync(request.cliTarball)) return fail(2, `--cli-tarball takes a packed ultima-design .tgz, got ${request.cliTarball}`);
    cliTarball = { path: request.cliTarball, sha256: sha256(readFileSync(request.cliTarball)) };
  }

  const { detection, conflicts } = detect(request.root, { framework: request.framework, packageManager: request.packageManager });
  const blocked = (): Outcome => ({ code: 1, message: `${request.root} needs manual repair before init can set it up`, conflicts });
  if (!detection) return blocked();
  const recipe = EXISTING_RECIPES[detection.framework];
  const { root, sourceRoot } = detection;
  const conflict = (file: string, message: string, repair: string) => conflicts.push({ file, message, repair });

  const journal = unfinishedJournal(root);
  const files: Record<string, string | null> = {};
  const read = (path: string): string | null => {
    const absolute = join(root, path);
    const text = existsSync(absolute) && statSync(absolute).isFile() ? readFileSync(absolute, 'utf8') : null;
    files[path] = text === null ? null : sha256(text);
    return text;
  };
  const has = (path: string) => existsSync(join(root, path));
  const pm = detection.manager.name;

  const managerVersion = deps.managerVersion(pm, root);
  if (managerVersion === null) return fail(3, `${pm} did not report a version; install it, then plan again`);

  // Versions: every declared tested package must resolve inside its band, and the StyleX packages to one version.
  const packageText = read('package.json') as string;
  const pkg = JSON.parse(packageText) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; scripts?: Record<string, string> };
  const declared = { ...pkg.dependencies, ...pkg.devDependencies };
  const versions: Record<string, string | null> = {};
  const unresolved: string[] = [];
  const pending: Record<string, string> = {};
  const installs = journal?.operations.filter(({ id }) => id === 'install' || id.startsWith('add ')) ?? [];
  const interruptedInstall = installs.length > 0 && installs.at(-1)?.status !== 'done';
  for (const [name, band] of Object.entries(recipe.bands)) {
    if (!(name in declared)) continue;
    const version = resolveInstalledVersion(root, name) ?? null;
    versions[name] = version;
    if (version === null) {
      if (journal?.dependencies[name] === declared[name]) continue;
      const found = journal?.versions[name];
      if (found && interruptedInstall) pending[name] = found;
      else unresolved.push(name);
      continue;
    }
    if (compareVersions(version, band.floor) < 0) {
      conflict('package.json', `${name} resolves to ${version}, below the ${band.floor} this recipe needs.`, `Upgrade it yourself, for example \`${addCommand(pm, [`${name}@${band.tested}`])}\`, check your application, then plan again.`);
    } else if (compareVersions(version, band.below) >= 0) {
      conflict('package.json', `${name} resolves to ${version}, newer than this CLI has tested (${band.tested}), so automatic setup is blocked.`, `Use a newer ultima-design if one supports it, or follow the manual setup at https://ultima.systems/install.`);
    }
  }
  for (const [name, specifier] of Object.entries(journal?.dependencies ?? {})) {
    if (declared[name] === specifier && resolveInstalledVersion(root, name) == null) pending[name] = specifier;
  }
  const stylex = [...new Set(STYLEX.flatMap((name) => (versions[name] ? [versions[name] as string] : [])))];
  if (stylex.length > 1) conflict('package.json', `The StyleX packages resolve to different versions (${stylex.join(', ')}); the runtime and compiler must match.`, `Install one version of every @stylexjs package, then plan again.`);
  if (unresolved.length > 0 && conflicts.length === 0) return fail(3, `${unresolved.join(', ')} ${unresolved.length === 1 ? 'is' : 'are'} declared but not installed, so their versions are unknown. Run \`${pm} install\`, then plan again`);

  const fetched = await registryPayloads(request.registry, [recipe.setupItem, ...recipe.items], deps.fetch);
  if ('code' in fetched) return fetched as Outcome;
  const payload = (item: string) => fetched.items.find((candidate) => candidate.item === item) as RegistryItem;
  const setup = payload(recipe.setupItem);

  const early: Operation[] = [];
  const late: Operation[] = [];
  const writeOp = (path: string, before: string | null, after: string): Operation => ({
    id: `${before === null ? 'create' : 'edit'} ${path}`,
    kind: 'write',
    path,
    content: after,
    replaces: before === null ? null : sha256(before),
    diff: createTwoFilesPatch(before === null ? '/dev/null' : path, path, before ?? '', after, '', ''),
  });
  const editOp = (path: string, before: string, result: EditResult, into: Operation[], repair: string) => {
    if ('conflict' in result) return conflict(path, `${result.conflict}.`, repair);
    if (result.edits.length > 0) into.push(writeOp(path, before, applyEdits(before, result.edits)));
  };
  const preserved = new Set<string>();

  // The `@/*` alias, through tsconfig inheritance. Only configs inside the application are edited.
  const sourceDirectory = join(root, sourceRoot);
  const aliasEdits = new Map<string, string>();
  for (const tsconfig of detection.tsconfigs) {
    const chain = tsconfigChain(join(root, tsconfig));
    if ('error' in chain) {
      conflict(tsconfig, chain.error, 'Repair the tsconfig chain, then plan again.');
      continue;
    }
    for (const link of chain) if (isInside(root, link.path)) read(relative(root, link.path));
    const owner = chain.find((link) => link.paths !== undefined);
    const baseLink = chain.find((link) => link.baseUrl !== undefined);
    const base = baseLink ? resolve(dirname(baseLink.path), baseLink.baseUrl as string) : dirname(owner?.path ?? join(root, tsconfig));
    const offset = relative(base, sourceDirectory).split(sep).join('/');
    const wanted = offset === '' ? './*' : offset.startsWith('..') ? `${offset}/*` : `./${offset}/*`;
    const existing = owner?.paths?.['@/*'];
    if (existing) {
      const target = existing[0] ?? '';
      const directory = resolve(base, target.replace(/\*$/, ''));
      if (directory !== sourceDirectory && directory !== `${sourceDirectory}${sep}`) {
        conflict(relative(root, owner.path), `"@/*" maps to ${target}, but the ${detection.layout} layout needs ${wanted}.`, 'Point "@/*" at the source root, or follow the manual setup for a custom source root, then plan again.');
      }
      continue;
    }
    const file = owner ? owner.path : join(root, tsconfig);
    const name = relative(root, file);
    if (aliasEdits.has(name)) continue;
    if (!isInside(root, file) || escapes(root, name)) {
      conflict(tsconfig, `${tsconfig} inherits compilerOptions.paths from ${file}, outside the application, which init never edits.`, `Add "@/*": ["${wanted}"] to the paths ${tsconfig} uses, then plan again.`);
      continue;
    }
    const before = read(name) as string;
    const edit = ensureJsonPath(before, name, owner ? ['compilerOptions', 'paths', '@/*'] : ['compilerOptions', 'paths'], owner ? `["${wanted}"]` : `{ "@/*": ["${wanted}"] }`);
    if (!edit) conflict(name, `${name} has a compilerOptions or paths value init does not recognize.`, `Add "@/*": ["${wanted}"] under compilerOptions.paths, then plan again.`);
    else aliasEdits.set(name, applyEdits(before, [edit]));
  }

  // components.json: created from the setup item, or kept when compatible, gaining only the @ultima registry.
  const componentsPayload = setup.files.find(({ target }) => target === 'components.json');
  const componentsText = read('components.json');
  let aliases = { ui: '@/components/ui', lib: '@/lib' };
  let componentsWrite: Operation | null = null;
  if (componentsText === null) {
    if (!componentsPayload) return fail(3, `${recipe.setupItem} serves no components.json`);
    const json = JSON.parse(componentsPayload.content);
    if (detection.layout === 'src/app' && json.tailwind?.css === 'app/globals.css') json.tailwind.css = 'src/app/globals.css';
    if (request.registry !== DEFAULT_REGISTRY) json.registries = { ...json.registries, '@ultima': request.registry };
    const content = request.registry === DEFAULT_REGISTRY && detection.layout !== 'src/app' ? componentsPayload.content : `${JSON.stringify(json, null, 2)}\n`;
    componentsWrite = writeOp('components.json', null, content);
  } else {
    const parsed = parseJson('components.json', componentsText);
    const value = (parsed?.value ?? {}) as { style?: unknown; rsc?: unknown; tsx?: unknown; aliases?: Record<string, unknown>; registries?: Record<string, unknown> };
    const repair = 'Make components.json match the setup item, or follow the manual setup, then plan again.';
    if (!parsed) conflict('components.json', 'components.json does not parse.', 'Repair it, then plan again.');
    else {
      if (value.style !== 'base-ultima') conflict('components.json', `style is ${JSON.stringify(value.style)}, and Ultima items install with "base-ultima".`, repair);
      if (value.rsc !== (detection.framework === 'next')) conflict('components.json', `rsc is ${JSON.stringify(value.rsc)}, and ${detection.framework === 'next' ? 'Next App Router needs true' : 'Vite needs false'}.`, repair);
      if (value.tsx !== true) conflict('components.json', 'tsx is not true, and Ultima installs TypeScript source.', repair);
      for (const key of ['ui', 'lib'] as const) {
        const alias = value.aliases?.[key];
        if (typeof alias !== 'string' || !alias.startsWith('@/')) conflict('components.json', `aliases.${key} is ${JSON.stringify(alias)}; init resolves only "@/" aliases.`, `Set aliases.${key} under "@/", or follow the manual setup, then plan again.`);
        else aliases = { ...aliases, [key]: alias };
      }
      const registry = value.registries?.['@ultima'];
      const url = typeof registry === 'object' && registry !== null ? (registry as { url?: unknown }).url : registry;
      if (url === undefined) {
        const edit = ensureJsonPath(componentsText, 'components.json', ['registries', '@ultima'], JSON.stringify(request.registry));
        if (edit) componentsWrite = writeOp('components.json', componentsText, applyEdits(componentsText, [edit]));
        else conflict('components.json', 'registries is not an object.', repair);
      } else if (url !== request.registry) {
        conflict('components.json', `registries["@ultima"] is ${JSON.stringify(url)}, not ${request.registry}.`, 'Point it at the registry this plan installs from, or plan with --registry set to it.');
      } else {
        preserved.add('components.json');
      }
    }
  }

  // The rest of the setup item: created when absent, kept when equivalent; anything else is the consumer's to reconcile.
  const setupWrites: Operation[] = [];
  const otherConfigs: Record<string, { files: string[]; plugin: string }> = {
    'babel.config.js': { files: ['babel.config.js', 'babel.config.cjs', 'babel.config.mjs', 'babel.config.json', '.babelrc', '.babelrc.js', '.babelrc.json'], plugin: '@stylexjs/babel-plugin' },
    'postcss.config.js': { files: ['postcss.config.js', 'postcss.config.cjs', 'postcss.config.mjs', 'postcss.config.ts', '.postcssrc', '.postcssrc.json', '.postcssrc.js'], plugin: '@stylexjs/postcss-plugin' },
  };
  for (const file of setup.files) {
    if (file.target === 'components.json') continue;
    const path = detection.layout === 'src/app' && file.target.startsWith('app/') ? `src/${file.target}` : file.target;
    const family = otherConfigs[path];
    const present = family ? family.files.filter(has) : has(path) ? [path] : [];
    if (present.length === 0) {
      read(path);
      setupWrites.push(writeOp(path, null, file.content));
      continue;
    }
    const found = present[0] as string;
    const text = read(found) ?? '';
    const reference = family?.plugin ?? (path.endsWith('ultima.css') ? '@stylex;' : null);
    if (present.length === 1 && (text === file.content || (reference !== null && text.includes(reference)))) {
      preserved.add(found);
      continue;
    }
    conflict(
      present.join(', '),
      present.length > 1 ? `${present.join(' and ')} both exist.` : reference ? `${found} exists and does not use ${reference}.` : `${found} exists and differs from ${recipe.setupItem}'s.`,
      reference ? `Add ${reference} to ${found} as ${recipe.setupItem}'s ${path} does, or delete it to take that file, then plan again.` : `Compare it with ${recipe.setupItem}'s ${path}; keep your edits by hand or delete it to take the current one, then plan again.`,
    );
  }

  // Registry items: only the missing ones, and only when nothing they would install collides with consumer source.
  const installPath = (file: RegistryItem['files'][number]): string | null => {
    const alias = file.type === 'registry:ui' ? aliases.ui : file.type === 'registry:lib' ? aliases.lib : null;
    if (alias) return join(sourceRoot, alias.slice(2), basename(file.path)).split(sep).join('/');
    return file.target || null;
  };
  const add: string[] = [];
  const present: string[] = [];
  const readded: string[] = [];
  for (const item of recipe.items) {
    const paths = payload(item).files.map(installPath).filter((path): path is string => path !== null);
    const existing = paths.filter(has);
    const partlyAddedByUnfinishedRun = journal !== null && existing.length < paths.length && existing.every((path) => journal.creates.includes(path));
    if (existing.length === 0) add.push(item);
    else if (partlyAddedByUnfinishedRun && (await Promise.all(existing.map(async (path) => sameSource(read(path) ?? '', servedAt(item, path), aliases)))).every(Boolean)) {
      add.push(item);
      readded.push(item);
    } else if (existing.length === paths.length) {
      present.push(item);
      for (const path of paths) preserved.add(path);
    } else conflict(existing.join(', '), `@ultima/${item} is partly installed: ${paths.filter((path) => !has(path)).join(', ')} ${paths.length - existing.length === 1 ? 'is' : 'are'} missing.`, `Run \`ultima status\`, then reinstall or remove @ultima/${item} by hand, then plan again.`);
  }
  function servedAt(item: string, path: string): string {
    return payload(item).files.find((file) => installPath(file) === path)?.content ?? '';
  }
  const closure = new Set<string>();
  const queue = [...add];
  while (queue.length > 0) {
    const item = queue.shift() as string;
    if (closure.has(item)) continue;
    closure.add(item);
    queue.push(...payload(item).registryDependencies);
  }
  const creates: string[] = [];
  for (const item of [...closure].sort()) {
    for (const file of payload(item).files) {
      const path = installPath(file);
      if (path === null) continue;
      if (path.split('/').includes('..') || isAbsolute(path)) {
        conflict(path, `@ultima/${item} would install ${path}, outside the application.`, 'Check --registry: init installs registry files only inside the application. Then plan again.');
        continue;
      }
      if (escapes(root, path)) {
        conflict(path, `${path} resolves outside the application through a symlink.`, 'Remove the symlink, then plan again.');
        continue;
      }
      const text = read(path);
      if (text === null) {
        if (!creates.includes(path)) creates.push(path);
        continue;
      }
      if (!(await sameSource(text, file.content, aliases))) {
        conflict(path, `${path} exists and is not @ultima/${item}'s current source, so installing ${add.map((name) => `@ultima/${name}`).join(', ')} would ask to overwrite it.`, `Review it with \`ultima status\` and \`ultima diff ${item}\`. init never overwrites installed source.`);
      }
    }
  }

  // Dependencies: add only the missing ones, at the tested pin; StyleX packages join the version already installed.
  const added = { dependencies: {} as Record<string, string>, devDependencies: {} as Record<string, string> };
  const needed: [string, 'dependencies' | 'devDependencies'][] = [];
  for (const item of [setup, ...fetched.items]) {
    for (const name of item.dependencies) needed.push([packageName(name), 'dependencies']);
    for (const name of item.devDependencies) needed.push([packageName(name), 'devDependencies']);
  }
  const unpinned: string[] = [];
  for (const [name, group] of needed) {
    if (name in declared || name in added.dependencies || name in added.devDependencies) continue;
    const band = recipe.bands[name];
    if (!band) {
      unpinned.push(name);
      continue;
    }
    added[group][name] = STYLEX.includes(name) && stylex.length === 1 ? (stylex[0] as string) : band.tested;
  }
  if (unpinned.length > 0) return fail(3, `this CLI has no tested version of ${unpinned.join(', ')}, which the registry now requires. Upgrade ultima-design, then plan again`);
  if (!('ultima-design' in declared)) added.devDependencies['ultima-design'] = cliTarball ? `file:${cliTarball.path}` : CLI_VERSION;
  const presentVersions = Object.fromEntries(Object.entries(versions).filter((entry): entry is [string, string] => entry[1] !== null));

  let packageAfter = packageText;
  for (const group of ['dependencies', 'devDependencies'] as const) {
    for (const [name, version] of Object.entries(added[group])) {
      const edit = ensureJsonPath(packageAfter, 'package.json', [group, name], JSON.stringify(version), true);
      if (!edit) conflict('package.json', `${group} is not an object.`, 'Repair package.json, then plan again.');
      else packageAfter = applyEdits(packageAfter, [edit]);
    }
  }
  if (packageAfter !== packageText) early.push(writeOp('package.json', packageText, packageAfter));
  for (const [name, after] of aliasEdits) early.push(writeOp(name, readFileSync(join(root, name), 'utf8'), after));
  if (componentsWrite) early.push(componentsWrite);
  early.push(...setupWrites);

  // Wiring: the plugin or the marker import, then resets.
  if (detection.framework === 'vite') {
    const text = read('vite.config.ts');
    if (text !== null) editOp('vite.config.ts', text, viteConfigEdits('vite.config.ts', text), late, "Put `ultimaStylex()` first in plugins by hand, as https://ultima.systems/install describes, then plan again.");
  } else {
    const text = read(detection.entry);
    if (text !== null) editOp(detection.entry, text, sideEffectImport(detection.entry, text, './ultima.css', (specifier) => /ultima-theme\.css$/.test(specifier)), late, `Import './ultima.css' from ${detection.entry} by hand, then plan again.`);
  }
  const resetFiles = new Set<string>();
  const { diagnostics } = checkStep(
    { prose: '', assertion: { kind: 'layered-resets', entries: recipe.resetEntries(detection) } },
    { root, setupCommand: '', dependencies: [], devDependencies: [], aliases: [], supportedRanges: {}, link: '' },
  );
  for (const diagnostic of diagnostics) {
    const file = diagnostic.file;
    if (diagnostic.severity === 'blocking' && diagnostic.message.includes('is an unlayered reset') && file.endsWith('.css') && !file.split('/').includes('node_modules')) resetFiles.add(file);
    else conflict(file, diagnostic.message, `${diagnostic.repair} init moves only recognized reset rules in the application's own stylesheets.`);
  }
  for (const file of [...resetFiles].sort()) {
    if (escapes(root, file)) {
      conflict(file, `${file} resolves outside the application through a symlink.`, 'Layer its resets by hand, then plan again.');
      continue;
    }
    const text = read(file) as string;
    editOp(file, text, layerResets(file, text), late, 'Wrap the reset rules in `@layer reset { … }` by hand, then plan again.');
  }

  // The isolated preview: Vite gets a module the consumer mounts; Next gets an unused route.
  let previewPath: string;
  let previewUrl = recipe.devUrl;
  let mounted: boolean;
  if (detection.framework === 'vite') {
    previewPath = VITE_PREVIEW_FILE;
    const text = read(previewPath);
    // An application init created holds its starter screen in src/App.tsx, mounted on / already.
    const starter = text === null && (read('src/App.tsx') ?? '').includes(PREVIEW_MARK);
    if (starter) previewPath = 'src/App.tsx';
    if (starter) preserved.add(previewPath);
    else if (text === null) late.push(writeOp(previewPath, null, viteExistingPreview()));
    else if (text.includes(PREVIEW_MARK)) preserved.add(previewPath);
    else conflict(previewPath, `${previewPath} exists and is not the preview init writes.`, 'Rename or remove it, then plan again. init never replaces your files.');
    mounted = starter || previewImported(root, previewPath);
  } else {
    previewPath = `${detection.layout}/ultima-preview`;
    const page = read(`${previewPath}/page.tsx`);
    const others = routeCollisions(root, detection.layout, previewPath);
    // An application init created renders its starter screen on / already.
    const starter = page === null && !has(previewPath) && (read(`${detection.layout}/page.tsx`) ?? '').includes(PREVIEW_MARK);
    if (starter) {
      previewPath = `${detection.layout}/page.tsx`;
      previewUrl = 'http://localhost:3000/';
      preserved.add(previewPath);
    } else {
      if (others.length > 0) conflict(others.join(', '), `The /ultima-preview route already exists at ${others.join(', ')}.`, 'Rename or remove that route, then plan again. init never replaces your pages.');
      if (page !== null && page.includes(PREVIEW_MARK)) {
        preserved.add(previewPath);
      } else if (has(previewPath)) {
        conflict(previewPath, `${previewPath} exists and is not the preview route init writes.`, 'Rename or remove it, then plan again. init never replaces your pages.');
      } else {
        late.push(writeOp(`${previewPath}/page.tsx`, null, NEXT_PAGE), writeOp(`${previewPath}/preview.tsx`, null, nextPreview(detection.layout)));
      }
    }
    mounted = true;
  }
  for (const operation of [...early, ...late]) {
    if (operation.kind === 'write' && escapes(root, operation.path)) conflict(operation.path, `${operation.path} resolves outside the application through a symlink.`, 'Remove the symlink, then plan again.');
  }

  // Agent setup: install's detection or --harness, delegated only when the Git root is this application.
  const { agents, conflicts: agentConflicts } = planAgents(root, { exists: true, harnesses: request.harnesses, pm, read });
  conflicts.push(...agentConflicts);
  const agentWrites = agents.files.filter(({ action }) => action === 'create' || action === 'edit').map(({ file }) => file);
  for (const { file, action } of agents.files) if (action === 'unchanged' || action === 'preserve') preserved.add(file);

  if (conflicts.length > 0) return blocked();

  // Theme artifacts and root documents are reported and preserved, never written.
  const themeImporter = (read(detection.entry) ?? '').includes('ultima-theme.css') ? detection.entry : null;
  const theme = { css: has('ultima-theme.css'), json: has('ultima-theme.json'), design: has('DESIGN.md'), importedFrom: themeImporter };
  for (const document of ROOT_DOCUMENTS) if (has(document) && !agentWrites.some((file) => file.startsWith(`${document}/`))) preserved.add(document);
  for (const file of detection.framework === 'vite' ? ['index.html', 'src/main.tsx', 'src/App.tsx'] : [detection.entry, `${detection.layout}/page.tsx`]) {
    if (has(file) && ![...early, ...late].some((operation) => operation.kind === 'write' && operation.path === file)) preserved.add(file);
  }

  const run = (args: string[]): Command => (pm === 'npm' ? { command: 'npm', args: ['exec', '--no', '--', ...args], cwd: 'app' } : { command: 'pnpm', args: ['exec', ...args], cwd: 'app' });
  const dlx = (rest: string[]): Command => (pm === 'npm' ? { command: 'npx', args: ['--yes', `${recipe.shadcn.package}@${recipe.shadcn.version}`, ...rest], cwd: 'app' } : { command: 'pnpm', args: ['dlx', `${recipe.shadcn.package}@${recipe.shadcn.version}`, ...rest], cwd: 'app' });
  const addedAll = { ...added.dependencies, ...added.devDependencies, ...pending };
  const hasAdded = Object.keys(addedAll).length > 0;
  const versionsToVerify = { ...Object.fromEntries(Object.entries(journal?.dependencies ?? {}).filter(([name, specifier]) => declared[name] === specifier)), ...addedAll };
  const references = Array.isArray((parseJson('tsconfig.json', read('tsconfig.json') ?? '{}')?.value as { references?: unknown } | undefined)?.references);
  const typecheck: Operation = { id: 'typecheck', kind: 'check', check: 'typecheck', command: run(detection.framework === 'vite' && references ? ['tsc', '-b'] : ['tsc', '--noEmit']) };
  const build: Operation | null = pkg.scripts?.build ? { id: 'build', kind: 'check', check: 'build', command: { command: pm, args: ['run', 'build'], cwd: 'app' } } : null;
  const operations: Operation[] = [
    ...early,
    ...(hasAdded ? [{ id: 'install', kind: 'run', command: { command: pm, args: pm === 'npm' ? ['install'] : ['install', '--no-frozen-lockfile'], cwd: 'app' } } satisfies Operation] : []),
    ...(add.length > 0 ? [{ id: `add ${add.join(', ')}`, kind: 'run', command: dlx(['add', ...add.map((item) => `@ultima/${item}`), '--yes']) } satisfies Operation] : []),
    ...late,
    ...(agentWrites.length > 0 ? [{ id: 'install agent files', kind: 'install-agents' } satisfies Operation] : []),
    ...(Object.keys(versionsToVerify).length > 0 ? [{ id: 'verify versions', kind: 'verify-versions', versions: { ...versionsToVerify, ...('ultima-design' in versionsToVerify ? { 'ultima-design': CLI_VERSION } : {}) } } satisfies Operation] : []),
    { id: 'doctor', kind: 'check', check: 'doctor', command: run(['ultima', 'doctor']) },
    { id: 'check', kind: 'check', check: 'check', command: run(['ultima', 'check']) },
    // Next's generated next-env.d.ts names .next/types, which only its build writes, so Next type-checks after it.
    ...(detection.framework === 'next' ? [build, typecheck] : [typecheck, build]).flatMap((operation) => (operation ? [operation] : [])),
  ];

  const relativeImport = (from: string) => {
    const path = relative(dirname(from), join(sourceRoot, 'ultima-preview')).split(sep).join('/');
    return path.startsWith('.') ? path : `./${path}`;
  };
  const host = has('src/App.tsx') ? 'src/App.tsx' : 'src/main.tsx';
  const router = ['react-router', 'react-router-dom', '@tanstack/react-router'].find((name) => name in declared);
  const rerun = `${initCli(pm)} .`;
  const mountStep: ManualStep | null =
    detection.framework === 'vite' && !mounted
      ? {
          title: 'Mount the preview',
          required: true,
          file: host,
          edit: `In ${host}, add \`import UltimaPreview from '${relativeImport(host)}';\` and render \`<UltimaPreview />\`${router ? ` on a route of its own, for example \`<Route path="/ultima-preview" element={<UltimaPreview />} />\` with ${router}` : ' where you want to see it'}.`,
          verify: `\`${pm} run dev\`, open ${recipe.devUrl}${router ? 'ultima-preview' : ''} and see "Ultima is ready"; then run \`${rerun}\` again, which checks setup and build and reports the preview mounted.`,
        }
      : null;
  const themeVerify = 'With the dev server running, check the root, a control and an open popup in dark and light mode, as https://ultima.systems/install#theme-adoption describes.';
  const themeEdit = theme.css
    ? theme.importedFrom
      ? `${theme.importedFrom} imports ultima-theme.css, and init leaves it as it is.`
      : `ultima-theme.css exists but ${detection.entry} does not import it. Import it after your base CSS, then check the cascade.`
    : 'No exported Ultima theme was found, so the components paint with the Neutral base tokens and your own styles keep your brand. To match it, make a theme in https://ultima.systems/theme-studio and install it as https://ultima.systems/install#theme-adoption describes. init never substitutes one for you.';
  const agentManual = agentStep(agents, root);
  const manualSteps: ManualStep[] = [
    ...(mountStep ? [mountStep] : []),
    ...(pkg.scripts?.build ? [] : [{ title: 'Build script', required: true, file: 'package.json', edit: 'Add a `build` script; without one init cannot run the production build.', verify: `Run \`${rerun}\` again; it runs the build and reports it passed.` }]),
    { title: 'Theme', required: false, file: theme.importedFrom ?? detection.entry, edit: themeEdit, verify: themeVerify },
    { title: 'Strict CSP', required: false, file: detection.entry, edit: "Pass your nonce to Base UI's `CSPProvider` at the app root.", verify: 'Load the production build under your Content-Security-Policy; the console reports no blocked style.' },
    ...(agentManual ? [agentManual] : []),
  ];

  const body: Omit<ExistingPlan, 'planHash'> = {
    kind: PLAN_KIND,
    schemaVersion: PLAN_VERSION,
    mode: 'existing',
    cli: { name: 'ultima-design', version: CLI_VERSION, commit: typeof __ULTIMA_COMMIT__ === 'string' ? __ULTIMA_COMMIT__ : null },
    recipe: { id: recipe.id, revision: recipe.revision, title: recipe.title, sha256: sha256(JSON.stringify({ ...recipe, resetEntries: recipe.resetEntries(detection) })) },
    request,
    target: {
      root,
      framework: detection.framework,
      layout: detection.layout,
      sourceRoot,
      entry: detection.entry,
      packageManager: { name: pm, version: managerVersion, source: detection.manager.source, lockfile: detection.manager.lockfile },
    },
    inputs: { node: process.versions.node, files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b))), versions, cliTarball },
    payloads: fetched.hashes,
    dependencies: { added, present: presentVersions },
    items: { add, present, creates: creates.sort() },
    operations,
    preserved: [...preserved].sort(),
    theme,
    preview: { path: previewPath, url: previewUrl, mounted, mountStep: mountStep?.edit ?? null },
    agents,
    manualSteps,
    resume: journal ? { runId: journal.runId, install: pending, items: readded } : null,
  };
  return { ...body, planHash: planHash(body as never) };
}

function packageName(specifier: string): string {
  const at = specifier.indexOf('@', 1);
  return at === -1 ? specifier : specifier.slice(0, at);
}

function addCommand(pm: Manager, packages: string[]): string {
  return pm === 'npm' ? `npm install ${packages.join(' ')}` : `pnpm add ${packages.join(' ')}`;
}

function isInside(root: string, path: string): boolean {
  const inside = relative(root, path);
  return inside !== '' && !inside.startsWith('..') && !inside.startsWith(sep) && !inside.split(sep).includes('node_modules');
}

type ChainLink = { path: string; paths?: Record<string, string[]>; baseUrl?: string };

/** The tsconfig and everything it extends, nearest first, so the first link with `paths` is the one TypeScript uses. */
function tsconfigChain(path: string, seen = new Set<string>()): ChainLink[] | { error: string } {
  if (seen.has(path)) return { error: `${path} extends itself.` };
  seen.add(path);
  const { config, error } = ts.readConfigFile(path, ts.sys.readFile);
  if (error || typeof config !== 'object' || config === null) return { error: `${path} does not parse.` };
  const { extends: parents = [], compilerOptions = {} } = config as { extends?: string | string[]; compilerOptions?: { paths?: Record<string, string[]>; baseUrl?: string } };
  const links: ChainLink[] = [{ path, paths: compilerOptions.paths, baseUrl: compilerOptions.baseUrl }];
  for (const parent of (typeof parents === 'string' ? [parents] : parents).reverse()) {
    const from = dirname(path);
    const candidates = parent.startsWith('.') || parent.startsWith('/')
      ? [resolve(from, parent), resolve(from, `${parent}.json`)]
      : [join(from, 'node_modules', parent), join(from, 'node_modules', `${parent}.json`), join(from, 'node_modules', parent, 'tsconfig.json')];
    const found = candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
    if (!found) return { error: `${path} extends ${parent}, which does not resolve.` };
    const chain = tsconfigChain(found, seen);
    if ('error' in chain) return chain;
    links.push(...chain);
  }
  return links;
}

/** Whether installed source equals the registry's, compared in the stamp's hash scheme so alias rewrites do not count. */
async function sameSource(local: string, served: string, aliases: { ui: string; lib: string }): Promise<boolean> {
  if (local === served) return true;
  const stamp = readStamp(served);
  if (!stamp || (stamp.scheme !== 'c1' && stamp.scheme !== 'b1')) return false;
  try {
    return (await contentHash(local, stamp.scheme, aliases)) === (await contentHash(served, stamp.scheme));
  } catch {
    return false;
  }
}

const SOURCE_FILE = /\.(tsx?|jsx?|mts|cts|mjs|cjs)$/;
const SKIP = new Set(['node_modules', 'dist', 'build', '.next', '.git']);

function sourceFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP.has(entry.name)) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() && SOURCE_FILE.test(entry.name) ? [path] : [];
  });
}

/** Whether any application module other than the preview imports it. */
function previewImported(root: string, preview: string): boolean {
  const target = join(root, preview).replace(/\.tsx$/, '');
  const specifiers = /(?:from\s*|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;
  return sourceFiles(join(root, 'src')).some((file) => {
    if (file === join(root, preview)) return false;
    for (const [, specifier = ''] of readFileSync(file, 'utf8').matchAll(specifiers)) {
      const resolved = specifier.startsWith('@/') ? join(root, 'src', specifier.slice(2)) : specifier.startsWith('.') ? resolve(dirname(file), specifier) : null;
      if (resolved && resolved.replace(/\.tsx$/, '') === target) return true;
    }
    return false;
  });
}

/** Other routes that would answer /ultima-preview: inside route groups, or in the Pages Router. */
function routeCollisions(root: string, layout: string, own: string): string[] {
  const found: string[] = [];
  const walk = (directory: string) => {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isDirectory() || SKIP.has(entry.name)) continue;
      const path = join(directory, entry.name);
      if (entry.name === 'ultima-preview' && relative(root, path) !== own) found.push(relative(root, path));
      if (entry.name.startsWith('(') || entry.name !== 'ultima-preview') walk(path);
    }
  };
  walk(join(root, layout));
  for (const pages of ['pages', 'src/pages']) {
    for (const name of ['ultima-preview.tsx', 'ultima-preview.ts', 'ultima-preview.jsx', 'ultima-preview.js', 'ultima-preview']) {
      if (existsSync(join(root, pages, name))) found.push(`${pages}/${name}`);
    }
  }
  return found.sort();
}

type Result = {
  command: 'init';
  mode: 'existing';
  status: 'completed' | 'failed' | 'incomplete';
  root: string;
  planHash: string;
  runId: string;
  logs: string;
  /** The recovery journal and originals, and the command that undoes this run; null when the run wrote nothing. */
  recovery: { journal: string; rollback: string } | null;
  operations: { id: string; status: 'done' | 'failed' | 'not run'; log?: string }[];
  checks: Partial<Record<'doctor' | 'check' | 'typecheck' | 'build', 'passed' | 'failed'>>;
  versions: Record<string, string>;
  files: { created: string[]; edited: string[]; preserved: string[] };
  previewMounted: boolean;
  browserChecks: 'not run';
  agents: AgentResult;
  manualSteps: ManualStep[];
  outcomes: Outcomes;
  error?: string;
};

/** The `@ultima` items whose served payload no longer hashes as the plan pinned it, or the fetch failure. */
async function payloadsChangedSincePlan(plan: ExistingPlan, deps: InitDeps): Promise<string[] | string> {
  const recipe = EXISTING_RECIPES[plan.target.framework];
  const served = await registryPayloads(plan.request.registry, [recipe.setupItem, ...recipe.items], deps.fetch);
  if ('code' in served) return served.message;
  const items = new Set([...served.hashes, ...plan.payloads].map(({ item }) => item));
  const hash = (list: ExistingPlan['payloads'], item: string) => list.find((entry) => entry.item === item)?.sha256;
  return [...items].filter((item) => hash(served.hashes, item) !== hash(plan.payloads, item)).map((item) => `@ultima/${item}`);
}

const agentFiles = (agents: AgentPlan, action: 'create' | 'edit') => agents.files.flatMap((file) => (file.action === action ? [file.file] : []));

/** Applies a fresh, identical plan in place. A failed step stops the run; nothing after it runs. */
async function applyExisting(plan: ExistingPlan, json: boolean, io: InitIO, deps: InitDeps): Promise<number> {
  const progress = json ? io.err : io.out;
  const { root } = plan.target;
  const pm = plan.target.packageManager.name;
  const lockfile = plan.target.packageManager.lockfile ?? (pm === 'npm' ? 'package-lock.json' : 'pnpm-lock.yaml');
  const touches = (operation: Operation, creates: string[]): string[] => {
    if (operation.kind === 'write') return [operation.path];
    if (operation.kind === 'run') return ['package.json', lockfile, ...(operation.id.startsWith('add ') ? creates : [])];
    if (operation.kind === 'install-agents') return [...agentFiles(plan.agents, 'create'), ...agentFiles(plan.agents, 'edit')];
    return [];
  };
  const inventory = [...new Set(plan.operations.flatMap((operation) => touches(operation, plan.items.creates)))];
  let journal: Journal | null = null;
  if (plan.resume) {
    journal = loadJournal(root, plan.resume.runId);
    if (!journal) return report(io, fail(1, `the run ${plan.resume.runId} this plan resumes has no readable journal; nothing was written. Plan again`), json);
  } else if (inventory.length > 0) {
    journal = createJournal(root, newRunId(), pm, lockfile);
  }
  const runId = journal?.runId ?? newRunId();
  const logs = journal ? recoveryDirectory(root, runId) : join(root, 'node_modules', '.ultima-init', runId);
  mkdirSync(logs, { recursive: true });
  const attempt = journal ? journal.plans.length + 1 : 1;
  const attemptPrefix = attempt > 1 ? `${attempt}.` : '';
  writeFileSync(join(logs, `${attemptPrefix}plan.json`), `${JSON.stringify(plan, null, 2)}\n`);
  if (journal) {
    journal.status = 'running';
    journal.plans.push(plan.planHash);
    journal.payloads = plan.payloads;
    for (const path of plan.items.creates) if (!journal.creates.includes(path)) journal.creates.push(path);
    Object.assign(journal.dependencies, plan.dependencies.added.dependencies, plan.dependencies.added.devDependencies);
    for (const [name, version] of Object.entries(plan.inputs.versions)) if (version !== null) journal.versions[name] ??= version;
    rememberOriginals(journal, inventory);
  }
  const writes = plan.operations.flatMap((operation) => (operation.kind === 'write' ? [operation] : []));
  const undo = `${initCli(pm)} . --rollback ${runId}`;
  const result: Result = {
    command: 'init',
    mode: 'existing',
    status: 'incomplete',
    root,
    planHash: plan.planHash,
    runId,
    logs,
    recovery: journal ? { journal: join(logs, 'journal.json'), rollback: undo } : null,
    operations: plan.operations.map(({ id }) => ({ id, status: 'not run' })),
    checks: {},
    versions: {},
    files: {
      created: [...writes.filter(({ replaces }) => replaces === null).map(({ path }) => path), ...plan.items.creates, ...agentFiles(plan.agents, 'create')].sort(),
      edited: [...writes.filter(({ replaces }) => replaces !== null).map(({ path }) => path), ...agentFiles(plan.agents, 'edit')].sort(),
      preserved: plan.preserved,
    },
    previewMounted: plan.preview.mounted,
    browserChecks: 'not run',
    agents: agentResult(plan.agents, 'not run'),
    manualSteps: plan.manualSteps,
    outcomes: undefined as unknown as Outcomes,
  };
  const finish = (code: 0 | 1 | 3): number => {
    result.outcomes = outcomes(result.status, result.checks, result.agents, result.manualSteps);
    writeFileSync(join(logs, `${attemptPrefix}result.json`), `${JSON.stringify(result, null, 2)}\n`);
    io.out(json ? `${JSON.stringify(result, null, 2)}\n` : printExistingResult(plan, result));
    return code;
  };
  let entry: Journal['operations'][number] | null = null;
  let touched: string[] = [];
  const settle = (status: 'done' | 'failed', extra: { exit?: number; log?: string; error?: string } = {}) => {
    if (!journal || !entry) return;
    entry.after = hashes(root, touched);
    recordOutputs(journal, entry.after);
    Object.assign(entry, { status, ...extra });
    saveJournal(journal);
  };
  const stop = (index: number, code: 1 | 3, message: string, extra: { exit?: number; log?: string } = {}): number => {
    result.status = code === 1 ? 'failed' : 'incomplete';
    result.error = `${plan.operations[index]?.id}: ${message}`;
    (result.operations[index] as Result['operations'][number]).status = 'failed';
    if (plan.operations[index]?.kind === 'install-agents') result.agents = agentResult(plan.agents, 'failed');
    settle('failed', { ...extra, error: message });
    if (journal) {
      journal.status = 'stopped';
      saveJournal(journal);
    }
    io.err(
      journal
        ? `ultima init: stopped at ${result.error}\nEarlier steps stay applied. Run \`${initCli(pm)} .\` to plan the rest of this run, or \`${undo}\` to undo it. The journal, originals and logs are in ${logs}\n`
        : `ultima init: stopped at ${result.error}\nLogs are at ${logs}\n`,
    );
    return finish(code);
  };

  for (const [index, operation] of plan.operations.entries()) {
    const row = result.operations[index] as Result['operations'][number];
    progress(`${operation.kind === 'run' || operation.kind === 'check' ? `${operation.id}: ${commandLine(operation.command)}` : operation.id}\n`);
    if (journal) {
      touched = touches(operation, journal.creates);
      entry = { id: operation.id, status: 'started', at: new Date().toISOString(), before: hashes(root, touched) };
      journal.operations.push(entry);
      saveJournal(journal);
    }
    if (operation.kind === 'run' && operation.id.startsWith('add ')) {
      const changed = await payloadsChangedSincePlan(plan, deps);
      if (typeof changed === 'string') return stop(index, 3, `${changed}; shadcn did not run`);
      if (changed.length > 0) return stop(index, 1, `the registry changed ${changed.join(', ')} since this plan pinned it, so shadcn did not run. Plan again to review the new payloads`);
    }
    if (operation.kind === 'run' || operation.kind === 'check') {
      const log = join(logs, `${attemptPrefix}${String(index + 1).padStart(2, '0')}-${operation.id.replace(/[^a-z0-9]+/gi, '-')}.log`);
      row.log = log;
      writeFileSync(log, `$ ${commandLine(operation.command)}\n`);
      const code = await deps.exec(operation.command.command, operation.command.args, root, log);
      if (operation.kind === 'check') result.checks[operation.check] = code === 0 ? 'passed' : 'failed';
      if (code !== 0) return stop(index, operation.kind === 'check' ? 1 : 3, `exited ${code}; see ${log}`, { exit: code, log });
      settle('done', { exit: code, log });
    } else if (operation.kind === 'write') {
      const path = join(root, operation.path);
      const current = existsSync(path) ? sha256(readFileSync(path)) : null;
      if (current !== operation.replaces) return stop(index, 1, `${operation.path} changed after it was planned`);
      try {
        writeInPlace(path, operation.content);
      } catch (error) {
        return stop(index, 1, `${operation.path} could not be written (${(error as Error).message})`);
      }
      settle('done');
    } else if (operation.kind === 'verify-versions') {
      const mismatched = Object.entries(operation.versions).flatMap(([name, expected]) => {
        const actual = resolveInstalledVersion(root, name) ?? null;
        if (actual) result.versions[name] = actual;
        return actual === expected ? [] : [`${name} resolved to ${actual ?? 'nothing'}, the plan pins ${expected}`];
      });
      if (mismatched.length > 0) return stop(index, 1, mismatched.join('; '));
      settle('done');
    } else if (operation.kind === 'install-agents') {
      const changed = plan.agents.files.find(({ file }) => {
        const path = join(root, file);
        return (existsSync(path) ? sha256(readFileSync(path)) : null) !== plan.inputs.files[file];
      });
      if (changed) return stop(index, 1, `${changed.file} changed after it was planned`);
      const problem = applyAgents(root, plan.agents);
      if (problem) return stop(index, 1, problem);
      settle('done');
    } else {
      return stop(index, 3, `${operation.kind} is not an existing-project operation`);
    }
    row.status = 'done';
  }
  if (journal) {
    journal.status = 'finished';
    saveJournal(journal);
  }
  if (plan.agents.status === 'delegated') result.agents = agentResult(plan.agents, 'installed');
  for (const [name, version] of Object.entries(plan.dependencies.present)) result.versions[name] ??= version;
  const complete = plan.preview.mounted && 'build' in result.checks;
  result.status = complete ? 'completed' : 'incomplete';
  return finish(complete ? 0 : 3);
}

export function printExistingPlan(plan: ExistingPlan): string {
  const { target } = plan;
  const list = (entries: Record<string, string>) => Object.entries(entries).map(([name, version]) => `  ${name} ${version}`);
  const added = [...list(plan.dependencies.added.dependencies), ...list(plan.dependencies.added.devDependencies).map((line) => `${line} (dev)`)];
  const lines = [
    'ultima init',
    '',
    `Application  ${target.root}`,
    `Detected     ${target.framework === 'vite' ? 'Vite React TypeScript' : 'Next App Router TypeScript'}, ${target.layout} layout, entry ${target.entry}`,
    `Recipe       ${plan.recipe.id} revision ${plan.recipe.revision}`,
    `Manager      ${target.packageManager.name} ${target.packageManager.version} (from ${target.packageManager.lockfile ?? target.packageManager.source})`,
    `Registry     ${plan.request.registry}`,
    `Agents       ${describeAgents(plan.agents)}`,
    `Plan         sha256 ${plan.planHash}`,
    ...(plan.resume
      ? [
          `Resumes      run ${plan.resume.runId}, which stopped before it finished${Object.keys(plan.resume.install).length > 0 ? `; it still installs ${Object.keys(plan.resume.install).join(', ')}` : ''}${plan.resume.items.length > 0 ? `; it adds ${plan.resume.items.join(', ')} again, which its shadcn run left partly installed` : ''}. Steps it finished are not planned again.`,
        ]
      : []),
    '',
    'Dependencies added, exact:',
    ...(added.length > 0 ? added : ['  none: every one is already declared']),
    'Dependencies kept:',
    ...(Object.keys(plan.dependencies.present).length > 0 ? list(plan.dependencies.present) : ['  none']),
    '',
    `Registry items: ${plan.items.add.length > 0 ? `add ${plan.items.add.map((item) => `@ultima/${item}`).join(', ')}` : 'none to add'}${plan.items.present.length > 0 ? `; already installed ${plan.items.present.join(', ')}` : ''}`,
    ...plan.items.creates.map((path) => `  creates ${path}`),
    '',
    'Steps, in the application:',
    ...plan.operations.map((operation, index) => {
      const step = `  ${String(index + 1).padStart(2)}. `;
      if (operation.kind === 'run' || operation.kind === 'check') return `${step}${operation.id}: ${commandLine(operation.command)}`;
      if (operation.kind === 'verify-versions') return `${step}verify every added version against the plan`;
      if (operation.kind === 'install-agents') return `${step}install agent files: ultima install ${plan.agents.harnesses.map((harness) => `--harness ${harness}`).join(' ')}, writing ${agentFiles(plan.agents, 'create').concat(agentFiles(plan.agents, 'edit')).join(', ')}`;
      return `${step}${operation.id}`;
    }),
    '',
    'File changes:',
    ...plan.operations.flatMap((operation) => (operation.kind === 'write' ? [operation.diff.split('\n').slice(1).join('\n')] : [])),
    `Preserved: ${plan.preserved.join(', ') || 'none'}`,
    '',
    `Preview: ${plan.preview.path}, ${plan.preview.mounted ? `at ${plan.preview.url}` : 'not mounted yet'}`,
    '',
    'Steps left to you after setup:',
    ...stepLines(plan.manualSteps),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function printExistingResult(plan: ExistingPlan, result: Result): string {
  const pm = plan.target.packageManager.name;
  const list = (paths: string[]) => (paths.length > 0 ? paths.join(', ') : 'none');
  const application =
    result.status === 'completed'
      ? 'ready: the preview is mounted'
      : result.error
        ? `${result.status}: stopped at ${result.error}`
        : `incomplete until you finish the required steps below: ${result.manualSteps.filter(({ required }) => required).map(({ title }) => title.toLowerCase()).join(', ')}`;
  const lines = [
    `${result.status === 'completed' ? 'Set up' : result.status === 'failed' ? 'Stopped setting up' : 'Set up, with steps left,'} ${result.root} with ${plan.recipe.id} revision ${plan.recipe.revision}.`,
    '',
    ...summaryLines(application, result.checks, result.agents, result.manualSteps, 'package.json has no build script'),
    '',
    `Created    ${list(result.files.created)}`,
    `Edited     ${list(result.files.edited)}`,
    `Preserved  ${list(result.files.preserved)}`,
    '',
    `Versions   ${Object.entries(result.versions).map(([name, version]) => `${name} ${version}`).join(', ') || 'unchanged'}`,
    `Logs       ${result.logs}`,
    result.recovery ? `Recovery   ${result.recovery.journal}; undo this run with \`${result.recovery.rollback}\`` : 'Recovery   nothing to undo: this run wrote no file.',
    '',
    plan.preview.mounted ? `The preview is at ${plan.preview.url} (${plan.preview.path}).` : `The preview is written to ${plan.preview.path} and not mounted yet.`,
    `  ${pm} run dev`,
    ...(plan.operations.some((operation) => operation.kind === 'check' && operation.check === 'build') ? [`  ${pm} run build`] : []),
    '',
    ...(result.manualSteps.length > 0 ? ['Steps left to you:', ...stepLines(result.manualSteps), ''] : []),
  ];
  return `${lines.join('\n')}\n`;
}
