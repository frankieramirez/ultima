import { Field, Fieldset, Input } from '@ultima/ui';

export default function RequiredGroup() {
  return (
    <Fieldset.Root>
      <Fieldset.Legend>Notification channel (required)</Fieldset.Legend>
      <Field.Root name="channel">
        <Field.Label>Channel</Field.Label>
        <Input required placeholder="email or sms" />
        <Field.Error />
      </Field.Root>
    </Fieldset.Root>
  );
}
