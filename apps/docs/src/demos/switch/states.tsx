import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Switch } from '@ultima/ui';

const styles = stylex.create({
  row: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-7'],
  },
  label: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-4'],
  },
});

export default function States() {
  return (
    <div {...stylex.props(styles.row)}>
      <label {...stylex.props(styles.label)}>
        <Switch.Root defaultChecked><Switch.Thumb /></Switch.Root>
        Checked
      </label>
      <label {...stylex.props(styles.label)}>
        <Switch.Root disabled><Switch.Thumb /></Switch.Root>
        Disabled
      </label>
    </div>
  );
}
