import * as stylex from '@stylexjs/stylex';
import { color, motion, radius, space } from '@ultima/tokens/tokens.stylex';

const REDUCED_MOTION = '@media (prefers-reduced-motion: reduce)';

const slide = stylex.keyframes({ from: { marginInlineStart: 0 }, to: { marginInlineStart: '75%' } });

const styles = stylex.create({
  track: {
    backgroundColor: color['--ult-color-surface-sunken'],
    borderRadius: radius['--ult-radius-full'],
    height: space['--ult-space-6'],
    overflow: 'hidden',
    width: space['--ult-space-12'],
  },
  dot: {
    animationDirection: 'alternate',
    animationDuration: motion['--ult-motion-base'],
    animationIterationCount: 'infinite',
    animationName: { default: slide, [REDUCED_MOTION]: 'none' },
    animationTimingFunction: 'ease-in-out',
    backgroundColor: color['--ult-color-highlight'],
    borderRadius: radius['--ult-radius-full'],
    height: space['--ult-space-6'],
    width: space['--ult-space-6'],
  },
});

const live = stylex.create({
  animationDuration: (token: string) => ({ animationDuration: `var(${token})` }),
});

export default function MotionTrack({ token }: { token?: string }) {
  return (
    <div aria-hidden="true" {...stylex.props(styles.track)}>
      <div {...stylex.props(styles.dot, token ? live.animationDuration(token) : null)} />
    </div>
  );
}
