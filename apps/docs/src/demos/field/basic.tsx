import { Field, Input } from '@ultima/ui';

export default function Basic() {
  return (
    <Field.Root name="email">
      <Field.Label>Email</Field.Label>
      <Input type="email" placeholder="you@example.com" />
      <Field.Description>We never share this.</Field.Description>
    </Field.Root>
  );
}
