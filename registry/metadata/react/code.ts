import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'code',
  kind: 'react',
  title: 'Code',
  description: 'Monospaced code, inline in a sentence or as a block.',
  contract: 'docs/spec/ultima.md#the-v0-set',
  installDocs: 'import { Code } from \'@/components/ui/code\';\n\n<Code>npx shadcn add @ultima/button</Code>\n<Code variant="block">{source}</Code>',
  primaryExport: 'Code',
  release: 'v0',
  order: 8,
} satisfies ReactDescriptor;
