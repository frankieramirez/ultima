'use client';

import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { CheckboxGroup } from '@base-ui/react/checkbox-group';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const HOVER = '@media (hover: hover)';

// The box is a small field: the field fill, a 3:1 edge that darkens on hover, and the accent fill
// once checked, stepping on hover and press. Each key names its whole state, so no two match at
// once and none depends on StyleX's ranking. Disabled is the muted fill, edge and ink, with no
// opacity; an invalid box keeps its danger edge through every state.
const styles = stylex.create({
  root: {
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: {
      default: color['--ult-color-field'],
      ':is([data-disabled])': color['--ult-color-surface-sunken'],
      ':is([data-checked], [data-indeterminate]):not([data-disabled], :active)': color['--ult-color-accent'],
      ':is([data-checked], [data-indeterminate]):active:not([data-disabled])': color['--ult-color-accent-active'],
      [HOVER]: {
        ':is([data-checked], [data-indeterminate]):hover:not([data-disabled], :active)': color['--ult-color-accent-hover'],
      },
    },
    borderColor: {
      default: color['--ult-color-border-strong'],
      ':is([data-disabled]):not([aria-invalid="true"], [data-invalid])': color['--ult-color-border'],
      ':is([aria-invalid="true"], [data-invalid])': color['--ult-color-danger'],
      ':is([data-checked], [data-indeterminate]):not([aria-invalid="true"], [data-invalid], [data-disabled], :active)':
        color['--ult-color-accent'],
      ':is([data-checked], [data-indeterminate]):active:not([aria-invalid="true"], [data-invalid], [data-disabled])':
        color['--ult-color-accent-active'],
      [HOVER]: {
        ':hover:not([data-checked], [data-indeterminate], [aria-invalid="true"], [data-invalid], [data-disabled])':
          color['--ult-color-border-hover'],
        ':is([data-checked], [data-indeterminate]):hover:not([aria-invalid="true"], [data-invalid], [data-disabled], :active)':
          color['--ult-color-accent-hover'],
      },
    },
    borderRadius: radius['--ult-radius-sm'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    color: { default: color['--ult-color-accent-contrast'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
    display: 'inline-flex',
    flexShrink: 0,
    fontFamily: font['--ult-font-sans'],
    // The glyphs are `1em`, so the box sets their 12px size rather than inheriting the page's.
    fontSize: text['--ult-text-2'],
    height: space['--ult-space-6'],
    justifyContent: 'center',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
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
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      aria-hidden="true"
    >
      <path d="m4 12 5 5L20 6" />
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
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      aria-hidden="true"
    >
      <path d="M4 12h16" />
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
