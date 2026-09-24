import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'meter',
  kind: 'react',
  title: 'Meter',
  description: 'A bounded measurement as a toned bar, on Base UI.',
  contract: 'docs/spec/ultima.md#the-v0-set',
  installDocs: 'import { Meter } from \'@/components/ui/meter\';\n\n<Meter.Root value={72} tone="warning">\n  <Meter.Label>Disk used</Meter.Label>\n  <Meter.Track>\n    <Meter.Indicator />\n  </Meter.Track>\n  <Meter.Value />\n</Meter.Root>',
  primaryExport: 'Meter',
  release: 'v0',
  order: 6,
  replaces: { elements: ['meter'], roles: ['meter'] },
} satisfies ReactDescriptor;
