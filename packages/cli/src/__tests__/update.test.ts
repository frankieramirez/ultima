import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ultimaPresetUrl } from '../../../../apps/docs/src/ultima-preset.ts';
import { UNMARKED_NEUTRAL_HASHES, fileBaseTheme } from '../base-theme.ts';
import { run } from '../run.ts';
import { contentHash, stampLine, withStamp } from '../stamp.ts';
import { type UpdateReport, planAction, planHash, printUpdate, update, updateExit } from '../update.ts';
import { project, snapshot } from './fixtures.ts';

const OLD = 'aaaaaaaaaaaa';
const NEW = 'bbbbbbbbbbbb';

function staged(name: string, label: string): string {
  return `'use client';\n\nimport { Spinner } from '@/registry/ultima/ui/spinner';\n\nexport function ${name}() {\n  return <Spinner label="${label}" />;\n}\n`;
}

function viteCopy(source: string): string {
  return source.replace("'use client';\n\n", '').replaceAll('@/registry/ultima/ui/', '@/components/ui/');
}

async function stamped(item: string, source: string, revision: string, local = viteCopy(source)) {
  return withStamp(local, stampLine(item, revision, await contentHash(source, 'c1'), 'ts'));
}

/** The authored source the registry build stages as `staged(name, label)`. */
function authored(name: string, label: string): string {
  return staged(name, label).replace('@/registry/ultima/ui/', '@ultima/ui/');
}

type Source = 'named' | 'older' | 'none';

/**
 * A registry at revision NEW serving each item's one file, with its stamped content, and a raw host serving `raw` at
 * `/raw/<revision>/<path>`. `named` catalogues name that host and each file's source path, `older` ones carry neither
 * key, and `none` ones list the paths but no source.
 */
type Needs = { registryDependencies?: string[]; dependencies?: string[] };

async function serve(
  items: ({ name: string; file: string; source: string; type?: string; scheme?: 'c1' | 'b1'; baseTheme?: string } & Needs)[],
  { raw = {}, source = 'named' }: { raw?: Record<string, string>; source?: Source } = {},
) {
  const served: Record<string, unknown> = {};
  const requests: string[] = [];
  const server = createServer((request, response) => {
    const url = request.url ?? '';
    if (url.startsWith('/raw/')) requests.push(url);
    const body = url.startsWith('/raw/') ? raw[url.slice('/raw/'.length)] : served[url];
    if (body === undefined) response.writeHead(404).end();
    else if (typeof body === 'string') response.writeHead(200, { 'content-type': 'text/plain' }).end(body);
    else response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
  });
  await new Promise<void>((listening) => server.listen(0, '127.0.0.1', listening));
  server.unref();
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const template = `${origin}/raw/{revision}/{path}`;

  const catalogue = {
    name: 'ultima',
    meta: { ultima: { format: 1, ...(source === 'named' && { source: { repository: 'https://example.test/ultima', raw: template } }) } },
    items: [] as unknown[],
  };
  for (const { name, file, source: text, type = 'registry:ui', scheme = 'c1', baseTheme, ...needs } of items) {
    const hash = await contentHash(text, scheme);
    const path = `ultima/${type === 'registry:lib' ? 'lib' : 'ui'}/${file}`;
    const sources = source === 'older' ? {} : { sources: { [file]: `packages/ui/src/${type === 'registry:lib' ? 'lib/' : ''}${file}` } };
    catalogue.items.push({ name, type, ...needs, files: [{ path, type }], meta: { ultima: { revision: NEW, files: { [file]: hash }, ...sources, ...(baseTheme && { baseTheme }) } } });
    served[`/r/${name}.json`] = { name, files: [{ path, type, content: withStamp(text, stampLine(name, NEW, hash, 'ts')) }] };
  }
  served['/r/registry.json'] = catalogue;
  return { registry: `${origin}/r/{name}.json`, raw: template, requests };
}

const SIDEBAR = `${OLD}/packages/ui/src/sidebar.tsx`;

/**
 * One file in each of the states behind, current, unstamped and diverged. The raw host serves the diverged sidebar's
 * authored source at its installed revision unless `raw` says otherwise.
 */
async function fixture({ raw = { [SIDEBAR]: authored('Sidebar', 'one') }, source = 'named', sidebarRevision = OLD }: { raw?: Record<string, string>; source?: Source; sidebarRevision?: string } = {}) {
  const served = await serve(
    [
      { name: 'button', file: 'button.tsx', source: staged('Button', 'two') },
      { name: 'dialog', file: 'dialog.tsx', source: staged('Dialog', 'two') },
      { name: 'lib', file: 'component.ts', source: 'export type StyleSlot = unknown;\n', type: 'registry:lib' },
      { name: 'sidebar', file: 'sidebar.tsx', source: staged('Sidebar', 'two') },
    ],
    { raw, source },
  );
  const root = project({
    'components.json': JSON.stringify({ aliases: { ui: '@/components/ui', lib: '@/lib' }, registries: { '@ultima': served.registry } }),
    'tsconfig.json': JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
    'src/components/ui/button.tsx': await stamped('button', staged('Button', 'two'), NEW),
    'src/components/ui/dialog.tsx': await stamped('dialog', staged('Dialog', 'one'), OLD),
    'src/lib/component.ts': 'export type StyleSlot = string;\n',
    'src/components/ui/sidebar.tsx': await stamped('sidebar', staged('Sidebar', 'one'), sidebarRevision, viteCopy(staged('Sidebar', 'three'))),
  });
  return { root, registry: served.registry.replace('/{name}.json', ''), raw: served.raw, requests: served.requests };
}

const runs = (root: string) => readdirSync(join(root, '.ultima-update')).filter((name) => name !== '.gitignore').sort();

async function statusOf(root: string) {
  const { files } = JSON.parse((await run(['status', '--cwd', root, '--json'])).stdout) as { files: { file: string; state: string }[] };
  return Object.fromEntries(files.map(({ file, state }) => [file, state]));
}

describe('planAction', () => {
  const row = (state: string, scheme = 'c1') =>
    ({ item: 'x', file: 'x.tsx', state, installed: { revision: OLD, hash: `${scheme}:1111` }, local: `${scheme}:3333`, served: `${scheme}:2222` }) as Parameters<typeof planAction>[0];

  it('gives each state its action from the spec table', () => {
    expect(planAction(row('current'))).toEqual({ action: 'none', reason: null, base: null, hunks: null });
    expect(planAction(row('edited'))).toEqual({ action: 'none', reason: null, base: null, hunks: null });
    expect(planAction(row('behind'))).toEqual({ action: 'replace', reason: null, base: null, hunks: null });
    expect(planAction({ ...row('unstamped'), installed: null })).toEqual({ action: 'report', reason: 'no installed base', base: null, hunks: null });
    expect(planAction(row('retired')).action).toBe('report');
    expect(planAction(row('unknown-scheme')).action).toBe('report');
  });

  it('merges a diverged c1 file over its verified base, and reports it without one', () => {
    expect(planAction(row('diverged'), { text: 'base' }, { conflicts: 0, text: 'merged' })).toEqual({ action: 'merge', reason: null, base: 'verified', hunks: 0 });
    expect(planAction(row('diverged'), { text: 'base' }, { conflicts: 2, text: 'marked' })).toEqual({ action: 'conflict', reason: null, base: 'verified', hunks: 2 });
    expect(planAction(row('diverged'), { text: 'base' }, { reason: 'why' })).toEqual({ action: 'report', reason: 'why', base: 'verified', hunks: null });
    expect(planAction(row('diverged'), { reason: 'why' })).toEqual({ action: 'report', reason: 'no installed base: why', base: 'unavailable', hunks: null });
  });

  it('reports a diverged b1 file, which cannot be merged, without a base', () => {
    expect(planAction(row('diverged', 'b1'))).toEqual({ action: 'report', reason: 'built file, which cannot be merged', base: null, hunks: null });
  });
});

describe('update', () => {
  it('prints a plan for the drifted files and writes nothing', async () => {
    const { root, registry } = await fixture();
    const before = snapshot(root);
    const { code, stdout, stderr } = await run(['update', '--cwd', root]);
    expect({ code, stderr }).toEqual({ code: 0, stderr: '' });
    expect(stdout).toBe(
      [
        `Registry  ${registry}  revision ${NEW}`,
        '',
        'item      file                           state      action',
        'dialog    src/components/ui/dialog.tsx   behind     replace',
        'sidebar   src/components/ui/sidebar.tsx  diverged   conflict  1 hunk',
        'lib       src/lib/component.ts           unstamped  report    no installed base',
        '',
        'conflict  npx ultima-design update --write-conflicts  or  --replace sidebar',
        'apply     npx ultima-design update --yes',
        '',
      ].join('\n'),
    );
    expect(snapshot(root)).toEqual(before);
  });

  it('lists every file of a named item, current ones included', async () => {
    const { root } = await fixture();
    const { code, stdout } = await run(['update', 'button', 'dialog', '--cwd', root]);
    expect(code).toBe(0);
    expect(stdout.split('\n').slice(2, 5)).toEqual([
      'item    file                          state    action',
      'button  src/components/ui/button.tsx  current  none',
      'dialog  src/components/ui/dialog.tsx  behind   replace',
    ]);
    expect(stdout).toContain('apply   npx ultima-design update button dialog --yes\n');
  });

  it('with --yes rewrites only the behind file, which status then reports current, and journals the run', async () => {
    const { root } = await fixture();
    const before = snapshot(root);
    const { code, stdout } = await run(['update', '--yes', '--cwd', root]);
    expect(code).toBe(0);

    const after = snapshot(root);
    const changed = Object.keys(after).filter((path) => after[path] !== before[path] && !path.startsWith('.ultima-update'));
    expect(changed).toEqual(['src/components/ui/dialog.tsx']);
    expect(after['src/components/ui/dialog.tsx']).toBe(
      `'use client';\n\nimport { Spinner } from '@/components/ui/spinner';\n\nexport function Dialog() {\n  return <Spinner label="two" />;\n}\n${stampLine('dialog', NEW, await contentHash(staged('Dialog', 'two'), 'c1'), 'ts')}\n`,
    );
    expect(await statusOf(root)).toMatchObject({ 'src/components/ui/dialog.tsx': 'current', 'src/components/ui/sidebar.tsx': 'diverged' });

    const [runId] = runs(root);
    expect(runs(root)).toHaveLength(1);
    expect(readFileSync(join(root, '.ultima-update/.gitignore'), 'utf8')).toBe('*\n');
    const journal = JSON.parse(readFileSync(join(root, '.ultima-update', runId as string, 'journal.json'), 'utf8'));
    expect(journal).toMatchObject({ kind: 'ultima-update-journal', status: 'finished', runId });
    expect(Object.keys(journal.originals)).toEqual(['src/components/ui/dialog.tsx']);
    expect(journal.operations).toMatchObject([{ id: 'replace src/components/ui/dialog.tsx', status: 'done' }]);
    const original = readFileSync(join(root, '.ultima-update', runId as string, 'files', journal.originals['src/components/ui/dialog.tsx'].sha256), 'utf8');
    expect(original).toBe(before['src/components/ui/dialog.tsx']);

    expect(stdout).toContain('wrote     src/components/ui/dialog.tsx\n');
    expect(stdout).toContain(
      [
        'conflict  src/components/ui/sidebar.tsx  left unwritten',
        '          npx ultima-design update --write-conflicts  or  --replace sidebar',
        'reported  src/lib/component.ts',
        '',
      ].join('\n'),
    );
    expect(stdout).toContain(`undo      npx ultima-design update --rollback ${runId}\n`);
    expect(stdout.trimEnd().split('\n').slice(-2)).toEqual(['next      npx ultima-design check --files src/components/ui/dialog.tsx', '          npx tsc --noEmit']);
  });

  it("names the project's typecheck script after an apply", async () => {
    const { root } = await fixture();
    writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts: { typecheck: 'tsc -b' } }));
    writeFileSync(join(root, 'pnpm-lock.yaml'), '');
    const { stdout } = await run(['update', '--yes', '--cwd', root]);
    expect(stdout.trimEnd().split('\n').at(-1)).toBe('          pnpm run typecheck');
  });

  it('says when a planned file has uncommitted changes, and still applies', async () => {
    const { root } = await fixture();
    const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: root, stdio: 'pipe' });
    git('init', '-q');
    git('add', '.');
    git('commit', '-qm', 'installed');
    const dialog = join(root, 'src/components/ui/dialog.tsx');
    writeFileSync(dialog, `// Our note.\n${readFileSync(dialog, 'utf8')}`);

    const plan = await run(['update', '--cwd', root]);
    expect(plan.stdout).toContain('dialog    src/components/ui/dialog.tsx   behind     replace   uncommitted changes, kept in the journal\n');
    expect((await run(['update', '--yes', '--cwd', root])).code).toBe(0);
    expect((await statusOf(root))['src/components/ui/dialog.tsx']).toBe('current');
  });

  it('rolls back the latest run to the original bytes, and a named run leaves a file changed since', async () => {
    const { root } = await fixture();
    const before = snapshot(root);
    await run(['update', '--yes', '--cwd', root]);
    const [runId] = runs(root);

    const undone = await run(['update', '--rollback', '--cwd', root]);
    expect(undone.code).toBe(0);
    expect(undone.stdout).toContain(`Rolled back update run ${runId}.`);
    expect(undone.stdout).toContain('Restored  src/components/ui/dialog.tsx\n');
    expect(undone.stdout).toContain('Left      none\n');
    const restored = snapshot(root);
    expect(Object.fromEntries(Object.entries(restored).filter(([path]) => !path.startsWith('.ultima-update')))).toEqual(before);

    await run(['update', '--yes', '--cwd', root]);
    const second = runs(root).at(-1) as string;
    const dialog = join(root, 'src/components/ui/dialog.tsx');
    const ours = `${readFileSync(dialog, 'utf8')}export const Ours = 1;\n`;
    writeFileSync(dialog, ours);
    const left = await run(['update', '--rollback', second, '--cwd', root]);
    expect(left.code).toBe(0);
    expect(left.stdout).toContain('Restored  none\n');
    expect(left.stdout).toContain('Left      src/components/ui/dialog.tsx\n');
    expect(left.stdout).toContain('src/components/ui/dialog.tsx changed after this run wrote it, so it was left as it is.');
    expect(readFileSync(dialog, 'utf8')).toBe(ours);
  });

  it('exits 3 with nothing to undo', async () => {
    const { root } = await fixture();
    const none = await run(['update', '--rollback', '--cwd', root]);
    expect(none.code).toBe(3);
    expect(none.stdout).toContain('ULT-UPDATE-002');

    await run(['update', '--yes', '--cwd', root]);
    expect((await run(['update', '--rollback', '--cwd', root])).code).toBe(0);
    expect((await run(['update', '--rollback', '--cwd', root])).code).toBe(3);
    expect((await run(['update', '--rollback', '2026-01-01T00-00-00-000Z-abcdef', '--cwd', root])).code).toBe(3);
  });

  it('stops at a write that fails, exits 3 and names the rollback command', async () => {
    const { root } = await fixture();
    const before = snapshot(root);
    const result = await update(root, [], {
      yes: true,
      write: () => {
        throw new Error('disk full');
      },
    });
    expect(updateExit(result)).toBe(3);
    const [runId] = runs(root);
    const printed = printUpdate(result as Exclude<typeof result, { usage: string } | { diagnostics: unknown }>);
    expect(printed).toContain('failed    src/components/ui/dialog.tsx: disk full\n');
    expect(printed).toContain(`undo      npx ultima-design update --rollback ${runId}\n`);
    const journal = JSON.parse(readFileSync(join(root, '.ultima-update', runId as string, 'journal.json'), 'utf8'));
    expect(journal).toMatchObject({ status: 'stopped', operations: [{ id: 'replace src/components/ui/dialog.tsx', status: 'failed', error: 'disk full' }] });
    expect(Object.fromEntries(Object.entries(snapshot(root)).filter(([path]) => !path.startsWith('.ultima-update')))).toEqual(before);
  });

  it('exits 2 on an item neither served nor installed, and 3 when the registry is unreachable', async () => {
    const { root } = await fixture();
    const unknown = await run(['update', 'nosuchitem', '--cwd', root]);
    expect(unknown).toMatchObject({ code: 2, stdout: '' });
    expect(unknown.stderr).toContain('nosuchitem is neither served');

    writeFileSync(join(root, 'components.json'), JSON.stringify({ aliases: { ui: '@/components/ui', lib: '@/lib' }, registries: { '@ultima': 'http://127.0.0.1:9/r/{name}.json' } }));
    const unreachable = await run(['update', '--cwd', root]);
    expect(unreachable.code).toBe(3);
    expect(unreachable.stdout).toContain('ULT-STATUS-002');
    expect(existsSync(join(root, '.ultima-update'))).toBe(false);
  });

  it('refuses --rollback with --yes or more than one run id', async () => {
    const { root } = await fixture();
    expect((await run(['update', '--rollback', '--yes', '--cwd', root])).code).toBe(2);
    expect((await run(['update', '--rollback', 'a', 'b', '--cwd', root])).code).toBe(2);
  });
});

/** A loopback port nothing listens on, so a request to it is refused. */
const CLOSED = await new Promise<number>((closed) => {
  const server = createServer().listen(0, '127.0.0.1', () => {
    const { port } = server.address() as AddressInfo;
    server.close(() => closed(port));
  });
});

describe('installed base', () => {
  async function sidebar(options: Parameters<typeof fixture>[0], raw?: (fixtureRaw: string) => string) {
    const built = await fixture(options);
    const result = (await update(built.root, ['sidebar'], { raw: raw?.(built.raw) })) as UpdateReport;
    return { row: result.plan.files.find(({ item }) => item === 'sidebar'), requests: built.requests };
  }

  it('verifies a diverged c1 file against the authored source the raw host serves, with one request', async () => {
    const { root, requests } = await fixture();
    const { plan } = (await update(root, [], {})) as UpdateReport;
    expect(plan.files.map(({ item, action, base }) => [item, action, base])).toEqual([
      ['dialog', 'replace', null],
      ['sidebar', 'conflict', 'verified'],
      ['lib', 'report', null],
    ]);
    expect(requests).toEqual([`/raw/${SIDEBAR}`]);
  });

  it('falls back to the built-in address and the authored layout for a catalogue served before the source keys', async () => {
    const { row, requests } = await sidebar({ source: 'older' }, (raw) => raw);
    expect(row).toMatchObject({ action: 'conflict', base: 'verified', hunks: 1 });
    expect(requests).toEqual([`/raw/${SIDEBAR}`]);
  });

  it.each([
    ['a served base whose hash differs', { raw: { [SIDEBAR]: authored('Sidebar', 'two') } }, undefined, /^no installed base: packages\/ui\/src\/sidebar\.tsx at aaaaaaaaaaaa rebuilds to c1:[0-9a-f]{16}, not the stamp's c1:[0-9a-f]{16}$/],
    ['a 404', { raw: {} }, undefined, /^no installed base: http:\/\/127\.0\.0\.1:\d+\/raw\/aaaaaaaaaaaa\/packages\/ui\/src\/sidebar\.tsx answered 404, so the file is not in the repository at that revision$/],
    ['a network error', { source: 'older' as const }, () => `http://127.0.0.1:${CLOSED}/{revision}/{path}`, /^no installed base: http:\/\/127\.0\.0\.1:\d+\/aaaaaaaaaaaa\/packages\/ui\/src\/sidebar\.tsx could not be fetched: ECONNREFUSED$/],
    ['a local revision', { sidebarRevision: 'local' }, undefined, /^no installed base: installed from a build outside a git checkout \(revision local\)$/],
    ['a registry that names no source', { source: 'none' as const }, undefined, /^no installed base: the registry names no source repository$/],
    ['a source that imports a barrel', { raw: { [SIDEBAR]: `import { Spinner } from '@ultima/ui';\n${authored('Sidebar', 'one')}` } }, undefined, /^no installed base: packages\/ui\/src\/sidebar\.tsx at aaaaaaaaaaaa does not rebuild: .*imports "@ultima\/ui", a barrel/],
  ])('reports %s with its own reason, and the run still completes', async (_, options, raw, reason) => {
    const { row } = await sidebar(options, raw);
    expect(row).toMatchObject({ action: 'report', base: 'unavailable' });
    expect(row?.reason).toMatch(reason);
  });

  it('never fetches a base for a diverged b1 file, and --replace takes the served one', async () => {
    const body = (label: string) => `export const ultima = "${label}";\n`;
    const served = await serve([{ name: 'ultima', file: 'ultima.js', source: body('two'), type: 'registry:lib', scheme: 'b1' }]);
    const root = project({
      'components.json': JSON.stringify({ aliases: { ui: '@/components/ui', lib: '@/lib' }, registries: { '@ultima': served.registry } }),
      'tsconfig.json': JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
      'src/lib/ultima.js': withStamp(body('three'), stampLine('ultima', OLD, await contentHash(body('one'), 'b1'), 'ts')),
    });
    const result = await run(['update', '--cwd', root]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('ultima  src/lib/ultima.js  diverged  report  built file, which cannot be merged\n');
    expect(served.requests).toEqual([]);

    expect((await run(['update', '--replace', 'ultima', '--yes', '--cwd', root])).code).toBe(0);
    expect(await statusOf(root)).toEqual({ 'src/lib/ultima.js': 'current' });
  });
});

const LEGACY_TOKENS = 'export const radius = { md: 10 };\n';
const NEUTRAL_TOKENS = 'export const radius = { md: 4 };\n// @ultima-base neutral-tight\n';

/** A project whose `tokens` file holds `local` at revision OLD, served on Neutral with Tight radius. */
async function tokensFixture(local: string) {
  const { registry } = await serve([{ name: 'tokens', file: 'tokens.stylex.ts', source: NEUTRAL_TOKENS, type: 'registry:lib', baseTheme: 'neutral-tight' }]);
  return project({
    'components.json': JSON.stringify({ aliases: { ui: '@/components/ui', lib: '@/lib' }, registries: { '@ultima': registry } }),
    'tsconfig.json': JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
    'src/lib/tokens.stylex.ts': await stamped('tokens', local, OLD),
  });
}

describe('fileBaseTheme', () => {
  it('reads the marker, else Neutral for a pre-marker Neutral hash, else the legacy base', () => {
    expect(fileBaseTheme(NEUTRAL_TOKENS)).toBe('neutral-tight');
    expect(fileBaseTheme(':root {}\n/* @ultima-base neutral-tight */\n')).toBe('neutral-tight');
    expect(fileBaseTheme('export const a = 1;\n// @ultima-base later\n')).toBe('later');
    expect(fileBaseTheme(withStamp(LEGACY_TOKENS, stampLine('tokens', OLD, UNMARKED_NEUTRAL_HASHES[0] as string, 'ts')))).toBe('neutral-tight');
    expect(fileBaseTheme(LEGACY_TOKENS, UNMARKED_NEUTRAL_HASHES[1])).toBe('neutral-tight');
    expect(fileBaseTheme(withStamp(LEGACY_TOKENS, stampLine('tokens', OLD, 'c1:0123456789abcdef', 'ts')))).toBe('ultima');
  });
});

describe('update holds a base theme change', () => {
  it('plans a legacy tokens file as hold, names the change, links the update page and prints the preset command', async () => {
    const root = await tokensFixture(LEGACY_TOKENS);
    const { code, stdout } = await run(['update', '--cwd', root]);
    expect(code).toBe(0);
    const { url } = await ultimaPresetUrl();
    expect(url).toMatch(/^https:\/\/ultima\.systems\/r\/theme\.json\?theme=/);
    expect(stdout.split('\n').slice(2)).toEqual([
      'item    file                      state   action',
      'tokens  src/lib/tokens.stylex.ts  behind  hold    base theme changes to neutral-tight',
      '',
      'hold    npx ultima-design update --accept-base-theme  (https://ultima.systems/install/update)',
      `keep    npx shadcn@4.21.4 add "${url}"  installs the Ultima preset, which keeps the previous look`,
      '',
    ]);
  });

  it('leaves the held file untouched under --yes, and lists it as held', async () => {
    const root = await tokensFixture(LEGACY_TOKENS);
    const before = snapshot(root);
    const { code, stdout } = await run(['update', '--yes', '--cwd', root]);
    expect(code).toBe(0);
    expect(snapshot(root)).toEqual(before);
    expect(stdout).toContain('wrote   none\n');
    expect(stdout).toContain('held    src/lib/tokens.stylex.ts\n');
  });

  it('with --accept-base-theme plans the action the state gives, and --yes then replaces the file', async () => {
    const root = await tokensFixture(LEGACY_TOKENS);
    const plan = await run(['update', '--accept-base-theme', '--cwd', root]);
    expect(plan.stdout).toContain('tokens  src/lib/tokens.stylex.ts  behind  replace\n');
    expect(plan.stdout).toContain('apply   npx ultima-design update --accept-base-theme --yes\n');
    expect(plan.stdout).not.toContain('keep');

    const applied = await run(['update', '--accept-base-theme', '--yes', '--cwd', root]);
    expect(applied.code).toBe(0);
    expect(readFileSync(join(root, 'src/lib/tokens.stylex.ts'), 'utf8')).toBe(withStamp(NEUTRAL_TOKENS, stampLine('tokens', NEW, await contentHash(NEUTRAL_TOKENS, 'c1'), 'ts')));
    expect((await statusOf(root))['src/lib/tokens.stylex.ts']).toBe('current');
  });

  it('plans a tokens file already on the served base by its state', async () => {
    const root = await tokensFixture('export const radius = { md: 2 };\n// @ultima-base neutral-tight\n');
    const { stdout } = await run(['update', '--cwd', root]);
    expect(stdout).toContain('tokens  src/lib/tokens.stylex.ts  behind  replace\n');
    expect(stdout).not.toContain('--accept-base-theme');
  });

  it('refuses --accept-base-theme with --rollback', async () => {
    const root = await tokensFixture(LEGACY_TOKENS);
    expect((await run(['update', '--rollback', '--accept-base-theme', '--cwd', root])).code).toBe(2);
  });
});

describe('update holds an item that needs a dependency', () => {
  const SPINNER = 'export function Spinner() {}\n';

  /** dialog needs an uninstalled registry item, select an npm package the project lacks, and sidebar what it has. */
  async function needsFixture(extra: Record<string, string> = {}) {
    const { registry } = await serve([
      { name: 'button', file: 'button.tsx', source: staged('Button', 'two') },
      { name: 'dialog', file: 'dialog.tsx', source: staged('Dialog', 'two'), registryDependencies: ['@ultima/spinner', '@ultima/button'] },
      { name: 'select', file: 'select.tsx', source: staged('Select', 'two'), dependencies: ['@base-ui/react', 'clsx'] },
      { name: 'sidebar', file: 'sidebar.tsx', source: staged('Sidebar', 'two'), registryDependencies: ['@ultima/button'], dependencies: ['clsx'] },
      { name: 'spinner', file: 'spinner.tsx', source: SPINNER },
    ]);
    return project({
      'package.json': JSON.stringify({ name: 'app', dependencies: { clsx: '^2.0.0' } }),
      'pnpm-lock.yaml': '',
      'components.json': JSON.stringify({ aliases: { ui: '@/components/ui', lib: '@/lib' }, registries: { '@ultima': registry } }),
      'tsconfig.json': JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
      'src/components/ui/button.tsx': await stamped('button', staged('Button', 'two'), NEW),
      'src/components/ui/dialog.tsx': await stamped('dialog', staged('Dialog', 'one'), OLD),
      'src/components/ui/select.tsx': await stamped('select', staged('Select', 'one'), OLD),
      'src/components/ui/sidebar.tsx': await stamped('sidebar', staged('Sidebar', 'one'), OLD),
      ...extra,
    });
  }

  it('holds each with the command that adds what it needs, and --yes writes only the rest and leaves package.json', async () => {
    const root = await needsFixture();
    const plan = await run(['update', '--cwd', root]);
    expect(plan.stdout.split('\n').slice(2)).toEqual([
      'item     file                           state   action',
      'sidebar  src/components/ui/sidebar.tsx  behind  replace',
      'dialog   src/components/ui/dialog.tsx   behind  hold     needs @ultima/spinner',
      'select   src/components/ui/select.tsx   behind  hold     needs @base-ui/react',
      '',
      'needs    npx shadcn@4.21.4 add @ultima/spinner',
      '         pnpm add @base-ui/react',
      'apply    npx ultima-design update --yes',
      '',
    ]);

    const before = snapshot(root);
    const applied = await run(['update', '--yes', '--cwd', root]);
    expect(applied.code).toBe(0);
    const after = snapshot(root);
    expect(Object.keys(after).filter((path) => after[path] !== before[path] && !path.startsWith('.ultima-update'))).toEqual(['src/components/ui/sidebar.tsx']);
    expect(after['package.json']).toBe(before['package.json']);
    expect(applied.stdout).toContain('held     src/components/ui/dialog.tsx, src/components/ui/select.tsx\n');
  });

  it("names npm's install command without a pnpm lockfile, and a rerun after adding them picks both up", async () => {
    const root = await needsFixture();
    execFileSync('rm', [join(root, 'pnpm-lock.yaml')]);
    expect((await run(['update', '--cwd', root])).stdout).toContain('         npm install @base-ui/react\n');

    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'app', dependencies: { clsx: '^2.0.0', '@base-ui/react': '^1.0.0' } }));
    writeFileSync(join(root, 'src/components/ui/spinner.tsx'), await stamped('spinner', SPINNER, NEW));
    const rerun = await run(['update', '--cwd', root]);
    expect(rerun.stdout).toContain('dialog   src/components/ui/dialog.tsx   behind  replace\n');
    expect(rerun.stdout).toContain('select   src/components/ui/select.tsx   behind  replace\n');
    expect(rerun.stdout).not.toContain('needs');
  });

  it('prints what each hold requires in its JSON row, and the add commands as needs', async () => {
    const root = await needsFixture();
    const { stdout } = await run(['update', '--plan', '--json', '--cwd', root]);
    const plan = JSON.parse(stdout);
    expect(plan.files.map(({ item, action, requires }: { item: string; action: string; requires: string[] }) => [item, action, requires])).toEqual([
      ['sidebar', 'replace', []],
      ['dialog', 'hold', ['@ultima/spinner']],
      ['select', 'hold', ['@base-ui/react']],
    ]);
    expect(plan.commands).toEqual([
      { for: 'needs', command: 'npx shadcn@4.21.4 add @ultima/spinner' },
      { for: 'needs', command: 'pnpm add @base-ui/react' },
      { for: 'apply', command: 'npx ultima-design update --yes' },
    ]);
  });
});

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const projectFiles = (root: string) => Object.fromEntries(Object.entries(snapshot(root)).filter(([path]) => !path.startsWith('.ultima-update')));

async function planFile(root: string, ...args: string[]) {
  const { code, stdout, stderr } = await run(['update', ...args, '--plan', '--json', '--cwd', root]);
  expect({ code, stderr }).toEqual({ code: 0, stderr: '' });
  const path = join(root, '..', `${root.split('/').at(-1)}-plan.json`);
  writeFileSync(path, stdout);
  return { path, plan: JSON.parse(stdout) };
}

describe('update --plan --json and --apply', () => {
  it('prints one ultima-update-plan object, and planning twice gives the same planHash', async () => {
    const { root, registry } = await fixture();
    const before = snapshot(root);
    const { plan } = await planFile(root);
    const dialog = await stamped('dialog', staged('Dialog', 'one'), OLD);
    expect(plan).toEqual({
      kind: 'ultima-update-plan',
      schemaVersion: 1,
      registry,
      revision: NEW,
      planHash: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
      writeConflicts: false,
      files: [
        {
          item: 'dialog',
          file: 'src/components/ui/dialog.tsx',
          state: 'behind',
          action: 'replace',
          reason: null,
          installed: { revision: OLD, hash: await contentHash(staged('Dialog', 'one'), 'c1') },
          local: await contentHash(staged('Dialog', 'one'), 'c1'),
          served: await contentHash(staged('Dialog', 'two'), 'c1'),
          base: null,
          hunks: null,
          requires: [],
          sha256: sha256(dialog),
          uncommitted: false,
        },
        expect.objectContaining({ item: 'sidebar', state: 'diverged', action: 'conflict', reason: null, base: 'verified', hunks: 1 }),
        expect.objectContaining({ item: 'lib', file: 'src/lib/component.ts', state: 'unstamped', action: 'report', reason: 'no installed base', installed: null }),
      ],
      managed: [],
      notices: [],
      commands: [
        { for: 'conflict', command: 'npx ultima-design update --write-conflicts' },
        { for: 'conflict', command: 'npx ultima-design update --replace sidebar' },
        { for: 'apply', command: 'npx ultima-design update --yes' },
      ],
    });
    expect((await planFile(root)).plan.planHash).toBe(plan.planHash);
    expect(snapshot(root)).toEqual(before);
  });

  it('hashes the plan independently of key order and of row order', async () => {
    const { root } = await fixture();
    const { plan } = await planFile(root);
    const reordered = { ...plan, files: [...plan.files].reverse().map((row: Record<string, unknown>) => Object.fromEntries(Object.entries(row).reverse())) };
    expect(planHash(Object.fromEntries(Object.entries(reordered).reverse()) as never)).toBe(plan.planHash);
    expect(planHash({ ...plan, revision: 'cccccccccccc' })).not.toBe(plan.planHash);
  });

  it('--apply writes the same bytes --yes writes, and prints the run object under --json', async () => {
    const { root } = await fixture();
    const { path, plan } = await planFile(root);
    const applied = await run(['update', '--apply', path, '--json', '--cwd', root]);
    expect(applied.code).toBe(0);
    const viaApply = projectFiles(root);
    const [runId] = runs(root);
    expect(JSON.parse(applied.stdout)).toEqual({
      kind: 'ultima-update-run',
      schemaVersion: 1,
      runId,
      planHash: plan.planHash,
      written: ['src/components/ui/dialog.tsx'],
      conflicts: ['src/components/ui/sidebar.tsx'],
      held: [],
      reported: ['src/lib/component.ts'],
      next: ['npx ultima-design check --files src/components/ui/dialog.tsx', 'npx tsc --noEmit'],
      failed: null,
    });

    const undone = await run(['update', '--rollback', '--json', '--cwd', root]);
    expect(undone.code).toBe(0);
    expect(JSON.parse(undone.stdout)).toEqual({ kind: 'ultima-update-rollback', schemaVersion: 1, runId, restored: ['src/components/ui/dialog.tsx'], left: [] });

    const yes = await run(['update', '--yes', '--json', '--cwd', root]);
    expect(JSON.parse(yes.stdout)).toMatchObject({ kind: 'ultima-update-run', planHash: plan.planHash, written: ['src/components/ui/dialog.tsx'] });
    expect(projectFiles(root)).toEqual(viaApply);
  });

  it('applies the plan it recorded and leaves a file that drifted after planning but was not in it', async () => {
    const { root } = await fixture();
    const { path } = await planFile(root, 'dialog');
    const button = join(root, 'src/components/ui/button.tsx');
    writeFileSync(button, await stamped('button', staged('Button', 'one'), OLD));
    const before = readFileSync(button, 'utf8');
    const { code, stdout } = await run(['update', '--apply', path, '--cwd', root]);
    expect(code).toBe(0);
    expect(stdout).toMatch(/^wrote +src\/components\/ui\/dialog\.tsx$/m);
    expect(stdout).not.toContain('button');
    expect(readFileSync(button, 'utf8')).toBe(before);
  });

  it('refuses with exit 3 and writes nothing when a planned file changed after planning', async () => {
    const { root } = await fixture();
    const { path } = await planFile(root);
    const dialog = join(root, 'src/components/ui/dialog.tsx');
    writeFileSync(dialog, `// Our note.\n${readFileSync(dialog, 'utf8')}`);
    const before = snapshot(root);
    const { code, stdout } = await run(['update', '--apply', path, '--cwd', root]);
    expect(code).toBe(3);
    expect(stdout).toContain('ULT-UPDATE-003');
    expect(stdout).toContain('src/components/ui/dialog.tsx changed since it was planned');
    expect(snapshot(root)).toEqual(before);
    expect(existsSync(join(root, '.ultima-update'))).toBe(false);
  });

  it('refuses with exit 3 when the served revision moved since planning', async () => {
    const { root } = await fixture();
    const { path, plan } = await planFile(root);
    const moved = { ...plan, revision: OLD };
    writeFileSync(path, JSON.stringify({ ...moved, planHash: planHash(moved) }));
    const { code, stdout } = await run(['update', '--apply', path, '--json', '--cwd', root]);
    expect(code).toBe(3);
    expect(JSON.parse(stdout).diagnostics).toMatchObject([{ ruleId: 'ULT-UPDATE-003', message: expect.stringContaining(`revision ${OLD}`) }]);
    expect(existsSync(join(root, '.ultima-update'))).toBe(false);
  });

  it('prints a base-theme hold with its commands, and --apply holds it as planned', async () => {
    const root = await tokensFixture(LEGACY_TOKENS);
    const before = snapshot(root);
    const { path, plan } = await planFile(root);
    expect(plan.files).toMatchObject([{ item: 'tokens', state: 'behind', action: 'hold', reason: 'base theme changes to neutral-tight', requires: [] }]);
    expect(plan.commands).toEqual([
      { for: 'hold', command: 'npx ultima-design update --accept-base-theme' },
      { for: 'keep', command: `npx shadcn@4.21.4 add "${(await ultimaPresetUrl()).url}"` },
    ]);
    const applied = await run(['update', '--apply', path, '--json', '--cwd', root]);
    expect(JSON.parse(applied.stdout)).toMatchObject({ runId: null, written: [], held: ['src/lib/tokens.stylex.ts'] });
    expect(snapshot(root)).toEqual(before);
  });

  it('applies a plan made with --accept-base-theme as it was made, and refuses the flag beside --apply', async () => {
    const root = await tokensFixture(LEGACY_TOKENS);
    const { path, plan } = await planFile(root, '--accept-base-theme');
    expect(plan.files).toMatchObject([{ item: 'tokens', action: 'replace' }]);
    expect(plan.commands).toEqual([{ for: 'apply', command: 'npx ultima-design update --accept-base-theme --yes' }]);
    expect((await run(['update', '--apply', path, '--accept-base-theme', '--cwd', root])).code).toBe(2);

    const applied = await run(['update', '--apply', path, '--cwd', root]);
    expect(applied.code).toBe(0);
    expect(readFileSync(join(root, 'src/lib/tokens.stylex.ts'), 'utf8')).toBe(withStamp(NEUTRAL_TOKENS, stampLine('tokens', NEW, await contentHash(NEUTRAL_TOKENS, 'c1'), 'ts')));
  });

  it('exits 2 for --apply of a file that is not a plan, an edited plan, or with item names, --yes or --plan', async () => {
    const { root } = await fixture();
    const { path, plan } = await planFile(root);
    const notaplan = join(root, '..', 'notaplan.json');
    writeFileSync(notaplan, JSON.stringify({ kind: 'ultima-status', files: [] }));
    const garbled = join(root, '..', 'garbled.json');
    writeFileSync(garbled, 'not json');
    const edited = join(root, '..', 'edited.json');
    writeFileSync(edited, JSON.stringify({ ...plan, files: plan.files.map((row: { action: string }) => ({ ...row, action: 'replace' })) }));
    for (const args of [['--apply', notaplan], ['--apply', garbled], ['--apply', join(root, 'missing.json')], ['--apply', edited], ['--apply', path, 'dialog'], ['--apply', path, '--yes'], ['--apply', path, '--plan'], ['--apply', path, '--replace', 'dialog'], ['--apply', path, '--write-conflicts'], ['--plan', '--yes'], ['--rollback', '--apply', path], ['--rollback', '--replace', 'dialog'], ['--rollback', '--write-conflicts']]) {
      const result = await run(['update', ...args, '--cwd', root]);
      expect({ args, code: result.code, stdout: result.stdout }).toEqual({ args, code: 2, stdout: '' });
    }
    expect(existsSync(join(root, '.ultima-update'))).toBe(false);
  });
});

/** A `select` with a label line and a size line far enough apart to change one each without a conflict. */
function selectSource(label: string, size: number): string {
  return `'use client';\n\nimport { Spinner } from '@/registry/ultima/ui/spinner';\n\nexport function Select() {\n  return <Spinner label="${label}" />;\n}\n\nexport const size = ${size};\n`;
}

const SELECT = 'src/components/ui/select.tsx';

/** `select` installed from `base` at OLD and edited to `local`, with the registry serving `served` at NEW. */
async function selectFixture(base: [string, number], local: [string, number], served: [string, number]) {
  const raw = { [`${OLD}/packages/ui/src/select.tsx`]: selectSource(...base).replace('@/registry/ultima/ui/', '@ultima/ui/') };
  const { registry } = await serve([{ name: 'select', file: 'select.tsx', source: selectSource(...served) }], { raw });
  const root = project({
    'components.json': JSON.stringify({ aliases: { ui: '@/components/ui', lib: '@/lib' }, registries: { '@ultima': registry } }),
    'tsconfig.json': JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
    [SELECT]: await stamped('select', selectSource(...base), OLD, viteCopy(selectSource(...local))),
  });
  return { root, raw };
}

const servedStamp = async (served: [string, number]) => stampLine('select', NEW, await contentHash(selectSource(...served), 'c1'), 'ts');

describe('update merges a diverged file three ways', () => {
  it('merges a consumer edit in one region with a registry change in another, and status then reports the file edited', async () => {
    const { root } = await selectFixture(['one', 1], ['ours', 1], ['one', 2]);
    expect(await statusOf(root)).toEqual({ [SELECT]: 'diverged' });
    const planned = await run(['update', '--cwd', root]);
    expect(planned.stdout).toContain(`select  ${SELECT}  diverged  merge\n`);
    expect(planned.stdout).toContain('apply   npx ultima-design update --yes\n');

    const applied = await run(['update', '--yes', '--cwd', root]);
    expect(applied.code).toBe(0);
    expect(applied.stdout).toMatch(new RegExp(`^wrote +${SELECT}$`, 'm'));
    expect(readFileSync(join(root, SELECT), 'utf8')).toBe(withStamp(viteCopy(selectSource('ours', 2)), await servedStamp(['one', 2])));
    expect(await statusOf(root)).toEqual({ [SELECT]: 'edited' });
  });

  it('takes a change made the same way on both sides once', async () => {
    const { root } = await selectFixture(['one', 1], ['ours', 2], ['one', 2]);
    expect((await run(['update', '--yes', '--cwd', root])).code).toBe(0);
    const merged = readFileSync(join(root, SELECT), 'utf8');
    expect(merged).toBe(withStamp(viteCopy(selectSource('ours', 2)), await servedStamp(['one', 2])));
    expect(merged.match(/export const size/g)).toHaveLength(1);
  });

  it('plans overlapping different changes as a conflict with its hunk count, and leaves the file untouched', async () => {
    const { root } = await selectFixture(['one', 1], ['ours', 3], ['theirs', 2]);
    const before = snapshot(root);
    const planned = await run(['update', '--cwd', root]);
    expect(planned.stdout).toContain(`select    ${SELECT}  diverged  conflict  2 hunks\n`);
    expect(planned.stdout).toContain('conflict  npx ultima-design update --write-conflicts  or  --replace select\n');
    expect(planned.stdout).not.toContain('apply');

    const applied = await run(['update', '--yes', '--json', '--cwd', root]);
    expect(applied.code).toBe(0);
    expect(JSON.parse(applied.stdout)).toMatchObject({ runId: null, written: [], conflicts: [SELECT] });
    expect(snapshot(root)).toEqual(before);
  });

  it('with --write-conflicts writes the four diff3 marker lines per hunk, with the revisions filled in', async () => {
    const { root } = await selectFixture(['one', 1], ['ours', 3], ['theirs', 2]);
    const planned = await run(['update', '--write-conflicts', '--cwd', root]);
    expect(planned.stdout).toContain('apply   npx ultima-design update --write-conflicts --yes\n');
    const applied = await run(['update', '--write-conflicts', '--yes', '--cwd', root]);
    expect(applied.code).toBe(0);
    expect(applied.stdout).toContain(`conflict  ${SELECT}  written with conflict markers to resolve\n`);

    const marked = readFileSync(join(root, SELECT), 'utf8');
    expect(marked.split('\n').filter((line) => /^(<{7}|\|{7}|={7}|>{7})/.test(line))).toEqual([
      '<<<<<<< local',
      `||||||| @ultima/select ${OLD}`,
      '=======',
      `>>>>>>> @ultima/select ${NEW}`,
      '<<<<<<< local',
      `||||||| @ultima/select ${OLD}`,
      '=======',
      `>>>>>>> @ultima/select ${NEW}`,
    ]);
    expect(marked).toContain(
      ['<<<<<<< local', '  return <Spinner label="ours" />;', `||||||| @ultima/select ${OLD}`, '  return <Spinner label="one" />;', '=======', '  return <Spinner label="theirs" />;', `>>>>>>> @ultima/select ${NEW}`].join('\n'),
    );
    expect(marked.trimEnd().split('\n').at(-1)).toBe(await servedStamp(['theirs', 2]));
  });

  it('applies a plan made with --write-conflicts as it was made, and refuses one whose base is gone since', async () => {
    const { root, raw } = await selectFixture(['one', 1], ['ours', 3], ['theirs', 2]);
    const { path, plan } = await planFile(root, '--write-conflicts');
    expect(plan).toMatchObject({ writeConflicts: true, files: [{ item: 'select', action: 'conflict', base: 'verified', hunks: 2 }] });
    expect(plan.commands).toEqual([{ for: 'apply', command: 'npx ultima-design update --write-conflicts --yes' }]);

    const without = { ...plan, writeConflicts: false };
    const tampered = join(root, '..', 'tampered.json');
    writeFileSync(tampered, JSON.stringify(without));
    expect((await run(['update', '--apply', tampered, '--cwd', root])).code).toBe(2);

    const source = raw[`${OLD}/packages/ui/src/select.tsx`] as string;
    raw[`${OLD}/packages/ui/src/select.tsx`] = 'export const other = 1;\n';
    const stale = await run(['update', '--apply', path, '--cwd', root]);
    expect(stale.code).toBe(3);
    expect(stale.stdout).toContain(`${SELECT} changed since it was planned`);

    raw[`${OLD}/packages/ui/src/select.tsx`] = source;
    const applied = await run(['update', '--apply', path, '--json', '--cwd', root]);
    expect(JSON.parse(applied.stdout)).toMatchObject({ written: [SELECT], conflicts: [SELECT] });
    expect(readFileSync(join(root, SELECT), 'utf8')).toContain('<<<<<<< local\n');
  });

  it('--apply writes a merge exactly as --yes does', async () => {
    const { root } = await selectFixture(['one', 1], ['ours', 1], ['one', 2]);
    const { path } = await planFile(root);
    expect((await run(['update', '--apply', path, '--cwd', root])).code).toBe(0);
    expect(readFileSync(join(root, SELECT), 'utf8')).toBe(withStamp(viteCopy(selectSource('ours', 2)), await servedStamp(['one', 2])));
  });
});

describe('update --replace', () => {
  it('overwrites an edited file, keeps the original in the journal, and --rollback restores it', async () => {
    const { registry } = await serve([{ name: 'select', file: 'select.tsx', source: selectSource('one', 2) }]);
    const edited = await stamped('select', selectSource('one', 2), NEW, viteCopy(selectSource('ours', 2)));
    const root = project({
      'components.json': JSON.stringify({ aliases: { ui: '@/components/ui', lib: '@/lib' }, registries: { '@ultima': registry } }),
      'tsconfig.json': JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
      [SELECT]: edited,
    });
    expect(await statusOf(root)).toEqual({ [SELECT]: 'edited' });
    expect((await run(['update', '--cwd', root])).stdout).toContain('Nothing to update.');

    const planned = await run(['update', '--replace', 'select', '--cwd', root]);
    expect(planned.stdout).toContain(`select  ${SELECT}  edited  replace  --replace; the journal keeps the local file\n`);
    expect(planned.stdout).toContain('apply   npx ultima-design update --replace select --yes\n');

    expect((await run(['update', '--replace', 'select', '--yes', '--cwd', root])).code).toBe(0);
    const installed = selectSource('one', 2).replace('@/registry/ultima/ui/', '@/components/ui/');
    expect(readFileSync(join(root, SELECT), 'utf8')).toBe(withStamp(installed, await servedStamp(['one', 2])));
    expect(await statusOf(root)).toEqual({ [SELECT]: 'current' });
    const [runId] = runs(root);
    const journal = JSON.parse(readFileSync(join(root, '.ultima-update', runId as string, 'journal.json'), 'utf8'));
    expect(journal.operations).toMatchObject([{ id: `replace ${SELECT}`, status: 'done' }]);
    expect(readFileSync(join(root, '.ultima-update', runId as string, 'files', journal.originals[SELECT].sha256), 'utf8')).toBe(edited);

    expect((await run(['update', '--rollback', '--cwd', root])).code).toBe(0);
    expect(readFileSync(join(root, SELECT), 'utf8')).toBe(edited);
  });

  it('takes the served file for a conflicting and an unstamped file, through a plan --apply applies as made', async () => {
    const { root } = await fixture();
    const { plan } = (await update(root, [], { replace: ['sidebar', 'lib'] })) as UpdateReport;
    expect(plan.files.map(({ item, action }) => [item, action])).toEqual([
      ['dialog', 'replace'],
      ['lib', 'replace'],
      ['sidebar', 'replace'],
    ]);
    const { path } = await planFile(root, '--replace', 'sidebar', '--replace', 'lib');
    const applied = await run(['update', '--apply', path, '--json', '--cwd', root]);
    expect(JSON.parse(applied.stdout)).toMatchObject({ written: ['src/components/ui/dialog.tsx', 'src/lib/component.ts', 'src/components/ui/sidebar.tsx'], conflicts: [] });
    expect(await statusOf(root)).toMatchObject({ 'src/components/ui/sidebar.tsx': 'current', 'src/lib/component.ts': 'current', 'src/components/ui/dialog.tsx': 'current' });
  });

  it('exits 2 when --replace names an item that is not installed', async () => {
    const { root } = await fixture();
    const before = snapshot(root);
    const result = await run(['update', '--replace', 'notinstalled', '--yes', '--cwd', root]);
    expect(result).toMatchObject({ code: 2, stdout: '' });
    expect(result.stderr).toContain('notinstalled');
    expect(snapshot(root)).toEqual(before);
  });
});

describe('update merges a tokens file', () => {
  it('closes the merge with the served base-theme marker and stamp, though the local file predates the marker', async () => {
    const tokens = (radius: number, space: number) => `export const radius = { md: ${radius} };\n\nexport const gap = 1;\n\nexport const space = { md: ${space} };\n`;
    const served = `${tokens(4, 8)}// @ultima-base neutral-tight\n`;
    const { registry } = await serve([{ name: 'tokens', file: 'tokens.stylex.ts', source: served, type: 'registry:lib', baseTheme: 'neutral-tight' }], {
      raw: { [`${OLD}/packages/ui/src/lib/tokens.stylex.ts`]: tokens(10, 8) },
    });
    const root = project({
      'components.json': JSON.stringify({ aliases: { ui: '@/components/ui', lib: '@/lib' }, registries: { '@ultima': registry } }),
      'tsconfig.json': JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
      'src/lib/tokens.stylex.ts': await stamped('tokens', tokens(10, 8), OLD, tokens(10, 12)),
    });
    const { plan } = (await update(root, [], { acceptBaseTheme: true })) as UpdateReport;
    expect(plan.files).toMatchObject([{ item: 'tokens', state: 'diverged', action: 'merge', base: 'verified', hunks: 0 }]);

    expect((await run(['update', '--accept-base-theme', '--yes', '--cwd', root])).code).toBe(0);
    const merged = readFileSync(join(root, 'src/lib/tokens.stylex.ts'), 'utf8');
    expect(merged).toBe(withStamp(`${tokens(4, 12)}// @ultima-base neutral-tight\n`, stampLine('tokens', NEW, await contentHash(served, 'c1'), 'ts')));
    expect(fileBaseTheme(merged)).toBe('neutral-tight');
    expect(await statusOf(root)).toEqual({ 'src/lib/tokens.stylex.ts': 'edited' });
  });
});
