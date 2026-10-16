'use client';

import { Field as BaseField } from '@base-ui/react/field';
import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const HOVER = '@media (hover: hover)';
const COARSE = '@media (pointer: coarse)';

const chevronRoom = `calc(${space['--ult-space-5']} + 1em + ${space['--ult-space-4']})`;

const styles = stylex.create({
  root: {
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    display: 'inline-flex',
    fontFamily: font['--ult-font-sans'],
    inlineSize: '100%',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    position: 'relative',
  },
  // Input's field recipe. A `<select>` always matches `:read-only`, so the muted state keys on
  // `:disabled` alone.
  select: {
    appearance: 'none',
    backgroundColor: { default: color['--ult-color-field'], ':disabled': color['--ult-color-surface-sunken'] },
    borderColor: {
      default: color['--ult-color-border-strong'],
      ':disabled': color['--ult-color-border'],
      ':is([aria-invalid="true"], [data-invalid])': color['--ult-color-danger'],
      [HOVER]: {
        ':hover:not(:disabled)': color['--ult-color-border-hover'],
        ':is([aria-invalid="true"], [data-invalid]):hover': color['--ult-color-danger'],
      },
    },
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    color: { default: color['--ult-color-text'], ':disabled': color['--ult-color-text-disabled'] },
    fontFamily: font['--ult-font-sans'],
    inlineSize: '100%',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    minWidth: 0,
    outline: {
      default: 'none',
      ':focus-visible': `${border.focus} solid ${color['--ult-color-border-focus']}`,
      ':is([aria-invalid="true"], [data-invalid]):focus-visible': `${border.focus} solid ${color['--ult-color-danger']}`,
    },
    outlineOffset: `-${border.hairline}`,
    paddingInlineEnd: chevronRoom,
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color, border-color',
    transitionTimingFunction: easing.standard,
  },
  chevron: {
    color: color['--ult-color-text-subtle'],
    insetBlockStart: '50%',
    insetInlineEnd: space['--ult-space-5'],
    pointerEvents: 'none',
    position: 'absolute',
    transform: 'translateY(-50%)',
  },
});

// Field text is text step 4, and rises to step 5 under a coarse pointer so iOS doesn't zoom on focus.
const sizes = stylex.create({
  sm: {
    fontSize: { default: text['--ult-text-4'], [COARSE]: text['--ult-text-5'] },
    height: space['--ult-space-9'],
    paddingInlineStart: space['--ult-space-4'],
  },
  md: {
    fontSize: { default: text['--ult-text-4'], [COARSE]: text['--ult-text-5'] },
    height: space['--ult-space-10'],
    paddingInlineStart: space['--ult-space-5'],
  },
  lg: {
    fontSize: text['--ult-text-5'],
    height: space['--ult-space-11'],
    paddingInlineStart: space['--ult-space-6'],
  },
});

type NativeSelectSize = keyof typeof sizes;
type NativeSelectRootProps = PartProps<useRender.ComponentProps<'div'>>;

/**
 * `size` is the axis, not the native `<select size>` row count, so the native attribute is
 * dropped — Input's own move on the same name.
 */
type NativeSelectSelectProps = Omit<PartProps<ComponentProps<typeof BaseField.Control>>, 'size'> & {
  size?: NativeSelectSize;
};

function ChevronDown() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      aria-hidden
      {...stylex.props(styles.chevron)}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function Root({ ref, render, style, children, ...props }: NativeSelectRootProps) {
  return useRender({
    defaultTagName: 'div',
    ref,
    render,
    props: {
      ...props,
      ...stylex.props(styles.root, style),
      children: (
        <>
          {children}
          <ChevronDown />
        </>
      ),
    },
  });
}

function Select({ render = <select />, size = 'md', style, ...props }: NativeSelectSelectProps) {
  return <BaseField.Control {...props} render={render} {...stylex.props(styles.select, sizes[size], style)} />;
}

const NativeSelect = { Root, Select };

export { NativeSelect, type NativeSelectRootProps, type NativeSelectSelectProps, type NativeSelectSize };
