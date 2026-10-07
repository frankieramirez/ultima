import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'stat',
  kind: 'react',
  title: 'Stat',
  description: 'A single number with its label, for dashboards and summaries.',
  contract: 'docs/spec/ultima.md#the-v0-set',
  installDocs: "import { Stat } from '@/components/ui/stat';\n\n<Stat.Root>\n  <Stat.Label>Tokens</Stat.Label>\n  <Stat.Value>95</Stat.Value>\n</Stat.Root>",
  primaryExport: 'Stat',
  release: 'v0',
  order: 7,
  group: 'data-display',
} satisfies ReactDescriptor;
