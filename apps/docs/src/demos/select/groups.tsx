import { Select } from '@ultima/ui';

const items = [
  { label: 'Oak', value: 'oak' },
  { label: 'Pine', value: 'pine' },
  { label: 'Iron', value: 'iron' },
  { label: 'Steel', value: 'steel' },
];

export default function SelectGroups() {
  return (
    <Select.Root items={items}>
      <Select.Trigger aria-label="Crafting material">
        <Select.Value placeholder="Choose a material" />
        <Select.Icon />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner>
          <Select.Popup>
            <Select.List>
              <Select.Group>
                <Select.GroupLabel>Wood</Select.GroupLabel>
                {items.slice(0, 2).map((item) => (
                  <Select.Item key={item.value} value={item.value}>
                    <Select.ItemIndicator />
                    <Select.ItemText>{item.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Group>
              <Select.Separator />
              <Select.Group>
                <Select.GroupLabel>Metal</Select.GroupLabel>
                {items.slice(2).map((item) => (
                  <Select.Item key={item.value} value={item.value}>
                    <Select.ItemIndicator />
                    <Select.ItemText>{item.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Group>
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
