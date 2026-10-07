import { describe, expect, expectTypeOf, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import descriptor from '../../../../registry/metadata/block/sign-in-01.ts';
import { SignIn01 } from '../sign-in-01/sign-in-01';
import { type Credentials, type SignInResult, SignInForm, signIn } from '../sign-in-01/sign-in-form';
import { themeDocument, themes, viewports, violations } from './axe';

const cases = themes.flatMap((mode) => viewports.map((viewport) => ({ mode, viewport, name: `${mode.name}, ${viewport.name}` })));

async function mount({ mode, viewport }: (typeof cases)[number]) {
  await page.viewport(viewport.width, viewport.height);
  themeDocument(mode);
  return render(<SignIn01 />);
}

const deferred = () => {
  let resolve: (result: SignInResult) => void = () => {};
  const promise = new Promise<SignInResult>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
};

describe.each(cases)('$name', (scenario) => {
  test('1. it mounts with no props', async () => {
    const screen = await mount(scenario);
    await expect.element(screen.getByRole('heading', { level: 1, name: 'Sign in to Northwind' })).toBeVisible();
  });

  test('2. its structure resolves', async () => {
    const screen = await mount(scenario);
    const root = screen.container;

    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(root.querySelectorAll('main')).toHaveLength(1);
    const aside = screen.getByRole('complementary', { name: 'Customer story' }).element();
    const main = screen.getByRole('main').element();
    expect(aside.closest('main')).toBeNull();
    expect(aside.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(aside.querySelectorAll('a, button, input, select, textarea, [tabindex]')).toHaveLength(0);
    expect(root.querySelectorAll('nav')).toHaveLength(0);

    await expect.element(screen.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await expect.element(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    await expect.element(screen.getByRole('checkbox', { name: 'Keep me signed in' })).toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Sign in' })).toHaveAttribute('type', 'submit');
    await expect.element(screen.getByRole('button', { name: 'GitHub' })).toHaveAttribute('type', 'button');
    await expect.element(screen.getByRole('button', { name: 'SSO' })).toHaveAttribute('type', 'button');
    await expect.element(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '#forgot-password');
    await expect.element(screen.getByRole('link', { name: 'Create one' })).toHaveAttribute('href', '#sign-up');

    const figure = root.querySelector('figure') as HTMLElement;
    const divider = root.querySelector('[role="separator"][aria-orientation="vertical"]') as HTMLElement;
    expect(figure.querySelector('blockquote')).not.toBeNull();
    expect(figure.querySelector('figcaption')?.textContent).toBe('PRPriya RamanCOO, Kestrel Health');
    expect(figure.querySelector('figcaption [aria-hidden="true"]')?.textContent).toBe('PR');
    if (scenario.viewport.name === 'narrow') {
      expect(getComputedStyle(figure).display).toBe('none');
      expect(getComputedStyle(divider).display).toBe('none');
      expect(aside.getBoundingClientRect().bottom).toBeLessThanOrEqual(main.getBoundingClientRect().top);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(scenario.viewport.width);
    } else {
      expect(getComputedStyle(figure).display).not.toBe('none');
      expect(getComputedStyle(divider).display).not.toBe('none');
      expect(aside.getBoundingClientRect().right).toBeLessThanOrEqual(main.getBoundingClientRect().left);
    }
  });

  test('3. axe passes', async () => {
    await mount(scenario);
    expect(await violations()).toEqual([]);
  });
});

describe('4. the behavior the block wires', () => {
  test('an empty submit shows both field errors and moves focus to Email', async () => {
    const screen = await render(<SignIn01 />);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    const email = screen.getByRole('textbox', { name: 'Email' });
    await expect.element(email).toHaveFocus();
    for (const control of [email, screen.getByLabelText('Password')]) {
      await expect.element(control).toHaveAttribute('aria-invalid', 'true');
      const ids = control.element().getAttribute('aria-describedby')?.split(' ') ?? [];
      expect(ids.map((id) => document.getElementById(id)?.textContent).filter(Boolean)).toHaveLength(1);
    }
  });

  test("a malformed email shows Email's type error", async () => {
    const screen = await render(<SignIn01 />);
    const email = screen.getByRole('textbox', { name: 'Email' });
    await userEvent.fill(email, 'ada');
    await userEvent.fill(screen.getByLabelText('Password'), 'correct horse');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await expect.element(email).toHaveAttribute('aria-invalid', 'true');
    const input = email.element() as HTMLInputElement;
    expect(input.validity.typeMismatch).toBe(true);
    const described = document.getElementById(input.getAttribute('aria-describedby') ?? '');
    expect(described?.textContent).toBe(input.validationMessage);
  });

  test('the stub resolves with no errors', async () => {
    expect(await signIn({ email: 'ada@northwind.co', password: 'correct horse', remember: false })).toEqual({});
  });

  test('a valid submit calls signIn, and Sign in is disabled and reads Signing in until it settles', async () => {
    const call = deferred();
    const onSignIn = vi.fn((_credentials: Credentials) => call.promise);
    const screen = await render(<SignInForm onSignIn={onSignIn} />);
    await userEvent.fill(screen.getByRole('textbox', { name: 'Email' }), 'ada@northwind.co');
    await userEvent.fill(screen.getByLabelText('Password'), 'correct horse');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Keep me signed in' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await expect.element(screen.getByRole('button', { name: 'Signing in' })).toBeDisabled();
    expect(onSignIn).toHaveBeenCalledExactlyOnceWith({ email: 'ada@northwind.co', password: 'correct horse', remember: true });

    call.resolve({});
    await expect.element(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  test("a backend's field errors show in the matching Field.Error", async () => {
    const onSignIn = vi.fn(async (_credentials: Credentials): Promise<SignInResult> => ({ errors: { password: 'That password is not right.' } }));
    const screen = await render(<SignInForm onSignIn={onSignIn} />);
    await userEvent.fill(screen.getByRole('textbox', { name: 'Email' }), 'ada@northwind.co');
    await userEvent.fill(screen.getByLabelText('Password'), 'wrong horse');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    const password = screen.getByLabelText('Password');
    await expect.element(screen.getByText('That password is not right.')).toBeVisible();
    await expect.element(password).toHaveAttribute('aria-invalid', 'true');
    await expect.element(screen.getByRole('textbox', { name: 'Email' })).not.toHaveAttribute('aria-invalid');
    expect(password.element().getAttribute('aria-describedby')).toContain(screen.getByText('That password is not right.').element().id);
  });
});

test('5. it follows no recipe, so no recipe contract applies in place', () => {
  expect(descriptor.recipes).toEqual([]);
});

test('6. the root takes no props', () => {
  expectTypeOf(SignIn01).parameters.toEqualTypeOf<[]>();
});
