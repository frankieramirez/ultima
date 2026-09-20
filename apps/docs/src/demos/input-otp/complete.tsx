import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
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
  readout: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-3'],
    margin: 0,
  },
});

export default function Complete() {
  const [code, setCode] = useState('');

  return (
    <div {...stylex.props(styles.stack)}>
      <label htmlFor="confirm-code" {...stylex.props(styles.label)}>
        Confirmation code
      </label>
      <InputOTP.Root
        id="confirm-code"
        length={LENGTH}
        mask
        onValueComplete={(value) => setCode(value)}
      >
        {Array.from({ length: LENGTH }, (_, index) => (
          <InputOTP.Input
            key={index}
            aria-label={index === 0 ? undefined : `Character ${index + 1} of ${LENGTH}`}
          />
        ))}
      </InputOTP.Root>
      <p {...stylex.props(styles.readout)} aria-live="polite">
        {code === '' ? 'Enter all six characters.' : `Completed value: ${code}`}
      </p>
    </div>
  );
}
