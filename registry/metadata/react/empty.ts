import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'empty',
  kind: 'react',
  title: 'Empty',
  description: 'A centered placeholder for a collection with nothing in it.',
  contract: 'docs/spec/ultima.md#the-v01-set',
  installDocs: "import { Button } from '@/components/ui/button';\nimport { Empty } from '@/components/ui/empty';\n\n<Empty.Root>\n  <Empty.Title>No reports yet</Empty.Title>\n  <Empty.Description>Run an audit to see its findings here.</Empty.Description>\n  <Button>Run an audit</Button>\n</Empty.Root>\n\nThe action is children, a Button, not a part.",
  primaryExport: 'Empty',
  release: 'v0.1',
  order: 14,
  group: 'feedback',
} satisfies ReactDescriptor;
