'use client';

import { Button as BaseButton } from '@base-ui/react/button';
import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, shadow, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import { createContext, use, type ComponentProps } from 'react';

const HOVER = '@media (hover: hover)';

const styles = stylex.create({
  root: {
    boxSizing: 'border-box',
    display: 'inline-flex',
    fontFamily: font['--ult-font-sans'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
  },
  horizontal: { flexDirection: 'row' },
  vertical: { flexDirection: 'column' },
  item: {
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

// Hover answers only on devices that hover, so a tapped item doesn't stay lit; press answers
// everywhere and moves one step past hover. `:not([data-disabled])` keeps a disabled item
// still, and a disabled item takes the muted fill and ink instead of fading.
const solid = stylex.create({
  accent: {
    backgroundColor: {
      default: color['--ult-color-accent'],
      ':active:not([data-disabled])': color['--ult-color-accent-active'],
      ':is([data-disabled])': color['--ult-color-surface-sunken'],
      [HOVER]: {
        ':hover:not([data-disabled])': color['--ult-color-accent-hover'],
        ':active:not([data-disabled])': color['--ult-color-accent-active'],
      },
    },
    borderColor: 'transparent',
    color: { default: color['--ult-color-accent-contrast'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
  },
  danger: {
    backgroundColor: {
      default: color['--ult-color-danger'],
      ':active:not([data-disabled])': color['--ult-color-danger-active'],
      ':is([data-disabled])': color['--ult-color-surface-sunken'],
      [HOVER]: {
        ':hover:not([data-disabled])': color['--ult-color-danger-hover'],
        ':active:not([data-disabled])': color['--ult-color-danger-active'],
      },
    },
    borderColor: 'transparent',
    color: { default: color['--ult-color-danger-contrast'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
  },
});

const soft = stylex.create({
  accent: {
    backgroundColor: {
      default: color['--ult-color-accent-subtle'],
      ':active:not([data-disabled])': color['--ult-color-accent-subtle-active'],
      ':is([data-disabled])': color['--ult-color-surface-sunken'],
      [HOVER]: {
        ':hover:not([data-disabled])': color['--ult-color-accent-subtle-hover'],
        ':active:not([data-disabled])': color['--ult-color-accent-subtle-active'],
      },
    },
    borderColor: 'transparent',
    color: { default: color['--ult-color-accent-text'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
  },
  danger: {
    backgroundColor: {
      default: color['--ult-color-danger-subtle'],
      ':active:not([data-disabled])': color['--ult-color-danger-subtle-active'],
      ':is([data-disabled])': color['--ult-color-surface-sunken'],
      [HOVER]: {
        ':hover:not([data-disabled])': color['--ult-color-danger-subtle-hover'],
        ':active:not([data-disabled])': color['--ult-color-danger-subtle-active'],
      },
    },
    borderColor: 'transparent',
    color: { default: color['--ult-color-danger-text'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
  },
});

// The outline lifts on `shadow-xs` and sets it down on press. Its edge only decorates, since the
// label identifies the button, so it stays on the quiet `border`.
const outline = stylex.create({
  accent: {
    backgroundColor: {
      default: 'transparent',
      ':is([data-disabled])': color['--ult-color-surface-sunken'],
      ':active:not([data-disabled])': color['--ult-color-surface-active'],
      [HOVER]: {
        ':hover:not([data-disabled])': color['--ult-color-surface-hover'],
        ':active:not([data-disabled])': color['--ult-color-surface-active'],
      },
    },
    borderColor: color['--ult-color-border'],
    boxShadow: {
      default: shadow['--ult-shadow-xs'],
      ':active:not([data-disabled])': 'none',
      ':is([data-disabled])': 'none',
    },
    color: { default: color['--ult-color-text'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
  },
  danger: {
    backgroundColor: {
      default: 'transparent',
      ':is([data-disabled])': color['--ult-color-surface-sunken'],
      ':active:not([data-disabled])': color['--ult-color-danger-subtle-hover'],
      [HOVER]: {
        ':hover:not([data-disabled])': color['--ult-color-danger-subtle'],
        ':active:not([data-disabled])': color['--ult-color-danger-subtle-hover'],
      },
    },
    borderColor: { default: color['--ult-color-danger-border'], ':is([data-disabled])': color['--ult-color-border'] },
    boxShadow: {
      default: shadow['--ult-shadow-xs'],
      ':active:not([data-disabled])': 'none',
      ':is([data-disabled])': 'none',
    },
    color: { default: color['--ult-color-danger-text'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
  },
});

const ghost = stylex.create({
  accent: {
    backgroundColor: {
      default: 'transparent',
      ':is([data-disabled])': color['--ult-color-surface-sunken'],
      ':active:not([data-disabled])': color['--ult-color-surface-active'],
      [HOVER]: {
        ':hover:not([data-disabled])': color['--ult-color-surface-hover'],
        ':active:not([data-disabled])': color['--ult-color-surface-active'],
      },
    },
    borderColor: 'transparent',
    color: { default: color['--ult-color-text'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
  },
  danger: {
    backgroundColor: {
      default: 'transparent',
      ':is([data-disabled])': color['--ult-color-surface-sunken'],
      ':active:not([data-disabled])': color['--ult-color-danger-subtle-hover'],
      [HOVER]: {
        ':hover:not([data-disabled])': color['--ult-color-danger-subtle'],
        ':active:not([data-disabled])': color['--ult-color-danger-subtle-hover'],
      },
    },
    borderColor: 'transparent',
    color: { default: color['--ult-color-danger-text'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
  },
});

const variants = { solid, soft, outline, ghost };

// A button that holds an icon gives up one space step on each side, so the icon doesn't sit
// further from the edge than the label does. `paddingInline` stays one property, so the
// icon-only recipe's `paddingInline: 0` in the style slot replaces it whole.
const sizes = stylex.create({
  sm: {
    fontSize: text['--ult-text-3'],
    gap: space['--ult-space-3'],
    height: space['--ult-space-9'],
    paddingBlock: space['--ult-space-2'],
    paddingInline: { default: space['--ult-space-5'], ':has(> svg)': space['--ult-space-4'] },
  },
  md: {
    fontSize: text['--ult-text-4'],
    gap: space['--ult-space-4'],
    height: space['--ult-space-10'],
    paddingBlock: space['--ult-space-4'],
    paddingInline: { default: space['--ult-space-6'], ':has(> svg)': space['--ult-space-5'] },
  },
  lg: {
    fontSize: text['--ult-text-5'],
    gap: space['--ult-space-4'],
    height: space['--ult-space-11'],
    paddingBlock: space['--ult-space-5'],
    paddingInline: { default: space['--ult-space-7'], ':has(> svg)': space['--ult-space-6'] },
  },
});

const joined = stylex.create({
  horizontal: {
    borderEndEndRadius: { ':not(:last-child)': 0 },
    borderEndStartRadius: { ':not(:first-child)': 0 },
    borderInlineStartWidth: { ':not(:first-child)': 0 },
    borderStartEndRadius: { ':not(:last-child)': 0 },
    borderStartStartRadius: { ':not(:first-child)': 0 },
  },
  vertical: {
    borderBlockStartWidth: { ':not(:first-child)': 0 },
    borderEndEndRadius: { ':not(:last-child)': 0 },
    borderEndStartRadius: { ':not(:last-child)': 0 },
    borderStartEndRadius: { ':not(:first-child)': 0 },
    borderStartStartRadius: { ':not(:first-child)': 0 },
  },
});

type ButtonGroupVariant = keyof typeof variants;
type ButtonGroupSize = keyof typeof sizes;
type ButtonGroupTone = keyof typeof solid;
type ButtonGroupOrientation = 'horizontal' | 'vertical';

type ButtonGroupContextValue = {
  variant: ButtonGroupVariant;
  size: ButtonGroupSize;
  tone: ButtonGroupTone;
  orientation: ButtonGroupOrientation;
};

const ButtonGroupContext = createContext<ButtonGroupContextValue>({
  variant: 'solid',
  size: 'md',
  tone: 'accent',
  orientation: 'horizontal',
});

type ButtonGroupRootProps = PartProps<useRender.ComponentProps<'div'>> & {
  variant?: ButtonGroupVariant;
  size?: ButtonGroupSize;
  tone?: ButtonGroupTone;
  orientation?: ButtonGroupOrientation;
};

type ButtonGroupItemProps = PartProps<ComponentProps<typeof BaseButton>> & {
  variant?: ButtonGroupVariant;
  tone?: ButtonGroupTone;
};

/** `aria-label` or `aria-labelledby` names the group; no child part can. */
function Root({
  variant = 'solid',
  size = 'md',
  tone = 'accent',
  orientation = 'horizontal',
  ref,
  render,
  style,
  ...props
}: ButtonGroupRootProps) {
  return (
    <ButtonGroupContext value={{ variant, size, tone, orientation }}>
      {useRender({
        defaultTagName: 'div',
        ref,
        render,
        props: { role: 'group', ...props, ...stylex.props(styles.root, styles[orientation], style) },
      })}
    </ButtonGroupContext>
  );
}

function Item({ variant, tone, style, ...props }: ButtonGroupItemProps) {
  const inherited = use(ButtonGroupContext);
  return (
    <BaseButton
      {...props}
      {...stylex.props(
        styles.item,
        variants[variant ?? inherited.variant][tone ?? inherited.tone],
        sizes[inherited.size],
        joined[inherited.orientation],
        style,
      )}
    />
  );
}

const ButtonGroup = { Root, Item };

export {
  ButtonGroup,
  type ButtonGroupRootProps,
  type ButtonGroupItemProps,
  type ButtonGroupVariant,
  type ButtonGroupSize,
  type ButtonGroupTone,
  type ButtonGroupOrientation,
};
