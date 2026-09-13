import { Checkbox, Field, Fieldset } from '@ultima/ui';

export default function FieldGroup() {
  return (
    <Fieldset.Root>
      <Fieldset.Legend>Features (required)</Fieldset.Legend>
      <Field.Root name="features" invalid>
        <Checkbox.Group>
          <Field.Item>
            <Checkbox.Root value="docs">
              <Checkbox.Indicator />
            </Checkbox.Root>
            <Field.Label>Docs</Field.Label>
          </Field.Item>
          <Field.Item>
            <Checkbox.Root value="registry" disabled>
              <Checkbox.Indicator />
            </Checkbox.Root>
            <Field.Label>Registry</Field.Label>
          </Field.Item>
          <Field.Item>
            <Checkbox.Root value="tokens">
              <Checkbox.Indicator />
            </Checkbox.Root>
            <Field.Label>Tokens</Field.Label>
          </Field.Item>
        </Checkbox.Group>
        <Field.Error match>Pick at least one feature.</Field.Error>
      </Field.Root>
    </Fieldset.Root>
  );
}
