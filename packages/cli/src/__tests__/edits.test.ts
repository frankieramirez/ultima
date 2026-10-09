import { describe, expect, it } from 'vitest';

import { type EditResult, applyEdits, ensureJsonPath, layerResets, sideEffectImport, viteConfigEdits } from '../edits.ts';

const after = (text: string, result: EditResult) => {
  if ('conflict' in result) throw new Error(result.conflict);
  return applyEdits(text, result.edits);
};

describe('ensureJsonPath', () => {
  it('adds paths under compilerOptions, keeping comments, blank lines and trailing commas', () => {
    const text = '{\n  "compilerOptions": {\n    /* Bundler mode */\n    "target": "es2023",\n    "jsx": "react-jsx", // keep\n  },\n  "include": ["src"]\n}\n';
    const edit = ensureJsonPath(text, 'tsconfig.app.json', ['compilerOptions', 'paths'], '{ "@/*": ["./src/*"] }');
    expect(applyEdits(text, [edit!])).toBe(
      '{\n  "compilerOptions": {\n    /* Bundler mode */\n    "target": "es2023",\n    "jsx": "react-jsx", // keep\n    "paths": { "@/*": ["./src/*"] },\n  },\n  "include": ["src"]\n}\n',
    );
  });

  it('creates compilerOptions in a solution-style tsconfig', () => {
    const text = '{\n  "files": [],\n  "references": [{ "path": "./tsconfig.app.json" }]\n}\n';
    const edit = ensureJsonPath(text, 'tsconfig.json', ['compilerOptions', 'paths'], '{ "@/*": ["./src/*"] }');
    expect(applyEdits(text, [edit!])).toBe('{\n  "files": [],\n  "references": [{ "path": "./tsconfig.app.json" }],\n  "compilerOptions": { "paths": { "@/*": ["./src/*"] } }\n}\n');
  });

  it('adds an alias beside the existing ones in an inline paths object', () => {
    const text = '{ "compilerOptions": { "paths": { "~/*": ["./app/*"] } } }';
    const edit = ensureJsonPath(text, 'tsconfig.json', ['compilerOptions', 'paths', '@/*'], '["./*"]');
    expect(applyEdits(text, [edit!])).toBe('{ "compilerOptions": { "paths": { "~/*": ["./app/*"], "@/*": ["./*"] } } }');
  });

  it('inserts a dependency in sorted position and fills an empty map', () => {
    const text = '{\n  "dependencies": {\n    "react": "^19.2.0",\n    "zod": "4.0.0"\n  },\n  "devDependencies": {}\n}\n';
    const first = applyEdits(text, [ensureJsonPath(text, 'package.json', ['dependencies', '@stylexjs/stylex'], '"0.19.0"', true)!]);
    const second = applyEdits(first, [ensureJsonPath(first, 'package.json', ['dependencies', 'sonner'], '"1.0.0"', true)!]);
    const third = applyEdits(second, [ensureJsonPath(second, 'package.json', ['devDependencies', 'unplugin'], '"2.3.11"', true)!]);
    expect(JSON.parse(third)).toEqual({ dependencies: { '@stylexjs/stylex': '0.19.0', react: '^19.2.0', sonner: '1.0.0', zod: '4.0.0' }, devDependencies: { unplugin: '2.3.11' } });
    expect(third).toContain('  "devDependencies": {\n    "unplugin": "2.3.11"\n  }\n');
    expect(Object.keys(JSON.parse(third).dependencies)).toEqual(['@stylexjs/stylex', 'react', 'sonner', 'zod']);
  });

  it('refuses a path through a value that is not an object', () => {
    expect(ensureJsonPath('{ "registries": "x" }', 'components.json', ['registries', '@ultima'], '"u"')).toBeNull();
  });
});

describe('viteConfigEdits', () => {
  it('puts ultimaStylex first and keeps foreign plugins and options', () => {
    const text = "import react from '@vitejs/plugin-react'\nimport { defineConfig } from 'vite'\nimport inspect from 'vite-plugin-inspect'\n\nexport default defineConfig({\n  plugins: [\n    react(),\n    inspect(),\n  ],\n  server: { port: 4000 },\n})\n";
    expect(after(text, viteConfigEdits('vite.config.ts', text))).toBe(
      "import react from '@vitejs/plugin-react'\nimport { defineConfig } from 'vite'\nimport inspect from 'vite-plugin-inspect'\nimport { ultimaStylex } from './ultima.vite.ts'\n\nexport default defineConfig({\n  plugins: [\n    ultimaStylex(),\n    react(),\n    inspect(),\n  ],\n  server: { port: 4000 },\n})\n",
    );
  });

  it('follows the quote and semicolon style and an inline plugin list', () => {
    const text = 'import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react-swc";\n\nexport default defineConfig({ plugins: [react()] });\n';
    expect(after(text, viteConfigEdits('vite.config.ts', text))).toBe(
      'import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react-swc";\nimport { ultimaStylex } from "./ultima.vite.ts";\n\nexport default defineConfig({ plugins: [ultimaStylex(), react()] });\n',
    );
  });

  it('changes nothing once ultimaStylex is first', () => {
    const text = "import react from '@vitejs/plugin-react'\nimport { ultimaStylex } from './ultima.vite.ts'\nexport default { plugins: [ultimaStylex(), react()] }\n";
    expect(viteConfigEdits('vite.config.ts', text)).toEqual({ edits: [] });
  });

  it.each([
    ['a function config', "import react from '@vitejs/plugin-react'\nimport { defineConfig } from 'vite'\nexport default defineConfig(({ mode }) => ({ plugins: [react()] }))\n", 'computes its config'],
    ['a computed plugin list', "import react from '@vitejs/plugin-react'\nconst plugins = [react()]\nexport default { plugins }\n", 'no plugins array'],
    ['a spread plugin list', "import react from '@vitejs/plugin-react'\nexport default { plugins: base.concat([react()]) }\n", 'computes plugins'],
    ['no React plugin', "import { defineConfig } from 'vite'\nexport default defineConfig({ plugins: [] })\n", 'no default import'],
    ['ultimaStylex out of place', "import react from '@vitejs/plugin-react'\nimport { ultimaStylex } from './ultima.vite'\nexport default { plugins: [react(), ultimaStylex()] }\n", 'does not call it first'],
  ])('leaves %s for manual repair', (_, text, message) => {
    const result = viteConfigEdits('vite.config.ts', text);
    expect('conflict' in result && result.conflict).toContain(message);
  });
});

describe('sideEffectImport', () => {
  it('adds the marker import after the last import, once', () => {
    const text = "import type { Metadata } from 'next';\nimport { Geist } from 'next/font/google';\nimport './globals.css';\n\nexport const metadata: Metadata = { title: 'App' };\n";
    const once = after(text, sideEffectImport('app/layout.tsx', text, './ultima.css'));
    expect(once).toBe("import type { Metadata } from 'next';\nimport { Geist } from 'next/font/google';\nimport './globals.css';\nimport './ultima.css';\n\nexport const metadata: Metadata = { title: 'App' };\n");
    expect(sideEffectImport('app/layout.tsx', once, './ultima.css')).toEqual({ edits: [] });
  });

  it('goes before the theme stylesheet so the theme still follows StyleX', () => {
    const text = 'import "./globals.css"\nimport "../ultima-theme.css"\nimport { Providers } from "./providers"\n';
    expect(after(text, sideEffectImport('app/layout.tsx', text, './ultima.css', (specifier) => specifier.endsWith('ultima-theme.css')))).toBe(
      'import "./globals.css"\nimport "./ultima.css"\nimport "../ultima-theme.css"\nimport { Providers } from "./providers"\n',
    );
  });
});

describe('layerResets', () => {
  it('wraps each run of reset rules where it stands and leaves application rules alone', () => {
    const text = ':root {\n  --brand: #e11d48;\n}\n\n*,\n*::before {\n  box-sizing: border-box;\n}\n/* headings */\nh1 {\n  margin: 0;\n}\n\nbody {\n  margin: 0;\n}\n\n@media (min-width: 40rem) {\n  p { margin: 0; }\n  .app { padding: 1rem; }\n}\n';
    expect(after(text, layerResets('src/index.css', text))).toBe(
      ':root {\n  --brand: #e11d48;\n}\n\n@layer reset {\n  *,\n  *::before {\n    box-sizing: border-box;\n  }\n  /* headings */\n  h1 {\n    margin: 0;\n  }\n}\n\nbody {\n  margin: 0;\n}\n\n@media (min-width: 40rem) {\n  @layer reset {\n    p { margin: 0; }\n  }\n  .app { padding: 1rem; }\n}\n',
    );
  });

  it('changes nothing when the resets are layered already', () => {
    const text = '@layer reset {\n  * { margin: 0; }\n}\n';
    expect(layerResets('app/globals.css', text)).toEqual({ edits: [] });
  });

  it('splits a selector list mixing resets and classes, keeping the class where it was', () => {
    const text = 'p {\n  margin: 0;\n}\n\ncode,\n.counter {\n  font-family: var(--mono);\n}\n\n.counter { color: red; }\n';
    expect(after(text, layerResets('src/index.css', text))).toBe(
      '@layer reset {\n  p {\n    margin: 0;\n  }\n}\n\n@layer reset {\n  code {\n    font-family: var(--mono);\n  }\n}\n.counter {\n  font-family: var(--mono);\n}\n\n.counter { color: red; }\n',
    );
    const inline = 'a, .link { color: inherit; }\n';
    expect(after(inline, layerResets('src/index.css', inline))).toBe('@layer reset {\n  a { color: inherit; }\n}\n.link { color: inherit; }\n');
  });

  it('leaves a reset selector list with comments in it for manual repair', () => {
    const result = layerResets('src/index.css', 'a /* links */, .link { color: inherit; }\n');
    expect('conflict' in result && result.conflict).toContain('comments inside the reset selector list');
  });
});
