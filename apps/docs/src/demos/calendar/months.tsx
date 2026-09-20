import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Calendar } from '@ultima/ui';

const styles = stylex.create({
  months: {
    display: 'flex',
    gap: space['--ult-space-6'],
  },
});

export default function MonthsCalendar() {
  return (
    <Calendar.Root numOfMonths={2}>
      <Calendar.Label>Booking dates</Calendar.Label>
      <Calendar.Content>
        <Calendar.View view="day" style={styles.months}>
          <Calendar.Table view="day" />
          <Calendar.Table view="day">
            <Calendar.TableHead view="day" />
            <Calendar.TableBody view="day" monthsOffset={1} />
          </Calendar.Table>
        </Calendar.View>
      </Calendar.Content>
    </Calendar.Root>
  );
}
