import type { SetupDescriptor } from '../schema.ts';

export default {
  id: 'setup-vite',
  kind: 'setup',
  title: 'Ultima setup for Vite',
  description: 'components.json and ultima.vite.ts, the StyleX plugin preconfigured. Universal item: installs without Tailwind and without an existing components.json.',
  contract: 'docs/spec/ultima.md#setup-items',
  files: [
    { path: 'components.json', type: 'registry:file', target: '~/components.json' },
    { path: 'ultima.vite.ts', type: 'registry:file', target: '~/ultima.vite.ts' },
  ],
  dependencies: ['@stylexjs/stylex'],
  devDependencies: ['@stylexjs/unplugin', 'unplugin'],
  handSteps: [
    {
      prose: 'Add `"paths": { "@/*": ["./src/*"] }` to tsconfig.json and tsconfig.app.json. Without it the CLI writes files into a literal ./@/ directory.',
      spec: 'Vite.',
      assertion: { kind: 'alias-resolves', tsconfigs: ['tsconfig.json', 'tsconfig.app.json'] },
    },
    {
      prose: "In vite.config.ts, `import { ultimaStylex } from './ultima.vite.ts'` and put `ultimaStylex()` in plugins, before the React plugin.",
      spec: 'Vite.',
      assertion: { kind: 'plugin-first', plugin: 'ultimaStylex', from: './ultima.vite' },
    },
    {
      prose: 'Wrap any global CSS reset in an @layer, or it beats every component style.',
      spec: 'Both.',
      assertion: { kind: 'layered-resets', entries: ['index.html', 'src/main.*'] },
    },
    {
      prose: "A strict CSP needs a nonce: pass it to Base UI's `CSPProvider` at your app root.",
      spec: 'A strict CSP needs a nonce.',
      unverifiable: 'The headers are set at runtime or by the host.',
    },
  ],
  checks: [
    {
      prose: 'ultima.vite.ts sits at the project root.',
      assertion: { kind: 'file-present', path: 'ultima.vite.ts' },
    },
    {
      prose: "The setup item's dependencies are declared in package.json.",
      assertion: { kind: 'config-references', file: 'package.json' },
    },
    {
      prose: '`@stylexjs/stylex` and `@stylexjs/unplugin` resolve to the same supported version.',
      assertion: { kind: 'version-in-range', packages: ['@stylexjs/stylex', '@stylexjs/unplugin'] },
    },
    {
      prose: '`@base-ui/react`, once installed, resolves to a supported version.',
      assertion: { kind: 'version-in-range', packages: ['@base-ui/react'] },
    },
  ],
} satisfies SetupDescriptor;
