import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { diskFiles } from '../../../../scripts/catalogue/files.ts';
import { stagedSources } from '../../../../scripts/catalogue/staging.ts';
import { supportedRanges } from '../../scripts/supported-ranges.ts';

const setupItems = join(dirname(fileURLToPath(import.meta.url)), '../../../../registry/static');
const LOCAL_REGISTRY = 'http://127.0.0.1:4321/r/{name}.json';

export function project(files: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'ultima-cli-'));
  for (const [path, content] of Object.entries({ 'package.json': '{}', ...files })) write(root, path, content);
  return root;
}

export function write(root: string, path: string, content: string) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

export function installed(target: 'vite' | 'next', root = project()): string {
  cpSync(join(setupItems, `setup-${target}`), root, { recursive: true });
  pointAtLocalRegistry(root);
  return root;
}

function pointAtLocalRegistry(root: string) {
  editComponents(root, (json) => {
    (json.registries as Record<string, unknown>)['@ultima'] = LOCAL_REGISTRY;
  });
}

const RANGES = supportedRanges(join(dirname(fileURLToPath(import.meta.url)), '../../../..'));

export function smoke(target: 'vite' | 'next'): string {
  const root = installed(target, project(SMOKE[target]));
  const { dependencies = {}, devDependencies = {} } = JSON.parse(SMOKE[target]['package.json'] ?? '{}');
  for (const [name, { ceiling }] of Object.entries(RANGES)) {
    if (name in dependencies || name in devDependencies) {
      write(root, `node_modules/${name}/package.json`, JSON.stringify({ name, version: ceiling }));
    }
  }
  return root;
}

const SMOKE: Record<'vite' | 'next', Record<string, string>> = {
  vite: {
    'package.json': JSON.stringify({
      name: 'vite-app',
      type: 'module',
      dependencies: { '@stylexjs/stylex': '^0.18.0', react: '^19.2.0', 'react-dom': '^19.2.0' },
      devDependencies: {
        '@stylexjs/unplugin': '^0.18.0',
        '@vitejs/plugin-react': '^5.0.0',
        typescript: '~5.9.3',
        unplugin: '^2.3.0',
        vite: '^7.1.0',
      },
    }),
    'tsconfig.json': JSON.stringify({
      files: [],
      references: [{ path: './tsconfig.app.json' }, { path: './tsconfig.node.json' }],
      compilerOptions: { paths: { '@/*': ['./src/*'] } },
    }),
    'tsconfig.app.json': JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        jsx: 'react-jsx',
        strict: true,
        noEmit: true,
        paths: { '@/*': ['./src/*'] },
      },
      include: ['src'],
    }),
    'tsconfig.node.json': JSON.stringify({ compilerOptions: { module: 'ESNext' }, include: ['vite.config.ts'] }),
    'vite.config.ts': [
      "import { defineConfig } from 'vite'",
      "import { ultimaStylex } from './ultima.vite.ts'",
      "import react from '@vitejs/plugin-react'",
      '',
      '// https://vite.dev/config/',
      'export default defineConfig({',
      '  plugins: [ultimaStylex(), react()],',
      '})',
      '',
    ].join('\n'),
    'index.html': '<div id="root"></div>\n<script type="module" src="/src/main.tsx"></script>\n',
    'src/main.tsx': "import './index.css'\nimport App from './App.tsx'\n",
    'src/App.tsx': 'export default function App() {\n  return <p>App</p>;\n}\n',
    'src/index.css': '@layer reset {\n:root { color-scheme: light dark; }\nbody { margin: 0; }\n}\n',
  },
  next: {
    'package.json': JSON.stringify({
      name: 'next-app',
      dependencies: { '@stylexjs/stylex': '^0.18.0', next: '16.0.0', react: '19.2.0', 'react-dom': '19.2.0' },
      devDependencies: {
        '@stylexjs/babel-plugin': '^0.18.0',
        '@stylexjs/postcss-plugin': '^0.18.0',
        '@types/react': '^19',
        typescript: '^5',
      },
    }),
    'tsconfig.json': JSON.stringify({
      compilerOptions: { target: 'ES2017', strict: true, jsx: 'preserve', paths: { '@/*': ['./*'] } },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
    }),
    'app/layout.tsx': [
      'import type { Metadata } from "next";',
      'import "./globals.css";',
      'import "./ultima.css";',
      '',
      'export const metadata: Metadata = { title: "Create Next App" };',
      '',
      'export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {',
      '  return (',
      '    <html lang="en">',
      '      <body>{children}</body>',
      '    </html>',
      '  );',
      '}',
      '',
    ].join('\n'),
    'app/page.tsx': 'export default function Page() {\n  return <p>Page</p>;\n}\n',
    'app/globals.css': '@layer reset {\n* { box-sizing: border-box; padding: 0; margin: 0; }\n}\n',
  },
};

export function edit(root: string, file: string, change: (text: string) => string) {
  const path = join(root, file);
  const before = readFileSync(path, 'utf8');
  const after = change(before);
  if (after === before) throw new Error(`the edit to ${file} changed nothing`);
  writeFileSync(path, after);
}

export function snapshot(root: string): Record<string, string> {
  const files: Record<string, string> = {};
  for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
    const path = join(entry.parentPath, entry.name);
    files[relative(root, path)] = entry.isFile() ? readFileSync(path, 'utf8') : '<dir>';
  }
  return files;
}

export function editComponents(root: string, edit: (json: Record<string, unknown>) => void) {
  const file = join(root, 'components.json');
  const json = JSON.parse(readFileSync(file, 'utf8'));
  edit(json);
  writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
}

const REPOSITORY = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

/**
 * Every staged source written where shadcn installs it, its imports rewritten to the default aliases
 * as the registry build and shadcn do together: the whole catalogue, as a consumer owns it.
 */
export function installCatalogue(root: string, directories: { ui: string; lib: string }): string {
  for (const { source, staged } of stagedSources(diskFiles(REPOSITORY)).sources) {
    const text = readFileSync(join(REPOSITORY, source), 'utf8')
      .replace(/(['"])@ultima\/(tokens|ui\/lib)\//g, '$1@/lib/')
      .replace(/(['"])@ultima\/ui\//g, '$1@/components/ui/');
    const [, folder, name] = staged.split('/') as [string, 'ui' | 'lib', string];
    write(root, `${directories[folder]}/${name}`, text);
  }
  return root;
}

/** A checker fixture from packages/analysis/fixtures, by its path there. */
export function analysisFixture(path: string): string {
  return readFileSync(join(REPOSITORY, 'packages/analysis/fixtures', path), 'utf8');
}
