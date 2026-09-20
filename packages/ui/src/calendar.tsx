'use client';

import type { DateValue } from '@internationalized/date';
import {
  connect,
  machine,
  type Api as DatePickerApi,
  type DateView,
  type Props as DatePickerProps,
  type VisibleRange,
} from '@zag-js/date-picker';
import { mergeProps, normalizeProps, useMachine, type PropTypes } from '@zag-js/react';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PlainProps, StyleProp } from '@ultima/ui/lib/component';
import { createContext, use, useId, type ReactNode } from 'react';

const styles = stylex.create({
  root: {
    backgroundColor: color['--ult-color-surface-raised'],
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-lg'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    display: 'inline-flex',
    flexDirection: 'column',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-4'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
    padding: space['--ult-space-5'],
  },
  label: {
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
  viewControl: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-2'],
    justifyContent: 'space-between',
    margin: 0,
    marginBlockEnd: space['--ult-space-3'],
  },
  trigger: {
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: { default: 'transparent', ':hover:not([data-disabled])': color['--ult-color-surface-hover'] },
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'none',
    borderWidth: 0,
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    cursor: { default: 'pointer', ':is([data-disabled])': 'default' },
    display: 'inline-flex',
    flexShrink: 0,
    fontFamily: 'inherit',
    fontSize: 'inherit',
    justifyContent: 'center',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
    padding: 0,
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  navTrigger: {
    blockSize: space['--ult-space-8'],
    inlineSize: space['--ult-space-8'],
  },
  viewTrigger: {
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-3'],
  },
  rangeText: {
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
  table: {
    borderCollapse: 'collapse',
    borderStyle: 'none',
    boxSizing: 'border-box',
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
  tableHeader: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    paddingBlockEnd: space['--ult-space-3'],
    textAlign: 'center',
  },
  tableCell: {
    margin: 0,
    padding: space['--ult-space-1'],
    textAlign: 'center',
  },
  cellTrigger: {
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: {
      default: 'transparent',
      ':is([data-in-range]):not([data-range-start]):not([data-range-end]):not([data-selected])':
        color['--ult-color-accent-subtle'],
      ':is([data-selected])': color['--ult-color-accent'],
      ':is([data-range-start])': color['--ult-color-accent'],
      ':is([data-range-end])': color['--ult-color-accent'],
      ':hover:not([data-selected]):not([data-range-start]):not([data-range-end]):not([data-in-range]):not([data-disabled]):not([data-unavailable])':
        color['--ult-color-surface-hover'],
    },
    blockSize: space['--ult-space-9'],
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'none',
    borderWidth: 0,
    boxSizing: 'border-box',
    color: {
      default: color['--ult-color-text'],
      ':is([data-outside-range])': color['--ult-color-text-subtle'],
      ':is([data-in-range]):not([data-range-start]):not([data-range-end]):not([data-selected])':
        color['--ult-color-accent-text'],
      ':is([data-today]):not([data-selected]):not([data-range-start]):not([data-range-end])':
        color['--ult-color-accent-text'],
      ':is([data-selected])': color['--ult-color-accent-contrast'],
      ':is([data-range-start])': color['--ult-color-accent-contrast'],
      ':is([data-range-end])': color['--ult-color-accent-contrast'],
    },
    cursor: {
      default: 'pointer',
      ':is([data-disabled])': 'default',
      ':is([data-unavailable])': 'default',
    },
    display: 'inline-flex',
    flexShrink: 0,
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    fontWeight: {
      default: font['--ult-font-weight-regular'],
      ':is([data-today])': font['--ult-font-weight-semibold'],
    },
    inlineSize: space['--ult-space-9'],
    justifyContent: 'center',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    opacity: {
      default: 1,
      ':is([data-disabled])': 0.5,
      ':is([data-unavailable])': 0.5,
    },
    padding: 0,
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color, color',
    transitionTimingFunction: easing.standard,
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  select: {
    backgroundColor: color['--ult-color-surface-sunken'],
    borderColor: color['--ult-color-border-strong'],
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    cursor: { default: 'pointer', ':is([data-disabled])': 'default' },
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-3'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
    paddingBlock: space['--ult-space-1'],
    paddingInline: space['--ult-space-2'],
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
});

type CalendarApi = DatePickerApi<PropTypes>;

type CalendarContextValue = {
  api: CalendarApi;
  labelId: (index?: number) => string;
};

const CalendarContext = createContext<CalendarContextValue | null>(null);

function useCalendar() {
  const context = use(CalendarContext);
  if (!context) {
    throw new Error('Calendar parts must be rendered inside Calendar.Root');
  }
  return context;
}

function PrevGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      aria-hidden="true"
    >
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

function NextGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      aria-hidden="true"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

type CalendarRootProps = Omit<
  DatePickerProps,
  | 'closeOnSelect'
  | 'defaultOpen'
  | 'id'
  | 'inline'
  | 'name'
  | 'onOpenChange'
  | 'open'
  | 'placeholder'
  | 'positioning'
  | 'required'
> & {
  id?: string;
  children?: ReactNode;
  style?: StyleProp;
};

type CalendarLabelProps = PlainProps<'label'> & { index?: number };
type CalendarContentProps = PlainProps<'div'>;
type CalendarViewControlProps = PlainProps<'div'> & { view?: DateView };
type CalendarPrevTriggerProps = PlainProps<'button'> & { view?: DateView };
type CalendarNextTriggerProps = PlainProps<'button'> & { view?: DateView };
type CalendarViewTriggerProps = PlainProps<'button'> & { view?: DateView };
type CalendarRangeTextProps = PlainProps<'span'>;
type CalendarViewProps = PlainProps<'div'> & { view?: DateView };
type CalendarTableProps = PlainProps<'table'> & { view?: DateView; columns?: number };
type CalendarTableHeadProps = PlainProps<'thead'> & { view?: DateView };
type CalendarTableBodyProps = PlainProps<'tbody'> & {
  view?: DateView;
  columns?: number;
  monthsOffset?: number;
};
type CalendarTableRowProps = PlainProps<'tr'> & { view?: DateView };
type CalendarTableHeaderProps = PlainProps<'th'> & { view?: DateView };
type CalendarTableCellProps = Omit<PlainProps<'td'>, 'value'> & {
  view?: DateView;
  value: DateValue | number;
  disabled?: boolean;
  columns?: number;
  visibleRange?: VisibleRange;
};
type CalendarTableCellTriggerProps = Omit<PlainProps<'button'>, 'value'> & {
  view?: DateView;
  value: DateValue | number;
  disabled?: boolean;
  columns?: number;
  visibleRange?: VisibleRange;
};
type CalendarMonthSelectProps = PlainProps<'select'>;
type CalendarYearSelectProps = PlainProps<'select'>;

function Root({ id, style, children, ...props }: CalendarRootProps) {
  const generatedId = useId();
  const scopeId = id ?? generatedId;
  const service = useMachine(machine, { ...props, id: scopeId, inline: true });
  const api = connect(service, normalizeProps);
  const labelId = (index = 0) => props.ids?.label?.(index) ?? `datepicker:${scopeId}:label:${index}`;
  return (
    <CalendarContext.Provider value={{ api, labelId }}>
      <div {...mergeProps(api.getRootProps(), stylex.props(styles.root, style))}>{children}</div>
    </CalendarContext.Provider>
  );
}

function Label({ index = 0, style, ...props }: CalendarLabelProps) {
  const { api } = useCalendar();
  const { htmlFor: _htmlFor, ...labelProps } = api.getLabelProps({ index });
  return <label {...mergeProps(labelProps, props, stylex.props(styles.label, style))} />;
}

function Content({ style, ...props }: CalendarContentProps) {
  const { api } = useCalendar();
  return <div {...mergeProps(api.getContentProps(), props, stylex.props(style))} />;
}

function ViewControl({ view = 'day', style, ...props }: CalendarViewControlProps) {
  const { api } = useCalendar();
  return (
    <div {...mergeProps(api.getViewControlProps({ view }), props, stylex.props(styles.viewControl, style))} />
  );
}

function PrevTrigger({ view = 'day', style, children, ...props }: CalendarPrevTriggerProps) {
  const { api } = useCalendar();
  return (
    <button {...mergeProps(api.getPrevTriggerProps({ view }), props, stylex.props(styles.trigger, styles.navTrigger, style))}>
      {children ?? <PrevGlyph />}
    </button>
  );
}

function NextTrigger({ view = 'day', style, children, ...props }: CalendarNextTriggerProps) {
  const { api } = useCalendar();
  return (
    <button {...mergeProps(api.getNextTriggerProps({ view }), props, stylex.props(styles.trigger, styles.navTrigger, style))}>
      {children ?? <NextGlyph />}
    </button>
  );
}

function ViewTrigger({ view = 'day', style, ...props }: CalendarViewTriggerProps) {
  const { api } = useCalendar();
  return (
    <button {...mergeProps(api.getViewTriggerProps({ view }), props, stylex.props(styles.trigger, styles.viewTrigger, style))} />
  );
}

function RangeText({ style, children, ...props }: CalendarRangeTextProps) {
  const { api } = useCalendar();
  return (
    <span {...mergeProps(api.getRangeTextProps(), props, stylex.props(styles.rangeText, style))}>
      {children ?? api.visibleRangeText.formatted}
    </span>
  );
}

function View({ view = 'day', style, ...props }: CalendarViewProps) {
  const { api } = useCalendar();
  return <div {...mergeProps(api.getViewProps({ view }), props, stylex.props(style))} />;
}

function Table({ view = 'day', columns, style, children, ...props }: CalendarTableProps) {
  const { api, labelId } = useCalendar();
  const labelledBy = props['aria-label'] || props['aria-labelledby'] ? undefined : labelId(0);
  return (
    <table
      {...mergeProps(
        api.getTableProps({ view, columns, id: props.id }),
        { 'aria-labelledby': labelledBy },
        props,
        stylex.props(styles.table, style),
      )}
    >
      {children ?? (
        <>
          <TableHead view={view} />
          <TableBody view={view} columns={columns} />
        </>
      )}
    </table>
  );
}

function TableHead({ view = 'day', style, children, ...props }: CalendarTableHeadProps) {
  const { api } = useCalendar();
  return (
    <thead {...mergeProps(api.getTableHeadProps({ view }), props, stylex.props(style))}>
      {children ??
        (view === 'day' ? (
          <TableRow view="day">
            {api.showWeekNumbers ? <th {...api.getWeekNumberHeaderCellProps({ view })} /> : null}
            {api.weekDays.map((day) => (
              <TableHeader key={day.long} view="day" aria-label={day.long}>
                {day.narrow}
              </TableHeader>
            ))}
          </TableRow>
        ) : null)}
    </thead>
  );
}

function TableBody({ view = 'day', columns, monthsOffset = 0, style, children, ...props }: CalendarTableBodyProps) {
  const { api } = useCalendar();
  const bodyProps = mergeProps(api.getTableBodyProps({ view }), props, stylex.props(style));
  if (children !== undefined) {
    return <tbody {...bodyProps}>{children}</tbody>;
  }
  if (view === 'day') {
    const offset = monthsOffset ? api.getOffset({ months: monthsOffset }) : null;
    const weeks = offset?.weeks ?? api.weeks;
    const visibleRange = offset?.visibleRange;
    return (
      <tbody {...bodyProps}>
        {weeks.map((week, i) => (
          <TableRow key={i} view="day">
            {api.showWeekNumbers ? (
              <td {...api.getWeekNumberCellProps({ weekIndex: i, week })}>{api.getWeekNumber(week)}</td>
            ) : null}
            {week.map((day, j) => (
              <TableCell key={j} view="day" value={day} visibleRange={visibleRange}>
                <TableCellTrigger view="day" value={day} visibleRange={visibleRange} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </tbody>
    );
  }
  const grid = view === 'month' ? api.getMonthsGrid({ columns }) : api.getYearsGrid({ columns });
  return (
    <tbody {...bodyProps}>
      {grid.map((row, i) => (
        <TableRow key={i} view={view}>
          {row.map((cell, j) => (
            <TableCell key={j} view={view} value={cell.value} columns={columns} disabled={cell.disabled}>
              <TableCellTrigger view={view} value={cell.value} columns={columns} disabled={cell.disabled}>
                {cell.label}
              </TableCellTrigger>
            </TableCell>
          ))}
        </TableRow>
      ))}
    </tbody>
  );
}

function TableRow({ view = 'day', style, ...props }: CalendarTableRowProps) {
  const { api } = useCalendar();
  return <tr {...mergeProps(api.getTableRowProps({ view }), props, stylex.props(style))} />;
}

function TableHeader({ view = 'day', style, ...props }: CalendarTableHeaderProps) {
  const { api } = useCalendar();
  return (
    <th
      scope="col"
      {...mergeProps(api.getTableHeaderProps({ view }), props, stylex.props(styles.tableHeader, style))}
    />
  );
}

function TableCell({ view = 'day', value, disabled, columns, visibleRange, style, ...props }: CalendarTableCellProps) {
  const { api } = useCalendar();
  const cellProps =
    view === 'day'
      ? api.getDayTableCellProps({ value: value as DateValue, disabled, visibleRange })
      : view === 'month'
        ? api.getMonthTableCellProps({ value: value as number, columns, disabled })
        : api.getYearTableCellProps({ value: value as number, columns, disabled });
  return <td {...mergeProps(cellProps, props, stylex.props(styles.tableCell, style))} />;
}

function TableCellTrigger({
  view = 'day',
  value,
  disabled,
  columns,
  visibleRange,
  style,
  children,
  ...props
}: CalendarTableCellTriggerProps) {
  const { api } = useCalendar();
  const triggerProps =
    view === 'day'
      ? api.getDayTableCellTriggerProps({ value: value as DateValue, disabled, visibleRange })
      : view === 'month'
        ? api.getMonthTableCellTriggerProps({ value: value as number, columns, disabled })
        : api.getYearTableCellTriggerProps({ value: value as number, columns, disabled });
  const label =
    children ??
    (view === 'day'
      ? (value as DateValue).day
      : view === 'month'
        ? api.getMonths().find((month) => month.value === value)?.label
        : api.getYears().find((year) => year.value === value)?.label);
  return (
    <button
      type="button"
      {...mergeProps(triggerProps, props, stylex.props(styles.cellTrigger, style))}
    >
      {label}
    </button>
  );
}

function MonthSelect({ style, children, ...props }: CalendarMonthSelectProps) {
  const { api } = useCalendar();
  return (
    <select {...mergeProps(api.getMonthSelectProps(), props, stylex.props(styles.select, style))}>
      {children ??
        api.getMonths().map((month) => (
          <option key={month.value} value={month.value} disabled={month.disabled}>
            {month.label}
          </option>
        ))}
    </select>
  );
}

function YearSelect({ style, children, ...props }: CalendarYearSelectProps) {
  const { api } = useCalendar();
  return (
    <select {...mergeProps(api.getYearSelectProps(), props, stylex.props(styles.select, style))}>
      {children ??
        api.getYears().map((year) => (
          <option key={year.value} value={year.value} disabled={year.disabled}>
            {year.label}
          </option>
        ))}
    </select>
  );
}

const Calendar = {
  Root,
  Label,
  Content,
  ViewControl,
  PrevTrigger,
  NextTrigger,
  ViewTrigger,
  RangeText,
  View,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  TableCellTrigger,
  MonthSelect,
  YearSelect,
};

export {
  Calendar,
  type CalendarRootProps,
  type CalendarLabelProps,
  type CalendarContentProps,
  type CalendarViewControlProps,
  type CalendarPrevTriggerProps,
  type CalendarNextTriggerProps,
  type CalendarViewTriggerProps,
  type CalendarRangeTextProps,
  type CalendarViewProps,
  type CalendarTableProps,
  type CalendarTableHeadProps,
  type CalendarTableBodyProps,
  type CalendarTableRowProps,
  type CalendarTableHeaderProps,
  type CalendarTableCellProps,
  type CalendarTableCellTriggerProps,
  type CalendarMonthSelectProps,
  type CalendarYearSelectProps,
};
