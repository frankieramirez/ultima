import { Field, NativeSelect } from '@ultima/ui';

export default function NativeSelectField() {
  return (
    <Field.Root name="realm">
      <Field.Label>Realm</Field.Label>
      <NativeSelect.Root>
        <NativeSelect.Select defaultValue="northern">
          <option value="northern">Northern reaches</option>
          <option value="eastern">Eastern marches</option>
          <option value="southern">Southern expanse</option>
        </NativeSelect.Select>
      </NativeSelect.Root>
      <Field.Description>The region your character starts in.</Field.Description>
    </Field.Root>
  );
}
