import type { ElementDescriptor } from '../schema.ts';

export default {
  id: 'ult-stat',
  kind: 'element',
  title: 'Stat element',
  description: 'Ultima Stat as a family of custom elements, vendored for a host that cannot run React.',
  contract: 'docs/spec/ultima.md#web-components',
  installDocs: '<script type="module" src="./ult-stat.js"></script>\n\n<ult-stat><ult-stat-label>Tokens</ult-stat-label><ult-stat-value>95</ult-stat-value></ult-stat>\n\nPair it with the tokens stylesheet the tokens-css item installed: <link rel="stylesheet" href="./ultima-tokens.css">\nThe parts are the family tags: ult-stat, ult-stat-label, and ult-stat-value. Stat declares no axes.\nThis file is a vendored artifact: a reinstall overwrites it and local edits are forfeit.',
  reactItem: 'stat',
  order: 7,
  registryDependencies: ['tokens-css'],
  tags: ['ult-stat', 'ult-stat-label', 'ult-stat-value'],
  attributes: [],
  example: '<ult-stat>\n  <ult-stat-label>Pairings pass</ult-stat-label>\n  <ult-stat-value>49</ult-stat-value>\n</ult-stat>',
} satisfies ElementDescriptor;
