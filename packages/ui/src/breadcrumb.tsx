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
    flexWrap: 'wrap',
    fontSize: text['--ult-text-3'],
    gap: space['--ult-space-2'],
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  item: {
    alignItems: 'center',
    display: 'inline-flex',
  },
  link: {
    borderRadius: radius['--ult-radius-sm'],
    color: {
      default: color['--ult-color-text-muted'],
      ':is([data-active], [aria-current="page"])': color['--ult-color-text'],
      ':hover': color['--ult-color-text'],
    },
    fontWeight: {
      default: font['--ult-font-weight-regular'],
      ':is([data-active], [aria-current="page"])': font['--ult-font-weight-medium'],
    },
    textDecoration: 'none',
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  separator: {
    alignItems: 'center',
    color: color['--ult-color-text-subtle'],
    display: 'inline-flex',
  },
  chevron: { flexShrink: 0 },
});

function ChevronRight() {
  return (
    <svg
      {...stylex.props(styles.chevron)}
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
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

type BreadcrumbRootProps = PartProps<useRender.ComponentProps<'nav'>>;
type BreadcrumbListProps = PartProps<useRender.ComponentProps<'ol'>>;
type BreadcrumbItemProps = PartProps<useRender.ComponentProps<'li'>>;
type BreadcrumbLinkProps = PartProps<useRender.ComponentProps<'a'>> & { active?: boolean };
type BreadcrumbSeparatorProps = PartProps<useRender.ComponentProps<'li'>>;

/**
 * The landmark. Ultima's name is emitted only when the caller named nothing, so an override never
 * leaves two competing names on one `nav`; a second trail on one page is the consumer's to name.
 */
function Root({ ref, render, style, ...props }: BreadcrumbRootProps) {
  const named = props['aria-label'] != null || props['aria-labelledby'] != null;

  return useRender({
    defaultTagName: 'nav',
    ref,
    render,
    props: {
      ...props,
      ...(named ? {} : { 'aria-label': 'Breadcrumb' }),
      ...stylex.props(styles.root, style),
    },
  });
}

function List({ ref, render, style, ...props }: BreadcrumbListProps) {
  return useRender({
    defaultTagName: 'ol',
    ref,
    render,
    props: { ...props, ...stylex.props(styles.list, style) },
  });
}

function Item({ ref, render, style, ...props }: BreadcrumbItemProps) {
  return useRender({
    defaultTagName: 'li',
    ref,
    render,
    props: { ...props, ...stylex.props(styles.item, style) },
  });
}

function Link({ ref, render, style, active = false, ...props }: BreadcrumbLinkProps) {
  return useRender({
    defaultTagName: 'a',
    ref,
    render,
    state: { active },
    stateAttributesMapping: {
      active: (value: boolean): Record<string, string> | null =>
        value ? { 'data-active': '', 'aria-current': 'page' } : null,
    },
    props: { ...props, ...stylex.props(styles.link, style) },
  });
}

function Separator({ ref, render, style, children, ...props }: BreadcrumbSeparatorProps) {
  return useRender({
    defaultTagName: 'li',
    ref,
    render,
    props: {
      role: 'presentation',
      'aria-hidden': 'true',
      children: children ?? <ChevronRight />,
      ...props,
      ...stylex.props(styles.separator, style),
    },
  });
}

const Breadcrumb = { Root, List, Item, Link, Separator };

export {
  Breadcrumb,
  type BreadcrumbRootProps,
  type BreadcrumbListProps,
  type BreadcrumbItemProps,
  type BreadcrumbLinkProps,
  type BreadcrumbSeparatorProps,
};
