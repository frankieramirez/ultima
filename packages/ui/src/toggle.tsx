'use client';

import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, motion, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';

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
    fontFamily: font['--ult-font-sans'],
    fontWeight: font['--ult-font-weight-medium'],
    gap: space['--ult-space-4'],
    justifyContent: 'center',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
    textDecoration: 'none',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color, border-color, color',
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
});

const variants = stylex.create({
  outline: {
    backgroundColor: {
      default: 'transparent',
      ':hover': color['--ult-color-surface-raised'],
      ':is([data-pressed])': color['--ult-color-accent-subtle'],
      ':is([data-pressed]):hover': color['--ult-color-accent-subtle'],
    },
    borderColor: {
      default: color['--ult-color-border'],
      ':is([data-pressed])': color['--ult-color-accent-border'],
      ':is([data-pressed]):hover': color['--ult-color-accent-border'],
    },
    color: {
      default: color['--ult-color-text'],
      ':is([data-pressed])': color['--ult-color-accent-text'],
      ':is([data-pressed]):hover': color['--ult-color-accent-text'],
    },
  },
  ghost: {
    backgroundColor: {
      default: 'transparent',
      ':hover': color['--ult-color-surface-raised'],
      ':is([data-pressed])': color['--ult-color-accent-subtle'],
      ':is([data-pressed]):hover': color['--ult-color-accent-subtle'],
    },
    borderColor: {
      default: 'transparent',
      ':is([data-pressed])': color['--ult-color-accent-border'],
      ':is([data-pressed]):hover': color['--ult-color-accent-border'],
    },
    color: {
      default: color['--ult-color-text-muted'],
      ':is([data-pressed])': color['--ult-color-accent-text'],
      ':is([data-pressed]):hover': color['--ult-color-accent-text'],
    },
  },
});

const sizes = stylex.create({
  sm: {
    fontSize: text['--ult-text-3'],
    height: space['--ult-space-9'],
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-4'],
  },
  md: {
    fontSize: text['--ult-text-4'],
    height: space['--ult-space-10'],
    paddingBlock: space['--ult-space-4'],
    paddingInline: space['--ult-space-5'],
  },
  lg: {
    fontSize: text['--ult-text-5'],
    height: space['--ult-space-11'],
    paddingBlock: space['--ult-space-5'],
    paddingInline: space['--ult-space-6'],
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
