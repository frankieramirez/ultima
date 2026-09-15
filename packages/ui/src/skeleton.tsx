'use client';

import * as stylex from '@stylexjs/stylex';
import { color, easing, motion, radius, space } from '@ultima/tokens/tokens.stylex';
import type { PlainProps } from '@ultima/ui/lib/component';

const REDUCED_MOTION = '@media (prefers-reduced-motion: reduce)';

const pulse = stylex.keyframes({
  from: { opacity: 1 },
  '50%': { opacity: 0.4 },
  to: { opacity: 1 },
});

const styles = stylex.create({
  root: {
    animationDuration: motion['--ult-motion-loop'],
    animationIterationCount: 'infinite',
    animationName: { default: pulse, [REDUCED_MOTION]: 'none' },
    animationTimingFunction: easing.standard,
    backgroundColor: color['--ult-color-surface-sunken'],
    borderRadius: radius['--ult-radius-sm'],
    boxSizing: 'border-box',
    display: 'block',
    height: space['--ult-space-6'],
    margin: 0,
    width: '100%',
  },
});

type SkeletonProps = PlainProps<'div'>;

/** Decorative: the container it stands in for carries `aria-busy`, and this is hidden. */
function Skeleton({ style, ...props }: SkeletonProps) {
  return <div {...props} {...stylex.props(styles.root, style)} aria-hidden="true" />;
}

export { Skeleton, type SkeletonProps };
