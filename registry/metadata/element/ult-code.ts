import type { ElementDescriptor } from '../schema.ts';

export default {
  id: 'ult-code',
  kind: 'element',
  title: 'Code element',
  description: 'Ultima Code as a custom element, vendored for a host that cannot run React.',
  contract: 'docs/spec/ultima.md#web-components',
  installDocs: '<script type="module" src="./ult-code.js"></script>\n\n<ult-code>npx shadcn add @ultima/button</ult-code>\n<ult-code variant="block">pnpm install\npnpm dev</ult-code>\n\nPair it with the tokens stylesheet the tokens-css item installed: <link rel="stylesheet" href="./ultima-tokens.css">\nAxes are attributes carrying the React prop values verbatim: variant.\nThis file is a vendored artifact: a reinstall overwrites it and local edits are forfeit.',
  reactItem: 'code',
  order: 8,
  registryDependencies: ['tokens-css'],
  tags: ['ult-code'],
  attributes: [{ names: ['variant'], on: 'ult-code', symbol: 'VARIANTS' }],
  example: '<p>Run <ult-code>npx shadcn add @ultima/button</ult-code> to install.</p>\n<ult-code variant="block">pnpm install\npnpm dev</ult-code>',
} satisfies ElementDescriptor;
