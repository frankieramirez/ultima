/**
 * The static, type, palette and non-browser suite adapters: the registry agrees with the check table,
 * each tool's report parses into the right verdict and coverage, the real tools run against this
 * repository, and controlled failures through the real runners (Node's test runner, Vitest, the palette
 * generator) land as validation failures or incomplete runs as the verification contract assigns.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { ADAPTERS, DISCOVERY, discover, typecheckPackages } from './adapters.ts';
import { CHECKS, type CheckId, check } from './checks.ts';
import type { Plan, PlannedCheck } from './plan.ts';
import { launch, ownerToken } from './process.ts';
import { type AdapterContext, type AdapterReport, type Adapters, type Report, EXIT, childEnvironment, executeRun, formatReport, judge } from './run.ts';
import { architecture, freshness, nodeTest, palette, typecheck, vitest, type VitestReport } from './tool-reports.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const scratch = mkdtempSync(join(tmpdir(), 'ultima-adapters-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

const VITEST = join(root, 'packages/tokens/node_modules/vitest/vitest.mjs');

function write(directory: string, files: Record<string, string>) {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(directory, path)), { recursive: true });
    writeFileSync(join(directory, path), text);
  }
}

function planned(id: CheckId, changes: Partial<PlannedCheck> = {}): PlannedCheck {
  const definition = check(id);
  return {
    id,
    title: definition.title,
    status: 'planned',
    adapter: definition.adapter,
    argv: definition.argv,
    cwd: definition.cwd,
    nested: definition.nested,
    prerequisites: [],
    after: [],
    locks: definition.locks,
    needs: definition.needs,
    deadlineSeconds: definition.deadlineSeconds,
    scope: 'whole',
    reasons: ['chosen by the test'],
    files: [],
    cases: [],
    ...changes,
  };
}

/** An adapter context over `source` without a run: the adapter's own launch, log and evidence paths. */
function contextFor(source: string, entry: PlannedCheck): AdapterContext {
  const run = mkdtempSync(join(scratch, 'run-'));
  const artifacts = join(run, 'artifacts');
  const logs = join(run, 'logs');
  mkdirSync(artifacts);
  mkdirSync(logs);
  const log = join(logs, `${entry.id}.log`);
  const env = childEnvironment('adapter-test', source, mkdtempSync(join(scratch, 'tmp-')));
  const token = ownerToken('adapter-test');
  const signal = new AbortController().signal;
  return {
    runId: 'adapter-test',
    check: entry,
    source,
    run,
    artifacts,
    logs,
    log,
    env,
    signal,
    remainingMs: () => entry.deadlineSeconds * 1000,
    launch: (argv, options = {}) =>
      launch({
        argv,
        cwd: join(source, options.cwd ?? entry.cwd),
        env: { ...env, ...options.env },
        log,
        ...(options.stdout ? { stdout: options.stdout } : {}),
        token,
        deadlineMs: entry.deadlineSeconds * 1000,
        signal,
        graceMs: 500,
      }),
    startServer: async () => ({ failure: 'no server in this test' }),
  };
}

async function runAdapter(id: CheckId, source: string, changes: Partial<PlannedCheck> = {}) {
  const entry = planned(id, changes);
  const context = contextFor(source, entry);
  const report = (await (ADAPTERS[id] as NonNullable<Adapters[CheckId]>).run(context)) as AdapterReport;
  const expected = [...new Set([...entry.files.filter((file) => file.present).map((file) => file.path), ...(report.expected ?? [])])];
  return { report, judged: judge(report, expected), context };
}

describe('the adapter registry', () => {
  test('registers exactly the checks the table marks available: static, type, unit and production, nothing browser, build or install', () => {
    const available = CHECKS.filter((entry) => entry.adapter.status === 'available').map((entry) => entry.id);
    assert.deepEqual(Object.keys(ADAPTERS).sort(), [...available].sort());
    assert.deepEqual(available.sort(), ['analysis-fixtures', 'architecture', 'catalogue-freshness', 'cli-tests', 'palette', 'production-scenarios', 'tokens-tests', 'tooling-tests', 'typecheck']);
    for (const id of ['ui-tests', 'elements-tests', 'docs-tests', 'registry-build', 'docs-build', 'consumer-smoke'] as CheckId[]) {
      assert.equal(check(id).adapter.status, 'unavailable', id);
    }
  });

  test('every check that writes into the snapshot runs after the read-only architecture and freshness checks', () => {
    for (const entry of CHECKS) {
      if (entry.locks.some((lock) => lock.startsWith('writes:')) || entry.nested.some((command) => /build/.test(command))) {
        assert.deepEqual(entry.after, ['architecture', 'catalogue-freshness'], entry.id);
      }
    }
    assert.equal(check('architecture').prerequisites.length + (check('architecture').after?.length ?? 0), 0);
    assert.equal(check('catalogue-freshness').prerequisites.length + (check('catalogue-freshness').after?.length ?? 0), 0);
  });

  test('discovers the suites the runners are configured to collect', () => {
    assert.ok(discover(root, DISCOVERY['tooling-tests'] ?? []).includes('scripts/verification/adapters.test.ts'));
    assert.ok(discover(root, DISCOVERY['tokens-tests'] ?? []).every((path) => path.startsWith('packages/tokens/src/__tests__/')));
    assert.ok(discover(root, DISCOVERY['cli-tests'] ?? []).length > 0);
    assert.deepEqual(typecheckPackages(root), ['packages/analysis', 'packages/cli', 'packages/elements', 'packages/tokens', 'packages/ui', 'apps/docs']);
  });
});

describe('tool reports', () => {
  const rules = [
    { id: 'ULT-TOKEN-001', status: 'blocking' },
    { id: 'ULT-DOCS-REVIEW-001', status: 'advisory' },
    { id: 'ULT-LATER-001', status: 'pending' },
  ];
  const at = { line: 3, column: 5 };
  const architectureReport = (status: string, diagnostics: object[] = [], counts = { blocking: 0, advisory: 0, incomplete: 0, excepted: 2 }) =>
    `> ultima-monorepo@ check:architecture\n\n${JSON.stringify({ schemaVersion: 1, command: 'check:architecture', status, scopes: [{ kind: 'react-component', files: 4 }], rules, unsupported: [], counts, diagnostics })}`;

  test('architecture: active rules are coverage; violations fail validation; incomplete analysis and mismatched exits are incomplete', () => {
    const clean = architecture(architectureReport('clean'), 0);
    assert.equal(clean.verdict, 'passed');
    assert.deepEqual(clean.executed, ['rule:ULT-TOKEN-001', 'rule:ULT-DOCS-REVIEW-001']);
    assert.deepEqual(clean.expected, ['rule:ULT-TOKEN-001']);
    const violation = architecture(architectureReport('violations', [{ ruleId: 'ULT-TOKEN-001', severity: 'blocking', file: 'packages/ui/src/x.tsx', start: at, end: at, message: 'raw color' }]), 1);
    assert.equal(violation.verdict, 'validation-failure');
    assert.deepEqual(violation.failures, ['ULT-TOKEN-001 packages/ui/src/x.tsx:3:5 raw color']);
    const unfinished = architecture(architectureReport('incomplete', [{ ruleId: 'ULT-ANALYSIS-001', severity: 'incomplete', file: 'a.mdx', start: at, end: at, message: 'parse failure' }]), 2);
    assert.equal(unfinished.verdict, 'incomplete');
    assert.match(unfinished.reason ?? '', /parse failure/);
    assert.equal(architecture(architectureReport('clean'), 1).verdict, 'incomplete');
    assert.equal(architecture('Error: Cannot find module', 1).verdict, 'incomplete');
  });

  test('freshness: every compared output is coverage; drift and invalid inputs fail validation', () => {
    const document = (status: string, outputs: object[], extra: object = {}) =>
      JSON.stringify({ schemaVersion: 1, command: 'catalogue:check', status, outputs, stale: [], catalogue: [], featureMap: [], ...extra });
    const fresh = freshness(document('fresh', [{ path: 'packages/ui/src/index.ts', state: 'fresh' }]), 0);
    assert.equal(fresh.verdict, 'passed');
    assert.deepEqual(fresh.executed, ['generated:packages/ui/src/index.ts', 'feature-map']);
    const stale = freshness(document('stale', [{ path: 'packages/ui/src/index.ts', state: 'changed' }], { stale: ['old.ts'] }), 1);
    assert.equal(stale.verdict, 'validation-failure');
    assert.deepEqual(stale.failures, ['changed: packages/ui/src/index.ts; run `pnpm catalogue:generate`', 'stale (no longer generated): old.ts; remove it by hand']);
    assert.equal(freshness(document('invalid', [], { featureMap: ['VER-001 x.json: bad'] }), 1).failures?.[0], 'feature map: VER-001 x.json: bad');
    assert.equal(freshness('', 1).verdict, 'incomplete');
  });

  const PACKAGES = ['packages/analysis', 'packages/tokens'];
  const banner = '> ultima-monorepo@ typecheck\n> node scripts/catalogue/preflight.ts "tsc -p tsconfig.json && pnpm -r typecheck"\n\n';

  test('typecheck: every project the compiler finished is coverage; compiler errors fail validation wherever they arise', () => {
    const clean = typecheck(
      `${banner}Scope: 2 of 3 workspace projects\npackages/tokens typecheck$ tsc -p tsconfig.json\npackages/analysis typecheck$ tsc -p tsconfig.json\npackages/tokens typecheck: Done\npackages/analysis typecheck: Done\n`,
      0,
      PACKAGES,
    );
    assert.equal(clean.verdict, 'passed');
    assert.deepEqual(clean.executed, ['tsc:.', 'tsc:packages/analysis', 'tsc:packages/tokens']);
    assert.deepEqual(clean.expected, ['tsc:.', 'tsc:packages/analysis', 'tsc:packages/tokens']);

    const inPackage = typecheck(
      `${banner}Scope: 2 of 3 workspace projects\npackages/tokens typecheck$ tsc -p tsconfig.json\npackages/tokens typecheck: src/zz.ts(1,14): error TS2322: Type 'string' is not assignable to type 'number'.\npackages/tokens typecheck: Failed\n ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL\n`,
      2,
      PACKAGES,
    );
    assert.equal(inPackage.verdict, 'validation-failure');
    assert.deepEqual(inPackage.failures, ["packages/tokens/src/zz.ts(1,14): error TS2322: Type 'string' is not assignable to type 'number'."]);
    assert.deepEqual(inPackage.executed, ['tsc:.', 'tsc:packages/tokens'], 'pnpm stops at the first failure, so analysis never ran');

    const inRoot = typecheck(`${banner}scripts/zz.ts(1,14): error TS2322: Type 'string' is not assignable to type 'number'.\n ELIFECYCLE  Command failed with exit code 2.\n`, 2, PACKAGES);
    assert.equal(inRoot.verdict, 'validation-failure');
    assert.deepEqual(inRoot.executed, ['tsc:.']);

    const crashed = typecheck(`${banner}node:internal/modules/cjs/loader:1228\n  throw err;\nError: Cannot find module 'typescript'\n`, 1, PACKAGES);
    assert.equal(crashed.verdict, 'incomplete');
    assert.match(crashed.reason ?? '', /exited 1 without a compiler diagnostic/);
  });

  const paletteLog = (lines: string[]) =>
    ['mithril dark  #101011', '', 'dark contrast tokens: accent-contrast=mithril1', "   ('dark', 'text', 'surface', 17.2, 4.5)", '', 'light contrast tokens: accent-contrast=mithril1', "   ('light', 'text', 'surface', 16.9, 4.5)", ...lines].join('\n');

  test('palette: each gated pairing and both modes are coverage; a failing pairing or a hand edit fails validation', () => {
    const clean = palette(paletteLog(['', 'ALL PAIRINGS PASS', 'palette.json matches a fresh run']), 0);
    assert.equal(clean.verdict, 'passed');
    assert.deepEqual(clean.executed, ['contrast:dark', 'pairing:dark:text/surface', 'contrast:light', 'pairing:light:text/surface', 'palette.json freshness']);
    const failing = palette(paletteLog(['', 'FAILS:', '  light: text-subtle on surface-hover is 4.1:1, minimum 4.5:1', 'palette.json matches a fresh run']), 1);
    assert.equal(failing.verdict, 'validation-failure');
    assert.deepEqual(failing.failures, ['light: text-subtle on surface-hover is 4.1:1, below 4.5:1']);
    const edited = palette(paletteLog(['', 'ALL PAIRINGS PASS', 'palette.json differs from a fresh run:', '--- palette.json (committed)']), 1);
    assert.equal(edited.verdict, 'validation-failure');
    const traceback = palette('Traceback (most recent call last):\n  File "palette.py", line 3\nKeyError: \'mithril\'\n', 1);
    assert.equal(traceback.verdict, 'incomplete');
  });

  const vitestReport = (files: VitestReport['testResults'], success = true): VitestReport => ({ success, numTotalTests: 0, testResults: files });
  const file = (name: string, tests: [string, string][], status: 'passed' | 'failed' = 'passed', message = '') => ({
    name: `/run/source/${name}`,
    status,
    message,
    assertionResults: tests.map(([fullName, state]) => ({ fullName, status: state, failureMessages: state === 'failed' ? ['AssertionError: expected 1 to be 2\n    at x.test.ts:3'] : [] })),
  });
  const strip = (path: string) => relative('/run/source', path);

  test('vitest: files, tests and scenario cases are coverage; an assertion fails validation; a file that never loaded or a skip is incomplete', () => {
    const passing = vitest(vitestReport([file('a.test.ts', [['renders', 'passed']])]), strip);
    assert.equal(passing.verdict, 'passed');
    assert.deepEqual(passing.executed, ['a.test.ts > renders', 'a.test.ts']);

    const scenario = vitestReport([file('a.test.ts', [['closes', 'passed']])]);
    (scenario.testResults[0]?.assertionResults[0] as { meta?: object }).meta = { scenario: { case: 'dialog.keyboard-dismissal@ui-vitest[default]' } };
    assert.ok(vitest(scenario, strip).executed.includes('dialog.keyboard-dismissal@ui-vitest[default]'));

    const failing = vitest(vitestReport([file('a.test.ts', [['renders', 'failed'], ['closes', 'passed']], 'failed')], false), strip);
    assert.equal(failing.verdict, 'validation-failure');
    assert.deepEqual(failing.failures, ['a.test.ts > renders: AssertionError: expected 1 to be 2']);

    const unloaded = vitest(vitestReport([file('b.test.ts', [], 'failed', "Failed to load url ./missing (resolved id: ./missing)\n")], false), strip);
    assert.equal(unloaded.verdict, 'incomplete');
    assert.match(unloaded.reason ?? '', /b\.test\.ts: Failed to load url/);

    const skipped = vitest(vitestReport([file('a.test.ts', [['renders', 'passed'], ['later', 'skipped']])]), strip);
    assert.deepEqual(skipped.skipped, ['a.test.ts > later']);
    assert.match(judge({ ...skipped, process: null }, skipped.expected ?? []).reason, /required coverage was skipped: a\.test\.ts > later/);

    assert.equal(vitest(vitestReport([file('a.test.ts', [['renders', 'passed']])], false), strip).verdict, 'incomplete', 'an unhandled error names no test');
  });

  test('node --test: nested names, skips and todos are recorded; a file Node names as a whole never loaded', () => {
    const record = (event: string, name: string, nesting: number, extra: object = {}) =>
      JSON.stringify({ event, kind: 'test', file: '/run/source/scripts/a.test.ts', name, nesting, line: 1, skip: false, todo: false, failureType: null, message: null, ...extra });
    const lines = [
      record('pass', 'passes', 1),
      record('pass', 'later', 1, { todo: true }),
      record('pass', 'group', 0, { kind: 'suite' }),
      record('fail', 'fails', 0, { failureType: 'testCodeFailure', message: 'Expected values to be strictly equal:\n\n1 !== 2\n' }),
    ].join('\n');
    const parsed = nodeTest(lines, strip);
    assert.equal(parsed.verdict, 'validation-failure');
    assert.deepEqual(parsed.executed, ['scripts/a.test.ts', 'scripts/a.test.ts > fails', 'scripts/a.test.ts > group > passes']);
    assert.deepEqual(parsed.skipped, ['scripts/a.test.ts > group > later']);
    assert.deepEqual(parsed.failures, ['scripts/a.test.ts > fails: Expected values to be strictly equal:']);
    const whole = nodeTest(record('fail', 'a.test.ts', 0, { failureType: 'testCodeFailure', message: 'test failed' }), strip);
    assert.equal(whole.verdict, 'incomplete');
    assert.match(whole.reason ?? '', /scripts\/a\.test\.ts: test failed/);
    assert.equal(nodeTest(record('fail', 'slow', 1, { failureType: 'testTimeoutFailure' }), strip).verdict, 'incomplete');
  });
});

describe('the real tools against this repository', () => {
  test('architecture, catalogue freshness and the palette gate pass with coverage and retained evidence', async () => {
    for (const id of ['architecture', 'catalogue-freshness', 'palette'] as CheckId[]) {
      const { report, judged, context } = await runAdapter(id, root);
      assert.equal(judged.status, 'passed', `${id}: ${judged.reason}`);
      assert.ok(report.executed.length > 0, id);
      const evidence = JSON.parse(readFileSync(join(context.artifacts, `${id}.evidence.json`), 'utf8'));
      assert.equal(evidence.check, id);
      assert.deepEqual(evidence.planned.argv, check(id).argv);
      assert.deepEqual(evidence.executed.argv.slice(0, check(id).argv.length), check(id).argv, 'the adapter only appends report flags');
      assert.ok(evidence.configuration.length > 0 && evidence.configuration.every((entry: { sha256: string }) => /^[0-9a-f]{64}$/.test(entry.sha256)));
      for (const path of report.artifacts ?? []) assert.ok(existsSync(join(context.run, path)), path);
    }
  });

  test('the palette generator reports a hand-edited palette.json as a validation failure', async () => {
    const fixture = mkdtempSync(join(scratch, 'palette-'));
    mkdirSync(join(fixture, 'packages/tokens/scripts'), { recursive: true });
    copyFileSync(join(root, 'packages/tokens/scripts/palette.py'), join(fixture, 'packages/tokens/scripts/palette.py'));
    const committed = readFileSync(join(root, 'packages/tokens/scripts/palette.json'), 'utf8');
    writeFileSync(join(fixture, 'packages/tokens/scripts/palette.json'), committed.replace('#101011', '#101012'));
    const { report, judged } = await runAdapter('palette', fixture);
    assert.equal(judged.status, 'failed');
    assert.equal(judged.failure?.kind, 'validation');
    assert.match(report.failures?.join('\n') ?? '', /palette\.json differs from a fresh run/);
    assert.ok(report.executed.includes('contrast:dark') && report.executed.includes('contrast:light'), 'the gate itself still ran');
  });
});

describe('controlled failures through the real runners', () => {
  const vitestArgv = [process.execPath, VITEST, 'run', '--globals', '--reporter=verbose'];
  const TESTS = 'packages/tokens/src/__tests__';

  test('Vitest: an assertion is a validation failure, a file that never loads or a skip is incomplete', async () => {
    const failing = mkdtempSync(join(scratch, 'vitest-'));
    write(failing, { [`${TESTS}/a.test.ts`]: "test('holds', () => expect(1).toBe(1));\ntest('breaks', () => expect(1).toBe(2));\n" });
    const failed = await runAdapter('tokens-tests', failing, { argv: vitestArgv });
    assert.equal(failed.judged.failure?.kind, 'validation', failed.judged.reason);
    assert.match(failed.report.failures?.[0] ?? '', /a\.test\.ts > breaks: AssertionError: expected 1 to be 2/);
    assert.ok(failed.report.executed.includes(`${TESTS}/a.test.ts > holds`), 'the passing test is still recorded');

    const broken = mkdtempSync(join(scratch, 'vitest-'));
    write(broken, { [`${TESTS}/a.test.ts`]: "import './missing.ts';\ntest('holds', () => {});\n" });
    const unloaded = await runAdapter('tokens-tests', broken, { argv: vitestArgv });
    assert.equal(unloaded.judged.failure?.kind, 'incomplete', unloaded.judged.reason);

    const skipping = mkdtempSync(join(scratch, 'vitest-'));
    write(skipping, { [`${TESTS}/a.test.ts`]: "test('holds', () => {});\ntest.skip('later', () => {});\n" });
    const skipped = await runAdapter('tokens-tests', skipping, { argv: vitestArgv });
    assert.match(skipped.judged.reason, /required coverage was skipped/);
  });

  test('Vitest: a discovered file the runner did not collect, and zero tests, are incomplete', async () => {
    const partial = mkdtempSync(join(scratch, 'vitest-'));
    write(partial, { [`${TESTS}/a.test.ts`]: "test('holds', () => {});\n", [`${TESTS}/b.test.ts`]: "test('holds', () => {});\n" });
    const missing = await runAdapter('tokens-tests', partial, { argv: [...vitestArgv, 'a.test.ts'] });
    assert.match(missing.judged.reason, new RegExp(`expected coverage did not execute: ${TESTS}/b\\.test\\.ts`));

    const empty = mkdtempSync(join(scratch, 'vitest-'));
    write(empty, { [`${TESTS}/a.test.ts`]: '// no tests yet\n' });
    const zero = await runAdapter('tokens-tests', empty, { argv: vitestArgv });
    assert.equal(zero.judged.status, 'failed');
    assert.equal(zero.judged.failure?.kind, 'incomplete', zero.judged.reason);
  });

  test('a scoped Vitest run expects exactly the planned files', async () => {
    const fixture = mkdtempSync(join(scratch, 'vitest-'));
    write(fixture, { [`${TESTS}/a.test.ts`]: "test('holds', () => {});\n", [`${TESTS}/b.test.ts`]: "test('holds', () => {});\n" });
    const scoped = await runAdapter('tokens-tests', fixture, {
      scope: 'files',
      argv: [...vitestArgv, `${TESTS}/a.test.ts`],
      files: [{ path: `${TESTS}/a.test.ts`, present: true, reasons: ['reached'] }],
    });
    assert.equal(scoped.judged.status, 'passed', scoped.judged.reason);
    assert.ok(!scoped.report.executed.includes(`${TESTS}/b.test.ts`));
  });

  test('node --test: assertions fail validation, a skip or an empty file is incomplete', async () => {
    const fixture = mkdtempSync(join(scratch, 'node-test-'));
    write(fixture, {
      'scripts/catalogue/a.test.ts': "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\ntest('holds', () => {});\ntest('breaks', () => assert.equal(1, 2));\n",
      'scripts/verification/b.test.ts': "import { test } from 'node:test';\ntest('holds', () => {});\n",
    });
    const failed = await runAdapter('tooling-tests', fixture);
    assert.equal(failed.judged.failure?.kind, 'validation', failed.judged.reason);
    assert.deepEqual(failed.report.failures, ['scripts/catalogue/a.test.ts > breaks: Expected values to be strictly equal:']);
    assert.ok(failed.report.executed.includes('scripts/verification/b.test.ts > holds'));

    write(fixture, { 'scripts/catalogue/a.test.ts': "import { test } from 'node:test';\ntest('holds', () => {});\ntest('later', { skip: 'not yet' }, () => {});\n" });
    assert.match((await runAdapter('tooling-tests', fixture)).judged.reason, /required coverage was skipped: scripts\/catalogue\/a\.test\.ts > later/);

    write(fixture, { 'scripts/catalogue/a.test.ts': '// no tests yet\n' });
    assert.match((await runAdapter('tooling-tests', fixture)).judged.reason, /expected coverage did not execute: scripts\/catalogue\/a\.test\.ts/);
  });
});

describe('a run with real adapters', () => {
  test('keeps an independent pass, blocks the dependant of a failure, fails validation and agrees in human and JSON', async () => {
    const fixture = mkdtempSync(join(scratch, 'repository-'));
    write(fixture, {
      '.gitignore': '.scratch/\n',
      'scripts/catalogue/a.test.ts': "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\ntest('breaks', () => assert.equal(1, 2));\n",
      'scripts/verification/b.test.ts': "import { test } from 'node:test';\ntest('holds', () => {});\n",
      'packages/tokens/scripts/palette.json': readFileSync(join(root, 'packages/tokens/scripts/palette.json'), 'utf8'),
    });
    copyFileSync(join(root, 'packages/tokens/scripts/palette.py'), join(fixture, 'packages/tokens/scripts/palette.py'));
    for (const args of [['init', '-q'], ['add', '-A'], ['-c', 'user.name=F', '-c', 'user.email=f@example.com', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'base']]) {
      assert.equal(spawnSync('git', args, { cwd: fixture }).status, 0);
    }
    const ids: CheckId[] = ['catalogue-freshness', 'typecheck', 'tooling-tests', 'palette'];
    const plan = {
      schemaVersion: 1,
      command: 'release',
      status: 'planned',
      selectors: [],
      scope: 'scoped',
      // The tooling fixtures run on their own here, so the failing freshness check blocks only typecheck.
      checks: ids.map((id) => planned(id, { prerequisites: id === 'typecheck' ? ['catalogue-freshness'] : [] })),
    } as unknown as Plan;
    // Freshness exits 1 with a stale projection, as the real command reports it.
    const stale = {
      run: async (context: AdapterContext): Promise<AdapterReport> => {
        const report = join(context.artifacts, 'catalogue-freshness.json');
        writeFileSync(
          report,
          JSON.stringify({ schemaVersion: 1, command: 'catalogue:check', status: 'stale', outputs: [{ path: 'packages/ui/src/index.ts', state: 'changed' }], stale: [], catalogue: [], featureMap: [] }),
        );
        const process = await context.launch([globalThis.process.execPath, '-e', 'process.exit(1)']);
        return { ...freshness(readFileSync(report, 'utf8'), process.exitCode), process, artifacts: ['artifacts/catalogue-freshness.json'] };
      },
    };
    const report: Report = await executeRun({
      root: fixture,
      directory: join(mkdtempSync(join(scratch, 'out-')), 'run'),
      runId: 'adapters-run',
      command: 'release',
      selectors: [],
      planFrom: () => plan,
      adapters: { ...ADAPTERS, 'catalogue-freshness': stale },
      preparation: { argv: [process.execPath, '-e', ''], deadlineSeconds: 30 },
      probes: { python3: async () => null },
      overallDeadlineSeconds: 300,
      deadlineSource: 'test',
      graceMs: 500,
    });
    const state = (id: CheckId) => report.checks.find((entry) => entry.id === id);
    assert.equal(report.exit, EXIT.failed);
    assert.equal(state('palette')?.status, 'passed', state('palette')?.reason ?? '');
    assert.equal(state('catalogue-freshness')?.failure?.kind, 'validation');
    assert.equal(state('typecheck')?.status, 'blocked');
    assert.deepEqual(state('typecheck')?.blockedBy, ['catalogue-freshness']);
    assert.equal(state('tooling-tests')?.failure?.kind, 'validation');
    assert.deepEqual(state('tooling-tests')?.failure?.failures, ['scripts/catalogue/a.test.ts > breaks: Expected values to be strictly equal:']);
    assert.ok(state('tooling-tests')?.executed.includes('scripts/verification/b.test.ts'));
    for (const entry of report.checks) for (const path of entry.evidence) assert.ok(existsSync(join(report.directory.run, path)), path);

    const human = formatReport(report);
    const reread = JSON.parse(readFileSync(join(report.directory.run, 'report.json'), 'utf8')) as Report;
    assert.deepEqual(reread.checks, report.checks, 'the retained JSON is the report');
    for (const entry of reread.checks) {
      assert.ok(human.includes(`  ${entry.id}: ${entry.status}${entry.failure ? ` [${entry.failure.kind}]` : ''} — ${entry.reason}`), entry.id);
      if (entry.executed.length + entry.expected.length > 0) assert.ok(human.includes(`coverage: ${entry.executed.length} executed of ${entry.expected.length} expected`), entry.id);
      for (const failure of entry.failure?.failures ?? []) assert.ok(human.includes(failure), failure);
      for (const path of entry.evidence) assert.ok(human.includes(`evidence ${path}`), path);
    }
  });
});
