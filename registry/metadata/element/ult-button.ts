import type { ElementDescriptor } from '../schema.ts';

export default {
  id: 'ult-button',
  kind: 'element',
  title: 'Button element',
  description: 'Ultima Button as a custom element, vendored for a host that cannot run React.',
  contract: 'docs/spec/ultima.md#web-components',
  installDocs: '<script type="module" src="./ult-button.js"></script>\n\n<ult-button variant="solid" size="md" tone="accent">Save</ult-button>\n\nPair it with the tokens stylesheet the tokens-css item installed: <link rel="stylesheet" href="./ultima-tokens.css">\nAxes are attributes carrying the React prop values verbatim: variant, size, tone, and disabled.\nThis file is a vendored artifact: a reinstall overwrites it and local edits are forfeit.',
  reactItem: 'button',
  order: 1,
  registryDependencies: ['tokens-css'],
  tags: ['ult-button'],
  attributes: [
    { names: ['variant'], on: 'ult-button', symbol: 'VARIANTS' },
    { names: ['size'], on: 'ult-button', symbol: 'SIZES' },
    { names: ['tone'], on: 'ult-button', symbol: 'TONES' },
    { names: ['disabled'], on: 'ult-button', text: 'Present or absent.' },
  ],
  example: '<ult-button variant="solid" tone="accent">Save</ult-button>\n<ult-button variant="outline">Cancel</ult-button>\n<ult-button variant="ghost" size="sm">Dismiss</ult-button>\n<ult-button tone="danger" disabled>Delete</ult-button>',
} satisfies ElementDescriptor;
