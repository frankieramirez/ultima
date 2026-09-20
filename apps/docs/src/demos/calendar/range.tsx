import { Calendar } from '@ultima/ui';

export default function RangeCalendar() {
  return (
    <Calendar.Root selectionMode="range">
      <Calendar.Label>Sprint window</Calendar.Label>
      <Calendar.Content>
        <Calendar.View view="day">
          <Calendar.ViewControl view="day">
            <Calendar.PrevTrigger />
            <Calendar.ViewTrigger>
              <Calendar.RangeText />
            </Calendar.ViewTrigger>
            <Calendar.NextTrigger />
          </Calendar.ViewControl>
          <Calendar.Table view="day" />
        </Calendar.View>
      </Calendar.Content>
    </Calendar.Root>
  );
}
