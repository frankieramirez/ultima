'use client';

import { Meter as BaseMeter } from '@base-ui/react/meter';
import * as stylex from '@stylexjs/stylex';
import { color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

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
  /** Base UI sets the indicator's own `width` and `height` inline, from `value`. */
  indicator: {
    borderRadius: radius['--ult-radius-full'],
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

type MeterTone = keyof typeof indicatorTones;

type MeterRootProps = PartProps<ComponentProps<typeof BaseMeter.Root>>;
type MeterLabelProps = PartProps<ComponentProps<typeof BaseMeter.Label>>;
type MeterTrackProps = PartProps<ComponentProps<typeof BaseMeter.Track>>;
type MeterIndicatorProps = PartProps<ComponentProps<typeof BaseMeter.Indicator>> & { tone?: MeterTone };
type MeterValueProps = PartProps<ComponentProps<typeof BaseMeter.Value>> & { tone?: MeterTone };

function Root({ style, ...props }: MeterRootProps) {
  return <BaseMeter.Root {...props} {...stylex.props(styles.root, style)} />;
}

function Label({ style, ...props }: MeterLabelProps) {
  return <BaseMeter.Label {...props} {...stylex.props(styles.label, style)} />;
}

function Track({ style, ...props }: MeterTrackProps) {
  return <BaseMeter.Track {...props} {...stylex.props(styles.track, style)} />;
}

function Indicator({ tone = 'neutral', style, ...props }: MeterIndicatorProps) {
  return <BaseMeter.Indicator {...props} {...stylex.props(styles.indicator, indicatorTones[tone], style)} />;
}

function Value({ tone = 'neutral', style, ...props }: MeterValueProps) {
  return <BaseMeter.Value {...props} {...stylex.props(styles.value, valueTones[tone], style)} />;
}

const Meter = { Root, Label, Track, Indicator, Value };

export {
  Meter,
  type MeterTone,
  type MeterRootProps,
  type MeterLabelProps,
  type MeterTrackProps,
  type MeterIndicatorProps,
  type MeterValueProps,
};
