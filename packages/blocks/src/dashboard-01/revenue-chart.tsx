import * as stylex from '@stylexjs/stylex';
import { barY } from '@tanstack/charts/bar';
import { scaleBand } from '@tanstack/charts/scales/band';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { defineChart } from '@tanstack/charts/scene';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button } from '@ultima/ui/button';
import { Card } from '@ultima/ui/card';
import { Chart } from '@ultima/ui/chart';
import { Collapsible } from '@ultima/ui/collapsible';
import { visuallyHidden } from '@ultima/ui/lib/visually-hidden';
import { Table } from '@ultima/ui/table';
import { ToggleGroup } from '@ultima/ui/toggle-group';
import { useId, useState } from 'react';

type Period = 'day' | 'week' | 'month';

type Series = { subtitle: string; unit: string; rows: { period: string; revenue: number }[] };

const series: Record<Period, Series> = {
  day: {
    subtitle: 'Daily, last 14 days',
    unit: 'day',
    rows: [
      { period: 'Sep 23', revenue: 1180 },
      { period: 'Sep 24', revenue: 1420 },
      { period: 'Sep 25', revenue: 1310 },
      { period: 'Sep 26', revenue: 1560 },
      { period: 'Sep 27', revenue: 1480 },
      { period: 'Sep 28', revenue: 1690 },
      { period: 'Sep 29', revenue: 1590 },
      { period: 'Sep 30', revenue: 1820 },
      { period: 'Oct 1', revenue: 1740 },
      { period: 'Oct 2', revenue: 1960 },
      { period: 'Oct 3', revenue: 1880 },
      { period: 'Oct 4', revenue: 2050 },
      { period: 'Oct 5', revenue: 1990 },
      { period: 'Oct 6', revenue: 2180 },
    ],
  },
  week: {
    subtitle: 'Weekly, last 12 weeks',
    unit: 'week',
    rows: [
      { period: 'Jul 20', revenue: 9100 },
      { period: 'Jul 27', revenue: 9640 },
      { period: 'Aug 3', revenue: 9380 },
      { period: 'Aug 10', revenue: 10120 },
      { period: 'Aug 17', revenue: 9870 },
      { period: 'Aug 24', revenue: 10560 },
      { period: 'Aug 31', revenue: 10340 },
      { period: 'Sep 7', revenue: 11020 },
      { period: 'Sep 14', revenue: 10780 },
      { period: 'Sep 21', revenue: 11450 },
      { period: 'Sep 28', revenue: 11290 },
      { period: 'Oct 5', revenue: 11960 },
    ],
  },
  month: {
    subtitle: 'Monthly, last 12 months',
    unit: 'month',
    rows: [
      { period: 'Nov', revenue: 31200 },
      { period: 'Dec', revenue: 38900 },
      { period: 'Jan', revenue: 29400 },
      { period: 'Feb', revenue: 30800 },
      { period: 'Mar', revenue: 33600 },
      { period: 'Apr', revenue: 35100 },
      { period: 'May', revenue: 36900 },
      { period: 'Jun', revenue: 38200 },
      { period: 'Jul', revenue: 40100 },
      { period: 'Aug', revenue: 42600 },
      { period: 'Sep', revenue: 45300 },
      { period: 'Oct', revenue: 48210 },
    ],
  },
};

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const compactDollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' });

/**
 * Fourteen day labels don't fit side by side, and the engine's collision thinning keeps an uneven set,
 * so the day window labels every other day.
 */
function revenueChart(rows: Series['rows'], stride = 1) {
  const labelled = rows.filter((_, index) => index % stride === 0).map((row) => row.period);
  return defineChart({
    marks: [barY(rows, { x: 'period', y: 'revenue' })],
    scales: {
      x: { scale: () => scaleBand<string>().padding(0.25), axis: { ticks: { values: labelled } } },
      y: { scale: scaleLinear, nice: true, grid: true, axis: { ticks: { count: 4, format: (value: number) => compactDollars.format(value) } } },
    },
  });
}

const definitions = { day: revenueChart(series.day.rows, 2), week: revenueChart(series.week.rows), month: revenueChart(series.month.rows) };

const styles = stylex.create({
  head: {
    alignItems: 'flex-start',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-5'],
    justifyContent: 'space-between',
  },
  headText: {
    paddingBlockEnd: 0,
  },
  period: {
    marginInline: space['--ult-space-6'],
    marginBlockStart: space['--ult-space-6'],
  },
  figure: {
    gap: space['--ult-space-5'],
  },
  disclosure: {
    alignSelf: 'flex-start',
  },
  panel: {
    paddingBlockStart: space['--ult-space-4'],
  },
});

export function RevenueChart() {
  const [period, setPeriod] = useState<Period>('day');
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const { subtitle, unit, rows } = series[period];

  return (
    <Card.Root render={<section aria-labelledby={titleId} />}>
      <div {...stylex.props(styles.head)}>
        <Card.Header style={styles.headText}>
          <Card.Title id={titleId} render={<h2 />}>
            Revenue
          </Card.Title>
          <Card.Description>{subtitle}</Card.Description>
        </Card.Header>
        <ToggleGroup.Root
          aria-label="Chart period"
          style={styles.period}
          value={[period]}
          onValueChange={(next, eventDetails) => {
            const [value] = next as Period[];
            if (value === undefined) {
              eventDetails.cancel();
              return;
            }
            setPeriod(value);
          }}
        >
          <ToggleGroup.Item value="day">Day</ToggleGroup.Item>
          <ToggleGroup.Item value="week">Week</ToggleGroup.Item>
          <ToggleGroup.Item value="month">Month</ToggleGroup.Item>
        </ToggleGroup.Root>
      </div>
      <Card.Body>
        <Chart.Root definition={definitions[period]} height={240} style={styles.figure}>
          <Chart.Caption style={visuallyHidden}>Revenue</Chart.Caption>
          <Chart.Plot />
          <Collapsible.Root open={open} onOpenChange={setOpen}>
            <Collapsible.Trigger render={<Button variant="ghost" size="sm" style={styles.disclosure} />}>
              {open ? 'Hide data' : 'Show data'}
            </Collapsible.Trigger>
            <Collapsible.Panel style={styles.panel}>
              <Table.Root>
                <Table.Caption>Revenue by {unit}</Table.Caption>
                <Table.Head>
                  <Table.Row>
                    <Table.HeadCell>Period</Table.HeadCell>
                    <Table.HeadCell>Revenue</Table.HeadCell>
                  </Table.Row>
                </Table.Head>
                <Table.Body>
                  {rows.map((row) => (
                    <Table.Row key={row.period}>
                      <Table.Cell>{row.period}</Table.Cell>
                      <Table.Cell>{dollars.format(row.revenue)}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Collapsible.Panel>
          </Collapsible.Root>
        </Chart.Root>
      </Card.Body>
    </Card.Root>
  );
}
