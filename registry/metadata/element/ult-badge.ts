import type { ElementDescriptor } from '../schema.ts';

export default {
  id: 'ult-badge',
  kind: 'element',
  title: 'Badge element',
  description: 'Ultima Badge as a custom element, vendored for a host that cannot run React.',
  contract: 'docs/spec/ultima.md#web-components',
  installDocs: '<script type="module" src="./ult-badge.js"></script>\n\n<ult-badge variant="subtle" tone="success">Passing</ult-badge>\n\nPair it with the tokens stylesheet the tokens-css item installed: <link rel="stylesheet" href="./ultima-tokens.css">\nAxes are attributes carrying the React prop values verbatim: variant and tone.\nThis file is a vendored artifact: a reinstall overwrites it and local edits are forfeit.',
  reactItem: 'badge',
  order: 2,
  registryDependencies: ['tokens-css'],
  tags: ['ult-badge'],
  attributes: [
    { names: ['variant'], on: 'ult-badge', symbol: 'VARIANTS' },
    {
      names: ['tone'],
      on: 'ult-badge',
      symbol: 'TONES',
    },
  ],
  example: '<ult-badge tone="neutral">Draft</ult-badge>\n<ult-badge tone="success">Passing</ult-badge>\n<ult-badge variant="solid" tone="danger">Failing</ult-badge>',
} satisfies ElementDescriptor;
