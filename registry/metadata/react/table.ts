import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'table',
  kind: 'react',
  title: 'Table',
  description: 'A data table as native table parts, with an optional caption and scroll region.',
  contract: 'docs/spec/ultima.md#the-v0-set',
  installDocs: "import { Table } from '@/components/ui/table';\n\n<Table.Root>\n  <Table.Caption>Latency by region</Table.Caption>\n  <Table.Head>\n    <Table.Row>\n      <Table.HeadCell>Region</Table.HeadCell>\n    </Table.Row>\n  </Table.Head>\n  <Table.Body>\n    <Table.Row>\n      <Table.Cell>us-east-1</Table.Cell>\n    </Table.Row>\n  </Table.Body>\n</Table.Root>",
  primaryExport: 'Table',
  release: 'v0',
  order: 4,
  group: 'data-display',
} satisfies ReactDescriptor;
