'use client';

import * as stylex from '@stylexjs/stylex';
import { max } from 'd3-array';
import { format } from 'd3-format';
import { scaleBand, scaleLinear } from 'd3-scale';
import { color, space, text } from '@ultima/tokens/tokens.stylex';
import { Table } from '@ultima/ui';

const data = [
  { day: 'Mon', requests: 84_200 },
  { day: 'Tue', requests: 91_700 },
  { day: 'Wed', requests: 88_100 },
  { day: 'Thu', requests: 96_300 },
  { day: 'Fri', requests: 90_800 },
  { day: 'Sat', requests: 41_500 },
  { day: 'Sun', requests: 38_900 },
];

const WIDTH = 360;
const HEIGHT = 220;
const MARGIN = { top: 8, right: 8, bottom: 22, left: 36 };
const INNER_BOTTOM = HEIGHT - MARGIN.bottom;
const INNER_RIGHT = WIDTH - MARGIN.right;

const thousands = format(',');
const x = scaleBand()
  .domain(data.map((row) => row.day))
  .range([MARGIN.left, INNER_RIGHT])
  .padding(0.35);
const y = scaleLinear()
  .domain([0, max(data, (row) => row.requests) ?? 0])
  .nice()
  .range([INNER_BOTTOM, MARGIN.top]);
const ticks = y.ticks(4);
const tickLabel = y.tickFormat(4, '~s');

const styles = stylex.create({
  figure: {
    alignItems: 'flex-end',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-6'],
  },
  plot: {
    flexShrink: 0,
  },
  mark: {
    fill: color['--ult-color-accent'],
  },
  axis: {
    stroke: color['--ult-color-border'],
    strokeWidth: 1,
  },
  tickLabel: {
    fill: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-3'],
  },
  bandLabel: {
    fill: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-3'],
  },
  table: {
    flexBasis: '16rem',
    flexGrow: 1,
    minWidth: '14rem',
  },
});

export default function ChartRecipe() {
  return (
    <div {...stylex.props(styles.figure)}>
      <svg
        aria-hidden="true"
        height={HEIGHT}
        width={WIDTH}
        {...stylex.props(styles.plot)}
      >
        {ticks.map((tick) => (
          <text
            key={tick}
            textAnchor="end"
            x={MARGIN.left - 6}
            y={y(tick) + 4}
            {...stylex.props(styles.tickLabel)}
          >
            {tickLabel(tick)}
          </text>
        ))}
        {data.map((row) => {
          const bar = x(row.day) ?? 0;
          const top = y(row.requests);
          return (
            <g key={row.day}>
              <rect
                height={INNER_BOTTOM - top}
                width={x.bandwidth()}
                x={bar}
                y={top}
                {...stylex.props(styles.mark)}
              />
              <text
                textAnchor="middle"
                x={bar + x.bandwidth() / 2}
                y={HEIGHT - 6}
                {...stylex.props(styles.bandLabel)}
              >
                {row.day}
              </text>
            </g>
          );
        })}
        <line
          x1={MARGIN.left}
          x2={INNER_RIGHT}
          y1={INNER_BOTTOM}
          y2={INNER_BOTTOM}
          {...stylex.props(styles.axis)}
        />
      </svg>
      <div {...stylex.props(styles.table)}>
        <Table.Root>
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
                <Table.Cell>{thousands(row.requests)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </div>
    </div>
  );
}
