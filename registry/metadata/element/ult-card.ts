import type { ElementDescriptor } from '../schema.ts';

export default {
  id: 'ult-card',
  kind: 'element',
  title: 'Card element',
  description: 'Ultima Card as a custom element family, vendored for a host that cannot run React.',
  contract: 'docs/spec/ultima.md#web-components',
  installDocs: '<script type="module" src="./ult-card.js"></script>\n\n<ult-card>\n  <ult-card-header>\n    <ult-card-title>Latency</ult-card-title>\n    <ult-card-description>p95 over the last hour</ult-card-description>\n  </ult-card-header>\n  <ult-card-body>Body</ult-card-body>\n  <ult-card-footer>Footer</ult-card-footer>\n</ult-card>\n\nPair it with the tokens stylesheet the tokens-css item installed: <link rel="stylesheet" href="./ultima-tokens.css">\nAxes are attributes carrying the React prop values verbatim; Card declares none.\nThis file is a vendored artifact: a reinstall overwrites it and local edits are forfeit.',
  reactItem: 'card',
  order: 3,
  registryDependencies: ['tokens-css'],
  tags: [
    'ult-card',
    'ult-card-header',
    'ult-card-title',
    'ult-card-description',
    'ult-card-body',
    'ult-card-footer',
  ],
  attributes: [],
  example: '<ult-card>\n  <ult-card-header>\n    <ult-card-title>Contrast gate</ult-card-title>\n    <ult-card-description>WCAG 2.2 AA, checked in both color modes.</ult-card-description>\n  </ult-card-header>\n  <ult-card-body>Every required text, border, and focus pairing clears the gate.</ult-card-body>\n  <ult-card-footer>\n    <ult-button variant="outline">Open report</ult-button>\n  </ult-card-footer>\n</ult-card>',
} satisfies ElementDescriptor;
