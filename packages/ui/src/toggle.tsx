'use client';

import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, shadow, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';

const HOVER = '@media (hover: hover)';

// Button's root, restated: a toggle beside a button matches its height, hovers the same way and
// drops a hairline on press.
const styles = stylex.create({
  root: {
    alignItems: 'center',
    appearance: 'none',
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    cursor: { default: 'pointer', ':is([data-disabled])': 'default' },
    display: 'inline-flex',
    flexShrink: 0,
    fontFamily: font['--ult-font-sans'],
    fontWeight: font['--ult-font-weight-medium'],
    justifyContent: 'center',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    textDecoration: 'none',
    touchAction: 'manipulation',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color, border-color, box-shadow, color, translate',
    transitionTimingFunction: easing.standard,
    translate: { default: '0 0', ':active:not([data-disabled])': `0 ${border.hairline}` },
    userSelect: 'none',
    whiteSpace: 'nowrap',
    WebkitTapHighlightColor: 'transparent',
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
});

/**
 * Resting and hover halves are Button's `outline` and `ghost` accent columns. Pressed takes the
 * accent's subtle column and keeps it under the pointer: its hover key repeats `:hover` and
 * `:not([data-disabled])` so it outranks the plain hover rule, and a hover that repainted it as
 * resting would make the state disappear. A disabled toggle, pressed or not, takes the muted fill
 * and ink.
 */
const variants = stylex.create({
  outline: {
    backgroundColor: {
      default: 'transparent',
      ':is([data-pressed]):not([data-disabled])': color['--ult-color-accent-subtle'],
      ':active:not([data-disabled])': color['--ult-color-surface-active'],
      ':is([data-disabled])': color['--ult-color-surface-sunken'],
      [HOVER]: {
        ':hover:not([data-disabled])': color['--ult-color-surface-hover'],
        ':active:not([data-disabled])': color['--ult-color-surface-active'],
        ':is([data-pressed]):hover:not([data-disabled])': color['--ult-color-accent-subtle'],
      },
    },
    borderColor: {
      default: color['--ult-color-border'],
      ':is([data-pressed]):not([data-disabled])': color['--ult-color-accent-border'],
    },
    boxShadow: {
      default: shadow['--ult-shadow-xs'],
      ':is([data-pressed])': 'none',
      ':active:not([data-disabled])': 'none',
      ':is([data-disabled])': 'none',
    },
    color: {
      default: color['--ult-color-text'],
      ':is([data-pressed]):not([data-disabled])': color['--ult-color-accent-text'],
      ':is([data-disabled])': color['--ult-color-text-disabled'],
    },
  },
  ghost: {
    backgroundColor: {
      default: 'transparent',
      ':is([data-pressed]):not([data-disabled])': color['--ult-color-accent-subtle'],
      ':active:not([data-disabled])': color['--ult-color-surface-active'],
      ':is([data-disabled])': color['--ult-color-surface-sunken'],
      [HOVER]: {
        ':hover:not([data-disabled])': color['--ult-color-surface-hover'],
        ':active:not([data-disabled])': color['--ult-color-surface-active'],
        ':is([data-pressed]):hover:not([data-disabled])': color['--ult-color-accent-subtle'],
      },
    },
    borderColor: {
      default: 'transparent',
      ':is([data-pressed]):not([data-disabled])': color['--ult-color-accent-border'],
    },
    color: {
      default: color['--ult-color-text-muted'],
      ':is([data-pressed]):not([data-disabled])': color['--ult-color-accent-text'],
      ':is([data-disabled])': color['--ult-color-text-disabled'],
      [HOVER]: {
        ':hover:not([data-disabled])': color['--ult-color-text'],
        ':is([data-pressed]):hover:not([data-disabled])': color['--ult-color-accent-text'],
      },
    },
  },
});

// Button's sizes: a toggle holding an icon gives up one space step on each side.
const sizes = stylex.create({
  sm: {
    fontSize: text['--ult-text-3'],
    gap: space['--ult-space-3'],
    height: space['--ult-space-9'],
    paddingBlock: space['--ult-space-2'],
    paddingInline: { default: space['--ult-space-5'], ':has(> svg, > [data-ult-icon])': space['--ult-space-4'] },
  },
  md: {
    fontSize: text['--ult-text-4'],
    gap: space['--ult-space-4'],
    height: space['--ult-space-10'],
    paddingBlock: space['--ult-space-4'],
    paddingInline: { default: space['--ult-space-6'], ':has(> svg, > [data-ult-icon])': space['--ult-space-5'] },
  },
  lg: {
    fontSize: text['--ult-text-5'],
    gap: space['--ult-space-4'],
    height: space['--ult-space-11'],
    paddingBlock: space['--ult-space-5'],
    paddingInline: { default: space['--ult-space-7'], ':has(> svg, > [data-ult-icon])': space['--ult-space-6'] },
  },
});

type ToggleVariant = keyof typeof variants;
type ToggleSize = keyof typeof sizes;
type ToggleProps = Omit<PartProps<BaseToggle.Props>, 'value'> & {
  variant?: ToggleVariant;
  size?: ToggleSize;
};

function Toggle({ variant = 'outline', size = 'md', style, ...props }: ToggleProps) {
  return <BaseToggle {...props} {...stylex.props(styles.root, variants[variant], sizes[size], style)} />;
}

export { Toggle, type ToggleProps, type ToggleVariant, type ToggleSize };
