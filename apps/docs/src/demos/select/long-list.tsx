import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Select } from '@ultima/ui';

const styles = stylex.create({
  popup: {
    maxHeight: `calc(${space['--ult-space-12']} * 5)`,
  },
});

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
          <Select.Popup style={styles.popup}>
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
