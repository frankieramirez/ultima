import * as stylex from '@stylexjs/stylex';
import { lineY } from '@tanstack/charts/line';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { scalePoint } from '@tanstack/charts/scales/point';
import { defineChart } from '@tanstack/charts/scene';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button, Chart, Collapsible, Table } from '@ultima/ui';
import { useState } from 'react';

const data = [
  { day: 'Mon', milliseconds: 182 },
  { day: 'Tue', milliseconds: 176 },
  { day: 'Wed', milliseconds: 214 },
  { day: 'Thu', milliseconds: 238 },
  { day: 'Fri', milliseconds: 197 },
  { day: 'Sat', milliseconds: 151 },
  { day: 'Sun', milliseconds: 148 },
];

const definition = defineChart({
  marks: [lineY(data, { x: 'day', y: 'milliseconds', points: true })],
  scales: {
    x: { scale: () => scalePoint<string>().padding(0.25) },
    y: { scale: scaleLinear, nice: true, grid: true, axis: { label: 'ms', ticks: { count: 4 } } },
  },
});

const styles = stylex.create({
  figure: {
    gap: space['--ult-space-5'],
    inlineSize: '100%',
  },
  disclosure: {
    alignSelf: 'flex-start',
  },
  panel: {
    paddingBlockStart: space['--ult-space-4'],
  },
});

export default function CollapsibleTableChart() {
  const [open, setOpen] = useState(false);
  return (
    <Chart.Root aspectRatio={16 / 7} definition={definition} style={styles.figure}>
      <Chart.Caption>Median response time per weekday</Chart.Caption>
      <Chart.Plot />
      <Collapsible.Root open={open} onOpenChange={setOpen}>
        <Collapsible.Trigger render={<Button size="sm" style={styles.disclosure} variant="ghost" />}>
          {open ? 'Hide data' : 'Show data'}
        </Collapsible.Trigger>
        <Collapsible.Panel style={styles.panel}>
          <Table.Root>
            <Table.Caption>Median response time per weekday, in ms</Table.Caption>
            <Table.Head>
              <Table.Row>
                <Table.HeadCell>Day</Table.HeadCell>
                <Table.HeadCell numeric>Response time</Table.HeadCell>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {data.map((row) => (
                <Table.Row key={row.day}>
                  <Table.Cell>{row.day}</Table.Cell>
                  <Table.Cell numeric>{row.milliseconds}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Collapsible.Panel>
      </Collapsible.Root>
    </Chart.Root>
  );
}
