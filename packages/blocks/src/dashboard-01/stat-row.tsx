import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Badge } from '@ultima/ui/badge';
import { Card } from '@ultima/ui/card';
import { Stat } from '@ultima/ui/stat';

import type { Range } from './dashboard-01';

const DESKTOP = '@media (min-width: 48rem)';

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

const styles = stylex.create({
  row: {
    display: 'grid',
    gap: space['--ult-space-6'],
    gridTemplateColumns: { default: 'repeat(2, minmax(0, 1fr))', [DESKTOP]: 'repeat(4, minmax(0, 1fr))' },
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-4'],
    paddingBlockStart: space['--ult-space-6'],
  },
  head: {
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: { default: 'column', [DESKTOP]: 'row' },
    gap: space['--ult-space-3'],
    justifyContent: 'space-between',
  },
  stat: {
    flexGrow: 1,
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
            <div {...stylex.props(styles.head)}>
              <Stat.Root style={styles.stat}>
                <Stat.Label>{metric.label}</Stat.Label>
                <Stat.Value>{metric.value}</Stat.Value>
              </Stat.Root>
              <Badge tone={metric.favorable ? 'success' : 'warning'}>{metric.delta}</Badge>
            </div>
            <p {...stylex.props(styles.caption)}>vs. previous {range} days</p>
          </Card.Body>
        </Card.Root>
      ))}
    </section>
  );
}
