import type { ElementDescriptor } from '../schema.ts';

export default {
  id: 'ult-tooltip',
  kind: 'element',
  title: 'Tooltip element',
  description: 'Ultima Tooltip as a family of custom elements, vendored for a host that cannot run React.',
  contract: 'docs/spec/ultima.md#web-components',
  installDocs: '<script type="module" src="./ult-tooltip.js"></script>\n\n<ult-tooltip>\n  <ult-tooltip-trigger><button type="button" aria-label="Copied to clipboard">Copy</button></ult-tooltip-trigger>\n  <ult-tooltip-positioner>\n    <ult-tooltip-popup>Copied to clipboard<ult-tooltip-arrow></ult-tooltip-arrow></ult-tooltip-popup>\n  </ult-tooltip-positioner>\n</ult-tooltip>\n\nPair it with the tokens stylesheet the tokens-css item installed: <link rel="stylesheet" href="./ultima-tokens.css">\nOne element per part: ult-tooltip, ult-tooltip-trigger, ult-tooltip-positioner, ult-tooltip-popup, ult-tooltip-arrow. The trigger wraps your own focusable element and the aria-label on it must match the tooltip text, because the popup is role="tooltip" and never the name. The open attribute pins the tooltip open; Tooltip declares no axes.\nThis file is a vendored artifact: a reinstall overwrites it and local edits are forfeit.',
  reactItem: 'tooltip',
  order: 9,
  registryDependencies: ['tokens-css'],
  tags: [
    'ult-tooltip',
    'ult-tooltip-trigger',
    'ult-tooltip-positioner',
    'ult-tooltip-popup',
    'ult-tooltip-arrow',
  ],
  attributes: [{ names: ['open'], on: 'ult-tooltip', text: 'Present or absent; forces the popup open.' }],
  example: '<ult-tooltip>\n  <ult-tooltip-trigger>\n    <ult-button variant="outline" aria-label="Copied to clipboard">Copy</ult-button>\n  </ult-tooltip-trigger>\n  <ult-tooltip-positioner>\n    <ult-tooltip-popup>Copied to clipboard<ult-tooltip-arrow></ult-tooltip-arrow></ult-tooltip-popup>\n  </ult-tooltip-positioner>\n</ult-tooltip>',
} satisfies ElementDescriptor;
