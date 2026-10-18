import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Stat } from '@ultima/ui';

const styles = stylex.create({
  row: { display: 'flex', flexWrap: 'wrap', gap: space['--ult-space-9'] },
});

export default function Delta() {
  return (
    <div {...stylex.props(styles.row)}>
      <Stat.Root>
        <Stat.Label>Revenue</Stat.Label>
        <Stat.Value>$48,210</Stat.Value>
        <Stat.Delta tone="success" trend="up">
          +12.4% vs. last month
        </Stat.Delta>
      </Stat.Root>
      <Stat.Root>
        <Stat.Label>Refund rate</Stat.Label>
        <Stat.Value>0.8%</Stat.Value>
        <Stat.Delta tone="warning" trend="up">
          +0.2 pts vs. last month
        </Stat.Delta>
      </Stat.Root>
      <Stat.Root>
        <Stat.Label>Orders</Stat.Label>
        <Stat.Value>1,284</Stat.Value>
        <Stat.Delta>No change</Stat.Delta>
      </Stat.Root>
    </div>
  );
}
