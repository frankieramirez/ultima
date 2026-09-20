'use client';

import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';

const styles = stylex.create({
  root: {
    alignItems: 'center',
    boxSizing: 'border-box',
    color: color['--ult-color-text-muted'],
    display: 'flex',
    fontFamily: font['--ult-font-sans'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
  },
  list: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-1'],
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  item: {
    alignItems: 'center',
    display: 'inline-flex',
  },
  /** Restated here rather than borrowed from Button: an item declares another Ultima component
   * only when it composes that component's behavior, never for its appearance. Shared tokens are
   * what keep the two in step. */
  row: {
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: {
      default: 'transparent',
      ':hover': color['--ult-color-surface-hover'],
    },
    blockSize: space['--ult-space-10'],
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'none',
    boxSizing: 'border-box',
    color: {
      default: color['--ult-color-text-muted'],
      ':hover': color['--ult-color-text'],
    },
    cursor: 'pointer',
    display: 'inline-flex',
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-3'],
    fontWeight: font['--ult-font-weight-regular'],
    justifyContent: 'center',
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
    minInlineSize: space['--ult-space-10'],
    textDecoration: 'none',
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  /** Reading `aria-current` is what paints a router's own link, with no `current` prop. */
  page: {
    backgroundColor: {
      default: 'transparent',
      ':is([data-active], [aria-current="page"])': color['--ult-color-surface-sunken'],
      ':hover': color['--ult-color-surface-hover'],
    },
    color: {
      default: color['--ult-color-text-muted'],
      ':hover': color['--ult-color-text-muted'],
      ':is([data-active], [aria-current="page"])': color['--ult-color-text'],
    },
    fontWeight: {
      default: font['--ult-font-weight-regular'],
      ':is([data-active], [aria-current="page"])': font['--ult-font-weight-medium'],
    },
    paddingInline: space['--ult-space-2'],
  },
  /** `pointer-events` is deliberately untouched: `none` would kill the hover state along with the
   * click, and the element has to stay focusable, which is why the ends are never `disabled`. */
  end: {
    cursor: { default: 'pointer', ':is([data-disabled])': 'default' },
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
    paddingInline: space['--ult-space-4'],
  },
  ellipsis: {
    alignItems: 'center',
    blockSize: space['--ult-space-10'],
    boxSizing: 'border-box',
    color: color['--ult-color-text-subtle'],
    display: 'inline-flex',
    fontSize: text['--ult-text-3'],
    justifyContent: 'center',
    minInlineSize: space['--ult-space-10'],
  },
  glyph: { flexShrink: 0 },
});

function EllipsisGlyph() {
  return (
    <svg
      {...stylex.props(styles.glyph)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </svg>
  );
}

type PaginationPage = { type: 'page'; page: number } | { type: 'ellipsis' };

type GetPagesOptions = {
  page: number;
  count: number;
  siblingCount?: number;
  boundaryCount?: number;
};

type PaginationRootProps = PartProps<useRender.ComponentProps<'nav'>>;
type PaginationListProps = PartProps<useRender.ComponentProps<'ul'>>;
type PaginationItemProps = PartProps<useRender.ComponentProps<'li'>>;
type PaginationPageProps = PartProps<useRender.ComponentProps<'a'>> & { current?: boolean };
type PaginationPreviousProps = PartProps<useRender.ComponentProps<'a'>> & { disabled?: boolean };
type PaginationNextProps = PaginationPreviousProps;
type PaginationEllipsisProps = PartProps<useRender.ComponentProps<'span'>>;

function range(start: number, end: number): number[] {
  return Array.from({ length: Math.max(end - start + 1, 0) }, (_, index) => start + index);
}

const asPage = (value: number): PaginationPage => ({ type: 'page', page: value });

/**
 * The page window: MUI's truncation arithmetic under Zag's `api.pages` shape. Pure and at module
 * scope, and not `usePagination` — a `use*` name would forbid the loop and the condition a caller
 * wants it in.
 */
function getPages({ page, count, siblingCount = 1, boundaryCount = 1 }: GetPagesOptions): PaginationPage[] {
  const startPages = range(1, Math.min(boundaryCount, count));
  const endPages = range(Math.max(count - boundaryCount + 1, boundaryCount + 1), count);

  const siblingsStart = Math.max(
    Math.min(page - siblingCount, count - boundaryCount - siblingCount * 2 - 1),
    boundaryCount + 2,
  );
  const siblingsEnd = Math.min(
    Math.max(page + siblingCount, boundaryCount + siblingCount * 2 + 2),
    endPages.length > 0 ? endPages[0]! - 2 : count - 1,
  );

  /**
   * Each side collapses to one ellipsis, except where exactly one page is hidden: that page is
   * rendered instead, since an ellipsis standing in for a single number costs a click and saves no
   * room. The two sides are not mirror images, so they are written out rather than shared.
   */
  const beforeSiblings: PaginationPage[] =
    siblingsStart > boundaryCount + 2
      ? [{ type: 'ellipsis' }]
      : boundaryCount + 1 < count - boundaryCount
        ? [asPage(boundaryCount + 1)]
        : [];
  const afterSiblings: PaginationPage[] =
    siblingsEnd < count - boundaryCount - 1
      ? [{ type: 'ellipsis' }]
      : count - boundaryCount > boundaryCount
        ? [asPage(count - boundaryCount)]
        : [];

  return [
    ...startPages.map(asPage),
    ...beforeSiblings,
    ...range(siblingsStart, siblingsEnd).map(asPage),
    ...afterSiblings,
    ...endPages.map(asPage),
  ];
}

/**
 * The landmark. Ultima's name is emitted only when the caller named nothing, so an override never
 * leaves two competing names on one `nav`; a second control on one page is the consumer's to name.
 */
function Root({ ref, render, style, ...props }: PaginationRootProps) {
  const named = props['aria-label'] != null || props['aria-labelledby'] != null;

  return useRender({
    defaultTagName: 'nav',
    ref,
    render,
    props: {
      ...props,
      ...(named ? {} : { 'aria-label': 'Pagination' }),
      ...stylex.props(styles.root, style),
    },
  });
}

function List({ ref, render, style, ...props }: PaginationListProps) {
  return useRender({
    defaultTagName: 'ul',
    ref,
    render,
    props: { ...props, ...stylex.props(styles.list, style) },
  });
}

function Item({ ref, render, style, ...props }: PaginationItemProps) {
  return useRender({
    defaultTagName: 'li',
    ref,
    render,
    props: { ...props, ...stylex.props(styles.item, style) },
  });
}

function Page({ ref, render, style, current = false, ...props }: PaginationPageProps) {
  return useRender({
    defaultTagName: 'a',
    ref,
    render,
    state: { current },
    stateAttributesMapping: {
      current: (value: boolean): Record<string, string> | null =>
        value ? { 'data-active': '', 'aria-current': 'page' } : null,
    },
    props: { ...props, ...stylex.props(styles.row, styles.page, style) },
  });
}

function swallowWhenDisabled(
  onClick: React.MouseEventHandler<HTMLAnchorElement> | undefined,
  disabled: boolean,
): React.MouseEventHandler<HTMLAnchorElement> {
  return (event) => {
    if (disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };
}

/**
 * Both ends, which differ only in the direction they read. Never the native `disabled` attribute:
 * that makes the element unfocusable, so focus drops to `<body>` at the ends — the bug MUI shipped
 * a refocus workaround for. The ARIA pair is also the only form that works for both `<a>`, which
 * has no `disabled` attribute, and `<button>`, so Ultima swallows the activation itself.
 */
function useEndControl({ ref, render, style, disabled = false, onClick, ...props }: PaginationPreviousProps) {
  return useRender({
    defaultTagName: 'a',
    ref,
    render,
    state: { disabled },
    stateAttributesMapping: {
      disabled: (value: boolean): Record<string, string> | null =>
        value ? { 'data-disabled': '', 'aria-disabled': 'true' } : null,
    },
    props: {
      ...props,
      onClick: swallowWhenDisabled(onClick, disabled),
      ...stylex.props(styles.row, styles.end, style),
    },
  });
}

function Previous(props: PaginationPreviousProps) {
  return useEndControl(props);
}

function Next(props: PaginationNextProps) {
  return useEndControl(props);
}

function Ellipsis({ ref, render, style, children, ...props }: PaginationEllipsisProps) {
  return useRender({
    defaultTagName: 'span',
    ref,
    render,
    props: {
      'aria-hidden': 'true',
      children: children ?? <EllipsisGlyph />,
      ...props,
      ...stylex.props(styles.ellipsis, style),
    },
  });
}

const Pagination = { Root, List, Item, Page, Previous, Next, Ellipsis, getPages };

export {
  Pagination,
  type PaginationPage,
  type PaginationRootProps,
  type PaginationListProps,
  type PaginationItemProps,
  type PaginationPageProps,
  type PaginationPreviousProps,
  type PaginationNextProps,
  type PaginationEllipsisProps,
};
