import * as stylex from '@stylexjs/stylex';
import { areaY } from '@tanstack/charts/area';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { scalePoint } from '@tanstack/charts/scales/point';
import { defineChart } from '@tanstack/charts/scene';
import { stackRowsY } from '@tanstack/charts/transform/stack';
import { space } from '@ultima/tokens/tokens.stylex';
import { Chart, Table } from '@ultima/ui';

const kinds = ['Video', 'Images', 'Documents'] as const;

const months = [
  { month: 'Jan', Video: 410, Images: 260, Documents: 90 },
  { month: 'Feb', Video: 460, Images: 280, Documents: 95 },
  { month: 'Mar', Video: 530, Images: 300, Documents: 105 },
  { month: 'Apr', Video: 590, Images: 330, Documents: 110 },
  { month: 'May', Video: 640, Images: 350, Documents: 120 },
  { month: 'Jun', Video: 720, Images: 370, Documents: 130 },
];

/**
 * `stackRowsY` adds each kind's `y1` and `y2`, its band's base and top, in the order the kinds first
 * appear, so Video sits on the baseline and Documents on top.
 */
const data = stackRowsY(
  months.flatMap((row) => kinds.map((kind) => ({ month: row.month, kind, gigabytes: row[kind] }))),
  { x: 'month', y: 'gigabytes', z: 'kind' },
);

const definition = defineChart({
  marks: [areaY(data, { x: 'x', y1: 'y1', y2: 'y2', color: 'z' })],
  scales: {
    x: { scale: scalePoint },
    y: { scale: scaleLinear, nice: true, grid: true, axis: { label: 'GB', ticks: { count: 4 } } },
  },
});

const styles = stylex.create({
  layout: {
    alignItems: 'flex-start',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-8'],
    inlineSize: '100%',
  },
  chart: {
    flexBasis: '22rem',
    flexGrow: 2,
  },
  table: {
    flexBasis: '16rem',
    flexGrow: 1,
  },
});

export default function AreaChart() {
  return (
    <div {...stylex.props(styles.layout)}>
      <Chart.Root aspectRatio={16 / 10} definition={definition} style={styles.chart}>
        <Chart.Caption>Storage used by file type</Chart.Caption>
        <Chart.Plot />
        <Chart.Legend />
      </Chart.Root>
      <Table.Root style={styles.table}>
        <Table.Caption>Storage used by file type, in GB</Table.Caption>
        <Table.Head>
          <Table.Row>
            <Table.HeadCell>Month</Table.HeadCell>
            {kinds.map((kind) => (
              <Table.HeadCell key={kind} numeric>
                {kind}
              </Table.HeadCell>
            ))}
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {months.map((row) => (
            <Table.Row key={row.month}>
              <Table.Cell>{row.month}</Table.Cell>
              {kinds.map((kind) => (
                <Table.Cell key={kind} numeric>
                  {row[kind]}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </div>
  );
}
