import type { SetupDescriptor } from '../schema.ts';

export default {
  id: 'setup-next',
  kind: 'setup',
  title: 'Ultima setup for Next.js App Router',
  description: 'components.json, babel.config.js, postcss.config.js, and the @stylex; stylesheet. Universal item: installs without Tailwind and without an existing components.json.',
  contract: 'docs/spec/ultima.md#setup-items',
  files: [
    { path: 'app/ultima.css', type: 'registry:file', target: '~/app/ultima.css' },
    { path: 'babel.config.js', type: 'registry:file', target: '~/babel.config.js' },
    { path: 'components.json', type: 'registry:file', target: '~/components.json' },
    { path: 'postcss.config.js', type: 'registry:file', target: '~/postcss.config.js' },
  ],
  dependencies: ['@stylexjs/stylex'],
  devDependencies: ['@stylexjs/babel-plugin', '@stylexjs/postcss-plugin', 'typescript'],
  handSteps: [
    {
      prose: "Import './ultima.css' from app/layout.tsx. For src/app, move app/ultima.css into src/app/ first and import it from src/app/layout.tsx. The compiler reads aliases from tsconfig.json.",
      spec: 'Next.js.',
      assertion: {
        kind: 'import-present',
        importers: ['app/layout.tsx', 'src/app/layout.tsx'],
        specifier: './ultima.css',
      },
    },
    {
      prose: 'Wrap any global CSS reset in an @layer. create-next-app ships `* { padding: 0 }`, which beats every component style.',
      spec: 'Both.',
      assertion: { kind: 'layered-resets', entries: ['app/layout.tsx', 'src/app/layout.tsx'] },
    },
    {
      prose: 'Before UI edits, read project design guidance and trace the active local theme; preserve an existing brand. Choose a custom theme in https://ultima.systems/theme-studio when authorized. Follow https://ultima.systems/llms.txt#discover-and-maintain-the-product-theme and the install walkthrough at https://ultima.systems/install#theme-adoption.',
      unverifiable: 'Brand intent and the association between local documents, drafts and active themes require project evidence and review.',
    },
    {
      prose: 'For an exported root theme, install the Studio registry item, keep ultima-theme.json and review DESIGN.md before replacement. After ./ultima.css, import ../ultima-theme.css from app/layout.tsx, or ../../ultima-theme.css from src/app/layout.tsx. Inspect the production cascade so it follows StyleX. Run npx ultima-design doctor and npx ultima-design check, then check the root, a control and an open popup in dark, light and system mode, including reduced motion and loaded fonts.',
      unverifiable: 'Ordinary doctor checks setup, not the production theme cascade, rendered values, fonts or portal inheritance.',
    },
    {
      prose: "A strict CSP needs a nonce: pass it to Base UI's `CSPProvider` at your app root.",
      spec: 'A strict CSP needs a nonce.',
      unverifiable: 'The headers are set at runtime or by the host.',
    },
  ],
  checks: [
    {
      prose: 'babel.config.js runs the StyleX Babel plugin.',
      assertion: { kind: 'config-references', file: 'babel.config.js', package: '@stylexjs/babel-plugin' },
    },
    {
      prose: 'postcss.config.js runs the StyleX PostCSS plugin.',
      assertion: { kind: 'config-references', file: 'postcss.config.js', package: '@stylexjs/postcss-plugin' },
    },
    {
      prose: 'The `@/` aliases resolve through tsconfig.json.',
      assertion: { kind: 'alias-resolves', tsconfigs: ['tsconfig.json'] },
    },
    {
      prose: "The setup item's dependencies are declared in package.json.",
      assertion: { kind: 'config-references', file: 'package.json' },
    },
    {
      prose: '`@stylexjs/stylex` and `@stylexjs/babel-plugin` resolve to the same supported version.',
      assertion: { kind: 'version-in-range', packages: ['@stylexjs/stylex', '@stylexjs/babel-plugin'] },
    },
    {
      prose: '`@base-ui/react`, once installed, resolves to a supported version.',
      assertion: { kind: 'version-in-range', packages: ['@base-ui/react'] },
    },
  ],
} satisfies SetupDescriptor;
