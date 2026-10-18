import { Badge, Table } from '@ultima/ui';

const invoices = [
  { id: 'INV001', status: 'Paid', method: 'Credit card', amount: '$250.00' },
  { id: 'INV002', status: 'Pending', method: 'PayPal', amount: '$150.00' },
  { id: 'INV003', status: 'Unpaid', method: 'Bank transfer', amount: '$1,350.00' },
] as const;

const tones = { Paid: 'success', Pending: 'warning', Unpaid: 'danger' } as const;

export default function Totals() {
  return (
    <Table.Root>
      <Table.Caption>Recent invoices</Table.Caption>
      <Table.Head>
        <Table.Row>
          <Table.HeadCell>Invoice</Table.HeadCell>
          <Table.HeadCell>Status</Table.HeadCell>
          <Table.HeadCell>Method</Table.HeadCell>
          <Table.HeadCell numeric>Amount</Table.HeadCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {invoices.map((invoice) => (
          <Table.Row key={invoice.id}>
            <Table.Cell>{invoice.id}</Table.Cell>
            <Table.Cell>
              <Badge tone={tones[invoice.status]}>{invoice.status}</Badge>
            </Table.Cell>
            <Table.Cell>{invoice.method}</Table.Cell>
            <Table.Cell numeric>{invoice.amount}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
      <Table.Foot>
        <Table.Row>
          <Table.Cell colSpan={3}>Total</Table.Cell>
          <Table.Cell numeric>$1,750.00</Table.Cell>
        </Table.Row>
      </Table.Foot>
    </Table.Root>
  );
}
