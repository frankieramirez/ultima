import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Select } from '@ultima/ui';

const styles = stylex.create({
  row: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-5'],
  },
});

const items = [
  { label: 'Common', value: 'common' },
  { label: 'Rare', value: 'rare' },
  { label: 'Legendary', value: 'legendary' },
];

function Options() {
  return (
    <Select.Portal>
      <Select.Positioner>
        <Select.Popup>
          <Select.List>
            {items.map((item) => (
              <Select.Item key={item.value} value={item.value}>
                <Select.ItemIndicator />
                <Select.ItemText>{item.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.List>
        </Select.Popup>
      </Select.Positioner>
    </Select.Portal>
  );
}

export default function SelectStates() {
  return (
    <div {...stylex.props(styles.row)}>
      <Select.Root items={items}>
        <Select.Trigger aria-label="Invalid rarity" aria-invalid>
          <Select.Value placeholder="Invalid" />
          <Select.Icon />
        </Select.Trigger>
        <Options />
      </Select.Root>
      <Select.Root items={items} disabled defaultValue="rare">
        <Select.Trigger aria-label="Disabled rarity">
          <Select.Value />
          <Select.Icon />
        </Select.Trigger>
        <Options />
      </Select.Root>
    </div>
  );
}
