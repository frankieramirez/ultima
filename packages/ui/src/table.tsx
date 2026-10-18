'use client';

import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps, PlainProps } from '@ultima/ui/lib/component';
import { useLayoutEffect, useState } from 'react';

const HOVER = '@media (hover: hover)';

const styles = stylex.create({
  root: {
    borderCollapse: 'collapse',
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    lineHeight: font['--ult-font-leading-snug'],
    margin: 0,
    width: '100%',
  },
  /**
   * Body rows answer the pointer; head and foot rows are not rows of data. A selected row takes the
   * accent's step 5, the step for a held selection, so it reads stronger than a hovered row's step 4
   * and keeps its fill under the pointer: a hover that repainted it would hide the selection.
   */
  row: {
    backgroundColor: {
      default: 'transparent',
      ':is([data-selected])': color['--ult-color-accent-subtle-active'],
      [HOVER]: {
        ':hover:not(thead *, tfoot *)': color['--ult-color-surface-hover'],
        ':is([data-selected]):hover:not(thead *, tfoot *)': color['--ult-color-accent-subtle-active'],
      },
    },
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color',
    transitionTimingFunction: easing.standard,
  },
  headCell: {
    borderBlockEndColor: color['--ult-color-border'],
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: border.fine,
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
    fontWeight: font['--ult-font-weight-regular'],
    letterSpacing: font['--ult-font-tracking-wide'],
    paddingBlock: space['--ult-space-3'],
    paddingInline: space['--ult-space-4'],
    textAlign: 'left',
    textTransform: 'uppercase',
  },
  /** The foot is the table's last line, so its cells drop the rule a body row draws under itself. */
  cell: {
    borderBlockEndColor: color['--ult-color-border'],
    borderBlockEndStyle: { default: 'solid', ':is(tfoot *)': 'none' },
    borderBlockEndWidth: border.fine,
    paddingBlock: space['--ult-space-3'],
    paddingInline: space['--ult-space-4'],
  },
  /** A summary of the rows above it: the last body row's rule sets it apart, medium weight says what it is. */
  foot: {
    fontWeight: font['--ult-font-weight-medium'],
  },
  scroll: {
    boxSizing: 'border-box',
    overflow: 'auto',
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  caption: {
    captionSide: 'bottom',
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-3'],
    lineHeight: font['--ult-font-leading-snug'],
    padding: space['--ult-space-3'],
  },
});

/** Digits of one width, aligned on the end edge, so place values line up down the column. */
const numeric = stylex.create({
  numeric: {
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'end',
  },
});

type TableSort = 'ascending' | 'descending' | 'none';

type TableScrollProps = PlainProps<'div'>;
type TableRootProps = PartProps<useRender.ComponentProps<'table'>>;
type TableHeadProps = PlainProps<'thead'>;
type TableBodyProps = PlainProps<'tbody'>;
type TableFootProps = PlainProps<'tfoot'>;
type TableRowProps = PlainProps<'tr'> & {
  /** Paints the row as selected and emits `data-selected`. The row's checkbox stays the accessible signal. */
  selected?: boolean;
};
type TableHeadCellProps = PartProps<useRender.ComponentProps<'th'>> & {
  sort?: TableSort;
  /** Aligns the head of a numeric column with its cells. */
  numeric?: boolean;
};
type TableSortButtonProps = PartProps<useRender.ComponentProps<'button'>>;
type TableCellProps = PlainProps<'td'> & {
  /** End-aligned tabular figures, for a column of numbers. */
  numeric?: boolean;
};
type TableCaptionProps = PlainProps<'caption'>;

function useOverflows(element: HTMLDivElement | null): boolean {
  const [overflows, setOverflows] = useState(false);
  // Measured in layout, before paint: a ResizeObserver reports only after the next layout, which
  // would leave an overflowing region out of the tab order for its first frame.
  useLayoutEffect(() => {
    if (!element) return;
    const measure = () => setOverflows(element.scrollWidth > element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    return () => observer.disconnect();
  }, [element]);
  return overflows;
}

/** Name it with `aria-labelledby` pointing at the `Table.Caption` id. */
function Scroll({ ref, style, ...props }: TableScrollProps) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const overflows = useOverflows(element);
  return (
    <div
      role="region"
      tabIndex={overflows ? 0 : -1}
      ref={(node) => {
        setElement(node);
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      {...props}
      {...stylex.props(styles.scroll, style)}
    />
  );
}

function Root({ ref, render, style, ...props }: TableRootProps) {
  return useRender({ defaultTagName: 'table', ref, render, props: { ...props, ...stylex.props(styles.root, style) } });
}

function Head({ style, ...props }: TableHeadProps) {
  return <thead {...props} {...stylex.props(style)} />;
}

function Body({ style, ...props }: TableBodyProps) {
  return <tbody {...props} {...stylex.props(style)} />;
}

function Foot({ style, ...props }: TableFootProps) {
  return <tfoot {...props} {...stylex.props(styles.foot, style)} />;
}

function Row({ selected = false, style, ...props }: TableRowProps) {
  return <tr data-selected={selected ? '' : undefined} {...props} {...stylex.props(styles.row, style)} />;
}

function HeadCell({ ref, render, scope = 'col', sort, numeric: isNumeric = false, style, ...props }: TableHeadCellProps) {
  return useRender({
    defaultTagName: 'th',
    ref,
    render,
    state: { sort },
    stateAttributesMapping: {
      sort: (value: TableSort | undefined): Record<string, string> | null =>
        value ? { 'aria-sort': value, 'data-sort': value } : null,
    },
    props: { scope, ...props, ...stylex.props(styles.headCell, isNumeric && numeric.numeric, style) },
  });
}

function SortButton({ ref, render, style, ...props }: TableSortButtonProps) {
  return useRender({
    defaultTagName: 'button',
    ref,
    render,
    props: { type: 'button', ...props, ...stylex.props(style) },
  });
}

function Cell({ numeric: isNumeric = false, style, ...props }: TableCellProps) {
  return <td {...props} {...stylex.props(styles.cell, isNumeric && numeric.numeric, style)} />;
}

function Caption({ style, ...props }: TableCaptionProps) {
  return <caption {...props} {...stylex.props(styles.caption, style)} />;
}

const Table = { Scroll, Root, Head, Body, Foot, Row, HeadCell, SortButton, Cell, Caption };

export {
  Table,
  type TableScrollProps,
  type TableRootProps,
  type TableHeadProps,
  type TableBodyProps,
  type TableFootProps,
  type TableRowProps,
  type TableHeadCellProps,
  type TableSortButtonProps,
  type TableCellProps,
  type TableCaptionProps,
  type TableSort,
};
