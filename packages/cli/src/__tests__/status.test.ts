import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { describe, expect, it } from 'vitest';

import { renderAsInstalled } from '../diff.ts';
import { CLI_VERSION, skillStamp } from '../install.ts';
import { run } from '../run.ts';
import { contentHash, stampLine, withStamp } from '../stamp.ts';
import { fileState } from '../status.ts';
import { UNMARKED_NEUTRAL_HASHES } from '../base-theme.ts';
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

type Item = { name: string; type?: string; files: Record<string, string>; content?: string; targets?: Record<string, string>; baseTheme?: string };

async function serve(items: Item[], format: unknown = 1): Promise<string> {
  const catalogue = {
    name: 'ultima',
    meta: { ultima: { format } },
    items: items.map(({ name, type = 'registry:ui', files, targets, baseTheme }) => ({
      name,
      type,
      files: Object.keys(files).map((file) => ({ path: `ultima/${type === 'registry:lib' ? 'lib' : 'ui'}/${file}`, type, ...(targets?.[file] && { target: targets[file] }) })),
      meta: { ultima: { revision: NEW, files, ...(baseTheme && { baseTheme }) } },
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
  it.each(UNMARKED_NEUTRAL_HASHES)('recognizes the first Neutral rollout before markers (%s), including later edits', async (hash) => {
    const css = hash.startsWith('b1:');
    const item = css ? 'tokens-css' : 'tokens';
    const name = css ? 'tokens.css' : 'tokens.stylex.ts';
    const file = css ? 'ultima-tokens.css' : 'src/lib/tokens.stylex.ts';
    const content = css ? ':root { --ult-radius-md: 6px; }' : 'export const radius = 6;';
    const registry = await serve([{ name: item, type: 'registry:lib', files: { [name]: 'c1:0123456789abcdef' }, ...(css && { targets: { [name]: '~/ultima-tokens.css' } }), baseTheme: 'neutral-tight' }]);
    const root = consumer(registry, { [file]: withStamp(content, stampLine(item, OLD, hash, css ? 'css' : 'ts')) });
    expect((await statusJson(root)).report).toHaveProperty('notices', []);
    expect((await status(root)).stdout).not.toContain('https://ultima.systems/install/update');
  });

  it.each(['tokens', 'tokens-css'])('does not warn after rollout for current or subsequently edited %s files', async (item) => {
    const css = item === 'tokens-css';
    const file = css ? 'ultima-tokens.css' : 'src/lib/tokens.stylex.ts';
    const name = css ? 'tokens.css' : 'tokens.stylex.ts';
    const scheme = css ? 'b1' : 'c1';
    const syntax = css ? 'css' : 'ts';
    const fresh = css ? ':root { --ult-radius-md: 4px; }\n/* @ultima-base neutral-tight */\n' : 'export const radius = 4;\n// @ultima-base neutral-tight\n';
    const hash = await contentHash(fresh, scheme);
    const registry = await serve([{ name: item, type: 'registry:lib', files: { [name]: hash }, ...(css && { targets: { [name]: '~/ultima-tokens.css' } }), baseTheme: 'neutral-tight' }]);
    for (const content of [fresh, fresh.replace('4', '6')]) {
      const root = consumer(registry, { [file]: withStamp(content, stampLine(item, NEW, hash, syntax)) });
      expect((await statusJson(root)).report).toHaveProperty('notices', []);
      expect((await status(root)).stdout).not.toContain('https://ultima.systems/install/update');
    }
    const later = await serve([{ name: item, type: 'registry:lib', files: { [name]: await contentHash(fresh.replace('4', '8'), scheme) }, ...(css && { targets: { [name]: '~/ultima-tokens.css' } }), baseTheme: 'neutral-tight' }]);
    expect((await statusJson(consumer(later, { [file]: withStamp(fresh, stampLine(item, NEW, hash, syntax)) }))).report).toHaveProperty('notices', []);
  });

  it('warns once for legacy CSS and edited token sources, while leaving custom theme files untouched', async () => {
    const old = 'export const radius = 10;\n';
    const css = ':root { --ult-radius-md: 10px; }\n';
    const registry = await serve([
      { name: 'tokens', type: 'registry:lib', files: { 'tokens.stylex.ts': await contentHash(old.replace('10', '4'), 'c1') }, baseTheme: 'neutral-tight' },
      { name: 'tokens-css', files: { 'tokens.css': await contentHash(css.replace('10', '4'), 'b1') }, targets: { 'tokens.css': '~/ultima-tokens.css' }, baseTheme: 'neutral-tight' },
    ]);
    const root = consumer(registry, {
      'src/lib/tokens.stylex.ts': await stamped('tokens', old, OLD, old.replace('10', '12')),
      'ultima-tokens.css': withStamp(css, stampLine('tokens-css', OLD, await contentHash(css, 'b1'), 'css')),
      'ultima-theme.css': ':root { --ult-radius-md: 20px; }',
    });
    expect((await statusJson(root)).report).toHaveProperty('notices', [expect.objectContaining({ files: ['src/lib/tokens.stylex.ts', 'ultima-tokens.css'] })]);
    expect((await status(root)).stdout.match(/https:\/\/ultima.systems\/install\/update/g)).toHaveLength(1);
  });

  it('preserves legacy registry behavior when base-theme metadata is absent', async () => {
    const old = 'export const radius = 10;\n';
    const registry = await serve([{ name: 'tokens', type: 'registry:lib', files: { 'tokens.stylex.ts': await contentHash(old.replace('10', '4'), 'c1') } }]);
    expect((await statusJson(consumer(registry, { 'src/lib/tokens.stylex.ts': await stamped('tokens', old, OLD) }))).report).toHaveProperty('notices', []);
  });

  it('names the Neutral/Tight change and update page for a legacy token install in text and JSON without writing files', async () => {
    const old = 'export const radius = 10;\n';
    const fresh = 'export const radius = 4;\n';
    const registry = await serve([{ name: 'tokens', type: 'registry:lib', files: { 'tokens.stylex.ts': await contentHash(fresh, 'c1') }, baseTheme: 'neutral-tight' }]);
    const root = consumer(registry, { 'src/lib/tokens.stylex.ts': await stamped('tokens', old, OLD) });
    const { code, report } = await statusJson(root);
    expect(code).toBe(0);
    expect(report).toHaveProperty('notices', [{
      id: 'base-theme-neutral-tight',
      message: expect.stringContaining('Neutral with Tight radius'),
      link: 'https://ultima.systems/install/update',
      files: ['src/lib/tokens.stylex.ts'],
    }]);
    const text = await status(root);
    expect(text.stdout).toContain('Neutral with Tight radius');
    expect(text.stdout).toContain('https://ultima.systems/install/update');
  });

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

  it("finds a block's files under the components alias its targets name", async () => {
    const entry = (name: string) => `import { Brand } from './brand';\n\nexport function ${name}() {\n  return <Brand />;\n}\n`;
    const brand = "export function Brand() {\n  return null;\n}\n";
    const registry = await serve([
      {
        name: 'sign-in-01',
        type: 'registry:block',
        files: { 'sign-in-01.tsx': await contentHash(entry('SignIn01'), 'c1'), 'brand.tsx': await contentHash(brand, 'c1') },
        targets: { 'sign-in-01.tsx': '@components/sign-in-01/sign-in-01.tsx', 'brand.tsx': '@components/sign-in-01/brand.tsx' },
      },
    ]);
    const root = project({
      'components.json': JSON.stringify({ aliases: { components: '@/components', ui: '@/components/ui', lib: '@/lib' }, registries: { '@ultima': registry } }),
      'tsconfig.json': JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
      'src/components/sign-in-01/sign-in-01.tsx': await stamped('sign-in-01', entry('SignIn01'), NEW, entry('SignIn01')),
      'src/components/sign-in-01/brand.tsx': await stamped('sign-in-01', brand, NEW, `${brand}// Ours now.\n`),
    });
    const { report } = await statusJson(root);
    expect(report.files.map(({ item, file, state }) => [item, file, state])).toEqual([
      ['sign-in-01', 'src/components/sign-in-01/brand.tsx', 'current'],
      ['sign-in-01', 'src/components/sign-in-01/sign-in-01.tsx', 'current'],
    ]);
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
        'diverged  npx ultima-design diff sidebar  (reinstalling discards your edits)',
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
      'unknown-scheme  toast carries a hash scheme this CLI does not know; upgrade it: npm install -D ultima-design@latest',
    ]);
  });

  it('adds a row per managed skill, current, stale, or edited, and never changes the exit code', async () => {
    const skill = readFileSync(new URL('../../skill/ultima-design/SKILL.md', import.meta.url), 'utf8');
    const registry = await serve([{ name: 'button', files: { 'button.tsx': await contentHash(staged('Button', 'two'), 'c1') } }]);
    const files = {
      'src/components/ui/button.tsx': await stamped('button', staged('Button', 'two'), NEW),
      '.claude/skills/ultima-design/SKILL.md': skillStamp(skill, '0.0.0-old'),
      '.agents/skills/ultima-design/SKILL.md': `${skillStamp(skill, CLI_VERSION)}Our own line.\n`,
    };
    const root = consumer(registry, files);
    const { code, stdout } = await status(root);
    expect(code).toBe(0);
    expect(stdout.trimEnd().split('\n').slice(-5)).toEqual([
      `button  src/components/ui/button.tsx           current  ${NEW}`,
      'skill   .claude/skills/ultima-design/SKILL.md  stale    0.0.0-old',
      `skill   .agents/skills/ultima-design/SKILL.md  edited   ${CLI_VERSION}`,
      '',
      'stale   npx ultima-design install',
    ]);

    const { report } = await statusJson(consumer(registry, { ...files, '.claude/skills/ultima-design/SKILL.md': skillStamp(skill, CLI_VERSION) }));
    expect((report as unknown as { managed: unknown[] }).managed).toEqual([
      { file: '.claude/skills/ultima-design/SKILL.md', state: 'current', version: CLI_VERSION },
      { file: '.agents/skills/ultima-design/SKILL.md', state: 'edited', version: CLI_VERSION },
    ]);
  });

  it.each([
    ['an unreachable registry', async () => consumer('http://127.0.0.1:9/r/{name}.json'), 'ULT-STATUS-002', /registry\.json/],
    ['a missing components.json', async () => project({ 'tsconfig.json': '{}' }), 'ULT-SCOPE-001', /doctor/],
    ['a registry format out of range', async () => consumer(await serve([], 2)), 'ULT-STATUS-003', /npm install -D ultima-design@latest/],
    ['no @ultima registry', async () => consumer(''), 'ULT-STATUS-001', /"@ultima"/],
  ])('exits 3 on %s, naming the cause and its repair', async (_, root, ruleId, repair) => {
    const result = await status(await root(), '--json');
    expect(result.code).toBe(3);
    const [diagnostic] = JSON.parse(result.stdout).diagnostics;
    expect(diagnostic).toMatchObject({ ruleId, severity: 'incomplete' });
    expect(diagnostic.repair).toMatch(repair);
  });
});

async function servedCopy(item: string, source: string) {
  const hash = await contentHash(source, 'c1');
  return { hash, content: withStamp(source, stampLine(item, NEW, hash, 'ts')) };
}

async function diff(root: string, ...args: string[]) {
  const before = snapshot(root);
  const result = await run(['diff', '--cwd', root, ...args]);
  expect(snapshot(root)).toEqual(before);
  return result;
}

describe('renderAsInstalled', () => {
  const aliases = { ui: '@/components/ui', lib: '@/lib' };
  const served = `'use client';\n\nimport { Spinner } from '@/registry/ultima/ui/spinner';\nimport type { StyleSlot } from "@/registry/ultima/lib/component";\n`;

  it('rewrites the registry specifiers to the aliases', () => {
    expect(renderAsInstalled(served, aliases, false)).toBe(
      `'use client';\n\nimport { Spinner } from '@/components/ui/spinner';\nimport type { StyleSlot } from "@/lib/component";\n`,
    );
  });

  it('drops the directive without rsc only when shadcn would: unterminated', () => {
    expect(renderAsInstalled(served.replace("'use client';", "'use client'"), aliases, false)).toMatch(/^import \{ Spinner \}/);
  });

  it('keeps the directive with rsc', () => {
    expect(renderAsInstalled(served, aliases, true)).toMatch(/^'use client';\n\nimport \{ Spinner \} from '@\/components\/ui\/spinner';/);
  });
});

describe('diff', () => {
  it('shows only the local edit against the served file as installed here', async () => {
    const served = await servedCopy('button', staged('Button', 'two'));
    const registry = await serve([{ name: 'button', files: { 'button.tsx': served.hash }, content: served.content }]);
    const local = renderAsInstalled(served.content, { ui: '@/components/ui', lib: '@/lib' }, false).replace('label="two"', 'label="mine"');
    const root = consumer(registry, { 'src/components/ui/button.tsx': local });

    const { code, stdout } = await diff(root, 'button');
    expect(code).toBe(0);
    expect(stdout).toBe(
      [
        `--- src/components/ui/button.tsx  (local, edited, installed ${NEW})`,
        `+++ src/components/ui/button.tsx  (@ultima/button at ${NEW})`,
        '@@ -2,7 +2,7 @@',
        ' ',
        " import { Spinner } from '@/components/ui/spinner';",
        ' ',
        ' export function Button() {',
        '-  return <Spinner label="mine" />;',
        '+  return <Spinner label="two" />;',
        ' }',
        ` ${stampLine('button', NEW, served.hash, 'ts')}`,
        '',
      ].join('\n'),
    );
  });

  it('prints a named item that differs only by formatting and comments as current', async () => {
    const served = await servedCopy('card', staged('Card', 'two'));
    const registry = await serve([{ name: 'card', files: { 'card.tsx': served.hash }, content: served.content }]);
    const reformatted = viteCopy(staged('Card', 'two')).replaceAll("'", '"').replace('export function', '// Ours now.\nexport  function');
    const root = consumer(registry, { 'src/components/ui/card.tsx': withStamp(reformatted, stampLine('card', NEW, served.hash, 'ts')) });
    expect(await diff(root, 'card')).toMatchObject({ code: 0, stdout: 'card: current\n' });
  });

  it('covers exactly the files status reports as not current when given no items', async () => {
    const items = await Promise.all(['Button', 'Dialog', 'Menu'].map((name) => servedCopy(name.toLowerCase(), staged(name, 'two'))));
    const [button, dialog, menu] = items as [(typeof items)[0], (typeof items)[0], (typeof items)[0]];
    const registry = await serve([
      { name: 'button', files: { 'button.tsx': button.hash }, content: button.content },
      { name: 'dialog', files: { 'dialog.tsx': dialog.hash }, content: dialog.content },
      { name: 'menu', files: { 'menu.tsx': menu.hash }, content: menu.content },
    ]);
    const root = consumer(registry, {
      'src/components/ui/button.tsx': await stamped('button', staged('Button', 'two'), NEW),
      'src/components/ui/dialog.tsx': await stamped('dialog', staged('Dialog', 'two'), NEW, viteCopy(staged('Dialog', 'three'))),
      'src/components/ui/menu.tsx': await stamped('menu', staged('Menu', 'one'), OLD),
      'src/components/ui/tabs.tsx': await stamped('tabs', staged('Tabs', 'one'), OLD),
    });

    const { report } = await statusJson(root);
    const drifted = report.files.filter(({ state }) => state !== 'current');
    const { code, stdout } = await diff(root);
    expect(code).toBe(0);
    const covered = stdout.split('\n').flatMap((line) => line.match(/^--- (\S+)  \(local, (\S+),/)?.slice(1, 3).join(' ') ?? []);
    expect(covered).toEqual(drifted.filter(({ state }) => state !== 'retired').map(({ file, state }) => `${file} ${state}`));
    expect(stdout).toContain('tabs: retired, the registry no longer serves src/components/ui/tabs.tsx\n');
    expect(drifted.map(({ item }) => item)).toEqual(['dialog', 'menu', 'tabs']);
  });

  it('prints a served item that is not installed as such', async () => {
    const registry = await serve([{ name: 'button', files: { 'button.tsx': 'c1:0123456789abcdef' } }]);
    expect(await diff(consumer(registry), 'button')).toMatchObject({ code: 0, stdout: 'button: not installed\n' });
  });

  it('exits 2 on an item neither served nor installed', async () => {
    const registry = await serve([]);
    const result = await diff(consumer(registry), 'nonexistent-item');
    expect(result).toMatchObject({ code: 2, stdout: '' });
    expect(result.stderr).toContain('nonexistent-item is neither served');
  });

  it('exits 3 on an unreachable registry', async () => {
    const result = await diff(consumer('http://127.0.0.1:9/r/{name}.json'), 'button');
    expect(result.code).toBe(3);
    expect(result.stdout).toContain('ULT-STATUS-002');
  });

  it("exits 3 when an item's content cannot be fetched", async () => {
    const registry = await serve([{ name: 'menu', files: { 'menu.tsx': await contentHash(staged('Menu', 'two'), 'c1') } }]);
    const root = consumer(registry, { 'src/components/ui/menu.tsx': await stamped('menu', staged('Menu', 'one'), OLD) });
    const result = await diff(root);
    expect(result.code).toBe(3);
    expect(result.stdout).toContain('ULT-DIFF-001');
  });
});
