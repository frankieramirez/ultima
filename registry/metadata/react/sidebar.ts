import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'sidebar',
  kind: 'react',
  title: 'Sidebar',
  description: 'A collapsible navigation panel with groups, nested lists, and an active-page indication.',
  contract: 'docs/spec/ultima.md#the-v0-set',
  installDocs: 'import { Button } from \'@/components/ui/button\';\nimport { Sidebar, useSidebar } from \'@/components/ui/sidebar\';\n\n<Sidebar.Root>\n  <Sidebar.Trigger render={<Button variant="ghost" aria-label="Toggle navigation" />} />\n  <Sidebar.Panel aria-label="Main">\n    <Sidebar.Group>\n      <Sidebar.GroupLabel>Reference</Sidebar.GroupLabel>\n      <Sidebar.List>\n        <Sidebar.Item>\n          <Sidebar.Link href="/tokens" active>Tokens</Sidebar.Link>\n        </Sidebar.Item>\n      </Sidebar.List>\n    </Sidebar.Group>\n  </Sidebar.Panel>\n</Sidebar.Root>',
  primaryExport: 'Sidebar',
  release: 'v0',
  order: 15,
  group: 'navigation',
} satisfies ReactDescriptor;
