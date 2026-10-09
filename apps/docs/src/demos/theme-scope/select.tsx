'use client';

import * as stylex from '@stylexjs/stylex';
import { Select } from '@ultima/ui';
import { ThemeScope, useThemeScopeContainer } from '@ultima/ui/theme-scope';
import { color, radius, space } from '@ultima/tokens/tokens.stylex';

import { neutralTheme as ultimaTheme } from '../../theme';

const styles = stylex.create({
  row: { display: 'flex', flexWrap: 'wrap', gap: space['--ult-space-4'] },
  scope: {
    backgroundColor: color['--ult-color-surface'],
    borderRadius: radius['--ult-radius-md'],
    color: color['--ult-color-text'],
    padding: space['--ult-space-6'],
  },
});

const items = [
  { label: 'Oak', value: 'oak' },
  { label: 'Pine', value: 'pine' },
];

function Material({ label }: { label: string }) {
  const container = useThemeScopeContainer();
  return (
    <Select.Root items={items}>
      <Select.Trigger aria-label={label}>
        <Select.Value placeholder="Choose a material" />
        <Select.Icon />
      </Select.Trigger>
      <Select.Portal container={container}>
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

export default function ScopedSelect() {
  return (
    <div {...stylex.props(styles.row)}>
      <ThemeScope theme={ultimaTheme} mode="dark" style={styles.scope}>
        <Material label="Dark material" />
      </ThemeScope>
      <ThemeScope theme={ultimaTheme} mode="light" style={styles.scope}>
        <Material label="Light material" />
      </ThemeScope>
    </div>
  );
}
