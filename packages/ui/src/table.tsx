'use client';

import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps, PlainProps } from '@ultima/ui/lib/component';

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
  caption: {
    captionSide: 'bottom',
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-3'],
    padding: space['--ult-space-3'],
  },
});

type TableRootProps = PartProps<useRender.ComponentProps<'table'>>;
type TableHeadProps = PlainProps<'thead'>;
type TableBodyProps = PlainProps<'tbody'>;
type TableRowProps = PlainProps<'tr'>;
type TableHeadCellProps = PlainProps<'th'>;
type TableCellProps = PlainProps<'td'>;
type TableCaptionProps = PlainProps<'caption'>;

/** There is no scroll wrapper: a consumer needing horizontal scroll wraps this in a `tabIndex={0}` region. */
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

function HeadCell({ scope = 'col', style, ...props }: TableHeadCellProps) {
  return <th scope={scope} {...props} {...stylex.props(styles.headCell, style)} />;
}

function Cell({ style, ...props }: TableCellProps) {
  return <td {...props} {...stylex.props(styles.cell, style)} />;
}

function Caption({ style, ...props }: TableCaptionProps) {
  return <caption {...props} {...stylex.props(styles.caption, style)} />;
}

const Table = { Root, Head, Body, Row, HeadCell, Cell, Caption };

export {
  Table,
  type TableRootProps,
  type TableHeadProps,
  type TableBodyProps,
  type TableRowProps,
  type TableHeadCellProps,
  type TableCellProps,
  type TableCaptionProps,
};
