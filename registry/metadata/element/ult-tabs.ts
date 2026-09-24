import type { ElementDescriptor } from '../schema.ts';

export default {
  id: 'ult-tabs',
  kind: 'element',
  title: 'Tabs element',
  description: 'Ultima Tabs as a family of custom elements, vendored for a host that cannot run React.',
  contract: 'docs/spec/ultima.md#web-components',
  installDocs: '<script type="module" src="./ult-tabs.js"></script>\n\n<ult-tabs value="tokens">\n  <ult-tabs-list aria-label="Docs sections">\n    <ult-tabs-tab value="tokens">Tokens</ult-tabs-tab>\n    <ult-tabs-tab value="themes">Themes</ult-tabs-tab>\n    <ult-tabs-indicator></ult-tabs-indicator>\n  </ult-tabs-list>\n  <ult-tabs-panel value="tokens">Anything.</ult-tabs-panel>\n  <ult-tabs-panel value="themes">More.</ult-tabs-panel>\n</ult-tabs>\n\nPair it with the tokens stylesheet the tokens-css item installed: <link rel="stylesheet" href="./ultima-tokens.css">\nThe parts are the family tags: ult-tabs, ult-tabs-list, ult-tabs-tab, ult-tabs-panel, and ult-tabs-indicator. Axes are attributes carrying the React prop values verbatim: variant on ult-tabs (underline or segmented), value and disabled on ult-tabs-tab, value on ult-tabs-panel, and orientation and value on ult-tabs. Selection defaults to manual activation; set activate-on-focus on ult-tabs-list to select on arrow.\nThis file is a vendored artifact: a reinstall overwrites it and local edits are forfeit.',
  reactItem: 'tabs',
  order: 5,
  registryDependencies: ['tokens-css'],
  tags: ['ult-tabs', 'ult-tabs-list', 'ult-tabs-tab', 'ult-tabs-panel', 'ult-tabs-indicator'],
  attributes: [
    { names: ['variant'], on: 'ult-tabs', symbol: 'VARIANTS' },
    {
      names: ['value'],
      on: 'ult-tabs',
      text: 'The selected tab, matching a tab and panel `value`.',
    },
    { names: ['orientation'], on: 'ult-tabs', symbol: 'ORIENTATIONS' },
    { names: ['dir'], on: 'ult-tabs', symbol: 'DIRECTIONS' },
    { names: ['aria-label', 'aria-labelledby'], on: 'ult-tabs-list', text: 'Names the tab list.' },
    { names: ['activate-on-focus', 'loop-focus'], on: 'ult-tabs-list', text: 'Present or absent.' },
    { names: ['value'], on: 'ult-tabs-tab', text: 'Pairs the tab with its panel.' },
    { names: ['disabled'], on: 'ult-tabs-tab', text: 'Present or absent.' },
    { names: ['value'], on: 'ult-tabs-panel', text: 'Pairs the panel with its tab.' },
  ],
  example: '<ult-tabs value="overview">\n  <ult-tabs-list aria-label="Report views">\n    <ult-tabs-tab value="overview">Overview</ult-tabs-tab>\n    <ult-tabs-tab value="findings">Findings</ult-tabs-tab>\n    <ult-tabs-indicator></ult-tabs-indicator>\n  </ult-tabs-list>\n  <ult-tabs-panel value="overview">Overview of the latest audit.</ult-tabs-panel>\n  <ult-tabs-panel value="findings">Findings from the latest audit.</ult-tabs-panel>\n</ult-tabs>',
} satisfies ElementDescriptor;
