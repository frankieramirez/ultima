import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'collapsible',
  kind: 'react',
  title: 'Collapsible',
  description: 'A disclosure that animates its panel open and closed, on Base UI.',
  contract: 'docs/spec/ultima.md#the-v0-set',
  installDocs: 'import { Button } from \'@/components/ui/button\';\nimport { Collapsible } from \'@/components/ui/collapsible\';\n\n<Collapsible.Root>\n  <Collapsible.Trigger render={<Button variant="ghost" />}>Details</Collapsible.Trigger>\n  <Collapsible.Panel>Anything.</Collapsible.Panel>\n</Collapsible.Root>',
  primaryExport: 'Collapsible',
  release: 'v0',
  order: 16,
  group: 'data-display',
  replaces: { elements: ['details', 'summary'] },
} satisfies ReactDescriptor;
