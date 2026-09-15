import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Card, Skeleton } from '@ultima/ui';

const styles = stylex.create({
  lines: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-4'],
  },
  heading: {
    height: space['--ult-space-8'],
    width: '60%',
  },
  short: {
    width: '40%',
  },
});

export default function CardPlaceholder() {
  return (
    <Card.Root aria-busy="true">
      <Card.Body>
        <div {...stylex.props(styles.lines)}>
          <Skeleton style={styles.heading} />
          <Skeleton />
          <Skeleton />
          <Skeleton style={styles.short} />
        </div>
      </Card.Body>
    </Card.Root>
  );
}
