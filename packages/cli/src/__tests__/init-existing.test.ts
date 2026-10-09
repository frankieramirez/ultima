import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ExistingPlan } from '../existing.ts';
import { type InitDeps, type InitIO, init } from '../init.ts';
import { CLI_VERSION } from '../install.ts';
import type { Journal } from '../journal.ts';
import { VITE, sha256 } from '../recipe.ts';

const REGISTRY = 'http://127.0.0.1:4321/r/{name}.json';
const temporary: string[] = [];
const scratch = (prefix: string) => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  temporary.push(directory);
  return directory;
};
afterEach(() => {
  for (const directory of temporary.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function put(root: string, path: string, text: string) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}

function installed(root: string, versions: Record<string, string>) {
  for (const [name, version] of Object.entries(versions)) put(root, `node_modules/${name}/package.json`, JSON.stringify({ name, version }));
}

/** Every file outside node_modules, with its bytes, so a test can say exactly what changed. */
function snapshot(root: string, prefix = ''): Record<string, string> {
  const files: Record<string, string> = {};
  for (const entry of readdirSync(join(root, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (path === 'node_modules' || path === '.ultima-init') continue;
    if (entry.isDirectory()) Object.assign(files, snapshot(root, path));
    else if (entry.isFile()) files[path] = readFileSync(join(root, path), 'utf8');
  }
  return files;
}

const FILES = {
  button: "import { mergeProps } from '@base-ui/react';\nexport const Button = () => null;\n",
  card: 'export const Card = {};\n',
  dialog: 'export const Dialog = {};\n',
  tokens: 'export const color = {};\n',
  themes: 'export const colorScheme = {};\n',
};

function served(framework: 'vite' | 'next', layout: 'app' | 'src/app' = 'app'): Record<string, unknown> {
  const components = {
    $schema: 'https://ui.shadcn.com/schema.json',
    style: 'base-ultima',
    rsc: framework === 'next',
    tsx: true,
    tailwind: { config: '', css: framework === 'next' ? 'app/globals.css' : 'src/index.css', baseColor: 'neutral', cssVariables: true },
    aliases: { components: '@/components', utils: '@/lib/utils', ui: '@/components/ui', lib: '@/lib', hooks: '@/hooks' },
    registries: { '@ultima': 'https://ultima.systems/r/{name}.json' },
  };
  void layout;
  const setup =
    framework === 'vite'
      ? {
          dependencies: ['@stylexjs/stylex'],
          devDependencies: ['@stylexjs/unplugin', 'unplugin'],
          files: [
            { path: 'static/setup-vite/components.json', type: 'registry:file', target: '~/components.json', content: `${JSON.stringify(components, null, 2)}\n` },
            { path: 'static/setup-vite/ultima.vite.ts', type: 'registry:file', target: '~/ultima.vite.ts', content: '// ultima.vite.ts\nexport function ultimaStylex() { return []; }\n' },
          ],
        }
      : {
          dependencies: ['@stylexjs/stylex'],
          devDependencies: ['@stylexjs/babel-plugin', '@stylexjs/postcss-plugin', 'typescript'],
          files: [
            { path: 'static/setup-next/app/ultima.css', type: 'registry:file', target: '~/app/ultima.css', content: '@stylex;\n' },
            { path: 'static/setup-next/babel.config.js', type: 'registry:file', target: '~/babel.config.js', content: "module.exports = { plugins: ['@stylexjs/babel-plugin'] };\n" },
            { path: 'static/setup-next/components.json', type: 'registry:file', target: '~/components.json', content: `${JSON.stringify(components, null, 2)}\n` },
            { path: 'static/setup-next/postcss.config.js', type: 'registry:file', target: '~/postcss.config.js', content: "module.exports = { plugins: { '@stylexjs/postcss-plugin': {} } };\n" },
          ],
        };
  const ui = (name: keyof typeof FILES) => ({ dependencies: ['@base-ui/react'], registryDependencies: ['@ultima/tokens'], files: [{ path: `ultima/ui/${name}.tsx`, type: 'registry:ui', content: FILES[name] }] });
  return {
    [`setup-${framework}`]: setup,
    button: ui('button'),
    card: ui('card'),
    dialog: ui('dialog'),
    tokens: {
      dependencies: ['@stylexjs/stylex'],
      files: [
        { path: 'ultima/lib/tokens.stylex.ts', type: 'registry:lib', content: FILES.tokens },
        { path: 'ultima/lib/themes.ts', type: 'registry:lib', content: FILES.themes },
      ],
    },
  };
}

type Harness = {
  root: string;
  deps: InitDeps;
  calls: string[][];
  registry: Record<string, unknown>;
  failing: Set<string>;
  beforeStep: Map<string, () => void>;
  crashAfterWriting: string | null;
};

function harness(root: string, framework: 'vite' | 'next'): Harness {
  const h: Harness = { root, calls: [], registry: served(framework), failing: new Set(), beforeStep: new Map(), crashAfterWriting: null, deps: undefined as unknown as InitDeps };
  h.deps = {
    recipes: [VITE],
    managerVersion: (manager) => (manager === 'npm' ? '11.0.0' : '10.0.0'),
    fetch: async (url) => {
      const item = /\/r\/([^/]+)\.json$/.exec(url)?.[1] ?? '';
      const body = h.registry[item];
      return { ok: body !== undefined, status: body === undefined ? 404 : 200, text: async () => JSON.stringify(body) };
    },
    exec: async (command, args, cwd, log) => {
      h.calls.push([command, ...args]);
      writeFileSync(log, `${command} ${args.join(' ')}\n`, { flag: 'a' });
      const step = args[0] === 'install' ? 'install' : args.includes('add') ? 'add' : (args.find((arg) => ['doctor', 'check', 'build', 'tsc'].includes(arg)) ?? 'unknown');
      h.beforeStep.get(step)?.();
      if (step === 'install') {
        const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'));
        const declared: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies };
        installed(cwd, Object.fromEntries(Object.entries(declared).filter(([, version]) => /^[~^]?\d/.test(version)).map(([name, version]) => [name, version.replace(/^[~^]/, '')])));
        if (declared['ultima-design']) installed(cwd, { 'ultima-design': CLI_VERSION });
      } else if (step === 'add') {
        const components = JSON.parse(readFileSync(join(cwd, 'components.json'), 'utf8'));
        const base = (alias: string) => join(cwd, existsSync(join(cwd, 'src')) && !existsSync(join(cwd, 'app')) ? 'src' : '', alias.slice(2));
        const queue = args.filter((arg) => arg.startsWith('@ultima/')).map((arg) => arg.slice(8));
        const seen = new Set<string>();
        while (queue.length > 0) {
          const item = queue.shift() as string;
          if (seen.has(item)) continue;
          seen.add(item);
          const body = h.registry[item] as { registryDependencies?: string[]; files: { path: string; type: string; content: string }[] };
          for (const file of body.files) {
            const path = join(base(file.type === 'registry:ui' ? components.aliases.ui : components.aliases.lib), file.path.split('/').at(-1) as string);
            if (!existsSync(path)) put(path, '', file.content);
            if (h.crashAfterWriting !== null && path === join(cwd, h.crashAfterWriting)) throw new Error('interrupted');
          }
          queue.push(...(body.registryDependencies ?? []).map((name) => name.slice(8)));
        }
      }
      return h.failing.has(step) ? 1 : 0;
    },
  };
  return h;
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

const VITE_INDEX_CSS = ':root {\n  --brand: #e11d48;\n  font-family: system-ui;\n}\n\n*,\n*::before,\n*::after {\n  box-sizing: border-box;\n}\n\nh1 {\n  font-size: 2rem;\n}\n\nbody {\n  margin: 0;\n}\n\n.shell {\n  padding: 1rem;\n}\n';
const VITE_CONFIG = "import react from '@vitejs/plugin-react'\nimport { defineConfig } from 'vite'\nimport inspect from 'vite-plugin-inspect'\n\n// https://vite.dev/config/\nexport default defineConfig({\n  plugins: [\n    react(),\n    inspect(),\n  ],\n  server: { port: 5173 },\n})\n";
const VITE_APP = "import { BrowserRouter, Route, Routes } from 'react-router-dom'\nimport { Home } from './pages/home'\n\nexport default function App() {\n  return (\n    <BrowserRouter>\n      <Routes>\n        <Route path=\"/\" element={<Home />} />\n      </Routes>\n    </BrowserRouter>\n  )\n}\n";

function viteApp(options: { lock?: string } = {}): string {
  const root = join(scratch('ultima-existing-'), 'shop');
  put(root, 'package.json', `${JSON.stringify({ name: 'shop', private: true, type: 'module', scripts: { dev: 'vite', build: 'tsc -b && vite build' }, dependencies: { react: '^19.2.0', 'react-dom': '^19.2.0', 'react-router-dom': '^7.0.0' }, devDependencies: { '@vitejs/plugin-react': '^6.1.0', typescript: '~5.9.3', vite: '^8.1.0', 'vite-plugin-inspect': '^11.0.0' } }, null, 2)}\n`);
  put(root, options.lock ?? 'package-lock.json', '{}\n');
  installed(root, { react: '19.2.0', 'react-dom': '19.2.0', typescript: '5.9.3', vite: '8.1.0', '@vitejs/plugin-react': '6.1.0' });
  put(root, 'tsconfig.json', '{\n  "files": [],\n  "references": [\n    { "path": "./tsconfig.app.json" },\n    { "path": "./tsconfig.node.json" }\n  ]\n}\n');
  put(root, 'tsconfig.app.json', '{\n  "compilerOptions": {\n    "target": "es2023",\n    /* Bundler mode */\n    "moduleResolution": "bundler",\n    "jsx": "react-jsx",\n    "strict": true, // the team keeps this on\n  },\n  "include": ["src"]\n}\n');
  put(root, 'tsconfig.node.json', '{ "compilerOptions": { "allowImportingTsExtensions": true }, "include": ["vite.config.ts"] }\n');
  put(root, 'vite.config.ts', VITE_CONFIG);
  put(root, 'index.html', '<!doctype html>\n<html lang="en">\n  <head><title>Shop</title></head>\n  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>\n</html>\n');
  put(root, 'src/main.tsx', "import { StrictMode } from 'react'\nimport { createRoot } from 'react-dom/client'\nimport './index.css'\nimport App from './App.tsx'\n\ncreateRoot(document.getElementById('root')!).render(\n  <StrictMode>\n    <App />\n  </StrictMode>,\n)\n");
  put(root, 'src/App.tsx', VITE_APP);
  put(root, 'src/pages/home.tsx', 'export function Home() {\n  return <h1>Shop</h1>\n}\n');
  put(root, 'src/index.css', VITE_INDEX_CSS);
  put(root, 'README.md', '# Shop\n');
  put(root, 'AGENTS.md', '# Agents\n');
  put(root, 'CLAUDE.md', '@AGENTS.md\n');
  put(root, 'DESIGN.md', '# Design\n');
  put(root, '.claude/settings.json', '{ "hooks": { "PostToolUse": [{ "hooks": [{ "type": "command", "command": "foreign-hook" }] }] } }\n');
  return root;
}

const NEXT_LAYOUT = "import type { Metadata } from 'next';\nimport { Geist } from 'next/font/google';\nimport './globals.css';\nimport { Providers } from './providers';\n\nconst geist = Geist({ variable: '--font-geist', subsets: ['latin'] });\n\nexport const metadata: Metadata = { title: 'Shop', description: 'A shop' };\n\nexport default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {\n  return (\n    <html lang=\"en\" data-theme=\"dark\">\n      <body className={geist.variable}>\n        <Providers>{children}</Providers>\n      </body>\n    </html>\n  );\n}\n";
const NEXT_GLOBALS = ':root {\n  --background: #ffffff;\n}\n\nhtml,\nbody {\n  max-width: 100vw;\n}\n\n* {\n  box-sizing: border-box;\n  padding: 0;\n  margin: 0;\n}\n\na {\n  color: inherit;\n  text-decoration: none;\n}\n';

function nextApp(layout: 'app' | 'src/app', options: { lock?: string } = {}): string {
  const root = join(scratch('ultima-existing-'), 'store');
  put(root, 'package.json', `${JSON.stringify({ name: 'store', private: true, scripts: { dev: 'next dev', build: 'next build' }, dependencies: { next: '16.2.0', react: '19.2.0', 'react-dom': '19.2.0' }, devDependencies: { '@types/react': '^19', typescript: '^5' } }, null, 2)}\n`);
  put(root, options.lock ?? 'pnpm-lock.yaml', "lockfileVersion: '9.0'\n");
  installed(root, { next: '16.2.0', react: '19.2.0', 'react-dom': '19.2.0', typescript: '5.9.3' });
  const alias = layout === 'app' ? './*' : './src/*';
  put(root, 'tsconfig.json', `{\n  "compilerOptions": {\n    "strict": true,\n    "plugins": [{ "name": "next" }],\n    "paths": {\n      "@/*": ["${alias}"]\n    }\n  },\n  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"]\n}\n`);
  put(root, 'next.config.ts', "import type { NextConfig } from 'next';\n\nconst nextConfig: NextConfig = {};\n\nexport default nextConfig;\n");
  put(root, `${layout}/layout.tsx`, NEXT_LAYOUT);
  put(root, `${layout}/providers.tsx`, "'use client';\nexport function Providers({ children }: { children: React.ReactNode }) {\n  return children;\n}\n");
  put(root, `${layout}/page.tsx`, 'export default function Home() {\n  return <main>Store</main>;\n}\n');
  put(root, `${layout}/globals.css`, NEXT_GLOBALS);
  put(root, 'ultima-theme.css', ':root { --ult-color-accent: #e11d48; }\n');
  put(root, 'ultima-theme.json', '{ "version": 3 }\n');
  put(root, 'README.md', '# Store\n');
  return root;
}

async function plan(h: Harness, extra: string[] = []): Promise<{ code: number; plan: ExistingPlan; out: string; err: string; path: string }> {
  const output = io();
  const code = await init([h.root, '--plan', '--json', '--registry', REGISTRY, ...extra], output.io, h.deps);
  const path = join(scratch('ultima-plan-'), 'plan.json');
  writeFileSync(path, output.out);
  return { code, plan: code === 0 ? JSON.parse(output.out) : (undefined as unknown as ExistingPlan), out: output.out, err: output.err, path };
}

async function apply(h: Harness, path: string) {
  const output = io();
  const code = await init(['--apply', path], output.io, h.deps);
  return { code, out: output.out, err: output.err };
}

const writes = (plan: ExistingPlan) => plan.operations.flatMap((operation) => (operation.kind === 'write' ? [operation.id] : []));

describe('init on an existing Vite application', () => {
  it('plans without writing, and names what it detected, adds and keeps', async () => {
    const root = viteApp();
    const h = harness(root, 'vite');
    const before = snapshot(root);
    const { code, plan: planned } = await plan(h);
    expect(code).toBe(0);
    expect(snapshot(root)).toEqual(before);
    expect(h.calls).toEqual([]);
    expect(planned).toMatchObject({
      mode: 'existing',
      recipe: { id: 'vite-react-ts-existing' },
      target: { root, framework: 'vite', layout: 'src', sourceRoot: 'src', entry: 'src/main.tsx', packageManager: { name: 'npm', version: '11.0.0', source: 'lockfile', lockfile: 'package-lock.json' } },
      dependencies: {
        added: { dependencies: { '@base-ui/react': '1.8.0', '@stylexjs/stylex': '0.19.0' }, devDependencies: { '@stylexjs/unplugin': '0.19.0', unplugin: '2.3.11', 'ultima-design': CLI_VERSION } },
        present: { react: '19.2.0', 'react-dom': '19.2.0', typescript: '5.9.3', vite: '8.1.0' },
      },
      items: { add: ['button', 'card', 'dialog'], present: [], creates: ['src/components/ui/button.tsx', 'src/components/ui/card.tsx', 'src/components/ui/dialog.tsx', 'src/lib/themes.ts', 'src/lib/tokens.stylex.ts'] },
      preview: { path: 'src/ultima-preview.tsx', mounted: false },
      theme: { css: false, design: true },
    });
    expect(writes(planned)).toEqual([
      'edit package.json',
      'edit tsconfig.json',
      'edit tsconfig.app.json',
      'create components.json',
      'create ultima.vite.ts',
      'edit vite.config.ts',
      'edit src/index.css',
      'create src/ultima-preview.tsx',
    ]);
    expect(planned.operations.map(({ id }) => id)).toEqual([...writes(planned).slice(0, 5), 'install', 'add button, card, dialog', ...writes(planned).slice(5), 'verify versions', 'doctor', 'check', 'typecheck', 'build']);
    expect(planned.preserved).toEqual(expect.arrayContaining(['.claude', 'AGENTS.md', 'CLAUDE.md', 'DESIGN.md', 'README.md', 'index.html', 'src/App.tsx', 'src/main.tsx']));
    expect(planned.preview.mountStep).toContain("In src/App.tsx, add `import UltimaPreview from './ultima-preview';`");
    expect(planned.preview.mountStep).toContain('<Route path="/ultima-preview" element={<UltimaPreview />} />');
    expect(planned.inputs.files['vite.config.ts']).toMatch(/^[0-9a-f]{64}$/);
  });

  it('applies the plan: keeps the router, foreign plugins and application CSS, writes the preview and prints the mount step', async () => {
    const root = viteApp();
    const h = harness(root, 'vite');
    const before = snapshot(root);
    const { path } = await plan(h);
    const result = await apply(h, path);
    expect(result.err).toBe('');
    expect(result.code).toBe(3);
    expect(result.out).toContain('The preview is written to src/ultima-preview.tsx and not mounted yet.');
    expect(result.out).toContain("add `import UltimaPreview from './ultima-preview';`");
    expect(result.out).toMatch(/doctor\s+passed/);
    expect(result.out).toMatch(/build\s+passed/);

    const after = snapshot(root);
    for (const kept of ['src/App.tsx', 'src/main.tsx', 'src/pages/home.tsx', 'index.html', 'tsconfig.node.json', 'README.md', 'AGENTS.md', 'CLAUDE.md', 'DESIGN.md', '.claude/settings.json', 'package-lock.json']) {
      expect(after[kept], kept).toBe(before[kept]);
    }
    expect(after['vite.config.ts']).toBe(VITE_CONFIG.replace("import inspect from 'vite-plugin-inspect'\n", "import inspect from 'vite-plugin-inspect'\nimport { ultimaStylex } from './ultima.vite.ts'\n").replace('    react(),', '    ultimaStylex(),\n    react(),'));
    expect(after['tsconfig.app.json']).toContain('"strict": true, // the team keeps this on\n    "paths": { "@/*": ["./src/*"] },\n');
    expect(after['tsconfig.app.json']).toContain('/* Bundler mode */');
    expect(after['tsconfig.json']).toContain('"compilerOptions": { "paths": { "@/*": ["./src/*"] } }');
    expect(after['src/index.css']).toBe(':root {\n  --brand: #e11d48;\n  font-family: system-ui;\n}\n\n@layer reset {\n  *,\n  *::before,\n  *::after {\n    box-sizing: border-box;\n  }\n\n  h1 {\n    font-size: 2rem;\n  }\n}\n\nbody {\n  margin: 0;\n}\n\n.shell {\n  padding: 1rem;\n}\n');
    expect(after['src/ultima-preview.tsx']).toContain('export default function UltimaPreview()');
    expect(after['src/ultima-preview.tsx']).toContain('written by `ultima-design init`');
    expect(JSON.parse(after['package.json'] as string)).toMatchObject({ scripts: { dev: 'vite', build: 'tsc -b && vite build' }, dependencies: { 'react-router-dom': '^7.0.0', '@stylexjs/stylex': '0.19.0' }, devDependencies: { 'vite-plugin-inspect': '^11.0.0', unplugin: '2.3.11' } });
    expect(after['src/components/ui/button.tsx']).toBe(FILES.button);
    expect(Object.keys(after).filter((file) => !(file in before)).sort()).toEqual([
      'components.json',
      'src/components/ui/button.tsx',
      'src/components/ui/card.tsx',
      'src/components/ui/dialog.tsx',
      'src/lib/themes.ts',
      'src/lib/tokens.stylex.ts',
      'src/ultima-preview.tsx',
      'ultima.vite.ts',
    ]);
    expect(h.calls).toEqual([
      ['npm', 'install'],
      ['npx', '--yes', 'shadcn@4.21.4', 'add', '@ultima/button', '@ultima/card', '@ultima/dialog', '--yes'],
      ['npm', 'exec', '--no', '--', 'ultima', 'doctor'],
      ['npm', 'exec', '--no', '--', 'ultima', 'check'],
      ['npm', 'exec', '--no', '--', 'tsc', '-b'],
      ['npm', 'run', 'build'],
    ]);
  });

  it('writes nothing on a rerun, and completes once the consumer mounts the preview', async () => {
    const root = viteApp();
    const h = harness(root, 'vite');
    await apply(h, (await plan(h)).path);
    const applied = snapshot(root);
    h.calls.length = 0;

    const again = await plan(h);
    expect(again.code).toBe(0);
    expect(again.plan.operations.map(({ kind }) => kind)).toEqual(['check', 'check', 'check', 'check']);
    expect(again.plan.items).toEqual({ add: [], present: ['button', 'card', 'dialog'], creates: [] });
    const rerun = await apply(h, again.path);
    expect(rerun.code).toBe(3);
    expect(snapshot(root)).toEqual(applied);
    expect(h.calls.map((call) => call.at(-1))).toEqual(['doctor', 'check', '-b', 'build']);

    put(root, 'src/App.tsx', VITE_APP.replace("import { Home } from './pages/home'\n", "import { Home } from './pages/home'\nimport UltimaPreview from './ultima-preview'\n").replace('        <Route path="/" element={<Home />} />\n', '        <Route path="/" element={<Home />} />\n        <Route path="/ultima-preview" element={<UltimaPreview />} />\n'));
    put(root, 'src/ultima-preview.tsx', `${readFileSync(join(root, 'src/ultima-preview.tsx'), 'utf8')}// edited by the consumer\n`);
    const mounted = await plan(h);
    expect(mounted.plan.preview).toMatchObject({ mounted: true, mountStep: null });
    expect(writes(mounted.plan)).toEqual([]);
    const done = await apply(h, mounted.path);
    expect(done.code).toBe(0);
    expect(done.out).toContain('The preview is at http://localhost:5173/');
    expect(readFileSync(join(root, 'src/ultima-preview.tsx'), 'utf8')).toContain('// edited by the consumer');
  });

  it('treats the starter screen of an app init created as the mounted preview', async () => {
    const root = viteApp();
    put(root, 'src/App.tsx', `/** Ultima's starter screen, written by \`ultima-design init\`. It is yours: edit it or replace it. */\nexport default function App() {\n  return null\n}\n`);
    const h = harness(root, 'vite');
    const { plan: planned } = await plan(h);
    expect(planned.preview).toEqual({ path: 'src/App.tsx', url: 'http://localhost:5173/', mounted: true, mountStep: null });
    expect(writes(planned)).not.toContain('create src/ultima-preview.tsx');
    expect(planned.preserved).toContain('src/App.tsx');
  });

  it('keeps a compatible components.json and installed items, adding only the registry and what is missing', async () => {
    const root = viteApp();
    put(root, 'components.json', '{\n  // the team\'s settings\n  "style": "base-ultima",\n  "rsc": false,\n  "tsx": true,\n  "aliases": { "ui": "@/ui", "lib": "@/shared" }\n}\n');
    put(root, 'src/ui/button.tsx', '// edited by the consumer\n');
    const h = harness(root, 'vite');
    const { code, plan: planned, err } = await plan(h);
    expect(err).toBe('');
    expect(code).toBe(0);
    expect(planned.items).toEqual({ add: ['card', 'dialog'], present: ['button'], creates: ['src/shared/themes.ts', 'src/shared/tokens.stylex.ts', 'src/ui/card.tsx', 'src/ui/dialog.tsx'] });
    const components = planned.operations.find((operation) => operation.id === 'edit components.json');
    expect(components && 'content' in components && components.content).toBe(`{\n  // the team's settings\n  "style": "base-ultima",\n  "rsc": false,\n  "tsx": true,\n  "aliases": { "ui": "@/ui", "lib": "@/shared" },\n  "registries": { "@ultima": "${REGISTRY}" }\n}\n`);
    expect(planned.preserved).toContain('src/ui/button.tsx');
  });

  it('refuses a stale plan before writing anything', async () => {
    const root = viteApp();
    const h = harness(root, 'vite');
    const { path } = await plan(h);
    put(root, 'vite.config.ts', VITE_CONFIG.replace('5173', '4000'));
    const before = snapshot(root);
    const result = await apply(h, path);
    expect(result.code).toBe(1);
    expect(result.err).toContain('is stale: inputs, operations changed');
    expect(snapshot(root)).toEqual(before);
    expect(h.calls).toEqual([]);
  });

  it('refuses noninteractive writes and an invalid --framework', async () => {
    const root = viteApp();
    const h = harness(root, 'vite');
    const output = io();
    expect(await init([root], output.io, h.deps)).toBe(2);
    expect(output.err).toContain('--plan --json');
    expect(await init([root, '--framework', 'remix', '--plan'], output.io, h.deps)).toBe(2);
  });

  it('cancels from the terminal without writing', async () => {
    const root = viteApp();
    const h = harness(root, 'vite');
    const before = snapshot(root);
    const output = io(true, false);
    expect(await init([root, '--registry', REGISTRY], output.io, h.deps)).toBe(3);
    expect(output.asked).toEqual([`Apply this plan to ${root}?`]);
    expect(output.out).toContain('Detected     Vite React TypeScript, src layout');
    expect(snapshot(root)).toEqual(before);
  });
});

describe('init on an existing Next application', () => {
  it.each(['app', 'src/app'] as const)('adds only the isolated route in the %s layout, keeping providers, metadata, fonts and theme', async (layout) => {
    const root = nextApp(layout);
    const h = harness(root, 'next');
    const before = snapshot(root);
    const { code, plan: planned, path } = await plan(h);
    expect(code).toBe(0);
    expect(planned.target).toMatchObject({ framework: 'next', layout, entry: `${layout}/layout.tsx`, sourceRoot: layout === 'app' ? '' : 'src', packageManager: { name: 'pnpm', lockfile: 'pnpm-lock.yaml' } });
    expect(planned.theme).toEqual({ css: true, json: true, design: false, importedFrom: null });
    expect(planned.manualSteps.some((step) => step.startsWith(`Theme: ultima-theme.css exists but ${layout}/layout.tsx does not import it`))).toBe(true);
    expect(writes(planned)).toEqual([
      'edit package.json',
      'create components.json',
      `create ${layout}/ultima.css`,
      'create babel.config.js',
      'create postcss.config.js',
      `edit ${layout}/layout.tsx`,
      `edit ${layout}/globals.css`,
      `create ${layout}/ultima-preview/page.tsx`,
      `create ${layout}/ultima-preview/preview.tsx`,
    ]);

    const result = await apply(h, path);
    expect(result.err).toBe('');
    expect(result.code).toBe(0);
    expect(result.out).toContain('The preview is at http://localhost:3000/ultima-preview');
    const after = snapshot(root);
    expect(after[`${layout}/layout.tsx`]).toBe(NEXT_LAYOUT.replace("import './globals.css';\n", "import './globals.css';\n").replace("import { Providers } from './providers';\n", "import { Providers } from './providers';\nimport './ultima.css';\n"));
    expect(after[`${layout}/globals.css`]).toContain('@layer reset {\n  * {\n    box-sizing: border-box;');
    expect(after[`${layout}/globals.css`]).toContain('html,\nbody {\n  max-width: 100vw;\n}\n');
    expect(after[`${layout}/ultima-preview/page.tsx`]).toContain("import UltimaPreview from './preview';");
    expect(after[`${layout}/ultima-preview/preview.tsx`]?.startsWith("'use client';\n")).toBe(true);
    expect(JSON.parse(after['components.json'] as string)).toMatchObject({ rsc: true, tailwind: { css: `${layout}/globals.css` }, registries: { '@ultima': REGISTRY } });
    for (const kept of [`${layout}/page.tsx`, `${layout}/providers.tsx`, 'next.config.ts', 'tsconfig.json', 'ultima-theme.css', 'ultima-theme.json', 'README.md', 'pnpm-lock.yaml']) expect(after[kept], kept).toBe(before[kept]);
    if (layout === 'src/app') expect(existsSync(join(root, 'app'))).toBe(false);
    const prefix = layout === 'app' ? '' : 'src/';
    expect(after[`${prefix}components/ui/dialog.tsx`]).toBe(FILES.dialog);
    expect(h.calls[0]).toEqual(['pnpm', 'install', '--no-frozen-lockfile']);
    expect(h.calls[1]?.slice(0, 3)).toEqual(['pnpm', 'dlx', 'shadcn@4.21.4']);
    expect(JSON.parse(after['package.json'] as string).devDependencies).toMatchObject({ '@stylexjs/babel-plugin': '0.19.0', '@stylexjs/postcss-plugin': '0.19.0', typescript: '^5' });

    h.calls.length = 0;
    const again = await plan(h);
    expect(writes(again.plan)).toEqual([]);
    expect((await apply(h, again.path)).code).toBe(0);
    expect(snapshot(root)).toEqual(after);
  });

  it('treats the starter page of an app init created as the mounted preview', async () => {
    const root = nextApp('src/app');
    put(root, 'src/app/page.tsx', "/** Ultima's starter screen, written by `ultima-design init`. */\nexport default function Home() {\n  return null;\n}\n");
    const h = harness(root, 'next');
    const { plan: planned } = await plan(h);
    expect(planned.preview).toEqual({ path: 'src/app/page.tsx', url: 'http://localhost:3000/', mounted: true, mountStep: null });
    expect(writes(planned).some((id) => id.includes('ultima-preview'))).toBe(false);
    expect(planned.preserved).toContain('src/app/page.tsx');
  });

  it('keeps a Babel config that already runs StyleX and imports the marker before the theme', async () => {
    const root = nextApp('app');
    put(root, 'babel.config.js', "module.exports = { presets: ['next/babel'], plugins: [['@stylexjs/babel-plugin', { dev: true }]] };\n");
    put(root, 'app/layout.tsx', NEXT_LAYOUT.replace("import './globals.css';\n", "import './globals.css';\nimport '../ultima-theme.css';\n"));
    const h = harness(root, 'next');
    const { plan: planned } = await plan(h);
    expect(writes(planned)).not.toContain('create babel.config.js');
    expect(planned.preserved).toContain('babel.config.js');
    expect(planned.theme.importedFrom).toBe('app/layout.tsx');
    const layout = planned.operations.find((operation) => operation.id === 'edit app/layout.tsx');
    expect(layout && 'content' in layout && layout.content).toContain("import './globals.css';\nimport './ultima.css';\nimport '../ultima-theme.css';\n");
  });
});

type Case = { name: string; framework: 'vite' | 'next'; make: () => string; extra?: string[]; message: string; repair: (root: string) => void };

const CONFLICTS: Case[] = [
  {
    name: 'a conflicting @/ alias',
    framework: 'vite',
    make: () => {
      const root = viteApp();
      put(root, 'tsconfig.app.json', '{ "compilerOptions": { "paths": { "@/*": ["./lib/*"] } }, "include": ["src"] }\n');
      return root;
    },
    message: '"@/*" maps to ./lib/*, but the src layout needs ./src/*',
    repair: (root) => put(root, 'tsconfig.app.json', '{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } }, "include": ["src"] }\n'),
  },
  {
    name: 'dual Next layouts',
    framework: 'next',
    make: () => {
      const root = nextApp('app');
      put(root, 'src/app/layout.tsx', NEXT_LAYOUT);
      return root;
    },
    message: 'Both app and src/app exist',
    repair: (root) => rmSync(join(root, 'src'), { recursive: true }),
  },
  {
    name: 'a computed Vite config',
    framework: 'vite',
    make: () => {
      const root = viteApp();
      put(root, 'vite.config.ts', "import react from '@vitejs/plugin-react'\nimport { defineConfig } from 'vite'\n\nexport default defineConfig(({ mode }) => ({ plugins: [react()], base: mode }))\n");
      return root;
    },
    message: 'computes its config',
    repair: (root) => put(root, 'vite.config.ts', VITE_CONFIG),
  },
  {
    name: 'an unsupported framework version',
    framework: 'vite',
    make: () => {
      const root = viteApp();
      installed(root, { vite: '7.1.0' });
      return root;
    },
    message: 'vite resolves to 7.1.0, below the 8.0.0 this recipe needs',
    repair: (root) => installed(root, { vite: '8.3.4' }),
  },
  {
    name: 'a Next version newer than tested',
    framework: 'next',
    make: () => {
      const root = nextApp('src/app');
      installed(root, { next: '17.0.0' });
      return root;
    },
    message: 'next resolves to 17.0.0, newer than this CLI has tested',
    repair: (root) => installed(root, { next: '16.4.0' }),
  },
  {
    name: 'multiple lockfiles',
    framework: 'vite',
    make: () => {
      const root = viteApp();
      put(root, 'pnpm-lock.yaml', "lockfileVersion: '9.0'\n");
      return root;
    },
    message: 'package-lock.json and pnpm-lock.yaml both exist',
    repair: (root) => rmSync(join(root, 'pnpm-lock.yaml')),
  },
  {
    name: 'an escaping symlink',
    framework: 'vite',
    make: () => {
      const root = viteApp();
      const outside = scratch('ultima-outside-');
      symlinkSync(outside, join(root, 'src/components'));
      return root;
    },
    message: 'resolves outside the application through a symlink',
    repair: (root) => rmSync(join(root, 'src/components')),
  },
  {
    name: 'a manager that disagrees with --package-manager',
    framework: 'next',
    make: () => nextApp('app'),
    extra: ['--package-manager', 'npm'],
    message: '--package-manager npm disagrees with the project, which uses pnpm',
    repair: (root) => {
      rmSync(join(root, 'pnpm-lock.yaml'));
      put(root, 'package-lock.json', '{}\n');
    },
  },
  {
    name: 'a framework that disagrees with --framework',
    framework: 'next',
    make: () => nextApp('app'),
    extra: ['--framework', 'vite'],
    message: '--framework vite does not match the application, which is next',
    repair: () => {},
  },
  {
    name: 'an incompatible components.json',
    framework: 'next',
    make: () => {
      const root = nextApp('app');
      put(root, 'components.json', '{ "style": "new-york", "rsc": true, "tsx": true, "aliases": { "ui": "@/components/ui", "lib": "@/lib" } }\n');
      return root;
    },
    message: 'style is "new-york"',
    repair: (root) => rmSync(join(root, 'components.json')),
  },
  {
    name: 'an edited collision in installed source',
    framework: 'vite',
    make: () => {
      const root = viteApp();
      put(root, 'src/lib/tokens.stylex.ts', '// a consumer edit\n');
      return root;
    },
    message: 'src/lib/tokens.stylex.ts exists and is not @ultima/tokens\'s current source',
    repair: (root) => put(root, 'src/lib/tokens.stylex.ts', FILES.tokens),
  },
  {
    name: 'a preview collision',
    framework: 'next',
    make: () => {
      const root = nextApp('app');
      put(root, 'app/(marketing)/ultima-preview/page.tsx', 'export default function Page() { return null; }\n');
      return root;
    },
    message: 'The /ultima-preview route already exists at app/(marketing)/ultima-preview',
    repair: (root) => rmSync(join(root, 'app/(marketing)'), { recursive: true }),
  },
  {
    name: 'an unrecognized reset',
    framework: 'vite',
    make: () => {
      const root = viteApp();
      put(root, 'index.html', readFileSync(join(root, 'index.html'), 'utf8').replace('<title>Shop</title>', '<title>Shop</title><style>* { margin: 0 }</style>'));
      return root;
    },
    message: '`*` is an unlayered reset',
    repair: (root) => put(root, 'index.html', readFileSync(join(root, 'index.html'), 'utf8').replace('<style>* { margin: 0 }</style>', '')),
  },
];

describe('conflicts', () => {
  it.each(CONFLICTS)('$name fails before any write; repairing it lets a fresh plan proceed', async ({ framework, make, extra = [], message, repair }) => {
    const root = make();
    const h = harness(root, framework);
    const before = snapshot(root);
    const blocked = await plan(h, extra);
    expect(blocked.code).toBe(1);
    expect(blocked.err).toContain(message);
    expect(blocked.err).toContain('Nothing was written.');
    expect(JSON.parse(blocked.out)).toMatchObject({ status: 'blocked', conflicts: expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining(message) })]) });
    expect(snapshot(root)).toEqual(before);
    expect(h.calls).toEqual([]);

    repair(root);
    const fresh = await plan(h, extra.includes('--framework') ? [] : extra.includes('--package-manager') ? extra : []);
    expect(fresh.err).toBe('');
    expect(fresh.code).toBe(0);
    expect((await apply(h, fresh.path)).code).toBe(framework === 'vite' ? 3 : 0);
  });
});

const journalOf = (root: string) => {
  const runs = readdirSync(join(root, '.ultima-init')).filter((name) => name !== '.gitignore').sort();
  return { runs, journal: JSON.parse(readFileSync(join(root, '.ultima-init', runs.at(-1) as string, 'journal.json'), 'utf8')) as Journal };
};

async function straightApplySnapshot(adjust: (h: Harness) => void = () => {}): Promise<Record<string, string>> {
  const h = harness(viteApp(), 'vite');
  adjust(h);
  await apply(h, (await plan(h)).path);
  return snapshot(h.root);
}

const interrupt = () => {
  throw new Error('interrupted');
};
const CHECKS = ['verify versions', 'doctor', 'check', 'typecheck', 'build'];

describe('recovery', () => {
  it('saves the original bytes and modes and journals each step before it runs', async () => {
    const root = viteApp();
    chmodSync(join(root, 'package.json'), 0o640);
    const original = readFileSync(join(root, 'package.json'));
    const h = harness(root, 'vite');
    let atInstall: Journal | undefined;
    h.beforeStep.set('install', () => {
      atInstall = journalOf(root).journal;
    });
    const result = await apply(h, (await plan(h)).path);
    expect(result.code).toBe(3);

    const { runs, journal } = journalOf(root);
    expect(runs).toHaveLength(1);
    const directory = join(root, '.ultima-init', runs[0] as string);
    expect(statSync(directory).mode & 0o777).toBe(0o700);
    expect(readFileSync(join(root, '.ultima-init/.gitignore'), 'utf8')).toBe('*\n');
    expect(journal).toMatchObject({ status: 'finished', manager: 'npm', lockfile: 'package-lock.json', originals: { 'package.json': { sha256: sha256(original), mode: 0o640 }, 'components.json': null, 'src/components/ui/button.tsx': null } });
    expect(readFileSync(join(directory, 'files', sha256(original)))).toEqual(original);
    expect(statSync(join(root, 'package.json')).mode & 0o777).toBe(0o640);
    expect(journal.directories).toEqual(expect.arrayContaining(['src/components', 'src/components/ui', 'src/lib']));
    expect(atInstall?.operations.map(({ id, status }) => `${id}: ${status}`)).toEqual([
      'edit package.json: done',
      'edit tsconfig.json: done',
      'edit tsconfig.app.json: done',
      'create components.json: done',
      'create ultima.vite.ts: done',
      'install: started',
    ]);
    const edited = sha256(readFileSync(join(root, 'package.json')));
    expect(journal.operations.find(({ id }) => id === 'edit package.json')).toMatchObject({ before: { 'package.json': sha256(original) }, after: { 'package.json': edited } });
    expect(journal.operations.find(({ id }) => id === 'install')).toMatchObject({ status: 'done', exit: 0, log: join(directory, '06-install.log') });
    expect(journal.outputs).toMatchObject({ 'package.json': edited, 'components.json': expect.any(String), 'src/lib/tokens.stylex.ts': sha256(FILES.tokens) });
    expect(journal.outputs).not.toHaveProperty('package-lock.json');
    expect(result.out).toContain(`undo this run with \`npx ultima-design init . --rollback ${runs[0]}\``);
  });

  it('resumes an interrupted package install, installing what the run declared and planning nothing it finished', async () => {
    const clean = await straightApplySnapshot();
    const root = viteApp();
    const h = harness(root, 'vite');
    // npm dies mid-reify, having moved one of the consumer's own packages out of node_modules.
    h.beforeStep.set('install', () => {
      rmSync(join(root, 'node_modules/react'), { recursive: true });
      interrupt();
    });
    await expect(apply(h, (await plan(h)).path)).rejects.toThrow('interrupted');
    const first = journalOf(root);
    expect(first.journal.status).toBe('running');
    expect(first.journal.operations.at(-1)).toMatchObject({ id: 'install', status: 'started' });

    h.beforeStep.clear();
    const resumed = await plan(h);
    expect(resumed.err).toBe('');
    expect(resumed.plan.resume).toEqual({ runId: first.runs[0], install: { react: '19.2.0', '@base-ui/react': '1.8.0', '@stylexjs/stylex': '0.19.0', '@stylexjs/unplugin': '0.19.0', unplugin: '2.3.11', 'ultima-design': CLI_VERSION }, items: [] });
    expect(resumed.plan.operations.find(({ id }) => id === 'verify versions')).toMatchObject({ versions: { react: '19.2.0', unplugin: '2.3.11' } });
    expect(resumed.plan.operations.map(({ id }) => id)).toEqual(['install', 'add button, card, dialog', 'edit vite.config.ts', 'edit src/index.css', 'create src/ultima-preview.tsx', ...CHECKS]);
    const printed = io();
    await init([root, '--plan', '--registry', REGISTRY], printed.io, h.deps);
    expect(printed.out).toContain(`Resumes      run ${first.runs[0]}, which stopped before it finished; it still installs react, @stylexjs/stylex, @base-ui/react, @stylexjs/unplugin, unplugin, ultima-design. Steps it finished are not planned again.`);

    expect((await apply(h, resumed.path)).code).toBe(3);
    expect(snapshot(root)).toEqual(clean);
    const { runs, journal } = journalOf(root);
    expect(runs).toEqual(first.runs);
    expect(journal).toMatchObject({ status: 'finished', plans: [first.journal.plans[0], resumed.plan.planHash] });
    expect(readdirSync(join(root, '.ultima-init', runs[0] as string))).toEqual(expect.arrayContaining(['plan.json', '2.plan.json', '2.result.json', '2.01-install.log']));
  });

  it('resumes an interrupted registry install, adding again the item shadcn left partly written', async () => {
    const twoFileDialog = (h: Harness) => (h.registry.dialog as { files: unknown[] }).files.push({ path: 'ultima/ui/dialog-parts.tsx', type: 'registry:ui', content: 'export const Parts = {};\n' });
    const clean = await straightApplySnapshot(twoFileDialog);
    const root = viteApp();
    const h = harness(root, 'vite');
    twoFileDialog(h);
    h.crashAfterWriting = 'src/components/ui/dialog.tsx';
    await expect(apply(h, (await plan(h)).path)).rejects.toThrow('interrupted');
    expect(existsSync(join(root, 'src/components/ui/dialog.tsx'))).toBe(true);
    expect(existsSync(join(root, 'src/components/ui/dialog-parts.tsx'))).toBe(false);

    h.crashAfterWriting = null;
    h.calls.length = 0;
    const resumed = await plan(h);
    expect(resumed.err).toBe('');
    expect(resumed.plan.resume).toMatchObject({ install: {}, items: ['dialog'] });
    expect(resumed.plan.items).toEqual({ add: ['dialog'], present: ['button', 'card'], creates: ['src/components/ui/dialog-parts.tsx', 'src/lib/themes.ts', 'src/lib/tokens.stylex.ts'] });
    expect(resumed.plan.operations.map(({ id }) => id)).toEqual(['add dialog', 'edit vite.config.ts', 'edit src/index.css', 'create src/ultima-preview.tsx', ...CHECKS]);
    expect((await apply(h, resumed.path)).code).toBe(3);
    expect(snapshot(root)).toEqual(clean);
    expect(h.calls.filter((call) => call.includes('add'))).toEqual([['npx', '--yes', 'shadcn@4.21.4', 'add', '@ultima/dialog', '--yes']]);
  });

  it('resumes config edits stopped by a consumer edit, keeping that edit and adding nothing twice', async () => {
    const root = viteApp();
    const h = harness(root, 'vite');
    const consumerCss = VITE_INDEX_CSS.replace('.shell {', '.cart {\n  color: red;\n}\n\n.shell {');
    h.beforeStep.set('add', () => put(root, 'src/index.css', consumerCss));
    const stopped = await apply(h, (await plan(h)).path);
    expect(stopped.code).toBe(1);
    expect(stopped.err).toContain('stopped at edit src/index.css: src/index.css changed after it was planned');
    const { runs, journal } = journalOf(root);
    expect(stopped.err).toContain(`Run \`npx ultima-design init .\` to plan the rest of this run, or \`npx ultima-design init . --rollback ${runs[0]}\` to undo it.`);
    expect(journal.status).toBe('stopped');
    expect(journal.operations.at(-1)).toMatchObject({ id: 'edit src/index.css', status: 'failed' });

    h.beforeStep.clear();
    const resumed = await plan(h);
    expect(resumed.plan.resume?.runId).toBe(runs[0]);
    expect(resumed.plan.operations.map(({ id }) => id)).toEqual(['edit src/index.css', 'create src/ultima-preview.tsx', ...CHECKS]);
    expect((await apply(h, resumed.path)).code).toBe(3);
    const css = readFileSync(join(root, 'src/index.css'), 'utf8');
    expect(css).toContain('.cart {\n  color: red;\n}');
    expect(css.match(/@layer reset/g)).toHaveLength(1);
    const config = readFileSync(join(root, 'vite.config.ts'), 'utf8');
    expect(config.match(/ultimaStylex/g)).toHaveLength(2);
    expect(journalOf(root).journal.status).toBe('finished');
  });

  it('rolls back to the original bytes and modes, then the next plan starts over', async () => {
    const root = viteApp();
    chmodSync(join(root, 'package.json'), 0o640);
    const before = snapshot(root);
    const h = harness(root, 'vite');
    await apply(h, (await plan(h)).path);
    const { runs } = journalOf(root);

    const output = io();
    expect(await init([root, '--rollback', runs[0] as string], output.io, h.deps)).toBe(3);
    expect(snapshot(root)).toEqual(before);
    expect(statSync(join(root, 'package.json')).mode & 0o777).toBe(0o640);
    for (const directory of ['src/components', 'src/lib']) expect(existsSync(join(root, directory)), directory).toBe(false);
    expect(output.out).toContain('Restored   package.json, src/index.css, tsconfig.app.json, tsconfig.json, vite.config.ts');
    expect(output.out).toContain('Removed    components.json, src/components/ui/button.tsx');
    expect(output.out).toContain('Left       none');
    expect(output.out).toContain('package.json is back to its original bytes, and node_modules still holds what the run installed. Reinstall:\n  npm ci\n');
    expect(journalOf(root).journal).toMatchObject({ status: 'rolled back', rollback: { left: [] } });

    const again = io();
    expect(await init([root, '--rollback', runs[0] as string], again.io, h.deps)).toBe(0);
    expect(again.out).toContain('Restored   none');
    const unknown = io();
    expect(await init([root, '--rollback', 'nope'], unknown.io, h.deps)).toBe(2);
    expect(unknown.err).toContain(`has no init run nope. Runs recorded there: ${runs[0]}`);

    const fresh = await plan(h);
    expect(fresh.plan.resume).toBeNull();
    expect(writes(fresh.plan)).toContain('edit package.json');
  });

  it('leaves a file the consumer changed after the run, and names it with its original', async () => {
    const root = viteApp();
    const before = snapshot(root);
    const h = harness(root, 'vite');
    await apply(h, (await plan(h)).path);
    const { runs, journal } = journalOf(root);
    const config = `${readFileSync(join(root, 'vite.config.ts'), 'utf8')}// the consumer's note\n`;
    put(root, 'vite.config.ts', config);
    put(root, 'src/ultima-preview.tsx', `${readFileSync(join(root, 'src/ultima-preview.tsx'), 'utf8')}// edited\n`);

    const output = io();
    expect(await init([root, '--rollback', runs[0] as string], output.io, h.deps)).toBe(1);
    const { 'src/ultima-preview.tsx': preview, ...after } = snapshot(root);
    expect(preview).toContain('// edited');
    expect(after['vite.config.ts']).toBe(config);
    expect({ ...after, 'vite.config.ts': before['vite.config.ts'] }).toEqual(before);
    expect(existsSync(join(root, 'src/components'))).toBe(false);
    expect(output.out).toContain('Left       src/ultima-preview.tsx, vite.config.ts');
    const original = join(root, '.ultima-init', runs[0] as string, 'files', journal.originals['vite.config.ts']?.sha256 as string);
    expect(readFileSync(original, 'utf8')).toBe(VITE_CONFIG);
    expect(output.out).toContain(`vite.config.ts changed after this run wrote it, so it was left as it is. Its original is ${original}: compare and restore it by hand.`);
    expect(output.out).toContain('src/ultima-preview.tsx did not exist before this run and changed after it was written, so it was left. Delete it by hand if you do not want it.');
  });

  it('rejects a registry payload that changed after planning, before shadcn writes', async () => {
    const root = viteApp();
    const h = harness(root, 'vite');
    const { path } = await plan(h);
    h.beforeStep.set('install', () => {
      ((h.registry.card as { files: { content: string }[] }).files[0] as { content: string }).content = 'export const Card = "changed";\n';
    });
    const result = await apply(h, path);
    expect(result.code).toBe(1);
    expect(result.err).toContain('stopped at add button, card, dialog: the registry changed @ultima/card since this plan pinned it, so shadcn did not run');
    expect(h.calls.some((call) => call.includes('add'))).toBe(false);
    expect(existsSync(join(root, 'src/components/ui/card.tsx'))).toBe(false);
    expect(journalOf(root).journal.operations.at(-1)).toMatchObject({ id: 'add button, card, dialog', status: 'failed' });
  });

  it('rejects registry targets outside the application or onto consumer files before any write', async () => {
    const root = viteApp();
    const h = harness(root, 'vite');
    (h.registry.tokens as { files: unknown[] }).files.push(
      { path: 'ultima/escape.ts', type: 'registry:file', target: '~/../escape.ts', content: '' },
      { path: 'ultima/app.tsx', type: 'registry:file', target: '~/src/App.tsx', content: 'export default null;\n' },
    );
    const before = snapshot(root);
    const blocked = await plan(h);
    expect(blocked.code).toBe(1);
    expect(blocked.err).toContain('@ultima/tokens would install ../escape.ts, outside the application.');
    expect(blocked.err).toContain("src/App.tsx exists and is not @ultima/tokens's current source");
    expect(snapshot(root)).toEqual(before);
    expect(existsSync(join(root, '.ultima-init'))).toBe(false);
  });
});
