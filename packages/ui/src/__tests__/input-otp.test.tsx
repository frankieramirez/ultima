import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Field,
  InputOTP,
  type InputOTPInputProps,
  type InputOTPRootProps,
  type InputOTPSize,
} from '@ultima/ui';

const LENGTH = 4;

function slots(length = LENGTH) {
  return Array.from({ length }, (_, index) => (
    <InputOTP.Input
      key={index}
      aria-label={index === 0 ? undefined : `Character ${index + 1} of ${length}`}
    />
  ));
}

for (const size of ['sm', 'md', 'lg'] as const) {
  test(`${size} renders`, async () => {
    const screen = await render(
      <>
        <label htmlFor={`code-${size}`}>{`${size} code`}</label>
        <InputOTP.Root id={`code-${size}`} size={size} length={LENGTH}>
          {slots()}
        </InputOTP.Root>
      </>,
    );
    await expect.element(screen.getByRole('group', { name: `${size} code` })).toBeVisible();
    await expect.element(screen.getByRole('textbox', { name: 'Character 4 of 4' })).toBeVisible();
  });
}

test('an omitted size matches md', async () => {
  const screen = await render(
    <>
      <label htmlFor="code-default">Default</label>
      <InputOTP.Root id="code-default" length={1}>
        <InputOTP.Input />
      </InputOTP.Root>
      <label htmlFor="code-explicit">Explicit</label>
      <InputOTP.Root id="code-explicit" size="md" length={1}>
        <InputOTP.Input />
      </InputOTP.Root>
    </>,
  );
  const implicit = screen.getByRole('textbox', { name: 'Default' }).element();
  const explicit = screen.getByRole('textbox', { name: 'Explicit' }).element();
  expect(implicit.className).not.toBe('');
  expect(implicit.className).toBe(explicit.className);
});

test('a consumer label names the field through the first slot', async () => {
  const screen = await render(
    <>
      <label htmlFor="verify">Verification code</label>
      <InputOTP.Root id="verify" length={LENGTH}>
        {slots()}
      </InputOTP.Root>
    </>,
  );
  await expect.element(screen.getByRole('group', { name: 'Verification code' })).toBeVisible();
  await expect.element(screen.getByRole('textbox', { name: 'Verification code' })).toBeVisible();
  await expect.element(screen.getByRole('textbox', { name: 'Character 2 of 4' })).toBeVisible();
});

test('a Field.Label names the field', async () => {
  const screen = await render(
    <Field.Root>
      <Field.Label>Backup code</Field.Label>
      <InputOTP.Root length={LENGTH}>{slots()}</InputOTP.Root>
    </Field.Root>,
  );
  await expect.element(screen.getByRole('group', { name: 'Backup code' })).toBeVisible();
  await expect.element(screen.getByRole('textbox', { name: 'Backup code' })).toBeVisible();
});

test('keyboard focus draws the focused slot outline and never the separator', async () => {
  const screen = await render(
    <>
      <label htmlFor="focus-code">Code</label>
      <InputOTP.Root id="focus-code" length={2}>
        <InputOTP.Input />
        <InputOTP.Separator />
        <InputOTP.Input aria-label="Character 2 of 2" />
      </InputOTP.Root>
    </>,
  );
  await userEvent.tab();
  const first = screen.getByRole('textbox', { name: 'Code' }).element();
  expect(document.activeElement).toBe(first);
  expect(parseFloat(getComputedStyle(first).outlineWidth)).toBeGreaterThan(0);
  expect(getComputedStyle(first).outlineStyle).toBe('solid');
  expect(getComputedStyle(screen.getByRole('separator').element()).outlineStyle).toBe('none');
});

test('one tab stop covers the field, and arrows and Home and End move between slots', async () => {
  const screen = await render(
    <>
      <label htmlFor="walk-code">Code</label>
      <InputOTP.Root id="walk-code" length={LENGTH}>
        {slots()}
      </InputOTP.Root>
      <button type="button">After</button>
    </>,
  );
  const first = screen.getByRole('textbox', { name: 'Code' }).element();
  const second = screen.getByRole('textbox', { name: 'Character 2 of 4' }).element();
  const third = screen.getByRole('textbox', { name: 'Character 3 of 4' }).element();
  await userEvent.tab();
  expect(document.activeElement).toBe(first);
  // The primitive lets focus reach one slot past the entered value, so walk after typing.
  await userEvent.keyboard('12');
  expect(document.activeElement).toBe(third);
  await userEvent.keyboard('{ArrowLeft}');
  expect(document.activeElement).toBe(second);
  await userEvent.keyboard('{ArrowRight}');
  expect(document.activeElement).toBe(third);
  await userEvent.keyboard('{Home}');
  expect(document.activeElement).toBe(first);
  await userEvent.keyboard('{End}');
  expect(document.activeElement).toBe(third);
  await userEvent.tab();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }).element());
});

test('typing fills a slot and advances focus; Backspace clears and steps back', async () => {
  const screen = await render(
    <>
      <label htmlFor="type-code">Code</label>
      <InputOTP.Root id="type-code" length={LENGTH}>
        {slots()}
      </InputOTP.Root>
    </>,
  );
  const first = screen.getByRole('textbox', { name: 'Code' }).element() as HTMLInputElement;
  const second = screen.getByRole('textbox', { name: 'Character 2 of 4' }).element();
  await userEvent.tab();
  await userEvent.keyboard('1');
  expect(first.value).toBe('1');
  expect(document.activeElement).toBe(second);
  await userEvent.keyboard('{Backspace}');
  expect(document.activeElement).toBe(first);
  expect(first.value).toBe('');
});

test('onValueComplete fires when the value completes', async () => {
  let completed = '';
  const screen = await render(
    <>
      <label htmlFor="done-code">Code</label>
      <InputOTP.Root id="done-code" length={2} onValueComplete={(value) => (completed = value)}>
        {slots(2)}
      </InputOTP.Root>
    </>,
  );
  await expect.element(screen.getByRole('textbox', { name: 'Code' })).toBeVisible();
  await userEvent.tab();
  await userEvent.keyboard('12');
  expect(completed).toBe('12');
});

test('disabled dims the slots', async () => {
  const screen = await render(
    <>
      <label htmlFor="enabled-code">Enabled</label>
      <InputOTP.Root id="enabled-code" length={1}>
        <InputOTP.Input />
      </InputOTP.Root>
      <label htmlFor="disabled-code">Disabled</label>
      <InputOTP.Root id="disabled-code" length={1} disabled>
        <InputOTP.Input />
      </InputOTP.Root>
    </>,
  );
  const enabled = screen.getByRole('textbox', { name: 'Enabled' }).element();
  const disabled = screen.getByRole('textbox', { name: 'Disabled' }).element();
  expect(disabled).toHaveAttribute('data-disabled');
  expect(parseFloat(getComputedStyle(disabled).opacity)).toBeLessThan(
    parseFloat(getComputedStyle(enabled).opacity),
  );
});

test('an invalid Field recolors the slot border', async () => {
  const screen = await render(
    <>
      <Field.Root>
        <Field.Label>Valid</Field.Label>
        <InputOTP.Root length={1}>
          <InputOTP.Input />
        </InputOTP.Root>
      </Field.Root>
      <Field.Root invalid>
        <Field.Label>Invalid</Field.Label>
        <InputOTP.Root length={1}>
          <InputOTP.Input />
        </InputOTP.Root>
      </Field.Root>
    </>,
  );
  const valid = getComputedStyle(screen.getByRole('textbox', { name: 'Valid' }).element());
  const invalid = screen.getByRole('textbox', { name: 'Invalid' }).element();
  expect(invalid).toHaveAttribute('data-invalid');
  expect(getComputedStyle(invalid).borderTopColor).not.toBe(valid.borderTopColor);
});

test('public prop types expose only supported styling axes', () => {
  expectTypeOf<InputOTPRootProps>().not.toHaveProperty('className');
  expectTypeOf<InputOTPInputProps>().not.toHaveProperty('className');
  expectTypeOf<InputOTPInputProps>().not.toHaveProperty('size');
  expectTypeOf<InputOTPSize>().toEqualTypeOf<'sm' | 'md' | 'lg'>();
});
