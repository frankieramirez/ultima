import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'select',
  kind: 'react',
  title: 'Select',
  description: 'A form control for choosing a predefined value from a popup list.',
  docsDescription: 'A selection control in three sizes with keyboard navigation and typeahead, on Base UI.',
  contract: 'docs/spec/ultima.md#the-v0-set',
  installDocs: 'import { Select } from \'@/components/ui/select\';\n\n<Select.Root>\n  <Select.Label>Fruit</Select.Label>\n  <Select.Trigger>\n    <Select.Value placeholder="Pick a fruit" />\n    <Select.Icon />\n  </Select.Trigger>\n  <Select.Portal>\n    <Select.Positioner>\n      <Select.Popup>\n        <Select.List>\n          <Select.Item value="apple">\n            <Select.ItemIndicator />\n            <Select.ItemText>Apple</Select.ItemText>\n          </Select.Item>\n        </Select.List>\n      </Select.Popup>\n    </Select.Positioner>\n  </Select.Portal>\n</Select.Root>',
  primaryExport: 'Select',
  release: 'v0',
  order: 12,
  group: 'forms',
  replaces: { elements: ['select'], roles: ['listbox'] },
} satisfies ReactDescriptor;
