import { createRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  ButtonGroup,
  type ButtonGroupItemProps,
  type ButtonGroupOrientation,
  type ButtonGroupRootProps,
  type ButtonGroupSize,
  type ButtonGroupTone,
  type ButtonGroupVariant,
} from '@ultima/ui';
import source from '../button-group?raw';

import { themeDocument, themes, violations } from './axe';

/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: variant x size x tone on Root, eighteen combinations, and the
 *    no-props default matches solid / md / accent. Item takes variant and tone of its own.
 * 2. The name resolves: Root is a div role="group" named by aria-label or aria-labelledby,
 *    documented rather than enforced; each Item is named by its text or aria-label.
 * 3. The focus ring lands where the contract says: on Item, including a joined one.
 * 4. The primitive is still wired: Item is a Base UI Button, so disabled, onClick, render, and
 *    ref pass through, and every item is its own tab stop.
 * 5. Documented state drives its style: the joined table on :not(:first-child) zeroes the two
 *    touching corners and drops the leading border per orientation; data-disabled dims.
 * 6. Typecheck passes: className is rejected on both parts, Root carries all three axes plus
 *    orientation, and Item carries variant and tone but no size.
 * 7. Behavior this component wires itself: none — every interaction is the primitive's or the
 *    platform's, which is what the native-keyboard row settles.
 * 8. CSS the primitive reads: none — the joined table is Ultima's own paint, and item 5 asserts it.
 */

const styles = stylex.create({
  override: { paddingInline: space['--ult-space-10'] },
});

type ActionsProps = Omit<ButtonGroupRootProps, 'aria-label'>;

function Actions({ children, ...props }: ActionsProps) {
  return (
    <ButtonGroup.Root aria-label="Text actions" {...props}>
      {children ?? (
        <>
          <ButtonGroup.Item>Cut</ButtonGroup.Item>
          <ButtonGroup.Item>Copy</ButtonGroup.Item>
          <ButtonGroup.Item>Paste</ButtonGroup.Item>
        </>
      )}
    </ButtonGroup.Root>
  );
}

test('the group renders as a div role="group" holding one button per item', async () => {
  const screen = await render(<Actions />);
  const group = screen.getByRole('group', { name: 'Text actions' }).element();
  expect(group.tagName).toBe('DIV');
  expect(group).toHaveAttribute('role', 'group');
  expect(getComputedStyle(group).display).toBe('inline-flex');
  for (const name of ['Cut', 'Copy', 'Paste']) {
    await expect.element(screen.getByRole('button', { name })).toBeVisible();
  }
});

test('the group is named by aria-labelledby as well, and an item by aria-label', async () => {
  const screen = await render(
    <>
      <h2 id="actions-heading">Editing</h2>
      <ButtonGroup.Root aria-labelledby="actions-heading">
        <ButtonGroup.Item aria-label="Bold">
          <svg aria-hidden="true" viewBox="0 0 16 16" width="1em" height="1em" />
        </ButtonGroup.Item>
      </ButtonGroup.Root>
    </>,
  );
  expect(screen.getByRole('group', { name: 'Editing' }).element()).toBeInTheDocument();
  await expect.element(screen.getByRole('button', { name: 'Bold' })).toBeVisible();
});

test('a horizontal group lays its items out in a row by default', async () => {
  const screen = await render(<Actions />);
  const group = screen.getByRole('group', { name: 'Text actions' }).element();
  expect(getComputedStyle(group).flexDirection).toBe('row');
});

test('a vertical group stacks its items', async () => {
  const screen = await render(<Actions orientation="vertical" />);
  const group = screen.getByRole('group', { name: 'Text actions' }).element();
  expect(getComputedStyle(group).flexDirection).toBe('column');
});

for (const variant of ['solid', 'outline', 'ghost'] as const) {
  for (const size of ['sm', 'md', 'lg'] as const) {
    for (const tone of ['accent', 'danger'] as const) {
      test(`${variant} / ${size} / ${tone} on Root renders`, async () => {
        const screen = await render(<Actions variant={variant} size={size} tone={tone} />);
        await expect.element(screen.getByRole('button', { name: 'Copy' })).toBeVisible();
      });
    }
  }
}

test('omitted axes match solid / md / accent', async () => {
  const screen = await render(
    <>
      <Actions />
      <ButtonGroup.Root aria-label="Explicit" variant="solid" size="md" tone="accent">
        <ButtonGroup.Item>One</ButtonGroup.Item>
      </ButtonGroup.Root>
    </>,
  );
  const implicit = screen.getByRole('button', { name: 'Cut' }).element();
  const explicit = screen.getByRole('button', { name: 'One' }).element();
  expect(implicit.className).not.toBe('');
  expect(implicit.className).toBe(explicit.className);
});

test('a horizontal join squares the touching corners and drops the leading border', async () => {
  const screen = await render(<Actions />);
  const first = screen.getByRole('button', { name: 'Cut' }).element();
  const second = screen.getByRole('button', { name: 'Copy' }).element();
  const third = screen.getByRole('button', { name: 'Paste' }).element();

  const firstStyle = getComputedStyle(first);
  expect(firstStyle.getPropertyValue('border-start-start-radius')).not.toBe('0px');
  expect(firstStyle.getPropertyValue('border-end-start-radius')).not.toBe('0px');
  expect(firstStyle.getPropertyValue('border-inline-start-width')).not.toBe('0px');

  for (const element of [second, third]) {
    const style = getComputedStyle(element);
    expect(style.getPropertyValue('border-start-start-radius')).toBe('0px');
    expect(style.getPropertyValue('border-end-start-radius')).toBe('0px');
    expect(style.getPropertyValue('border-inline-start-width')).toBe('0px');
    expect(style.getPropertyValue('border-start-end-radius')).not.toBe('0px');
    expect(style.getPropertyValue('border-end-end-radius')).not.toBe('0px');
    expect(style.getPropertyValue('border-inline-end-width')).not.toBe('0px');
  }
});

test('a vertical join squares the touching corners and drops the leading border', async () => {
  const screen = await render(<Actions orientation="vertical" />);
  const first = screen.getByRole('button', { name: 'Cut' }).element();
  const second = screen.getByRole('button', { name: 'Copy' }).element();

  const firstStyle = getComputedStyle(first);
  expect(firstStyle.getPropertyValue('border-block-start-width')).not.toBe('0px');

  const secondStyle = getComputedStyle(second);
  expect(secondStyle.getPropertyValue('border-block-start-width')).toBe('0px');
  expect(secondStyle.getPropertyValue('border-start-start-radius')).toBe('0px');
  expect(secondStyle.getPropertyValue('border-start-end-radius')).toBe('0px');
  expect(secondStyle.getPropertyValue('border-end-start-radius')).not.toBe('0px');
  expect(secondStyle.getPropertyValue('border-end-end-radius')).not.toBe('0px');
});

test('every item is its own tab stop, and Space and Enter activate the focused one', async () => {
  const onClick = vi.fn();
  const screen = await render(
    <Actions>
      <ButtonGroup.Item>Cut</ButtonGroup.Item>
      <ButtonGroup.Item onClick={onClick}>Copy</ButtonGroup.Item>
      <ButtonGroup.Item>Paste</ButtonGroup.Item>
    </Actions>,
  );
  const cut = screen.getByRole('button', { name: 'Cut' }).element();
  const copy = screen.getByRole('button', { name: 'Copy' }).element();
  const paste = screen.getByRole('button', { name: 'Paste' }).element();

  await userEvent.tab();
  expect(document.activeElement).toBe(cut);
  await userEvent.tab();
  expect(document.activeElement).toBe(copy);

  await userEvent.keyboard('{Enter}');
  expect(onClick).toHaveBeenCalledTimes(1);

  await userEvent.tab();
  expect(document.activeElement).toBe(paste);
  await userEvent.keyboard('{ }');
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('a joined item draws the focus ring', async () => {
  const screen = await render(<Actions />);
  const copy = screen.getByRole('button', { name: 'Copy' }).element();
  copy.focus();
  const style = getComputedStyle(copy);
  expect(parseFloat(style.outlineWidth)).toBeGreaterThan(0);
  expect(style.outlineStyle).toBe('solid');
});

test('an item can take its own variant and tone, which win over the root', async () => {
  const screen = await render(
    <ButtonGroup.Root aria-label="Publish options" variant="solid" tone="accent">
      <ButtonGroup.Item>Publish</ButtonGroup.Item>
      <ButtonGroup.Item variant="outline">Schedule</ButtonGroup.Item>
      <ButtonGroup.Item tone="danger">Discard draft</ButtonGroup.Item>
    </ButtonGroup.Root>,
  );
  const publish = getComputedStyle(screen.getByRole('button', { name: 'Publish' }).element());
  const schedule = getComputedStyle(screen.getByRole('button', { name: 'Schedule' }).element());
  const discard = getComputedStyle(screen.getByRole('button', { name: 'Discard draft' }).element());
  expect(schedule.backgroundColor).not.toBe(publish.backgroundColor);
  expect(discard.backgroundColor).not.toBe(publish.backgroundColor);
});

test('a disabled item dims, stays in the tab order, and swallows activation', async () => {
  const onClick = vi.fn();
  const screen = await render(
    <Actions>
      <ButtonGroup.Item>Cut</ButtonGroup.Item>
      <ButtonGroup.Item disabled onClick={onClick}>
        Copy
      </ButtonGroup.Item>
    </Actions>,
  );
  const copy = screen.getByRole('button', { name: 'Copy' }).element();
  expect(copy).toHaveAttribute('data-disabled');
  expect(parseFloat(getComputedStyle(copy).opacity)).toBeLessThan(1);
  copy.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  expect(onClick).not.toHaveBeenCalled();
});

test('an item outside a group renders at the defaults', async () => {
  const screen = await render(<ButtonGroup.Item>Solo</ButtonGroup.Item>);
  const solo = screen.getByRole('button', { name: 'Solo' }).element();
  const style = getComputedStyle(solo);
  expect(style.getPropertyValue('border-start-start-radius')).not.toBe('0px');
  expect(style.getPropertyValue('border-inline-start-width')).not.toBe('0px');
});

test('render and ref reach the item element, and ref reaches the root', async () => {
  const itemRef = createRef<HTMLElement>();
  const rootRef = createRef<HTMLDivElement>();
  const screen = await render(
    <ButtonGroup.Root aria-label="Links" ref={rootRef}>
      <ButtonGroup.Item ref={itemRef} render={<a href="#install" data-testid="link" />} nativeButton={false}>
        Install
      </ButtonGroup.Item>
    </ButtonGroup.Root>,
  );
  const link = screen.getByTestId('link').element();
  expect(link.tagName).toBe('A');
  expect(itemRef.current).toBe(link);
  expect(rootRef.current).toBe(screen.getByRole('group', { name: 'Links' }).element());
});

test('the style slot wins on both parts', async () => {
  const screen = await render(
    <Actions>
      <ButtonGroup.Item>Cut</ButtonGroup.Item>
      <ButtonGroup.Item style={styles.override}>Copy</ButtonGroup.Item>
    </Actions>,
  );
  const cut = getComputedStyle(screen.getByRole('button', { name: 'Cut' }).element());
  const copy = getComputedStyle(screen.getByRole('button', { name: 'Copy' }).element());
  expect(parseFloat(copy.paddingInlineStart)).toBeGreaterThan(parseFloat(cut.paddingInlineStart));
});

test('the file does not import button.tsx', () => {
  const imports = [...source.matchAll(/from '([^']+)'/g)].map(([, specifier]) => specifier);
  expect(imports).not.toContain('@ultima/ui/button');
  expect(imports).not.toContain('./button');
});

test('the part types expose the axes, the style slot, and no className or item size', () => {
  expectTypeOf<ButtonGroupRootProps>().not.toHaveProperty('className');
  expectTypeOf<ButtonGroupItemProps>().not.toHaveProperty('className');
  expectTypeOf<ButtonGroupRootProps>().toHaveProperty('style');
  expectTypeOf<ButtonGroupItemProps>().toHaveProperty('style');
  expectTypeOf<ButtonGroupRootProps>().toHaveProperty('render');
  expectTypeOf<ButtonGroupItemProps>().toHaveProperty('render');
  expectTypeOf<ButtonGroupItemProps>().not.toHaveProperty('size');
  expectTypeOf<ButtonGroupVariant>().toEqualTypeOf<'solid' | 'outline' | 'ghost'>();
  expectTypeOf<ButtonGroupSize>().toEqualTypeOf<'sm' | 'md' | 'lg'>();
  expectTypeOf<ButtonGroupTone>().toEqualTypeOf<'accent' | 'danger'>();
  expectTypeOf<ButtonGroupOrientation>().toEqualTypeOf<'horizontal' | 'vertical'>();
});

for (const mode of themes) {
  test(`the group has no axe violations in ${mode.name}`, async () => {
    themeDocument(mode);
    await render(
      <main>
        <Actions />
      </main>,
    );
    expect(await violations()).toEqual([]);
  });
}
