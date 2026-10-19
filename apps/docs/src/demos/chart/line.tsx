import * as stylex from '@stylexjs/stylex';
import { lineY } from '@tanstack/charts/line';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { scalePoint } from '@tanstack/charts/scales/point';
import { defineChart } from '@tanstack/charts/scene';
import { space } from '@ultima/tokens/tokens.stylex';
import { Chart, Table } from '@ultima/ui';

const platforms = ['Web', 'iOS', 'Android'] as const;

const months = [
  { month: 'Jan', Web: 48_200, iOS: 31_400, Android: 22_900 },
  { month: 'Feb', Web: 51_600, iOS: 33_800, Android: 25_100 },
  { month: 'Mar', Web: 50_300, iOS: 37_200, Android: 28_600 },
  { month: 'Apr', Web: 54_900, iOS: 39_500, Android: 30_200 },
  { month: 'May', Web: 57_100, iOS: 42_700, Android: 33_900 },
  { month: 'Jun', Web: 55_800, iOS: 46_100, Android: 36_400 },
];

/** One row per month and platform: the `color` channel groups the rows into one line each. */
const data = months.flatMap((row) => platforms.map((platform) => ({ month: row.month, platform, users: row[platform] })));

const thousands = new Intl.NumberFormat('en-US');
const compact = new Intl.NumberFormat('en-US', { notation: 'compact' });

const definition = defineChart({
  marks: [lineY(data, { x: 'month', y: 'users', color: 'platform', points: true })],
  scales: {
    x: { scale: () => scalePoint<string>().padding(0.25) },
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
    flexBasis: '16rem',
    flexGrow: 1,
  },
});

export default function LineChart() {
  return (
    <div {...stylex.props(styles.layout)}>
      <Chart.Root aspectRatio={16 / 10} definition={definition} style={styles.chart}>
        <Chart.Caption>Monthly active users by platform</Chart.Caption>
        <Chart.Plot />
        <Chart.Legend />
      </Chart.Root>
      <Table.Root style={styles.table}>
        <Table.Caption>Monthly active users by platform</Table.Caption>
        <Table.Head>
          <Table.Row>
            <Table.HeadCell>Month</Table.HeadCell>
            {platforms.map((platform) => (
              <Table.HeadCell key={platform} numeric>
                {platform}
              </Table.HeadCell>
            ))}
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {months.map((row) => (
            <Table.Row key={row.month}>
              <Table.Cell>{row.month}</Table.Cell>
              {platforms.map((platform) => (
                <Table.Cell key={platform} numeric>
                  {thousands.format(row[platform])}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </div>
  );
}
