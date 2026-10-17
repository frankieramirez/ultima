'use client';

import { Input as BaseInput } from '@base-ui/react/input';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const HOVER = '@media (hover: hover)';
const COARSE = '@media (pointer: coarse)';

// Textarea is Input's field recipe on a multi-line box: the brightest fill, a 3:1 edge that
// darkens on hover, and the focus outline laid over the edge. `:read-only` also matches a
// disabled textarea, so one key gives both the sunken fill and the quiet edge.
const styles = stylex.create({
  root: {
    appearance: 'none',
    backgroundColor: { default: color['--ult-color-field'], ':read-only': color['--ult-color-surface-sunken'] },
    borderColor: {
      default: color['--ult-color-border-strong'],
      ':read-only:not([aria-invalid="true"], [data-invalid])': color['--ult-color-border'],
      ':is([aria-invalid="true"], [data-invalid])': color['--ult-color-danger'],
      [HOVER]: {
        ':hover:not(:read-only, [aria-invalid="true"], [data-invalid])': color['--ult-color-border-hover'],
      },
    },
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    color: { default: color['--ult-color-text'], ':disabled': color['--ult-color-text-disabled'] },
    fontFamily: font['--ult-font-sans'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
    minWidth: 0,
    outline: {
      default: 'none',
      ':focus-visible:not([aria-invalid="true"], [data-invalid])': `${border.focus} solid ${color['--ult-color-border-focus']}`,
      ':is([aria-invalid="true"], [data-invalid]):focus-visible': `${border.focus} solid ${color['--ult-color-danger']}`,
    },
    outlineOffset: `calc(-1 * ${border.hairline})`,
    resize: 'vertical',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color, border-color',
    transitionTimingFunction: easing.standard,
    width: '100%',
    '::placeholder': { color: color['--ult-color-text-subtle'], opacity: 1 },
  },
});

// Field text is text step 4, and rises to step 5 under a coarse pointer so iOS doesn't zoom on focus.
const sizes = stylex.create({
  sm: {
    fontSize: { default: text['--ult-text-4'], [COARSE]: text['--ult-text-5'] },
    minHeight: space['--ult-space-9'],
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-4'],
  },
  md: {
    fontSize: { default: text['--ult-text-4'], [COARSE]: text['--ult-text-5'] },
    minHeight: space['--ult-space-10'],
    paddingBlock: space['--ult-space-3'],
    paddingInline: space['--ult-space-5'],
  },
  lg: {
    fontSize: text['--ult-text-5'],
    minHeight: space['--ult-space-11'],
    paddingBlock: space['--ult-space-4'],
    paddingInline: space['--ult-space-6'],
  },
});

type TextareaSize = keyof typeof sizes;

/**
 * The accessible name comes from the consumer: `<label htmlFor>`, `aria-label`, or `aria-labelledby`.
 * `size` is the axis, not the native `<input size>` character count on the Input primitive, so that attribute is dropped.
 */
type TextareaProps = Omit<PartProps<ComponentProps<typeof BaseInput>>, 'size'> & {
  size?: TextareaSize;
};

function Textarea({ size = 'md', style, render = <textarea />, ...props }: TextareaProps) {
  return <BaseInput {...props} render={render} {...stylex.props(styles.root, sizes[size], style)} />;
}

export { Textarea, type TextareaProps, type TextareaSize };
