import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { run } from '../run.ts';
import { contentHash, stampLine, withStamp } from '../stamp.ts';
import { type UpdateReport, planAction, printUpdate, update, updateExit } from '../update.ts';
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
async function serve(
  items: { name: string; file: string; source: string; type?: string; scheme?: 'c1' | 'b1' }[],
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
  for (const { name, file, source: text, type = 'registry:ui', scheme = 'c1' } of items) {
    const hash = await contentHash(text, scheme);
    const path = `ultima/${type === 'registry:lib' ? 'lib' : 'ui'}/${file}`;
    const sources = source === 'older' ? {} : { sources: { [file]: `packages/ui/src/${type === 'registry:lib' ? 'lib/' : ''}${file}` } };
    catalogue.items.push({ name, type, files: [{ path, type }], meta: { ultima: { revision: NEW, files: { [file]: hash }, ...sources } } });
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
    expect(planAction(row('current'))).toEqual({ action: 'none', reason: null, base: null });
    expect(planAction(row('edited'))).toEqual({ action: 'none', reason: null, base: null });
    expect(planAction(row('behind'))).toEqual({ action: 'replace', reason: null, base: null });
    expect(planAction({ ...row('unstamped'), installed: null })).toEqual({ action: 'report', reason: 'no installed base', base: null });
    expect(planAction(row('retired')).action).toBe('report');
    expect(planAction(row('unknown-scheme')).action).toBe('report');
  });

  it('reports a diverged c1 file with its base, verified or not, until merging is built', () => {
    expect(planAction(row('diverged'), { text: 'base' })).toEqual({ action: 'report', reason: 'installed base verified; merging is not built yet', base: 'verified' });
    expect(planAction(row('diverged'), { reason: 'why' })).toEqual({ action: 'report', reason: 'no installed base: why', base: 'unavailable' });
  });

  it('reports a diverged b1 file, which cannot be merged, without a base', () => {
    expect(planAction(row('diverged', 'b1'))).toEqual({ action: 'report', reason: 'built file, which cannot be merged', base: null });
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
        'item     file                           state      action',
        'dialog   src/components/ui/dialog.tsx   behind     replace',
        'lib      src/lib/component.ts           unstamped  report   no installed base',
        'sidebar  src/components/ui/sidebar.tsx  diverged   report   installed base verified; merging is not built yet',
        '',
        'apply    npx ultima-design update --yes',
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
    expect(stdout).toContain('reported  src/lib/component.ts, src/components/ui/sidebar.tsx\n');
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
    expect(plan.stdout).toContain('dialog   src/components/ui/dialog.tsx   behind     replace  uncommitted changes, kept in the journal\n');
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
      ['lib', 'report', null],
      ['sidebar', 'report', 'verified'],
    ]);
    expect(requests).toEqual([`/raw/${SIDEBAR}`]);
  });

  it('falls back to the built-in address and the authored layout for a catalogue served before the source keys', async () => {
    const { row, requests } = await sidebar({ source: 'older' }, (raw) => raw);
    expect(row).toMatchObject({ action: 'report', base: 'verified' });
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

  it('never fetches a base for a diverged b1 file', async () => {
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
  });
});
