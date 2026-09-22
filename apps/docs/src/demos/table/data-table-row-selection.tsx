'use client';

import * as stylex from '@stylexjs/stylex';
import {
  type CellContext,
  createColumnHelper,
  type HeaderContext,
  rowSelectionFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { space } from '@ultima/tokens/tokens.stylex';
import { Checkbox, Table } from '@ultima/ui';
import { visuallyHidden } from '@ultima/ui/lib/visually-hidden';
import { useEffect, useRef, useState } from 'react';

const features = tableFeatures({ rowSelectionFeature });

type Region = { region: string; p95: number; requests: number };

const data: Region[] = [
  { region: 'us-east-1', p95: 300, requests: 126_440 },
  { region: 'eu-west-1', p95: 212, requests: 48_109 },
  { region: 'ap-south-1', p95: 128, requests: 18_204 },
  { region: 'sa-east-1', p95: 260, requests: 9_431 },
];

const helper = createColumnHelper<typeof features, Region>();
const columns = helper.columns([
  helper.display({ id: 'select', header: SelectAll, cell: SelectRow }),
  helper.accessor('region', { header: 'Region' }),
  helper.accessor('p95', { header: 'p95', cell: (cell) => `${cell.getValue()}ms` }),
  helper.accessor('requests', { header: 'Requests', cell: (cell) => cell.getValue().toLocaleString('en-US') }),
]);

const styles = stylex.create({
  shrinkToContent: { width: 0 },
  note: { marginBlockEnd: space['--ult-space-4'], marginBlockStart: 0 },
});

export default function DataTableRowSelection() {
  const table = useTable({ features, columns, data });
  const rows = table.getRowModel().rows;

  return (
    <div>
      <p {...stylex.props(styles.note)}>Select rows one at a time or all at once. The count is announced as well as shown.</p>
      <Table.Root>
        <Table.Caption>Latency by region</Table.Caption>
        <Table.Head>
          {table.getHeaderGroups().map((group) => (
            <Table.Row key={group.id}>
              {group.headers.map((header) => (
                <Table.HeadCell key={header.id} style={header.column.id === 'select' ? styles.shrinkToContent : undefined}>
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
      <SelectionAnnouncement selected={table.getSelectedRowIds().length} shown={rows.length} />
    </div>
  );
}

function SelectAll({ table }: HeaderContext<typeof features, Region>) {
  const all = table.getIsAllRowsSelected();

  return (
    <Checkbox.Root
      aria-label="Select all regions"
      checked={all}
      indeterminate={table.getIsSomeRowsSelected() && !all}
      onCheckedChange={(checked) => table.toggleAllRowsSelected(checked)}
    >
      <Checkbox.Indicator />
    </Checkbox.Root>
  );
}

function SelectRow({ row }: CellContext<typeof features, Region>) {
  return (
    <Checkbox.Root
      aria-label={`Select ${row.original.region}`}
      checked={row.getIsSelected()}
      onCheckedChange={(checked) => row.toggleSelected(checked)}
    >
      <Checkbox.Indicator />
    </Checkbox.Root>
  );
}

function SelectionAnnouncement({ selected, shown }: { selected: number; shown: number }) {
  const count = `${shown} rows shown, ${selected} selected.`;
  const [announcement, setAnnouncement] = useState('');
  const lastAnnounced = useRef(count);

  useEffect(() => {
    if (lastAnnounced.current === count) return;
    lastAnnounced.current = count;
    setAnnouncement(count);
  }, [count]);

  return (
    <span role="status" aria-atomic="true" {...stylex.props(visuallyHidden)}>
      {announcement}
    </span>
  );
}
