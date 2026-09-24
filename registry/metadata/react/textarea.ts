import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'textarea',
  kind: 'react',
  title: 'Textarea',
  description: 'A multiline text field in three sizes, on Base UI.',
  contract: 'docs/spec/ultima.md#the-v01-set',
  installDocs: 'import { Textarea } from \'@/components/ui/textarea\';\n\n<label htmlFor="bio">Biography</label>\n<Textarea id="bio" size="md" />',
  primaryExport: 'Textarea',
  release: 'v0.1',
  order: 5,
  replaces: { elements: ['textarea'] },
} satisfies ReactDescriptor;
