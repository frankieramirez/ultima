import { Badge, Table } from '@ultima/ui';

export default function InTable() {
  return (
    <Table.Root>
      <Table.Caption>Release checks</Table.Caption>
      <Table.Head>
        <Table.Row>
          <Table.HeadCell>Check</Table.HeadCell>
          <Table.HeadCell>Status</Table.HeadCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        <Table.Row>
          <Table.Cell>Contrast</Table.Cell>
          <Table.Cell>
            <Badge tone="success">Passing</Badge>
          </Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Bundle</Table.Cell>
          <Table.Cell>
            <Badge tone="warning">Review</Badge>
          </Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table.Root>
  );
}
