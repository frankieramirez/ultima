import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Badge } from '@ultima/ui/badge';
import { Card } from '@ultima/ui/card';
import { Table } from '@ultima/ui/table';
import { useId } from 'react';

type Status = 'Paid' | 'Pending' | 'Refunded';

type Order = { order: string; customer: string; status: Status; total: string; date: string };

const orders: Order[] = [
  { order: '#3021', customer: 'Mara Lindqvist', status: 'Paid', total: '$420.00', date: 'Oct 6' },
  { order: '#3020', customer: 'Theo Okafor', status: 'Pending', total: '$186.50', date: 'Oct 6' },
  { order: '#3019', customer: 'Priya Raman', status: 'Paid', total: '$1,240.00', date: 'Oct 5' },
  { order: '#3018', customer: 'Jonas Weber', status: 'Refunded', total: '$74.00', date: 'Oct 5' },
  { order: '#3017', customer: 'Ines Duarte', status: 'Paid', total: '$312.40', date: 'Oct 4' },
  { order: '#3016', customer: 'Sam Whitfield', status: 'Paid', total: '$96.00', date: 'Oct 4' },
  { order: '#3015', customer: 'Hana Sato', status: 'Pending', total: '$548.20', date: 'Oct 3' },
  { order: '#3014', customer: 'Leo Marchetti', status: 'Paid', total: '$129.90', date: 'Oct 3' },
];

const tones = { Paid: 'success', Pending: 'warning', Refunded: 'danger' } as const;

const COLUMNS = 5;

const styles = stylex.create({
  head: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  viewAll: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-3'],
    fontWeight: font['--ult-font-weight-medium'],
    textDecorationLine: { default: 'none', ':hover': 'underline' },
  },
  table: {
    minInlineSize: `calc(9 * ${space['--ult-space-11']})`,
  },
  order: {
    fontFamily: font['--ult-font-mono'],
  },
});

export function RecentOrders({ query }: { query: string }) {
  const titleId = useId();
  const needle = query.trim().toLowerCase();
  const shown = orders.filter(
    (order) => order.order.toLowerCase().includes(needle) || order.customer.toLowerCase().includes(needle),
  );

  return (
    <Card.Root render={<section aria-labelledby={titleId} />}>
      <Card.Header style={styles.head}>
        <Card.Title id={titleId} render={<h2 />}>
          Recent orders
        </Card.Title>
        <a href="#orders" {...stylex.props(styles.viewAll)}>
          View all
        </a>
      </Card.Header>
      <Table.Scroll aria-label="Recent orders table">
        <Table.Root style={styles.table}>
          <Table.Head>
            <Table.Row>
              <Table.HeadCell>Order</Table.HeadCell>
              <Table.HeadCell>Customer</Table.HeadCell>
              <Table.HeadCell>Status</Table.HeadCell>
              <Table.HeadCell>Total</Table.HeadCell>
              <Table.HeadCell>Date</Table.HeadCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {shown.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={COLUMNS}>No orders match</Table.Cell>
              </Table.Row>
            ) : (
              shown.map((order) => (
                <Table.Row key={order.order}>
                  <Table.Cell style={styles.order}>{order.order}</Table.Cell>
                  <Table.Cell>{order.customer}</Table.Cell>
                  <Table.Cell>
                    <Badge tone={tones[order.status]}>{order.status}</Badge>
                  </Table.Cell>
                  <Table.Cell>{order.total}</Table.Cell>
                  <Table.Cell>{order.date}</Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table.Root>
      </Table.Scroll>
    </Card.Root>
  );
}
