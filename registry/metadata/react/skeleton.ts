import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'skeleton',
  kind: 'react',
  title: 'Skeleton',
  description: 'A sunken placeholder that pulses while its content loads.',
  contract: 'docs/spec/ultima.md#the-v01-set',
  installDocs: "import { Skeleton } from '@/components/ui/skeleton';\n\n<Skeleton />\n\nSize it through the style slot, and put aria-busy on the container it stands in for. The pulse stops under prefers-reduced-motion.",
  primaryExport: 'Skeleton',
  release: 'v0.1',
  order: 12,
} satisfies ReactDescriptor;
