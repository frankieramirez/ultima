import * as stylex from '@stylexjs/stylex';
import { radius, space } from '@ultima/tokens/tokens.stylex';
import { Skeleton } from '@ultima/ui';

const styles = stylex.create({
  row: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-5'],
  },
  avatar: {
    borderRadius: radius['--ult-radius-full'],
    height: space['--ult-space-10'],
    width: space['--ult-space-10'],
  },
  block: {
    height: space['--ult-space-11'],
  },
});

export default function Shapes() {
  return (
    <div {...stylex.props(styles.row)} aria-busy="true">
      <Skeleton style={styles.avatar} />
      <Skeleton style={styles.block} />
    </div>
  );
}
