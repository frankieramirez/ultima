import * as stylex from '@stylexjs/stylex';
import { color, space, text } from '@ultima/tokens/tokens.stylex';
import { Spinner } from '@ultima/ui';

const styles = stylex.create({
  row: {
    alignItems: 'center',
    color: color['--ult-color-text-muted'],
    display: 'flex',
    fontSize: text['--ult-text-4'],
    gap: space['--ult-space-4'],
  },
});

export default function Inline() {
  return (
    <div {...stylex.props(styles.row)} aria-busy="true">
      <Spinner />
      Restoring backup
    </div>
  );
}
