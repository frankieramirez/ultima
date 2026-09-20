import { Calendar } from '@ultima/ui';

export default function BasicCalendar() {
  return (
    <Calendar.Root>
      <Calendar.Label>Release date</Calendar.Label>
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
