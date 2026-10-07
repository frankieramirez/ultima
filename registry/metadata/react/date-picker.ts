import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'date-picker',
  kind: 'react',
  title: 'Date Picker',
  description: 'A date input with a popup day, month, and year grid, on Zag.',
  contract: 'docs/spec/ultima.md#the-date-set',
  installDocs: 'import { DatePicker } from \'@/components/ui/date-picker\';\n\n<DatePicker.Root>\n  <DatePicker.Label>Release date</DatePicker.Label>\n  <DatePicker.Control>\n    <DatePicker.Input />\n    <DatePicker.ClearTrigger />\n    <DatePicker.Trigger />\n  </DatePicker.Control>\n  <DatePicker.Portal>\n    <DatePicker.Positioner>\n      <DatePicker.Content>\n        <DatePicker.View view="day">\n          <DatePicker.ViewControl view="day">\n            <DatePicker.PrevTrigger />\n            <DatePicker.ViewTrigger>\n              <DatePicker.RangeText />\n            </DatePicker.ViewTrigger>\n            <DatePicker.NextTrigger />\n          </DatePicker.ViewControl>\n          <DatePicker.Table view="day" />\n        </DatePicker.View>\n      </DatePicker.Content>\n    </DatePicker.Positioner>\n  </DatePicker.Portal>\n</DatePicker.Root>\n\nsize is sm, md, or lg on Control, default md. Label names the input; a Field.Label does not reach it, so use DatePicker.Label or aria-labelledby. selectionMode="range" pairs two Inputs at index 0 and 1, and PresetTrigger commits a named range. For the grid alone, use Calendar.',
  primaryExport: 'DatePicker',
  release: 'v0.2',
  order: 17,
  group: 'forms',
  replaces: { elements: ['input[type=date]'] },
} satisfies ReactDescriptor;
