'use client';

import * as stylex from '@stylexjs/stylex';
import { DatePicker } from '@ultima/ui';
import { ThemeScope, useThemeScopeContainer } from '@ultima/ui/theme-scope';
import { color, radius, space } from '@ultima/tokens/tokens.stylex';

import { neutralTheme as ultimaTheme } from '../../theme';

const styles = stylex.create({
  scope: {
    backgroundColor: color['--ult-color-surface'],
    borderRadius: radius['--ult-radius-md'],
    color: color['--ult-color-text'],
    padding: space['--ult-space-6'],
  },
});

function ReleaseDate() {
  const element = useThemeScopeContainer();
  if (!element) return null;
  return (
    <DatePicker.Root>
      <DatePicker.Label>Release date</DatePicker.Label>
      <DatePicker.Control>
        <DatePicker.Input />
        <DatePicker.Trigger />
      </DatePicker.Control>
      <DatePicker.Portal container={{ current: element }}>
        <DatePicker.Positioner>
          <DatePicker.Content>
            <DatePicker.View view="day">
              <DatePicker.ViewControl view="day">
                <DatePicker.PrevTrigger />
                <DatePicker.ViewTrigger>
                  <DatePicker.RangeText />
                </DatePicker.ViewTrigger>
                <DatePicker.NextTrigger />
              </DatePicker.ViewControl>
              <DatePicker.Table view="day" />
            </DatePicker.View>
          </DatePicker.Content>
        </DatePicker.Positioner>
      </DatePicker.Portal>
    </DatePicker.Root>
  );
}

export default function ScopedDatePicker() {
  return (
    <ThemeScope theme={ultimaTheme} mode="light" style={styles.scope}>
      <ReleaseDate />
    </ThemeScope>
  );
}
