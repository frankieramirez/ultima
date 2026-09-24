import type { ElementDescriptor } from '../schema.ts';

export default {
  id: 'ult-table',
  kind: 'element',
  title: 'Table element',
  description: 'Ultima Table as a family of custom elements, vendored for a host that cannot run React.',
  contract: 'docs/spec/ultima.md#web-components',
  installDocs: '<script type="module" src="./ult-table.js"></script>\n\n<ult-table-scroll aria-labelledby="latency-caption">\n  <ult-table>\n    <ult-table-caption id="latency-caption">Latency by region</ult-table-caption>\n    <ult-table-head>\n      <ult-table-row><ult-table-head-cell>Region</ult-table-head-cell></ult-table-row>\n    </ult-table-head>\n    <ult-table-body>\n      <ult-table-row><ult-table-cell>us-east-1</ult-table-cell></ult-table-row>\n    </ult-table-body>\n  </ult-table>\n</ult-table-scroll>\n\nPair it with the tokens stylesheet the tokens-css item installed: <link rel="stylesheet" href="./ultima-tokens.css">\nOne element per part: ult-table, ult-table-scroll, ult-table-head, ult-table-body, ult-table-row, ult-table-head-cell, ult-table-sort-button, ult-table-cell, ult-table-caption. sort is an attribute on ult-table-head-cell carrying the React prop values verbatim.\nThis file is a vendored artifact: a reinstall overwrites it and local edits are forfeit.',
  reactItem: 'table',
  order: 4,
  registryDependencies: ['tokens-css'],
  tags: [
    'ult-table',
    'ult-table-scroll',
    'ult-table-caption',
    'ult-table-head',
    'ult-table-body',
    'ult-table-row',
    'ult-table-head-cell',
    'ult-table-sort-button',
    'ult-table-cell',
  ],
  attributes: [
    {
      names: ['aria-label', 'aria-labelledby'],
      on: 'ult-table-scroll',
      text: 'Names the scroll region.',
    },
    {
      names: ['sort'],
      on: 'ult-table-head-cell',
      text: 'An `aria-sort` value, mirrored to `data-sort` on the cell.',
    },
    {
      names: ['scope', 'colspan', 'rowspan', 'headers', 'abbr'],
      on: 'ult-table-head-cell',
      text: 'Forwarded to the cell.',
    },
    {
      names: ['colspan', 'rowspan', 'headers'],
      on: 'ult-table-cell',
      text: 'Forwarded to the cell.',
    },
  ],
  example: '<ult-table-scroll aria-labelledby="latency">\n  <ult-table>\n    <ult-table-caption id="latency">Latency by region</ult-table-caption>\n    <ult-table-head>\n      <ult-table-row>\n        <ult-table-head-cell>Region</ult-table-head-cell>\n        <ult-table-head-cell sort="descending">p95</ult-table-head-cell>\n      </ult-table-row>\n    </ult-table-head>\n    <ult-table-body>\n      <ult-table-row>\n        <ult-table-cell>us-east-1</ult-table-cell>\n        <ult-table-cell>184ms</ult-table-cell>\n      </ult-table-row>\n      <ult-table-row>\n        <ult-table-cell>eu-west-1</ult-table-cell>\n        <ult-table-cell>240ms</ult-table-cell>\n      </ult-table-row>\n    </ult-table-body>\n  </ult-table>\n</ult-table-scroll>',
} satisfies ElementDescriptor;
