// The recipes `init` follows for a new project: docs/spec/consumer-setup.md, Supported layouts and compatibility.
// A recipe is data. Each subprocess `init` runs is built from these fields as structured arguments, never a shell string,
// and every version is exact: the release tests this combination and no other.
import { createHash } from 'node:crypto';

export type Manager = 'npm' | 'pnpm';
export const MANAGERS: Manager[] = ['npm', 'pnpm'];

/** A file the recipe writes. `before` is the pinned scaffold's text, so a plan can show the diff; a file without it replaces a scaffold example whole. */
export type RecipeFile = { path: string; before?: string; after: string };

export type Recipe = {
  id: string;
  revision: number;
  framework: 'vite';
  layout: 'src';
  title: string;
  scaffold: { package: string; version: string; args: string[] };
  shadcn: { package: string; version: string };
  setupItem: string;
  items: string[];
  /** Exact versions, `{{cli}}` standing for the pinned `ultima-design`. */
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  /** The sha256 of every file the pinned scaffold writes, `{{name}}` standing for the project name in `package.json` and `index.html`. */
  scaffoldFiles: Record<string, string>;
  /** Written after the scaffold's own install, before any registry item, so the CLI resolves `@/`. */
  aliasFiles: RecipeFile[];
  /** Written once the registry items are installed. */
  files: RecipeFile[];
  /** Scaffold example files the preview replaces, removed only while they still hold the scaffold's bytes. */
  removes: string[];
  previewUrl: string;
  manualSteps: string[];
};

export function normalizeScaffold(path: string, bytes: Buffer, name: string): Buffer {
  if (path !== 'package.json' && path !== 'index.html') return bytes;
  return Buffer.from(bytes.toString('utf8').replaceAll(name, '{{name}}'));
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

function pinned(before: string): string {
  const json = JSON.parse(before);
  return `${JSON.stringify({ ...json, dependencies: VITE_DEPENDENCIES, devDependencies: VITE_DEV_DEPENDENCIES }, null, 2)}\n`;
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

const VITE_INDEX_CSS = `@layer reset {
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

const VITE_PREVIEW = `import * as stylex from '@stylexjs/stylex';
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

export const VITE: Recipe = {
  id: 'vite-react-ts',
  revision: 1,
  framework: 'vite',
  layout: 'src',
  title: 'Vite React TypeScript, src layout',
  scaffold: { package: 'create-vite', version: '9.2.1', args: ['--template', 'react-ts', '--no-interactive', '--no-immediate'] },
  shadcn: { package: 'shadcn', version: '4.21.4' },
  setupItem: 'setup-vite',
  items: ['button', 'card', 'dialog'],
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
    { path: 'package.json', before: VITE_PACKAGE, after: pinned(VITE_PACKAGE) },
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
    { path: 'src/index.css', after: VITE_INDEX_CSS },
    { path: 'src/App.tsx', after: VITE_PREVIEW },
  ],
  removes: ['src/App.css', 'src/assets/hero.png', 'src/assets/react.svg', 'src/assets/vite.svg', 'public/icons.svg'],
  previewUrl: 'http://localhost:5173/',
  manualSteps: [
    'Theme: choose a custom theme in https://ultima.systems/theme-studio and install it as https://ultima.systems/install#theme-adoption describes. Until then the preview uses the Neutral base in the system color mode, dark when the system states no preference.',
    "Strict CSP: pass the nonce to Base UI's `CSPProvider` at the app root in src/main.tsx.",
  ],
};

export const RECIPES: Record<string, Recipe> = { vite: VITE };
