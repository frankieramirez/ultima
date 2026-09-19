'use client';

import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps, PlainProps } from '@ultima/ui/lib/component';
import { useEffect, useState } from 'react';

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
  row: {
    backgroundColor: { default: 'transparent', ':hover': color['--ult-color-surface-hover'] },
  },
  headCell: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-wide'],
    paddingBlock: space['--ult-space-3'],
    paddingInline: space['--ult-space-4'],
    textAlign: 'left',
    textTransform: 'uppercase',
  },
  cell: {
    borderBlockEndColor: color['--ult-color-border'],
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: border.hairline,
    paddingBlock: space['--ult-space-3'],
    paddingInline: space['--ult-space-4'],
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
    padding: space['--ult-space-3'],
  },
});

type TableSort = 'ascending' | 'descending' | 'none';

type TableScrollProps = PlainProps<'div'>;
type TableRootProps = PartProps<useRender.ComponentProps<'table'>>;
type TableHeadProps = PlainProps<'thead'>;
type TableBodyProps = PlainProps<'tbody'>;
type TableRowProps = PlainProps<'tr'>;
type TableHeadCellProps = PartProps<useRender.ComponentProps<'th'>> & { sort?: TableSort };
type TableSortButtonProps = PartProps<useRender.ComponentProps<'button'>>;
type TableCellProps = PlainProps<'td'>;
type TableCaptionProps = PlainProps<'caption'>;

function useOverflows(element: HTMLDivElement | null): boolean {
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(() => setOverflows(element.scrollWidth > element.clientWidth));
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

function Row({ style, ...props }: TableRowProps) {
  return <tr {...props} {...stylex.props(styles.row, style)} />;
}

function HeadCell({ ref, render, scope = 'col', sort, style, ...props }: TableHeadCellProps) {
  return useRender({
    defaultTagName: 'th',
    ref,
    render,
    state: { sort },
    stateAttributesMapping: {
      sort: (value: TableSort | undefined): Record<string, string> | null =>
        value ? { 'aria-sort': value, 'data-sort': value } : null,
    },
    props: { scope, ...props, ...stylex.props(styles.headCell, style) },
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

function Cell({ style, ...props }: TableCellProps) {
  return <td {...props} {...stylex.props(styles.cell, style)} />;
}

function Caption({ style, ...props }: TableCaptionProps) {
  return <caption {...props} {...stylex.props(styles.caption, style)} />;
}

const Table = { Scroll, Root, Head, Body, Row, HeadCell, SortButton, Cell, Caption };

export {
  Table,
  type TableScrollProps,
  type TableRootProps,
  type TableHeadProps,
  type TableBodyProps,
  type TableRowProps,
  type TableHeadCellProps,
  type TableSortButtonProps,
  type TableCellProps,
  type TableCaptionProps,
  type TableSort,
};
