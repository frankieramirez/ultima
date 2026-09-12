'use client';

import * as stylex from '@stylexjs/stylex';
import { Form } from '@base-ui/react/form';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button, Field, Input } from '@ultima/ui';
import { Controller, useForm } from 'react-hook-form';

const styles = stylex.create({
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-6'],
    maxInlineSize: '24rem',
  },
});

type Values = {
  handle: string;
};

export default function ReactHookFormRecipe() {
  const { control, handleSubmit, reset } = useForm<Values>({
    defaultValues: { handle: '' },
    shouldFocusError: true,
  });

  return (
    <Form
      {...stylex.props(styles.form)}
      aria-label="Claim a handle"
      onSubmit={handleSubmit((values) => {
        reset({ handle: values.handle });
      })}
    >
      <Controller
        name="handle"
        control={control}
        rules={{
          required: 'A handle is required.',
          minLength: { value: 3, message: 'At least three characters.' },
          validate: (value) => (value.toLowerCase() === 'admin' ? 'That handle is reserved.' : true),
        }}
        render={({ field: { ref, name, value, onBlur, onChange }, fieldState: { invalid, isTouched, isDirty, error } }) => (
          <Field.Root name={name} invalid={invalid} touched={isTouched} dirty={isDirty}>
            <Field.Label>Handle</Field.Label>
            <Input
              ref={ref}
              value={value}
              onBlur={onBlur}
              onValueChange={onChange}
              placeholder="frankie"
            />
            <Field.Description>Reserved names are refused by the engine, not by a native attribute.</Field.Description>
            <Field.Error match={!!error}>{error?.message}</Field.Error>
          </Field.Root>
        )}
      />
      <Button type="submit">Claim handle</Button>
    </Form>
  );
}
