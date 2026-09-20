import * as stylex from '@stylexjs/stylex';
import { font, space, text } from '@ultima/tokens/tokens.stylex';
import { InputOTP } from '@ultima/ui';

const LENGTH = 6;

const styles = stylex.create({
  stack: {
    display: 'grid',
    gap: space['--ult-space-3'],
    justifyItems: 'start',
  },
  label: {
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
  },
});

export default function Basic() {
  return (
    <div {...stylex.props(styles.stack)}>
      <label htmlFor="signup-code" {...stylex.props(styles.label)}>
        Verification code
      </label>
      <InputOTP.Root id="signup-code" length={LENGTH}>
        {Array.from({ length: LENGTH }, (_, index) => (
          <InputOTP.Input
            key={index}
            aria-label={index === 0 ? undefined : `Character ${index + 1} of ${LENGTH}`}
          />
        ))}
      </InputOTP.Root>
    </div>
  );
}
