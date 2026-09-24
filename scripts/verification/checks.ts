/**
 * The check registry: every check a verification plan can select, as an explicit DAG of prerequisites,
 * resource locks and deadlines, per Check composition under Verification CLI in
 * docs/spec/agent-infrastructure.md. Each check names the existing command it will run; adapters own
 * those argument arrays, and no path or ID becomes an argument by string concatenation. Planning reads
 * this table and runs nothing.
 *
 * The static, type, palette and non-browser suites have adapters (scripts/verification/adapters.ts,
 * #460). The rest are `unavailable` until the build slice their `lands` field names delivers them, so no
 * plan that selects one can report a pass.
 */

export type CheckId =
  | 'architecture'
  | 'catalogue-freshness'
  | 'typecheck'
  | 'tooling-tests'
  | 'analysis-fixtures'
  | 'palette'
  | 'tokens-tests'
  | 'ui-tests'
  | 'elements-tests'
  | 'docs-tests'
  | 'cli-tests'
  | 'registry-build'
  | 'docs-build'
  | 'consumer-smoke'
  | 'production-scenarios';

/**
 * Locks a run holds while a check executes: `browser` serializes the browser projects, which share
 * viewport, pointer and document state; `writes:*` serializes commands that write the same generated
 * directories, including nested package preparation. Needs are prerequisites the environment supplies.
 */
export type Lock = 'browser' | 'writes:tokens-dist' | 'writes:elements-dist' | 'writes:registry' | 'writes:docs-dist';
export type Need = 'network' | 'loopback-port' | 'chromium' | 'python3';

/** How a suite narrows: by test file through the import graph, or never (the whole suite runs). */
export type Selector = 'file' | 'none';

export type CheckDefinition = {
  id: CheckId;
  title: string;
  /** The command a whole-scope run executes, from the repository root. */
  argv: string[];
  /** For a file-selectable suite: the command before the validated, repository-relative test files, run from `cwd`. */
  scopedArgv?: string[];
  cwd: string;
  /** Commands the package script runs itself, retained so a nested build is never hidden. */
  nested: string[];
  prerequisites: CheckId[];
  /** Prerequisites only a scoped invocation needs, because the package script it bypasses ran them. */
  scopedPrerequisites?: CheckId[];
  /**
   * Checks that finish first, whatever their outcome, without blocking this one: it runs a build or
   * generator in the snapshot, and the read-only architecture and freshness checks must see the captured
   * bytes before anything can repair them.
   */
  after?: CheckId[];
  locks: Lock[];
  needs: Need[];
  deadlineSeconds: number;
  /** `global` runs in every executable plan; `scoped` only when selection reaches it. */
  scope: 'global' | 'scoped';
  selector: Selector;
  /** The package whose `test` script this check composes, for `pnpm test`. */
  package?: string;
  /** Where the suite's tests live, for selection and deleted-test ownership. */
  tests?: string;
  adapter: { status: 'available'; since: string } | { status: 'unavailable'; lands: string };
};

const STATIC = { status: 'available', since: '#460 (static, type and unit checks)' } as const;
const BROWSER = { status: 'unavailable', lands: '#461 (browser, build and install checks)' } as const;
const PRODUCTION = { status: 'unavailable', lands: '#462 (Dialog and Studio pilot) and #463 (the full matrix)' } as const;

const FRESHNESS: CheckId[] = ['catalogue-freshness'];
/** The read-only checks every writer waits for. */
const READ_FIRST: CheckId[] = ['architecture', 'catalogue-freshness'];

/** In plan order: the global static checks first, then suites, builds, installation and production. */
export const CHECKS: readonly CheckDefinition[] = [
  {
    id: 'architecture',
    title: 'Architecture and metadata',
    argv: ['pnpm', 'check:architecture'],
    cwd: '.',
    nested: [],
    prerequisites: [],
    locks: [],
    needs: [],
    deadlineSeconds: 300,
    scope: 'global',
    selector: 'none',
    adapter: STATIC,
  },
  {
    id: 'catalogue-freshness',
    title: 'Catalogue freshness and the feature map',
    argv: ['pnpm', 'catalogue:check'],
    cwd: '.',
    nested: [],
    prerequisites: [],
    locks: [],
    needs: [],
    deadlineSeconds: 120,
    scope: 'global',
    selector: 'none',
    adapter: STATIC,
  },
  {
    id: 'typecheck',
    title: 'Types, including the root TypeScript project',
    argv: ['pnpm', 'typecheck'],
    cwd: '.',
    nested: ['tsc -p tsconfig.json', 'pnpm -r typecheck'],
    prerequisites: FRESHNESS,
    locks: [],
    needs: [],
    deadlineSeconds: 600,
    scope: 'global',
    selector: 'none',
    adapter: STATIC,
  },
  {
    id: 'tooling-tests',
    title: 'Catalogue and verification tooling fixtures',
    argv: ['node', '--experimental-strip-types', '--test', 'scripts/catalogue/*.test.ts', 'scripts/verification/*.test.ts'],
    cwd: '.',
    nested: [],
    prerequisites: FRESHNESS,
    locks: [],
    needs: [],
    deadlineSeconds: 600,
    scope: 'scoped',
    selector: 'none',
    adapter: STATIC,
  },
  {
    id: 'analysis-fixtures',
    title: 'Architecture checker fixtures',
    argv: ['pnpm', '--filter', '@ultima/analysis', 'test'],
    cwd: '.',
    nested: [],
    prerequisites: FRESHNESS,
    locks: [],
    needs: [],
    deadlineSeconds: 600,
    scope: 'scoped',
    selector: 'none',
    package: '@ultima/analysis',
    adapter: STATIC,
  },
  {
    id: 'palette',
    title: 'Contrast gate and palette freshness',
    argv: ['python3', 'packages/tokens/scripts/palette.py', '--check'],
    cwd: '.',
    nested: [],
    prerequisites: [],
    locks: [],
    needs: ['python3'],
    deadlineSeconds: 120,
    scope: 'scoped',
    selector: 'none',
    adapter: STATIC,
  },
  {
    id: 'tokens-tests',
    title: 'Token and theme unit suite',
    argv: ['pnpm', '--filter', '@ultima/tokens', 'test'],
    scopedArgv: ['pnpm', '--filter', '@ultima/tokens', 'exec', 'vitest', 'run', '--reporter=verbose'],
    cwd: '.',
    nested: [],
    prerequisites: FRESHNESS,
    locks: [],
    needs: [],
    deadlineSeconds: 300,
    scope: 'scoped',
    selector: 'file',
    package: '@ultima/tokens',
    tests: 'packages/tokens/src/__tests__',
    adapter: STATIC,
  },
  {
    id: 'ui-tests',
    title: 'React component proof bar: browser, axe and both modes',
    argv: ['pnpm', '--filter', '@ultima/ui', 'test'],
    scopedArgv: ['pnpm', '--filter', '@ultima/ui', 'exec', 'vitest', 'run', '--reporter=verbose'],
    cwd: '.',
    nested: [],
    prerequisites: FRESHNESS,
    locks: ['browser'],
    needs: ['chromium'],
    deadlineSeconds: 1200,
    scope: 'scoped',
    selector: 'file',
    package: '@ultima/ui',
    tests: 'packages/ui/src/__tests__',
    adapter: BROWSER,
  },
  {
    id: 'elements-tests',
    title: 'Element families, lifecycle, parity and bundle assertions',
    argv: ['pnpm', '--filter', '@ultima/elements', 'test'],
    cwd: '.',
    nested: ['pnpm --filter @ultima/tokens build', 'pnpm build (elements)', 'vitest run'],
    prerequisites: FRESHNESS,
    after: READ_FIRST,
    locks: ['browser', 'writes:tokens-dist', 'writes:elements-dist'],
    needs: ['chromium'],
    deadlineSeconds: 900,
    scope: 'scoped',
    // Its script builds tokens and elements first; no validated selector preserves that preparation.
    selector: 'none',
    package: '@ultima/elements',
    tests: 'packages/elements/src/__tests__',
    adapter: BROWSER,
  },
  {
    id: 'docs-tests',
    title: 'Docs site suites, including the axe sweep and element fixture',
    argv: ['pnpm', '--filter', '@ultima/docs', 'test'],
    scopedArgv: ['pnpm', '--filter', '@ultima/docs', 'exec', 'vitest', 'run', '--reporter=verbose'],
    cwd: '.',
    nested: ['pnpm -w run registry:build', 'vitest run'],
    prerequisites: FRESHNESS,
    scopedPrerequisites: ['registry-build'],
    after: READ_FIRST,
    locks: ['browser', 'writes:tokens-dist', 'writes:elements-dist', 'writes:registry'],
    needs: ['chromium'],
    deadlineSeconds: 1200,
    scope: 'scoped',
    selector: 'file',
    package: '@ultima/docs',
    tests: 'apps/docs/src/__tests__',
    adapter: BROWSER,
  },
  {
    id: 'cli-tests',
    title: 'Consumer CLI suite',
    argv: ['pnpm', '--filter', '@ultima-systems/cli', 'test'],
    cwd: '.',
    nested: ['pnpm build (cli)', 'vitest run'],
    prerequisites: FRESHNESS,
    after: READ_FIRST,
    locks: [],
    needs: [],
    deadlineSeconds: 600,
    scope: 'scoped',
    selector: 'none',
    package: '@ultima-systems/cli',
    adapter: STATIC,
  },
  {
    id: 'registry-build',
    title: 'Registry, token exports, element bundles and budgets',
    argv: ['pnpm', 'registry:build'],
    cwd: '.',
    nested: ['pnpm --filter @ultima/tokens build', 'pnpm --filter @ultima/elements build', 'scripts/build-registry.ts'],
    prerequisites: FRESHNESS,
    after: READ_FIRST,
    locks: ['writes:tokens-dist', 'writes:elements-dist', 'writes:registry'],
    needs: [],
    deadlineSeconds: 600,
    scope: 'scoped',
    selector: 'none',
    adapter: BROWSER,
  },
  {
    id: 'docs-build',
    title: 'Production docs build',
    argv: ['pnpm', '--filter', '@ultima/docs', 'build'],
    cwd: '.',
    nested: ['pnpm -w run registry:build', 'vite build'],
    prerequisites: ['catalogue-freshness', 'registry-build'],
    after: READ_FIRST,
    locks: ['writes:tokens-dist', 'writes:elements-dist', 'writes:registry', 'writes:docs-dist'],
    needs: [],
    deadlineSeconds: 900,
    scope: 'scoped',
    selector: 'none',
    adapter: BROWSER,
  },
  {
    id: 'consumer-smoke',
    title: 'Consumer install: Vite, Next.js and element consumers',
    argv: ['scripts/smoke-install.sh', '--keep'],
    cwd: '.',
    nested: ['local registry build and server', 'Vite consumer', 'Next.js consumer', 'element consumer'],
    prerequisites: ['registry-build'],
    after: READ_FIRST,
    locks: ['writes:tokens-dist', 'writes:elements-dist', 'writes:registry'],
    needs: ['network', 'loopback-port'],
    deadlineSeconds: 2700,
    scope: 'scoped',
    // Scoped runs use the full smoke until a validated selector exists.
    selector: 'none',
    adapter: BROWSER,
  },
  {
    id: 'production-scenarios',
    title: 'Production browser scenarios against the built docs',
    argv: ['pnpm', '--filter', '@ultima/docs', 'test:production'],
    cwd: '.',
    nested: [],
    prerequisites: ['docs-build'],
    locks: ['browser'],
    needs: ['chromium', 'loopback-port'],
    deadlineSeconds: 1800,
    scope: 'scoped',
    selector: 'none',
    tests: 'apps/docs/tests/production',
    adapter: PRODUCTION,
  },
];

export const CHECK_BY_ID = new Map(CHECKS.map((check) => [check.id, check]));

export function check(id: CheckId): CheckDefinition {
  return CHECK_BY_ID.get(id) as CheckDefinition;
}

/** The repository-owned overall deadline when `--timeout` is absent; measurements may tune it. */
export const DEFAULT_DEADLINE_SECONDS = 5400;

/**
 * Every command the CI workflows run, and the release checks that carry it. A command that only
 * prepares the runner is `preparation`. A test proves every workflow `run:` line appears here and every
 * mapped check is in the release plan, so a new CI obligation cannot go unplanned.
 */
export const CI_OBLIGATIONS: readonly { workflow: string; command: string; checks?: CheckId[]; preparation?: string }[] = [
  { workflow: 'ci.yml', command: 'pnpm install --frozen-lockfile', preparation: 'dependency installation from the lockfile' },
  { workflow: 'ci.yml', command: 'pnpm catalogue:check', checks: ['catalogue-freshness'] },
  { workflow: 'ci.yml', command: 'pnpm check:architecture', checks: ['architecture'] },
  { workflow: 'ci.yml', command: 'pnpm typecheck', checks: ['typecheck'] },
  {
    workflow: 'ci.yml',
    command: 'pnpm --filter @ultima/ui exec playwright install --with-deps chromium',
    preparation: 'the chromium the browser suites need',
  },
  {
    workflow: 'ci.yml',
    command: 'pnpm test',
    checks: ['tooling-tests', 'analysis-fixtures', 'cli-tests', 'tokens-tests', 'ui-tests', 'elements-tests', 'docs-tests'],
  },
  { workflow: 'ci.yml', command: 'python3 packages/tokens/scripts/palette.py --check', checks: ['palette'] },
  { workflow: 'ci.yml', command: 'pnpm registry:build', checks: ['registry-build'] },
  { workflow: 'ci.yml', command: 'pnpm --filter @ultima/docs build', checks: ['docs-build'] },
  { workflow: 'smoke-install.yml', command: 'pnpm install --frozen-lockfile', preparation: 'dependency installation from the lockfile' },
  { workflow: 'smoke-install.yml', command: 'mkdir -p "$RUNNER_TEMP/smoke"', preparation: 'the TMPDIR the consumer apps land in' },
  { workflow: 'smoke-install.yml', command: 'TMPDIR="$RUNNER_TEMP/smoke" ./scripts/smoke-install.sh --keep', checks: ['consumer-smoke'] },
];
