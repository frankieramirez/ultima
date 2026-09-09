import { Select } from '@ultima/ui';

const items = Array.from({ length: 24 }, (_, index) => ({
  label: `Chapter ${index + 1}`,
  value: String(index + 1),
}));

export default function SelectLongList() {
  return (
    <Select.Root items={items}>
      <Select.Trigger aria-label="Chapter">
        <Select.Value placeholder="Jump to a chapter" />
        <Select.Icon />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner>
          <Select.Popup>
            <Select.ScrollUpArrow />
            <Select.List>
              {items.map((item) => (
                <Select.Item key={item.value} value={item.value}>
                  <Select.ItemIndicator />
                  <Select.ItemText>{item.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
            <Select.ScrollDownArrow />
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
