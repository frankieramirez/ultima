'use client';

import { Slider as BaseSlider } from '@base-ui/react/slider';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, shadow, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const VERTICAL = ':is([data-orientation="vertical"])';

const thumbSize = space['--ult-space-6'];
const trackCrossSize = space['--ult-space-2'];
const controlCrossSize = space['--ult-space-8'];

const styles = stylex.create({
  label: {
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-3'],
    fontWeight: font['--ult-font-weight-medium'],
  },
  value: {
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-3'],
  },
  /** Base UI reads this box back with `getComputedStyle` to turn a pointer position into a value. */
  control: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    height: { default: controlCrossSize, [VERTICAL]: '100%' },
    justifyContent: 'center',
    margin: 0,
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
    touchAction: 'none',
    userSelect: 'none',
    width: { default: '100%', [VERTICAL]: controlCrossSize },
  },
  /** Base UI gives the indicator `height: inherit`, so without a size here it has none. */
  track: {
    backgroundColor: color['--ult-color-surface-sunken'],
    borderRadius: radius['--ult-radius-full'],
    height: { default: trackCrossSize, [VERTICAL]: '100%' },
    width: { default: '100%', [VERTICAL]: trackCrossSize },
  },
  /** Base UI sets the indicator's own position and length inline, from the values. */
  indicator: {
    backgroundColor: color['--ult-color-accent'],
    borderRadius: radius['--ult-radius-full'],
  },
  thumb: {
    backgroundColor: color['--ult-color-surface-raised'],
    /** A `<div>` loses its fill under forced colors; the hairline keeps the knob visible. */
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-full'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxShadow: { default: shadow['--ult-shadow-sm'], ':is([data-dragging])': shadow['--ult-shadow-md'] },
    boxSizing: 'border-box',
    height: thumbSize,
    width: thumbSize,
    /** The focusable element is the nested range input, so `:focus-visible` never matches here. */
    ':has(:focus-visible)': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
});

type SliderValue = number | readonly number[];
type SliderRootProps<Value extends SliderValue = SliderValue> = PartProps<
  ComponentProps<typeof BaseSlider.Root<Value>>
>;
type SliderLabelProps = PartProps<ComponentProps<typeof BaseSlider.Label>>;
type SliderValueProps = PartProps<ComponentProps<typeof BaseSlider.Value>>;
type SliderControlProps = PartProps<ComponentProps<typeof BaseSlider.Control>>;
type SliderTrackProps = PartProps<ComponentProps<typeof BaseSlider.Track>>;
type SliderIndicatorProps = PartProps<ComponentProps<typeof BaseSlider.Indicator>>;
type SliderThumbProps = PartProps<ComponentProps<typeof BaseSlider.Thumb>>;

/** Only groups, so it carries no Ultima styles; the style slot is still here for the caller. */
function Root<Value extends SliderValue = SliderValue>({ style, ...props }: SliderRootProps<Value>) {
  return <BaseSlider.Root<Value> {...props} {...stylex.props(style)} />;
}

function Label({ style, ...props }: SliderLabelProps) {
  return <BaseSlider.Label {...props} {...stylex.props(styles.label, style)} />;
}

function Value({ style, ...props }: SliderValueProps) {
  return <BaseSlider.Value {...props} {...stylex.props(styles.value, style)} />;
}

function Control({ style, ...props }: SliderControlProps) {
  return <BaseSlider.Control {...props} {...stylex.props(styles.control, style)} />;
}

function Track({ style, ...props }: SliderTrackProps) {
  return <BaseSlider.Track {...props} {...stylex.props(styles.track, style)} />;
}

function Indicator({ style, ...props }: SliderIndicatorProps) {
  return <BaseSlider.Indicator {...props} {...stylex.props(styles.indicator, style)} />;
}

/** One per value; `index` is required for a range slider to render on the server. */
function Thumb({ style, ...props }: SliderThumbProps) {
  return <BaseSlider.Thumb {...props} {...stylex.props(styles.thumb, style)} />;
}

const Slider = { Root, Label, Value, Control, Track, Indicator, Thumb };

export {
  Slider,
  type SliderRootProps,
  type SliderLabelProps,
  type SliderValueProps,
  type SliderControlProps,
  type SliderTrackProps,
  type SliderIndicatorProps,
  type SliderThumbProps,
};
