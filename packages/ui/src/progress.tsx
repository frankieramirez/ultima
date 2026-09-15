'use client';

import { Progress as BaseProgress } from '@base-ui/react/progress';
import * as stylex from '@stylexjs/stylex';
import { color, easing, font, motion, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import { createContext, use, type ComponentProps } from 'react';

const REDUCED_MOTION = '@media (prefers-reduced-motion: reduce)';

const indeterminateWidth = 25;
const fillsPerTrack = 100 / indeterminateWidth;

const slide = stylex.keyframes({
  from: { transform: 'translateX(-100%)' },
  to: { transform: `translateX(${fillsPerTrack * 100}%)` },
});

const styles = stylex.create({
  root: {
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-2'],
    margin: 0,
  },
  label: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
    letterSpacing: font['--ult-font-tracking-wide'],
    textTransform: 'uppercase',
  },
  track: {
    backgroundColor: color['--ult-color-surface-sunken'],
    borderRadius: radius['--ult-radius-full'],
    height: space['--ult-space-2'],
    overflow: 'hidden',
  },
  indicator: {
    animationDuration: motion['--ult-motion-loop'],
    animationIterationCount: 'infinite',
    animationName: {
      default: 'none',
      ':is([data-indeterminate])': { default: slide, [REDUCED_MOTION]: 'none' },
    },
    animationTimingFunction: easing.standard,
    borderRadius: radius['--ult-radius-full'],
    /** Base UI writes no inline style while indeterminate, so the fill owns its box there. */
    height: '100%',
    transitionDuration: motion['--ult-motion-base'],
    transitionProperty: 'width',
    transitionTimingFunction: easing.standard,
    width: { default: null, ':is([data-indeterminate])': `${indeterminateWidth}%` },
  },
  value: {
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
  },
});

const indicatorTones = stylex.create({
  neutral: { backgroundColor: color['--ult-color-border-strong'] },
  highlight: { backgroundColor: color['--ult-color-highlight'] },
  success: { backgroundColor: color['--ult-color-success'] },
  warning: { backgroundColor: color['--ult-color-warning'] },
  danger: { backgroundColor: color['--ult-color-danger'] },
});

const valueTones = stylex.create({
  neutral: { color: color['--ult-color-text'] },
  highlight: { color: color['--ult-color-highlight-text'] },
  success: { color: color['--ult-color-success-text'] },
  warning: { color: color['--ult-color-warning-text'] },
  danger: { color: color['--ult-color-danger-text'] },
});

type ProgressTone = keyof typeof indicatorTones;

const ToneContext = createContext<ProgressTone>('neutral');

type ProgressRootProps = PartProps<ComponentProps<typeof BaseProgress.Root>> & { tone?: ProgressTone };
type ProgressLabelProps = PartProps<ComponentProps<typeof BaseProgress.Label>>;
type ProgressTrackProps = PartProps<ComponentProps<typeof BaseProgress.Track>>;
type ProgressIndicatorProps = PartProps<ComponentProps<typeof BaseProgress.Indicator>> & { tone?: ProgressTone };
type ProgressValueProps = PartProps<ComponentProps<typeof BaseProgress.Value>> & { tone?: ProgressTone };

function Root({ tone = 'neutral', style, ...props }: ProgressRootProps) {
  return (
    <ToneContext value={tone}>
      <BaseProgress.Root {...props} {...stylex.props(styles.root, style)} />
    </ToneContext>
  );
}

function Label({ style, ...props }: ProgressLabelProps) {
  return <BaseProgress.Label {...props} {...stylex.props(styles.label, style)} />;
}

function Track({ style, ...props }: ProgressTrackProps) {
  return <BaseProgress.Track {...props} {...stylex.props(styles.track, style)} />;
}

function Indicator({ tone, style, ...props }: ProgressIndicatorProps) {
  const inherited = use(ToneContext);
  return (
    <BaseProgress.Indicator {...props} {...stylex.props(styles.indicator, indicatorTones[tone ?? inherited], style)} />
  );
}

function Value({ tone, style, ...props }: ProgressValueProps) {
  const inherited = use(ToneContext);
  return <BaseProgress.Value {...props} {...stylex.props(styles.value, valueTones[tone ?? inherited], style)} />;
}

const Progress = { Root, Label, Track, Indicator, Value };

export {
  Progress,
  type ProgressTone,
  type ProgressRootProps,
  type ProgressLabelProps,
  type ProgressTrackProps,
  type ProgressIndicatorProps,
  type ProgressValueProps,
};
