'use client';

import * as stylex from '@stylexjs/stylex';
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { motion, space } from '@ultima/tokens/tokens.stylex';
import { Button, Table, type TableSort } from '@ultima/ui';
import { useEffect, useRef, useState } from 'react';

// Word Joiner: invisible and zero-width. The same string twice is not a live-region change; this is.
const WORD_JOINER = '⁠';

function alwaysAChange(current: string, next: string) {
  return current === next ? `${next}${WORD_JOINER}` : next;
}

// Sorting, and nothing else. v9 computes the table's type from this registration, so an omitted
// feature has no APIs at all: reaching for the full set is the cost the opt-in design exists to
// avoid, and the next example registers its own.
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
});

type Region = { region: string; p95: number; requests: number };

const data: Region[] = [
  { region: 'us-east-1', p95: 300, requests: 126_440 },
  { region: 'eu-west-1', p95: 212, requests: 48_109 },
  { region: 'ap-south-1', p95: 128, requests: 18_204 },
  { region: 'sa-east-1', p95: 260, requests: 9_431 },
];

const helper = createColumnHelper<typeof features, Region>();
const columns = helper.columns([
  helper.accessor('region', { header: 'Region' }),
  helper.accessor('p95', { header: 'p95', cell: (cell) => `${cell.getValue()}ms` }),
  helper.accessor('requests', { header: 'Requests', cell: (cell) => cell.getValue().toLocaleString('en-US') }),
]);

const directions = { asc: 'ascending', desc: 'descending' } as const;

const styles = stylex.create({
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
  // Pre-mounted and clip-hidden. A region inserted with its text already in it is silent, and
  // `display: none` would keep it out of the accessibility tree.
  status: {
    clipPath: 'inset(50%)',
    height: '1px',
    overflow: 'hidden',
    position: 'absolute',
    whiteSpace: 'nowrap',
    width: '1px',
  },
  note: { marginBlockEnd: space['--ult-space-4'], marginBlockStart: 0 },
});

export default function DataTableSorting() {
  const table = useTable({ features, columns, data });
  const rows = table.getRowModel().rows;
  const sorting = table.state.sorting;

  return (
    <div>
      <p {...stylex.props(styles.note)}>Sort by any column. The order is announced as well as shown.</p>
      <Table.Root>
        <Table.Caption>Latency by region</Table.Caption>
        <Table.Head>
          {table.getHeaderGroups().map((group) => (
            <Table.Row key={group.id}>
              {group.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const sort: TableSort = sorted ? directions[sorted] : 'none';
                return (
                  <Table.HeadCell key={header.id} sort={sort} style={styles.cell}>
                    <Table.SortButton
                      onClick={header.column.getToggleSortingHandler()}
                      render={<Button size="sm" style={styles.trigger} variant="ghost" />}
                    >
                      <table.FlexRender header={header} />
                      <Caret sort={sort} />
                    </Table.SortButton>
                  </Table.HeadCell>
                );
              })}
            </Table.Row>
          ))}
        </Table.Head>
        <Table.Body>
          {rows.map((row) => (
            <Table.Row key={row.id}>
              {row.getAllCells().map((cell) => (
                <Table.Cell key={cell.id}>
                  <table.FlexRender cell={cell} />
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
      <RowOrderAnnouncement
        order={rows.map((row) => row.getValue('region')).join(', ')}
        sort={sorting.map((column) => `${column.id}:${column.desc}`).join()}
      />
    </div>
  );
}

function RowOrderAnnouncement({ order, sort }: { order: string; sort: string }) {
  const [message, setMessage] = useState('');
  const announced = useRef(sort);

  useEffect(() => {
    if (announced.current === sort) return;
    announced.current = sort;
    setMessage((current) => alwaysAChange(current, `Row order: ${order}.`));
  }, [order, sort]);

  return (
    <span role="status" aria-atomic="true" {...stylex.props(styles.status)}>
      {message}
    </span>
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
