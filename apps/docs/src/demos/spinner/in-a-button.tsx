import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button, Spinner } from '@ultima/ui';

const styles = stylex.create({
  label: {
    alignItems: 'center',
    display: 'inline-flex',
    gap: space['--ult-space-4'],
  },
});

export default function InAButton() {
  return (
    <Button disabled>
      <span {...stylex.props(styles.label)}>
        <Spinner />
        Exporting
      </span>
    </Button>
  );
}
