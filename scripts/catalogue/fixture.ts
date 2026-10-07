import type { OptimizerPolicy } from './browser.ts';
import { OUTPUTS } from './projections.ts';

export const descriptor = (kind: string, type: string, value: object) =>
  `import type { ${type} } from '../schema.ts';\n\nexport default ${JSON.stringify(value, null, 2)} satisfies ${type};\n`;

const react = (id: string, primaryExport: string, release: string, order: number, contract: string, group: string) =>
  descriptor('react', 'ReactDescriptor', {
    id,
    kind: 'react',
    title: primaryExport,
    description: `${primaryExport}, for the fixture.`,
    contract: `docs/spec/ultima.md#${contract}`,
    installDocs: `import { ${primaryExport} } from '@/components/ui/${id}';`,
    primaryExport,
    release,
    order,
    group,
  });

const componentFiles = (id: string, source: string) => ({
  [`packages/ui/src/${id}.tsx`]: source,
  [`packages/ui/src/__tests__/${id}.test.tsx`]: `test('${id}', () => {});\n`,
  [`apps/docs/src/content/components/${id}.mdx`]: `import Basic from '../../demos/${id}/basic';\n\n## Install\n`,
  [`apps/docs/src/demos/${id}/basic.tsx`]: `export default function Basic() { return null; }\n`,
});

const staleGeneratedProjections = {
  'packages/ui/src/index.ts': "export { Retired } from './retired';\n",
  'registry/items.config.ts': 'export const items = {};\n',
};

export function validFixture(): Record<string, string> {
  return {
    'docs/spec/ultima.md': [
      '# Ultima',
      '## Plain components',
      '## Compound components',
      '## The date set',
      '## Web components',
      '## Setup items',
      '## Tokens',
      '## The shared lib',
      '## The tokens CSS export',
      '#### Data Table',
      '```md',
      '## Not a heading',
      '```',
    ].join('\n'),
    'registry/metadata/schema.ts': 'export type ReactDescriptor = object;\n',
    'registry/metadata/releases.ts':
      "import type { Release } from './schema.ts';\n\nexport default [\n  { id: 'v0', label: 'The v0 set' },\n  { id: 'v0.1', label: 'The v0.1 set' },\n] satisfies Release[];\n",
    'registry/metadata/groups.ts':
      "import type { Group } from './schema.ts';\n\nexport default [\n  { id: 'forms', label: 'Forms' },\n  { id: 'navigation', label: 'Navigation' },\n] as const satisfies readonly Group[];\n",

    'registry/metadata/react/button.ts': react('button', 'Button', 'v0', 1, 'plain-components', 'forms'),
    ...componentFiles(
      'button',
      [
        "'use client';",
        "import { Button as BaseButton } from '@base-ui/react/button';",
        "import * as stylex from '@stylexjs/stylex';",
        "import type { ComponentProps } from 'react';",
        "import { space } from '@ultima/tokens/tokens.stylex';",
        "import type { PartProps } from '@ultima/ui/lib/component';",
        'type ButtonProps = PartProps<ComponentProps<typeof BaseButton>>;',
        'function ButtonImpl(props: ButtonProps) { return <BaseButton {...props} />; }',
        'export { ButtonImpl as Button, type ButtonProps };',
      ].join('\n'),
    ),

    'registry/metadata/react/sidebar.ts': react('sidebar', 'Sidebar', 'v0', 2, 'compound-components', 'navigation'),
    ...componentFiles(
      'sidebar',
      [
        "'use client';",
        "import { createContext, useContext } from 'react';",
        "import { Button } from '@ultima/ui/button';",
        "import { visuallyHidden } from '@ultima/ui/lib/visually-hidden';",
        'const Context = createContext(null);',
        'function Root() { return <Button />; }',
        'function useSidebar() { return useContext(Context); }',
        'const Sidebar = { Root };',
        'export type SidebarRootProps = object;',
        'export { Sidebar, useSidebar };',
      ].join('\n'),
    ),

    'registry/metadata/react/calendar.ts': react('calendar', 'Calendar', 'v0.1', 1, 'the-date-set', 'forms'),
    ...componentFiles(
      'calendar',
      [
        "'use client';",
        "import * as datePicker from '@zag-js/date-picker';",
        "import { normalizeProps, useMachine } from '@zag-js/react';",
        "import * as stylex from '@stylexjs/stylex';",
        'function Root() { return null; }',
        'const Calendar = { Root };',
        'export { Calendar };',
      ].join('\n'),
    ),

    'registry/metadata/react/input-otp.ts': react('input-otp', 'InputOTP', 'v0.1', 2, 'plain-components', 'forms'),
    ...componentFiles(
      'input-otp',
      [
        "'use client';",
        "import { OTPFieldPreview } from '@base-ui/react/otp-field';",
        'function Root() { return null; }',
        'const InputOTP = { Root };',
        "type InputOTPSize = 'sm' | 'md';",
        'export { InputOTP, type InputOTPSize };',
      ].join('\n'),
    ),

    ...staleGeneratedProjections,

    'registry/metadata/source-bundle/tokens.ts': descriptor('source-bundle', 'SourceBundleDescriptor', {
      id: 'tokens',
      kind: 'source-bundle',
      title: 'Ultima tokens',
      description: 'The tokens.',
      contract: 'docs/spec/ultima.md#tokens',
      installDocs: "import { space } from '@/lib/tokens.stylex';",
      inventory: 'tokens',
    }),
    'packages/tokens/src/tokens.stylex.ts': "import * as stylex from '@stylexjs/stylex';\nexport const space = stylex.defineVars({});\n",
    'packages/tokens/src/palette.ts': "import { space } from './tokens.stylex';\nexport const palette = space;\n",
    'packages/tokens/src/index.ts': "export * from './tokens.stylex';\n",
    'registry/metadata/source-bundle/lib.ts': descriptor('source-bundle', 'SourceBundleDescriptor', {
      id: 'lib',
      kind: 'source-bundle',
      title: 'Ultima component helpers',
      description: 'The helpers.',
      contract: 'docs/spec/ultima.md#the-shared-lib',
      installDocs: "import type { PartProps } from '@/lib/component';",
      inventory: 'lib',
    }),
    'packages/ui/src/lib/component.ts': "import type { StyleXStyles } from '@stylexjs/stylex';\nexport type PartProps<P> = P & { style?: StyleXStyles };\n",
    'packages/ui/src/lib/visually-hidden.ts': "import * as stylex from '@stylexjs/stylex';\nexport const visuallyHidden = stylex.create({});\n",

    'registry/metadata/artifact/tokens-css.ts': descriptor('artifact', 'ArtifactDescriptor', {
      id: 'tokens-css',
      kind: 'artifact',
      title: 'Ultima tokens as CSS',
      description: 'The generated token stylesheet.',
      contract: 'docs/spec/ultima.md#the-tokens-css-export',
      installDocs: "Import './ultima-tokens.css' once.",
      producer: 'tokens-build',
      output: 'packages/tokens/dist/tokens.css',
      fileType: 'registry:file',
      target: '~/ultima-tokens.css',
    }),

    'registry/metadata/element/ult-button.ts': descriptor('element', 'ElementDescriptor', {
      id: 'ult-button',
      kind: 'element',
      title: 'Button element',
      description: 'Ultima Button as a custom element.',
      contract: 'docs/spec/ultima.md#web-components',
      installDocs: '<script type="module" src="./ult-button.js"></script>',
      reactItem: 'button',
      order: 1,
      registryDependencies: ['tokens-css'],
      tags: ['ult-button', 'ult-button-icon'],
      attributes: [
        { names: ['variant'], on: 'ult-button', symbol: 'VARIANTS' },
        { names: ['aria-label', 'aria-labelledby'], on: 'ult-button', text: 'Names the button.' },
      ],
      example: '<ult-button variant="solid">Save</ult-button>',
    }),
    'packages/elements/src/ult-button.element.ts': [
      "import * as stylex from '@stylexjs/stylex';",
      "const VARIANTS = ['solid', 'outline'] as const;",
      'const LABELLED = 2;',
      'class UltButton extends HTMLElement {}',
      "if (!customElements.get('ult-button-icon')) customElements.define('ult-button-icon', class extends HTMLElement {});",
      "if (!customElements.get('ult-button')) customElements.define('ult-button', UltButton);",
    ].join('\n'),
    'packages/elements/src/__tests__/ult-button.test.ts': "test('ult-button', () => {});\n",

    'registry/metadata/setup/setup-vite.ts': descriptor('setup', 'SetupDescriptor', {
      id: 'setup-vite',
      kind: 'setup',
      title: 'Ultima setup for Vite',
      description: 'components.json and ultima.vite.ts.',
      contract: 'docs/spec/ultima.md#setup-items',
      files: [
        { path: 'components.json', type: 'registry:file', target: '~/components.json' },
        { path: 'config/ultima.vite.ts', type: 'registry:file', target: '~/config/ultima.vite.ts' },
      ],
      dependencies: ['@stylexjs/stylex'],
      devDependencies: ['@stylexjs/unplugin'],
      handSteps: [{ prose: 'Wrap resets in a layer.', assertion: { kind: 'layered-resets', entries: ['index.html'] } }],
      checks: [{ prose: 'A strict CSP needs a nonce.', unverifiable: 'Set at runtime.' }],
    }),
    'registry/static/setup-vite/components.json': '{}\n',
    'registry/static/setup-vite/config/ultima.vite.ts': 'export {};\n',

    'registry/metadata/recipe/data-table.ts': descriptor('recipe', 'RecipeDescriptor', {
      id: 'data-table',
      kind: 'recipe',
      title: 'Data Table',
      description: 'Button over TanStack Table.',
      contract: 'docs/spec/ultima.md#data-table',
      page: 'button',
      section: 'sorting',
      release: 'v0.1',
      demos: ['apps/docs/src/demos/button/sorting.tsx'],
    }),
    'apps/docs/src/content/components/button.mdx': [
      "import Basic from '../../demos/button/basic';",
      "import Sorting from '../../demos/button/sorting';",
      "import sortingSource from '../../demos/button/sorting?raw';",
      '',
      '## Install',
      '## Sorting',
    ].join('\n'),
    'apps/docs/src/demos/button/sorting.tsx': [
      "import { useReactTable } from '@tanstack/react-table';",
      "import { useState } from 'react';",
      "import { Button, Sidebar, type ButtonProps } from '@ultima/ui';",
      "import { space } from '@ultima/tokens/tokens.stylex';",
      "import { rows } from './rows';",
      'export default function Sorting() { return <Button />; }',
    ].join('\n'),
    'apps/docs/src/demos/button/rows.ts': "import { format } from 'd3-format';\nexport const rows = [format('.2f')(1)];\n",
  };
}

export const testPolicy: OptimizerPolicy = {
  ui: {
    add: [],
    exclude: [
      { specifier: 'react', reason: 'the React plugin prebundles it', source: 'packages/ui/vitest.config.ts' },
      { specifier: 'vitest', reason: 'Vitest serves it', source: 'packages/ui/vitest.config.ts' },
    ],
  },
  docs: {
    add: [{ specifier: 'react-dom/client', reason: 'the renderer imports it late', source: 'apps/docs/vitest.config.ts' }],
    exclude: [
      { specifier: 'react', reason: 'the React plugin prebundles it', source: 'apps/docs/vitest.config.ts' },
      { specifier: 'vitest', reason: 'Vitest serves it', source: 'apps/docs/vitest.config.ts' },
    ],
  },
};

/** The valid fixture with its generated projections absent and the package manifests the optimizer reads. */
export function diskFixture(): Record<string, string> {
  const files = validFixture();
  delete files[OUTPUTS.barrel];
  delete files[OUTPUTS.registry];
  return {
    ...files,
    'packages/ui/package.json': JSON.stringify({
      name: '@ultima/ui',
      exports: { '.': './src/index.ts', './lib/visually-hidden': './src/lib/visually-hidden.ts', './*': './src/*.tsx' },
      dependencies: { '@base-ui/react': '1', '@stylexjs/stylex': '1', '@zag-js/date-picker': '1', '@zag-js/react': '1' },
      devDependencies: { vitest: '1', 'vitest-browser-react': '1' },
    }),
    'packages/tokens/package.json': JSON.stringify({
      name: '@ultima/tokens',
      exports: { './tokens.stylex': './src/tokens.stylex.ts', './tokens.json': './dist/tokens.json' },
      dependencies: { '@stylexjs/stylex': '1' },
    }),
    'apps/docs/package.json': JSON.stringify({
      name: '@ultima/docs',
      dependencies: { '@tanstack/react-table': '1', 'd3-format': '1', 'react-dom': '1' },
      devDependencies: { vitest: '1' },
    }),
    'packages/ui/src/__tests__/setup.ts': "import { configure } from 'vitest-browser-react';\nconfigure();\n",
    'packages/ui/src/__tests__/calendar.test.tsx': [
      "import { test } from 'vitest';",
      "import { Calendar } from '../calendar';",
      "import { Sidebar } from '../sidebar';",
      "test('calendar', () => [Calendar, Sidebar]);",
    ].join('\n'),
    'apps/docs/src/__tests__/pages.test.tsx': [
      "import type { Row } from 'lodash';",
      "import { test } from 'vitest';",
      "import tokens from '@ultima/tokens/tokens.json';",
      "import { componentPages } from '../generated/component-pages';",
      "const sources = import.meta.glob('../../../../packages/elements/src/*.element.ts', { query: '?raw' });",
      "const demos = import.meta.glob('../demos/**/*.tsx', { eager: true });",
      'test("pages", () => [componentPages, sources, demos, tokens]);',
    ].join('\n'),
  };
}
