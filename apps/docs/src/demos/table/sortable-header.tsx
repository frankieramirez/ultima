import * as stylex from '@stylexjs/stylex';
import { motion, space } from '@ultima/tokens/tokens.stylex';
import { Button, Table, type TableSort } from '@ultima/ui';
import type { ReactNode } from 'react';

const styles = stylex.create({
  note: { marginBlockEnd: space['--ult-space-4'], marginBlockStart: 0 },
  cell: { paddingBlock: 0, paddingInline: 0 },
  trigger: {
    color: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    inlineSize: '100%',
    justifyContent: 'flex-start',
    letterSpacing: 'inherit',
    textTransform: 'inherit',
  },
  caret: {
    opacity: { default: '1', ':is([data-sort="none"])': '0.4' },
    rotate: { default: '0deg', ':is([data-sort="descending"])': '180deg' },
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'rotate',
  },
});

export default function SortableHeader() {
  return (
    <div>
      <p {...stylex.props(styles.note)}>
        Three static headers, one for each sort value. The buttons press; sorting the rows is the Data Table
        recipe's job rather than the part's.
      </p>
      <Table.Root>
        <Table.Caption>Latency by region, sorted by region</Table.Caption>
        <Table.Head>
          <Table.Row>
            <SortableColumn sort="ascending">Region</SortableColumn>
            <SortableColumn sort="descending">p95</SortableColumn>
            <SortableColumn sort="none">Requests</SortableColumn>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.Cell>eu-west-1</Table.Cell>
            <Table.Cell>212ms</Table.Cell>
            <Table.Cell>48,109</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>us-east-1</Table.Cell>
            <Table.Cell>184ms</Table.Cell>
            <Table.Cell>126,440</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>
    </div>
  );
}

function SortableColumn({ children, sort }: { children: ReactNode; sort: TableSort }) {
  return (
    <Table.HeadCell sort={sort} style={styles.cell}>
      <Table.SortButton render={<Button size="sm" style={styles.trigger} variant="ghost" />}>
        {children}
        <Caret sort={sort} />
      </Table.SortButton>
    </Table.HeadCell>
  );
}

function Caret({ sort }: { sort: TableSort }) {
  return (
    <svg
      aria-hidden="true"
      data-sort={sort}
      fill="none"
      height="12"
      viewBox="0 0 12 12"
      width="12"
      {...stylex.props(styles.caret)}
    >
      <path d="M2.5 7.5 6 4l3.5 3.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}
