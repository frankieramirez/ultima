import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'menubar',
  kind: 'react',
  title: 'Menubar',
  description: 'A persistent bar of menu titles, holding your own Dropdown Menus and sized to its triggers.',
  contract: 'docs/spec/ultima.md#the-overlay-set',
  installDocs: 'import { Menubar } from \'@/components/ui/menubar\';\n\n<Menubar aria-label="Document">\n  <DropdownMenu.Root>\n    <DropdownMenu.Trigger render={<Button variant="ghost" size="sm" />}>File</DropdownMenu.Trigger>\n    <DropdownMenu.Portal>\n      <DropdownMenu.Positioner>\n        <DropdownMenu.Popup>\n          <DropdownMenu.Item>New</DropdownMenu.Item>\n        </DropdownMenu.Popup>\n      </DropdownMenu.Positioner>\n    </DropdownMenu.Portal>\n  </DropdownMenu.Root>\n</Menubar>\n\nThe menus are yours: install @ultima/dropdown-menu alongside this, because the bar declares no dependency on it and ships none of its paint. One component, no parts. The accessible name is required by the types, as aria-label or aria-labelledby. The bar is sized to its triggers, since a modal menu cuts its backdrop hole from that box; set an inline size through style for full-bleed chrome.',
  primaryExport: 'Menubar',
  release: 'v0.2',
  order: 8,
  group: 'overlays',
  replaces: { roles: ['menubar'] },
} satisfies ReactDescriptor;
