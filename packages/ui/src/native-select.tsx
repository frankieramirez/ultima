'use client';

import { Field as BaseField } from '@base-ui/react/field';
import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const chevronInset = space['--ult-space-5'];
const chevronRoom = `calc(${chevronInset} + 1em + ${space['--ult-space-4']})`;

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
  select: {
    appearance: 'none',
    backgroundColor: color['--ult-color-surface-sunken'],
    borderColor: {
      default: color['--ult-color-border-strong'],
      ':is([aria-invalid="true"], [data-invalid])': color['--ult-color-danger-border'],
    },
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    inlineSize: '100%',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    opacity: { default: 1, ':disabled': 0.5, ':is([data-disabled])': 0.5 },
    paddingInlineEnd: chevronRoom,
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  chevron: {
    color: color['--ult-color-text-subtle'],
    insetBlockStart: '50%',
    insetInlineEnd: chevronInset,
    pointerEvents: 'none',
    position: 'absolute',
    transform: 'translateY(-50%)',
  },
});

const sizes = stylex.create({
  sm: {
    fontSize: text['--ult-text-4'],
    height: space['--ult-space-9'],
    paddingInlineStart: space['--ult-space-4'],
  },
  md: {
    fontSize: text['--ult-text-5'],
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
