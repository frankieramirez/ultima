'use client';

import { isValidElement } from 'react';
import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { font } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';

// A class's width and height beat the width and height attributes an icon set writes on its
// <svg>, so every set sizes to the text around it. Color stays the set's.
const styles = stylex.create({
  root: {
    blockSize: '1em',
    boxSizing: 'border-box',
    display: 'inline-block',
    flexShrink: 0,
    inlineSize: '1em',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    verticalAlign: 'middle',
  },
});

// Ultima's own glyphs draw a 1.5 stroke on a 24 grid. Lucide, Tabler and Feather read `strokeWidth`,
// so Icon passes it as a default; a `strokeWidth` on the icon itself wins, and fill-drawn sets
// ignore it. Never on a plain element such as an icon font's span, where it means nothing.
const STROKE_WIDTH = 1.5;

type IconProps = PartProps<useRender.ComponentProps<'span'>>;

/** Decorative unless named: an `aria-label` or `aria-labelledby` makes it `role="img"`. */
function Icon({ children, ref, render, style, ...props }: IconProps) {
  // One element child is the icon itself, so it renders with no wrapper.
  const element = render ?? (isValidElement(children) ? children : undefined);
  const named = props['aria-label'] != null || props['aria-labelledby'] != null;
  const stroked = isValidElement(element) && (typeof element.type !== 'string' || element.type === 'svg');
  return useRender({
    defaultTagName: 'span',
    ref,
    render: element,
    props: {
      ...(named ? { role: 'img' } : { 'aria-hidden': true }),
      'data-ult-icon': '',
      ...(stroked ? { strokeWidth: STROKE_WIDTH } : {}),
      ...props,
      ...stylex.props(styles.root, style),
      children: element === children ? undefined : children,
    },
  });
}

export { Icon, type IconProps };
