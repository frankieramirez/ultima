import { Badge, Table } from '@ultima/ui';

export default function Report() {
  return (
    <Table.Root>
      <Table.Caption>Component audit results</Table.Caption>
      <Table.Head>
        <Table.Row>
          <Table.HeadCell>Component</Table.HeadCell>
          <Table.HeadCell>Checks</Table.HeadCell>
          <Table.HeadCell>Status</Table.HeadCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        <Table.Row>
          <Table.Cell>Button</Table.Cell>
          <Table.Cell>18</Table.Cell>
          <Table.Cell>
            <Badge tone="success">Passing</Badge>
          </Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Dialog</Table.Cell>
          <Table.Cell>12</Table.Cell>
          <Table.Cell>
            <Badge tone="warning">Review</Badge>
          </Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table.Root>
  );
}
