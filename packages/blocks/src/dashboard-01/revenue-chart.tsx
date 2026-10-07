import * as stylex from '@stylexjs/stylex';
import { color, space, text } from '@ultima/tokens/tokens.stylex';
import { Button } from '@ultima/ui/button';
import { Card } from '@ultima/ui/card';
import { Collapsible } from '@ultima/ui/collapsible';
import { Table } from '@ultima/ui/table';
import { ToggleGroup } from '@ultima/ui/toggle-group';
import { max } from 'd3-array';
import { scaleBand, scaleLinear } from 'd3-scale';
import { useId, useLayoutEffect, useRef, useState } from 'react';

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

const INITIAL_WIDTH = 640;
const HEIGHT = 240;
const MARGIN = { top: 8, right: 0, bottom: 24, left: 44 };
const INNER_BOTTOM = HEIGHT - MARGIN.bottom;
const LABEL_WIDTH = 44;

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
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-5'],
    margin: 0,
  },
  plot: {
    display: 'block',
    inlineSize: '100%',
  },
  mark: {
    fill: color['--ult-color-accent'],
  },
  axis: {
    stroke: color['--ult-color-border'],
  },
  tickLabel: {
    fill: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
  },
  bandLabel: {
    fill: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-2'],
  },
  disclosure: {
    alignSelf: 'flex-start',
  },
  panel: {
    paddingBlockStart: space['--ult-space-4'],
  },
});

function labelStride(width: number, count: number) {
  return Math.max(1, Math.ceil((count * LABEL_WIDTH) / (width - MARGIN.left - MARGIN.right)));
}

function usePlotWidth() {
  const ref = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(INITIAL_WIDTH);
  useLayoutEffect(() => {
    const plot = ref.current;
    if (!plot) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0) setWidth(entry.contentRect.width);
    });
    observer.observe(plot);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

export function RevenueChart() {
  const [period, setPeriod] = useState<Period>('day');
  const [open, setOpen] = useState(false);
  const [plotRef, width] = usePlotWidth();
  const titleId = useId();
  const { subtitle, unit, rows } = series[period];

  const x = scaleBand()
    .domain(rows.map((row) => row.period))
    .range([MARGIN.left, width - MARGIN.right])
    .padding(0.25);
  const y = scaleLinear()
    .domain([0, max(rows, (row) => row.revenue) ?? 0])
    .nice()
    .range([INNER_BOTTOM, MARGIN.top]);
  const ticks = y.ticks(4);
  const tickLabel = y.tickFormat(4, '$~s');
  const stride = labelStride(width, rows.length);

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
        <figure aria-labelledby={titleId} {...stylex.props(styles.figure)}>
          <svg ref={plotRef} aria-hidden="true" height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} {...stylex.props(styles.plot)}>
            {ticks.map((tick) => (
              <text key={tick} textAnchor="end" x={MARGIN.left - 8} y={y(tick) + 4} {...stylex.props(styles.tickLabel)}>
                {tickLabel(tick)}
              </text>
            ))}
            {rows.map((row, index) => {
              const left = x(row.period) ?? 0;
              const top = y(row.revenue);
              return (
                <g key={row.period}>
                  <rect height={INNER_BOTTOM - top} width={x.bandwidth()} x={left} y={top} {...stylex.props(styles.mark)} />
                  {index % stride === 0 ? (
                    <text textAnchor="middle" x={left + x.bandwidth() / 2} y={HEIGHT - 6} {...stylex.props(styles.bandLabel)}>
                      {row.period}
                    </text>
                  ) : null}
                </g>
              );
            })}
            <line strokeWidth={1} x1={MARGIN.left} x2={width - MARGIN.right} y1={INNER_BOTTOM} y2={INNER_BOTTOM} {...stylex.props(styles.axis)} />
          </svg>
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
        </figure>
      </Card.Body>
    </Card.Root>
  );
}
