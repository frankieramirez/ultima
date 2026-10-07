/**
 * Execution adapters, keyed by check ID, per Check composition under Verification CLI in
 * docs/spec/agent-infrastructure.md. The static, type, palette and non-browser suites run here (#460):
 * architecture, catalogue freshness, typecheck, the tooling and checker fixtures, the palette gate and
 * the tokens and CLI suites. The browser suites, the registry and docs builds and the consumer install
 * run here too (#461): the React, element and docs Vitest projects through their package scripts, so the
 * token, element and registry builds those scripts run first still run; `pnpm registry:build`; the
 * production docs build, which leaves the build manifest (apps/docs/scripts/build-manifest.ts) the
 * production adapter requires; and `scripts/smoke-install.sh --keep` on its local path, under the run's
 * TMPDIR. The production scenarios run through `apps/docs/scripts/production-adapter.ts` (#462, the
 * full matrix since #463) after `docs-build`.
 *
 * Each adapter runs the check's existing command from its argument array in the snapshot, adding only
 * what makes the tool write a machine-readable report (`--format json`, `--json`, a reporter, `-v`),
 * and reads that report through scripts/verification/tool-reports.ts. The tool's own logic decides; the
 * adapter records what ran. Package scripts run whole, so their preparation (the CLI build, the
 * catalogue preflight) runs exactly as it does in CI.
 *
 * Every adapter writes `artifacts/<check>.evidence.json`: the argv it ran, the configuration files it
 * depends on with their hashes, the discovered test files, the tool report and the CI obligations the
 * check carries.
 */
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createManifest, hashBuild } from '../../apps/docs/scripts/build-manifest.ts';
import { BUILD_MANIFEST, BUILD_ROOT, productionAdapter } from '../../apps/docs/scripts/production-adapter.ts';
import { diskFiles } from '../catalogue/files.ts';
import { loadCatalogue } from '../catalogue/model.ts';
import { CI_OBLIGATIONS, type CheckId } from './checks.ts';
import type { ProcessResult } from './process.ts';
import type { Adapter, AdapterContext, AdapterReport, Adapters } from './run.ts';
import {
  type Parsed,
  type VitestReport,
  architecture,
  docsBuild,
  freshness,
  nodeTest,
  palette,
  plain,
  registryBuild,
  registryLog,
  smoke,
  smokeTargets,
  typecheck,
  vitest,
} from './tool-reports.ts';

/** The shape the adapters share: one command, then a parser over the tool's own report. */
export function commandAdapter(
  argv: (context: AdapterContext) => string[],
  parse: (context: AdapterContext, process: ProcessResult) => Omit<AdapterReport, 'process'>,
): Adapter {
  return {
    async run(context) {
      const process = await context.launch(argv(context));
      if (process.status !== 'exited') return { verdict: 'incomplete', process, executed: [], reason: `the command ${process.status}` };
      return { ...parse(context, process), process };
    },
  };
}

const NODE_TEST_REPORTER = fileURLToPath(new URL('./node-test-reporter.ts', import.meta.url));

/** The runner configuration an adapter's result depends on, hashed in the evidence. */
const CONFIGURATION: Partial<Record<CheckId, string[]>> = {
  architecture: ['package.json', 'scripts/check-architecture.ts'],
  'catalogue-freshness': ['package.json', 'scripts/catalogue/generate.ts', 'scripts/catalogue/optimizer-policy.ts'],
  typecheck: ['package.json', 'pnpm-workspace.yaml', 'tsconfig.json', 'tsconfig.base.json'],
  'tooling-tests': ['package.json'],
  'analysis-fixtures': ['packages/analysis/package.json'],
  palette: ['packages/tokens/scripts/palette.py', 'packages/tokens/scripts/palette.json'],
  'tokens-tests': ['packages/tokens/package.json', 'packages/tokens/vitest.config.ts'],
  'cli-tests': ['packages/cli/package.json', 'packages/cli/vitest.config.ts', 'packages/cli/scripts/build.ts'],
  'ui-tests': ['packages/ui/package.json', 'packages/ui/vitest.config.ts', 'packages/ui/src/__tests__/setup.ts', 'stylex.options.ts'],
  'blocks-tests': ['packages/blocks/package.json', 'packages/blocks/vitest.config.ts', 'packages/blocks/src/__tests__/setup.ts', 'stylex.options.ts'],
  'elements-tests': ['packages/elements/package.json', 'packages/elements/vitest.config.ts', 'packages/elements/scripts/build.ts', 'packages/tokens/scripts/build-tokens.ts'],
  'docs-tests': ['apps/docs/package.json', 'apps/docs/vitest.config.ts', 'stylex.options.ts', 'package.json', 'scripts/build-registry.ts'],
  'registry-build': ['package.json', 'scripts/build-registry.ts', 'packages/tokens/scripts/build-tokens.ts', 'packages/elements/scripts/build.ts', 'packages/elements/scripts/bundle.ts'],
  'docs-build': ['apps/docs/package.json', 'apps/docs/vite.config.ts', 'apps/docs/index.html', 'stylex.options.ts', 'package.json', 'scripts/build-registry.ts'],
  'consumer-smoke': ['scripts/smoke-install.sh', 'package.json', 'scripts/build-registry.ts', 'apps/docs/vite.config.ts'],
};

/**
 * Where each suite's runner finds its tests, as the runner's own configuration states it: Vitest's
 * `include`, or the globs a `node --test` command passes. Whole-suite coverage expects every file found
 * here, so a file the runner silently stops collecting is missing coverage, never a pass.
 */
export const DISCOVERY: Partial<Record<CheckId, string[]>> = {
  'tooling-tests': ['scripts/catalogue/*.test.ts', 'scripts/verification/*.test.ts'],
  'analysis-fixtures': ['packages/analysis/src/__tests__/*.test.ts'],
  'tokens-tests': ['packages/tokens/src/__tests__/**/*.test.ts'],
  'cli-tests': ['packages/cli/src/__tests__/**/*.test.ts'],
  'ui-tests': ['packages/ui/src/__tests__/**/*.test.ts', 'packages/ui/src/__tests__/**/*.test.tsx'],
  'blocks-tests': ['packages/blocks/src/__tests__/**/*.test.tsx'],
  // Both projects: the browser families and parity, and the `.node.test.ts` bundle and guide assertions.
  'elements-tests': ['packages/elements/src/__tests__/**/*.test.ts'],
  'docs-tests': ['apps/docs/src/__tests__/**/*.test.ts', 'apps/docs/src/__tests__/**/*.test.tsx'],
};

/** Files under `root` matching `dir/*.suffix` or `dir/**\/*.suffix`, repository-relative and sorted. */
export function discover(root: string, patterns: string[]): string[] {
  const found = new Set<string>();
  for (const pattern of patterns) {
    const match = /^(.*?)\/(\*\*\/)?\*(\.[^/*]+)$/.exec(pattern);
    if (!match) throw new Error(`unsupported discovery pattern ${pattern}`);
    const [, directory, deep, suffix] = match as unknown as [string, string, string | undefined, string];
    const walk = (path: string) => {
      let names: string[];
      try {
        names = readdirSync(join(root, path));
      } catch {
        return;
      }
      for (const name of names) {
        const child = `${path}/${name}`;
        const stat = statSync(join(root, child));
        if (stat.isDirectory()) {
          if (deep && name !== 'node_modules') walk(child);
        } else if (name.endsWith(suffix)) found.add(child);
      }
    };
    walk(directory);
  }
  return [...found].sort();
}

const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

/** Workspace packages with a `typecheck` script, from the snapshot's pnpm-workspace.yaml globs. */
export function typecheckPackages(root: string): string[] {
  const workspace = readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8');
  const globs = [...workspace.matchAll(/^\s*-\s*['"]?([^'"\s]+)['"]?\s*$/gm)].map((match) => match[1] as string);
  const packages: string[] = [];
  for (const glob of globs) {
    if (!glob.endsWith('/*')) throw new Error(`unsupported workspace glob ${glob}`);
    const parent = glob.slice(0, -2);
    for (const name of readdirSync(join(root, parent)).sort()) {
      const manifest = join(root, parent, name, 'package.json');
      if (!existsSync(manifest)) continue;
      const scripts = (JSON.parse(readFileSync(manifest, 'utf8')) as { scripts?: Record<string, string> }).scripts ?? {};
      if (scripts.typecheck) packages.push(`${parent}/${name}`);
    }
  }
  return packages;
}

/** The part of the check's log a launch appended, read after it ended. */
async function logged(context: AdapterContext, argv: string[], options: Parameters<AdapterContext['launch']>[1] = {}) {
  const offset = existsSync(context.log) ? statSync(context.log).size : 0;
  const process = await context.launch(argv, options);
  const text = existsSync(context.log) ? readFileSync(context.log).subarray(offset).toString('utf8') : '';
  return { process, text };
}

/** `artifacts` are further run files the check leaves as evidence, such as a build manifest. */
type Evidence = { report?: string; discovered?: string[]; notes?: string[]; configuration?: string[]; artifacts?: string[] };

/** Runs one command, parses its report and writes the evidence file beside it. */
async function evidenced(
  context: AdapterContext,
  launchWith: () => Promise<{ process: ProcessResult; parsed: () => Parsed; evidence?: Evidence }>,
): Promise<AdapterReport> {
  const id = context.check.id;
  const { process, parsed, evidence = {} } = await launchWith();
  const result: Parsed =
    process.status === 'exited'
      ? (() => {
          try {
            return parsed();
          } catch (error) {
            return { verdict: 'incomplete', executed: [], reason: `the tool's report could not be read: ${(error as Error).message}` };
          }
        })()
      : { verdict: 'incomplete', executed: [], reason: `the command ${process.status}` };
  const discovered = evidence.discovered ?? [];
  const configuration = [...(CONFIGURATION[id] ?? []), ...(evidence.configuration ?? [])]
    .filter((path) => existsSync(join(context.source, path)))
    .map((path) => ({ path, sha256: sha256(join(context.source, path)) }));
  const path = join(context.artifacts, `${id}.evidence.json`);
  const artifacts = [relative(context.run, path), ...[evidence.report, ...(evidence.artifacts ?? [])].filter((file): file is string => !!file && existsSync(file)).map((file) => relative(context.run, file))];
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        check: id,
        scope: context.check.scope,
        planned: { argv: context.check.argv, cwd: context.check.cwd },
        executed: { argv: process.argv, cwd: relative(context.run, process.cwd) || '.', status: process.status, exitCode: process.exitCode, signal: process.signal },
        configuration,
        obligations: CI_OBLIGATIONS.filter((entry) => entry.checks?.includes(id)).map((entry) => `${entry.workflow}: ${entry.command}`),
        discovered,
        report: evidence.report ? relative(context.run, evidence.report) : null,
        notes: evidence.notes ?? [],
        verdict: result.verdict,
        reason: result.reason ?? null,
      },
      null,
      2,
    )}\n`,
  );
  return { ...result, expected: [...new Set([...discovered, ...(result.expected ?? [])])], process, artifacts };
}

/** A check that prints one JSON document on standard output. */
function jsonCheck(extra: string[], parse: (stdout: string, exitCode: number | null) => Parsed): Adapter {
  return {
    run: (context) =>
      evidenced(context, async () => {
        const report = join(context.artifacts, `${context.check.id}.json`);
        const process = await context.launch([...context.check.argv, ...extra], { stdout: report });
        return { process, parsed: () => parse(existsSync(report) ? readFileSync(report, 'utf8') : '', process.exitCode), evidence: { report } };
      }),
  };
}

/**
 * A Vitest suite through its package script (whole) or `vitest run` on the planned files (scoped), with
 * the JSON reporter added beside the verbose one. pnpm appends the arguments to the script's final
 * command, and scripts/catalogue/preflight.ts appends them to the command it wraps, so they reach
 * `vitest run` in every package. A whole run keeps the preparation its script runs first: the element
 * suite builds tokens and elements, the docs suite the registry. A browser suite's failure screenshots
 * are copied out of the snapshot before it is removed.
 */
function vitestSuite(): Adapter {
  return {
    run: (context) =>
      evidenced(context, async () => {
        const report = join(context.artifacts, `${context.check.id}.vitest.json`);
        const notes: string[] = [];
        const artifacts: string[] = [];
        const scoped = context.check.scope === 'files';
        if (scoped && context.check.id === 'docs-tests') {
          const prepared = await registryForScopedDocs(context, notes);
          if (prepared) return { process: prepared, parsed: () => incompletePreparation(prepared, context), evidence: { notes } };
        }
        const { process, text } = await logged(context, [...context.check.argv, '--reporter=json', `--outputFile.json=${report}`]);
        const discovered = scoped ? [] : discover(context.source, DISCOVERY[context.check.id] ?? []);
        artifacts.push(...retainScreenshots(context));
        return {
          process,
          evidence: { report, discovered, notes, artifacts },
          parsed: () => {
            if (!existsSync(report)) {
              return {
                verdict: 'incomplete',
                executed: [],
                reason: `Vitest wrote no report; the suite, its browser or the preparation its package script runs first (${context.check.nested.join(', ') || 'none'}) failed to start, exit ${process.exitCode}`,
              };
            }
            const result = vitest(JSON.parse(readFileSync(report, 'utf8')) as VitestReport, (path) => relative(context.source, path));
            // Vitest can report success with an unhandled error, such as a browser that never launched.
            if (result.verdict !== 'validation-failure' && process.exitCode !== 0) {
              const error = unhandled(text);
              return { ...result, verdict: 'incomplete', reason: `Vitest exited ${process.exitCode} without a failing test${error ? `: ${error}` : ''}` };
            }
            return result;
          },
        };
      }),
  };
}

/** The first error Vitest reports outside any test, such as `browserType.launch: Executable doesn't exist`. */
function unhandled(log: string): string | null {
  const lines = plain(log).split('\n');
  const at = lines.findIndex((line) => /Unhandled (Error|Rejection)/.test(line));
  return (at < 0 ? lines : lines.slice(at)).find((line) => /^\w*Error: /.test(line.trim()))?.trim() ?? null;
}

/** Vitest's browser failure screenshots under the suite's test directory, copied into the run. */
function retainScreenshots(context: AdapterContext): string[] {
  const tests = CHECK_TESTS[context.check.id];
  if (!tests) return [];
  const found: string[] = [];
  const walk = (path: string) => {
    let names: string[];
    try {
      names = readdirSync(join(context.source, path));
    } catch {
      return;
    }
    for (const name of names) {
      const child = `${path}/${name}`;
      if (!statSync(join(context.source, child)).isDirectory()) continue;
      if (name === '__screenshots__') found.push(child);
      else walk(child);
    }
  };
  walk(tests);
  return found.map((path) => {
    const destination = join(context.artifacts, `${context.check.id}.screenshots`, path);
    mkdirSync(destination, { recursive: true });
    cpSync(join(context.source, path), destination, { recursive: true });
    return destination;
  });
}

const CHECK_TESTS: Partial<Record<CheckId, string>> = {
  'ui-tests': 'packages/ui/src/__tests__',
  'blocks-tests': 'packages/blocks/src/__tests__',
  'elements-tests': 'packages/elements/src/__tests__',
  'docs-tests': 'apps/docs/src/__tests__',
};

/** What `pnpm registry:build` writes, relative to the snapshot. */
export const REGISTRY_OUTPUTS = [
  'packages/tokens/dist',
  'packages/elements/dist',
  'registry/registry.json',
  'registry/ultima',
  'apps/docs/public/r',
  'apps/docs/public/tokens.css',
  'apps/docs/public/tokens.json',
  'apps/docs/public/llms.txt',
  'apps/docs/public/elements',
];

/** Each registry output's SHA-256, a directory's over its files; `null` when it is absent. */
export function registryOutputs(source: string): Record<string, string | null> {
  const outputs: Record<string, string | null> = {};
  for (const path of REGISTRY_OUTPUTS) {
    const absolute = join(source, path);
    if (!existsSync(absolute)) outputs[path] = null;
    else outputs[path] = statSync(absolute).isDirectory() ? hashBuild(absolute).digest : sha256(absolute);
  }
  return outputs;
}

type RegistryRecord = { schemaVersion: 1; source: string; argv: string[]; exitCode: number | null; outputs: Record<string, string | null> };

const registryRecordPath = (context: AdapterContext) => join(context.artifacts, 'registry-build.outputs.json');

/**
 * A scoped docs run skips its package script, so the registry its script would build must already be
 * there. It reuses the registry-build check's outputs only when that check ran the same command on the
 * same snapshot, exited 0, and every output still has the bytes it wrote; another writer, such as the
 * element suite rebuilding tokens, may have run since. Otherwise it rebuilds with the package script's
 * own command. Returns the failed rebuild, or null once the registry is in place.
 */
async function registryForScopedDocs(context: AdapterContext, notes: string[]) {
  const path = registryRecordPath(context);
  const record = existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as RegistryRecord) : null;
  const now = registryOutputs(context.source);
  const differences = !record
    ? ['registry-build recorded no outputs in this run']
    : [
        ...(record.source === context.identity.manifest.digest ? [] : ['another snapshot']),
        ...(JSON.stringify(record.argv) === JSON.stringify(REGISTRY_ARGV) ? [] : [`another command (${record.argv.join(' ')})`]),
        ...(record.exitCode === 0 ? [] : [`registry-build exited ${record.exitCode}`]),
        ...REGISTRY_OUTPUTS.filter((output) => record.outputs[output] === null || record.outputs[output] !== now[output]).map((output) => `${output} changed`),
      ];
  if (differences.length === 0) {
    notes.push('reused the registry-build outputs: the same snapshot, command and output hashes, so the registry prerequisite is not rebuilt');
    return null;
  }
  notes.push(`rebuilt the registry with pnpm -w run registry:build, because the recorded outputs are not equivalent: ${differences.join('; ')}`);
  const rebuilt = await context.launch(['pnpm', '-w', 'run', 'registry:build']);
  return rebuilt.status === 'exited' && rebuilt.exitCode === 0 ? null : rebuilt;
}

const REGISTRY_ARGV = ['pnpm', 'registry:build'];

function incompletePreparation(process: ProcessResult, context: AdapterContext): Parsed {
  const text = existsSync(context.log) ? readFileSync(context.log, 'utf8') : '';
  const failures = registryLog(text).failures;
  return {
    verdict: 'incomplete',
    executed: [],
    failures,
    reason: `the registry the scoped docs suite needs could not be rebuilt (exit ${process.exitCode}), so no test ran${failures.length ? `: ${failures.join('; ')}` : ''}`,
  };
}

/** The element families the registry and docs builds bundle, from the shared catalogue model. */
function families(source: string): string[] {
  return loadCatalogue(diskFiles(source))
    .catalogue.elements.map((entry) => entry.id)
    .sort();
}

const registryBuildAdapter: Adapter = {
  run: (context) =>
    evidenced(context, async () => {
      const { process, text } = await logged(context, context.check.argv);
      const record: RegistryRecord = {
        schemaVersion: 1,
        source: context.identity.manifest.digest,
        argv: context.check.argv,
        exitCode: process.exitCode,
        outputs: registryOutputs(context.source),
      };
      const path = registryRecordPath(context);
      writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
      return { process, parsed: () => registryBuild(text, process.exitCode, families(context.source)), evidence: { artifacts: [path] } };
    }),
};

/**
 * The production docs build through its package script, which builds the registry first. A pass
 * leaves the build manifest the production adapter requires at `artifacts/${BUILD_MANIFEST}`: the
 * snapshot digest and HEAD, the command, and the hash of every file under apps/docs/dist. Vite must
 * report building for production. A build proves no interaction; the production scenarios stay a
 * separate check.
 */
const docsBuildAdapter: Adapter = {
  run: (context) =>
    evidenced(context, async () => {
      const { process, text } = await logged(context, context.check.argv);
      const manifest = join(context.artifacts, BUILD_MANIFEST);
      const artifacts: string[] = [];
      const notes: string[] = [];
      return {
        process,
        evidence: { artifacts, notes },
        parsed: () => {
          const { mode, builder, ...result } = docsBuild(text, process.exitCode, families(context.source));
          if (builder) notes.push(`built by ${builder} for ${mode}`);
          if (result.verdict !== 'passed') return result;
          const document = createManifest({
            source: context.source,
            root: BUILD_ROOT,
            sourceDigest: context.identity.manifest.digest,
            head: context.identity.head,
            argv: context.check.argv,
            cwd: context.check.cwd,
          });
          if (!document.files.some((file) => file.path === 'index.html')) {
            return { ...result, verdict: 'incomplete', reason: `the build reported success but ${BUILD_ROOT} has no index.html` };
          }
          mkdirSync(dirname(manifest), { recursive: true });
          writeFileSync(manifest, `${JSON.stringify(document, null, 2)}\n`);
          artifacts.push(manifest);
          return {
            ...result,
            expected: [...(result.expected ?? []), 'build:manifest'],
            executed: [...result.executed, 'build:manifest'],
            reason: `${document.files.length} served file(s) hashed into the build manifest (${document.digest.slice(0, 12)})`,
          };
        },
      };
    }),
};

/** Packages the smoke script fetches at their latest version, whose resolved versions a run records. */
const SMOKE_TOOLS = ['shadcn', 'create-vite', 'create-next-app'];

/** The consumer projects the smoke script scaffolds under its work directory. */
const SMOKE_APPS = ['vite-app', 'next-app', 'next-src-app', 'sidebar-app', 'element-app'];

/**
 * The full consumer smoke on its local path: it builds tokens, the registry and the docs in the
 * snapshot, serves them on a loopback port the kernel assigns, and installs into Vite, Next.js, sidebar
 * and element consumers under the run's TMPDIR. `--keep` leaves the consumers for evidence; the run
 * removes its TMPDIR at the end. The adapter never passes `--host`: a deployed site cannot stand in for
 * the snapshot. It records the npm and Node versions, the version each `@latest` tool resolves to, and
 * what each consumer installed.
 */
const smokeAdapter: Adapter = {
  run: (context) =>
    evidenced(context, async () => {
      const notes: string[] = [];
      const artifacts: string[] = [];
      const tools: Record<string, string | null> = { node: globalThis.process.version };
      const version = async (key: string, argv: string[]) => {
        const out = join(context.artifacts, `consumer-smoke.${key}.version`);
        const result = await context.launch(argv, { stdout: out });
        const text = existsSync(out) ? readFileSync(out, 'utf8').trim().replace(/^"|"$/g, '') : '';
        tools[key] = result.status === 'exited' && result.exitCode === 0 && text ? text : null;
      };
      await version('npm', ['npm', '--version']);
      for (const tool of SMOKE_TOOLS) await version(`${tool}@latest`, ['npm', 'view', `${tool}@latest`, 'version']);
      const { process, text } = await logged(context, context.check.argv);
      const targets = smokeTargets(readFileSync(join(context.source, 'scripts/smoke-install.sh'), 'utf8'));
      const toolsPath = join(context.artifacts, 'consumer-smoke.tools.json');
      return {
        process,
        evidence: { notes, artifacts },
        parsed: () => {
          const { url, work, ...result } = smoke(text, process.exitCode, targets);
          const tmp = context.env.TMPDIR ? realpathSync(context.env.TMPDIR) : null;
          const owned = work !== null && tmp !== null && existsSync(work) && !relative(tmp, realpathSync(work)).startsWith('..') && !isAbsolute(relative(tmp, realpathSync(work)));
          const installed = owned ? retainSmoke(work as string, context, artifacts) : {};
          writeFileSync(toolsPath, `${JSON.stringify({ schemaVersion: 1, url, work, tmpdir: tmp, tools, installed, pinned: { 'shadcn (registry build)': 'shadcn@4.21.0' } }, null, 2)}\n`);
          artifacts.push(toolsPath);
          if (url) notes.push(`served the snapshot's build at ${url}`);
          if (Object.values(tools).some((value) => value === null)) notes.push('a tool version could not be resolved; the network may be unavailable');
          if (!owned) {
            return result.verdict === 'validation-failure'
              ? result
              : { ...result, verdict: 'incomplete', reason: `the smoke consumers are not under the run's TMPDIR (${work ?? 'no work directory reported'}), so the run does not own them${result.reason ? `; ${result.reason}` : ''}` };
          }
          return result;
        },
      };
    }),
};

/**
 * Copies the smoke's own logs and reports (the setup item output, `status --json`, the diff, the hook
 * response, the server log) and each consumer's package.json into the run, and returns the version of
 * every direct dependency each consumer installed.
 */
function retainSmoke(work: string, context: AdapterContext, artifacts: string[]): Record<string, Record<string, string>> {
  const destination = join(context.artifacts, 'consumer-smoke');
  mkdirSync(destination, { recursive: true });
  for (const name of readdirSync(work)) {
    const path = join(work, name);
    if (statSync(path).isFile() && statSync(path).size < 1_000_000 && /\.(log|json|txt)$|^port$/.test(name)) {
      cpSync(path, join(destination, name));
      artifacts.push(join(destination, name));
    }
  }
  const installed: Record<string, Record<string, string>> = {};
  for (const app of SMOKE_APPS) {
    const manifest = join(work, app, 'package.json');
    if (!existsSync(manifest)) continue;
    cpSync(manifest, join(destination, `${app}.package.json`));
    artifacts.push(join(destination, `${app}.package.json`));
    const declared = JSON.parse(readFileSync(manifest, 'utf8')) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    installed[app] = {};
    for (const name of Object.keys({ ...declared.dependencies, ...declared.devDependencies }).sort()) {
      const own = join(work, app, 'node_modules', name, 'package.json');
      if (existsSync(own)) (installed[app] as Record<string, string>)[name] = (JSON.parse(readFileSync(own, 'utf8')) as { version: string }).version;
    }
  }
  return installed;
}

const reporterFlags = (destination: string) => ['--test-reporter=spec', '--test-reporter-destination=stdout', `--test-reporter=${NODE_TEST_REPORTER}`, `--test-reporter-destination=${destination}`];

/**
 * A `node --test` suite. A direct `node` command takes the reporter flags after `--test`; a package
 * script that runs `node --test` gets them through NODE_OPTIONS, because Node reads arguments after the
 * test globs as the tests' own.
 */
function nodeTestSuite(): Adapter {
  return {
    run: (context) =>
      evidenced(context, async () => {
        const report = join(context.artifacts, `${context.check.id}.node-test.jsonl`);
        const argv = context.check.argv;
        const direct = argv[0] === 'node' && argv.includes('--test');
        const notes: string[] = [];
        let process: ProcessResult;
        if (direct) {
          const at = argv.indexOf('--test') + 1;
          process = await context.launch([...argv.slice(0, at), ...reporterFlags(report), ...argv.slice(at)]);
        } else {
          const quoted = reporterFlags(report).map((flag) => (/\s/.test(flag) ? JSON.stringify(flag) : flag));
          const options = [context.env.NODE_OPTIONS, ...quoted].filter(Boolean).join(' ');
          notes.push(`NODE_OPTIONS=${options}`);
          process = await context.launch(argv, { env: { NODE_OPTIONS: options } });
        }
        const discovered = discover(context.source, DISCOVERY[context.check.id] ?? []);
        return {
          process,
          evidence: { report, discovered, notes },
          parsed: () => {
            if (!existsSync(report)) return { verdict: 'incomplete', executed: [], reason: `node --test wrote no report, exit ${process.exitCode}` };
            const parsed = nodeTest(readFileSync(report, 'utf8'), (path) => relative(context.source, path));
            if (parsed.verdict === 'passed' && process.exitCode !== 0) {
              return { ...parsed, verdict: 'incomplete', reason: `node --test exited ${process.exitCode} although every reported test passed` };
            }
            return parsed;
          },
        };
      }),
  };
}

const typecheckAdapter: Adapter = {
  run: (context) =>
    evidenced(context, async () => {
      const packages = typecheckPackages(context.source);
      const { process, text } = await logged(context, context.check.argv);
      const configuration = packages.flatMap((directory) => [`${directory}/package.json`, `${directory}/tsconfig.json`]);
      return { process, parsed: () => typecheck(text, process.exitCode, packages), evidence: { configuration } };
    }),
};

const paletteAdapter: Adapter = {
  run: (context) =>
    evidenced(context, async () => {
      // `-v` prints every gated pairing the generator computes; the verdict and the comparison are unchanged.
      const { process, text } = await logged(context, [...context.check.argv, '-v']);
      return { process, parsed: () => palette(text, process.exitCode) };
    }),
};

export const ADAPTERS: Adapters = {
  architecture: jsonCheck(['--format', 'json'], architecture),
  'catalogue-freshness': jsonCheck(['--json'], freshness),
  typecheck: typecheckAdapter,
  'tooling-tests': nodeTestSuite(),
  'analysis-fixtures': nodeTestSuite(),
  palette: paletteAdapter,
  'tokens-tests': vitestSuite(),
  'cli-tests': vitestSuite(),
  'ui-tests': vitestSuite(),
  'blocks-tests': vitestSuite(),
  'elements-tests': vitestSuite(),
  'docs-tests': vitestSuite(),
  'registry-build': registryBuildAdapter,
  'docs-build': docsBuildAdapter,
  'consumer-smoke': smokeAdapter,
  'production-scenarios': productionAdapter,
};
