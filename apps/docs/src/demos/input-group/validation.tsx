import { EnvelopeIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Field, InputGroup } from '@ultima/ui';

const styles = stylex.create({
  stack: {
    display: 'grid',
    gap: space['--ult-space-6'],
  },
});

export default function Validation() {
  return (
    <div {...stylex.props(styles.stack)}>
      <Field.Root name="email" invalid>
        <Field.Label>Email</Field.Label>
        <InputGroup.Root>
          <InputGroup.Addon>
            <EnvelopeIcon />
          </InputGroup.Addon>
          <InputGroup.Input type="email" defaultValue="not-an-email" />
        </InputGroup.Root>
        <Field.Error match>Enter a valid email address.</Field.Error>
      </Field.Root>
      <InputGroup.Root>
        <InputGroup.Addon>@</InputGroup.Addon>
        <InputGroup.Input aria-label="Workspace handle" value="ult-001" disabled />
      </InputGroup.Root>
    </div>
  );
}
