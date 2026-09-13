'use client';

import * as stylex from '@stylexjs/stylex';
import { Form } from '@base-ui/react/form';
import { color, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, Field, Input } from '@ultima/ui';
import { useState } from 'react';

const styles = stylex.create({
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-6'],
    maxInlineSize: '24rem',
  },
  actions: {
    display: 'flex',
    gap: space['--ult-space-4'],
  },
  result: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-3'],
    margin: 0,
  },
});

export default function ConstraintForm() {
  const [submitted, setSubmitted] = useState<string | null>(null);

  return (
    <Form
      {...stylex.props(styles.form)}
      aria-label="Workspace signup"
      onFormSubmit={(values) => {
        setSubmitted(JSON.stringify(values));
      }}
    >
      <Field.Root name="email">
        <Field.Label>Email (required)</Field.Label>
        <Input type="email" required placeholder="you@example.com" />
        <Field.Description>Used for account recovery.</Field.Description>
        <Field.Error />
      </Field.Root>
      <Field.Root name="workspace">
        <Field.Label>Workspace slug</Field.Label>
        <Input name="workspace" required minLength={3} pattern="[a-z0-9-]+" placeholder="ultima" />
        <Field.Description>Lowercase letters, numbers, and hyphens. At least three characters.</Field.Description>
        <Field.Error />
      </Field.Root>
      <Field.Root name="plan" disabled>
        <Field.Label>Plan</Field.Label>
        <Input defaultValue="starter" />
        <Field.Description>Disabled for this demo.</Field.Description>
      </Field.Root>
      <div {...stylex.props(styles.actions)}>
        <Button type="submit">Create workspace</Button>
      </div>
      {submitted ? <p {...stylex.props(styles.result)}>Submitted {submitted}</p> : null}
    </Form>
  );
}
