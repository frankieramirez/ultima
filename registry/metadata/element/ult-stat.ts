import type { ElementDescriptor } from '../schema.ts';

export default {
  id: 'ult-stat',
  kind: 'element',
  title: 'Stat element',
  description: 'Ultima Stat as a family of custom elements, vendored for a host that cannot run React.',
  contract: 'docs/spec/ultima.md#web-components',
  installDocs: '<script type="module" src="./ult-stat.js"></script>\n\n<ult-stat><ult-stat-label>Tokens</ult-stat-label><ult-stat-value>95</ult-stat-value></ult-stat>\n\nPair it with the tokens stylesheet the tokens-css item installed: <link rel="stylesheet" href="./ultima-tokens.css">\nThe parts are the family tags: ult-stat, ult-stat-label, ult-stat-value, and ult-stat-delta. tone and trend are attributes on ult-stat-delta carrying the React prop values verbatim.\nThis file is a vendored artifact: a reinstall overwrites it and local edits are forfeit.',
  reactItem: 'stat',
  order: 7,
  registryDependencies: ['tokens-css'],
  tags: ['ult-stat', 'ult-stat-label', 'ult-stat-value', 'ult-stat-delta'],
  attributes: [
    { names: ['tone'], on: 'ult-stat-delta', symbol: 'TONES' },
    { names: ['trend'], on: 'ult-stat-delta', symbol: 'TRENDS' },
  ],
  example: '<ult-stat>\n  <ult-stat-label>Pairings pass</ult-stat-label>\n  <ult-stat-value>49</ult-stat-value>\n  <ult-stat-delta tone="success" trend="up">+2 this week</ult-stat-delta>\n</ult-stat>',
} satisfies ElementDescriptor;
