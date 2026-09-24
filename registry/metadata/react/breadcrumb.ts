import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'breadcrumb',
  kind: 'react',
  title: 'Breadcrumb',
  description: 'A trail of links to the current page, with a swappable separator glyph.',
  contract: 'docs/spec/ultima.md#the-navigation-set',
  installDocs: 'import { Breadcrumb } from \'@/components/ui/breadcrumb\';\n\n<Breadcrumb.Root>\n  <Breadcrumb.List>\n    <Breadcrumb.Item>\n      <Breadcrumb.Link href="/">Home</Breadcrumb.Link>\n    </Breadcrumb.Item>\n    <Breadcrumb.Separator />\n    <Breadcrumb.Item>\n      <Breadcrumb.Link href="/settings" active>Settings</Breadcrumb.Link>\n    </Breadcrumb.Item>\n  </Breadcrumb.List>\n</Breadcrumb.Root>\n\nRoot carries aria-label="Breadcrumb" unless you name it yourself. A second trail on one page needs its own name.',
  primaryExport: 'Breadcrumb',
  release: 'v0.2',
  order: 1,
} satisfies ReactDescriptor;
