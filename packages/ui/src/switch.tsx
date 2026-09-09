'use client';

import { Switch as BaseSwitch } from '@base-ui/react/switch';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, motion, radius, space } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const trackWidth = space['--ult-space-10'];
const trackHeight = space['--ult-space-8'];
const thumbSize = space['--ult-space-7'];
const inset = space['--ult-space-1'];
const travel = `calc(${trackWidth} - ${thumbSize} - 2 * ${inset})`;

const styles = stylex.create({
  root: {
    appearance: 'none',
    backgroundColor: {
      default: color['--ult-color-border-strong'],
      ':is([data-checked])': color['--ult-color-accent'],
    },
    border: 'none',
    borderRadius: radius['--ult-radius-full'],
    boxSizing: 'border-box',
    display: 'inline-flex',
    height: trackHeight,
    margin: 0,
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
    padding: inset,
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color',
    transitionTimingFunction: easing.standard,
    width: trackWidth,
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  thumb: {
    backgroundColor: color['--ult-color-surface'],
    /** A `<span>` loses its fill under forced colors; the hairline keeps the thumb visible. */
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-full'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    height: thumbSize,
    translate: { default: 0, ':is([data-checked])': travel },
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'translate',
    transitionTimingFunction: easing.standard,
    width: thumbSize,
  },
});

type SwitchRootProps = PartProps<ComponentProps<typeof BaseSwitch.Root>>;
type SwitchThumbProps = PartProps<ComponentProps<typeof BaseSwitch.Thumb>>;

/** The accessible name comes from a wrapping `<label>`, `aria-label`, or `aria-labelledby`. */
function Root({ style, ...props }: SwitchRootProps) {
  return <BaseSwitch.Root {...props} {...stylex.props(styles.root, style)} />;
}

function Thumb({ style, ...props }: SwitchThumbProps) {
  return <BaseSwitch.Thumb {...props} {...stylex.props(styles.thumb, style)} />;
}

const Switch = { Root, Thumb };

export { Switch, type SwitchRootProps, type SwitchThumbProps };
