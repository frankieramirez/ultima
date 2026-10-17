'use client';

import type { DateValue } from '@internationalized/date';
import {
  connect,
  machine,
  type Api as DatePickerApi,
  type DateView,
  type PresetTriggerValue,
  type Props as DatePickerProps,
  type VisibleRange,
} from '@zag-js/date-picker';
import { mergeProps, normalizeProps, Portal, useMachine, type PortalProps, type PropTypes } from '@zag-js/react';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, shadow, space, text, z } from '@ultima/tokens/tokens.stylex';
import type { PlainProps, StyleProp } from '@ultima/ui/lib/component';
import { createContext, use, useId, type ReactNode } from 'react';

const HOVER = '@media (hover: hover)';
const COARSE = '@media (pointer: coarse)';

// The grid's day states, as selector keys. `ENDS` carries the accent fill: the single selection or
// either end of a range. `BAND` is a day between the ends, including a range previewed under the
// pointer. A day squares its leading corners when the band continues before it (`OPEN_START`), and
// its trailing corners when it continues after (`OPEN_END`), and a week's first and last days keep
// their outer pair where the band wraps.
const ENDS = ':is([data-selected], [data-range-start], [data-range-end])';
const BAND = ':is([data-in-range], [data-in-hover-range]):not([data-selected], [data-range-start], [data-range-end])';
const OPEN_START = ':is([data-in-range]:not([data-range-start]), [data-in-hover-range]:not([data-hover-range-start])):not(td:first-child > *)';
const OPEN_END = ':is([data-in-range]:not([data-range-end]), [data-in-hover-range]:not([data-hover-range-end])):not(td:last-child > *)';

const enter = stylex.keyframes({
  from: { opacity: 0, transform: 'scale(0.96)' },
});

const styles = stylex.create({
  label: {
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
  // Input Group's field recipe, restated as Combobox restates it. Focus lands on the input, so the
  // ring is `:focus-within`, outside the edge. Its own `:read-only` would match the div, so the keys
  // ask whether the input inside is read-only, which a disabled input also is. Invalid is read on the
  // control itself as well as inside it, since the machine marks both.
  control: {
    alignItems: 'center',
    backgroundColor: {
      default: color['--ult-color-field'],
      ':has(:is(input, textarea):read-only)': color['--ult-color-surface-sunken'],
    },
    borderColor: {
      default: color['--ult-color-border-strong'],
      ':has(:is(input, textarea):read-only):not(:is([aria-invalid="true"], [data-invalid], :has([aria-invalid="true"], [data-invalid])))': color['--ult-color-border'],
      ':is([aria-invalid="true"], [data-invalid], :has([aria-invalid="true"], [data-invalid]))': color['--ult-color-danger'],
      [HOVER]: {
        ':hover:not(:is([aria-invalid="true"], [data-invalid]), :has(:is(input, textarea):read-only, [aria-invalid="true"], [data-invalid]))':
          color['--ult-color-border-hover'],
      },
    },
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    color: { default: color['--ult-color-text'], ':has(:disabled)': color['--ult-color-text-disabled'] },
    display: 'inline-flex',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-3'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    minWidth: 0,
    outline: {
      default: 'none',
      ':focus-within': `${border.focus} solid ${color['--ult-color-border-focus']}`,
    },
    outlineOffset: border.focusOffset,
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color, border-color',
    transitionTimingFunction: easing.standard,
    width: '100%',
  },
  input: {
    appearance: 'none',
    backgroundColor: 'transparent',
    borderStyle: 'none',
    borderWidth: 0,
    borderRadius: 0,
    color: 'inherit',
    flexGrow: 1,
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    margin: 0,
    minWidth: 0,
    outline: 'none',
    padding: 0,
    width: '100%',
    '::placeholder': { color: color['--ult-color-text-subtle'], opacity: 1 },
  },
  // The calendar and clear buttons inside the control: a 24px ground on the 4px corner, pulled in
  // so the glyph sits as far from the edge as the text does. The glyph is the subtle ink, and inks
  // up with the hover ground.
  fieldTrigger: {
    blockSize: space['--ult-space-8'],
    borderRadius: radius['--ult-radius-sm'],
    color: {
      default: color['--ult-color-text-subtle'],
      ':is(:disabled, [data-disabled])': color['--ult-color-text-disabled'],
      [HOVER]: { ':hover:not(:disabled, [data-disabled])': color['--ult-color-text'] },
    },
    inlineSize: space['--ult-space-8'],
    marginInlineEnd: `calc(-1 * ${space['--ult-space-2']})`,
  },
  clearTrigger: {
    marginInlineEnd: 0,
  },
  presetTrigger: {
    blockSize: space['--ult-space-9'],
    paddingInline: space['--ult-space-4'],
  },
  // The overlay surface. The machine writes `hidden` while closed, so no `display` may fight it, and
  // there is no exit; showing the popup replays the shared enter, a fade and a scale from 96% out of
  // the transform origin the positioner sets.
  content: {
    animationDuration: motion['--ult-motion-fast'],
    animationName: enter,
    animationTimingFunction: easing.enter,
    backgroundColor: color['--ult-color-surface-raised'],
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-lg'],
    borderStyle: 'solid',
    borderWidth: border.fine,
    boxShadow: shadow['--ult-shadow-md'],
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
    outline: { default: 'none', ':focus': 'none', ':focus-visible': 'none' },
    outlineWidth: { default: 0, ':focus': 0, ':focus-visible': 0 },
    padding: space['--ult-space-5'],
    transformOrigin: 'var(--transform-origin)',
    zIndex: z.popup,
  },
  viewControl: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-2'],
    justifyContent: 'space-between',
    margin: 0,
    marginBlockEnd: space['--ult-space-4'],
  },
  trigger: {
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: {
      default: 'transparent',
      [HOVER]: { ':hover:not(:disabled, [data-disabled])': color['--ult-color-surface-hover'] },
    },
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'none',
    borderWidth: 0,
    boxSizing: 'border-box',
    color: { default: color['--ult-color-text'], ':is(:disabled, [data-disabled])': color['--ult-color-text-disabled'] },
    cursor: { default: 'pointer', ':is(:disabled, [data-disabled])': 'default' },
    display: { default: 'inline-flex', ':is([hidden])': 'none' },
    flexShrink: 0,
    fontFamily: 'inherit',
    fontSize: 'inherit',
    justifyContent: 'center',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    padding: 0,
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color, color',
    transitionTimingFunction: easing.standard,
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  navTrigger: {
    blockSize: space['--ult-space-9'],
    fontSize: text['--ult-text-5'],
    inlineSize: space['--ult-space-9'],
  },
  viewTrigger: {
    blockSize: space['--ult-space-9'],
    paddingInline: space['--ult-space-4'],
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
  // Seven 32px days, stretched to the full width when the header is wider so the grid lines up
  // under it, and squeezed only when the container itself is narrower. A percentage width would
  // instead grow the calendar to its container.
  dayTable: {
    inlineSize: `calc(7 * ${space['--ult-space-9']})`,
    maxInlineSize: '100%',
    minInlineSize: '100%',
    tableLayout: 'fixed',
  },
  // No inline padding, so the days of a range meet and their fill reads as one band.
  tableCell: {
    margin: 0,
    paddingBlock: space['--ult-space-1'],
    paddingInline: 0,
    textAlign: 'center',
  },
  // A day is 32px tall on a 6px corner and as wide as its column. Inside a range, a day squares the corners that face its
  // neighbours: the start keeps its leading pair, the end its trailing pair. The selected ends take
  // the accent fill and the days between take the subtle one, which also previews a range under the
  // pointer. Hover moves one step on whichever ground the day stands on, on devices that hover.
  // Today is ringed with the 3:1 edge. A disabled or unavailable day takes the disabled ink, never a fade.
  cellTrigger: {
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: {
      default: 'transparent',
      [BAND]: color['--ult-color-accent-subtle'],
      [ENDS]: color['--ult-color-accent'],
      [HOVER]: {
        ':hover:not([data-disabled], [data-in-range], [data-in-hover-range], [data-selected], [data-range-start], [data-range-end])':
          color['--ult-color-surface-hover'],
        ':is([data-in-range], [data-in-hover-range]):hover:not([data-disabled], [data-selected], [data-range-start], [data-range-end])':
          color['--ult-color-accent-subtle-hover'],
        ':is([data-selected], [data-range-start], [data-range-end]):hover:not([data-disabled])': color['--ult-color-accent-hover'],
      },
    },
    blockSize: space['--ult-space-9'],
    borderEndEndRadius: { default: radius['--ult-radius-md'], [OPEN_END]: 0 },
    borderEndStartRadius: { default: radius['--ult-radius-md'], [OPEN_START]: 0 },
    borderStartEndRadius: { default: radius['--ult-radius-md'], [OPEN_END]: 0 },
    borderStartStartRadius: { default: radius['--ult-radius-md'], [OPEN_START]: 0 },
    borderStyle: 'none',
    borderWidth: 0,
    boxShadow: {
      default: null,
      ':is([data-today]):not([data-in-range], [data-in-hover-range], [data-selected], [data-range-start], [data-range-end])':
        `inset 0 0 0 ${border.hairline} ${color['--ult-color-border-strong']}`,
    },
    boxSizing: 'border-box',
    color: {
      default: color['--ult-color-text'],
      ':is([data-outside-range]):not([data-disabled], [data-in-range], [data-in-hover-range], [data-selected], [data-range-start], [data-range-end])':
        color['--ult-color-text-subtle'],
      ':is([data-disabled]):not([data-in-range], [data-in-hover-range], [data-selected], [data-range-start], [data-range-end])':
        color['--ult-color-text-disabled'],
      [BAND]: color['--ult-color-accent-text'],
      [ENDS]: color['--ult-color-accent-contrast'],
    },
    cursor: { default: 'pointer', ':is([data-disabled])': 'default' },
    display: 'inline-flex',
    flexShrink: 0,
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    fontVariantNumeric: 'tabular-nums',
    fontWeight: {
      default: font['--ult-font-weight-regular'],
      ':is([data-today])': font['--ult-font-weight-semibold'],
    },
    inlineSize: '100%',
    justifyContent: 'center',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    padding: 0,
    position: 'relative',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color, color',
    transitionTimingFunction: easing.standard,
    zIndex: { default: null, ':focus-visible': 1 },
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  // Input's field recipe at a compact 32px, keeping the native menu and its arrow.
  select: {
    backgroundColor: { default: color['--ult-color-field'], ':disabled': color['--ult-color-surface-sunken'] },
    blockSize: space['--ult-space-9'],
    borderColor: {
      default: color['--ult-color-border-strong'],
      ':disabled': color['--ult-color-border'],
      [HOVER]: { ':hover:not(:disabled)': color['--ult-color-border-hover'] },
    },
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    color: { default: color['--ult-color-text'], ':disabled': color['--ult-color-text-disabled'] },
    cursor: { default: 'pointer', ':disabled': 'default' },
    fontFamily: font['--ult-font-sans'],
    fontSize: { default: text['--ult-text-4'], [COARSE]: text['--ult-text-5'] },
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    outline: {
      default: 'none',
      ':focus-visible': `${border.focus} solid ${color['--ult-color-border-focus']}`,
    },
    outlineOffset: border.focusOffset,
    paddingInline: space['--ult-space-3'],
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'border-color',
    transitionTimingFunction: easing.standard,
  },
});

// Field text is text step 4, and rises to step 5 under a coarse pointer so iOS doesn't zoom on focus.
const sizes = stylex.create({
  sm: {
    fontSize: { default: text['--ult-text-4'], [COARSE]: text['--ult-text-5'] },
    minHeight: space['--ult-space-9'],
    paddingInline: space['--ult-space-4'],
  },
  md: {
    fontSize: { default: text['--ult-text-4'], [COARSE]: text['--ult-text-5'] },
    minHeight: space['--ult-space-10'],
    paddingInline: space['--ult-space-5'],
  },
  lg: {
    fontSize: text['--ult-text-5'],
    minHeight: space['--ult-space-11'],
    paddingInline: space['--ult-space-6'],
  },
});

type DatePickerSize = keyof typeof sizes;

type PickerApi = DatePickerApi<PropTypes>;

type DatePickerContextValue = {
  api: PickerApi;
  labelId: (index?: number) => string;
};

const DatePickerContext = createContext<DatePickerContextValue | null>(null);

function useDatePicker() {
  const context = use(DatePickerContext);
  if (!context) {
    throw new Error('DatePicker parts must be rendered inside DatePicker.Root');
  }
  return context;
}

function CalendarGlyph() {
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
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function Cross() {
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
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
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

type DatePickerRootProps = Omit<DatePickerProps, 'id' | 'inline'> & {
  id?: string;
  children?: ReactNode;
  style?: StyleProp;
};

type DatePickerLabelProps = PlainProps<'label'> & { index?: number };
type DatePickerControlProps = PlainProps<'div'> & { size?: DatePickerSize };
type DatePickerInputProps = PlainProps<'input'> & { index?: number };
type DatePickerTriggerProps = PlainProps<'button'>;
type DatePickerClearTriggerProps = PlainProps<'button'>;
type DatePickerPresetTriggerProps = Omit<PlainProps<'button'>, 'value'> & {
  value: PresetTriggerValue;
};
type DatePickerContentProps = PlainProps<'div'>;
type DatePickerPositionerProps = PlainProps<'div'>;
type DatePickerPortalProps = PortalProps;
type DatePickerViewControlProps = PlainProps<'div'> & { view?: DateView };
type DatePickerPrevTriggerProps = PlainProps<'button'> & { view?: DateView };
type DatePickerNextTriggerProps = PlainProps<'button'> & { view?: DateView };
type DatePickerViewTriggerProps = PlainProps<'button'> & { view?: DateView };
type DatePickerRangeTextProps = PlainProps<'span'>;
type DatePickerViewProps = PlainProps<'div'> & { view?: DateView };
type DatePickerTableProps = PlainProps<'table'> & { view?: DateView; columns?: number };
type DatePickerTableHeadProps = PlainProps<'thead'> & { view?: DateView };
type DatePickerTableBodyProps = PlainProps<'tbody'> & {
  view?: DateView;
  columns?: number;
  monthsOffset?: number;
};
type DatePickerTableRowProps = PlainProps<'tr'> & { view?: DateView };
type DatePickerTableHeaderProps = PlainProps<'th'> & { view?: DateView };
type DatePickerTableCellProps = Omit<PlainProps<'td'>, 'value'> & {
  view?: DateView;
  value: DateValue | number;
  disabled?: boolean;
  columns?: number;
  visibleRange?: VisibleRange;
};
type DatePickerTableCellTriggerProps = Omit<PlainProps<'button'>, 'value'> & {
  view?: DateView;
  value: DateValue | number;
  disabled?: boolean;
  columns?: number;
  visibleRange?: VisibleRange;
};
type DatePickerMonthSelectProps = PlainProps<'select'>;
type DatePickerYearSelectProps = PlainProps<'select'>;

function Root({ id, style, children, ...props }: DatePickerRootProps) {
  const generatedId = useId();
  const scopeId = id ?? generatedId;
  const service = useMachine(machine, { ...props, id: scopeId });
  const api = connect(service, normalizeProps);
  const labelId = (index = 0) => props.ids?.label?.(index) ?? `datepicker:${scopeId}:label:${index}`;
  return (
    <DatePickerContext.Provider value={{ api, labelId }}>
      <div {...mergeProps(api.getRootProps(), stylex.props(style))}>{children}</div>
    </DatePickerContext.Provider>
  );
}

function Label({ index = 0, style, ...props }: DatePickerLabelProps) {
  const { api } = useDatePicker();
  return <label {...mergeProps(api.getLabelProps({ index }), props, stylex.props(styles.label, style))} />;
}

function Control({ size = 'md', style, ...props }: DatePickerControlProps) {
  const { api } = useDatePicker();
  return (
    <div {...mergeProps(api.getControlProps(), props, stylex.props(styles.control, sizes[size], style))} />
  );
}

function Input({ index = 0, style, ...props }: DatePickerInputProps) {
  const { api } = useDatePicker();
  return <input {...mergeProps(api.getInputProps({ index }), props, stylex.props(styles.input, style))} />;
}

function Trigger({ style, children, ...props }: DatePickerTriggerProps) {
  const { api } = useDatePicker();
  return (
    <button {...mergeProps(api.getTriggerProps(), props, stylex.props(styles.trigger, styles.fieldTrigger, style))}>
      {children ?? <CalendarGlyph />}
    </button>
  );
}

function ClearTrigger({ style, children, ...props }: DatePickerClearTriggerProps) {
  const { api } = useDatePicker();
  return (
    <button {...mergeProps(api.getClearTriggerProps(), props, stylex.props(styles.trigger, styles.fieldTrigger, styles.clearTrigger, style))}>
      {children ?? <Cross />}
    </button>
  );
}

function PresetTrigger({ value, style, ...props }: DatePickerPresetTriggerProps) {
  const { api } = useDatePicker();
  return (
    <button
      {...mergeProps(api.getPresetTriggerProps({ value }), props, stylex.props(styles.trigger, styles.presetTrigger, style))}
    />
  );
}

function Content({ style, ...props }: DatePickerContentProps) {
  const { api } = useDatePicker();
  return <div {...mergeProps(api.getContentProps(), props, stylex.props(styles.content, style))} />;
}

function Positioner({ style, ...props }: DatePickerPositionerProps) {
  const { api } = useDatePicker();
  return <div {...mergeProps(api.getPositionerProps(), props, stylex.props(style))} />;
}

function ViewControl({ view = 'day', style, ...props }: DatePickerViewControlProps) {
  const { api } = useDatePicker();
  return (
    <div {...mergeProps(api.getViewControlProps({ view }), props, stylex.props(styles.viewControl, style))} />
  );
}

function PrevTrigger({ view = 'day', style, children, ...props }: DatePickerPrevTriggerProps) {
  const { api } = useDatePicker();
  return (
    <button {...mergeProps(api.getPrevTriggerProps({ view }), props, stylex.props(styles.trigger, styles.navTrigger, style))}>
      {children ?? <PrevGlyph />}
    </button>
  );
}

function NextTrigger({ view = 'day', style, children, ...props }: DatePickerNextTriggerProps) {
  const { api } = useDatePicker();
  return (
    <button {...mergeProps(api.getNextTriggerProps({ view }), props, stylex.props(styles.trigger, styles.navTrigger, style))}>
      {children ?? <NextGlyph />}
    </button>
  );
}

function ViewTrigger({ view = 'day', style, ...props }: DatePickerViewTriggerProps) {
  const { api } = useDatePicker();
  return (
    <button {...mergeProps(api.getViewTriggerProps({ view }), props, stylex.props(styles.trigger, styles.viewTrigger, style))} />
  );
}

function RangeText({ style, children, ...props }: DatePickerRangeTextProps) {
  const { api } = useDatePicker();
  return (
    <span {...mergeProps(api.getRangeTextProps(), props, stylex.props(styles.rangeText, style))}>
      {children ?? api.visibleRangeText.formatted}
    </span>
  );
}

function View({ view = 'day', style, ...props }: DatePickerViewProps) {
  const { api } = useDatePicker();
  return <div {...mergeProps(api.getViewProps({ view }), props, stylex.props(style))} />;
}

function Table({ view = 'day', columns, style, children, ...props }: DatePickerTableProps) {
  const { api, labelId } = useDatePicker();
  const labelledBy = props['aria-label'] || props['aria-labelledby'] ? undefined : labelId(0);
  return (
    <table
      {...mergeProps(
        api.getTableProps({ view, columns, id: props.id }),
        { 'aria-labelledby': labelledBy },
        props,
        stylex.props(styles.table, view === 'day' && styles.dayTable, style),
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

function TableHead({ view = 'day', style, children, ...props }: DatePickerTableHeadProps) {
  const { api } = useDatePicker();
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

function TableBody({ view = 'day', columns, monthsOffset = 0, style, children, ...props }: DatePickerTableBodyProps) {
  const { api } = useDatePicker();
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

function TableRow({ view = 'day', style, ...props }: DatePickerTableRowProps) {
  const { api } = useDatePicker();
  return <tr {...mergeProps(api.getTableRowProps({ view }), props, stylex.props(style))} />;
}

function TableHeader({ view = 'day', style, ...props }: DatePickerTableHeaderProps) {
  const { api } = useDatePicker();
  return (
    <th
      scope="col"
      {...mergeProps(api.getTableHeaderProps({ view }), props, stylex.props(styles.tableHeader, style))}
    />
  );
}

function TableCell({ view = 'day', value, disabled, columns, visibleRange, style, ...props }: DatePickerTableCellProps) {
  const { api } = useDatePicker();
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
}: DatePickerTableCellTriggerProps) {
  const { api } = useDatePicker();
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

function MonthSelect({ style, children, ...props }: DatePickerMonthSelectProps) {
  const { api } = useDatePicker();
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

function YearSelect({ style, children, ...props }: DatePickerYearSelectProps) {
  const { api } = useDatePicker();
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

const DatePicker = {
  Root,
  Label,
  Control,
  Input,
  Trigger,
  ClearTrigger,
  PresetTrigger,
  Content,
  Positioner,
  Portal,
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
  DatePicker,
  type DatePickerRootProps,
  type DatePickerLabelProps,
  type DatePickerControlProps,
  type DatePickerInputProps,
  type DatePickerTriggerProps,
  type DatePickerClearTriggerProps,
  type DatePickerPresetTriggerProps,
  type DatePickerContentProps,
  type DatePickerPositionerProps,
  type DatePickerPortalProps,
  type DatePickerViewControlProps,
  type DatePickerPrevTriggerProps,
  type DatePickerNextTriggerProps,
  type DatePickerViewTriggerProps,
  type DatePickerRangeTextProps,
  type DatePickerViewProps,
  type DatePickerTableProps,
  type DatePickerTableHeadProps,
  type DatePickerTableBodyProps,
  type DatePickerTableRowProps,
  type DatePickerTableHeaderProps,
  type DatePickerTableCellProps,
  type DatePickerTableCellTriggerProps,
  type DatePickerMonthSelectProps,
  type DatePickerYearSelectProps,
  type DatePickerSize,
};
