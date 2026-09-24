import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'dropdown-menu',
  kind: 'react',
  title: 'Dropdown Menu',
  description: 'A keyboard-navigable menu with items, submenus, and selection controls, on Base UI.',
  contract: 'docs/spec/ultima.md#the-v0-set',
  installDocs: "import { Button } from '@/components/ui/button';\nimport { DropdownMenu } from '@/components/ui/dropdown-menu';\n\n<DropdownMenu.Root>\n  <DropdownMenu.Trigger render={<Button />}>Actions</DropdownMenu.Trigger>\n  <DropdownMenu.Portal>\n    <DropdownMenu.Positioner>\n      <DropdownMenu.Popup>\n        <DropdownMenu.Item>Settings</DropdownMenu.Item>\n      </DropdownMenu.Popup>\n    </DropdownMenu.Positioner>\n  </DropdownMenu.Portal>\n</DropdownMenu.Root>",
  primaryExport: 'DropdownMenu',
  release: 'v0',
  order: 11,
} satisfies ReactDescriptor;
