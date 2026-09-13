import { Field, Fieldset, RadioGroup } from '@ultima/ui';

export default function FieldGroup() {
  return (
    <Fieldset.Root>
      <Fieldset.Legend>Plan (required)</Fieldset.Legend>
      <Field.Root name="plan" invalid>
        <RadioGroup.Root>
          <Field.Item>
            <RadioGroup.Item value="hobby">
              <RadioGroup.Indicator />
            </RadioGroup.Item>
            <Field.Label>Hobby</Field.Label>
          </Field.Item>
          <Field.Item>
            <RadioGroup.Item value="pro">
              <RadioGroup.Indicator />
            </RadioGroup.Item>
            <Field.Label>Pro</Field.Label>
          </Field.Item>
          <Field.Item>
            <RadioGroup.Item value="team" disabled>
              <RadioGroup.Indicator />
            </RadioGroup.Item>
            <Field.Label>Team</Field.Label>
          </Field.Item>
        </RadioGroup.Root>
        <Field.Error match>Choose a plan.</Field.Error>
      </Field.Root>
    </Fieldset.Root>
  );
}
