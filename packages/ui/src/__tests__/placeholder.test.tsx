import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import type { ReactNode } from 'react';
import { ColorField, Combobox, Command, DatePicker, Field, Fieldset, Input, InputGroup, Select, Textarea } from '@ultima/ui';
import { tokenValue } from './token-value';

// docs/spec/design-foundations.md#opacity: a disabled control takes the disabled ink, never a fade.
// A placeholder left in the subtle ink makes an empty disabled field look editable, so every
// placeholder a field paints moves to the disabled ink with it. Read-only is not disabled: a
// read-only field keeps the subtle placeholder.
const SUBTLE = () => tokenValue('color', 'var(--ult-color-text-subtle)');
const DISABLED = () => tokenValue('color', 'var(--ult-color-text-disabled)');

type State = 'enabled' | 'disabled' | 'readOnly';
const STATES: State[] = ['enabled', 'disabled', 'readOnly'];
const flags = (state: State) => ({ disabled: state === 'disabled', readOnly: state === 'readOnly' });
const expected = (state: State) => (state === 'disabled' ? DISABLED() : SUBTLE());

const ITEMS = ['Abjuration', 'Evocation'];

/** The `::placeholder` ink of the native control a family renders. */
function placeholderInk(control: Element): string {
  return getComputedStyle(control, '::placeholder').color;
}

/**
 * The ink of the placeholder text a trigger family renders. Select's Trigger and Value both carry
 * `data-placeholder` and the text is Value's span; Combobox's Value renders no element, so the text
 * is the Trigger's own.
 */
function dataPlaceholderInk(root: Element): string {
  const element = root.querySelector('[data-placeholder]') ?? (root.matches('[data-placeholder]') ? root : null);
  expect(element, 'the empty value carries data-placeholder').not.toBeNull();
  return getComputedStyle(element!).color;
}

const families: Record<string, { render: (state: State) => ReactNode; ink: (root: HTMLElement) => string }> = {
  Input: {
    render: (state) => <Input data-testid="root" placeholder="you@example.com" {...flags(state)} />,
    ink: placeholderInk,
  },
  Textarea: {
    render: (state) => <Textarea data-testid="root" placeholder="Notes" {...flags(state)} />,
    ink: placeholderInk,
  },
  InputGroup: {
    render: (state) => (
      <InputGroup.Root>
        <InputGroup.Addon>@</InputGroup.Addon>
        <InputGroup.Input data-testid="root" placeholder="handle" {...flags(state)} />
      </InputGroup.Root>
    ),
    ink: placeholderInk,
  },
  'Combobox Input': {
    render: (state) => (
      <Combobox.Root items={ITEMS} {...flags(state)}>
        <Combobox.InputGroup>
          <Combobox.Input data-testid="root" placeholder="Search schools" />
          <Combobox.Trigger aria-label="Open" />
        </Combobox.InputGroup>
      </Combobox.Root>
    ),
    ink: placeholderInk,
  },
  'Combobox Trigger': {
    render: (state) => (
      <Combobox.Root items={ITEMS} {...flags(state)}>
        <Combobox.Trigger data-testid="root">
          <Combobox.Value placeholder="Pick a school" />
          <Combobox.Icon />
        </Combobox.Trigger>
      </Combobox.Root>
    ),
    ink: dataPlaceholderInk,
  },
  Select: {
    render: (state) => (
      <Select.Root items={ITEMS.map((value) => ({ value, label: value }))} {...flags(state)}>
        <Select.Trigger data-testid="root" aria-label="School">
          <Select.Value placeholder="Pick a school" />
          <Select.Icon />
        </Select.Trigger>
      </Select.Root>
    ),
    ink: dataPlaceholderInk,
  },
  Command: {
    render: (state) => (
      <Command.Root items={ITEMS} {...flags(state)}>
        <Command.InputGroup>
          <Command.Input data-testid="root" placeholder="Search actions" />
        </Command.InputGroup>
      </Command.Root>
    ),
    ink: placeholderInk,
  },
  DatePicker: {
    render: (state) => (
      <DatePicker.Root placeholder="mm/dd/yyyy" {...flags(state)}>
        <DatePicker.Label>Date</DatePicker.Label>
        <DatePicker.Control>
          <DatePicker.Input data-testid="root" />
        </DatePicker.Control>
      </DatePicker.Root>
    ),
    ink: placeholderInk,
  },
  ColorField: {
    render: (state) => (
      <ColorField.Root defaultValue="" disabled={state === 'disabled'}>
        <ColorField.Input data-testid="root" aria-label="Hex" placeholder="#000000" readOnly={state === 'readOnly'} />
      </ColorField.Root>
    ),
    ink: placeholderInk,
  },
};

test('the subtle and disabled inks are different colours', () => {
  expect(DISABLED()).not.toBe(SUBTLE());
});

for (const [name, family] of Object.entries(families)) {
  for (const state of STATES) {
    test(`${name} ${state}: the placeholder takes the ${state === 'disabled' ? 'disabled' : 'subtle'} ink`, async () => {
      const screen = await render(family.render(state));
      const root = screen.getByTestId('root').element() as HTMLElement;
      if (state === 'disabled') expect(root.matches(':disabled, [data-disabled]')).toBe(true);
      if (state === 'readOnly') expect(root.matches(':disabled, [data-disabled]')).toBe(false);
      expect(family.ink(root)).toBe(expected(state));
    });
  }
}

test('a field disabled by its Field or Fieldset takes the disabled placeholder ink', async () => {
  const screen = await render(
    <>
      <Field.Root disabled>
        <Field.Label>Email</Field.Label>
        <Input data-testid="field" placeholder="you@example.com" />
      </Field.Root>
      <Fieldset.Root disabled>
        <Fieldset.Legend>Profile</Fieldset.Legend>
        <InputGroup.Root>
          <InputGroup.Input data-testid="fieldset" aria-label="Handle" placeholder="handle" />
        </InputGroup.Root>
      </Fieldset.Root>
    </>,
  );
  expect(placeholderInk(screen.getByTestId('field').element())).toBe(DISABLED());
  expect(placeholderInk(screen.getByTestId('fieldset').element())).toBe(DISABLED());
});
