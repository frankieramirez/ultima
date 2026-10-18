// docs/spec/ultima.md, Update, Proof: a consumer installs from a registry staged at one revision, edits some files, and
// updates to a second revision, with each installed base read from a loopback raw host.
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { dirname, join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { ultimaPresetUrl } from '../../../../apps/docs/src/ultima-preset.ts';
import { renderAsInstalled } from '../diff.ts';
import { rewriteImports, withBaseThemeMarker } from '../rebuild.ts';
import { run } from '../run.ts';
import { contentHash, stampLine, withStamp } from '../stamp.ts';
import { edit, project, snapshot, write } from './fixtures.ts';

const ONE = '1a2b3c4d5e6f';
const TWO = '3f9c2ab04e1d';

type Authored = {
  name: string;
  /** The authored repository path, which the catalogue names in `meta.ultima.sources`. */
  path: string;
  text: string;
  type?: 'registry:ui' | 'registry:lib' | 'registry:item';
  /** Where shadcn writes a `registry:file`, as the build's element items name it. */
  target?: string;
  registryDependencies?: string[];
};

const component = (name: string, body: string, imports = "import { Button } from '@ultima/ui/button';\n") =>
  `'use client';\n\n${imports}\nexport function ${name}() {\n  return ${body};\n}\n`;

/** The authored sources at each revision. Revision one was built before the base-theme marker shipped. */
const REVISIONS: Record<string, Authored[]> = {
  [ONE]: [
    { name: 'button', path: 'packages/ui/src/button.tsx', text: "'use client';\n\nexport function Button({ label }: { label: string }) {\n  return <button>{label}</button>;\n}\n" },
    { name: 'dialog', path: 'packages/ui/src/dialog.tsx', text: component('Dialog', '<Button label="Close" />'), registryDependencies: ['@ultima/button'] },
    { name: 'sidebar', path: 'packages/ui/src/sidebar.tsx', text: `${component('Sidebar', '<Button label="Menu" />')}\nexport const width = 240;\n`, registryDependencies: ['@ultima/button'] },
    { name: 'select', path: 'packages/ui/src/select.tsx', text: component('Select', '<Button label="Choose" />'), registryDependencies: ['@ultima/button'] },
    { name: 'badge', path: 'packages/ui/src/badge.tsx', text: component('Badge', '<span>new</span>', '') },
    { name: 'tokens', path: 'packages/tokens/src/tokens.stylex.ts', text: "export const radius = { md: '10px' };\n", type: 'registry:lib' },
    { name: 'lib', path: 'packages/ui/src/lib/component.ts', text: 'export type StyleSlot = unknown;\n', type: 'registry:lib' },
    { name: 'ult-badge', path: 'packages/elements/src/ult-badge.element.ts', text: "customElements.define('ult-badge', class extends HTMLElement {});\n", type: 'registry:item', target: '~/ult-badge.js' },
  ],
  [TWO]: [
    { name: 'button', path: 'packages/ui/src/button.tsx', text: "'use client';\n\nexport function Button({ label }: { label: string }) {\n  return <button>{label}</button>;\n}\n" },
    { name: 'dialog', path: 'packages/ui/src/dialog.tsx', text: component('Dialog', '<Button label="Dismiss" />'), registryDependencies: ['@ultima/button'] },
    { name: 'sidebar', path: 'packages/ui/src/sidebar.tsx', text: `${component('Sidebar', '<Button label="Menu" />')}\nexport const width = 256;\n`, registryDependencies: ['@ultima/button'] },
    { name: 'select', path: 'packages/ui/src/select.tsx', text: component('Select', '<Button label="Select an option" />'), registryDependencies: ['@ultima/button'] },
    { name: 'badge', path: 'packages/ui/src/badge.tsx', text: component('Badge', '<Spinner label="new" />', "import { Spinner } from '@ultima/ui/spinner';\n"), registryDependencies: ['@ultima/spinner'] },
    { name: 'spinner', path: 'packages/ui/src/spinner.tsx', text: 'export function Spinner({ label }: { label: string }) {\n  return <span role="status">{label}</span>;\n}\n' },
    { name: 'tokens', path: 'packages/tokens/src/tokens.stylex.ts', text: "export const radius = { md: '4px' };\n", type: 'registry:lib' },
    { name: 'lib', path: 'packages/ui/src/lib/component.ts', text: 'export type StyleSlot = object;\n', type: 'registry:lib' },
    { name: 'ult-badge', path: 'packages/elements/src/ult-badge.element.ts', text: "customElements.define('ult-badge', class extends HTMLElement { static observedAttributes = ['tone']; });\n", type: 'registry:item', target: '~/ult-badge.js' },
  ],
};

/**
 * The catalogue and item payloads the registry build serves at `revision`: each source rewritten by the build's rules
 * and stamped, every item naming its authored path, and the catalogue naming the raw host. An element bundle is build
 * output, served as the `b1` file it compiles to. `marker` is whether the build closes `tokens` with the base-theme
 * marker and serves its base theme.
 */
async function stage(revision: string, raw: string, marker: boolean): Promise<Record<string, unknown>> {
  const served: Record<string, unknown> = {};
  const items: unknown[] = [];
  for (const { name, path, text, type = 'registry:ui', target, registryDependencies } of REVISIONS[revision] as Authored[]) {
    const file = target ? `${name}.js` : path.split('/').at(-1)!;
    const scheme = target ? 'b1' : 'c1';
    const staged = target ? text : marker ? withBaseThemeMarker(name, rewriteImports(text, path), 'ts') : rewriteImports(text, path);
    const hash = await contentHash(staged, scheme);
    const entry = target
      ? { path: `ultima/elements/${file}`, type: 'registry:file', target }
      : { path: `ultima/${type === 'registry:lib' ? 'lib' : 'ui'}/${file}`, type };
    const baseTheme = marker && name === 'tokens' ? { baseTheme: 'neutral-tight' } : {};
    items.push({ name, type, ...(registryDependencies && { registryDependencies }), files: [entry], meta: { ultima: { revision, files: { [file]: hash }, sources: { [file]: path }, ...baseTheme } } });
    served[`/r/${name}.json`] = { name, files: [{ ...entry, content: withStamp(staged, stampLine(name, revision, hash, 'ts')) }] };
  }
  served['/r/registry.json'] = { name: 'ultima', meta: { ultima: { format: 1, source: { repository: 'https://example.test/ultima', raw } } }, items };
  return served;
}

const DIALOG = 'src/components/ui/dialog.tsx';
const SIDEBAR = 'src/components/ui/sidebar.tsx';
const SELECT = 'src/components/ui/select.tsx';
const BADGE = 'src/components/ui/badge.tsx';
const TOKENS = 'src/lib/tokens.stylex.ts';
const LIB = 'src/lib/component.ts';
const ELEMENT = 'ult-badge.js';

const projectFiles = (root: string) => Object.fromEntries(Object.entries(snapshot(root)).filter(([path]) => !path.startsWith('.ultima-update')));

async function statusOf(root: string) {
  const { files } = JSON.parse((await run(['status', '--cwd', root, '--json'])).stdout) as { files: { file: string; state: string }[] };
  return Object.fromEntries(files.map(({ file, state }) => [file, state]));
}

describe('update across two staged registry revisions', () => {
  let root: string;
  let registry: string;
  let raw: string;
  let serving: Record<string, unknown>;
  const raws: string[] = [];
  /** The project as the consumer left it at revision one, before any update. */
  let edited: Record<string, string>;
  let planPath: string;
  let applied: string;

  beforeAll(async () => {
    const authored = Object.fromEntries(Object.entries(REVISIONS).flatMap(([revision, sources]) => sources.map(({ path, text }) => [`/raw/${revision}/${path}`, text])));
    const server = createServer((request, response) => {
      const url = request.url ?? '';
      if (url.startsWith('/raw/')) raws.push(url);
      const body = url.startsWith('/raw/') ? authored[url] : serving[url];
      if (body === undefined) response.writeHead(404).end();
      else if (typeof body === 'string') response.writeHead(200, { 'content-type': 'text/plain' }).end(body);
      else response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    });
    await new Promise<void>((listening) => server.listen(0, '127.0.0.1', listening));
    server.unref();
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    registry = `${origin}/r`;
    raw = `${origin}/raw/{revision}/{path}`;
    serving = await stage(ONE, raw, false);

    root = project({
      'package.json': JSON.stringify({ name: 'app', private: true }),
      'components.json': JSON.stringify({ aliases: { ui: '@/components/ui', lib: '@/lib' }, registries: { '@ultima': `${registry}/{name}.json` } }),
      'tsconfig.json': JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
    });
    const aliases = { ui: '@/components/ui', lib: '@/lib' };
    for (const { name } of REVISIONS[ONE] as Authored[]) {
      const { files } = (await (await fetch(`${registry}/${name}.json`)).json()) as { files: { path: string; type: string; target?: string; content: string }[] };
      for (const { path, type, target, content } of files) {
        const file = target ? target.replace(/^~\//, '') : `src/${type === 'registry:lib' ? 'lib' : 'components/ui'}/${path.split('/').at(-1)}`;
        write(root, file, renderAsInstalled(content, aliases, false));
      }
    }
  });

  it('installs revision one as current, with the consumer edits made after', async () => {
    expect(Object.values(await statusOf(root)).every((state) => state === 'current')).toBe(true);

    edit(root, SIDEBAR, (text) => text.replace('label="Menu"', 'label="Navigation"'));
    edit(root, SELECT, (text) => text.replace('label="Choose"', 'label="Pick one"'));
    edit(root, ELEMENT, (text) => text.replace('{}', '{ connectedCallback() {} }'));
    edit(root, LIB, (text) => text.replace(/\/\/ @ultima\/lib .+\n$/, ''));
    edited = projectFiles(root);

    serving = await stage(TWO, raw, true);
    expect(await statusOf(root)).toEqual({
      [BADGE]: 'behind',
      'src/components/ui/button.tsx': 'current',
      [DIALOG]: 'behind',
      [SELECT]: 'diverged',
      [SIDEBAR]: 'diverged',
      [LIB]: 'unstamped',
      [TOKENS]: 'behind',
      [ELEMENT]: 'diverged',
    });
  });

  it('plans every action at revision two and writes nothing', async () => {
    const { code, stdout, stderr } = await run(['update', '--cwd', root]);
    expect({ code, stderr }).toEqual({ code: 0, stderr: '' });
    const { url } = await ultimaPresetUrl();
    expect(stdout).toBe(
      [
        `Registry  ${registry}  revision ${TWO}`,
        '',
        'item       file                           state      action',
        'dialog     src/components/ui/dialog.tsx   behind     replace',
        'sidebar    src/components/ui/sidebar.tsx  diverged   merge',
        'select     src/components/ui/select.tsx   diverged   conflict  1 hunk',
        'badge      src/components/ui/badge.tsx    behind     hold      needs @ultima/spinner',
        'tokens     src/lib/tokens.stylex.ts       behind     hold      base theme changes to neutral-tight',
        'lib        src/lib/component.ts           unstamped  report    no installed base',
        'ult-badge  ult-badge.js                   diverged   report    built file, which cannot be merged',
        '',
        'hold       npx ultima-design update --accept-base-theme  (https://ultima.systems/install/update)',
        `keep       npx shadcn@4.21.4 add "${url}"  installs the Ultima preset, which keeps the previous look`,
        'needs      npx shadcn@4.21.4 add @ultima/spinner',
        'conflict   npx ultima-design update --write-conflicts  or  --replace select',
        'apply      npx ultima-design update --yes',
        '',
      ].join('\n'),
    );
    expect(projectFiles(root)).toEqual(edited);
  });

  it('refuses a stale plan with exit 3, and applies it once its files hold the planned bytes again', async () => {
    const plan = await run(['update', '--plan', '--json', '--cwd', root]);
    expect(plan.code).toBe(0);
    planPath = join(dirname(root), `${root.split('/').at(-1)}-plan.json`);
    writeFileSync(planPath, plan.stdout);

    edit(root, DIALOG, (text) => `// A note of ours.\n${text}`);
    const stale = await run(['update', '--apply', planPath, '--cwd', root]);
    expect(stale.code).toBe(3);
    expect(stale.stdout).toContain('ULT-UPDATE-003');
    expect(stale.stdout).toContain(`${DIALOG} changed since it was planned`);
    write(root, DIALOG, edited[DIALOG] as string);
    expect(projectFiles(root)).toEqual(edited);

    const result = await run(['update', '--apply', planPath, '--json', '--cwd', root]);
    expect(result.code).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output).toMatchObject({
      kind: 'ultima-update-run',
      planHash: JSON.parse(plan.stdout).planHash,
      written: [DIALOG, SIDEBAR],
      conflicts: [SELECT],
      held: [BADGE, TOKENS],
      reported: [LIB, ELEMENT],
      failed: null,
    });
    applied = output.runId;
  });

  it('replaces the behind file and merges the diverged one, which status then reports current and edited', async () => {
    expect(readFileSync(join(root, DIALOG), 'utf8')).toContain('<Button label="Dismiss" />');
    const sidebar = readFileSync(join(root, SIDEBAR), 'utf8');
    expect(sidebar).toContain('<Button label="Navigation" />');
    expect(sidebar).toContain('export const width = 256;');
    expect(sidebar.trimEnd().split('\n').at(-1)).toMatch(new RegExp(`^// @ultima/sidebar ${TWO} c1:[0-9a-f]{16}$`));
    expect(await statusOf(root)).toMatchObject({ [DIALOG]: 'current', [SIDEBAR]: 'edited' });
  });

  it('leaves the conflict, both holds and both reports untouched', () => {
    const now = projectFiles(root);
    for (const file of [SELECT, BADGE, TOKENS, LIB, ELEMENT]) expect(now[file]).toBe(edited[file]);
  });

  it('read each installed base at revision one from the raw host, and only for the merged files', () => {
    expect([...new Set(raws)].sort()).toEqual([`/raw/${ONE}/packages/ui/src/select.tsx`, `/raw/${ONE}/packages/ui/src/sidebar.tsx`]);
  });

  it('writes the conflict with diff3 markers under --write-conflicts, which status and update then report as not parsing', async () => {
    const written = await run(['update', '--write-conflicts', '--yes', '--cwd', root]);
    expect(written.code).toBe(0);
    expect(written.stdout).toMatch(new RegExp(`^wrote +${SELECT}$`, 'm'));
    expect(readFileSync(join(root, SELECT), 'utf8')).toContain(
      ['<<<<<<< local', '  return <Button label="Pick one" />;', `||||||| @ultima/select ${ONE}`, '  return <Button label="Choose" />;', '=======', '  return <Button label="Select an option" />;', `>>>>>>> @ultima/select ${TWO}`].join('\n'),
    );

    const status = await run(['status', '--cwd', root]);
    expect(status.code).toBe(0);
    expect(status.stdout).toMatch(new RegExp(`^select +${SELECT} +edited +${TWO}  does not parse: .+$`, 'm'));
    const planned = await run(['update', '--cwd', root]);
    expect(planned.code).toBe(0);
    expect(planned.stdout).toMatch(new RegExp(`^select +${SELECT} +edited +report +does not parse, so resolve any conflict markers first$`, 'm'));
  });

  it('takes the served file over the conflict markers with --replace', async () => {
    expect((await run(['update', '--replace', 'select', '--yes', '--cwd', root])).code).toBe(0);
    expect((await statusOf(root))[SELECT]).toBe('current');
  });

  it('rolls each run back to the original bytes, and leaves a file changed since its run', async () => {
    edit(root, SIDEBAR, (text) => text.replace('export const width = 256;', 'export const width = 300;'));
    const ours = readFileSync(join(root, SIDEBAR), 'utf8');

    const replaced = await run(['update', '--rollback', '--cwd', root]);
    const conflicted = await run(['update', '--rollback', '--cwd', root]);
    for (const latest of [replaced, conflicted]) expect(latest).toMatchObject({ code: 0, stdout: expect.stringContaining(`Restored  ${SELECT}\n`) });
    const undone = await run(['update', '--rollback', applied, '--cwd', root]);
    expect(undone.code).toBe(0);
    expect(undone.stdout).toContain(`Rolled back update run ${applied}.`);
    expect(undone.stdout).toContain(`Restored  ${DIALOG}\n`);
    expect(undone.stdout).toContain(`Left      ${SIDEBAR}\n`);

    expect(projectFiles(root)).toEqual({ ...edited, [SIDEBAR]: ours });
  });
});
