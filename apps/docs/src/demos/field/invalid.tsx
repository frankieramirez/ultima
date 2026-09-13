import { Field, Input } from '@ultima/ui';

export default function Invalid() {
  return (
    <Field.Root name="email" invalid>
      <Field.Label>Email</Field.Label>
      <Input type="email" defaultValue="not-an-email" />
      <Field.Description>We never share this.</Field.Description>
      <Field.Error match>Enter a valid email address.</Field.Error>
    </Field.Root>
  );
}
