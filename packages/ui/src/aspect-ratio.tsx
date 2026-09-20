'use client';

import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import type { PartProps } from '@ultima/ui/lib/component';

const styles = stylex.create({
  root: {
    boxSizing: 'border-box',
    display: 'block',
    margin: 0,
    overflow: 'hidden',
  },
});

type AspectRatioProps = PartProps<useRender.ComponentProps<'div'>> & { ratio: number };

/** Static: the frame has no role and no name; the media inside carries its own or is decorative. */
function AspectRatio({ ratio, ref, render, style, ...props }: AspectRatioProps) {
  const { style: injected, ...stylexProps } = stylex.props(styles.root, style);
  return useRender({
    defaultTagName: 'div',
    ref,
    render,
    props: { ...props, ...stylexProps, style: { ...injected, aspectRatio: ratio } },
  });
}

export { AspectRatio, type AspectRatioProps };
