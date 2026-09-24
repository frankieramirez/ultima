'use client';

import { Switch as BaseSwitch } from '@base-ui/react/switch';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, motion, radius, space } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const travel = `calc(${space['--ult-space-10']} - ${space['--ult-space-7']} - 2 * ${space['--ult-space-1']})`;

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
    height: space['--ult-space-8'],
    margin: 0,
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
    padding: space['--ult-space-1'],
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color',
    transitionTimingFunction: easing.standard,
    width: space['--ult-space-10'],
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
    height: space['--ult-space-7'],
    translate: { default: 0, ':is([data-checked])': travel },
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'translate',
    transitionTimingFunction: easing.standard,
    width: space['--ult-space-7'],
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
