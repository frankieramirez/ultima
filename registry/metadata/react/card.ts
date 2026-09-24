import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'card',
  kind: 'react',
  title: 'Card',
  description: 'A surface with a header, body, and footer for grouping related content.',
  contract: 'docs/spec/ultima.md#the-v0-set',
  installDocs: "import { Card } from '@/components/ui/card';\n\n<Card.Root>\n  <Card.Header>\n    <Card.Title>Ultima</Card.Title>\n    <Card.Description>A design system.</Card.Description>\n  </Card.Header>\n  <Card.Body>Anything.</Card.Body>\n</Card.Root>",
  primaryExport: 'Card',
  release: 'v0',
  order: 3,
} satisfies ReactDescriptor;
