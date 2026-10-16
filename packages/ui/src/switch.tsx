'use client';

import { Switch as BaseSwitch } from '@base-ui/react/switch';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, motion, radius, space } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const HOVER = '@media (hover: hover)';

// A 16px thumb with 2px of inset on every side: the track is 36 by 20 and the thumb travels its own width.
const width = `calc(2 * ${space['--ult-space-6']} + 2 * ${space['--ult-space-1']})`;
const height = `calc(${space['--ult-space-6']} + 2 * ${space['--ult-space-1']})`;

// The unchecked track is the 3:1 edge colour and darkens on hover like a field's edge; checked is the
// accent fill, stepping on hover and press. Each key names its whole state, and disabled is the
// muted track with no opacity, so the thumb's position still reads.
const styles = stylex.create({
  root: {
    appearance: 'none',
    backgroundColor: {
      default: color['--ult-color-border-strong'],
      ':is([data-disabled])': color['--ult-color-border'],
      ':is([data-checked]):not([data-disabled], :active)': color['--ult-color-accent'],
      ':is([data-checked]):active:not([data-disabled])': color['--ult-color-accent-active'],
      [HOVER]: {
        ':hover:not([data-checked], [data-disabled])': color['--ult-color-border-hover'],
        ':is([data-checked]):hover:not([data-disabled], :active)': color['--ult-color-accent-hover'],
      },
    },
    border: 'none',
    borderRadius: radius['--ult-radius-full'],
    boxSizing: 'border-box',
    display: 'inline-flex',
    flexShrink: 0,
    height,
    margin: 0,
    padding: space['--ult-space-1'],
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color',
    transitionTimingFunction: easing.standard,
    width,
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  thumb: {
    backgroundColor: color['--ult-color-surface'],
    /** A `<span>` loses its fill under forced colors; a transparent border is drawn there and nowhere else. */
    borderColor: 'transparent',
    borderRadius: radius['--ult-radius-full'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    height: space['--ult-space-6'],
    translate: { default: 0, ':is([data-checked])': space['--ult-space-6'] },
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'translate',
    transitionTimingFunction: easing.standard,
    width: space['--ult-space-6'],
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
