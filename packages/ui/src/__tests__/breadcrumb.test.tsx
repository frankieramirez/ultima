import { createRef } from 'react';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Breadcrumb,
  type BreadcrumbItemProps,
  type BreadcrumbLinkProps,
  type BreadcrumbListProps,
  type BreadcrumbRootProps,
  type BreadcrumbSeparatorProps,
} from '@ultima/ui';

/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: no variant, no size, no tone, so one shape, and the trail with no
 *    props is it — including the default name on the landmark.
 * 2. The name resolves: role navigation, named by Ultima's default aria-label, and by the caller's
 *    aria-label or aria-labelledby instead once either is supplied.
 * 3. The focus ring lands where the contract says: on Link; Root, List, Item, and Separator render
 *    none.
 * 4. The primitive is still wired: none, because Breadcrumb's contract row is Native in the Keyboard
 *    column — Tab and Enter are the browser's on a real anchor. Base UI supplies only useRender,
 *    whose reach is render, ref, and the state attributes items 3 and 5 assert.
 * 5. Documented state drives its style: data-active and aria-current="page", either one alone.
 * 6. Typecheck passes: className is rejected on all five parts, and there is no axis to pin.
 * 7. Behavior this component wires itself: none, because every interaction is native navigation or a
 *    style reacting to an attribute, which is item 5. Ultima writes no handler here.
 * 8. CSS the primitive reads: none. No part is styled under the second clause of Styled parts, and
 *    nothing loops, so there is no declaration a primitive depends on to assert.
 */

function Trail() {
  return (
    <Breadcrumb.Root>
      <Breadcrumb.List data-testid="list">
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/">Home</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/components">Components</Breadcrumb.Link>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>
  );
}

test('a trail with no props is a nav named Breadcrumb over an ordered list', async () => {
  const screen = await render(<Trail />);
  const nav = screen.getByRole('navigation', { name: 'Breadcrumb' }).element();
  expect(nav.tagName).toBe('NAV');
  const list = screen.getByTestId('list').element();
  expect(list.tagName).toBe('OL');
  expect(list.parentElement).toBe(nav);
  expect(screen.getByRole('link', { name: 'Home' }).element().tagName).toBe('A');
  expect(screen.getByRole('listitem').all()[0]!.element().tagName).toBe('LI');
});

test('the default name is absent once the caller names the landmark', async () => {
  const screen = await render(
    <>
      <Breadcrumb.Root aria-label="Docs trail" data-testid="labelled" />
      <Breadcrumb.Root aria-labelledby="trail-heading" data-testid="labelledby" />
      <h2 id="trail-heading">Settings trail</h2>
    </>,
  );
  expect(screen.getByTestId('labelled').element()).toHaveAttribute('aria-label', 'Docs trail');
  const byId = screen.getByTestId('labelledby').element();
  expect(byId).not.toHaveAttribute('aria-label');
  expect(byId).toHaveAttribute('aria-labelledby', 'trail-heading');
  await expect.element(screen.getByRole('navigation', { name: 'Settings trail' })).toBeInTheDocument();
});

test('an aria-label that resolves to undefined still gets the default name', async () => {
  const screen = await render(<Breadcrumb.Root aria-label={undefined} data-testid="optional" />);
  expect(screen.getByTestId('optional').element()).toHaveAttribute('aria-label', 'Breadcrumb');
});

test('the current crumb is both attributes, and the style follows either of them', async () => {
  const screen = await render(
    <Breadcrumb.Root>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/">Home</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/settings" active>
            Settings
          </Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/router" aria-current="page">
            Router
          </Breadcrumb.Link>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>,
  );

  const resting = screen.getByRole('link', { name: 'Home' }).element();
  const active = screen.getByRole('link', { name: 'Settings' }).element();
  const router = screen.getByRole('link', { name: 'Router' }).element();

  expect(active).toHaveAttribute('aria-current', 'page');
  expect(active).toHaveAttribute('data-active', '');
  expect(resting).not.toHaveAttribute('aria-current');
  expect(resting).not.toHaveAttribute('data-active');
  expect(router).not.toHaveAttribute('data-active');

  expect(getComputedStyle(active).fontWeight).not.toBe(getComputedStyle(resting).fontWeight);
  expect(getComputedStyle(active).color).not.toBe(getComputedStyle(resting).color);
  expect(getComputedStyle(router).fontWeight).toBe(getComputedStyle(active).fontWeight);
  expect(getComputedStyle(router).color).toBe(getComputedStyle(active).color);
});

test('the namespace is five parts, with no Page and no Ellipsis', () => {
  expect(Object.keys(Breadcrumb).sort()).toEqual(['Item', 'Link', 'List', 'Root', 'Separator']);
});

test('the separator is a presentational li outside the item count, holding a 1em chevron', async () => {
  const screen = await render(<Trail />);
  const list = screen.getByTestId('list').element();

  expect(list.children.length).toBe(3);
  expect(screen.getByRole('listitem').all().length).toBe(2);

  const separator = list.querySelector('[role="presentation"]')!;
  expect(separator.tagName).toBe('LI');
  expect(separator).toHaveAttribute('aria-hidden', 'true');

  const glyph = separator.querySelector('svg')!;
  expect(glyph.getAttribute('viewBox')).toBe('0 0 24 24');
  expect(glyph.getAttribute('fill')).toBe('none');
  expect(getComputedStyle(glyph).strokeWidth).toBe('1.5px');
  expect(getComputedStyle(glyph).stroke).toBe(getComputedStyle(separator).color);
  expect(getComputedStyle(glyph).flexShrink).toBe('0');
  const em = parseFloat(getComputedStyle(separator).fontSize);
  expect(glyph.getBoundingClientRect().width).toBeCloseTo(em, 1);
});

test('children replace the built-in glyph', async () => {
  const screen = await render(
    <Breadcrumb.Root>
      <Breadcrumb.List>
        <Breadcrumb.Separator data-testid="slash">/</Breadcrumb.Separator>
      </Breadcrumb.List>
    </Breadcrumb.Root>,
  );
  const separator = screen.getByTestId('slash').element();
  expect(separator.querySelector('svg')).toBeNull();
  expect(separator.textContent).toBe('/');
});

test('the ring lands on Link, and on nothing else Breadcrumb paints', async () => {
  const screen = await render(<Trail />);
  const list = screen.getByTestId('list').element();
  const nav = list.parentElement!;
  const crumb = screen.getByRole('listitem').all()[0]!.element();
  const separator = list.querySelector('[role="presentation"]')!;

  for (const part of [nav, list, crumb, separator]) {
    expect(getComputedStyle(part).outlineStyle).toBe('none');
  }

  await userEvent.tab();
  const link = screen.getByRole('link', { name: 'Home' }).element();
  expect(document.activeElement).toBe(link);
  expect(getComputedStyle(link).outlineStyle).not.toBe('none');
  expect(parseFloat(getComputedStyle(link).outlineWidth)).toBeGreaterThan(0);
});

test('the list is reset to no marker, no margin, and no padding, and wraps', async () => {
  const screen = await render(<Trail />);
  const list = getComputedStyle(screen.getByTestId('list').element());

  expect(list.listStyleType).toBe('none');
  expect(list.margin).toBe('0px');
  expect(list.padding).toBe('0px');
  expect(list.display).toBe('flex');
  expect(list.flexWrap).toBe('wrap');
  expect(parseFloat(list.columnGap)).toBeGreaterThan(0);
});

test('render and ref reach all five parts', async () => {
  const refs = {
    root: createRef<HTMLElement>(),
    list: createRef<HTMLOListElement>(),
    item: createRef<HTMLLIElement>(),
    link: createRef<HTMLAnchorElement>(),
    separator: createRef<HTMLLIElement>(),
  };
  const screen = await render(
    <Breadcrumb.Root ref={refs.root} render={<div role="navigation" aria-label="Trail" />}>
      <Breadcrumb.List ref={refs.list} render={<ul data-testid="list" />}>
        <Breadcrumb.Item ref={refs.item} render={<span role="listitem" data-testid="item" />}>
          <Breadcrumb.Link ref={refs.link} render={<span data-testid="last" />} active>
            Settings
          </Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator ref={refs.separator} render={<span data-testid="separator" />} />
      </Breadcrumb.List>
    </Breadcrumb.Root>,
  );

  expect(refs.root.current!.tagName).toBe('DIV');
  expect(refs.root.current).toBe(screen.getByRole('navigation', { name: 'Trail' }).element());
  expect(refs.list.current!.tagName).toBe('UL');
  expect(refs.item.current as Element | null).toBe(screen.getByTestId('item').element());

  const last = screen.getByTestId('last').element();
  expect(refs.link.current as Element | null).toBe(last);
  expect(last.tagName).toBe('SPAN');
  expect(last).not.toHaveAttribute('role');
  expect(last).toHaveAttribute('aria-current', 'page');

  const separator = screen.getByTestId('separator').element();
  expect(refs.separator.current as Element | null).toBe(separator);
  expect(separator).toHaveAttribute('role', 'presentation');
  expect(separator.querySelector('svg')).not.toBeNull();
});

test('public prop types expose the style slot, render, and no axis', () => {
  expectTypeOf<BreadcrumbRootProps>().not.toHaveProperty('className');
  expectTypeOf<BreadcrumbListProps>().not.toHaveProperty('className');
  expectTypeOf<BreadcrumbItemProps>().not.toHaveProperty('className');
  expectTypeOf<BreadcrumbLinkProps>().not.toHaveProperty('className');
  expectTypeOf<BreadcrumbSeparatorProps>().not.toHaveProperty('className');

  for (const part of ['variant', 'size', 'tone'] as const) {
    expectTypeOf<BreadcrumbRootProps>().not.toHaveProperty(part);
    expectTypeOf<BreadcrumbLinkProps>().not.toHaveProperty(part);
  }

  expectTypeOf<BreadcrumbRootProps>().toHaveProperty('render');
  expectTypeOf<BreadcrumbListProps>().toHaveProperty('render');
  expectTypeOf<BreadcrumbItemProps>().toHaveProperty('render');
  expectTypeOf<BreadcrumbLinkProps>().toHaveProperty('render');
  expectTypeOf<BreadcrumbSeparatorProps>().toHaveProperty('render');
  expectTypeOf<BreadcrumbSeparatorProps>().toHaveProperty('style');
  expectTypeOf<BreadcrumbLinkProps>().toHaveProperty('active').toEqualTypeOf<boolean | undefined>();
});
