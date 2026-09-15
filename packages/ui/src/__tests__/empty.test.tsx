import { createRef } from 'react';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Button,
  Empty,
  type EmptyDescriptionProps,
  type EmptyIconProps,
  type EmptyRootProps,
  type EmptyTitleProps,
} from '@ultima/ui';

/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: no tone, no variant, no size, so one shape, and no props is it.
 * 2. The name resolves: visible text. Title is an h3 by default, and Description names it alone.
 * 3. The focus ring lands where the contract says: on nothing Empty paints. An action in children
 *    is a catalogue Button, which keeps its own ring.
 * 4. The primitive is still wired: none, beyond Base UI's useRender reaching Root and Title.
 * 5. Documented state drives its style: none. Empty has no data-* state of its own.
 * 6. Typecheck passes: className is rejected, render is on Root and Title only, and there is no axis.
 * 7. Behavior this component wires itself: none, because every interaction is the primitive's, which
 *    is item 4, or a style reacting to a data-* attribute, which is items 5 and 8.
 * 8. CSS the primitive reads: none. Empty does not loop and no primitive reads a declaration of its.
 */

function NoResults({ title = 'No reports yet' }: { title?: string }) {
  return (
    <Empty.Root data-testid="empty">
      <Empty.Title>{title}</Empty.Title>
      <Empty.Description>Run an audit to see its findings here.</Empty.Description>
    </Empty.Root>
  );
}

test('an empty state with no props paints one sunken surface', async () => {
  const screen = await render(<NoResults />);
  await expect.element(screen.getByRole('heading', { level: 3, name: 'No reports yet' })).toBeVisible();
  const root = screen.getByTestId('empty').element();
  expect(root.tagName).toBe('DIV');
  expect(root.className).not.toBe('');
  expect(getComputedStyle(root).backgroundColor).not.toBe(getComputedStyle(document.body).backgroundColor);
});

test('the title is a level 3 heading and the root is a div with no live role', async () => {
  const screen = await render(<NoResults />);
  const root = screen.getByTestId('empty').element();
  expect(root).not.toHaveAttribute('role');
  expect(screen.container.querySelector('[role="alert"], [role="status"]')).toBeNull();
});

test('the description names the empty state when there is no title', async () => {
  const screen = await render(
    <Empty.Root data-testid="empty">
      <Empty.Description>Nothing matched that filter.</Empty.Description>
    </Empty.Root>,
  );
  await expect.element(screen.getByText('Nothing matched that filter.')).toBeVisible();
  expect(screen.container.querySelector('h3')).toBeNull();
});

test('Empty paints no focusable part, and an action in children keeps its own ring', async () => {
  const screen = await render(
    <Empty.Root data-testid="empty">
      <Empty.Title>No reports yet</Empty.Title>
      <Button>Run an audit</Button>
    </Empty.Root>,
  );
  const root = screen.getByTestId('empty').element();
  const action = screen.getByRole('button', { name: 'Run an audit' }).element();
  expect(getComputedStyle(root).outlineStyle).toBe('none');
  expect(getComputedStyle(screen.getByRole('heading', { level: 3 }).element()).outlineStyle).toBe('none');

  await userEvent.tab();
  expect(document.activeElement).toBe(action);
  expect(getComputedStyle(action).outlineStyle).not.toBe('none');
  expect(parseFloat(getComputedStyle(action).outlineWidth)).toBeGreaterThan(0);
});

test('render and ref reach the root and the title', async () => {
  const rootRef = createRef<HTMLDivElement>();
  const titleRef = createRef<HTMLHeadingElement>();
  const screen = await render(
    <Empty.Root ref={rootRef} render={<section data-custom="root" />} data-testid="empty">
      <Empty.Title ref={titleRef} render={<h2 data-custom="title" />}>
        Nothing here
      </Empty.Title>
    </Empty.Root>,
  );
  const root = screen.getByTestId('empty').element();
  expect(root.tagName).toBe('SECTION');
  expect(rootRef.current).toBe(root);
  expect(root).toHaveAttribute('data-custom', 'root');
  const title = screen.getByRole('heading', { level: 2, name: 'Nothing here' }).element();
  expect(titleRef.current).toBe(title);
  expect(title).toHaveAttribute('data-custom', 'title');
});

test('Icon is aria-hidden, omitted when unused, and takes the caller glyph', async () => {
  const screen = await render(
    <>
      <Empty.Root data-testid="with-icon">
        <Empty.Icon data-testid="icon">
          <svg data-testid="glyph" viewBox="0 0 16 16" width="1em" height="1em" />
        </Empty.Icon>
        <Empty.Title>With icon</Empty.Title>
      </Empty.Root>
      <Empty.Root data-testid="empty-icon">
        <Empty.Icon />
        <Empty.Title>Empty icon</Empty.Title>
      </Empty.Root>
      <Empty.Root data-testid="no-icon">
        <Empty.Title>No icon</Empty.Title>
      </Empty.Root>
    </>,
  );
  const icon = screen.getByTestId('icon').element();
  expect(icon).toHaveAttribute('aria-hidden', 'true');
  expect(screen.getByTestId('glyph').element().parentElement).toBe(icon);
  expect(screen.getByTestId('empty-icon').element().querySelector('[aria-hidden]')).toBeNull();
  expect(screen.getByTestId('no-icon').element().querySelector('[aria-hidden]')).toBeNull();
});

test('public prop types expose the style slot and no axis', () => {
  expectTypeOf<EmptyRootProps>().not.toHaveProperty('className');
  expectTypeOf<EmptyTitleProps>().not.toHaveProperty('className');
  expectTypeOf<EmptyDescriptionProps>().not.toHaveProperty('className');
  expectTypeOf<EmptyIconProps>().not.toHaveProperty('className');
  expectTypeOf<EmptyRootProps>().not.toHaveProperty('tone');
  expectTypeOf<EmptyRootProps>().not.toHaveProperty('variant');
  expectTypeOf<EmptyRootProps>().not.toHaveProperty('size');
  expectTypeOf<EmptyRootProps>().toHaveProperty('render');
  expectTypeOf<EmptyTitleProps>().toHaveProperty('render');
  expectTypeOf<EmptyDescriptionProps>().not.toHaveProperty('render');
  expectTypeOf<EmptyIconProps>().not.toHaveProperty('render');
  expectTypeOf<EmptyRootProps>().toHaveProperty('style');
  expectTypeOf<EmptyIconProps>().toHaveProperty('style');
});
