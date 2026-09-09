import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Switch } from '@ultima/ui';

const styles = stylex.create({
  stack: {
    display: 'grid',
    gap: space['--ult-space-5'],
  },
  label: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-4'],
  },
});

export default function Labels() {
  return (
    <div {...stylex.props(styles.stack)}>
      <label {...stylex.props(styles.label)}>
        <Switch.Root><Switch.Thumb /></Switch.Root>
        Email notifications
      </label>
      <Switch.Root aria-label="Compact navigation"><Switch.Thumb /></Switch.Root>
    </div>
  );
}
