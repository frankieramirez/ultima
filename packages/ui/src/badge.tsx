'use client';

import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';

const styles = stylex.create({
  root: {
    borderRadius: radius['--ult-radius-full'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    display: 'inline-flex',
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-3'],
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-wide'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-4'],
  },
});

const subtle = stylex.create({
  neutral: {
    backgroundColor: color['--ult-color-surface-sunken'],
    borderColor: color['--ult-color-border'],
    color: color['--ult-color-text-muted'],
  },
  accent: {
    backgroundColor: color['--ult-color-accent-subtle'],
    borderColor: color['--ult-color-accent-border'],
    color: color['--ult-color-accent-text'],
  },
  highlight: {
    backgroundColor: color['--ult-color-highlight-subtle'],
    borderColor: color['--ult-color-highlight-border'],
    color: color['--ult-color-highlight-text'],
  },
  success: {
    backgroundColor: color['--ult-color-success-subtle'],
    borderColor: color['--ult-color-success-border'],
    color: color['--ult-color-success-text'],
  },
  warning: {
    backgroundColor: color['--ult-color-warning-subtle'],
    borderColor: color['--ult-color-warning-border'],
    color: color['--ult-color-warning-text'],
  },
  danger: {
    backgroundColor: color['--ult-color-danger-subtle'],
    borderColor: color['--ult-color-danger-border'],
    color: color['--ult-color-danger-text'],
  },
});

const solid = stylex.create({
  neutral: {
    backgroundColor: color['--ult-color-surface-hover'],
    borderColor: 'transparent',
    color: color['--ult-color-text'],
  },
  accent: {
    backgroundColor: color['--ult-color-accent'],
    borderColor: 'transparent',
    color: color['--ult-color-accent-contrast'],
  },
  highlight: {
    backgroundColor: color['--ult-color-highlight'],
    borderColor: 'transparent',
    color: color['--ult-color-highlight-contrast'],
  },
  success: {
    backgroundColor: color['--ult-color-success'],
    borderColor: 'transparent',
    color: color['--ult-color-success-contrast'],
  },
  warning: {
    backgroundColor: color['--ult-color-warning'],
    borderColor: 'transparent',
    color: color['--ult-color-warning-contrast'],
  },
  danger: {
    backgroundColor: color['--ult-color-danger'],
    borderColor: 'transparent',
    color: color['--ult-color-danger-contrast'],
  },
});

const variants = { subtle, solid };

type BadgeVariant = keyof typeof variants;
type BadgeTone = keyof typeof subtle;

type BadgeProps = PartProps<useRender.ComponentProps<'span'>> & {
  variant?: BadgeVariant;
  tone?: BadgeTone;
};

/** Static: color never carries meaning alone, so the text has to say it too. */
function Badge({ variant = 'subtle', tone = 'neutral', ref, render, style, ...props }: BadgeProps) {
  return useRender({
    defaultTagName: 'span',
    ref,
    render,
    props: { ...props, ...stylex.props(styles.root, variants[variant][tone], style) },
  });
}

export { Badge, type BadgeProps, type BadgeVariant, type BadgeTone };
