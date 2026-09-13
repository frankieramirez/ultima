import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Textarea } from '@ultima/ui';

const styles = stylex.create({
  stack: {
    display: 'grid',
    gap: space['--ult-space-5'],
  },
});

export default function Sizes() {
  return (
    <div {...stylex.props(styles.stack)}>
      <Textarea size="sm" aria-label="Small notes" placeholder="Small" />
      <Textarea size="md" aria-label="Medium notes" placeholder="Medium" />
      <Textarea size="lg" aria-label="Large notes" placeholder="Large" />
    </div>
  );
}
