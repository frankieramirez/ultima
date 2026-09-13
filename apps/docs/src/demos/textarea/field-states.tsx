import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Field, Textarea } from '@ultima/ui';

const styles = stylex.create({
  stack: {
    display: 'grid',
    gap: space['--ult-space-6'],
  },
});

export default function FieldStates() {
  return (
    <div {...stylex.props(styles.stack)}>
      <Field.Root name="bio">
        <Field.Label>Biography (required)</Field.Label>
        <Textarea required placeholder="A short bio" />
        <Field.Description>Shown on your public profile.</Field.Description>
      </Field.Root>
      <Field.Root name="locked" disabled>
        <Field.Label>Workspace id</Field.Label>
        <Textarea defaultValue="ult-001" />
      </Field.Root>
      <Field.Root name="summary" invalid>
        <Field.Label>Summary</Field.Label>
        <Textarea defaultValue="too short" />
        <Field.Error match>Write at least 20 characters.</Field.Error>
      </Field.Root>
    </div>
  );
}
