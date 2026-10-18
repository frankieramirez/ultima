import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ultimaPresetUrl } from '../../../../apps/docs/src/ultima-preset.ts';
import { UNMARKED_NEUTRAL_HASHES, fileBaseTheme } from '../base-theme.ts';
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

type Needs = { registryDependencies?: string[]; dependencies?: string[] };

/** A registry at revision NEW serving each item's one file, with its stamped content. */
async function serve(items: ({ name: string; file: string; source: string; type?: string; baseTheme?: string } & Needs)[]): Promise<string> {
  const served: Record<string, unknown> = {};
  const catalogue = { name: 'ultima', meta: { ultima: { format: 1 } }, items: [] as unknown[] };
  for (const { name, file, source, type = 'registry:ui', baseTheme, ...needs } of items) {
    const hash = await contentHash(source, 'c1');
    const path = `ultima/${type === 'registry:lib' ? 'lib' : 'ui'}/${file}`;
    catalogue.items.push({ name, type, ...needs, files: [{ path, type }], meta: { ultima: { revision: NEW, files: { [file]: hash }, ...(baseTheme && { baseTheme }) } } });
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

const LEGACY_TOKENS = 'export const radius = { md: 10 };\n';
const NEUTRAL_TOKENS = 'export const radius = { md: 4 };\n// @ultima-base neutral-tight\n';

/** A project whose `tokens` file holds `local` at revision OLD, served on Neutral with Tight radius. */
async function tokensFixture(local: string) {
  const registry = await serve([{ name: 'tokens', file: 'tokens.stylex.ts', source: NEUTRAL_TOKENS, type: 'registry:lib', baseTheme: 'neutral-tight' }]);
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
    const registry = await serve([
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
});
