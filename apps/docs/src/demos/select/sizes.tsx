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
  { label: 'Warrior', value: 'warrior' },
  { label: 'Mage', value: 'mage' },
  { label: 'Rogue', value: 'rogue' },
];

function SizeSelect({ size }: { size: 'sm' | 'md' | 'lg' }) {
  return (
    <Select.Root items={items}>
      <Select.Trigger aria-label={`${size} character class`} size={size}>
        <Select.Value placeholder={size.toUpperCase()} />
        <Select.Icon />
      </Select.Trigger>
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
    </Select.Root>
  );
}

export default function SelectSizes() {
  return (
    <div {...stylex.props(styles.row)}>
      <SizeSelect size="sm" />
      <SizeSelect size="md" />
      <SizeSelect size="lg" />
    </div>
  );
}
