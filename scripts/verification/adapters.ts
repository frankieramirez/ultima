/**
 * Execution adapters, keyed by check ID, per Check composition under Verification CLI in
 * docs/spec/agent-infrastructure.md. The static, type, palette and non-browser suites run here (#460):
 * architecture, catalogue freshness, typecheck, the tooling and checker fixtures, the palette gate and
 * the tokens and CLI suites. The production scenarios run through `apps/docs/scripts/production-adapter.ts`
 * (#462; #463 completes the matrix) after `docs-build`. Browser, build and install adapters land with
 * #461; until then the runner reports those checks `unavailable`, the production check `blocked`, and no
 * run that selects one can pass.
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
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { productionAdapter } from '../../apps/docs/scripts/production-adapter.ts';
import { CI_OBLIGATIONS, type CheckId } from './checks.ts';
import type { ProcessResult } from './process.ts';
import type { Adapter, AdapterContext, AdapterReport, Adapters } from './run.ts';
import { type Parsed, type VitestReport, architecture, freshness, nodeTest, palette, typecheck, vitest } from './tool-reports.ts';

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

type Evidence = { report?: string; discovered?: string[]; notes?: string[]; configuration?: string[] };

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
  const artifacts = [relative(context.run, path), ...(evidence.report && existsSync(evidence.report) ? [relative(context.run, evidence.report)] : [])];
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
 * command, which is `vitest run` for both packages here.
 */
function vitestSuite(): Adapter {
  return {
    run: (context) =>
      evidenced(context, async () => {
        const report = join(context.artifacts, `${context.check.id}.vitest.json`);
        const process = await context.launch([...context.check.argv, '--reporter=json', `--outputFile.json=${report}`]);
        const discovered = context.check.scope === 'files' ? [] : discover(context.source, DISCOVERY[context.check.id] ?? []);
        return {
          process,
          evidence: { report, discovered },
          parsed: () => {
            if (!existsSync(report)) {
              return {
                verdict: 'incomplete',
                executed: [],
                reason: `Vitest wrote no report; the suite or the preparation its package script runs first (${context.check.nested.join(', ') || 'none'}) failed to start, exit ${process.exitCode}`,
              };
            }
            return vitest(JSON.parse(readFileSync(report, 'utf8')) as VitestReport, (path) => relative(context.source, path));
          },
        };
      }),
  };
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
  'production-scenarios': productionAdapter,
};
