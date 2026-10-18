import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { run } from '../run.ts';
import { contentHash, stampLine, withStamp } from '../stamp.ts';
import { planAction, printUpdate, update, updateExit } from '../update.ts';
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

/** A registry at revision NEW serving each item's one file, with its stamped content. */
async function serve(items: { name: string; file: string; source: string; type?: string }[]): Promise<string> {
  const served: Record<string, unknown> = {};
  const catalogue = { name: 'ultima', meta: { ultima: { format: 1 } }, items: [] as unknown[] };
  for (const { name, file, source, type = 'registry:ui' } of items) {
    const hash = await contentHash(source, 'c1');
    const path = `ultima/${type === 'registry:lib' ? 'lib' : 'ui'}/${file}`;
    catalogue.items.push({ name, type, files: [{ path, type }], meta: { ultima: { revision: NEW, files: { [file]: hash } } } });
    served[`/r/${name}.json`] = { name, files: [{ path, type, content: withStamp(source, stampLine(name, NEW, hash, 'ts')) }] };
  }
  served['/r/registry.json'] = catalogue;
  const server = createServer((request, response) => {
    const body = served[request.url ?? ''];
    if (!body) response.writeHead(404).end();
    else response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
  });
  await new Promise<void>((listening) => server.listen(0, '127.0.0.1', listening));
  server.unref();
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/r/{name}.json`;
}

/** One file in each of the states behind, current, unstamped and diverged. */
async function fixture() {
  const registry = await serve([
    { name: 'button', file: 'button.tsx', source: staged('Button', 'two') },
    { name: 'dialog', file: 'dialog.tsx', source: staged('Dialog', 'two') },
    { name: 'lib', file: 'component.ts', source: 'export type StyleSlot = unknown;\n', type: 'registry:lib' },
    { name: 'sidebar', file: 'sidebar.tsx', source: staged('Sidebar', 'two') },
  ]);
  const root = project({
    'components.json': JSON.stringify({ aliases: { ui: '@/components/ui', lib: '@/lib' }, registries: { '@ultima': registry } }),
    'tsconfig.json': JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
    'src/components/ui/button.tsx': await stamped('button', staged('Button', 'two'), NEW),
    'src/components/ui/dialog.tsx': await stamped('dialog', staged('Dialog', 'one'), OLD),
    'src/lib/component.ts': 'export type StyleSlot = string;\n',
    'src/components/ui/sidebar.tsx': await stamped('sidebar', staged('Sidebar', 'one'), OLD, viteCopy(staged('Sidebar', 'three'))),
  });
  return { root, registry: registry.replace('/{name}.json', '') };
}

const runs = (root: string) => readdirSync(join(root, '.ultima-update')).filter((name) => name !== '.gitignore').sort();

async function statusOf(root: string) {
  const { files } = JSON.parse((await run(['status', '--cwd', root, '--json'])).stdout) as { files: { file: string; state: string }[] };
  return Object.fromEntries(files.map(({ file, state }) => [file, state]));
}

describe('planAction', () => {
  const row = (state: string, local = 'c1:1111') => ({ item: 'x', file: 'x.tsx', state, installed: null, local, served: 'c1:2222' }) as Parameters<typeof planAction>[0];

  it('gives each state its action from the spec table', () => {
    expect(planAction(row('current'))).toEqual({ action: 'none', reason: null });
    expect(planAction(row('edited'))).toEqual({ action: 'none', reason: null });
    expect(planAction(row('behind'))).toEqual({ action: 'replace', reason: null });
    expect(planAction(row('diverged'))).toEqual({ action: 'report', reason: 'no installed base' });
    expect(planAction(row('unstamped'))).toEqual({ action: 'report', reason: 'no installed base' });
    expect(planAction(row('retired')).action).toBe('report');
    expect(planAction(row('unknown-scheme')).action).toBe('report');
  });

  it('reports a diverged b1 file, which cannot be merged', () => {
    expect(planAction(row('diverged', 'b1:1111'))).toEqual({ action: 'report', reason: 'built file, which cannot be merged' });
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
        'sidebar  src/components/ui/sidebar.tsx  diverged   report   no installed base',
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
