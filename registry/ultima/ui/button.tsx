/**
 * PROTOTYPE (ULT-7 source, copied for ULT-8). Throwaway. Exists to feel the authoring model, not to
 * set conventions. ULT-11 reacts to this and decides the real shape.
 *
 * What it probes:
 * - variants without cva: a lookup table of StyleX style objects
 * - how stylex.props reaches a Base UI part (spread className + style)
 * - state styling through Base UI data attributes, not className functions
 * - an escape hatch: a `style` prop that takes StyleX styles from the caller
 */
import { Button as BaseButton } from '@base-ui/react/button';
import * as stylex from '@stylexjs/stylex';
import { color, font, radius, space } from '@/registry/ultima/lib/tokens.stylex';
import type { ComponentProps } from 'react';

const styles = stylex.create({
  root: {
    alignItems: 'center',
    appearance: 'none',
    borderRadius: radius.md,
    borderStyle: 'solid',
    borderWidth: '1px',
    cursor: { default: 'pointer', ':is([data-disabled])': 'not-allowed' },
    display: 'inline-flex',
    fontFamily: font.sans,
    fontWeight: 500,
    gap: space.sm,
    justifyContent: 'center',
    lineHeight: 1,
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
    outlineColor: color.accent,
    outlineOffset: '2px',
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: '2px',
    transitionDuration: '120ms',
    transitionProperty: 'background-color, border-color, color',
  },
});

// One style object per variant. Hover/active nest inside the value, so a
// variant carries its own state palette. No cva, no string class names.
const variants = stylex.create({
  solid: {
    backgroundColor: {
      default: color.accent,
      ':hover': `color-mix(in oklab, ${color.accent} 88%, white)`,
      ':active': `color-mix(in oklab, ${color.accent} 80%, black)`,
    },
    borderColor: 'transparent',
    color: color.accentText,
  },
  outline: {
    backgroundColor: { default: 'transparent', ':hover': color.surfaceRaised },
    borderColor: color.border,
    color: color.text,
  },
  ghost: {
    backgroundColor: { default: 'transparent', ':hover': color.surfaceRaised },
    borderColor: 'transparent',
    color: color.textMuted,
  },
});

const sizes = stylex.create({
  sm: { fontSize: '0.8125rem', minHeight: '1.75rem', paddingBlock: space.xs, paddingInline: space.sm },
  md: { fontSize: '0.875rem', minHeight: '2.25rem', paddingBlock: space.sm, paddingInline: space.md },
  lg: { fontSize: '1rem', minHeight: '2.75rem', paddingBlock: space.md, paddingInline: space.lg },
});

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export type ButtonProps = Omit<ComponentProps<typeof BaseButton>, 'className' | 'style'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Escape hatch: StyleX styles from the caller, merged last so they win. */
  style?: stylex.StyleXStyles;
};

export function Button({ variant = 'solid', size = 'md', style, ...props }: ButtonProps) {
  return (
    <BaseButton
      {...props}
      {...stylex.props(styles.root, variants[variant], sizes[size], style)}
    />
  );
}
