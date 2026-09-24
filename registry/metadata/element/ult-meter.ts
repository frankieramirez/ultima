import type { ElementDescriptor } from '../schema.ts';

export default {
  id: 'ult-meter',
  kind: 'element',
  title: 'Meter element',
  description: 'Ultima Meter as custom elements, vendored for a host that cannot run React.',
  contract: 'docs/spec/ultima.md#web-components',
  installDocs: '<script type="module" src="./ult-meter.js"></script>\n\n<ult-meter value="72" tone="warning">\n  <ult-meter-label>Disk used</ult-meter-label>\n  <ult-meter-track>\n    <ult-meter-indicator></ult-meter-indicator>\n  </ult-meter-track>\n  <ult-meter-value></ult-meter-value>\n</ult-meter>\n\nPair it with the tokens stylesheet the tokens-css item installed: <link rel="stylesheet" href="./ultima-tokens.css">\nAxes are attributes carrying the React prop values verbatim: tone sits on ult-meter and a part-level tone on ult-meter-indicator or ult-meter-value wins; value, min, and max carry the reading.\nThis file is a vendored artifact: a reinstall overwrites it and local edits are forfeit.',
  reactItem: 'meter',
  order: 6,
  registryDependencies: ['tokens-css'],
  tags: ['ult-meter', 'ult-meter-label', 'ult-meter-track', 'ult-meter-indicator', 'ult-meter-value'],
  attributes: [
    {
      names: ['value', 'min', 'max'],
      on: 'ult-meter',
      text: 'Numbers; `min` defaults to 0 and `max` to 100.',
    },
    { names: ['tone'], on: 'ult-meter', symbol: 'TONES' },
    {
      names: ['aria-label', 'aria-labelledby', 'aria-describedby', 'aria-valuetext'],
      on: 'ult-meter',
      text: 'Forwarded to the meter.',
    },
  ],
  example: '<ult-meter value="70" tone="success" style="width: 16rem">\n  <ult-meter-label>Storage used</ult-meter-label>\n  <ult-meter-track><ult-meter-indicator></ult-meter-indicator></ult-meter-track>\n  <ult-meter-value></ult-meter-value>\n</ult-meter>',
} satisfies ElementDescriptor;
