import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Input } from '@ultima/ui';

const styles = stylex.create({
  stack: {
    display: 'grid',
    gap: space['--ult-space-5'],
  },
});

export default function Sizes() {
  return (
    <div {...stylex.props(styles.stack)}>
      <Input size="sm" aria-label="Small input" placeholder="Small" />
      <Input size="md" aria-label="Medium input" placeholder="Medium" />
      <Input size="lg" aria-label="Large input" placeholder="Large" />
    </div>
  );
}
