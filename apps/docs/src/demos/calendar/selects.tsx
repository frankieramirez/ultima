import { Calendar } from '@ultima/ui';

export default function SelectsCalendar() {
  return (
    <Calendar.Root>
      <Calendar.Label>Billing period</Calendar.Label>
      <Calendar.Content>
        <Calendar.View view="day">
          <Calendar.ViewControl view="day">
            <Calendar.MonthSelect />
            <Calendar.YearSelect />
          </Calendar.ViewControl>
          <Calendar.Table view="day" />
        </Calendar.View>
      </Calendar.Content>
    </Calendar.Root>
  );
}
