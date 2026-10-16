'use client';

import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { CheckboxGroup } from '@base-ui/react/checkbox-group';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

// The box sits on the sunken fill like a field and steps on hover and press. StyleX ranks `:hover` above a data
// attribute, so the checked steps carry the checked condition in their own key, and `:not([data-disabled])` keeps a
// dimmed box from answering the pointer. The checked border follows the fill unless the box is invalid.
const styles = stylex.create({
  root: {
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: {
      default: color['--ult-color-surface-sunken'],
      ':hover:not([data-disabled])': color['--ult-color-surface-hover'],
      ':active:not([data-disabled])': color['--ult-color-surface-active'],
      ':is([data-checked], [data-indeterminate])': color['--ult-color-accent'],
      ':is([data-checked], [data-indeterminate]):hover:not([data-disabled])': color['--ult-color-accent-hover'],
      ':is([data-checked], [data-indeterminate]):active:not([data-disabled])': color['--ult-color-accent-active'],
    },
    borderColor: {
      default: color['--ult-color-border-strong'],
      ':is([aria-invalid="true"], [data-invalid])': color['--ult-color-danger-border'],
      ':is([data-checked], [data-indeterminate]):not([aria-invalid="true"], [data-invalid])': color['--ult-color-accent'],
      ':is([data-checked], [data-indeterminate]):not([aria-invalid="true"], [data-invalid]):hover:not([data-disabled])':
        color['--ult-color-accent-hover'],
      ':is([data-checked], [data-indeterminate]):not([aria-invalid="true"], [data-invalid]):active:not([data-disabled])':
        color['--ult-color-accent-active'],
    },
    borderRadius: radius['--ult-radius-sm'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    color: color['--ult-color-accent-contrast'],
    display: 'inline-flex',
    flexShrink: 0,
    fontFamily: font['--ult-font-sans'],
    // The glyphs are `1em`, so the box sets its own size rather than inheriting the page's.
    fontSize: text['--ult-text-5'],
    height: space['--ult-space-6'],
    justifyContent: 'center',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
    padding: 0,
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color, border-color',
    transitionTimingFunction: easing.standard,
    width: space['--ult-space-6'],
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  indicator: {
    display: { default: 'inline-flex', ':is([data-unchecked])': 'none' },
    flexShrink: 0,
  },
  check: {
    display: { default: 'none', ':is([data-checked] *)': 'block' },
    flexShrink: 0,
  },
  dash: {
    display: { default: 'none', ':is([data-indeterminate] *)': 'block' },
    flexShrink: 0,
  },
  group: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-3'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
});

function Check() {
  return (
    <svg
      {...stylex.props(styles.check)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function Dash() {
  return (
    <svg
      {...stylex.props(styles.dash)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

type CheckboxRootProps = PartProps<ComponentProps<typeof BaseCheckbox.Root>>;
type CheckboxIndicatorProps = PartProps<ComponentProps<typeof BaseCheckbox.Indicator>>;
type CheckboxGroupProps = PartProps<ComponentProps<typeof CheckboxGroup>>;

/** The accessible name comes from a wrapping `<label>`, `aria-label`, or `aria-labelledby`. */
function Root({ style, ...props }: CheckboxRootProps) {
  return <BaseCheckbox.Root {...props} {...stylex.props(styles.root, style)} />;
}

function Indicator({ style, children, ...props }: CheckboxIndicatorProps) {
  return (
    <BaseCheckbox.Indicator {...props} {...stylex.props(styles.indicator, style)}>
      {children ?? (
        <>
          <Check />
          <Dash />
        </>
      )}
    </BaseCheckbox.Indicator>
  );
}

function Group({ style, ...props }: CheckboxGroupProps) {
  return <CheckboxGroup {...props} {...stylex.props(styles.group, style)} />;
}

const Checkbox = { Root, Indicator, Group };

export { Checkbox, type CheckboxRootProps, type CheckboxIndicatorProps, type CheckboxGroupProps };
