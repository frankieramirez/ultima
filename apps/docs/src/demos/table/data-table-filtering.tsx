'use client';

import * as stylex from '@stylexjs/stylex';
import {
  type Column,
  columnFacetingFeature,
  columnFilteringFeature,
  createColumnHelper,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  filterFn_arrHas,
  globalFilteringFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button, DropdownMenu, Input, Table } from '@ultima/ui';
import { visuallyHidden } from '@ultima/ui/lib/visually-hidden';
import { useEffect, useRef, useState } from 'react';

// Filtering, and nothing else. v9 computes the table's type from this registration, so an omitted
// feature has no APIs at all. The faceted menu reads a faceting row model; the global search is
// `globalFilteringFeature`, which cannot run without column filtering, which is why a standalone
// search demo would register nearly this same set and split nothing.
const features = tableFeatures({
  columnFilteringFeature,
  columnFacetingFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  filterFns: { arrHas: filterFn_arrHas },
});

type Region = { region: string; area: string; p95: number; requests: number };

const data: Region[] = [
  { region: 'us-east-1', area: 'Americas', p95: 300, requests: 126_440 },
  { region: 'us-west-2', area: 'Americas', p95: 289, requests: 98_112 },
  { region: 'ca-central-1', area: 'Americas', p95: 275, requests: 41_208 },
  { region: 'sa-east-1', area: 'Americas', p95: 260, requests: 9_431 },
  { region: 'eu-west-1', area: 'Europe', p95: 212, requests: 48_109 },
  { region: 'eu-central-1', area: 'Europe', p95: 198, requests: 52_870 },
  { region: 'ap-south-1', area: 'Asia Pacific', p95: 128, requests: 18_204 },
  { region: 'il-central-1', area: 'Middle East', p95: 167, requests: 6_052 },
];

const helper = createColumnHelper<typeof features, Region>();
const columns = helper.columns([
  helper.accessor('region', { header: 'Region' }),
  helper.accessor('area', { header: 'Area', filterFn: 'arrHas' }),
  helper.accessor('p95', { header: 'p95', cell: (cell) => `${cell.getValue()}ms` }),
  helper.accessor('requests', { header: 'Requests', cell: (cell) => cell.getValue().toLocaleString('en-US') }),
]);

const styles = stylex.create({
  controls: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-4'],
    marginBlockEnd: space['--ult-space-4'],
  },
  search: { flexGrow: 1 },
  note: { marginBlockEnd: space['--ult-space-4'], marginBlockStart: 0 },
});

export default function DataTableFiltering() {
  const table = useTable({ features, columns, data });
  const rows = table.getRowModel().rows;
  const area = table.getColumn('area');

  return (
    <div>
      <p {...stylex.props(styles.note)}>Filter by area or search every column at once. The visible count is announced as well as shown.</p>
      <div {...stylex.props(styles.controls)}>
        {area ? <AreaFilter column={area} /> : null}
        <Input
          aria-label="Search regions"
          onValueChange={(value) => table.setGlobalFilter(value)}
          placeholder="Search regions"
          style={styles.search}
          type="search"
        />
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
      <FilteredAnnouncement shown={rows.length} total={table.getPreFilteredRowModel().rows.length} />
    </div>
  );
}

function AreaFilter({ column }: { column: Column<typeof features, Region> }) {
  const selected = (column.getFilterValue() as string[] | undefined) ?? [];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger render={<Button variant="outline" />}>Filter by area</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Positioner sideOffset={8}>
          <DropdownMenu.Popup>
            {[...column.getFacetedUniqueValues()].map(([value, count]) => (
              <DropdownMenu.CheckboxItem
                checked={selected.includes(value)}
                closeOnClick={false}
                key={value}
                onCheckedChange={(checked) => {
                  const next = checked ? [...selected, value] : selected.filter((entry) => entry !== value);
                  column.setFilterValue(next.length > 0 ? next : undefined);
                }}
              >
                {`${value} (${count})`}
                <DropdownMenu.CheckboxItemIndicator />
              </DropdownMenu.CheckboxItem>
            ))}
          </DropdownMenu.Popup>
        </DropdownMenu.Positioner>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function FilteredAnnouncement({ shown, total }: { shown: number; total: number }) {
  const count = `Showing ${shown} of ${total} rows.`;
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
