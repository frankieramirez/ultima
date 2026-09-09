import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Badge, Stat } from '@ultima/ui';

const styles = stylex.create({
  row: { display: 'flex', flexWrap: 'wrap', gap: space['--ult-space-9'] },
  value: { alignItems: 'center', display: 'flex', gap: space['--ult-space-3'] },
});

export default function Summary() {
  return (
    <div {...stylex.props(styles.row)}>
      <Stat.Root>
        <Stat.Label>Components</Stat.Label>
        <Stat.Value>14</Stat.Value>
      </Stat.Root>
      <Stat.Root>
        <Stat.Label>Pairings</Stat.Label>
        <Stat.Value style={styles.value}>
          48 <Badge tone="success">Passing</Badge>
        </Stat.Value>
      </Stat.Root>
      <Stat.Root>
        <Stat.Label>Modes</Stat.Label>
        <Stat.Value>2</Stat.Value>
      </Stat.Root>
    </div>
  );
}
