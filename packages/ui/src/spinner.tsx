'use client';

import * as stylex from '@stylexjs/stylex';
import { border, motion, radius } from '@ultima/tokens/tokens.stylex';
import type { PlainProps } from '@ultima/ui/lib/component';

const REDUCED_MOTION = '@media (prefers-reduced-motion: reduce)';

const rotate = stylex.keyframes({
  from: { transform: 'rotate(0deg)' },
  to: { transform: 'rotate(360deg)' },
});

const styles = stylex.create({
  root: {
    animationDuration: motion['--ult-motion-loop'],
    animationIterationCount: 'infinite',
    animationName: { default: rotate, [REDUCED_MOTION]: 'none' },
    animationTimingFunction: 'linear',
    borderColor: 'currentColor',
    borderRadius: radius['--ult-radius-full'],
    borderStyle: 'solid',
    borderTopColor: 'transparent',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    display: 'inline-block',
    flexShrink: 0,
    height: '1em',
    margin: 0,
    width: '1em',
  },
});

type SpinnerProps = PlainProps<'div'>;

/** Decorative: the busy container carries `aria-busy`, and speech is the live-region pattern. */
function Spinner({ style, ...props }: SpinnerProps) {
  return <div {...props} {...stylex.props(styles.root, style)} aria-hidden="true" />;
}

export { Spinner, type SpinnerProps };
