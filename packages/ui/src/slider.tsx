'use client';

import { Slider as BaseSlider } from '@base-ui/react/slider';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, shadow, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const VERTICAL = ':is([data-orientation="vertical"])';
const HOVER = '@media (hover: hover)';

// The track is the quiet edge colour with the accent indicator over it. The thumb is the field's
// paper with the 3:1 edge, so it can be found on any ground, and its edge darkens on hover the way a
// field's does. Disabled is a colour, never a fade: the indicator takes the disabled ink, and the
// thumb the sunken fill, the quiet edge and no shadow. Each key names its whole state.
const styles = stylex.create({
  label: {
    color: { default: color['--ult-color-text'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-snug'],
    margin: 0,
  },
  value: {
    color: { default: color['--ult-color-text-muted'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    fontVariantNumeric: 'tabular-nums',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
  /** Base UI reads this box back with `getComputedStyle` to turn a pointer position into a value. */
  control: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    height: { default: space['--ult-space-8'], [VERTICAL]: '100%' },
    justifyContent: 'center',
    margin: 0,
    touchAction: 'none',
    userSelect: 'none',
    width: { default: '100%', [VERTICAL]: space['--ult-space-8'] },
  },
  /** Base UI gives the indicator `height: inherit`, so without a size here it has none. */
  track: {
    backgroundColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-full'],
    height: { default: space['--ult-space-2'], [VERTICAL]: '100%' },
    width: { default: '100%', [VERTICAL]: space['--ult-space-2'] },
  },
  /** Base UI sets the indicator's own position and length inline, from the values. */
  indicator: {
    backgroundColor: { default: color['--ult-color-accent'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
    borderRadius: radius['--ult-radius-full'],
  },
  thumb: {
    backgroundColor: { default: color['--ult-color-field'], ':is([data-disabled])': color['--ult-color-surface-sunken'] },
    /** A `<div>` loses its fill under forced colors; the hairline keeps the knob visible. */
    borderColor: {
      default: color['--ult-color-border-strong'],
      ':is([data-disabled])': color['--ult-color-border'],
      [HOVER]: { ':hover:not([data-disabled])': color['--ult-color-border-hover'] },
    },
    borderRadius: radius['--ult-radius-full'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxShadow: {
      default: shadow['--ult-shadow-sm'],
      ':is([data-dragging]):not([data-disabled])': shadow['--ult-shadow-md'],
      ':is([data-disabled])': 'none',
    },
    boxSizing: 'border-box',
    cursor: { default: 'grab', ':is([data-dragging])': 'grabbing', ':is([data-disabled])': 'default' },
    height: space['--ult-space-6'],
    /** The focusable element is the nested range input, so `:focus-visible` never matches here. */
    outline: {
      default: null,
      ':has(:focus-visible)': `${border.focus} solid ${color['--ult-color-border-focus']}`,
    },
    outlineOffset: { default: null, ':has(:focus-visible)': border.focusOffset },
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'border-color, box-shadow',
    transitionTimingFunction: easing.standard,
    width: space['--ult-space-6'],
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
