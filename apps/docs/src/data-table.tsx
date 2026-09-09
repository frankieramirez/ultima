import * as stylex from '@stylexjs/stylex';
import { border, color, font, space, text } from '@ultima/tokens/tokens.stylex';
import type { ComponentProps, ReactNode } from 'react';

const styles = stylex.create({
  wrap: {
    marginBlockStart: space['--ult-space-6'],
    overflowX: 'auto',
  },
  table: {
    borderCollapse: 'collapse',
    fontSize: text['--ult-text-3'],
    width: '100%',
  },
  th: {
    borderBottomColor: color['--ult-color-border-strong'],
    borderBottomStyle: 'solid',
    borderBottomWidth: border.hairline,
    color: color['--ult-color-text'],
    fontWeight: font['--ult-font-weight-semibold'],
    paddingBlock: space['--ult-space-3'],
    paddingInline: space['--ult-space-4'],
    textAlign: 'left',
  },
  td: {
    borderBottomColor: color['--ult-color-border'],
    borderBottomStyle: 'solid',
    borderBottomWidth: border.hairline,
    color: color['--ult-color-text'],
    paddingBlock: space['--ult-space-3'],
    paddingInline: space['--ult-space-4'],
  },
  mono: {
    fontFamily: font['--ult-font-mono'],
  },
  numeric: {
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
  },
});

const widths = stylex.create({
  min: (value: string) => ({ minWidth: value }),
});

export function DataTable({
  columns,
  minWidth,
  children,
}: {
  columns: { label: string; numeric?: boolean }[];
  minWidth: string;
  children: ReactNode;
}) {
  return (
    <div {...stylex.props(styles.wrap)}>
      <table {...stylex.props(styles.table, widths.min(minWidth))}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.label}
                scope="col"
                {...stylex.props(styles.th, column.numeric && styles.numeric)}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  mono,
  numeric,
  ...props
}: ComponentProps<'td'> & { mono?: boolean; numeric?: boolean }) {
  return <td {...props} {...stylex.props(styles.td, mono && styles.mono, numeric && styles.numeric)} />;
}
