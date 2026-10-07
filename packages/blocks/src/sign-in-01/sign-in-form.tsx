'use client';

import { Form } from '@base-ui/react/form';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button } from '@ultima/ui/button';
import { Checkbox } from '@ultima/ui/checkbox';
import { Field } from '@ultima/ui/field';
import { Input } from '@ultima/ui/input';
import { Separator } from '@ultima/ui/separator';
import { useState } from 'react';

import { GitHubGlyph, KeyGlyph } from './icons';

export type Credentials = { email: string; password: string; remember: boolean };

/** Field-keyed messages from the backend, shown in the matching Field.Error. */
export type SignInResult = { errors?: Record<string, string | string[]> };

/** The stub to replace with your authentication call. It always succeeds. */
export async function signIn(_credentials: Credentials): Promise<SignInResult> {
  return {};
}

const DESKTOP = '@media (min-width: 48rem)';

const styles = stylex.create({
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-7'],
    inlineSize: '100%',
    maxInlineSize: { default: 'none', [DESKTOP]: `calc(9 * ${space['--ult-space-10']})` },
  },
  head: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-3'],
  },
  title: {
    fontSize: text['--ult-text-8'],
    fontWeight: font['--ult-font-weight-semibold'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  lead: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-3'],
    lineHeight: font['--ult-font-leading-snug'],
    margin: 0,
  },
  labelRow: {
    alignItems: 'baseline',
    display: 'flex',
    gap: space['--ult-space-4'],
    justifyContent: 'space-between',
  },
  aside: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-2'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-none'],
    textDecorationLine: { default: 'none', ':hover': 'underline' },
  },
  remember: {
    alignItems: 'center',
    display: 'flex',
    fontWeight: font['--ult-font-weight-regular'],
    gap: space['--ult-space-5'],
  },
  wide: {
    inlineSize: '100%',
  },
  divider: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-5'],
  },
  or: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    letterSpacing: font['--ult-font-tracking-wide'],
    lineHeight: font['--ult-font-leading-none'],
    textTransform: 'uppercase',
  },
  providers: {
    display: 'flex',
    gap: space['--ult-space-5'],
  },
  provider: {
    flexBasis: 0,
    flexGrow: 1,
  },
  footer: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-3'],
    lineHeight: font['--ult-font-leading-snug'],
    margin: 0,
    textAlign: 'center',
  },
  create: {
    color: color['--ult-color-text'],
    fontWeight: font['--ult-font-weight-semibold'],
  },
});

export function SignInForm({ onSignIn = signIn }: { onSignIn?: typeof signIn }) {
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<SignInResult['errors']>({});

  return (
    <Form
      {...stylex.props(styles.form)}
      errors={errors}
      onFormSubmit={async (values: Record<string, unknown>) => {
        setPending(true);
        try {
          const result = await onSignIn({
            email: String(values.email ?? ''),
            password: String(values.password ?? ''),
            remember: values.remember === true,
          });
          setErrors(result.errors ?? {});
        } finally {
          setPending(false);
        }
      }}
    >
      <div {...stylex.props(styles.head)}>
        <h1 {...stylex.props(styles.title)}>Sign in to Northwind</h1>
        <p {...stylex.props(styles.lead)}>Welcome back. Use your work email.</p>
      </div>
      <Field.Root name="email">
        <Field.Label>Email</Field.Label>
        <Input type="email" required autoComplete="username" />
        <Field.Error />
      </Field.Root>
      <Field.Root name="password">
        <div {...stylex.props(styles.labelRow)}>
          <Field.Label>Password</Field.Label>
          <a href="#forgot-password" {...stylex.props(styles.aside)}>
            Forgot password?
          </a>
        </div>
        <Input type="password" required autoComplete="current-password" />
        <Field.Error />
      </Field.Root>
      <Field.Root name="remember">
        <Field.Label style={styles.remember}>
          <Checkbox.Root>
            <Checkbox.Indicator />
          </Checkbox.Root>
          Keep me signed in
        </Field.Label>
      </Field.Root>
      <Button type="submit" disabled={pending} style={styles.wide}>
        {pending ? 'Signing in' : 'Sign in'}
      </Button>
      <div {...stylex.props(styles.divider)}>
        <Separator />
        <span {...stylex.props(styles.or)}>or</span>
        <Separator />
      </div>
      <div {...stylex.props(styles.providers)}>
        <Button type="button" variant="outline" style={styles.provider}>
          <GitHubGlyph />
          GitHub
        </Button>
        <Button type="button" variant="outline" style={styles.provider}>
          <KeyGlyph />
          SSO
        </Button>
      </div>
      <p {...stylex.props(styles.footer)}>
        No account?{' '}
        <a href="#sign-up" {...stylex.props(styles.create)}>
          Create one
        </a>
      </p>
    </Form>
  );
}
