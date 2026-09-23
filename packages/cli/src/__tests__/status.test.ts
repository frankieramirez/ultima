import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { describe, expect, it } from 'vitest';

import { run } from '../run.ts';
import { contentHash, stampLine, withStamp } from '../stamp.ts';
import { fileState } from '../status.ts';
import { project, snapshot } from './fixtures.ts';

describe('fileState', () => {
  it('is current when local equals served, whatever the stamp says', () => {
    expect(fileState('c1:1111', 'c1:2222', 'c1:2222')).toBe('current');
    expect(fileState(null, 'c1:2222', 'c1:2222')).toBe('current');
  });

  it('is edited when the registry has not moved and the file has', () => {
    expect(fileState('c1:1111', 'c1:2222', 'c1:1111')).toBe('edited');
  });

  it('is behind when the file is untouched and the registry moved', () => {
    expect(fileState('c1:1111', 'c1:1111', 'c1:2222')).toBe('behind');
  });

  it('is diverged when all three differ', () => {
    expect(fileState('c1:1111', 'c1:2222', 'c1:3333')).toBe('diverged');
  });

  it('is unstamped when there is no stamp and local differs from served', () => {
    expect(fileState(null, 'c1:2222', 'c1:3333')).toBe('unstamped');
  });

  it('is retired when nothing is served for the stamp', () => {
    expect(fileState('c1:1111', 'c1:1111', null)).toBe('retired');
  });
});

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

type Item = { name: string; type?: string; files: Record<string, string>; content?: string };

async function serve(items: Item[], format: unknown = 1): Promise<string> {
  const catalogue = {
    name: 'ultima',
    meta: { ultima: { format } },
    items: items.map(({ name, type = 'registry:ui', files }) => ({
      name,
      type,
      files: Object.keys(files).map((file) => ({ path: `ultima/${type === 'registry:lib' ? 'lib' : 'ui'}/${file}`, type })),
      meta: { ultima: { revision: NEW, files } },
    })),
  };
  const served: Record<string, unknown> = { '/r/registry.json': catalogue };
  for (const { name, files, content } of items) {
    served[`/r/${name}.json`] = { name, files: Object.keys(files).map((file) => ({ path: `ultima/ui/${file}`, content })) };
  }
  const server = createServer((request, response) => {
    const body = served[request.url ?? ''];
    if (!body) response.writeHead(404).end();
    else response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
  });
  await new Promise<void>((listening) => server.listen(0, '127.0.0.1', listening));
  server.unref();
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/r/{name}.json`;
}

function consumer(registry: string, files: Record<string, string> = {}): string {
  return project({
    'components.json': JSON.stringify({
      aliases: { ui: '@/components/ui', lib: '@/lib' },
      registries: { '@ultima': registry },
    }),
    'tsconfig.json': JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
    ...files,
  });
}

type Row = { item: string; file: string; state: string; installed: { revision: string; hash: string } | null; local: string | null; served: string | null };

async function status(root: string, ...flags: string[]) {
  const before = snapshot(root);
  const result = await run(['status', '--cwd', root, ...flags]);
  expect(snapshot(root)).toEqual(before);
  return result;
}

async function statusJson(root: string) {
  const result = await status(root, '--json');
  return { code: result.code, report: JSON.parse(result.stdout) as { registry: string; revision: string; files: Row[] } };
}

describe('status', () => {
  it('reports each of the six states, and a stamp in an unknown scheme, and exits 0', async () => {
    const old = (name: string) => staged(name, 'one');
    const next = (name: string) => staged(name, 'two');
    const edit = (name: string) => viteCopy(staged(name, 'three'));
    const hash = (source: string) => contentHash(source, 'c1');
    const registry = await serve([
      { name: 'button', files: { 'button.tsx': await hash(next('Button')) } },
      { name: 'card', files: { 'card.tsx': await hash(next('Card')) } },
      { name: 'dialog', files: { 'dialog.tsx': await hash(next('Dialog')) } },
      { name: 'menu', files: { 'menu.tsx': await hash(next('Menu')) } },
      { name: 'select', files: { 'select.tsx': await hash(next('Select')) } },
      { name: 'toast', files: { 'toast.tsx': await hash(next('Toast')) } },
      { name: 'lib', type: 'registry:lib', files: { 'component.ts': await hash('export type StyleSlot = unknown;\n') } },
    ]);
    const reformatted = viteCopy(next('Card')).replaceAll("'", '"').replace('export function', '// Ours now.\nexport  function');
    const root = consumer(registry, {
      'src/components/ui/button.tsx': await stamped('button', next('Button'), NEW),
      'src/components/ui/card.tsx': await stamped('card', next('Card'), NEW, reformatted),
      'src/components/ui/dialog.tsx': await stamped('dialog', next('Dialog'), NEW, edit('Dialog')),
      'src/components/ui/menu.tsx': await stamped('menu', old('Menu'), OLD),
      'src/components/ui/select.tsx': await stamped('select', old('Select'), OLD, edit('Select')),
      'src/components/ui/tabs.tsx': await stamped('tabs', old('Tabs'), OLD),
      'src/components/ui/toast.tsx': withStamp(viteCopy(old('Toast')), `// @ultima/toast ${OLD} c9:0123456789abcdef`),
      'src/components/ui/mine.tsx': 'export const Mine = 1;\n',
      'src/lib/component.ts': 'export type StyleSlot = string;\n',
      'src/lib/utils.ts': 'export const cn = 1;\n',
    });

    const { code, report } = await statusJson(root);
    expect(code).toBe(0);
    expect(report.files.map(({ item, file, state }) => [item, file, state])).toEqual([
      ['button', 'src/components/ui/button.tsx', 'current'],
      ['card', 'src/components/ui/card.tsx', 'current'],
      ['dialog', 'src/components/ui/dialog.tsx', 'edited'],
      ['lib', 'src/lib/component.ts', 'unstamped'],
      ['menu', 'src/components/ui/menu.tsx', 'behind'],
      ['select', 'src/components/ui/select.tsx', 'diverged'],
      ['tabs', 'src/components/ui/tabs.tsx', 'retired'],
      ['toast', 'src/components/ui/toast.tsx', 'unknown-scheme'],
    ]);
    expect(report.files.find(({ item }) => item === 'menu')).toEqual({
      item: 'menu',
      file: 'src/components/ui/menu.tsx',
      state: 'behind',
      installed: { revision: OLD, hash: await hash(old('Menu')) },
      local: await hash(old('Menu')),
      served: await hash(next('Menu')),
    });
    expect(report.files.find(({ item }) => item === 'lib')?.installed).toBeNull();
  });

  it('takes the stamp over the file name', async () => {
    const registry = await serve([{ name: 'button', files: { 'button.tsx': await contentHash(staged('Button', 'two'), 'c1') } }]);
    const root = consumer(registry, {
      'src/components/ui/primary-button.tsx': await stamped('button', staged('Button', 'two'), NEW),
    });
    const { report } = await statusJson(root);
    expect(report.files).toMatchObject([{ item: 'button', file: 'src/components/ui/primary-button.tsx', state: 'current' }]);
  });

  it('canonicalises the served content itself when only the installed scheme is known', async () => {
    const registry = await serve([
      { name: 'menu', files: { 'menu.tsx': 'c2:0123456789abcdef' }, content: withStamp(staged('Menu', 'two'), stampLine('menu', NEW, 'c2:0123456789abcdef', 'ts')) },
    ]);
    const root = consumer(registry, { 'src/components/ui/menu.tsx': await stamped('menu', staged('Menu', 'one'), OLD) });
    const { report } = await statusJson(root);
    expect(report.files).toMatchObject([{ item: 'menu', state: 'behind', served: await contentHash(staged('Menu', 'two'), 'c1') }]);
  });

  it('compares against the registry components.json names', async () => {
    const registry = await serve([]);
    const { code, report } = await statusJson(consumer(registry));
    expect(code).toBe(0);
    expect(report.registry).toBe(registry.replace('/{name}.json', ''));
    expect(report.files).toEqual([]);
  });

  it('prints the report as the spec shows it', async () => {
    const registry = await serve([
      { name: 'button', files: { 'button.tsx': await contentHash(staged('Button', 'two'), 'c1') } },
      { name: 'dialog', files: { 'dialog.tsx': await contentHash(staged('Dialog', 'two'), 'c1') } },
      { name: 'sidebar', files: { 'sidebar.tsx': await contentHash(staged('Sidebar', 'two'), 'c1') } },
    ]);
    const root = consumer(registry, {
      'src/components/ui/button.tsx': await stamped('button', staged('Button', 'two'), NEW),
      'src/components/ui/dialog.tsx': await stamped('dialog', staged('Dialog', 'one'), OLD),
      'src/components/ui/sidebar.tsx': await stamped('sidebar', staged('Sidebar', 'one'), OLD, viteCopy(staged('Sidebar', 'three'))),
    });
    const { code, stdout } = await status(root);
    expect(code).toBe(0);
    expect(stdout).toBe(
      [
        `Registry  ${registry.replace('/{name}.json', '')}  revision ${NEW}`,
        '',
        'item      file                           state     installed',
        `button    src/components/ui/button.tsx   current   ${NEW}`,
        `dialog    src/components/ui/dialog.tsx   behind    ${OLD}`,
        `sidebar   src/components/ui/sidebar.tsx  diverged  ${OLD}`,
        '',
        'behind    npx shadcn add @ultima/dialog --overwrite',
        'diverged  npx @ultima-systems/cli diff sidebar  (reinstalling discards your edits)',
        '',
      ].join('\n'),
    );
  });

  it('closes with one line each for retired files and unknown schemes', async () => {
    const registry = await serve([{ name: 'toast', files: { 'toast.tsx': await contentHash(staged('Toast', 'two'), 'c1') } }]);
    const root = consumer(registry, {
      'src/components/ui/tabs.tsx': await stamped('tabs', staged('Tabs', 'one'), OLD),
      'src/components/ui/toast.tsx': withStamp(viteCopy(staged('Toast', 'one')), `// @ultima/toast ${OLD} c9:0123456789abcdef`),
    });
    const lines = (await status(root)).stdout.trimEnd().split('\n');
    expect(lines.slice(-2)).toEqual([
      'retired         the registry no longer serves tabs; those files are yours alone now',
      'unknown-scheme  toast carries a hash scheme this CLI does not know; upgrade it: npm install -D @ultima-systems/cli@latest',
    ]);
  });

  it.each([
    ['an unreachable registry', async () => consumer('http://127.0.0.1:9/r/{name}.json'), 'ULT-STATUS-002', /registry\.json/],
    ['a missing components.json', async () => project({ 'tsconfig.json': '{}' }), 'ULT-SCOPE-001', /doctor/],
    ['a registry format out of range', async () => consumer(await serve([], 2)), 'ULT-STATUS-003', /npm install -D @ultima-systems\/cli@latest/],
    ['no @ultima registry', async () => consumer(''), 'ULT-STATUS-001', /"@ultima"/],
  ])('exits 3 on %s, naming the cause and its repair', async (_, root, ruleId, repair) => {
    const result = await status(await root(), '--json');
    expect(result.code).toBe(3);
    const [diagnostic] = JSON.parse(result.stdout).diagnostics;
    expect(diagnostic).toMatchObject({ ruleId, severity: 'incomplete' });
    expect(diagnostic.repair).toMatch(repair);
  });
});
