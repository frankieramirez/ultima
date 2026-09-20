import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { DatePicker } from '@ultima/ui';

const styles = stylex.create({
  presets: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: space['--ult-space-1'],
    marginBlockEnd: space['--ult-space-3'],
  },
});

export default function PresetsDatePicker() {
  return (
    <DatePicker.Root selectionMode="range">
      <DatePicker.Label>Reporting period</DatePicker.Label>
      <DatePicker.Control>
        <DatePicker.Input index={0} />
        <DatePicker.Input index={1} />
        <DatePicker.ClearTrigger />
        <DatePicker.Trigger />
      </DatePicker.Control>
      <DatePicker.Portal>
        <DatePicker.Positioner>
          <DatePicker.Content>
            <div {...stylex.props(styles.presets)}>
              <DatePicker.PresetTrigger value="last7Days">Last 7 days</DatePicker.PresetTrigger>
              <DatePicker.PresetTrigger value="thisMonth">This month</DatePicker.PresetTrigger>
              <DatePicker.PresetTrigger value="thisYear">This year</DatePicker.PresetTrigger>
            </div>
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
