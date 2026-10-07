import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'separator',
  kind: 'react',
  title: 'Separator',
  description: 'A horizontal or vertical divider between sections of content.',
  contract: 'docs/spec/ultima.md#the-v0-set',
  installDocs: "import { Separator } from '@/components/ui/separator';\n\n<Separator />",
  primaryExport: 'Separator',
  release: 'v0',
  order: 18,
  group: 'layout',
} satisfies ReactDescriptor;
