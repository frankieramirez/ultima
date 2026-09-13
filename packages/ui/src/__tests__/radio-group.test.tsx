/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: none × none × none (no axes); a group with items mounts.
 * 2. The name resolves: role radiogroup named by Fieldset.Legend or aria-label on Root; each Item by a wrapping label or Field.Label.
 * 3. The focus ring lands where the contract says: on Item; Indicator and Root render none.
 * 4. The primitive is still wired: arrows move and select, looping; Home and End off; Space selects.
 * 5. Documented state drives its style: data-checked fills the item; data-disabled dims; invalid recolors the border.
 * 6. Typecheck passes: className is rejected on every styled part, and there is no size axis.
 * 7. Behavior this component wires itself: none, because every interaction is the primitive's or a style on a data-* attribute.
 * 8. CSS the primitive reads: Indicator is display none while data-unchecked (the exit-transition window).
 */
import {
  Field,
  Fieldset,
  RadioGroup,
  type RadioGroupIndicatorProps,
  type RadioGroupItemProps,
  type RadioGroupRootProps,
} from '@ultima/ui';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';

function Plans(props: RadioGroupRootProps) {
  return (
    <RadioGroup.Root aria-label="Plan" {...props}>
      <label>
        <RadioGroup.Item value="hobby" data-testid="hobby">
          <RadioGroup.Indicator data-testid="hobby-indicator" />
        </RadioGroup.Item>
        Hobby
      </label>
      <label>
        <RadioGroup.Item value="pro" data-testid="pro">
          <RadioGroup.Indicator data-testid="pro-indicator" />
        </RadioGroup.Item>
        Pro
      </label>
      <label>
        <RadioGroup.Item value="team" data-testid="team">
          <RadioGroup.Indicator data-testid="team-indicator" />
        </RadioGroup.Item>
        Team
      </label>
    </RadioGroup.Root>
  );
}

test('a group with items renders', async () => {
  const screen = await render(<Plans />);
  await expect.element(screen.getByRole('radiogroup', { name: 'Plan' })).toBeVisible();
  await expect.element(screen.getByRole('radio', { name: 'Hobby' })).toBeVisible();
  await expect.element(screen.getByRole('radio', { name: 'Pro' })).toBeVisible();
  await expect.element(screen.getByRole('radio', { name: 'Team' })).toBeVisible();
});

test('aria-label names the group and wrapping labels name each item', async () => {
  const screen = await render(<Plans />);
  await expect.element(screen.getByRole('radiogroup', { name: 'Plan' })).toBeVisible();
  await expect.element(screen.getByRole('radio', { name: 'Hobby' })).toBeVisible();
});

test('Fieldset.Legend names the group and Field.Label names each item', async () => {
  const screen = await render(
    <Fieldset.Root>
      <Fieldset.Legend>Plan (required)</Fieldset.Legend>
      <Field.Root name="plan">
        <RadioGroup.Root data-testid="group">
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
        </RadioGroup.Root>
      </Field.Root>
    </Fieldset.Root>,
  );
  const group = screen.getByTestId('group').element();
  expect(group).toHaveAttribute('role', 'radiogroup');
  const fieldset = group.closest('fieldset');
  expect(fieldset).not.toBeNull();
  const legend = screen.getByText('Plan (required)').element();
  expect(fieldset!.getAttribute('aria-labelledby')).toBe(legend.id);
  await expect.element(screen.getByRole('radio', { name: 'Hobby' })).toBeVisible();
  await expect.element(screen.getByRole('radio', { name: 'Pro' })).toBeVisible();
});

test('keyboard focus draws the item outline and never the indicator or the root', async () => {
  const screen = await render(
    <RadioGroup.Root aria-label="Plan" data-testid="root" defaultValue="hobby">
      <RadioGroup.Item value="hobby" aria-label="Hobby">
        <RadioGroup.Indicator data-testid="indicator" />
      </RadioGroup.Item>
    </RadioGroup.Root>,
  );
  const item = screen.getByRole('radio', { name: 'Hobby' }).element();
  const indicator = screen.getByTestId('indicator').element();
  const root = screen.getByTestId('root').element();
  await userEvent.tab();
  expect(document.activeElement).toBe(item);
  expect(parseFloat(getComputedStyle(item).outlineWidth)).toBeGreaterThan(0);
  expect(getComputedStyle(item).outlineStyle).toBe('solid');
  expect(getComputedStyle(indicator).outlineStyle).toBe('none');
  expect(getComputedStyle(root).outlineStyle).toBe('none');
});

test('arrows move and select, looping, and Home and End do not jump', async () => {
  const screen = await render(<Plans />);
  const hobby = screen.getByRole('radio', { name: 'Hobby' }).element();
  const pro = screen.getByRole('radio', { name: 'Pro' }).element();
  const team = screen.getByRole('radio', { name: 'Team' }).element();
  await userEvent.tab();
  expect(document.activeElement).toBe(hobby);
  await userEvent.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(pro);
  expect(pro).toHaveAttribute('aria-checked', 'true');
  await userEvent.keyboard('{End}');
  expect(document.activeElement).toBe(pro);
  await userEvent.keyboard('{Home}');
  expect(document.activeElement).toBe(pro);
  await userEvent.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(team);
  await userEvent.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(hobby);
  expect(hobby).toHaveAttribute('aria-checked', 'true');
});

test('Space selects the focused radio', async () => {
  const screen = await render(<Plans />);
  const hobby = screen.getByRole('radio', { name: 'Hobby' }).element();
  await userEvent.tab();
  expect(hobby).toHaveAttribute('aria-checked', 'false');
  await userEvent.keyboard('{ }');
  expect(hobby).toHaveAttribute('aria-checked', 'true');
});

test('data-checked fills the item unlike the rest', async () => {
  const screen = await render(<Plans defaultValue="pro" />);
  const hobby = screen.getByRole('radio', { name: 'Hobby' }).element();
  const pro = screen.getByRole('radio', { name: 'Pro' }).element();
  expect(pro).toHaveAttribute('data-checked');
  expect(getComputedStyle(pro).backgroundColor).not.toBe(getComputedStyle(hobby).backgroundColor);
});

test('the default glyph is the filled-circle dot', async () => {
  const screen = await render(<Plans defaultValue="pro" />);
  const indicator = screen.getByTestId('pro-indicator').element();
  const circle = indicator.querySelector('circle');
  expect(circle).not.toBeNull();
  expect(circle).toHaveAttribute('fill', 'currentColor');
});

test('children replace the default glyph', async () => {
  const screen = await render(
    <RadioGroup.Root aria-label="Plan" defaultValue="pro">
      <RadioGroup.Item value="pro" aria-label="Pro">
        <RadioGroup.Indicator data-testid="custom">custom</RadioGroup.Indicator>
      </RadioGroup.Item>
    </RadioGroup.Root>,
  );
  const indicator = screen.getByTestId('custom').element();
  expect(indicator.textContent).toBe('custom');
  expect(indicator.querySelector('svg')).toBeNull();
});

test('aria-invalid recolors the item border', async () => {
  const screen = await render(
    <RadioGroup.Root aria-label="Plan">
      <RadioGroup.Item value="ok" aria-label="Valid">
        <RadioGroup.Indicator />
      </RadioGroup.Item>
      <RadioGroup.Item value="bad" aria-label="Invalid" aria-invalid="true">
        <RadioGroup.Indicator />
      </RadioGroup.Item>
    </RadioGroup.Root>,
  );
  const valid = getComputedStyle(screen.getByRole('radio', { name: 'Valid' }).element());
  const invalid = getComputedStyle(screen.getByRole('radio', { name: 'Invalid' }).element());
  expect(invalid.borderTopColor).not.toBe(valid.borderTopColor);
});

test('data-invalid recolors the item border without aria-invalid', async () => {
  const screen = await render(
    <RadioGroup.Root aria-label="Plan">
      <RadioGroup.Item value="ok" aria-label="Valid">
        <RadioGroup.Indicator />
      </RadioGroup.Item>
      <RadioGroup.Item value="bad" aria-label="Invalid" data-invalid="">
        <RadioGroup.Indicator />
      </RadioGroup.Item>
    </RadioGroup.Root>,
  );
  const valid = getComputedStyle(screen.getByRole('radio', { name: 'Valid' }).element());
  const invalid = screen.getByRole('radio', { name: 'Invalid' }).element();
  expect(invalid).not.toHaveAttribute('aria-invalid');
  expect(getComputedStyle(invalid).borderTopColor).not.toBe(valid.borderTopColor);
});

test('disabled dims the item', async () => {
  const screen = await render(
    <RadioGroup.Root aria-label="Plan">
      <RadioGroup.Item value="ok" aria-label="Enabled">
        <RadioGroup.Indicator />
      </RadioGroup.Item>
      <RadioGroup.Item value="off" aria-label="Disabled" disabled>
        <RadioGroup.Indicator />
      </RadioGroup.Item>
    </RadioGroup.Root>,
  );
  const enabled = screen.getByRole('radio', { name: 'Enabled' }).element();
  const disabled = screen.getByRole('radio', { name: 'Disabled' }).element();
  expect(disabled).toHaveAttribute('data-disabled');
  expect(parseFloat(getComputedStyle(disabled).opacity)).toBeLessThan(parseFloat(getComputedStyle(enabled).opacity));
});

test('a kept-mounted unchecked indicator is display none', async () => {
  const screen = await render(
    <RadioGroup.Root aria-label="Plan">
      <RadioGroup.Item value="hobby" aria-label="Hobby">
        <RadioGroup.Indicator keepMounted data-testid="kept" />
      </RadioGroup.Item>
    </RadioGroup.Root>,
  );
  const indicator = screen.getByTestId('kept').element();
  expect(indicator).toHaveAttribute('data-unchecked');
  expect(getComputedStyle(indicator).display).toBe('none');
});

test('public prop types reject className and size', () => {
  expectTypeOf<RadioGroupRootProps>().not.toHaveProperty('className');
  expectTypeOf<RadioGroupItemProps>().not.toHaveProperty('className');
  expectTypeOf<RadioGroupIndicatorProps>().not.toHaveProperty('className');
  expectTypeOf<RadioGroupRootProps>().not.toHaveProperty('size');
  expectTypeOf<RadioGroupItemProps>().not.toHaveProperty('size');
  expectTypeOf<RadioGroupIndicatorProps>().not.toHaveProperty('size');
});
