import { createRef } from 'react';
import { userEvent } from 'vitest/browser';
import { expect, expectTypeOf, test } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Pagination,
  type PaginationEllipsisProps,
  type PaginationItemProps,
  type PaginationListProps,
  type PaginationNextProps,
  type PaginationPage,
  type PaginationPageProps,
  type PaginationPreviousProps,
  type PaginationRootProps,
} from '@ultima/ui';

/**
 * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)
 * 1. Every combination renders: no variant, no size, no tone, so one shape, and the window with no
 *    props is it — including the default name on the landmark. No hook, because there is no context.
 * 2. The name resolves: role navigation, named by Ultima's default aria-label, and by the caller's
 *    aria-label or aria-labelledby instead once either is supplied.
 * 3. The focus ring lands where the contract says: on Page, Previous, and Next; Root, List, Item,
 *    and Ellipsis render none.
 * 4. The primitive is still wired: none, because Pagination's contract row is Native in the Keyboard
 *    column — Tab and Enter are the browser's on a real anchor. Base UI supplies only useRender,
 *    whose reach is render, ref, and the state attributes items 5 and 7 assert.
 * 5. Documented state drives its style: data-active and aria-current="page" on Page, either one
 *    alone; data-disabled on the ends.
 * 6. Typecheck passes: className is rejected on all seven parts, there is no axis to pin, and
 *    getPages is a function on the namespace rather than a use* hook.
 * 7. Behavior this component wires itself: the ends. A disabled Previous or Next is the ARIA pair
 *    and never the native attribute, stays focusable, and has its activation swallowed by Ultima.
 *    This is the first use of item 7 since v0.1, and getPages is the second: pure arithmetic Ultima
 *    owns, exercised at its boundaries rather than through the DOM.
 * 8. CSS the primitive reads: none. No part is styled under the second clause of Styled parts, and
 *    nothing loops, so there is no declaration a primitive depends on to assert.
 */

function Window({ page = 1, count = 10 }: { page?: number; count?: number }) {
  return (
    <Pagination.Root>
      <Pagination.List data-testid="list">
        <Pagination.Item>
          <Pagination.Previous href={`?page=${Math.max(page - 1, 1)}`} disabled={page === 1}>
            Previous
          </Pagination.Previous>
        </Pagination.Item>
        {Pagination.getPages({ page, count }).map((entry, index) =>
          entry.type === 'ellipsis' ? (
            <Pagination.Item key={`ellipsis-${index}`}>
              <Pagination.Ellipsis data-testid={`ellipsis-${index}`} />
            </Pagination.Item>
          ) : (
            <Pagination.Item key={entry.page}>
              <Pagination.Page href={`?page=${entry.page}`} current={entry.page === page}>
                {entry.page}
              </Pagination.Page>
            </Pagination.Item>
          ),
        )}
        <Pagination.Item>
          <Pagination.Next href={`?page=${Math.min(page + 1, count)}`} disabled={page === count}>
            Next
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.List>
    </Pagination.Root>
  );
}

test('a window that fits shows every page and no ellipsis', () => {
  expect(Pagination.getPages({ page: 1, count: 7 })).toEqual([
    { type: 'page', page: 1 },
    { type: 'page', page: 2 },
    { type: 'page', page: 3 },
    { type: 'page', page: 4 },
    { type: 'page', page: 5 },
    { type: 'page', page: 6 },
    { type: 'page', page: 7 },
  ]);
});

const shape = (pages: PaginationPage[]) =>
  pages.map((entry) => (entry.type === 'ellipsis' ? '…' : entry.page));

test('one ellipsis when only the far end is truncated', () => {
  expect(shape(Pagination.getPages({ page: 1, count: 10 }))).toEqual([1, 2, 3, 4, 5, '…', 10]);
  expect(shape(Pagination.getPages({ page: 10, count: 10 }))).toEqual([1, '…', 6, 7, 8, 9, 10]);
});

test('two ellipses when the window sits in the middle', () => {
  expect(shape(Pagination.getPages({ page: 5, count: 10 }))).toEqual([1, '…', 4, 5, 6, '…', 10]);
});

test('a single hidden page is rendered rather than collapsed to an ellipsis', () => {
  expect(shape(Pagination.getPages({ page: 4, count: 8 }))).toEqual([1, 2, 3, 4, 5, '…', 8]);
});

test('fewer pages than the window shows them all, down to one and to none', () => {
  expect(shape(Pagination.getPages({ page: 2, count: 3 }))).toEqual([1, 2, 3]);
  expect(shape(Pagination.getPages({ page: 1, count: 1 }))).toEqual([1]);
  expect(Pagination.getPages({ page: 1, count: 0 })).toEqual([]);
});

test('siblingCount and boundaryCount widen the window', () => {
  expect(shape(Pagination.getPages({ page: 10, count: 20, siblingCount: 2 }))).toEqual([
    1, '…', 8, 9, 10, 11, 12, '…', 20,
  ]);
  expect(shape(Pagination.getPages({ page: 10, count: 20, boundaryCount: 2 }))).toEqual([
    1, 2, '…', 9, 10, 11, '…', 19, 20,
  ]);
  expect(shape(Pagination.getPages({ page: 3, count: 9, siblingCount: 0 }))).toEqual([1, 2, 3, '…', 9]);
});

test('getPages is callable in a loop and in a condition, reading nothing outside its arguments', () => {
  const windows = [1, 2, 3].map((page) => Pagination.getPages({ page, count: 12 }));
  expect(windows.map((pages) => pages.length)).toEqual([7, 7, 7]);
  const conditional = windows.length > 0 ? Pagination.getPages({ page: 6, count: 12 }) : [];
  expect(shape(conditional)).toEqual([1, '…', 5, 6, 7, '…', 12]);
});

test('the namespace is seven parts plus getPages', () => {
  expect(Object.keys(Pagination).sort()).toEqual([
    'Ellipsis',
    'Item',
    'List',
    'Next',
    'Page',
    'Previous',
    'Root',
    'getPages',
  ]);
});

test('a control with no props is a nav named Pagination over an unordered list', async () => {
  const screen = await render(<Window />);
  const nav = screen.getByRole('navigation', { name: 'Pagination' }).element();
  expect(nav.tagName).toBe('NAV');
  const list = screen.getByTestId('list').element();
  expect(list.tagName).toBe('UL');
  expect(list.parentElement).toBe(nav);
  expect(screen.getByRole('listitem').all()[0]!.element().tagName).toBe('LI');
  expect(screen.getByRole('link', { name: '1' }).element().tagName).toBe('A');
  expect(screen.getByRole('link', { name: 'Previous' }).element().tagName).toBe('A');
});

test('a disabled end is the ARIA pair and never the native attribute', async () => {
  const screen = await render(<Window page={1} count={10} />);
  const previous = screen.getByRole('link', { name: 'Previous' }).element();
  const next = screen.getByRole('link', { name: 'Next' }).element();

  expect(previous).toHaveAttribute('aria-disabled', 'true');
  expect(previous).toHaveAttribute('data-disabled', '');
  expect(previous).not.toHaveAttribute('disabled');
  expect((previous as HTMLAnchorElement & { disabled?: boolean }).disabled).toBeUndefined();

  expect(next).not.toHaveAttribute('aria-disabled');
  expect(next).not.toHaveAttribute('data-disabled');
});

test('a disabled end keeps focus and has its activation swallowed, as an anchor and as a button', async () => {
  const seen: string[] = [];
  const screen = await render(
    <Pagination.Root>
      <Pagination.List>
        <Pagination.Item>
          <Pagination.Previous href="?page=1" disabled onClick={() => seen.push('anchor')}>
            Previous
          </Pagination.Previous>
        </Pagination.Item>
        <Pagination.Item>
          <Pagination.Next render={<button type="button" />} disabled onClick={() => seen.push('button')}>
            Next
          </Pagination.Next>
        </Pagination.Item>
        <Pagination.Item>
          <Pagination.Next render={<button type="button" />} onClick={() => seen.push('live')}>
            Last
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.List>
    </Pagination.Root>,
  );

  const bubbled: string[] = [];
  const listener = (event: Event) => bubbled.push((event.target as HTMLElement).textContent ?? '');
  document.addEventListener('click', listener);

  const anchor = screen.getByRole('link', { name: 'Previous' }).element();
  const button = screen.getByRole('button', { name: 'Next' }).element();
  const live = screen.getByRole('button', { name: 'Last' }).element();

  await userEvent.tab();
  expect(document.activeElement).toBe(anchor);
  await userEvent.keyboard('{Enter}');
  expect(document.activeElement).toBe(anchor);

  await userEvent.tab();
  expect(document.activeElement).toBe(button);
  await userEvent.keyboard('{Enter}');
  expect(document.activeElement).toBe(button);
  expect(document.activeElement).not.toBe(document.body);

  expect(seen).toEqual([]);
  expect(bubbled).toEqual([]);

  await userEvent.tab();
  expect(document.activeElement).toBe(live);
  await userEvent.keyboard('{Enter}');
  expect(seen).toEqual(['live']);
  expect(bubbled).toEqual(['Last']);

  document.removeEventListener('click', listener);
});

test('a disabled end reads as disabled without losing its hover state', async () => {
  const screen = await render(<Window page={1} count={10} />);
  const previous = getComputedStyle(screen.getByRole('link', { name: 'Previous' }).element());
  const next = getComputedStyle(screen.getByRole('link', { name: 'Next' }).element());

  expect(parseFloat(previous.opacity)).toBeLessThan(1);
  expect(parseFloat(next.opacity)).toBe(1);
  expect(previous.cursor).toBe('default');
  expect(next.cursor).toBe('pointer');
  expect(previous.pointerEvents).toBe(next.pointerEvents);
  expect(previous.pointerEvents).not.toBe('none');

  /** The row is shared, so a page rendered as a button reads the same as the arrows beside it. */
  expect(getComputedStyle(screen.getByRole('link', { name: '1' }).element()).cursor).toBe('pointer');
});

test('the default name is absent once the caller names the landmark', async () => {
  const screen = await render(
    <>
      <Pagination.Root aria-label="Results pages" data-testid="labelled" />
      <Pagination.Root aria-labelledby="results-heading" data-testid="labelledby" />
      <h2 id="results-heading">Search results</h2>
    </>,
  );
  expect(screen.getByTestId('labelled').element()).toHaveAttribute('aria-label', 'Results pages');
  const byId = screen.getByTestId('labelledby').element();
  expect(byId).not.toHaveAttribute('aria-label');
  expect(byId).toHaveAttribute('aria-labelledby', 'results-heading');
  await expect.element(screen.getByRole('navigation', { name: 'Search results' })).toBeInTheDocument();
});

test('an aria-label that resolves to undefined still gets the default name', async () => {
  const screen = await render(<Pagination.Root aria-label={undefined} data-testid="optional" />);
  expect(screen.getByTestId('optional').element()).toHaveAttribute('aria-label', 'Pagination');
});

test('the current page is both attributes, and the style follows either of them', async () => {
  const screen = await render(
    <Pagination.Root>
      <Pagination.List>
        <Pagination.Item>
          <Pagination.Page href="?page=1">1</Pagination.Page>
        </Pagination.Item>
        <Pagination.Item>
          <Pagination.Page href="?page=2" current>
            2
          </Pagination.Page>
        </Pagination.Item>
        <Pagination.Item>
          <Pagination.Page href="?page=3" aria-current="page">
            3
          </Pagination.Page>
        </Pagination.Item>
      </Pagination.List>
    </Pagination.Root>,
  );

  const resting = screen.getByRole('link', { name: '1' }).element();
  const current = screen.getByRole('link', { name: '2' }).element();
  const router = screen.getByRole('link', { name: '3' }).element();

  expect(current).toHaveAttribute('aria-current', 'page');
  expect(current).toHaveAttribute('data-active', '');
  expect(resting).not.toHaveAttribute('aria-current');
  expect(resting).not.toHaveAttribute('data-active');
  expect(router).not.toHaveAttribute('data-active');

  expect(getComputedStyle(current).fontWeight).not.toBe(getComputedStyle(resting).fontWeight);
  expect(getComputedStyle(current).color).not.toBe(getComputedStyle(resting).color);
  expect(getComputedStyle(current).backgroundColor).not.toBe(getComputedStyle(resting).backgroundColor);
  expect(getComputedStyle(router).fontWeight).toBe(getComputedStyle(current).fontWeight);
  expect(getComputedStyle(router).backgroundColor).toBe(getComputedStyle(current).backgroundColor);
});

test('the ring lands on the three controls, and on nothing else Pagination paints', async () => {
  const screen = await render(<Window page={5} count={20} />);
  const list = screen.getByTestId('list').element();
  const nav = list.parentElement!;
  const item = screen.getByRole('listitem').all()[0]!.element();
  const ellipsis = list.querySelector('[aria-hidden="true"]')!;

  for (const part of [nav, list, item, ellipsis]) {
    expect(getComputedStyle(part).outlineStyle).toBe('none');
  }

  await userEvent.tab();
  const previous = screen.getByRole('link', { name: 'Previous' }).element();
  expect(document.activeElement).toBe(previous);
  expect(getComputedStyle(previous).outlineStyle).not.toBe('none');
  expect(parseFloat(getComputedStyle(previous).outlineWidth)).toBeGreaterThan(0);

  await userEvent.tab();
  const first = screen.getByRole('link', { name: '1' }).element();
  expect(document.activeElement).toBe(first);
  expect(parseFloat(getComputedStyle(first).outlineWidth)).toBeGreaterThan(0);
});

test('the ellipsis takes an item box, holds a 1em glyph, and takes neither hover nor ring', async () => {
  const screen = await render(<Window page={10} count={20} />);
  const list = screen.getByTestId('list').element();
  const ellipsis = screen.getByTestId('ellipsis-1').element();
  const page = screen.getByRole('link', { name: '10' }).element();

  expect(list.querySelectorAll('span[aria-hidden="true"]').length).toBe(2);
  expect(ellipsis).toHaveAttribute('aria-hidden', 'true');
  expect(ellipsis.textContent).toBe('');

  const box = ellipsis.getBoundingClientRect();
  const item = page.getBoundingClientRect();
  expect(box.height).toBeCloseTo(item.height, 1);
  expect(box.width).toBeCloseTo(item.width, 1);

  expect(getComputedStyle(ellipsis).outlineStyle).toBe('none');
  expect(getComputedStyle(ellipsis).backgroundColor).toBe(getComputedStyle(list).backgroundColor);

  const glyph = ellipsis.querySelector('svg')!;
  expect(glyph.getAttribute('viewBox')).toBe('0 0 24 24');
  expect(glyph.getAttribute('fill')).toBe('none');
  expect(getComputedStyle(glyph).strokeWidth).toBe('1.5px');
  expect(getComputedStyle(glyph).stroke).toBe(getComputedStyle(ellipsis).color);
  expect(getComputedStyle(glyph).flexShrink).toBe('0');
  const em = parseFloat(getComputedStyle(ellipsis).fontSize);
  expect(glyph.getBoundingClientRect().width).toBeCloseTo(em, 1);
});

test('children replace the built-in ellipsis glyph', async () => {
  const screen = await render(<Pagination.Ellipsis data-testid="dots">…</Pagination.Ellipsis>);
  const ellipsis = screen.getByTestId('dots').element();
  expect(ellipsis.querySelector('svg')).toBeNull();
  expect(ellipsis.textContent).toBe('…');
});

test('a page item is square until its label outgrows the box', async () => {
  const screen = await render(
    <Pagination.Root>
      <Pagination.List>
        <Pagination.Item>
          <Pagination.Page href="?page=7">7</Pagination.Page>
        </Pagination.Item>
        <Pagination.Item>
          <Pagination.Page href="?page=1000000">1000000</Pagination.Page>
        </Pagination.Item>
      </Pagination.List>
    </Pagination.Root>,
  );
  const single = screen.getByRole('link', { name: '7' }).element().getBoundingClientRect();
  const long = screen.getByRole('link', { name: '1000000' }).element().getBoundingClientRect();

  expect(single.width).toBeCloseTo(single.height, 1);
  expect(long.width).toBeGreaterThan(long.height);
  expect(long.height).toBeCloseTo(single.height, 1);
});

test('Pagination mounts no live region anywhere', async () => {
  const screen = await render(<Window page={5} count={20} />);
  const nav = screen.getByTestId('list').element().parentElement!;

  expect(nav.querySelectorAll('[aria-live]').length).toBe(0);
  expect(nav.querySelectorAll('[role="status"], [role="alert"], [role="log"]').length).toBe(0);
  expect(nav.matches('[aria-live], [role="status"], [role="alert"]')).toBe(false);
});

test('render and ref reach all seven parts', async () => {
  const refs = {
    root: createRef<HTMLElement>(),
    list: createRef<HTMLUListElement>(),
    item: createRef<HTMLLIElement>(),
    page: createRef<HTMLAnchorElement>(),
    previous: createRef<HTMLAnchorElement>(),
    next: createRef<HTMLAnchorElement>(),
    ellipsis: createRef<HTMLSpanElement>(),
  };
  const screen = await render(
    <Pagination.Root ref={refs.root} render={<div role="navigation" aria-label="Pages" />}>
      <Pagination.List ref={refs.list} render={<ol data-testid="list" />}>
        <Pagination.Item ref={refs.item} render={<span role="listitem" data-testid="item" />}>
          <Pagination.Page ref={refs.page} render={<button type="button" />} current>
            4
          </Pagination.Page>
        </Pagination.Item>
        <Pagination.Item>
          <Pagination.Previous ref={refs.previous} render={<button type="button" />} disabled>
            Previous
          </Pagination.Previous>
        </Pagination.Item>
        <Pagination.Item>
          <Pagination.Next ref={refs.next} render={<button type="button" />}>
            Next
          </Pagination.Next>
        </Pagination.Item>
        <Pagination.Ellipsis ref={refs.ellipsis} render={<li data-testid="ellipsis" />} />
      </Pagination.List>
    </Pagination.Root>,
  );

  expect(refs.root.current!.tagName).toBe('DIV');
  expect(refs.root.current).toBe(screen.getByRole('navigation', { name: 'Pages' }).element());
  expect(refs.list.current!.tagName).toBe('OL');
  expect(refs.item.current as Element | null).toBe(screen.getByTestId('item').element());

  const current = screen.getByRole('button', { name: '4' }).element();
  expect(refs.page.current as Element | null).toBe(current);
  expect(current.tagName).toBe('BUTTON');
  expect(current).toHaveAttribute('aria-current', 'page');
  expect(current).toHaveAttribute('data-active', '');

  const previous = screen.getByRole('button', { name: 'Previous' }).element();
  expect(refs.previous.current as Element | null).toBe(previous);
  expect(previous).toHaveAttribute('aria-disabled', 'true');
  expect(previous).not.toHaveAttribute('disabled');
  expect(refs.next.current as Element | null).toBe(screen.getByRole('button', { name: 'Next' }).element());

  const ellipsis = screen.getByTestId('ellipsis').element();
  expect(refs.ellipsis.current as Element | null).toBe(ellipsis);
  expect(ellipsis.tagName).toBe('LI');
  expect(ellipsis.querySelector('svg')).not.toBeNull();
});

test('public prop types expose the style slot, render, and no axis', () => {
  expectTypeOf<PaginationRootProps>().not.toHaveProperty('className');
  expectTypeOf<PaginationListProps>().not.toHaveProperty('className');
  expectTypeOf<PaginationItemProps>().not.toHaveProperty('className');
  expectTypeOf<PaginationPageProps>().not.toHaveProperty('className');
  expectTypeOf<PaginationPreviousProps>().not.toHaveProperty('className');
  expectTypeOf<PaginationNextProps>().not.toHaveProperty('className');
  expectTypeOf<PaginationEllipsisProps>().not.toHaveProperty('className');

  for (const axis of ['variant', 'size', 'tone'] as const) {
    expectTypeOf<PaginationRootProps>().not.toHaveProperty(axis);
    expectTypeOf<PaginationPageProps>().not.toHaveProperty(axis);
    expectTypeOf<PaginationPreviousProps>().not.toHaveProperty(axis);
  }

  expectTypeOf<PaginationRootProps>().toHaveProperty('render');
  expectTypeOf<PaginationListProps>().toHaveProperty('render');
  expectTypeOf<PaginationItemProps>().toHaveProperty('render');
  expectTypeOf<PaginationEllipsisProps>().toHaveProperty('render');
  expectTypeOf<PaginationEllipsisProps>().toHaveProperty('style');
  expectTypeOf<PaginationPageProps>().toHaveProperty('current').toEqualTypeOf<boolean | undefined>();
  expectTypeOf<PaginationPreviousProps>().toHaveProperty('disabled').toEqualTypeOf<boolean | undefined>();
  expectTypeOf<PaginationNextProps>().toHaveProperty('disabled').toEqualTypeOf<boolean | undefined>();

  expectTypeOf(Pagination.getPages).toBeFunction();
  expectTypeOf<PaginationPage>().toEqualTypeOf<{ type: 'page'; page: number } | { type: 'ellipsis' }>();
  expect(Object.keys(Pagination).some((key) => key.startsWith('use'))).toBe(false);
});
