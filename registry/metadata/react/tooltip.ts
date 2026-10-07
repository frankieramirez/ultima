import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'tooltip',
  kind: 'react',
  title: 'Tooltip',
  description: 'A short overlay on hover or focus, labelled through aria-label on its trigger.',
  contract: 'docs/spec/ultima.md#the-v0-set',
  installDocs: 'import { Tooltip } from \'@/components/ui/tooltip\';\n\n<Tooltip.Provider>\n  <Tooltip.Root>\n    <Tooltip.Trigger aria-label="Copied" render={<Button />}>Copy</Tooltip.Trigger>\n    <Tooltip.Portal>\n      <Tooltip.Positioner>\n        <Tooltip.Popup>Copied</Tooltip.Popup>\n      </Tooltip.Positioner>\n    </Tooltip.Portal>\n  </Tooltip.Root>\n</Tooltip.Provider>',
  primaryExport: 'Tooltip',
  release: 'v0',
  order: 9,
  group: 'overlays',
  elementless: ['Provider', 'Root', 'Portal'],
} satisfies ReactDescriptor;
