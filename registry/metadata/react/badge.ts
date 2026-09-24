import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'badge',
  kind: 'react',
  title: 'Badge',
  description: 'A small static label in two variants and six tones.',
  contract: 'docs/spec/ultima.md#the-v0-set',
  installDocs: 'import { Badge } from \'@/components/ui/badge\';\n\n<Badge variant="subtle" tone="success">Passing</Badge>',
  primaryExport: 'Badge',
  release: 'v0',
  order: 2,
} satisfies ReactDescriptor;
