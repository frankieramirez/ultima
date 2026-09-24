/**
 * Verification planning, proved on fixture Git repositories: named scopes, the changed set with its
 * deletions, renames, staged-only and untracked paths, every documented fallback, and the check DAG
 * against the CI workflows. Planning runs Git to read changes and nothing else.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { memoryFiles } from '../catalogue/files.ts';
import { execute, run } from '../verify.ts';
import { CHECKS, CI_OBLIGATIONS, RELEASE_PENDING, check } from './checks.ts';
import { validFixture } from './fixture.ts';
import { type Plan, plan, snapshot } from './plan.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const scratch = mkdtempSync(join(tmpdir(), 'ultima-plan-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

const IDENTITY = ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.com', '-c', 'commit.gpgsign=false', '-c', 'init.defaultBranch=main'];

function git(directory: string, ...args: string[]): string {
  const result = spawnSync('git', [...IDENTITY, ...args], { cwd: directory, encoding: 'utf8' });
  assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
}

/** The verification fixture as a small workspace: package manifests, a barrel and the registration helpers. */
function workspace(): Record<string, string> {
  return {
    ...validFixture(),
    'package.json': JSON.stringify({ name: 'fixture', private: true }),
    'packages/ui/package.json': JSON.stringify({
      name: '@ultima/ui',
      exports: { '.': './src/index.ts', './lib/*': './src/lib/*.ts', './*': './src/*.tsx' },
    }),
    'packages/tokens/package.json': JSON.stringify({ name: '@ultima/tokens', exports: { './tokens.stylex': './src/tokens.stylex.ts' } }),
    'packages/elements/package.json': JSON.stringify({ name: '@ultima/elements' }),
    'apps/docs/package.json': JSON.stringify({ name: '@ultima/docs' }),
    'packages/ui/src/index.ts': [
      "export { Button, type ButtonProps } from './button';",
      "export { Sidebar, type SidebarRootProps, useSidebar } from './sidebar';",
    ].join('\n'),
    'registry/items.config.ts': 'export const items = {};\n',
    'scripts/verification/register.ts': 'export function scenario() {}\n',
    'scripts/verification/production.ts': 'export function productionScenario() {}\n',
    'apps/docs/src/layout.tsx': "import { Button } from '@ultima/ui';\nexport const Layout = () => <Button />;\n",
    'docs/guide.md': '# Guide\n',
  };
}

function write(directory: string, files: Record<string, string>) {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(directory, path)), { recursive: true });
    writeFileSync(join(directory, path), text);
  }
}

/** A committed fixture whose `origin/main` is its first commit, on a branch ready for changes. */
function repository(files = workspace()): string {
  const directory = mkdtempSync(join(scratch, 'repo-'));
  git(directory, 'init', '-q');
  write(directory, files);
  git(directory, 'add', '-A');
  git(directory, 'commit', '-q', '-m', 'base');
  git(directory, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  git(directory, 'checkout', '-q', '-b', 'change');
  return directory;
}

function commit(directory: string, message = 'change') {
  git(directory, 'add', '-A');
  git(directory, 'commit', '-q', '-m', message);
}

function planOf(argv: string[], at: string): { exit: number; document: Plan & Record<string, unknown>; human: string } {
  const output = run([...argv, '--plan', '--json'], at);
  const human = run([...argv, '--plan'], at);
  assert.equal(human.exit, output.exit);
  return { exit: output.exit, document: JSON.parse(output.stdout), human: human.stdout };
}

const checkIds = (document: Plan): string[] => document.checks.map((entry) => entry.id);
const checkOf = (document: Plan, id: string) => document.checks.find((entry) => entry.id === id);
const filesOf = (document: Plan, id: string) => checkOf(document, id)?.files.map((file) => file.path) ?? [];
const GLOBAL = ['architecture', 'catalogue-freshness', 'typecheck'];
const RELEASE = CHECKS.map((entry) => entry.id);

function assertPlanned(document: Plan) {
  assert.equal(document.status, 'planned');
  assert.equal(document.outcome.ran, 0);
  assert.equal(document.outcome.passed, 0);
  const unavailable = document.checks.filter((entry) => check(entry.id).adapter.status === 'unavailable').map((entry) => entry.id);
  assert.deepEqual(document.outcome.unavailable, unavailable);
  assert.equal(
    document.outcome.canPass,
    unavailable.length === 0 && document.outcome.pending.length === 0,
    'a plan can lead to a pass only when every selected check has an adapter and no release obligation is pending',
  );
  assert.deepEqual(document.outcome.pending, document.scope === 'release' ? [...RELEASE_PENDING] : []);
  for (const id of GLOBAL) assert.ok(checkIds(document).includes(id), `${id} runs in every executable plan`);
  for (const entry of document.checks) {
    assert.equal(entry.status, 'planned');
    assert.deepEqual(entry.adapter, check(entry.id).adapter);
    assert.ok(entry.reasons.length > 0, `${entry.id} explains its selection`);
    for (const prerequisite of [...entry.prerequisites, ...entry.after]) {
      assert.ok(checkIds(document).indexOf(prerequisite) < checkIds(document).indexOf(entry.id), `${prerequisite} precedes ${entry.id}`);
    }
  }
}

/** Every fact in the JSON plan also appears in the human plan. */
function assertAgree(document: Plan, human: string) {
  for (const entry of document.checks) {
    assert.ok(human.includes(`${entry.id} [${entry.scope}]`), entry.id);
    assert.ok(human.includes(entry.argv.join(' ')), entry.argv.join(' '));
    for (const file of entry.files) assert.ok(human.includes(`file ${file.path}`), file.path);
    for (const caseId of entry.cases) assert.ok(human.includes(caseId), caseId);
    for (const reason of entry.reasons) assert.ok(human.includes(reason), reason);
    if (entry.prerequisites.length > 0) assert.ok(human.includes(`requires passed: ${entry.prerequisites.join(', ')}`), entry.id);
    if (entry.after.length > 0) assert.ok(human.includes(`after finished: ${entry.after.join(', ')}`), entry.id);
  }
  for (const fallback of document.fallbacks) {
    assert.ok(human.includes(fallback.reason));
    for (const path of fallback.paths) assert.ok(human.includes(path), path);
  }
  for (const change of document.changes) assert.ok(human.includes(change.path) && human.includes(change.mapping), change.path);
  for (const item of document.selection.items) assert.ok(human.includes(`item ${item.id}`));
  for (const scenario of document.selection.scenarios) assert.ok(human.includes(`scenario ${scenario.id}`));
  assert.ok(human.includes(document.outcome.note));
}

describe('named scopes', () => {
  const directory = repository();

  test('component button: its suite, dependants, element counterpart, demos, scenarios and installation, each explained', () => {
    const { exit, document, human } = planOf(['component', 'button'], directory);
    assert.equal(exit, 0);
    assertPlanned(document);
    assertAgree(document, human);
    assert.equal(document.scope, 'scoped');
    assert.deepEqual(document.fallbacks, []);
    assert.deepEqual(filesOf(document, 'ui-tests'), ['packages/ui/src/__tests__/button.test.tsx', 'packages/ui/src/__tests__/sidebar.test.tsx']);
    assert.match(checkOf(document, 'ui-tests')?.files[1]?.reasons.join() ?? '', /packages\/ui\/src\/button\.tsx <- packages\/ui\/src\/sidebar\.tsx/);
    assert.deepEqual(document.selection.items.map((item) => [item.id, item.kind]), [
      ['button', 'react'],
      ['data-table', 'recipe'],
      ['sidebar', 'react'],
      ['ult-button', 'element'],
    ]);
    assert.match(document.selection.items[1]?.reasons.join() ?? '', /sorting\.tsx/, 'the recipe whose demo composes Button');
    assert.equal(checkOf(document, 'elements-tests')?.scope, 'whole');
    assert.match(checkOf(document, 'elements-tests')?.reasons.join() ?? '', /ult-button.*parity/);
    for (const id of ['registry-build', 'docs-build', 'consumer-smoke', 'production-scenarios']) assert.ok(checkIds(document).includes(id), id);
    assert.deepEqual(checkOf(document, 'ui-tests')?.cases, ['button.press@ui-vitest[default]']);
    assert.equal(checkOf(document, 'production-scenarios')?.cases.length, 4);
    assert.deepEqual(checkOf(document, 'ui-tests')?.argv.slice(-2), ['src/__tests__/button.test.tsx', 'src/__tests__/sidebar.test.tsx']);
    assert.ok(!checkIds(document).includes('palette'), 'no token input changed');
  });

  test('a recipe selects its executable composition without inventing a registry item', () => {
    const { document } = planOf(['component', 'data-table'], directory);
    assertPlanned(document);
    assert.deepEqual(document.selection.items.find((item) => item.id === 'data-table')?.kind, 'recipe');
    assert.ok(filesOf(document, 'ui-tests').includes('packages/ui/src/__tests__/button.test.tsx'), 'composed Button proof');
    assert.ok(filesOf(document, 'ui-tests').includes('packages/ui/src/__tests__/sidebar.test.tsx'), 'composed Sidebar proof');
    assert.match(checkOf(document, 'registry-build')?.reasons.join() ?? '', /recipe data-table has no registry item; install validation applies to its composed inputs/);
    assert.ok(!(checkOf(document, 'registry-build')?.reasons.join() ?? '').includes('data-table is a distributed'));
    assert.ok(checkIds(document).includes('docs-build'));
  });

  test('a setup item selects consumer installation and the registry build', () => {
    const { document } = planOf(['component', 'setup-vite'], directory);
    assertPlanned(document);
    assert.equal(document.scope, 'scoped');
    for (const id of ['registry-build', 'consumer-smoke']) assert.ok(checkIds(document).includes(id), id);
    assert.ok(!checkIds(document).includes('ui-tests'));
  });

  test('a token source bundle or token export selects the release plan', () => {
    for (const id of ['tokens', 'tokens-css']) {
      const { document } = planOf(['component', id], directory);
      assert.equal(document.scope, 'release', id);
      assert.deepEqual(checkIds(document).sort(), [...RELEASE].sort());
    }
  });

  test('feature button: every scenario case, its items and source roots', () => {
    const { document } = planOf(['feature', 'button'], directory);
    assertPlanned(document);
    assert.deepEqual(document.selection.features.map((feature) => feature.id), ['button']);
    assert.deepEqual(checkOf(document, 'production-scenarios')?.cases, [
      'button.press@production[mode=dark,viewport=desktop,motion=normal]',
      'button.press@production[mode=dark,viewport=narrow,motion=normal]',
      'button.press@production[mode=light,viewport=desktop,motion=normal]',
      'button.press@production[mode=light,viewport=narrow,motion=normal]',
    ]);
  });

  test('a named scope discloses dirty paths outside it and recommends changed or release', () => {
    const dirty = repository();
    write(dirty, { 'docs/guide.md': '# Changed\n', 'packages/ui/src/button.tsx': `${readFileSync(join(dirty, 'packages/ui/src/button.tsx'), 'utf8')}\n` });
    const { document, human } = planOf(['component', 'button'], dirty);
    assert.deepEqual((document.unrelatedDirty as { paths: string[] }).paths, ['docs/guide.md']);
    assert.match(human, /pnpm verify changed --base origin\/main/);
  });

  test('unknown IDs and options exit 2 with the choices', () => {
    for (const argv of [
      ['component', 'buton'],
      ['feature', 'buttons'],
      ['component'],
      ['changed', '--bogus'],
      ['changed', 'button'],
      ['release', 'button'],
      ['component', 'button', '--base', 'origin/main'],
      ['release', '--timeout', '0'],
      ['changed', '--base'],
    ]) {
      const { exit, stdout } = run([...argv, '--plan', '--json'], directory);
      assert.equal(exit, 2, argv.join(' '));
      assert.equal(JSON.parse(stdout).status, 'usage-error');
    }
    assert.match(JSON.parse(run(['component', 'buton', '--plan', '--json'], directory).stdout).message, /available: button, /);
  });
});

describe('changed', () => {
  test('an empty diff keeps the common checks and says nothing behavioral was selected', () => {
    const { exit, document, human } = planOf(['changed', '--base', 'origin/main'], repository());
    assert.equal(exit, 0);
    assertPlanned(document);
    assertAgree(document, human);
    assert.equal(document.scope, 'common');
    assert.deepEqual(checkIds(document), GLOBAL);
    assert.match(document.outcome.note, /No behavioral change was selected/);
    assert.equal(document.base?.mergeBase, document.base?.head);
  });

  test('a shared token edit selects the full release plan and names the path', () => {
    const directory = repository();
    write(directory, { 'packages/tokens/src/tokens.stylex.ts': "import * as stylex from '@stylexjs/stylex';\nexport const space = stylex.defineVars({ a: '1' });\n" });
    const { document } = planOf(['changed'], directory);
    assert.equal(document.scope, 'release');
    assert.deepEqual(checkIds(document).sort(), [...RELEASE].sort());
    assert.ok(document.fallbacks.some((f) => /token/.test(f.reason) && f.paths.includes('packages/tokens/src/tokens.stylex.ts')));
    assert.deepEqual(checkOf(document, 'production-scenarios')?.cases.length, 4);
  });

  test('an unknown non-ignored file chooses release and names it', () => {
    const directory = repository();
    write(directory, { 'notes/todo.txt': 'later\n' });
    const { document } = planOf(['changed'], directory);
    assert.equal(document.scope, 'release');
    assert.deepEqual(document.fallbacks, [{ reason: 'a changed path maps to no owner, check or known input', paths: ['notes/todo.txt'] }]);
    assert.equal(document.changes[0]?.mapping, 'release: unmapped path');
  });

  for (const [path, pattern] of [
    ['pnpm-lock.yaml', /lockfile/],
    ['packages/ui/vitest.config.ts', /Vitest configuration/],
    ['scripts/build-registry.ts', /generators/],
    ['.github/workflows/ci.yml', /CI workflow/],
    ['registry/metadata/releases.ts', /release order/],
  ] as const) {
    test(`${path} selects release`, () => {
      const directory = repository();
      write(directory, { [path]: 'export {};\n' });
      const { document } = planOf(['changed'], directory);
      assert.equal(document.scope, 'release');
      assert.ok(document.fallbacks.some((f) => pattern.test(f.reason) && f.paths.includes(path)), JSON.stringify(document.fallbacks));
    });
  }

  test('an unclassified source file chooses release', () => {
    const directory = repository();
    write(directory, { 'packages/ui/src/nested/part.tsx': 'export const Part = () => null;\n' });
    const { document } = planOf(['changed'], directory);
    assert.equal(document.scope, 'release');
    assert.deepEqual(document.fallbacks, [{ reason: 'a source file no classification claims has unknown dependants', paths: ['packages/ui/src/nested/part.tsx'] }]);
  });

  test('generated registry wiring selects the registry build and installation', () => {
    const directory = repository();
    write(directory, { 'registry/items.config.ts': 'export const items = { button: {} };\n' });
    const { document } = planOf(['changed'], directory);
    assert.equal(document.scope, 'scoped');
    for (const id of ['registry-build', 'consumer-smoke']) assert.match(checkOf(document, id)?.reasons.join() ?? '', /items\.config\.ts/);
  });

  test('prose runs only the common checks', () => {
    const directory = repository();
    write(directory, { 'docs/guide.md': '# Changed\n' });
    const { document } = planOf(['changed'], directory);
    assert.equal(document.scope, 'common');
    assert.match(document.changes[0]?.mapping ?? '', /common checks only/);
  });

  test('a shared helper edit follows reverse dependencies into components and the docs demos that compose them', () => {
    const directory = repository();
    write(directory, { 'packages/ui/src/lib/visually-hidden.ts': "import * as stylex from '@stylexjs/stylex';\nexport const visuallyHidden = stylex.create({ a: {} });\n" });
    commit(directory);
    const { document } = planOf(['changed'], directory);
    assertPlanned(document);
    assert.equal(document.scope, 'scoped');
    assert.deepEqual(document.selection.items.map((item) => item.id), ['data-table', 'lib', 'sidebar']);
    assert.deepEqual(document.changes.map((change) => [change.path, change.sources]), [['packages/ui/src/lib/visually-hidden.ts', ['committed']]]);
    assert.ok(filesOf(document, 'ui-tests').includes('packages/ui/src/__tests__/sidebar.test.tsx'));
    assert.ok(!filesOf(document, 'ui-tests').includes('packages/ui/src/__tests__/calendar.test.tsx'));
  });

  test('a deliberately unresolved edge falls back to release with its location', () => {
    const directory = repository();
    write(directory, { 'packages/ui/src/__tests__/broken.test.tsx': "import { missing } from '../missing';\ntest('x', () => missing);\n" });
    const { document } = planOf(['changed'], directory);
    assert.equal(document.scope, 'release');
    assert.ok(document.fallbacks.some((f) => /unresolved edges/.test(f.reason) && /broken\.test\.tsx:1 "\.\.\/missing"/.test(f.reason)));
  });

  test('a computed dynamic import is an unresolved edge too', () => {
    const directory = repository();
    write(directory, { 'apps/docs/src/lazy.tsx': "const name = 'x';\nexport const load = () => import(`./${name}`);\n" });
    const { document } = planOf(['changed'], directory);
    assert.equal(document.scope, 'release');
    assert.ok(document.fallbacks.some((f) => f.paths.includes('apps/docs/src/lazy.tsx')));
  });

  test('a rename keeps both sides, staged only', () => {
    const directory = repository();
    git(directory, 'mv', 'apps/docs/src/demos/button/rows.ts', 'apps/docs/src/demos/button/table-rows.ts');
    const sorting = readFileSync(join(directory, 'apps/docs/src/demos/button/sorting.tsx'), 'utf8');
    write(directory, { 'apps/docs/src/demos/button/sorting.tsx': sorting.replace("'./rows'", "'./table-rows'") });
    git(directory, 'add', '-A');
    const { document, human } = planOf(['changed'], directory);
    assertAgree(document, human);
    const renamed = document.changes.find((change) => change.path === 'apps/docs/src/demos/button/table-rows.ts');
    assert.equal(renamed?.status, 'renamed');
    assert.equal(renamed?.from, 'apps/docs/src/demos/button/rows.ts');
    assert.deepEqual(renamed?.sources, ['staged']);
    assert.match(renamed?.mapping ?? '', /from apps\/docs\/src\/demos\/button\/rows\.ts/);
    assert.ok(document.selection.items.some((item) => item.id === 'data-table'), 'the recipe that imported the old path');
    assert.ok(checkIds(document).includes('docs-build'));
  });

  test('a deleted test selects the checks proving its coverage still exists', () => {
    const directory = repository();
    unlinkSync(join(directory, 'packages/ui/src/__tests__/sidebar.test.tsx'));
    commit(directory);
    const { document, human } = planOf(['changed'], directory);
    assertAgree(document, human);
    assert.deepEqual(document.selection.deletedTests, [{ path: 'packages/ui/src/__tests__/sidebar.test.tsx', owners: ['react sidebar'] }]);
    const file = checkOf(document, 'ui-tests')?.files.find((entry) => entry.path === 'packages/ui/src/__tests__/sidebar.test.tsx');
    assert.equal(file?.present, false);
    assert.ok(!checkOf(document, 'ui-tests')?.argv.includes('src/__tests__/sidebar.test.tsx'), 'an absent file is expected, never passed as an argument');
    assert.match(checkOf(document, 'catalogue-freshness')?.reasons.join() ?? '', /sidebar\.test\.tsx was deleted/);
    assert.match(human, /\(expected, absent\)/);
  });

  test('a deleted scenario binding keeps its scenario selected and reports the finding', () => {
    const directory = repository();
    unlinkSync(join(directory, 'packages/ui/src/__tests__/button.test.tsx'));
    const { document } = planOf(['changed'], directory);
    assert.equal(document.scope, 'scoped');
    assert.ok(document.selection.scenarios.some((scenario) => scenario.id === 'button.press'));
    assert.deepEqual(document.selection.deletedTests[0]?.owners, ['react button', 'scenario button.press']);
    assert.ok(document.findings.some((finding) => finding.startsWith('missing-binding')));
    assert.ok(document.findings.some((finding) => finding.startsWith('missing-file')));
  });

  test('metadata that cannot be read makes ownership ambiguous and chooses release', () => {
    const directory = repository();
    write(directory, { 'registry/metadata/react/sidebar.ts': 'export default 42;\n' });
    const { document } = planOf(['changed'], directory);
    assert.equal(document.scope, 'release');
    assert.match(document.fallbacks[0]?.reason ?? '', /ownership cannot be established/);
  });

  test('a deleted owner keeps its former dependants', () => {
    const directory = repository();
    for (const path of [
      'registry/metadata/react/input-otp.ts',
      'packages/ui/src/input-otp.tsx',
      'packages/ui/src/__tests__/input-otp.test.tsx',
      'apps/docs/src/content/components/input-otp.mdx',
      'apps/docs/src/demos/input-otp/basic.tsx',
    ]) {
      unlinkSync(join(directory, path));
    }
    commit(directory);
    const { document } = planOf(['changed'], directory);
    assertPlanned(document);
    assert.deepEqual(document.selection.items.find((item) => item.id === 'input-otp')?.present, false);
    assert.deepEqual(
      document.selection.deletedTests.map((entry) => entry.path),
      ['packages/ui/src/__tests__/input-otp.test.tsx'],
    );
  });

  test('staged-only and untracked edits, with awkward names, stay in selection', () => {
    const directory = repository();
    write(directory, { 'packages/ui/src/sidebar.tsx': `${readFileSync(join(directory, 'packages/ui/src/sidebar.tsx'), 'utf8')}\n` });
    git(directory, 'add', 'packages/ui/src/sidebar.tsx');
    const awkward = 'apps/docs/src/demos/button/spä ced\nname.tsx';
    write(directory, { [awkward]: 'export default function Extra() { return null; }\n' });
    const { document } = planOf(['changed'], directory);
    assert.deepEqual(document.changes.map((change) => [change.path, change.sources]), [
      [awkward, ['untracked']],
      ['packages/ui/src/sidebar.tsx', ['staged']],
    ]);
    assert.ok(document.selection.items.some((item) => item.id === 'sidebar'));
    assert.ok(filesOf(document, 'ui-tests').includes('packages/ui/src/__tests__/sidebar.test.tsx'));
    assert.match(document.changes[0]?.mapping ?? '', /react button \(demo\)/);
  });

  test('docs chrome selects every production scenario', () => {
    const directory = repository();
    write(directory, { 'apps/docs/src/layout.tsx': "import { Button } from '@ultima/ui';\nexport const Layout = () => <Button type=\"button\" />;\n" });
    const { document } = planOf(['changed'], directory);
    assert.equal(document.scope, 'scoped');
    assert.equal(checkOf(document, 'production-scenarios')?.cases.length, 4);
    assert.match(checkOf(document, 'docs-build')?.reasons.join() ?? '', /docs chrome/);
  });

  test('a missing base ref chooses release without fetching', () => {
    const directory = repository();
    const { document } = planOf(['changed', '--base', 'origin/nope'], directory);
    assert.equal(document.scope, 'release');
    assert.match(document.fallbacks[0]?.reason ?? '', /"origin\/nope" does not resolve locally; it was not fetched/);
    assert.equal(git(directory, 'for-each-ref', '--format=%(refname)', 'refs/remotes'), 'refs/remotes/origin/main');
  });

  test('an absent merge base chooses release', () => {
    const directory = repository();
    git(directory, 'checkout', '-q', '--orphan', 'unrelated');
    commit(directory, 'unrelated');
    git(directory, 'update-ref', 'refs/remotes/origin/unrelated', 'HEAD');
    git(directory, 'checkout', '-q', 'change');
    const { document } = planOf(['changed', '--base', 'origin/unrelated'], directory);
    assert.equal(document.scope, 'release');
    assert.match(document.fallbacks[0]?.reason ?? '', /share no merge base/);
  });

  test('shallow history chooses release and is not deepened', () => {
    const source = repository();
    const clone = join(scratch, `shallow-${Date.now()}`);
    git(scratch, 'clone', '-q', '--depth', '1', '--no-local', `file://${source}`, clone);
    const { document } = planOf(['changed', '--base', 'origin/change'], clone);
    assert.equal(document.scope, 'release');
    assert.match(document.fallbacks[0]?.reason ?? '', /shallow/);
    assert.equal(git(clone, 'rev-parse', '--is-shallow-repository'), 'true');
  });

  test('a checkout outside Git chooses release', () => {
    const directory = mkdtempSync(join(scratch, 'plain-'));
    write(directory, workspace());
    const { document } = planOf(['changed'], directory);
    assert.equal(document.scope, 'release');
    assert.match(document.fallbacks[0]?.reason ?? '', /not a Git work tree/);
  });

  test('an ambiguous base inventory chooses release', () => {
    const files = workspace();
    files['registry/metadata/react/sidebar.ts'] = 'export default 42;\n';
    const directory = repository(files);
    write(directory, { 'registry/metadata/react/sidebar.ts': workspace()['registry/metadata/react/sidebar.ts'] as string });
    commit(directory);
    const { document } = planOf(['changed'], directory);
    assert.equal(document.scope, 'release');
    assert.match(document.fallbacks[0]?.reason ?? '', /base inventory is ambiguous/);
  });
});

describe('an unavailable base inventory', () => {
  test('chooses release with the reason', () => {
    const current = snapshot(memoryFiles(workspace()));
    const document = plan({ mode: 'changed', selectors: [], current, base: { failure: 'git ls-tree abc failed' }, changes: [] });
    assert.equal(document.scope, 'release');
    assert.deepEqual(document.fallbacks, [{ reason: 'the base inventory is unavailable: git ls-tree abc failed', paths: [] }]);
  });
});

describe('execution without --plan', () => {
  test('plans from the captured snapshot, exits 3 and never passes', async () => {
    const directory = repository();
    const output = await execute(['component', 'button', '--output', join(mkdtempSync(join(scratch, 'run-')), 'evidence'), '--json'], directory, { adapters: {} });
    assert.equal(output.exit, 3);
    const document = JSON.parse(output.stdout);
    assert.equal(document.status, 'incomplete');
    assert.equal(document.plan.status, 'planned');
    // The plan could pass with every adapter registered; this run registered none, so it cannot.
    assert.equal(document.plan.outcome.canPass, true);
    assert.ok(document.checks.filter((entry: { status: string }) => entry.status !== 'skipped').every((entry: { status: string }) => entry.status === 'unavailable'));
    assert.deepEqual(document.plan.checks.map((entry: { id: string }) => entry.id), planOf(['component', 'button'], directory).document.checks.map((entry) => entry.id));
  });
});

describe('the release plan', () => {
  const { document, human } = planOf(['release'], root);

  test('holds every check, whole suites and every registered scenario case', () => {
    assertPlanned(document);
    assertAgree(document, human);
    assert.equal(document.scope, 'release');
    assert.deepEqual(checkIds(document).sort(), [...RELEASE].sort());
    for (const entry of document.checks) assert.notEqual(entry.scope, 'files');
    assert.ok(checkOf(document, 'production-scenarios')?.cases.includes('dialog.keyboard-dismissal@production[mode=light,viewport=narrow,motion=normal]'));
    assert.deepEqual(checkOf(document, 'docs-tests')?.cases, ['theme-studio.draft-history@docs-vitest[default]']);
    assert.deepEqual(
      document.outcome.unavailable.sort(),
      [],
      'every check has an execution adapter',
    );
    assert.equal(checkOf(document, 'production-scenarios')?.cases.length, 26, 'the whole production matrix');
    assert.deepEqual(document.outcome.pending, [], 'no release obligation is pending once the matrix is registered');
    assert.equal(document.outcome.canPass, true);
  });

  test('carries every CI workflow obligation, including the consumer-smoke workflow', () => {
    const planned = new Set(checkIds(document));
    const commands: { workflow: string; command: string }[] = [];
    for (const workflow of ['ci.yml', 'smoke-install.yml']) {
      const text = readFileSync(join(root, '.github/workflows', workflow), 'utf8');
      const lines = text.split('\n');
      lines.forEach((line, index) => {
        const inline = /^\s*(?:-\s+)?run:[ \t]+([^|\s].*)$/.exec(line);
        if (inline) commands.push({ workflow, command: (inline[1] as string).trim() });
        if (/^\s*(?:-\s+)?run:\s*\|\s*$/.test(line)) {
          const indent = /^\s*/.exec(lines[index + 1] ?? '')?.[0].length ?? 0;
          for (let next = index + 1; next < lines.length && (lines[next] as string).startsWith(' '.repeat(indent)); next += 1) {
            const command = (lines[next] as string).trim();
            if (command) commands.push({ workflow, command });
          }
        }
      });
    }
    assert.ok(commands.length >= 10);
    for (const { workflow, command } of commands) {
      const obligation = CI_OBLIGATIONS.find((entry) => entry.workflow === workflow && entry.command === command);
      assert.ok(obligation, `${workflow}: "${command}" has no planned check`);
      for (const id of obligation.checks ?? []) assert.ok(planned.has(id), `${id} is in the release plan`);
    }
  });

  test('`pnpm test` decomposes into the package suites it runs', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
    assert.match(manifest.scripts.test as string, /scripts\/catalogue\/\*\.test\.ts scripts\/verification\/\*\.test\.ts && pnpm -r test/);
    const tested: string[] = [];
    for (const group of ['packages', 'apps']) {
      for (const name of spawnSync('ls', [join(root, group)], { encoding: 'utf8' }).stdout.split('\n').filter(Boolean)) {
        try {
          const pkg = JSON.parse(readFileSync(join(root, group, name, 'package.json'), 'utf8')) as { name: string; scripts?: Record<string, string> };
          if (pkg.scripts?.test) tested.push(pkg.name);
        } catch {
          // Not a package.
        }
      }
    }
    const composed = CI_OBLIGATIONS.find((entry) => entry.command === 'pnpm test')?.checks ?? [];
    assert.deepEqual(
      composed.map((id) => CHECKS.find((entry) => entry.id === id)?.package).filter(Boolean).sort(),
      tested.sort(),
    );
    assert.ok(composed.includes('tooling-tests'));
  });
});

describe('planning', () => {
  test('launches no check process: Git reads the change set and nothing else runs', () => {
    const preload = join(scratch, 'spawns.mjs');
    const record = join(scratch, 'spawned.json');
    writeFileSync(
      preload,
      [
        "import { createRequire, syncBuiltinESMExports } from 'node:module';",
        "import { writeFileSync } from 'node:fs';",
        'const require = createRequire(import.meta.url);',
        "const processes = require('node:child_process');",
        'const spawned = [];',
        "for (const name of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) {",
        '  const original = processes[name];',
        '  processes[name] = (command, args, ...rest) => { spawned.push([command, ...(Array.isArray(args) ? args : [])]); return original(command, args, ...rest); };',
        '}',
        'syncBuiltinESMExports();',
        `process.on('exit', () => writeFileSync(${JSON.stringify(record)}, JSON.stringify(spawned)));`,
      ].join('\n'),
    );
    for (const argv of [['component', 'button'], ['feature', 'dialog'], ['changed'], ['release']]) {
      for (const flags of [['--plan', '--json'], ['--plan']]) {
        const child = spawnSync(process.execPath, ['--experimental-strip-types', '--import', preload, join(root, 'scripts/verify.ts'), ...argv, ...flags], {
          encoding: 'utf8',
        });
        assert.equal(child.status, 0, child.stderr);
        const spawned = JSON.parse(readFileSync(record, 'utf8')) as string[][];
        assert.ok(spawned.every(([command]) => command === 'git'), `${argv.join(' ')} spawned ${JSON.stringify(spawned)}`);
        assert.ok(!spawned.some((command) => command.includes('fetch') || command.includes('pull')), 'never fetches');
        if (flags.includes('--json')) assert.equal(JSON.parse(child.stdout).status, 'planned');
      }
    }
  });
});
