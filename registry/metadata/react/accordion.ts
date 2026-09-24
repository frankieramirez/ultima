import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'accordion',
  kind: 'react',
  title: 'Accordion',
  description: 'Disclosure sections under one shared value, on Base UI, with the heading level left to you.',
  contract: 'docs/spec/ultima.md#the-toggle-accordion-avatar-and-scroll-area-set',
  installDocs: 'import { Accordion } from \'@/components/ui/accordion\';\n\n<Accordion.Root>\n  <Accordion.Item value="a">\n    <Accordion.Header>\n      <Accordion.Trigger>Details</Accordion.Trigger>\n    </Accordion.Header>\n    <Accordion.Panel>\n      <div style={{ padding: \'1rem\' }}>Anything.</div>\n    </Accordion.Panel>\n  </Accordion.Item>\n</Accordion.Root>\n\nThe heading level is yours: Header renders an h3 by default, change it through render. Do not pass a Button through render on Trigger; it is the styled control and paints its own full-measure row. The panel\'s content padding goes on a wrapper inside the panel, never on the panel itself.',
  primaryExport: 'Accordion',
  release: 'v0.2',
  order: 9,
} satisfies ReactDescriptor;
