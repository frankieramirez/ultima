import * as stylex from '@stylexjs/stylex';
import { createRef } from 'react';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Table,
  type TableCaptionProps,
  type TableCellProps,
  type TableHeadCellProps,
  type TableRootProps,
  type TableRowProps,
  type TableScrollProps,
} from '@ultima/ui';

const styles = stylex.create({
  viewport: { maxWidth: '20rem' },
  wide: { minWidth: '48rem' },
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
