import { CalendarDate } from '@internationalized/date';
import { userEvent } from 'vitest/browser';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import type { ReactNode } from 'react';
import {
  Checkbox,
  ColorField,
  Combobox,
  Command,
  DatePicker,
  Input,
  InputGroup,
  InputOTP,
  RadioGroup,
  Select,
  Switch,
  Textarea,
} from '@ultima/ui';
import { tokenValue } from './token-value';

// docs/spec/design-foundations.md#color, "Read-only is live, so it keeps the paper": a read-only
// field keeps the field fill and the value's ink and gives up only what says "type here" (the 3:1
// edge, hover and the caret). Disabled alone takes the sunken fill and the disabled ink.
const FIELD = () => tokenValue('background-color', 'var(--ult-color-field)');
const SUNKEN = () => tokenValue('background-color', 'var(--ult-color-surface-sunken)');
const QUIET = () => tokenValue('border-top-color', 'var(--ult-color-border)');
const STRONG = () => tokenValue('border-top-color', 'var(--ult-color-border-strong)');
const TEXT = () => tokenValue('color', 'var(--ult-color-text)');
const DISABLED = () => tokenValue('color', 'var(--ult-color-text-disabled)');

type State = 'editable' | 'readOnly' | 'disabled';
const STATES: State[] = ['editable', 'readOnly', 'disabled'];
const flags = (state: State) => ({ disabled: state === 'disabled', readOnly: state === 'readOnly' });
const ITEMS = ['Abjuration', 'Evocation'];
const wait = () => new Promise((resolve) => setTimeout(resolve, 300));

/** Each family renders its painted box as `box` and the native control that holds the caret as `control`. */
const families: Record<string, (state: State) => ReactNode> = {
  Input: (state) => <Input data-testid="box" aria-label="Email" defaultValue="frankie@ultima.systems" {...flags(state)} />,
  Textarea: (state) => <Textarea data-testid="box" aria-label="Bio" defaultValue="First principles." {...flags(state)} />,
  'Input Group': (state) => (
    <InputGroup.Root data-testid="box">
      <InputGroup.Addon>https://</InputGroup.Addon>
      <InputGroup.Input data-testid="control" aria-label="URL" defaultValue="ultima.systems" {...flags(state)} />
    </InputGroup.Root>
  ),
  Combobox: (state) => (
    <Combobox.Root items={ITEMS} defaultValue="Evocation" {...flags(state)}>
      <Combobox.InputGroup data-testid="box">
        <Combobox.Input data-testid="control" aria-label="School" />
      </Combobox.InputGroup>
    </Combobox.Root>
  ),
  Command: (state) => (
    <Command.Root items={ITEMS} defaultValue="Evo" {...flags(state)}>
      <Command.InputGroup data-testid="box">
        <Command.Input data-testid="control" aria-label="Action" />
      </Command.InputGroup>
    </Command.Root>
  ),
  'Date Picker': (state) => (
    <DatePicker.Root {...flags(state)}>
      <DatePicker.Label>Date</DatePicker.Label>
      <DatePicker.Control data-testid="box">
        <DatePicker.Input data-testid="control" />
        <DatePicker.Trigger />
      </DatePicker.Control>
    </DatePicker.Root>
  ),
  'Color Field': (state) => (
    <ColorField.Root defaultValue="#3366ff" disabled={state === 'disabled'}>
      <ColorField.Input data-testid="box" aria-label="Hex" readOnly={state === 'readOnly'} />
    </ColorField.Root>
  ),
  Select: (state) => (
    <Select.Root items={ITEMS.map((value) => ({ value, label: value }))} defaultValue="Evocation" {...flags(state)}>
      <Select.Trigger data-testid="box" aria-label="School">
        <Select.Value />
        <Select.Icon />
      </Select.Trigger>
    </Select.Root>
  ),
  'Input OTP': (state) => (
    <InputOTP.Root length={2} aria-label="Code" defaultValue="42" {...flags(state)}>
      <InputOTP.Input data-testid="box" />
      <InputOTP.Input aria-label="Character 2 of 2" />
    </InputOTP.Root>
  ),
};

for (const [name, family] of Object.entries(families)) {
  for (const state of STATES) {
    test(`${name} ${state}: ${state === 'disabled' ? 'the sunken fill and disabled ink' : 'the field fill and the value ink'}`, async () => {
      const screen = await render(family(state));
      const box = screen.getByTestId('box').element() as HTMLElement;
      const style = getComputedStyle(box);
      expect(style.opacity).toBe('1');
      expect(style.backgroundColor).toBe(state === 'disabled' ? SUNKEN() : FIELD());
      expect(style.color).toBe(state === 'disabled' ? DISABLED() : TEXT());
      expect(style.borderTopColor).toBe(state === 'editable' ? STRONG() : QUIET());
    });
  }

  test(`${name} read-only: hover leaves the quiet edge and the caret is hidden`, async () => {
    const screen = await render(family('readOnly'));
    const box = screen.getByTestId('box').element() as HTMLElement;
    await userEvent.hover(box);
    await wait();
    expect(getComputedStyle(box).borderTopColor).toBe(QUIET());
    const control = (box.matches('input, textarea') ? box : box.querySelector('input, textarea')) as HTMLElement | null;
    if (control) expect(getComputedStyle(control).caretColor).toBe('rgba(0, 0, 0, 0)');
  });
}

test('an editable field keeps its caret', async () => {
  const screen = await render(<Input data-testid="box" aria-label="Email" />);
  expect(getComputedStyle(screen.getByTestId('box').element()).caretColor).not.toBe('rgba(0, 0, 0, 0)');
});

test('a read-only field still takes keyboard focus and draws the ring', async () => {
  const screen = await render(<Input data-testid="box" aria-label="Email" defaultValue="frankie@ultima.systems" readOnly />);
  const input = screen.getByTestId('box').element();
  await userEvent.tab();
  expect(document.activeElement).toBe(input);
  expect(getComputedStyle(input).outlineStyle).toBe('solid');
});

function Reagents({ state }: { state: State }) {
  return (
    <Combobox.Root items={ITEMS} multiple defaultValue={['Evocation']} {...flags(state)}>
      <Combobox.InputGroup>
        <Combobox.Chips>
          <Combobox.Value>
            {(selected: string[]) =>
              selected.map((school) => (
                <Combobox.Chip key={school} data-testid="chip">
                  {school}
                  <Combobox.ChipRemove aria-label={`Remove ${school}`} data-testid="remove" />
                </Combobox.Chip>
              ))
            }
          </Combobox.Value>
          <Combobox.Input aria-label="Schools" />
        </Combobox.Chips>
        <Combobox.Clear data-testid="clear" aria-label="Clear" />
      </Combobox.InputGroup>
    </Combobox.Root>
  );
}

test('a read-only Combobox keeps its chips tinted and drops the controls that would change the value', async () => {
  const screen = await render(
    <>
      <div data-testid="editable">
        <Reagents state="editable" />
      </div>
      <div data-testid="readOnly">
        <Reagents state="readOnly" />
      </div>
    </>,
  );
  const part = (state: State, id: string) =>
    (screen.getByTestId(state).element() as HTMLElement).querySelector(`[data-testid="${id}"]`) as HTMLElement;
  const live = getComputedStyle(part('editable', 'chip'));
  const fixed = getComputedStyle(part('readOnly', 'chip'));
  expect(fixed.backgroundColor).toBe(live.backgroundColor);
  expect(fixed.paddingInlineEnd).toBe(fixed.paddingInlineStart);
  expect(getComputedStyle(part('editable', 'remove')).display).not.toBe('none');
  expect(getComputedStyle(part('readOnly', 'remove')).display).toBe('none');
  expect(getComputedStyle(part('editable', 'clear')).display).not.toBe('none');
  expect(getComputedStyle(part('readOnly', 'clear')).display).toBe('none');
});

test('a read-only Date Picker drops its clear button and keeps the calendar glyph without hover', async () => {
  const picker = (state: State) => (
    <DatePicker.Root {...flags(state)} defaultValue={[new CalendarDate(2026, 1, 2)]}>
      <DatePicker.Label>{state}</DatePicker.Label>
      <DatePicker.Control>
        <DatePicker.Input />
        <DatePicker.ClearTrigger data-testid={`${state}-clear`} />
        <DatePicker.Trigger data-testid={`${state}-trigger`} />
      </DatePicker.Control>
    </DatePicker.Root>
  );
  const screen = await render(
    <>
      {picker('editable')}
      {picker('readOnly')}
    </>,
  );
  expect(getComputedStyle(screen.getByTestId('editable-clear').element()).display).not.toBe('none');
  expect(getComputedStyle(screen.getByTestId('readOnly-clear').element()).display).toBe('none');
  const trigger = screen.getByTestId('readOnly-trigger').element() as HTMLElement;
  await userEvent.hover(trigger);
  await wait();
  expect(getComputedStyle(trigger).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  expect(getComputedStyle(trigger).cursor).toBe('default');
});

test('a read-only choice keeps its 3:1 edge and drops hover', async () => {
  const screen = await render(
    <>
      <Checkbox.Root data-testid="checkbox" aria-label="Agree" readOnly>
        <Checkbox.Indicator />
      </Checkbox.Root>
      <RadioGroup.Root aria-label="Pick" readOnly>
        <RadioGroup.Item data-testid="radio" value="a" aria-label="A">
          <RadioGroup.Indicator />
        </RadioGroup.Item>
      </RadioGroup.Root>
      <Switch.Root data-testid="switch" aria-label="On" readOnly>
        <Switch.Thumb />
      </Switch.Root>
    </>,
  );
  for (const id of ['checkbox', 'radio']) {
    const box = screen.getByTestId(id).element() as HTMLElement;
    expect(getComputedStyle(box).backgroundColor).toBe(FIELD());
    await userEvent.hover(box);
    await wait();
    expect(getComputedStyle(box).borderTopColor).toBe(STRONG());
  }
  const track = screen.getByTestId('switch').element() as HTMLElement;
  await userEvent.hover(track);
  await wait();
  expect(getComputedStyle(track).backgroundColor).toBe(tokenValue('background-color', 'var(--ult-color-border-strong)'));
});
