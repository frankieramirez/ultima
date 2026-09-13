import { Field, Fieldset, Input, Switch } from '@ultima/ui';

export default function Basic() {
  return (
    <Fieldset.Root>
      <Fieldset.Legend>Account</Fieldset.Legend>
      <Field.Root name="email">
        <Field.Label>Email</Field.Label>
        <Input type="email" placeholder="you@example.com" />
      </Field.Root>
      <Field.Root name="digest">
        <Field.Item>
          <Switch.Root>
            <Switch.Thumb />
          </Switch.Root>
          <Field.Label>Weekly digest</Field.Label>
        </Field.Item>
        <Field.Description>One summary of activity every Monday.</Field.Description>
      </Field.Root>
    </Fieldset.Root>
  );
}
