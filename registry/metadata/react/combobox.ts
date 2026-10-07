import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'combobox',
  kind: 'react',
  title: 'Combobox',
  description: 'A filterable input whose value is restricted to the item set, on Base UI.',
  contract: 'docs/spec/ultima.md#the-v01-set',
  installDocs: 'import { Combobox } from \'@/components/ui/combobox\';\n\n<Combobox.Root items={[\'Apple\', \'Banana\']}>\n  <Combobox.InputGroup>\n    <Combobox.Input placeholder="Search fruit" />\n    <Combobox.Clear />\n    <Combobox.Trigger>\n      <Combobox.Icon />\n    </Combobox.Trigger>\n  </Combobox.InputGroup>\n  <Combobox.Portal>\n    <Combobox.Positioner>\n      <Combobox.Popup>\n        <Combobox.Empty>No fruit matches.</Combobox.Empty>\n        <Combobox.List>\n          {(item) => (\n            <Combobox.Item key={item} value={item}>\n              <Combobox.ItemIndicator />\n              {item}\n            </Combobox.Item>\n          )}\n        </Combobox.List>\n      </Combobox.Popup>\n    </Combobox.Positioner>\n  </Combobox.Portal>\n</Combobox.Root>',
  primaryExport: 'Combobox',
  release: 'v0.1',
  order: 6,
  group: 'forms',
  replaces: { roles: ['combobox'] },
  elementless: ['Root', 'Value', 'Portal', 'Collection'],
} satisfies ReactDescriptor;
