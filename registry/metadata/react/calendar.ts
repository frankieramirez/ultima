import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'calendar',
  kind: 'react',
  title: 'Calendar',
  description: 'An inline day, month, and year grid for picking dates, on Zag.',
  contract: 'docs/spec/ultima.md#the-date-set',
  installDocs: 'import { Calendar } from \'@/components/ui/calendar\';\n\n<Calendar.Root>\n  <Calendar.Label>Release date</Calendar.Label>\n  <Calendar.Content>\n    <Calendar.View view="day">\n      <Calendar.ViewControl view="day">\n        <Calendar.PrevTrigger />\n        <Calendar.ViewTrigger>\n          <Calendar.RangeText />\n        </Calendar.ViewTrigger>\n        <Calendar.NextTrigger />\n      </Calendar.ViewControl>\n      <Calendar.Table view="day" />\n    </Calendar.View>\n  </Calendar.Content>\n</Calendar.Root>\n\nThe machine runs inline. selectionMode is single, multiple, or range, and value is a @internationalized/date DateValue[]. Label names the grid; Content and Table keep Zag\'s hidden and role=grid wiring. MonthSelect and YearSelect stay native. For the input-and-popup composition, use Date Picker.',
  primaryExport: 'Calendar',
  release: 'v0.2',
  order: 16,
} satisfies ReactDescriptor;
