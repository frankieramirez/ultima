import { DatePicker } from '@ultima/ui';

export default function SelectsDatePicker() {
  return (
    <DatePicker.Root>
      <DatePicker.Label>Billing period</DatePicker.Label>
      <DatePicker.Control>
        <DatePicker.Input />
        <DatePicker.ClearTrigger />
        <DatePicker.Trigger />
      </DatePicker.Control>
      <DatePicker.Portal>
        <DatePicker.Positioner>
          <DatePicker.Content>
            <DatePicker.View view="day">
              <DatePicker.ViewControl view="day">
                <DatePicker.MonthSelect />
                <DatePicker.YearSelect />
              </DatePicker.ViewControl>
              <DatePicker.Table view="day" />
            </DatePicker.View>
          </DatePicker.Content>
        </DatePicker.Positioner>
      </DatePicker.Portal>
    </DatePicker.Root>
  );
}
