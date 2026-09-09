import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Table } from '@ultima/ui';

const styles = stylex.create({
  region: { overflowX: 'auto' },
  table: { minWidth: '48rem' },
  note: { marginBlockEnd: space['--ult-space-4'], marginBlockStart: 0 },
});

export default function HorizontalScroll() {
  return (
    <div>
      <p {...stylex.props(styles.note)}>Tab to the labelled region, then scroll it horizontally.</p>
      <div role="region" aria-label="Deployment matrix" tabIndex={0} {...stylex.props(styles.region)}>
        <Table.Root style={styles.table}>
          <Table.Caption>Deployment status by environment</Table.Caption>
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
            <Table.Row>
              <Table.HeadCell scope="row">Components</Table.HeadCell>
              <Table.Cell>Ready</Table.Cell>
              <Table.Cell>Ready</Table.Cell>
              <Table.Cell>Pending</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </div>
    </div>
  );
}
