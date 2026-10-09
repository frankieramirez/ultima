// The recipes `init` follows for a new project: docs/spec/consumer-setup.md, Supported layouts and compatibility.
// A recipe is data. Each subprocess `init` runs is built from these fields as structured arguments, never a shell string,
// and every version is exact: the release tests this combination and no other.
import { createHash } from 'node:crypto';

export type Manager = 'npm' | 'pnpm';
export const MANAGERS: Manager[] = ['npm', 'pnpm'];
export type Framework = 'vite' | 'next';
export type Layout = 'root' | 'src';

/** A file the recipe writes. `before` is the pinned scaffold's text, so a plan can show the diff; a file without it replaces a scaffold example whole. */
export type RecipeFile = { path: string; before?: string; after: string };

/** A step `init` leaves to the consumer: the file it touches, the edit or command, and how to see that it worked. */
export type ManualStep = { title: string; required: boolean; file: string; edit: string; verify: string };

/** What the scaffold does differently for one manager: the arguments that select it, and the files it adds or writes differently. */
export type ManagerVariant = { args: string[]; scaffoldFiles?: Record<string, string>; aliasFiles?: RecipeFile[] };

export type Recipe = {
  id: string;
  revision: number;
  framework: Framework;
  layout: Layout;
  title: string;
  scaffold: { package: string; version: string; args: string[] };
  managers?: Record<Manager, ManagerVariant>;
  shadcn: { package: string; version: string };
  /** The lowest Node every pinned package and the CLI accept: the intersection of their `engines.node`. */
  node: string;
  setupItem: string;
  items: string[];
  /** The CSS entry `components.json` names. */
  css: string;
  /** Exact versions, `{{cli}}` standing for the pinned `ultima-design`. */
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  /** The sha256 of every file the pinned scaffold writes, `{{name}}` standing for the project name in `package.json` and `index.html`. */
  scaffoldFiles: Record<string, string>;
  /** Written after the scaffold's own install, before any registry item, so the CLI resolves `@/`. */
  aliasFiles: RecipeFile[];
  /** Written once the registry items are installed. */
  files: RecipeFile[];
  /** Setup files the layout keeps elsewhere: moved from where the setup item installs them, only while they hold its pinned bytes. */
  moves: { from: string; to: string }[];
  /** Scaffold example files the preview replaces, removed only while they still hold the scaffold's bytes. */
  removes: string[];
  /** Generates the types the typecheck reads, before the checks run. */
  typegen?: string[];
  typecheck: string[];
  /** Build output that records the staging directory's absolute paths, removed before publishing so the first build in place starts clean. */
  discard: string[];
  preview: { file: string; dev: string; production: { script: string; url: string } };
  manualSteps: ManualStep[];
};

/** The recipe as the selected manager runs it, its variant folded in. */
export function forManager(recipe: Recipe, manager: Manager): Recipe {
  const { managers, ...rest } = recipe;
  const variant = managers?.[manager];
  if (!variant) return rest;
  const replaced = (file: RecipeFile) => variant.aliasFiles?.find(({ path }) => path === file.path) ?? file;
  return {
    ...rest,
    scaffold: { ...rest.scaffold, args: [...rest.scaffold.args, ...variant.args] },
    scaffoldFiles: { ...rest.scaffoldFiles, ...variant.scaffoldFiles },
    aliasFiles: rest.aliasFiles.map(replaced),
  };
}

/** `{{name}}` stands for the project name, and `{{pnpm}}` for the pnpm version a scaffold records in `packageManager`. */
export function normalizeScaffold(path: string, bytes: Buffer, name: string): Buffer {
  if (path !== 'package.json' && path !== 'index.html') return bytes;
  return Buffer.from(
    bytes
      .toString('utf8')
      .replaceAll(name, '{{name}}')
      .replace(/"packageManager": "pnpm@[^"]+"/, '"packageManager": "pnpm@{{pnpm}}"'),
  );
}

export function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

const VITE_PACKAGE = `{
  "name": "{{name}}",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "oxlint",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.2.8",
    "react-dom": "^19.2.8"
  },
  "devDependencies": {
    "@types/node": "^24.13.3",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.7",
    "@vitejs/plugin-react": "^6.1.1",
    "oxlint": "^1.81.0",
    "typescript": "~6.0.2",
    "vite": "^8.3.0"
  }
}
`;

const VITE_DEPENDENCIES = {
  '@base-ui/react': '1.8.0',
  '@stylexjs/stylex': '0.19.0',
  react: '19.3.0',
  'react-dom': '19.3.0',
};

const VITE_DEV_DEPENDENCIES = {
  '@stylexjs/unplugin': '0.19.0',
  '@types/node': '24.19.1',
  '@types/react': '19.3.0',
  '@types/react-dom': '19.3.0',
  '@vitejs/plugin-react': '6.1.2',
  oxlint: '1.87.0',
  typescript: '6.0.3',
  'ultima-design': '{{cli}}',
  unplugin: '2.3.11',
  vite: '8.3.4',
};

function pinned(before: string, dependencies: Record<string, string>, devDependencies: Record<string, string>): string {
  const json = JSON.parse(before);
  return `${JSON.stringify({ ...json, dependencies, devDependencies }, null, 2)}\n`;
}

const VITE_TSCONFIG = `{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
`;

const VITE_TSCONFIG_APP = `{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client"],
    "allowArbitraryExtensions": true,
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
`;

const VITE_CONFIG = `import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
`;

/** A layered reset and a token-painted root, the CSS entry both recipes write in place of the scaffold's. */
const ROOT_CSS = `@layer reset {
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  body {
    margin: 0;
  }
}

:root {
  background: var(--ult-color-surface);
  color: var(--ult-color-text);
  color-scheme: dark;
  font-family: var(--ult-font-sans);
}

@media (prefers-color-scheme: light) {
  :root {
    color-scheme: light;
  }
}
`;

export const VITE_PREVIEW = `import * as stylex from '@stylexjs/stylex';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { colorScheme } from '@/lib/themes';
import { color, font, space, text } from '@/lib/tokens.stylex';

const styles = stylex.create({
  page: {
    backgroundColor: color['--ult-color-surface'],
    color: color['--ult-color-text'],
    display: 'grid',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-8'],
    marginInline: 'auto',
    maxInlineSize: '40rem',
    paddingBlock: space['--ult-space-11'],
    paddingInline: space['--ult-space-6'],
  },
  heading: {
    fontSize: text['--ult-text-9'],
    fontWeight: font['--ult-font-weight-semibold'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  lead: {
    color: color['--ult-color-text-muted'],
    margin: 0,
  },
  body: {
    display: 'grid',
    gap: space['--ult-space-4'],
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-4'],
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBlockStart: space['--ult-space-6'],
  },
});

/** Ultima's starter screen, written by \`ultima-design init\`. It is yours: edit it or replace it. */
export default function App() {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <main {...stylex.props(styles.page, colorScheme.system)}>
      <h1 {...stylex.props(styles.heading)}>Ultima is ready</h1>
      <p {...stylex.props(styles.lead)}>
        Button, Card and Dialog are installed under src/components/ui. Edit src/App.tsx to start building.
      </p>
      <Card.Root>
        <Card.Header>
          <Card.Title render={<h2 />}>Setup check</Card.Title>
          <Card.Description>StyleX compiles these components and the semantic tokens paint them.</Card.Description>
        </Card.Header>
        <Card.Body style={styles.body}>
          <p aria-live="polite">{confirmed ? 'Setup confirmed.' : 'Not confirmed yet.'}</p>
        </Card.Body>
        <Card.Footer style={styles.actions}>
          <Button onClick={() => setConfirmed((value) => !value)}>{confirmed ? 'Undo' : 'Confirm setup'}</Button>
          <Dialog.Root>
            <Dialog.Trigger render={<Button variant="outline" />}>Open dialog</Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Backdrop />
              <Dialog.Viewport>
                <Dialog.Popup>
                  <Dialog.Title>Next steps</Dialog.Title>
                  <Dialog.Description>
                    Run ultima doctor and ultima check after each change, and choose a theme at https://ultima.systems/theme-studio.
                  </Dialog.Description>
                  <footer {...stylex.props(styles.footer)}>
                    <Dialog.Close render={<Button variant="ghost" />}>Close</Dialog.Close>
                  </footer>
                </Dialog.Popup>
              </Dialog.Viewport>
            </Dialog.Portal>
          </Dialog.Root>
        </Card.Footer>
      </Card.Root>
    </main>
  );
}
`;


function themeStep(entry: string): ManualStep {
  return {
    title: 'Theme',
    required: false,
    file: entry,
    edit: `Make a custom theme in https://ultima.systems/theme-studio, install it and import ultima-theme.css from ${entry}, as https://ultima.systems/install#theme-adoption describes. Until then the preview uses the Neutral base in the system color mode, dark when the system states no preference.`,
    verify: 'With the dev server running, check the page root, the Button and the open Dialog in dark and light mode.',
  };
}

function cspStep(entry: string): ManualStep {
  return {
    title: 'Strict CSP',
    required: false,
    file: entry,
    edit: "Pass your nonce to Base UI's `CSPProvider` at the app root.",
    verify: 'Load the production build under your Content-Security-Policy; the console reports no blocked style.',
  };
}

export const VITE: Recipe = {
  id: 'vite-react-ts',
  revision: 1,
  framework: 'vite',
  layout: 'src',
  title: 'Vite React TypeScript, src layout',
  scaffold: { package: 'create-vite', version: '9.2.1', args: ['--template', 'react-ts', '--no-interactive', '--no-immediate'] },
  shadcn: { package: 'shadcn', version: '4.21.4' },
  // create-vite, vite, @vitejs/plugin-react and oxlint take ^20.19.0 || >=22.12.0, and the CLI >=22.
  node: '22.12.0',
  setupItem: 'setup-vite',
  items: ['button', 'card', 'dialog'],
  css: 'src/index.css',
  dependencies: VITE_DEPENDENCIES,
  devDependencies: VITE_DEV_DEPENDENCIES,
  scaffoldFiles: {
    '.gitignore': 'fe718e7babb14f3cbad2d97f08889b9ce5215ed3fe0e43b2b8cfbfb3b9b844e8',
    '.oxlintrc.json': 'b4d344818a1e1bf43997e4744a9153c8eef770c98b58229cd86363dabb85ded4',
    'README.md': 'fa8aac78b8be1993010b57f41000a243ecba006f6731513fe4ec91e788bf2517',
    'index.html': 'ad57ee7912a94a145e62ffee8a38ce6770ddde062e678b3a9c9959cd01c316ad',
    'package.json': 'd2c9fdd68dec44e7a461158193920dc33868556d952de3a23f2264d2aab0cc51',
    'public/favicon.svg': '61bc9a161de58248288e6905425d7180f0624c2865007b97d763fdac12043a66',
    'public/icons.svg': 'b45fa506195cfcdef406ba9f0c77b36ddc1a7c224040926ec70abc2fdea7b93a',
    'src/App.css': '6e25a776d3e8102da5bacb3cb99f4a5fc662a2e01e6143140671a556d28c3d5c',
    'src/App.tsx': 'c7184fc9b1c36d7492093e1b5f5844c440bd3396deeace21b6699d3838f6ecb2',
    'src/assets/hero.png': '881ffbcaafc212e49addad08846a5b82761355fa20624253af3477ba33262c5c',
    'src/assets/react.svg': '35ef61ed53b323ae94a16a8ec659b3d0af3880698791133f23b084085ab1c2e5',
    'src/assets/vite.svg': '5be21acd42eb7b896e517f4e0f0f11eb5c5d9e54fbbcebe9453f033008fcca6f',
    'src/index.css': '535c25dd1f338486ab3678832fc698011c8b8d1fe4ffd3d0ef5e33181457cc9f',
    'src/main.tsx': '6e9e5807fcbd48b75a96db5cbef36c996262196be42e6d4760dc86babbe61ad2',
    'tsconfig.app.json': '8e5d12ba330e7d86409edec74b95451e0db22ee09b9426c94b5bf817571eddb0',
    'tsconfig.json': '770b4140bbb581e2dfd9ea9946ffc9c75a1d86ba7d2db5f77c83e37cbdf9d808',
    'tsconfig.node.json': 'd366cc0827139db39c61815f22491bbfda56c654354a42ad7795143d314e45e8',
    'vite.config.ts': 'e1eefd0ed1639c88d1213884ef760516884db9e168190e223fee6b063ad3e088',
  },
  aliasFiles: [
    { path: 'package.json', before: VITE_PACKAGE, after: pinned(VITE_PACKAGE, VITE_DEPENDENCIES, VITE_DEV_DEPENDENCIES) },
    {
      path: 'tsconfig.json',
      before: VITE_TSCONFIG,
      after: VITE_TSCONFIG.replace('  ]\n}', '  ],\n  "compilerOptions": {\n    "paths": { "@/*": ["./src/*"] }\n  }\n}'),
    },
    {
      path: 'tsconfig.app.json',
      before: VITE_TSCONFIG_APP,
      after: VITE_TSCONFIG_APP.replace('    "jsx": "react-jsx",\n', '    "jsx": "react-jsx",\n    "paths": { "@/*": ["./src/*"] },\n'),
    },
  ],
  files: [
    {
      path: 'vite.config.ts',
      before: VITE_CONFIG,
      after: VITE_CONFIG.replace("import { defineConfig } from 'vite'\n", "import { defineConfig } from 'vite'\nimport { ultimaStylex } from './ultima.vite.ts'\n").replace(
        'plugins: [react()]',
        'plugins: [ultimaStylex(), react()]',
      ),
    },
    { path: 'src/index.css', after: ROOT_CSS },
    { path: 'src/App.tsx', after: VITE_PREVIEW },
  ],
  moves: [],
  removes: ['src/App.css', 'src/assets/hero.png', 'src/assets/react.svg', 'src/assets/vite.svg', 'public/icons.svg'],
  typecheck: ['tsc', '-b'],
  discard: [],
  preview: { file: 'src/App.tsx', dev: 'http://localhost:5173/', production: { script: 'preview', url: 'http://localhost:4173/' } },
  manualSteps: [themeStep('src/main.tsx'), cspStep('src/main.tsx')],
};


const NEXT_PACKAGE = `{
  "name": "{{name}}",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "16.4.0",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "^5"
  }
}
`;

const NEXT_PNPM_PACKAGE = NEXT_PACKAGE.replace('  }\n}\n', '  },\n  "packageManager": "pnpm@{{pnpm}}"\n}\n');

const NEXT_DEPENDENCIES = {
  '@base-ui/react': '1.8.0',
  '@stylexjs/stylex': '0.19.0',
  next: '16.4.0',
  react: '19.3.0',
  'react-dom': '19.3.0',
};

const NEXT_DEV_DEPENDENCIES = {
  '@stylexjs/babel-plugin': '0.19.0',
  '@stylexjs/postcss-plugin': '0.19.0',
  '@types/node': '20.19.43',
  '@types/react': '19.3.0',
  '@types/react-dom': '19.3.0',
  typescript: '5.9.3',
  'ultima-design': '{{cli}}',
};

const NEXT_LAYOUT = `import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={\`\${geistSans.variable} \${geistMono.variable}\`}>
      <body>{children}</body>
    </html>
  );
}
`;

const nextPage = (root: string) => `import * as stylex from '@stylexjs/stylex';

import { colorScheme } from '@/lib/themes';
import { color, font, space, text } from '@/lib/tokens.stylex';

import { SetupCheck } from './setup-check';

const styles = stylex.create({
  page: {
    backgroundColor: color['--ult-color-surface'],
    color: color['--ult-color-text'],
    display: 'grid',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-8'],
    marginInline: 'auto',
    maxInlineSize: '40rem',
    paddingBlock: space['--ult-space-11'],
    paddingInline: space['--ult-space-6'],
  },
  heading: {
    fontSize: text['--ult-text-9'],
    fontWeight: font['--ult-font-weight-semibold'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  lead: {
    color: color['--ult-color-text-muted'],
    margin: 0,
  },
});

/** Ultima's starter screen, written by \`ultima-design init\`. The page renders on the server; setup-check.tsx is its client boundary. It is yours: edit it or replace it. */
export default function Home() {
  return (
    <main {...stylex.props(styles.page, colorScheme.system)}>
      <h1 {...stylex.props(styles.heading)}>Ultima is ready</h1>
      <p {...stylex.props(styles.lead)}>
        Button, Card and Dialog are installed under ${root}components/ui. Edit ${root}app/page.tsx to start building.
      </p>
      <SetupCheck />
    </main>
  );
}
`;

const NEXT_SETUP_CHECK = `'use client';

import * as stylex from '@stylexjs/stylex';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { space } from '@/lib/tokens.stylex';

const styles = stylex.create({
  body: {
    display: 'grid',
    gap: space['--ult-space-4'],
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-4'],
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBlockStart: space['--ult-space-6'],
  },
});

/** The preview's interactive part, a client component the server page renders. */
export function SetupCheck() {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title render={<h2 />}>Setup check</Card.Title>
        <Card.Description>StyleX compiles these components and the semantic tokens paint them.</Card.Description>
      </Card.Header>
      <Card.Body style={styles.body}>
        <p aria-live="polite">{confirmed ? 'Setup confirmed.' : 'Not confirmed yet.'}</p>
      </Card.Body>
      <Card.Footer style={styles.actions}>
        <Button onClick={() => setConfirmed((value) => !value)}>{confirmed ? 'Undo' : 'Confirm setup'}</Button>
        <Dialog.Root>
          <Dialog.Trigger render={<Button variant="outline" />}>Open dialog</Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop />
            <Dialog.Viewport>
              <Dialog.Popup>
                <Dialog.Title>Next steps</Dialog.Title>
                <Dialog.Description>
                  Run ultima doctor and ultima check after each change, and choose a theme at https://ultima.systems/theme-studio.
                </Dialog.Description>
                <footer {...stylex.props(styles.footer)}>
                  <Dialog.Close render={<Button variant="ghost" />}>Close</Dialog.Close>
                </footer>
              </Dialog.Popup>
            </Dialog.Viewport>
          </Dialog.Portal>
        </Dialog.Root>
      </Card.Footer>
    </Card.Root>
  );
}
`;

const NEXT_SCAFFOLD_SHARED = {
  '.gitignore': '207e265ff4901f9ad9f96d8ce08530e04f9fc600815472a66d0a446096d654cd',
  'README.md': '60b55ff7df79af72590f9524208e46642bc32bdc175cdad41349681c0e2f958f',
  'next-env.d.ts': '7b550dda9686c16f36a17bf9051d5dbf31e98555b30d114ac49fc49a1e712651',
  'next.config.ts': '548870afcf118af6d72de46f2a54291d88a1f8f9fbdb4c0a7acd951ab1cefbe1',
  'package.json': '875709e51f87898a438993e65fd0b5ff5eb53e343baaa64833cb8fd742ac538d',
  'public/file.svg': '2b67812c325c199a02536cdbeea0c593a72f707d323b72ee3e08dbab06753bd4',
  'public/globe.svg': 'b614b9bf183925957661ac851498fe1d8029fd43a62fbfed86f9e2624a57e7cf',
  'public/next.svg': '55995dfad6ecb4945a1e856ddca03c5e16aa5bf13fd21b4df6a74ae79357bcfc',
  'public/vercel.svg': 'f081337b2fee635b455b63275406a3e7f39d6a014e25ad90dab5a67e62a12ac4',
  'public/window.svg': '644768c4aaeb4767bce293344eeb0c125fb804a94d801440424072202d85e3a1',
};

const NEXT_APP_FILES = {
  'app/favicon.ico': 'c28fdd2a4f31e2dc64f653962286da5c82a4cdfc518b242d32812c624e9a19a4',
  'app/globals.css': 'e1c0289930d17ef10122ec7347f09b03f84e3d51dbbe982785f7316c00e49c08',
  'app/layout.tsx': '4e6acf1341f8d9c2bdef4dc9ad1226e2aeb2e68736d39ae96d3e583374b72624',
  'app/page.module.css': '165ea66bc56f27938f8b512f2a51ee859be738be78bebf37adb9ec29c52415b3',
  'app/page.tsx': '8b6f29326d0989b4f8ad8d5bfe990eaa6d0d71654c135639a13283cddcb552dc',
};

const NEXT_TSCONFIG = {
  root: 'be18523b23b78b6e1a876ddd107d330f0168bddf09d751b57e0b5edce69c66f3',
  src: '5c51df4c59f4510d8c7dadf07a5c32132228826a3b331da5e286207b4df7ef9c',
};

function nextRecipe(layout: Layout): Recipe {
  const root = layout === 'src' ? 'src/' : '';
  const app = `${root}app`;
  return {
    id: `next-app-router-ts-${layout}`,
    revision: 1,
    framework: 'next',
    layout,
    title: `Next.js App Router TypeScript, ${layout === 'src' ? 'src/app' : 'root app'} layout`,
    scaffold: {
      package: 'create-next-app',
      version: '16.4.0',
      // Every choice is explicit, so preferences create-next-app saved on this machine cannot change the scaffold.
      args: [
        '--ts',
        '--app',
        layout === 'src' ? '--src-dir' : '--no-src-dir',
        '--import-alias',
        '@/*',
        '--no-tailwind',
        '--no-react-compiler',
        '--cache-components',
        '--no-eslint',
        '--no-biome',
        '--no-rspack',
        '--no-empty',
        '--no-api',
        '--no-agents-md',
        '--no-agent-feedback',
        '--disable-git',
        '--skip-install',
        '--yes',
      ],
    },
    managers: {
      npm: { args: ['--use-npm'] },
      pnpm: {
        args: ['--use-pnpm'],
        scaffoldFiles: {
          'package.json': 'debc7e31730fb0d1e5cf146eb6dd6c7405b4696d984f1589fe4e2f8e6de97196',
          'pnpm-workspace.yaml': '6f096f437a72ffe947829a23631ecb9992533a8b307f4978e4ebfa27b2318be6',
        },
        aliasFiles: [{ path: 'package.json', before: NEXT_PNPM_PACKAGE, after: pinned(NEXT_PNPM_PACKAGE, NEXT_DEPENDENCIES, NEXT_DEV_DEPENDENCIES) }],
      },
    },
    shadcn: { package: 'shadcn', version: '4.21.4' },
    // create-next-app and next take >=20.9.0, shadcn >=20.18.1, and the CLI >=22.
    node: '22.0.0',
    setupItem: 'setup-next',
    items: ['button', 'card', 'dialog'],
    css: `${app}/globals.css`,
    dependencies: NEXT_DEPENDENCIES,
    devDependencies: NEXT_DEV_DEPENDENCIES,
    scaffoldFiles: {
      ...NEXT_SCAFFOLD_SHARED,
      ...Object.fromEntries(Object.entries(NEXT_APP_FILES).map(([path, hash]) => [`${root}${path}`, hash])),
      'tsconfig.json': NEXT_TSCONFIG[layout],
    },
    aliasFiles: [{ path: 'package.json', before: NEXT_PACKAGE, after: pinned(NEXT_PACKAGE, NEXT_DEPENDENCIES, NEXT_DEV_DEPENDENCIES) }],
    files: [
      { path: `${app}/layout.tsx`, before: NEXT_LAYOUT, after: NEXT_LAYOUT.replace('import "./globals.css";\n', 'import "./globals.css";\nimport "./ultima.css";\n') },
      { path: `${app}/globals.css`, after: ROOT_CSS },
      { path: `${app}/page.tsx`, after: nextPage(root) },
      { path: `${app}/setup-check.tsx`, after: NEXT_SETUP_CHECK },
    ],
    moves: layout === 'src' ? [{ from: 'app/ultima.css', to: 'src/app/ultima.css' }] : [],
    removes: [`${app}/page.module.css`, 'public/file.svg', 'public/globe.svg', 'public/next.svg', 'public/vercel.svg', 'public/window.svg'],
    typegen: ['next', 'typegen'],
    typecheck: ['tsc', '--noEmit'],
    discard: ['.next'],
    preview: { file: `${app}/page.tsx`, dev: 'http://localhost:3000/', production: { script: 'start', url: 'http://localhost:3000/' } },
    manualSteps: [themeStep(`${app}/layout.tsx`), cspStep(`${app}/layout.tsx`)],
  };
}

/** Every recipe `init` offers. The first recipe for a framework is its default layout. */
export const RECIPES: Recipe[] = [VITE, nextRecipe('root'), nextRecipe('src')];
