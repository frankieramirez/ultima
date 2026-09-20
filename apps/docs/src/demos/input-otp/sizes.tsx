import * as stylex from '@stylexjs/stylex';
import { font, space, text } from '@ultima/tokens/tokens.stylex';
import { InputOTP, type InputOTPSize } from '@ultima/ui';

const LENGTH = 4;
const SIZES: InputOTPSize[] = ['sm', 'md', 'lg'];

const styles = stylex.create({
  stack: {
    display: 'grid',
    gap: space['--ult-space-5'],
    justifyItems: 'start',
  },
  field: {
    display: 'grid',
    gap: space['--ult-space-2'],
    justifyItems: 'start',
  },
  label: {
    fontSize: text['--ult-text-3'],
    fontWeight: font['--ult-font-weight-medium'],
  },
});

export default function Sizes() {
  return (
    <div {...stylex.props(styles.stack)}>
      {SIZES.map((size) => (
        <div key={size} {...stylex.props(styles.field)}>
          <label htmlFor={`code-${size}`} {...stylex.props(styles.label)}>
            {size}
          </label>
          <InputOTP.Root id={`code-${size}`} size={size} length={LENGTH}>
            {Array.from({ length: LENGTH }, (_, index) => (
              <InputOTP.Input
                key={index}
                aria-label={index === 0 ? undefined : `Character ${index + 1} of ${LENGTH}`}
              />
            ))}
          </InputOTP.Root>
        </div>
      ))}
    </div>
  );
}
