import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Card } from '@ultima/ui/card';
import { Stat } from '@ultima/ui/stat';

import type { Range } from './dashboard-01';

// Four cards share the content column beside the sidebar. At DESKTOP each would be under 100px of
// content, too narrow for any headline number, so the row holds two-by-two until WIDE.
const WIDE = '@media (min-width: 64rem)';

type Metric = { label: string; value: string; delta: string; favorable: boolean };

const metrics: Record<Range, Metric[]> = {
  7: [
    { label: 'Revenue', value: '$11,640', delta: '+3.8%', favorable: true },
    { label: 'Orders', value: '302', delta: '−1.6%', favorable: false },
    { label: 'Customers', value: '2,318', delta: '+0.9%', favorable: true },
    { label: 'Refund rate', value: '0.6%', delta: '−0.1%', favorable: true },
  ],
  30: [
    { label: 'Revenue', value: '$48,210', delta: '+12.4%', favorable: true },
    { label: 'Orders', value: '1,284', delta: '+4.1%', favorable: true },
    { label: 'Customers', value: '9,431', delta: '+2.3%', favorable: true },
    { label: 'Refund rate', value: '0.8%', delta: '+0.2%', favorable: false },
  ],
  90: [
    { label: 'Revenue', value: '$139,870', delta: '+18.9%', favorable: true },
    { label: 'Orders', value: '3,912', delta: '+9.7%', favorable: true },
    { label: 'Customers', value: '24,906', delta: '+6.8%', favorable: true },
    { label: 'Refund rate', value: '1.1%', delta: '+0.4%', favorable: false },
  ],
};

// The sign picks the glyph's direction; `favorable` picks the tone, so a rising refund rate is warning.
function trendOf(delta: string) {
  if (delta.startsWith('+')) return 'up';
  if (delta.startsWith('−') || delta.startsWith('-')) return 'down';
  return undefined;
}

const styles = stylex.create({
  row: {
    display: 'grid',
    gap: space['--ult-space-6'],
    gridTemplateColumns: { default: 'repeat(2, minmax(0, 1fr))', [WIDE]: 'repeat(4, minmax(0, 1fr))' },
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-4'],
    paddingBlockStart: space['--ult-space-6'],
    containerType: 'inline-size',
  },
  // Just past WIDE a card's content is about 120px, and a six-figure value at 30px needs about 136px.
  // No breakpoint sits there, so the number follows its card between Stat's own two steps instead.
  value: {
    fontSize: `clamp(${text['--ult-text-8']}, 20cqi, ${text['--ult-text-9']})`,
  },
  caption: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
    lineHeight: font['--ult-font-leading-snug'],
    margin: 0,
  },
});

export function StatRow({ range }: { range: Range }) {
  return (
    <section aria-label="Key metrics" {...stylex.props(styles.row)}>
      {metrics[range].map((metric) => (
        <Card.Root key={metric.label}>
          <Card.Body style={styles.body}>
            <Stat.Root>
              <Stat.Label>{metric.label}</Stat.Label>
              <Stat.Value style={styles.value}>{metric.value}</Stat.Value>
              <Stat.Delta tone={metric.favorable ? 'success' : 'warning'} trend={trendOf(metric.delta)}>
                {metric.delta}
              </Stat.Delta>
            </Stat.Root>
            <p {...stylex.props(styles.caption)}>vs. previous {range} days</p>
          </Card.Body>
        </Card.Root>
      ))}
    </section>
  );
}
