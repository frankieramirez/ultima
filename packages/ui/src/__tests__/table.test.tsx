import * as stylex from '@stylexjs/stylex';
import { createRef } from 'react';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Button,
  Table,
  type TableCaptionProps,
  type TableCellProps,
  type TableHeadCellProps,
  type TableRootProps,
  type TableRowProps,
  type TableScrollProps,
  type TableSort,
  type TableSortButtonProps,
} from '@ultima/ui';

/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: no axes, so one shape per part, and a bare table is the default.
 * 2. The name resolves: role table, named by Table.Caption; the scroll region by aria-labelledby.
 * 3. The focus ring lands where the contract says: on Table.Scroll; every other part renders none,
 *    Table.SortButton included, because it is a wrapper trigger and the ring comes from `render`.
 * 4. The primitive is still wired: none for the native parts; useRender's render and ref reach
 *    Table.Root and Table.HeadCell, and its state mapping is what emits aria-sort.
 * 5. Documented state drives its style: `sort` on Table.HeadCell emits aria-sort and data-sort, and
 *    a style keyed off data-sort resolves per value. Table paints nothing off it; the glyph is the
 *    consumer's, so the style under test is the one the docs demo writes.
 * 6. Typecheck passes: className is rejected, TableSort is exactly the three aria-sort tokens.
 * 7. Behavior this component wires itself: Table.Scroll taking focus and scrolling its own overflow.
 * 8. CSS the primitive reads: none. No Table part depends on CSS a primitive supplies.
 */

const styles = stylex.create({
  viewport: { maxWidth: '20rem' },
  wide: { minWidth: '48rem' },
  turns: { rotate: { default: '0deg', ':is([data-sort="descending"])': '180deg' } },
});

function FullTable() {
  return (
    <Table.Root data-testid="root">
      <Table.Caption>Latency by region</Table.Caption>
      <Table.Head>
        <Table.Row>
          <Table.HeadCell>Region</Table.HeadCell>
          <Table.HeadCell>p95</Table.HeadCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        <Table.Row>
          <Table.Cell>us-east-1</Table.Cell>
          <Table.Cell>184ms</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table.Root>
  );
}

function SortableTable({ sort }: { sort?: TableSort }) {
  return (
    <Table.Root>
      <Table.Caption>Latency by region</Table.Caption>
      <Table.Head>
        <Table.Row>
          <Table.HeadCell data-testid="sortable" sort={sort} style={styles.turns}>
            <Table.SortButton render={<Button variant="ghost" />}>Region</Table.SortButton>
          </Table.HeadCell>
          <Table.HeadCell data-testid="plain">p95</Table.HeadCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        <Table.Row>
          <Table.Cell>us-east-1</Table.Cell>
          <Table.Cell>184ms</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table.Root>
  );
}

function ScrollingTable() {
  return (
    <Table.Scroll aria-labelledby="deployments" data-testid="scroll" style={styles.viewport}>
      <Table.Root style={styles.wide}>
        <Table.Caption id="deployments">Deployment status by environment</Table.Caption>
        <Table.Head>
          <Table.Row>
            <Table.HeadCell>Package</Table.HeadCell>
            <Table.HeadCell>Development</Table.HeadCell>
            <Table.HeadCell>Preview</Table.HeadCell>
            <Table.HeadCell>Production</Table.HeadCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.HeadCell scope="row">Tokens</Table.HeadCell>
            <Table.Cell>Ready</Table.Cell>
            <Table.Cell>Ready</Table.Cell>
            <Table.Cell>Ready</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>
    </Table.Scroll>
  );
}

/** `data-style-src` is StyleX's development source marker, not a component state. */
function stateAttributes(element: Element) {
  return element.getAttributeNames().filter((name) => name.startsWith('data-') && name !== 'data-style-src');
}

test('every part mounts as its own element inside a valid table', async () => {
  const screen = await render(<FullTable />);
  const root = screen.getByTestId('root').element();
  expect(root.tagName).toBe('TABLE');
  expect(root.querySelector('caption')?.textContent).toBe('Latency by region');
  expect(root.querySelectorAll('thead > tr > th')).toHaveLength(2);
  expect(root.querySelectorAll('tbody > tr > td')).toHaveLength(2);
});

test('the table, its head cells, and its cells resolve by role', async () => {
  const screen = await render(<FullTable />);
  await expect.element(screen.getByRole('columnheader', { name: 'Region' })).toBeVisible();
  await expect.element(screen.getByRole('cell', { name: 'us-east-1' })).toBeVisible();
  expect(screen.getByRole('cell').elements()).toHaveLength(2);
});

test('the caption gives the table its accessible name', async () => {
  const screen = await render(<FullTable />);
  await expect.element(screen.getByRole('table', { name: 'Latency by region' })).toBeVisible();
});

test('tabbing through the table focuses nothing inside it', async () => {
  const screen = await render(<FullTable />);
  const root = screen.getByTestId('root').element();
  await userEvent.tab();
  expect(root.contains(document.activeElement)).toBe(false);
  expect(root).not.toHaveAttribute('tabindex');
  for (const part of root.querySelectorAll('*')) {
    expect(getComputedStyle(part).outlineStyle).toBe('none');
  }
});

test('render and ref reach the root element', async () => {
  const ref = createRef<HTMLTableElement>();
  const screen = await render(
    <Table.Root ref={ref} render={<table data-custom="yes" />}>
      <Table.Body>
        <Table.Row>
          <Table.Cell>Custom</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table.Root>,
  );
  const root = screen.getByRole('table').element();
  expect(ref.current).toBe(root);
  expect(root).toHaveAttribute('data-custom', 'yes');
});

test('a head cell defaults to scope col and takes scope row through props', async () => {
  const screen = await render(
    <Table.Root>
      <Table.Body>
        <Table.Row>
          <Table.HeadCell scope="row">us-east-1</Table.HeadCell>
          <Table.HeadCell>p95</Table.HeadCell>
        </Table.Row>
      </Table.Body>
    </Table.Root>,
  );
  expect(screen.getByText('us-east-1').element()).toHaveAttribute('scope', 'row');
  expect(screen.getByText('p95').element()).toHaveAttribute('scope', 'col');
  await expect.element(screen.getByRole('rowheader', { name: 'us-east-1' })).toBeVisible();
});

test('the table carries no state: no part emits a data attribute of its own', async () => {
  const screen = await render(<FullTable />);
  const root = screen.getByTestId('root').element();
  for (const part of root.querySelectorAll('*')) {
    expect(stateAttributes(part)).toEqual([]);
  }
});

test('the scroll region is a div that overflows, takes focus, and shows the ring', async () => {
  const screen = await render(<ScrollingTable />);
  const region = screen.getByTestId('scroll').element() as HTMLElement;
  expect(region.tagName).toBe('DIV');
  expect(region.scrollWidth).toBeGreaterThan(region.clientWidth);
  await userEvent.tab();
  expect(document.activeElement).toBe(region);
  const ring = getComputedStyle(region);
  expect(ring.outlineStyle).toBe('solid');
  expect(ring.outlineWidth).not.toBe('0px');
});

test('the caption names the scroll region through aria-labelledby', async () => {
  const screen = await render(<ScrollingTable />);
  await expect
    .element(screen.getByRole('region', { name: 'Deployment status by environment' }))
    .toBeVisible();
});

test('a focused scroll region scrolls with the arrow keys', async () => {
  const screen = await render(<ScrollingTable />);
  const region = screen.getByTestId('scroll').element() as HTMLElement;
  await userEvent.tab();
  expect(document.activeElement).toBe(region);
  await userEvent.keyboard('{ArrowRight}');
  await expect.poll(() => region.scrollLeft).toBeGreaterThan(0);
});

for (const sort of ['ascending', 'descending', 'none'] as const) {
  test(`sort ${sort} emits aria-sort and data-sort on a head cell that keeps its scope`, async () => {
    const screen = await render(<SortableTable sort={sort} />);
    const cell = screen.getByTestId('sortable').element();
    expect(cell.tagName).toBe('TH');
    expect(cell).toHaveAttribute('aria-sort', sort);
    expect(cell).toHaveAttribute('data-sort', sort);
    expect(cell).toHaveAttribute('scope', 'col');
    await expect.element(screen.getByRole('columnheader', { name: 'Region' })).toBeVisible();
  });
}

test('a head cell with no sort emits neither attribute and still scopes its column', async () => {
  const screen = await render(<SortableTable />);
  const cell = screen.getByTestId('sortable').element();
  expect(cell).not.toHaveAttribute('aria-sort');
  expect(cell).not.toHaveAttribute('data-sort');
  expect(cell).toHaveAttribute('scope', 'col');
  expect(screen.getByTestId('plain').element()).toHaveAttribute('scope', 'col');
});

test('data-sort drives a style keyed off it, so the consumer can turn a caret', async () => {
  const screen = await render(
    <Table.Root>
      <Table.Head>
        <Table.Row>
          <Table.HeadCell data-testid="up" sort="ascending" style={styles.turns}>
            Region
          </Table.HeadCell>
          <Table.HeadCell data-testid="down" sort="descending" style={styles.turns}>
            p95
          </Table.HeadCell>
        </Table.Row>
      </Table.Head>
    </Table.Root>,
  );
  const up = getComputedStyle(screen.getByTestId('up').element()).rotate;
  const down = getComputedStyle(screen.getByTestId('down').element()).rotate;
  expect(up).not.toBe(down);
  expect(down).not.toBe('none');
});

test('render and ref reach a head cell, and sort survives the substituted element', async () => {
  const ref = createRef<HTMLTableCellElement>();
  const screen = await render(
    <Table.Root>
      <Table.Head>
        <Table.Row>
          <Table.HeadCell ref={ref} render={<th data-custom="yes" />} sort="ascending">
            Region
          </Table.HeadCell>
        </Table.Row>
      </Table.Head>
    </Table.Root>,
  );
  const cell = screen.getByRole('columnheader', { name: 'Region' }).element();
  expect(ref.current).toBe(cell);
  expect(cell).toHaveAttribute('data-custom', 'yes');
  expect(cell).toHaveAttribute('aria-sort', 'ascending');
  expect(cell).toHaveAttribute('data-sort', 'ascending');
});

test('a bare sort button is a button that contributes no class and no ring of its own', async () => {
  const screen = await render(
    <Table.Root>
      <Table.Head>
        <Table.Row>
          <Table.HeadCell sort="ascending">
            <Table.SortButton>Region</Table.SortButton>
          </Table.HeadCell>
        </Table.Row>
      </Table.Head>
    </Table.Root>,
  );
  const button = screen.getByRole('button', { name: 'Region' }).element();
  expect(button.tagName).toBe('BUTTON');
  expect(button).toHaveAttribute('type', 'button');
  expect(button.getAttribute('class')).toBe(null);
  await userEvent.tab();
  expect(document.activeElement).toBe(button);
  expect(getComputedStyle(button).outlineStyle).not.toBe('solid');
});

test('a Button rendered into the sort button keeps its own focus ring', async () => {
  const screen = await render(<SortableTable sort="ascending" />);
  const button = screen.getByRole('button', { name: 'Region' }).element();
  await userEvent.tab();
  expect(document.activeElement).toBe(button);
  const ring = getComputedStyle(button);
  expect(ring.outlineStyle).toBe('solid');
  expect(parseFloat(ring.outlineWidth)).toBeGreaterThan(0);
});

test('public prop types carry the style slot and no className', () => {
  expectTypeOf<TableRootProps>().not.toHaveProperty('className');
  expectTypeOf<TableCellProps>().not.toHaveProperty('className');
  expectTypeOf<TableCaptionProps>().not.toHaveProperty('className');
  expectTypeOf<TableRowProps>().not.toHaveProperty('render');
  expectTypeOf<TableRootProps>().toHaveProperty('render');
  expectTypeOf<TableHeadCellProps>().toHaveProperty('scope');
  expectTypeOf<TableCellProps>().toHaveProperty('style');
  expectTypeOf<TableScrollProps>().not.toHaveProperty('className');
  expectTypeOf<TableScrollProps>().toHaveProperty('style');
});

test('the sort parts type as a state prop and a wrapper trigger', () => {
  expectTypeOf<TableSort>().toEqualTypeOf<'ascending' | 'descending' | 'none'>();
  expectTypeOf<TableHeadCellProps>().toHaveProperty('sort');
  expectTypeOf<TableHeadCellProps>().toHaveProperty('render');
  expectTypeOf<TableHeadCellProps>().not.toHaveProperty('className');
  expectTypeOf<TableSortButtonProps>().toHaveProperty('render');
  expectTypeOf<TableSortButtonProps>().toHaveProperty('style');
  expectTypeOf<TableSortButtonProps>().not.toHaveProperty('className');
});
