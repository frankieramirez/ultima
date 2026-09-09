import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Input } from '@ultima/ui';

const styles = stylex.create({
  stack: {
    display: 'grid',
    gap: space['--ult-space-6'],
  },
  field: {
    display: 'grid',
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
    gap: space['--ult-space-3'],
  },
  error: {
    color: color['--ult-color-danger-text'],
    fontSize: text['--ult-text-3'],
  },
});

export default function Validation() {
  return (
    <div {...stylex.props(styles.stack)}>
      <div {...stylex.props(styles.field)}>
        <label htmlFor="email">Email address</label>
        <Input
          id="email"
          defaultValue="not-an-email"
          aria-invalid="true"
          aria-describedby="email-error"
        />
        <span id="email-error" {...stylex.props(styles.error)}>Enter a valid email address.</span>
      </div>
      <Input aria-label="Workspace identifier" value="ult-001" disabled />
    </div>
  );
}
