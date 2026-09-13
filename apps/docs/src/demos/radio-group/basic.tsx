import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { RadioGroup } from '@ultima/ui';

const styles = stylex.create({
  label: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-3'],
  },
});

export default function Basic() {
  return (
    <RadioGroup.Root aria-label="Plan" defaultValue="pro">
      <label {...stylex.props(styles.label)}>
        <RadioGroup.Item value="hobby">
          <RadioGroup.Indicator />
        </RadioGroup.Item>
        Hobby
      </label>
      <label {...stylex.props(styles.label)}>
        <RadioGroup.Item value="pro">
          <RadioGroup.Indicator />
        </RadioGroup.Item>
        Pro
      </label>
      <label {...stylex.props(styles.label)}>
        <RadioGroup.Item value="team">
          <RadioGroup.Indicator />
        </RadioGroup.Item>
        Team
      </label>
    </RadioGroup.Root>
  );
}
