'use client';

import * as stylex from '@stylexjs/stylex';
import {
  createColumnHelper,
  createPaginatedRowModel,
  type PaginationState,
  type ReactTable,
  rowPaginationFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { space } from '@ultima/tokens/tokens.stylex';
import { Pagination, Select, Table } from '@ultima/ui';
import { useEffect, useRef, useState } from 'react';

// Pagination, and nothing else. v9 computes the table's type from this registration, so an omitted
// feature has no APIs at all; each example registers its own set.
const features = tableFeatures({
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

type Region = { region: string; p95: number; requests: number };

const data: Region[] = [
  { region: 'us-east-1', p95: 300, requests: 126_440 },
  { region: 'us-east-2', p95: 298, requests: 118_902 },
  { region: 'us-west-1', p95: 311, requests: 87_554 },
  { region: 'us-west-2', p95: 289, requests: 98_112 },
  { region: 'ca-central-1', p95: 275, requests: 41_208 },
  { region: 'eu-west-1', p95: 212, requests: 48_109 },
  { region: 'eu-west-2', p95: 224, requests: 39_761 },
  { region: 'eu-west-3', p95: 231, requests: 22_043 },
  { region: 'eu-central-1', p95: 198, requests: 52_870 },
  { region: 'eu-central-2', p95: 207, requests: 15_316 },
  { region: 'eu-north-1', p95: 185, requests: 19_642 },
  { region: 'eu-south-1', p95: 240, requests: 8_977 },
  { region: 'eu-south-2', p95: 244, requests: 7_301 },
  { region: 'ap-south-1', p95: 128, requests: 18_204 },
  { region: 'ap-south-2', p95: 142, requests: 9_860 },
  { region: 'ap-southeast-1', p95: 151, requests: 33_415 },
  { region: 'ap-southeast-2', p95: 158, requests: 27_590 },
  { region: 'ap-southeast-3', p95: 166, requests: 11_084 },
  { region: 'ap-northeast-1', p95: 136, requests: 44_127 },
  { region: 'ap-northeast-2', p95: 133, requests: 21_463 },
  { region: 'il-central-1', p95: 167, requests: 6_052 },
  { region: 'me-south-1', p95: 178, requests: 5_418 },
  { region: 'af-south-1', p95: 196, requests: 4_229 },
  { region: 'sa-east-1', p95: 260, requests: 9_431 },
];

const helper = createColumnHelper<typeof features, Region>();
const columns = helper.columns([
  helper.accessor('region', { header: 'Region' }),
  helper.accessor('p95', { header: 'p95', cell: (cell) => `${cell.getValue()}ms` }),
  helper.accessor('requests', { header: 'Requests', cell: (cell) => cell.getValue().toLocaleString('en-US') }),
]);

const pageSizes = [
  { label: '5 rows', value: '5' },
  { label: '10 rows', value: '10' },
  { label: '20 rows', value: '20' },
];

const styles = stylex.create({
  controls: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-4'],
    justifyContent: 'space-between',
  },
  nav: { maxInlineSize: '100%' },
  list: { flexWrap: 'wrap' },
  above: { marginBlockEnd: space['--ult-space-4'] },
  below: { marginBlockStart: space['--ult-space-4'] },
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

export default function DataTablePagination() {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 5 });
  const table = useTable({
    features,
    columns,
    data,
    state: { pagination },
    onPaginationChange: setPagination,
  });
  const rows = table.getRowModel().rows;
  const page = pagination.pageIndex + 1;
  const count = table.getPageCount();
  const first = pagination.pageIndex * pagination.pageSize + 1;

  return (
    <div>
      <p {...stylex.props(styles.note)}>Page through the table or change the page size. The visible range is announced as well as shown.</p>
      <div {...stylex.props(styles.controls, styles.above)}>
        <TablePagination count={count} label="Pagination above the table" page={page} table={table} />
      </div>
      <Table.Root>
        <Table.Caption>Latency by region</Table.Caption>
        <Table.Head>
          {table.getHeaderGroups().map((group) => (
            <Table.Row key={group.id}>
              {group.headers.map((header) => (
                <Table.HeadCell key={header.id}>
                  <table.FlexRender header={header} />
                </Table.HeadCell>
              ))}
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
      <div {...stylex.props(styles.controls, styles.below)}>
        <TablePagination count={count} label="Pagination below the table" page={page} table={table} />
        <Select.Root items={pageSizes} onValueChange={(value) => table.setPageSize(Number(value))} value={String(pagination.pageSize)}>
          <Select.Trigger aria-label="Rows per page">
            <Select.Value />
            <Select.Icon />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner sideOffset={8}>
              <Select.Popup>
                <Select.List>
                  {pageSizes.map((item) => (
                    <Select.Item key={item.value} value={item.value}>
                      <Select.ItemIndicator />
                      <Select.ItemText>{item.label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </div>
      <PageRangeAnnouncement first={first} last={first + rows.length - 1} total={table.getRowCount()} />
    </div>
  );
}

// One control, two landmarks: the demo mounts the same pagination above and below the table, so
// each `nav` takes its own name, the rule any page with two of a landmark already follows.
function TablePagination({ table, page, count, label }: { table: ReactTable<typeof features, Region>; page: number; count: number; label: string }) {
  return (
    <Pagination.Root aria-label={label} style={styles.nav}>
      <Pagination.List style={styles.list}>
        <Pagination.Item>
          <Pagination.Previous disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()} render={<button type="button" />}>
            Previous
          </Pagination.Previous>
        </Pagination.Item>
        {Pagination.getPages({ page, count }).map((entry, index) =>
          entry.type === 'ellipsis' ? (
            <Pagination.Item key={`gap-${index}`}>
              <Pagination.Ellipsis />
            </Pagination.Item>
          ) : (
            <Pagination.Item key={entry.page}>
              <Pagination.Page current={entry.page === page} onClick={() => table.setPageIndex(entry.page - 1)} render={<button type="button" />}>
                {entry.page}
              </Pagination.Page>
            </Pagination.Item>
          ),
        )}
        <Pagination.Item>
          <Pagination.Next disabled={!table.getCanNextPage()} onClick={() => table.nextPage()} render={<button type="button" />}>
            Next
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.List>
    </Pagination.Root>
  );
}

function PageRangeAnnouncement({ first, last, total }: { first: number; last: number; total: number }) {
  const range = `Showing ${first} through ${last} of ${total} rows.`;
  const [announcement, setAnnouncement] = useState('');
  const lastAnnounced = useRef(range);

  useEffect(() => {
    if (lastAnnounced.current === range) return;
    lastAnnounced.current = range;
    setAnnouncement(range);
  }, [range]);

  return (
    <span role="status" aria-atomic="true" {...stylex.props(styles.status)}>
      {announcement}
    </span>
  );
}
