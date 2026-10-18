import * as stylex from '@stylexjs/stylex';
import { barY } from '@tanstack/charts/bar';
import { scaleBand } from '@tanstack/charts/scales/band';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { defineChart } from '@tanstack/charts/scene';
import { space } from '@ultima/tokens/tokens.stylex';
import { Chart, Table } from '@ultima/ui';

const data = [
  { day: 'Mon', requests: 84_200 },
  { day: 'Tue', requests: 91_700 },
  { day: 'Wed', requests: 88_100 },
  { day: 'Thu', requests: 96_300 },
  { day: 'Fri', requests: 90_800 },
  { day: 'Sat', requests: 41_500 },
  { day: 'Sun', requests: 38_900 },
];

const thousands = new Intl.NumberFormat('en-US');
const compact = new Intl.NumberFormat('en-US', { notation: 'compact' });

const definition = defineChart({
  marks: [barY(data, { x: 'day', y: 'requests' })],
  scales: {
    x: { scale: () => scaleBand<string>().padding(0.35) },
    y: { scale: scaleLinear, nice: true, grid: true, axis: { ticks: { count: 4, format: (value: number) => compact.format(value) } } },
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
    flexBasis: '14rem',
    flexGrow: 1,
  },
});

export default function BarChart() {
  return (
    <div {...stylex.props(styles.layout)}>
      <Chart.Root aspectRatio={16 / 10} definition={definition} style={styles.chart}>
        <Chart.Caption>Requests per weekday</Chart.Caption>
        <Chart.Plot />
      </Chart.Root>
      <Table.Root style={styles.table}>
        <Table.Caption>Requests per weekday</Table.Caption>
        <Table.Head>
          <Table.Row>
            <Table.HeadCell>Day</Table.HeadCell>
            <Table.HeadCell>Requests</Table.HeadCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {data.map((row) => (
            <Table.Row key={row.day}>
              <Table.Cell>{row.day}</Table.Cell>
              <Table.Cell>{thousands.format(row.requests)}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </div>
  );
}
