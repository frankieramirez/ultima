import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import type { ReactNode } from 'react';
import { Combobox, Command, DatePicker, InputGroup, InputOTP, NativeSelect, Select } from '@ultima/ui';
import { tokenValue } from './token-value';

// docs/spec/design-foundations.md#opacity: a disabled field reads as disabled everywhere, so the
// glyphs and addon text inside it leave the subtle ink for the disabled one along with its value
// and placeholder. Read-only is not disabled and keeps the subtle glyphs.
const SUBTLE = () => tokenValue('color', 'var(--ult-color-text-subtle)');
const DISABLED = () => tokenValue('color', 'var(--ult-color-text-disabled)');

type State = 'enabled' | 'disabled' | 'readOnly';
const flags = (state: State) => ({ disabled: state === 'disabled', readOnly: state === 'readOnly' });
const ITEMS = ['Abjuration', 'Evocation'];

type Glyph = {
  render: (state: State) => ReactNode;
  states: State[];
  /** The colour the glyph paints with, read off the element the test id names. */
  ink?: (element: HTMLElement) => string;
};

const glyphs: Record<string, Glyph> = {
  'Input Group addon': {
    states: ['enabled', 'disabled', 'readOnly'],
    render: (state) => (
      <InputGroup.Root>
        <InputGroup.Addon data-testid="glyph">@</InputGroup.Addon>
        <InputGroup.Input aria-label="Handle" {...flags(state)} />
      </InputGroup.Root>
    ),
  },
  'Input Group trailing addon': {
    states: ['enabled', 'disabled', 'readOnly'],
    render: (state) => (
      <InputGroup.Root>
        <InputGroup.Input aria-label="Handle" {...flags(state)} />
        <InputGroup.Addon data-testid="glyph" align="end">
          .dev
        </InputGroup.Addon>
      </InputGroup.Root>
    ),
  },
  'Select icon': {
    states: ['enabled', 'disabled', 'readOnly'],
    render: (state) => (
      <Select.Root items={ITEMS.map((value) => ({ value, label: value }))} {...flags(state)}>
        <Select.Trigger aria-label="School">
          <Select.Value placeholder="Pick a school" />
          <Select.Icon data-testid="glyph" />
        </Select.Trigger>
      </Select.Root>
    ),
  },
  'Combobox trigger icon': {
    states: ['enabled', 'disabled', 'readOnly'],
    render: (state) => (
      <Combobox.Root items={ITEMS} {...flags(state)}>
        <Combobox.Trigger aria-label="Rank">
          <Combobox.Value placeholder="Pick a rank" />
          <Combobox.Icon data-testid="glyph" />
        </Combobox.Trigger>
      </Combobox.Root>
    ),
  },
  'Combobox input-group icon': {
    states: ['enabled', 'disabled', 'readOnly'],
    render: (state) => (
      <Combobox.Root items={ITEMS} {...flags(state)}>
        <Combobox.InputGroup>
          <Combobox.Input aria-label="School" />
          <Combobox.Trigger aria-label="Open">
            <Combobox.Icon data-testid="glyph" />
          </Combobox.Trigger>
        </Combobox.InputGroup>
      </Combobox.Root>
    ),
  },
  'Combobox clear': {
    states: ['enabled', 'disabled', 'readOnly'],
    render: (state) => (
      <Combobox.Root items={ITEMS} defaultValue="Evocation" {...flags(state)}>
        <Combobox.InputGroup>
          <Combobox.Input aria-label="School" />
          <Combobox.Clear data-testid="glyph" aria-label="Clear" keepMounted />
        </Combobox.InputGroup>
      </Combobox.Root>
    ),
  },
  'Command icon': {
    states: ['enabled', 'disabled', 'readOnly'],
    render: (state) => (
      <Command.Root items={ITEMS} {...flags(state)}>
        <Command.InputGroup>
          <Command.Input aria-label="Action" />
          <Command.Trigger aria-label="Open">
            <Command.Icon data-testid="glyph" />
          </Command.Trigger>
        </Command.InputGroup>
      </Command.Root>
    ),
  },
  'Command clear': {
    states: ['enabled', 'disabled', 'readOnly'],
    render: (state) => (
      <Command.Root items={ITEMS} defaultValue="Evo" {...flags(state)}>
        <Command.InputGroup>
          <Command.Input aria-label="Action" />
          <Command.Clear data-testid="glyph" aria-label="Clear" keepMounted />
        </Command.InputGroup>
      </Command.Root>
    ),
  },
  'Date Picker trigger': {
    states: ['enabled', 'disabled', 'readOnly'],
    render: (state) => (
      <DatePicker.Root {...flags(state)}>
        <DatePicker.Label>Date</DatePicker.Label>
        <DatePicker.Control>
          <DatePicker.Input />
          <DatePicker.Trigger data-testid="glyph" />
        </DatePicker.Control>
      </DatePicker.Root>
    ),
  },
  'Native Select chevron': {
    states: ['enabled', 'disabled'],
    render: (state) => (
      <NativeSelect.Root data-testid="root">
        <NativeSelect.Select aria-label="School" disabled={state === 'disabled'}>
          <option>Abjuration</option>
        </NativeSelect.Select>
      </NativeSelect.Root>
    ),
  },
  'Input OTP separator': {
    states: ['enabled', 'disabled', 'readOnly'],
    render: (state) => (
      <InputOTP.Root length={4} aria-label="Code" {...flags(state)}>
        <InputOTP.Input />
        <InputOTP.Input />
        <InputOTP.Separator data-testid="glyph" />
        <InputOTP.Input />
        <InputOTP.Input />
      </InputOTP.Root>
    ),
    ink: (element) => getComputedStyle(element).borderTopColor,
  },
};

test('the subtle and disabled inks are different colours', () => {
  expect(DISABLED()).not.toBe(SUBTLE());
});

for (const [name, glyph] of Object.entries(glyphs)) {
  for (const state of glyph.states) {
    test(`${name} ${state}: the glyph takes the ${state === 'disabled' ? 'disabled' : 'subtle'} ink`, async () => {
      const screen = await render(glyph.render(state));
      const element =
        name === 'Native Select chevron'
          ? (screen.getByTestId('root').element().querySelector('svg') as unknown as HTMLElement)
          : (screen.getByTestId('glyph').element() as HTMLElement);
      expect(element).not.toBeNull();
      const ink = glyph.ink ?? ((el: HTMLElement) => getComputedStyle(el).color);
      expect(ink(element)).toBe(state === 'disabled' ? DISABLED() : SUBTLE());
    });
  }
}
