/**
 * Verification runs, proved with fixture repositories and controlled subprocesses: the frozen source
 * and its identity, coherence retries and a changed origin, private run directories and lockfile
 * preparation, the check DAG with locks, owned ports and servers, every check state and exit, timeouts,
 * crashes, cancellation with live descendants, partial and abandoned reports, and two dirty worktrees
 * running at once.
 */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { createServer, connect } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { execute } from '../verify.ts';
import { commandAdapter } from './adapters.ts';
import { type CheckId, check } from './checks.ts';
import type { Plan, PlannedCheck } from './plan.ts';
import { type Adapter, type AdapterContext, type Adapters, type Report, type RunOptions, EXIT, executeRun, judge, outcome } from './run.ts';
import { dirtyPaths, git as gitOf } from './changes.ts';
import { captureSource, hashSource } from './source.ts';

const here = dirname(fileURLToPath(import.meta.url));
const CONTROLLED = join(here, 'controlled.ts');
/** The controlled process, run the way the repository runs its TypeScript tooling. */
const NODE = [process.execPath, '--experimental-strip-types', CONTROLLED];
const scratch = mkdtempSync(join(tmpdir(), 'ultima-run-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

const IDENTITY = ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.com', '-c', 'commit.gpgsign=false', '-c', 'init.defaultBranch=main'];

function git(directory: string, ...args: string[]): string {
  const result = spawnSync('git', [...IDENTITY, ...args], { cwd: directory, encoding: 'utf8' });
  assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
}

function write(directory: string, files: Record<string, string>) {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(directory, path)), { recursive: true });
    writeFileSync(join(directory, path), text);
  }
}

function repository(files: Record<string, string> = { 'README.md': '# Fixture\n', 'src/value.txt': 'base\n', '.gitignore': 'ignored/\n' }): string {
  const directory = mkdtempSync(join(scratch, 'repo-'));
  git(directory, 'init', '-q');
  write(directory, files);
  git(directory, 'add', '-A');
  git(directory, 'commit', '-q', '-m', 'base');
  return directory;
}

const alive = (pid: number) => {
  try {
    process.kill(pid, 0);
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
    return !stat.slice(stat.lastIndexOf(')') + 2).startsWith('Z');
  } catch {
    return false;
  }
};

/** A plan of real check definitions, whole-scope, with per-check changes for the test. */
function planOf(ids: CheckId[], changes: Partial<Record<CheckId, Partial<PlannedCheck>>> = {}): Plan {
  const checks: PlannedCheck[] = ids.map((id) => {
    const definition = check(id);
    return {
      id,
      title: definition.title,
      status: 'planned',
      adapter: definition.adapter,
      argv: definition.argv,
      cwd: definition.cwd,
      nested: [],
      prerequisites: definition.prerequisites.filter((prerequisite) => ids.includes(prerequisite)),
      after: (definition.after ?? []).filter((earlier) => ids.includes(earlier)),
      locks: definition.locks,
      needs: definition.needs,
      deadlineSeconds: definition.deadlineSeconds,
      scope: 'whole',
      reasons: ['chosen by the test'],
      files: [],
      cases: [],
      ...changes[id],
    };
  });
  return { schemaVersion: 1, command: 'release', status: 'planned', selectors: [], scope: 'scoped', checks } as unknown as Plan;
}

/** Runs a controlled mode and reads the evidence file it writes into the run's artifacts. */
function controlled(mode: string, extra: (context: AdapterContext) => string[] = () => []): Adapter {
  return commandAdapter(
    (context) => [...NODE, mode, ...(mode === 'hang' || mode === 'orphan' ? [] : [join(context.artifacts, `${context.check.id}.json`)]), ...extra(context)],
    (context) => {
      const path = join(context.artifacts, `${context.check.id}.json`);
      if (!existsSync(path)) return { verdict: 'incomplete', executed: [], reason: 'the tool wrote no report' };
      const evidence = JSON.parse(readFileSync(path, 'utf8')) as { executed: string[]; failures: string[]; skipped: string[] };
      return {
        verdict: evidence.failures.length > 0 ? 'validation-failure' : 'passed',
        executed: evidence.executed,
        skipped: evidence.skipped,
        failures: evidence.failures,
        artifacts: [`artifacts/${context.check.id}.json`],
      };
    },
  );
}

const passing = (...ids: string[]) => controlled('pass', () => ids);

const NO_PREPARATION = { argv: [process.execPath, '-e', ''], deadlineSeconds: 30 };

async function runIn(root: string, plan: Plan, adapters: Adapters, extra: Partial<RunOptions> = {}): Promise<Report> {
  const directory = join(mkdtempSync(join(scratch, 'out-')), 'run');
  return executeRun({
    root,
    directory,
    runId: `test-${Math.random().toString(16).slice(2, 10)}`,
    command: 'release',
    selectors: [],
    planFrom: () => plan,
    adapters,
    preparation: NO_PREPARATION,
    probes: { python3: async () => null, chromium: async () => null, network: async () => null, 'loopback-port': async () => null },
    overallDeadlineSeconds: 120,
    deadlineSource: 'test',
    graceMs: 500,
    ...extra,
  });
}

const stateOf = (report: Report, id: CheckId) => report.checks.find((entry) => entry.id === id);

describe('source capture', () => {
  const root = repository({
    'README.md': '# Fixture\n',
    'src/value.txt': 'base\n',
    'src/gone.txt': 'deleted in the work tree\n',
    'src/staged.txt': 'base\n',
    'bin/run.sh': '#!/bin/sh\n',
    '.gitignore': 'ignored/\n',
  });
  chmodSync(join(root, 'bin/run.sh'), 0o755);
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'mode');
  writeFileSync(join(root, 'src/staged.txt'), 'staged\n');
  git(root, 'add', 'src/staged.txt');
  writeFileSync(join(root, 'src/value.txt'), 'unstaged\n');
  unlinkSync(join(root, 'src/gone.txt'));
  write(root, { 'notes/a file with spaces ü.txt': 'untracked\n', 'ignored/secret.txt': 'ignored\n', 'packages/x/node_modules/dep/index.js': 'dependency\n' });
  symlinkSync('../README.md', join(root, 'src/link'));

  const destination = join(scratch, 'capture');
  const capture = captureSource(root, destination);

  test('copies dirty, staged, untracked, executable and linked source, and nothing ignored', () => {
    assert.ok(capture.ok, capture.ok ? '' : capture.reason);
    assert.equal(readFileSync(join(destination, 'src/value.txt'), 'utf8'), 'unstaged\n');
    assert.equal(readFileSync(join(destination, 'src/staged.txt'), 'utf8'), 'staged\n');
    assert.equal(readFileSync(join(destination, 'notes/a file with spaces ü.txt'), 'utf8'), 'untracked\n');
    assert.equal(lstatSync(join(destination, 'bin/run.sh')).mode & 0o111, 0o111);
    assert.equal(readlinkSync(join(destination, 'src/link')), '../README.md');
    for (const absent of ['src/gone.txt', 'ignored/secret.txt', 'packages/x/node_modules/dep/index.js', '.git/refs/heads/main']) assert.ok(!existsSync(join(destination, absent)), absent);
  });

  test('is its own Git work tree at the captured HEAD, index and status', () => {
    assert.ok(capture.ok);
    assert.equal(git(destination, 'rev-parse', '--show-toplevel'), realpathSync(destination));
    assert.equal(git(destination, 'rev-parse', 'HEAD'), capture.identity.head);
    const snapshot = hashSource(destination);
    assert.ok(snapshot.ok, snapshot.ok ? '' : snapshot.reason);
    assert.equal(snapshot.manifest.digest, capture.identity.manifest.digest, 'Git lists the same files and the same bytes');
    assert.equal(snapshot.index.digest, capture.identity.index.digest);
    const status = (changes: ReturnType<typeof dirtyPaths>) => ('changes' in changes ? changes.changes.filter((change) => !change.path.includes('node_modules/')) : changes);
    assert.deepEqual(status(dirtyPaths(gitOf(destination))), status(dirtyPaths(gitOf(root))), 'staged, unstaged and untracked as in the checkout');
  });

  test('inside the checkout, Git in the snapshot resolves the snapshot and not the caller', () => {
    // Where `pnpm verify` places a run by default: under the checkout's ignored .scratch/.
    const origin = repository({ 'README.md': '# Fixture\n', 'src/value.txt': 'base\n', '.gitignore': '.scratch/\n' });
    writeFileSync(join(origin, 'src/value.txt'), 'dirty\n');
    const nested = join(origin, '.scratch/verify/run/source');
    const inside = captureSource(origin, nested);
    assert.ok(inside.ok, inside.ok ? '' : inside.reason);
    assert.equal(git(nested, 'rev-parse', '--show-toplevel'), realpathSync(nested));
    const again = hashSource(nested);
    assert.ok(again.ok, again.ok ? '' : again.reason);
    assert.equal(again.manifest.digest, inside.identity.manifest.digest);
    assert.equal(again.head, inside.identity.head);
    assert.equal(git(nested, 'diff', '--name-only'), 'src/value.txt', 'the edit is unstaged in the snapshot, as in the checkout');
    assert.equal(git(nested, 'diff', '--cached', '--name-only'), '');
    assert.equal(git(origin, 'status', '--porcelain', '--ignored', '--', '.scratch'), '!! .scratch/', 'the checkout still ignores the snapshot');
  });

  test('records a deterministic manifest, HEAD, the index apart from the bytes, status and exclusions', () => {
    assert.ok(capture.ok);
    const paths = capture.manifest.entries.map((entry) => entry.path);
    assert.deepEqual(paths, ['.gitignore', 'README.md', 'bin/run.sh', 'notes/a file with spaces ü.txt', 'src/link', 'src/staged.txt', 'src/value.txt']);
    assert.equal(capture.manifest.entries.find((entry) => entry.path === 'bin/run.sh')?.mode, '100755');
    assert.equal(capture.manifest.entries.find((entry) => entry.path === 'src/link')?.type, 'symlink');
    assert.equal(capture.identity.head, git(root, 'rev-parse', 'HEAD'));
    const status = capture.identity.status as { path: string; status: string; sources: string[] }[];
    assert.deepEqual(
      status.map((change) => `${change.status} ${change.path} ${change.sources.join('+')}`),
      [
        'added notes/a file with spaces ü.txt untracked',
        // Git's view, recorded as it is; the manifest applies the exclusions.
        'added packages/x/node_modules/dep/index.js untracked',
        'deleted src/gone.txt unstaged',
        'added src/link untracked',
        'modified src/staged.txt staged',
        'modified src/value.txt unstaged',
      ],
    );
    assert.ok(capture.identity.exclusions.some((exclusion) => exclusion.pattern === '.scratch/'));
    const again = hashSource(root);
    assert.ok(again.ok);
    assert.equal(again.manifest.digest, capture.identity.manifest.digest, 'the same bytes hash the same');

    // Staging the unstaged edit changes the index identity, not the tested bytes.
    git(root, 'add', 'src/value.txt');
    const staged = hashSource(root);
    assert.ok(staged.ok);
    assert.equal(staged.manifest.digest, capture.identity.manifest.digest);
    assert.notEqual(staged.index.digest, capture.identity.index.digest);
  });

  test('retries when the checkout moves during a copy, and fails after its bounded attempts', () => {
    const moving = repository();
    const retried = captureSource(moving, join(scratch, 'retry'), {
      afterCopy: (attempt) => attempt === 1 && writeFileSync(join(moving, 'src/value.txt'), 'moved\n'),
    });
    assert.ok(retried.ok);
    assert.equal(retried.attempts, 2);
    assert.equal(readFileSync(join(scratch, 'retry/src/value.txt'), 'utf8'), 'moved\n');

    const restless = captureSource(moving, join(scratch, 'restless'), {
      afterCopy: (attempt) => writeFileSync(join(moving, 'src/value.txt'), `attempt ${attempt}\n`),
    });
    assert.equal(restless.ok, false);
    assert.equal(restless.attempts, 3);
    assert.match(restless.ok ? '' : restless.reason, /no coherent snapshot after 3 attempts: the working-tree bytes changed while attempt 3 was copying/);
  });

  test('fails on an uninitialized submodule nothing supplies', () => {
    const parent = repository();
    git(parent, 'update-index', '--add', '--cacheinfo', `160000,${git(parent, 'rev-parse', 'HEAD')},vendor/lib`);
    const result = captureSource(parent, join(scratch, 'submodule'));
    assert.equal(result.ok, false);
    assert.match(result.ok ? '' : result.reason, /uninitialized submodule\(s\) vendor\/lib/);
  });
});

describe('judging a check', () => {
  const exited = (exitCode: number, status: 'exited' | 'signalled' | 'launch-failed' = 'exited') => ({
    argv: ['x'],
    cwd: '.',
    pid: 1,
    status,
    exitCode,
    signal: status === 'signalled' ? ('SIGSEGV' as const) : null,
    durationMs: 1,
    leftovers: [],
    survivors: [],
  });

  test('a zero exit with no executed coverage, a skipped expected test or a missing one is incomplete, never a pass', () => {
    assert.deepEqual(judge({ verdict: 'passed', process: exited(0), executed: [] }, []).failure?.kind, 'incomplete');
    assert.match(judge({ verdict: 'passed', process: exited(0), executed: ['b'], skipped: ['a'] }, ['a', 'b']).reason, /required coverage was skipped: a/);
    assert.match(judge({ verdict: 'passed', process: exited(0), executed: ['b'] }, ['a', 'b']).reason, /did not execute: a/);
    assert.match(judge({ verdict: 'passed', process: exited(1), executed: ['a'] }, ['a']).reason, /exited 1/);
    assert.equal(judge({ verdict: 'passed', process: exited(0), executed: ['a', 'b'] }, ['a']).status, 'passed');
  });

  test('a structured failure is validation; a crash or launch failure is incomplete', () => {
    assert.equal(judge({ verdict: 'validation-failure', process: exited(1), executed: ['a'], failures: ['a'] }, []).failure?.kind, 'validation');
    assert.equal(judge({ verdict: 'validation-failure', process: exited(0, 'signalled'), executed: [] }, []).failure?.kind, 'incomplete');
    assert.equal(judge({ verdict: 'passed', process: exited(0, 'launch-failed'), executed: ['a'] }, []).failure?.kind, 'incomplete');
  });

  test('exits: cancellation, then a validation failure, then anything short of a pass', () => {
    const entry = (status: string, kind?: 'validation' | 'incomplete') => ({ status, failure: kind ? { kind, reason: '', failures: [] } : null }) as never;
    assert.deepEqual(outcome([entry('passed'), entry('skipped')], { cancellation: null, incomplete: false }), { status: 'passed', exit: 0 });
    assert.deepEqual(outcome([entry('failed', 'validation'), entry('timed_out')], { cancellation: null, incomplete: false }), { status: 'failed', exit: 1 });
    assert.deepEqual(outcome([entry('failed', 'incomplete'), entry('passed')], { cancellation: null, incomplete: false }), { status: 'incomplete', exit: 3 });
    assert.deepEqual(outcome([entry('passed')], { cancellation: null, incomplete: true }), { status: 'incomplete', exit: 3 });
    assert.deepEqual(outcome([entry('failed', 'validation')], { cancellation: 'SIGINT', incomplete: false }), { status: 'cancelled', exit: 130 });
    assert.deepEqual(outcome([entry('passed')], { cancellation: 'SIGTERM', incomplete: false }), { status: 'cancelled', exit: 143 });
    assert.deepEqual(outcome([entry('skipped')], { cancellation: null, incomplete: false }), { status: 'incomplete', exit: 3 }, 'no required check is no pass');
  });
});

describe('executing the DAG', () => {
  test('passes only with coverage evidence, keeps independent evidence and blocks dependants of a failure', async () => {
    const root = repository();
    const report = await runIn(root, planOf(['architecture', 'catalogue-freshness', 'typecheck', 'tooling-tests']), {
      architecture: passing('architecture'),
      'catalogue-freshness': controlled('fail'),
      typecheck: passing('typecheck'),
      'tooling-tests': controlled('zero'),
    });
    assert.equal(report.exit, EXIT.failed);
    assert.equal(report.status, 'failed');
    assert.equal(stateOf(report, 'architecture')?.status, 'passed');
    assert.deepEqual(stateOf(report, 'architecture')?.evidence, ['logs/architecture.log', 'artifacts/architecture.json']);
    assert.equal(stateOf(report, 'catalogue-freshness')?.failure?.kind, 'validation');
    assert.deepEqual(stateOf(report, 'catalogue-freshness')?.failure?.failures, ['suite.test.ts > renders: expected 1, got 2']);
    assert.equal(stateOf(report, 'typecheck')?.status, 'blocked');
    assert.deepEqual(stateOf(report, 'typecheck')?.blockedBy, ['catalogue-freshness']);
    assert.equal(stateOf(report, 'tooling-tests')?.status, 'blocked', 'it too waits on freshness');
    assert.equal(stateOf(report, 'palette')?.status, 'skipped');
    for (const entry of report.checks) for (const path of entry.evidence) assert.ok(existsSync(join(report.directory.run, path)), path);
    const retained = JSON.parse(readFileSync(join(report.directory.run, 'report.json'), 'utf8')) as Report;
    assert.equal(retained.status, 'failed');
    assert.ok(!existsSync(join(report.directory.run, 'source')), 'the disposable snapshot is removed');
    assert.ok(existsSync(join(report.directory.run, 'artifacts/source-manifest.json')));
  });

  test('zero executed tests, a skipped required test, a crash and a missing adapter are incomplete', async () => {
    const root = repository();
    const report = await runIn(
      root,
      planOf(['architecture', 'catalogue-freshness', 'palette', 'typecheck'], { palette: { cases: ['palette.contrast'] } }),
      { architecture: controlled('zero'), 'catalogue-freshness': controlled('crash'), palette: controlled('skip', () => ['palette.contrast', 'other']) },
    );
    assert.equal(report.exit, EXIT.incomplete);
    assert.match(stateOf(report, 'architecture')?.reason ?? '', /zero executed tests cannot pass/);
    assert.match(stateOf(report, 'catalogue-freshness')?.reason ?? '', /killed by SIGSEGV/);
    assert.match(stateOf(report, 'palette')?.reason ?? '', /required coverage was skipped: palette\.contrast/);
    assert.equal(stateOf(report, 'typecheck')?.status, 'unavailable', 'no adapter wins over its blocked prerequisite');
  });

  test('a check whose prerequisite has no adapter is blocked before preparation, so it costs no install', async () => {
    const report = await runIn(repository(), planOf(['docs-build', 'production-scenarios']), { 'production-scenarios': passing('x') }, {
      preparation: { argv: [process.execPath, '-e', 'process.exit(9)'], deadlineSeconds: 30 },
    });
    assert.equal(report.exit, EXIT.incomplete);
    assert.equal(stateOf(report, 'docs-build')?.status, 'unavailable');
    assert.deepEqual([stateOf(report, 'production-scenarios')?.status, stateOf(report, 'production-scenarios')?.blockedBy], ['blocked', ['docs-build']]);
    assert.match(stateOf(report, 'production-scenarios')?.reason ?? '', /which cannot run/);
    assert.equal(report.preparation.status, 'not_run', 'the install that would fail never started');
  });

  test('a missing prerequisite makes its check unavailable and is recorded', async () => {
    const report = await runIn(repository(), planOf(['palette']), { palette: passing('x') }, { probes: { python3: async () => 'python3 is not on PATH' } });
    assert.equal(report.exit, EXIT.incomplete);
    assert.equal(stateOf(report, 'palette')?.status, 'unavailable');
    assert.deepEqual(report.prerequisites.find((entry) => entry.need === 'python3'), { need: 'python3', status: 'missing', detail: 'python3 is not on PATH' });
  });

  test('browser checks never overlap, while an independent check runs beside them', async () => {
    const log = join(scratch, `locks-${Date.now()}.log`);
    const timed = (id: string) => controlled('timed', () => [log, id, '400']);
    const report = await runIn(
      repository(),
      planOf(['architecture', 'ui-tests', 'docs-tests'], { 'ui-tests': { prerequisites: [] }, 'docs-tests': { prerequisites: [] }, architecture: { prerequisites: [] } }),
      { architecture: timed('architecture'), 'ui-tests': timed('ui-tests'), 'docs-tests': timed('docs-tests') },
      { concurrency: 3 },
    );
    assert.equal(report.exit, EXIT.passed, report.summary);
    const events = readFileSync(log, 'utf8').trim().split('\n').map((line) => line.split(' ')) as [string, string, string][];
    const span = (id: string) => [Number(events.find((e) => e[0] === id && e[1] === 'start')?.[2]), Number(events.find((e) => e[0] === id && e[1] === 'end')?.[2])] as const;
    const [uiStart, uiEnd] = span('ui-tests');
    const [docsStart, docsEnd] = span('docs-tests');
    const [archStart, archEnd] = span('architecture');
    assert.ok(docsStart >= uiEnd || uiStart >= docsEnd, 'the browser lock serialized them');
    assert.ok(archStart < Math.max(uiEnd, docsEnd) && archEnd > Math.min(uiStart, docsStart), 'the unlocked check overlapped');
  });

  test('a check that writes into the snapshot starts only after architecture and freshness finish, even when one fails', async () => {
    const log = join(scratch, `after-${Date.now()}.log`);
    const timed = (id: string) => controlled('timed', () => [log, id, '300']);
    const report = await runIn(
      repository(),
      planOf(['architecture', 'catalogue-freshness', 'cli-tests'], { 'cli-tests': { prerequisites: [] } }),
      { architecture: controlled('fail'), 'catalogue-freshness': timed('catalogue-freshness'), 'cli-tests': timed('cli-tests') },
      { concurrency: 3 },
    );
    assert.equal(stateOf(report, 'architecture')?.failure?.kind, 'validation');
    assert.equal(stateOf(report, 'cli-tests')?.status, 'passed', 'an ordering is not a prerequisite, so a failed architecture check blocks nothing');
    const events = readFileSync(log, 'utf8').trim().split('\n').map((line) => line.split(' ')) as [string, string, string][];
    const at = (id: string, event: string) => Number(events.find((e) => e[0] === id && e[1] === event)?.[2]);
    assert.ok(at('cli-tests', 'start') >= at('catalogue-freshness', 'end'), 'cli-tests waited for freshness');
  });

  test('a timeout stops the whole owned tree, including a descendant that left the process group', async () => {
    const pids = join(scratch, `hang-${Date.now()}.json`);
    const report = await runIn(repository(), planOf(['architecture'], { architecture: { deadlineSeconds: 1 } }), { architecture: controlled('hang', () => [pids]) });
    assert.equal(stateOf(report, 'architecture')?.status, 'timed_out');
    assert.equal(report.exit, EXIT.incomplete);
    const owned = JSON.parse(readFileSync(pids, 'utf8')) as number[];
    assert.equal(owned.length, 3);
    for (const pid of owned) assert.equal(alive(pid), false, `pid ${pid} survived`);
    assert.deepEqual(report.cleanup.survivors, []);
  });

  test('descendants a finished check leaves behind are stopped and recorded', async () => {
    const pids = join(scratch, `orphan-${Date.now()}.json`);
    const report = await runIn(repository(), planOf(['architecture']), {
      architecture: commandAdapter(
        (context) => [...NODE, 'orphan', pids, join(context.artifacts, 'orphan.json')],
        (context) => ({ verdict: 'passed', executed: (JSON.parse(readFileSync(join(context.artifacts, 'orphan.json'), 'utf8')) as { executed: string[] }).executed }),
      ),
    });
    assert.equal(stateOf(report, 'architecture')?.status, 'passed');
    const [left] = JSON.parse(readFileSync(pids, 'utf8')) as number[];
    assert.equal(alive(left as number), false);
    assert.ok(stateOf(report, 'architecture')?.processes[0]?.leftovers.includes(left as number));
  });

  test('the overall deadline stops what runs and leaves the rest not run', async () => {
    const pids = join(scratch, `overall-${Date.now()}.json`);
    const report = await runIn(repository(), planOf(['catalogue-freshness', 'typecheck']), { 'catalogue-freshness': controlled('hang', () => [pids]), typecheck: passing('t') }, { overallDeadlineSeconds: 1 });
    assert.equal(stateOf(report, 'catalogue-freshness')?.status, 'timed_out');
    assert.equal(stateOf(report, 'typecheck')?.status, 'not_run');
    assert.match(stateOf(report, 'typecheck')?.reason ?? '', /overall deadline expired before it started/);
    assert.equal(report.exit, EXIT.incomplete);
  });
});

describe('owned servers', () => {
  const serverAdapter = (mode: string, extra: string[] = []): Adapter => ({
    async run(context) {
      const started = await context.startServer([...NODE, mode, ...extra], { readinessMs: 3000 });
      if ('failure' in started) return { verdict: 'incomplete', process: null, executed: [], reason: started.failure };
      const response = await fetch(started.server.url);
      const stopped = await started.server.stop();
      return { verdict: 'passed', process: null, executed: [`${response.status}`], reason: `stopped ${stopped.status}` };
    },
  });

  test('a server proves its nonce on a fresh port and is stopped with the check', async () => {
    const report = await runIn(repository(), planOf(['consumer-smoke'], { 'consumer-smoke': { prerequisites: [] } }), { 'consumer-smoke': serverAdapter('server') });
    const entry = stateOf(report, 'consumer-smoke');
    assert.equal(entry?.status, 'passed', entry?.reason ?? '');
    assert.equal(entry?.servers.length, 1);
    assert.match(entry?.servers[0]?.url ?? '', /^http:\/\/127\.0\.0\.1:\d+$/);
    assert.equal(await refused(entry?.servers[0]?.port as number), true, 'the port was released');
  });

  test('a stale identity or a failed bind never becomes an owned server', async () => {
    const stale = await runIn(repository(), planOf(['consumer-smoke'], { 'consumer-smoke': { prerequisites: [] } }), { 'consumer-smoke': serverAdapter('stale-server') });
    const staleEntry = stateOf(stale, 'consumer-smoke');
    assert.equal(staleEntry?.status, 'failed');
    assert.equal(staleEntry?.failure?.kind, 'incomplete');
    assert.match(staleEntry?.reason ?? '', /foreign identity \(wrong nonce\)/);
    assert.equal(staleEntry?.servers[0]?.attempts.length, 3);

    const foreign = createServer().listen(0, '127.0.0.1');
    await new Promise((resolve) => foreign.once('listening', resolve));
    const port = (foreign.address() as { port: number }).port;
    try {
      const busy = await runIn(repository(), planOf(['consumer-smoke'], { 'consumer-smoke': { prerequisites: [] } }), { 'consumer-smoke': serverAdapter('busy-server', [String(port)]) });
      const busyEntry = stateOf(busy, 'consumer-smoke');
      assert.equal(busyEntry?.status, 'failed');
      assert.match(busyEntry?.reason ?? '', /exited before it was ready \(exited 98\)/);
      assert.equal(busy.exit, EXIT.incomplete);
    } finally {
      foreign.close();
    }
  });
});

function refused(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect(port, '127.0.0.1');
    socket.once('connect', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(true));
  });
}

describe('cancellation', () => {
  test('stops live processes and servers, keeps finished results and flushes a readable report', async () => {
    const controller = new AbortController();
    const pids = join(scratch, `cancel-${Date.now()}.json`);
    let port = 0;
    const plan = planOf(['architecture', 'catalogue-freshness', 'typecheck', 'production-scenarios'], {
      'production-scenarios': { prerequisites: [] },
    });
    const report = await runIn(
      repository(),
      plan,
      {
        architecture: passing('architecture'),
        'catalogue-freshness': controlled('hang', () => [pids]),
        typecheck: passing('typecheck'),
        'production-scenarios': {
          async run(context) {
            const started = await context.startServer([...NODE, 'server'], { readinessMs: 3000 });
            if ('failure' in started) return { verdict: 'incomplete', process: null, executed: [], reason: started.failure };
            port = started.server.port;
            // Cancel while the server is live, and leave stopping it to the runner.
            setTimeout(() => controller.abort('SIGTERM'), 300);
            await new Promise((resolve) => context.signal.addEventListener('abort', resolve, { once: true }));
            return { verdict: 'incomplete', process: null, executed: [] };
          },
        },
      },
      { signal: controller.signal, concurrency: 2 },
    );
    assert.equal(report.exit, EXIT.SIGTERM);
    assert.equal(report.status, 'cancelled');
    assert.equal(report.cancellation, 'SIGTERM');
    assert.equal(stateOf(report, 'architecture')?.status, 'passed', 'results reached before cancellation are kept');
    assert.equal(stateOf(report, 'typecheck')?.status, 'not_run');
    const retained = JSON.parse(readFileSync(join(report.directory.run, 'report.json'), 'utf8')) as Report;
    assert.equal(retained.status, 'cancelled');
    assert.equal(await refused(port), true);
    if (existsSync(pids)) for (const pid of JSON.parse(readFileSync(pids, 'utf8')) as number[]) assert.equal(alive(pid), false);
  });

  test('SIGINT during a running check cancels it with exit 130', async () => {
    const controller = new AbortController();
    const pids = join(scratch, `sigint-${Date.now()}.json`);
    setTimeout(() => controller.abort('SIGINT'), 700);
    const report = await runIn(repository(), planOf(['architecture', 'typecheck', 'catalogue-freshness']), { architecture: controlled('hang', () => [pids]) }, { signal: controller.signal });
    assert.equal(report.exit, EXIT.SIGINT);
    assert.equal(stateOf(report, 'architecture')?.status, 'cancelled');
    for (const pid of JSON.parse(readFileSync(pids, 'utf8')) as number[]) assert.equal(alive(pid), false, `pid ${pid} survived`);
  });
});

describe('the command under a real signal', () => {
  test('SIGTERM to pnpm verify writes a cancelled report and exits 143', async () => {
    const output = join(mkdtempSync(join(scratch, 'signal-')), 'evidence');
    const child = spawn(process.execPath, ['--experimental-strip-types', join(here, '../verify.ts'), 'release', '--output', output, '--json'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    // The handlers are installed before the capture starts, which it announces on stderr.
    child.stderr.on('data', (chunk: Buffer) => {
      if (chunk.toString().includes('capturing the checkout')) child.kill('SIGTERM');
    });
    const code = await new Promise((resolve) => child.once('exit', resolve));
    assert.equal(code, EXIT.SIGTERM);
    const document = JSON.parse(stdout) as Report;
    assert.equal(document.status, 'cancelled');
    assert.equal(document.cancellation, 'SIGTERM');
    assert.deepEqual(JSON.parse(readFileSync(join(output, 'report.json'), 'utf8')), document);
  });
});

describe('reports', () => {
  test('an unfinished report exists while checks run, and an abandoned run is diagnosed, not trusted', async () => {
    const root = repository();
    write(root, {
      '.scratch/verify/old-run/report.json': JSON.stringify({ status: 'unfinished', runId: 'old-run', environment: { pid: 2 ** 22 + 1, host: 'elsewhere' }, timestamps: { started: '2026-01-01T00:00:00Z' } }),
    });
    const report = await runIn(root, planOf(['architecture']), {
      architecture: commandAdapter(
        (context) => [...NODE, 'report', join(context.run, 'report.json'), join(context.artifacts, 'seen.json')],
        (context) => {
          const seen = JSON.parse(readFileSync(join(context.artifacts, 'seen.json'), 'utf8')) as { executed: string[]; seen: Report };
          return { verdict: seen.seen.status === 'unfinished' ? 'passed' : 'validation-failure', executed: seen.executed, failures: [seen.seen.status] };
        },
      ),
    });
    assert.equal(report.exit, EXIT.passed, report.summary);
    assert.deepEqual(report.abandonedRuns.map((run) => [run.runId, run.state]), [['old-run', 'abandoned']]);
  });

  test('a source changed during the run keeps its evidence but exits incomplete', async () => {
    const root = repository();
    const report = await runIn(root, planOf(['architecture']), {
      architecture: commandAdapter(
        (context) => [...NODE, 'mutate', join(root, 'src/value.txt'), join(context.artifacts, 'm.json')],
        (context) => ({ verdict: 'passed', executed: (JSON.parse(readFileSync(join(context.artifacts, 'm.json'), 'utf8')) as { executed: string[] }).executed }),
      ),
    });
    assert.equal(stateOf(report, 'architecture')?.status, 'passed');
    assert.equal(report.source.sourceChanged, true);
    assert.equal(report.source.completion?.status, 'changed');
    assert.equal(report.exit, EXIT.incomplete);
    assert.match(report.summary, /changed during the run/);
  });

  test('a capture that cannot cohere runs nothing and exits incomplete', async () => {
    const root = repository();
    const report = await runIn(root, planOf(['architecture']), { architecture: passing('a') }, {
      capture: { afterCopy: (attempt) => writeFileSync(join(root, 'src/value.txt'), `${attempt}\n`) },
    });
    assert.equal(report.exit, EXIT.incomplete);
    assert.equal(report.source.capture.status, 'failed');
    assert.ok(report.checks.every((entry) => entry.status === 'not_run'));
  });
});

describe('preparation', () => {
  const manifest = JSON.stringify({ name: 'fixture', private: true, version: '0.0.0' });
  const lockfile = "lockfileVersion: '9.0'\n\nsettings:\n  autoInstallPeers: true\n  excludeLinksFromLockfile: false\n\nimporters:\n\n  .: {}\n";

  test('installs from the snapshot lockfile into the run, never the caller checkout', async () => {
    const root = repository({ 'package.json': manifest, 'pnpm-lock.yaml': lockfile, 'README.md': '# Fixture\n' });
    const report = await runIn(root, planOf(['architecture']), {
      architecture: commandAdapter(
        (context) => [process.execPath, '-e', `require('fs').writeFileSync(${JSON.stringify(join(context.artifacts, 'nm.json'))}, JSON.stringify({ executed: require('fs').existsSync('node_modules') ? ['node_modules'] : [] }))`],
        (context) => ({ verdict: 'passed', executed: (JSON.parse(readFileSync(join(context.artifacts, 'nm.json'), 'utf8')) as { executed: string[] }).executed }),
      ),
    }, { preparation: { argv: ['pnpm', 'install', '--frozen-lockfile', '--offline'], deadlineSeconds: 120 } });
    assert.equal(report.preparation.status, 'passed', report.preparation.reason);
    assert.equal(report.exit, EXIT.passed, report.summary);
    assert.ok(report.preparation.lockfile);
    assert.ok(!existsSync(join(root, 'node_modules')), 'the caller checkout gained no dependencies');
    assert.equal(report.source.sourceChanged, false);
  });

  test('a lockfile that does not match its manifest blocks every check', async () => {
    const root = repository({ 'package.json': JSON.stringify({ name: 'fixture', private: true, dependencies: { 'left-pad': '1.3.0' } }), 'pnpm-lock.yaml': lockfile });
    const report = await runIn(root, planOf(['architecture']), { architecture: passing('a') }, { preparation: { argv: ['pnpm', 'install', '--frozen-lockfile', '--offline'], deadlineSeconds: 120 } });
    assert.equal(report.preparation.status, 'failed');
    assert.equal(stateOf(report, 'architecture')?.status, 'blocked');
    assert.deepEqual(stateOf(report, 'architecture')?.blockedBy, ['preparation']);
    assert.equal(report.exit, EXIT.incomplete);
  });

  test('is not run when no selected check can execute', async () => {
    const report = await runIn(repository(), planOf(['architecture']), {});
    assert.equal(report.preparation.status, 'not_run');
    assert.equal(report.exit, EXIT.incomplete);
  });
});

describe('two dirty worktrees at once', () => {
  test('capture distinct bytes, write only their own outputs and own distinct ports', async () => {
    const base = repository();
    const trees = ['one', 'two'].map((name) => {
      const tree = join(scratch, `worktree-${name}-${Date.now()}`);
      git(base, 'worktree', 'add', '-q', '-b', name, tree);
      writeFileSync(join(tree, 'src/value.txt'), `${name}\n`);
      writeFileSync(join(tree, `untracked-${name}.txt`), name);
      return tree;
    });
    const generating: Adapter = {
      async run(context) {
        const started = await context.startServer([...NODE, 'server'], { readinessMs: 3000 });
        if ('failure' in started) return { verdict: 'incomplete', process: null, executed: [], reason: started.failure };
        const value = readFileSync(join(context.source, 'src/value.txt'), 'utf8').trim();
        mkdirSync(join(context.source, 'generated'), { recursive: true });
        writeFileSync(join(context.source, 'generated/out.txt'), value);
        writeFileSync(join(context.artifacts, 'generated.txt'), `${value} ${started.server.port}`);
        await new Promise((resolve) => setTimeout(resolve, 300));
        await started.server.stop();
        return { verdict: 'passed', process: null, executed: [value], artifacts: ['artifacts/generated.txt'] };
      },
    };
    const plan = planOf(['consumer-smoke'], { 'consumer-smoke': { prerequisites: [] } });
    const [one, two] = await Promise.all(trees.map((tree) => runIn(tree, plan, { 'consumer-smoke': generating })));
    assert.ok(one && two);
    for (const [report, name, tree] of [[one, 'one', trees[0]], [two, 'two', trees[1]]] as const) {
      assert.equal(report.exit, EXIT.passed, report.summary);
      assert.deepEqual(stateOf(report, 'consumer-smoke')?.executed, [name]);
      assert.equal(readFileSync(join(report.directory.run, 'artifacts/generated.txt'), 'utf8').split(' ')[0], name);
      assert.ok(!existsSync(join(tree as string, 'generated')), 'nothing was generated into the caller checkout');
      assert.equal(report.source.sourceChanged, false);
    }
    assert.notEqual(one.source.identity?.manifest.digest, two.source.identity?.manifest.digest);
    assert.notEqual(one.directory.run, two.directory.run);
    assert.notEqual(stateOf(one, 'consumer-smoke')?.servers[0]?.port, stateOf(two, 'consumer-smoke')?.servers[0]?.port);
  });
});

describe('the verify command', () => {
  test('runs a real mode in .scratch/verify; with no adapter registered it reports every check unavailable and exits 3 with one JSON document', async () => {
    const root = repository({ 'README.md': '# Fixture\n', '.gitignore': '.scratch/\n' });
    const output = await execute(['release', '--json'], root, { adapters: {}, runner: { preparation: NO_PREPARATION } });
    assert.equal(output.exit, EXIT.incomplete);
    const document = JSON.parse(output.stdout) as Report;
    assert.equal(document.kind, 'verification-run');
    assert.equal(document.status, 'incomplete');
    assert.ok(document.directory.run.startsWith(join(root, '.scratch/verify/')));
    assert.ok(document.checks.filter((entry) => entry.status !== 'skipped').every((entry) => entry.status === 'unavailable'));
    assert.equal(document.preparation.status, 'not_run');
    assert.ok(existsSync(join(document.directory.run, 'report.json')));
    assert.equal(git(root, 'status', '--porcelain'), '', 'the run left nothing Git sees in the checkout');
  });

  test('refuses a non-empty or in-checkout --output with exit 2', async () => {
    const root = repository();
    const full = mkdtempSync(join(scratch, 'full-'));
    writeFileSync(join(full, 'x'), '');
    const nonEmpty = await execute(['release', '--output', full, '--json'], root);
    assert.equal(nonEmpty.exit, EXIT.usage);
    assert.match(JSON.parse(nonEmpty.stdout).message, /not empty/);
    const inside = await execute(['release', '--output', join(root, 'evidence')], root);
    assert.equal(inside.exit, EXIT.usage);
    assert.match(inside.stderr, /inside the checkout/);
  });

  test('writes a run to a new --output directory, with human output summarizing the same report', async () => {
    const root = repository();
    const directory = join(mkdtempSync(join(scratch, 'evidence-')), 'new');
    const output = await execute(['release', '--output', directory], root, { adapters: {}, runner: { preparation: NO_PREPARATION } });
    assert.equal(output.exit, EXIT.incomplete);
    assert.equal(output.report?.directory.run, directory);
    assert.match(output.stdout, /^verify release: incomplete \(exit 3\)/);
    for (const entry of output.report?.checks ?? []) assert.ok(output.stdout.includes(`  ${entry.id}: ${entry.status}`), entry.id);
    assert.ok(!existsSync(join(root, '.scratch')));
  });
});
