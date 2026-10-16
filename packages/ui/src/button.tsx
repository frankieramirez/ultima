'use client';

import { Button as BaseButton } from '@base-ui/react/button';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

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
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
    textDecoration: 'none',
    touchAction: 'manipulation',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color, border-color, color',
    transitionTimingFunction: easing.standard,
    userSelect: 'none',
    whiteSpace: 'nowrap',
    WebkitTapHighlightColor: 'transparent',
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
});

// A disabled button still matches `:hover` and `:active`, so each pointer value is restated
// beside `[data-disabled]` at its resting value: the dimmed button does not answer the pointer.
const solid = stylex.create({
  accent: {
    backgroundColor: {
      default: color['--ult-color-accent'],
      ':hover': color['--ult-color-accent-hover'],
      ':active': color['--ult-color-accent-active'],
      ':is([data-disabled]):hover': color['--ult-color-accent'],
      ':is([data-disabled]):active': color['--ult-color-accent'],
    },
    borderColor: 'transparent',
    color: color['--ult-color-accent-contrast'],
  },
  danger: {
    backgroundColor: {
      default: color['--ult-color-danger'],
      ':hover': color['--ult-color-danger-hover'],
      ':active': color['--ult-color-danger-active'],
      ':is([data-disabled]):hover': color['--ult-color-danger'],
      ':is([data-disabled]):active': color['--ult-color-danger'],
    },
    borderColor: 'transparent',
    color: color['--ult-color-danger-contrast'],
  },
});

const outline = stylex.create({
  accent: {
    backgroundColor: {
      default: 'transparent',
      ':hover': color['--ult-color-surface-hover'],
      ':active': color['--ult-color-surface-active'],
      ':is([data-disabled]):hover': 'transparent',
      ':is([data-disabled]):active': 'transparent',
    },
    borderColor: color['--ult-color-border'],
    color: color['--ult-color-text'],
  },
  danger: {
    backgroundColor: {
      default: 'transparent',
      ':hover': color['--ult-color-danger-subtle'],
      ':is([data-disabled]):hover': 'transparent',
    },
    borderColor: color['--ult-color-danger-border'],
    color: color['--ult-color-danger-text'],
  },
});

const ghost = stylex.create({
  accent: {
    backgroundColor: {
      default: 'transparent',
      ':hover': color['--ult-color-surface-hover'],
      ':active': color['--ult-color-surface-active'],
      ':is([data-disabled]):hover': 'transparent',
      ':is([data-disabled]):active': 'transparent',
    },
    borderColor: 'transparent',
    color: {
      default: color['--ult-color-text-muted'],
      ':hover': color['--ult-color-text'],
      ':is([data-disabled]):hover': color['--ult-color-text-muted'],
    },
  },
  danger: {
    backgroundColor: {
      default: 'transparent',
      ':hover': color['--ult-color-danger-subtle'],
      ':is([data-disabled]):hover': 'transparent',
    },
    borderColor: 'transparent',
    color: color['--ult-color-danger-text'],
  },
});

const variants = { solid, outline, ghost };

const sizes = stylex.create({
  sm: {
    fontSize: text['--ult-text-3'],
    gap: space['--ult-space-3'],
    height: space['--ult-space-9'],
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-5'],
  },
  md: {
    fontSize: text['--ult-text-4'],
    gap: space['--ult-space-4'],
    height: space['--ult-space-10'],
    paddingBlock: space['--ult-space-4'],
    paddingInline: space['--ult-space-6'],
  },
  lg: {
    fontSize: text['--ult-text-5'],
    gap: space['--ult-space-4'],
    height: space['--ult-space-11'],
    paddingBlock: space['--ult-space-5'],
    paddingInline: space['--ult-space-7'],
  },
});

type ButtonVariant = keyof typeof variants;
type ButtonSize = keyof typeof sizes;
type ButtonTone = keyof typeof solid;

type ButtonProps = PartProps<ComponentProps<typeof BaseButton>> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  tone?: ButtonTone;
};

function Button({ variant = 'solid', size = 'md', tone = 'accent', style, ...props }: ButtonProps) {
  return <BaseButton {...props} {...stylex.props(styles.root, variants[variant][tone], sizes[size], style)} />;
}

export { Button, type ButtonProps, type ButtonVariant, type ButtonSize, type ButtonTone };
