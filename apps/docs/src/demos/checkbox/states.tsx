import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Checkbox } from '@ultima/ui';

const styles = stylex.create({
  stack: {
    display: 'grid',
    gap: space['--ult-space-5'],
  },
  label: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-3'],
  },
});

export default function States() {
  return (
    <div {...stylex.props(styles.stack)}>
      <label {...stylex.props(styles.label)}>
        <Checkbox.Root>
          <Checkbox.Indicator />
        </Checkbox.Root>
        Unchecked
      </label>
      <label {...stylex.props(styles.label)}>
        <Checkbox.Root defaultChecked>
          <Checkbox.Indicator />
        </Checkbox.Root>
        Checked
      </label>
      <label {...stylex.props(styles.label)}>
        <Checkbox.Root indeterminate>
          <Checkbox.Indicator />
        </Checkbox.Root>
        Mixed
      </label>
      <label {...stylex.props(styles.label)}>
        <Checkbox.Root disabled>
          <Checkbox.Indicator />
        </Checkbox.Root>
        Disabled
      </label>
    </div>
  );
}
