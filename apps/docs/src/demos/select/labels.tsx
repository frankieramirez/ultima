import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Select } from '@ultima/ui';

const styles = stylex.create({
  fields: {
    alignItems: 'flex-start',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-7'],
  },
  field: {
    display: 'grid',
    gap: space['--ult-space-3'],
  },
});

const items = [
  { label: 'Mithril', value: 'mithril' },
  { label: 'Arcane', value: 'arcane' },
  { label: 'Ember', value: 'ember' },
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

export default function SelectLabels() {
  return (
    <div {...stylex.props(styles.fields)}>
      <Select.Root items={items}>
        <div {...stylex.props(styles.field)}>
          <Select.Label>Palette</Select.Label>
          <Select.Trigger>
            <Select.Value placeholder="Choose a palette" />
            <Select.Icon />
          </Select.Trigger>
        </div>
        <Options />
      </Select.Root>
      <Select.Root items={items}>
        <Select.Trigger aria-label="Accent palette">
          <Select.Value placeholder="Choose an accent" />
          <Select.Icon />
        </Select.Trigger>
        <Options />
      </Select.Root>
    </div>
  );
}
