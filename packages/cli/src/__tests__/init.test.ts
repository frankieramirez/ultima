import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { type InitDeps, type InitIO, type Plan, init } from '../init.ts';
import { CLI_VERSION } from '../install.ts';
import { type Recipe, VITE, normalizeScaffold, sha256 } from '../recipe.ts';
import { run } from '../run.ts';
import { supportedRanges } from '../../scripts/supported-ranges.ts';

const REGISTRY = 'http://127.0.0.1:4321/r/{name}.json';
const temporary: string[] = [];
const scratch = (prefix: string) => {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  temporary.push(directory);
  return directory;
};
afterEach(() => {
  for (const directory of temporary.splice(0)) rmSync(directory, { recursive: true, force: true });
});
const SCAFFOLD: Record<string, string> = {
  'package.json': '{\n  "name": "{{name}}"\n}\n',
  'src/App.tsx': 'export default () => "scaffold example";\n',
  'src/App.css': 'body { color: red; }\n',
  'src/main.tsx': 'import App from "./App";\n',
};
const RECIPE: Recipe = {
  id: 'test-recipe',
  revision: 1,
  framework: 'vite',
  layout: 'src',
  title: 'Test recipe',
  scaffold: { package: 'create-test', version: '1.2.3', args: ['--template', 'test'] },
  shadcn: { package: 'shadcn', version: '9.9.9' },
  setupItem: 'setup-test',
  items: ['button'],
  dependencies: { react: '19.0.0' },
  devDependencies: { 'ultima-design': '{{cli}}' },
  scaffoldFiles: Object.fromEntries(Object.entries(SCAFFOLD).map(([path, text]) => [path, sha256(text)])),
  aliasFiles: [{ path: 'package.json', before: SCAFFOLD['package.json'], after: '{\n  "name": "{{name}}",\n  "devDependencies": { "ultima-design": "{{cli}}" }\n}\n' }],
  files: [{ path: 'src/App.tsx', after: 'export default () => "preview";\n' }],
  removes: ['src/App.css'],
  previewUrl: 'http://localhost:5173/',
  manualSteps: ['Theme: optional.'],
};
const COMPONENTS = '{\n  "registries": { "@ultima": "https://ultima.systems/r/{name}.json" }\n}\n';

type Served = Record<string, unknown>;
function served(): Served {
  return {
    'setup-test': { files: [{ path: 'components.json', target: '~/components.json', content: COMPONENTS }] },
    button: { registryDependencies: ['@ultima/tokens'], files: [{ path: 'ultima/ui/button.tsx', content: 'button' }] },
    tokens: { files: [{ path: 'ultima/lib/tokens.stylex.ts', content: 'tokens' }] },
  };
}

type Harness = {
  parent: string;
  deps: InitDeps;
  calls: string[][];
  registry: Served;
  failing: Set<string>;
  during: Map<string, () => void>;
  scaffold: Record<string, string>;
};

function harness(): Harness {
  const parent = scratch('ultima-init-');
  const h: Harness = { parent, calls: [], registry: served(), failing: new Set(), during: new Map(), scaffold: { ...SCAFFOLD }, deps: undefined as unknown as InitDeps };
  h.deps = {
    recipes: { vite: RECIPE },
    managerVersion: (manager) => (manager === 'npm' ? '11.0.0' : '10.0.0'),
    fetch: async (url) => {
      const item = /\/r\/([^/]+)\.json$/.exec(url)?.[1] ?? '';
      const body = h.registry[item];
      return { ok: body !== undefined, status: body === undefined ? 404 : 200, text: async () => JSON.stringify(body) };
    },
    exec: async (command, args, cwd, log) => {
      h.calls.push([command, ...args]);
      writeFileSync(log, `${command} ${args.join(' ')}\n`, { flag: 'a' });
      const step = args.includes('create-test@1.2.3') ? 'scaffold' : args[0] === 'install' ? 'install' : args.includes('add') ? (args.some((arg) => arg.includes('setup-test')) ? 'setup' : 'items') : (args.find((arg) => ['doctor', 'check', 'build'].includes(arg)) ?? (args.includes('tsc') ? 'typecheck' : 'unknown'));
      h.during.get(step)?.();
      if (step === 'scaffold') {
        const name = args[args.indexOf('create-test@1.2.3') + 1] as string;
        for (const [path, text] of Object.entries(h.scaffold)) put(join(cwd, name), path, text.replaceAll('{{name}}', name));
      } else if (step === 'install') {
        put(cwd, 'node_modules/react/package.json', '{ "version": "19.0.0" }');
        put(cwd, 'node_modules/ultima-design/package.json', JSON.stringify({ version: CLI_VERSION }));
      } else if (step === 'setup') {
        put(cwd, 'components.json', COMPONENTS);
      } else if (step === 'items') {
        put(cwd, 'src/components/ui/button.tsx', 'button');
      }
      return h.failing.has(step) ? 1 : 0;
    },
  };
  return h;
}

function put(root: string, path: string, text: string) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}

function io(interactive = false, answer = false) {
  const state = { out: '', err: '', asked: [] as string[] };
  const value: InitIO = {
    interactive,
    ask: async (question) => {
      state.asked.push(question);
      return answer;
    },
    out: (text) => {
      state.out += text;
    },
    err: (text) => {
      state.err += text;
    },
  };
  return Object.assign(state, { io: value });
}

function listing(root: string, prefix = ''): string[] {
  return readdirSync(join(root, prefix), { withFileTypes: true }).flatMap((entry) => {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? [`${path}/`, ...listing(root, path)] : [path];
  });
}

async function planFile(h: Harness, manager = 'npm'): Promise<string> {
  const output = io();
  const code = await init(['--plan', '--json', join(h.parent, 'my-app'), '--framework', 'vite', '--package-manager', manager, '--registry', REGISTRY], output.io, h.deps);
  expect(code).toBe(0);
  const path = join(scratch('ultima-plan-'), 'plan.json');
  writeFileSync(path, output.out);
  return path;
}

const stagingDirectories = (parent: string) => readdirSync(parent).filter((name) => name.startsWith('.ultima-init-'));

describe('init --plan', () => {
  it('emits a versioned plan with input and payload hashes and writes nothing', async () => {
    const h = harness();
    const before = listing(h.parent);
    const output = io();
    const code = await init([join(h.parent, 'my-app'), '--framework', 'vite', '--package-manager', 'pnpm', '--registry', REGISTRY, '--plan', '--json'], output.io, h.deps);
    expect(code).toBe(0);
    expect(listing(h.parent)).toEqual(before);
    expect(h.calls).toEqual([]);
    const plan: Plan = JSON.parse(output.out);
    expect(plan).toMatchObject({ kind: 'ultima-init-plan', schemaVersion: 1, cli: { name: 'ultima-design', version: CLI_VERSION } });
    expect(plan.target).toMatchObject({ name: 'my-app', packageManager: { name: 'pnpm', version: '10.0.0' } });
    expect(plan.inputs).toMatchObject({ destination: 'absent', parent: h.parent, node: process.versions.node });
    expect(plan.payloads.map(({ item, sha256: hash }) => [item, hash])).toEqual(
      ['button', 'setup-test', 'tokens'].map((item) => [item, sha256(JSON.stringify(h.registry[item]))]),
    );
    expect(plan.planHash).toMatch(/^[0-9a-f]{64}$/);
    const runs = plan.operations.flatMap((operation) => ('command' in operation ? [[operation.command.command, ...operation.command.args]] : []));
    expect(runs[0]).toEqual(['pnpm', 'dlx', 'create-test@1.2.3', 'my-app', '--template', 'test']);
    expect(runs).toContainEqual(['pnpm', 'dlx', 'shadcn@9.9.9', 'add', '@ultima/button', '--yes']);
  });

  it('prints the target, dependencies, diffs, subprocesses and manual steps', async () => {
    const h = harness();
    const output = io();
    expect(await init([join(h.parent, 'my-app'), '--framework', 'vite', '--registry', REGISTRY, '--plan'], output.io, h.deps)).toBe(0);
    for (const line of [
      `Target    ${join(h.parent, 'my-app')}`,
      'Manager   npm 11.0.0',
      'react 19.0.0',
      `ultima-design ${CLI_VERSION} (dev)`,
      'scaffold: npx --yes create-test@1.2.3 my-app --template test',
      'install: npm install',
      'doctor: npm exec --no -- ultima doctor',
      '-  "name": "my-app"',
      '+    "@ultima": "http://127.0.0.1:4321/r/{name}.json"',
      'src/App.css: removed',
      'Theme: optional.',
    ]) {
      expect(output.out).toContain(line);
    }
  });

  it('asks before applying in a terminal, and a cancel leaves everything unchanged', async () => {
    const h = harness();
    const before = listing(h.parent);
    const output = io(true, false);
    expect(await init([join(h.parent, 'my-app'), '--framework', 'vite', '--registry', REGISTRY], output.io, h.deps)).toBe(3);
    expect(output.asked).toEqual([`Create ${join(h.parent, 'my-app')}?`]);
    expect(output.out).toContain('scaffold: npx --yes create-test@1.2.3');
    expect(output.out).toContain('Cancelled. Nothing was written.');
    expect(listing(h.parent)).toEqual(before);
    expect(h.calls).toEqual([]);
  });

  it('refuses to write outside a terminal without --plan or --apply', async () => {
    const h = harness();
    const output = io(false);
    expect(await init([join(h.parent, 'my-app'), '--framework', 'vite'], output.io, h.deps)).toBe(2);
    expect(output.err).toContain('--plan --json');
    expect(readdirSync(h.parent)).toEqual([]);
  });

  it.each([
    [['my-app'], 'a new project needs --framework vite'],
    [['my-app', '--framework', 'next'], '--framework takes vite, got next'],
    [['my-app', '--framework', 'vite', '--package-manager', 'yarn'], '--package-manager takes npm or pnpm, got yarn'],
    [['--apply', 'plan.json', '--framework', 'vite'], '--apply takes only the plan path'],
    [['Bad Name', '--framework', 'vite', '--plan'], 'is not a lowercase package name'],
    [['my-app', '--framework', 'vite', '--plan', '--registry', 'https://example.com/r/button.json'], '--registry takes a URL ending in /r/{name}.json'],
  ])('rejects the invalid invocation %j with exit 2', async (args, message) => {
    const h = harness();
    const output = io();
    const [first, ...rest] = args as [string, ...string[]];
    const target = first.startsWith('--') ? first : join(h.parent, first);
    expect(await init([target, ...rest], output.io, h.deps)).toBe(2);
    expect(output.out + output.err).toContain(message);
  });

  it('refuses an existing destination, even an empty one', async () => {
    const h = harness();
    mkdirSync(join(h.parent, 'my-app'));
    const output = io();
    expect(await init([join(h.parent, 'my-app'), '--framework', 'vite', '--plan', '--json'], output.io, h.deps)).toBe(1);
    expect(output.err).toContain('already exists');
  });

  it('refuses a destination inside a workspace it would have to change', async () => {
    const h = harness();
    writeFileSync(join(h.parent, 'pnpm-workspace.yaml'), 'packages: []\n');
    const output = io();
    expect(await init([join(h.parent, 'my-app'), '--framework', 'vite', '--plan'], output.io, h.deps)).toBe(1);
    expect(output.err).toContain('inside the workspace');
  });

  it('reports an unreachable registry as incomplete', async () => {
    const h = harness();
    delete h.registry.tokens;
    const output = io();
    expect(await init([join(h.parent, 'my-app'), '--framework', 'vite', '--registry', REGISTRY, '--plan'], output.io, h.deps)).toBe(3);
    expect(output.err).toContain('tokens.json answered 404');
  });
});

describe('init --apply', () => {
  it('scaffolds in staging, runs every check and publishes into the absent destination', async () => {
    const h = harness();
    const plan = await planFile(h);
    const output = io();
    expect(await init(['--apply', plan], output.io, h.deps)).toBe(0);
    const app = join(h.parent, 'my-app');
    expect(readFileSync(join(app, 'src/App.tsx'), 'utf8')).toBe('export default () => "preview";\n');
    expect(existsSync(join(app, 'src/App.css'))).toBe(false);
    expect(JSON.parse(readFileSync(join(app, 'components.json'), 'utf8')).registries['@ultima']).toBe(REGISTRY);
    expect(JSON.parse(readFileSync(join(app, 'package.json'), 'utf8'))).toEqual({ name: 'my-app', devDependencies: { 'ultima-design': CLI_VERSION } });
    expect(stagingDirectories(h.parent)).toEqual([]);
    expect(h.calls.map((call) => call.slice(0, 4).join(' '))).toEqual([
      'npx --yes create-test@1.2.3 my-app',
      'npm install',
      `npx --yes shadcn@9.9.9 add`,
      'npx --yes shadcn@9.9.9 add',
      'npm exec --no --',
      'npm exec --no --',
      'npm exec --no --',
      'npm run build',
    ]);
    const [logs] = readdirSync(join(app, 'node_modules/.ultima-init'));
    const result = JSON.parse(readFileSync(join(app, 'node_modules/.ultima-init', logs as string, 'result.json'), 'utf8'));
    expect(result).toMatchObject({ status: 'completed', checks: { doctor: 'passed', check: 'passed', typecheck: 'passed', build: 'passed' }, browserChecks: 'not run' });
    expect(result.files).toEqual({
      created: ['components.json', 'src/components/ui/button.tsx'],
      edited: ['package.json', 'src/App.tsx'],
      removed: ['src/App.css'],
      preserved: ['src/main.tsx'],
    });
    expect(output.out).toContain(`Created ${app} from test-recipe revision 1.`);
    expect(output.out).toContain('npm run dev        http://localhost:5173/');
  });

  it('fails a tampered plan before any write', async () => {
    const h = harness();
    const path = await planFile(h);
    const plan = JSON.parse(readFileSync(path, 'utf8'));
    plan.operations[0].command.args.push('--overwrite');
    writeFileSync(path, JSON.stringify(plan));
    const before = listing(h.parent);
    const output = io();
    expect(await init(['--apply', path], output.io, h.deps)).toBe(1);
    expect(output.err).toContain('was edited after it was planned');
    expect(listing(h.parent)).toEqual(before);
    expect(h.calls).toEqual([]);
  });

  it('fails a plan whose operations were rewritten and rehashed, since apply derives them again', async () => {
    const h = harness();
    const path = await planFile(h);
    const plan = JSON.parse(readFileSync(path, 'utf8'));
    plan.operations[0].command.args.push('--overwrite');
    const { planHash: _, ...body } = plan;
    writeFileSync(path, JSON.stringify({ ...body, planHash: sha256(JSON.stringify(body)) }));
    const output = io();
    expect(await init(['--apply', path], output.io, h.deps)).toBe(1);
    expect(output.err).toContain('is stale: operations changed');
    expect(stagingDirectories(h.parent)).toEqual([]);
    expect(h.calls).toEqual([]);
  });

  it('reports an unknown plan version as incomplete before any write', async () => {
    const h = harness();
    const path = await planFile(h);
    writeFileSync(path, JSON.stringify({ ...JSON.parse(readFileSync(path, 'utf8')), schemaVersion: 2 }));
    const output = io();
    expect(await init(['--apply', path], output.io, h.deps)).toBe(3);
    expect(output.err).toContain('is not a version 1 init plan');
    expect(h.calls).toEqual([]);
  });

  it('fails a plan whose registry payloads changed since it was planned', async () => {
    const h = harness();
    const path = await planFile(h);
    h.registry.button = { ...(h.registry.button as object), files: [{ path: 'ultima/ui/button.tsx', content: 'changed' }] };
    const output = io();
    expect(await init(['--apply', path], output.io, h.deps)).toBe(1);
    expect(output.err).toContain('is stale: payloads');
    expect(h.calls).toEqual([]);
  });

  it('refuses a destination that appeared between plan and apply', async () => {
    const h = harness();
    const path = await planFile(h);
    mkdirSync(join(h.parent, 'my-app'));
    const output = io();
    expect(await init(['--apply', path], output.io, h.deps)).toBe(1);
    expect(output.err).toContain('already exists');
    expect(h.calls).toEqual([]);
  });

  it('leaves a destination created during apply untouched and keeps staging and logs', async () => {
    const h = harness();
    const path = await planFile(h);
    h.during.set('build', () => put(h.parent, 'my-app/mine.txt', 'not yours'));
    const output = io();
    expect(await init(['--apply', path], output.io, h.deps)).toBe(1);
    expect(listing(join(h.parent, 'my-app'))).toEqual(['mine.txt']);
    const [staging] = stagingDirectories(h.parent);
    expect(output.err).toContain('appeared during apply');
    expect(output.err).toContain(join(h.parent, staging as string));
    const result = JSON.parse(readFileSync(join(h.parent, staging as string, 'logs/result.json'), 'utf8'));
    expect(result).toMatchObject({ status: 'failed', checks: { build: 'passed' } });
    expect(existsSync(join(h.parent, staging as string, 'my-app/src/App.tsx'))).toBe(true);
  });

  it.each(['doctor', 'check', 'typecheck', 'build'])('keeps the destination absent when %s fails', async (check) => {
    const h = harness();
    const path = await planFile(h);
    h.failing.add(check);
    const output = io();
    expect(await init(['--apply', path, '--json'], output.io, h.deps)).toBe(1);
    expect(existsSync(join(h.parent, 'my-app'))).toBe(false);
    const result = JSON.parse(output.out);
    expect(result).toMatchObject({ status: 'failed', checks: { [check]: 'failed' } });
    expect(result.staging).toBe(join(h.parent, stagingDirectories(h.parent)[0] as string));
    expect(readdirSync(result.logs)).toContain('plan.json');
  });

  it('keeps the destination absent when the scaffold does not match its recipe', async () => {
    const h = harness();
    const path = await planFile(h);
    h.scaffold['src/App.tsx'] = 'a different example\n';
    const output = io();
    expect(await init(['--apply', path], output.io, h.deps)).toBe(1);
    expect(output.err).toContain('changed src/App.tsx');
    expect(existsSync(join(h.parent, 'my-app'))).toBe(false);
  });

  it('reports a failed subprocess before the checks as incomplete', async () => {
    const h = harness();
    const path = await planFile(h);
    h.failing.add('install');
    const output = io();
    expect(await init(['--apply', path], output.io, h.deps)).toBe(3);
    expect(output.err).toContain('stopped at install: exited 1');
    expect(existsSync(join(h.parent, 'my-app'))).toBe(false);
  });
});

describe('the Vite recipe', () => {
  const repository = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

  it('pins the StyleX and Base UI versions the workspace tests', () => {
    const ranges = supportedRanges(repository);
    expect(VITE.dependencies['@stylexjs/stylex']).toBe(ranges['@stylexjs/stylex']?.ceiling);
    expect(VITE.devDependencies['@stylexjs/unplugin']).toBe(ranges['@stylexjs/unplugin']?.ceiling);
    expect(VITE.dependencies['@base-ui/react']).toBe(ranges['@base-ui/react']?.ceiling);
  });

  it('pins every dependency exactly', () => {
    for (const version of Object.values({ ...VITE.dependencies, ...VITE.devDependencies })) expect(version).toMatch(/^(\d+\.\d+\.\d+|\{\{cli\}\})$/);
  });

  it("diffs against the pinned scaffold's own text", () => {
    for (const file of [...VITE.aliasFiles, ...VITE.files]) {
      if (file.before !== undefined) expect(sha256(normalizeScaffold(file.path, Buffer.from(file.before), 'unused'))).toBe(VITE.scaffoldFiles[file.path]);
      else expect(VITE.scaffoldFiles[file.path]).toBeDefined();
    }
    for (const path of VITE.removes) expect(VITE.scaffoldFiles[path]).toBeDefined();
  });

  it('runs no shell: every subprocess is a pinned package or the selected manager', async () => {
    for (const manager of ['npm', 'pnpm'] as const) {
      const h = harness();
      h.deps.recipes = { vite: VITE };
      h.registry = { 'setup-vite': { files: [{ path: 'components.json', target: '~/components.json', content: COMPONENTS }] }, button: {}, card: {}, dialog: {} };
      const output = io();
      expect(await init([join(h.parent, 'my-app'), '--framework', 'vite', '--package-manager', manager, '--plan', '--json'], output.io, h.deps)).toBe(0);
      const plan: Plan = JSON.parse(output.out);
      const commands = plan.operations.flatMap((operation) => ('command' in operation ? [operation.command.command] : []));
      expect(new Set(commands)).toEqual(new Set(manager === 'npm' ? ['npx', 'npm'] : ['pnpm']));
      expect(plan.operations.some((operation) => operation.kind === 'write' && operation.path === 'components.json')).toBe(false);
    }
  });
});

describe('the init command line', () => {
  it('refuses to write without a terminal when run through the CLI entry', async () => {
    const parent = scratch('ultima-init-');
    const result = await run(['init', join(parent, 'my-app'), '--framework', 'vite']);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('--plan --json');
    expect(readdirSync(parent)).toEqual([]);
  });
});
