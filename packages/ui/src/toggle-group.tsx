'use client';

import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, shadow, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';

const HOVER = '@media (hover: hover)';

const styles = stylex.create({
  root: {
    backgroundColor: color['--ult-color-surface-sunken'],
    borderRadius: radius['--ult-radius-md'],
    boxSizing: 'border-box',
    display: 'inline-flex',
    flexDirection: { default: 'row', ':is([data-orientation="vertical"])': 'column' },
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-1'],
    margin: 0,
    padding: space['--ult-space-1'],
  },
  item: {
    alignItems: 'center',
    appearance: 'none',
    /**
     * Hover and press answer only on devices that hover and never on a disabled item. The pressed
     * item repeats `:hover` and `:not([data-disabled])` in its own key so it outranks the plain
     * hover rule: without it, hovering the pressed item would repaint it as a resting one and the
     * selection would look like it had moved.
     */
    backgroundColor: {
      default: 'transparent',
      ':is([data-pressed])': color['--ult-color-surface-raised'],
      ':active:not([data-disabled])': color['--ult-color-surface-active'],
      [HOVER]: {
        ':hover:not([data-disabled])': color['--ult-color-surface-hover'],
        ':active:not([data-disabled])': color['--ult-color-surface-active'],
        ':is([data-pressed]):hover:not([data-disabled])': color['--ult-color-surface-raised'],
      },
    },
    borderColor: {
      default: 'transparent',
      ':is([data-pressed])': color['--ult-color-accent'],
      ':is([data-pressed][data-disabled])': color['--ult-color-border'],
    },
    borderRadius: radius['--ult-radius-sm'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxShadow: { default: 'none', ':is([data-pressed])': shadow['--ult-shadow-xs'] },
    boxSizing: 'border-box',
    color: {
      default: color['--ult-color-text-muted'],
      ':is([data-pressed]):not([data-disabled])': color['--ult-color-text'],
      ':is([data-disabled])': color['--ult-color-text-disabled'],
      [HOVER]: { ':hover:not([data-disabled])': color['--ult-color-text'] },
    },
    cursor: { default: 'pointer', ':is([data-disabled])': 'default' },
    display: 'inline-flex',
    flexShrink: 0,
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
    gap: space['--ult-space-4'],
    justifyContent: 'center',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    // The sm control height less the group's inset, so a group of plain items is 32px tall and the
    // item's corner nests in the group's (4 + 2 = 6). Rich rows grow past it.
    minBlockSize: `calc(${space['--ult-space-9']} - 2 * ${space['--ult-space-1']})`,
    paddingBlock: space['--ult-space-3'],
    paddingInline: space['--ult-space-5'],
    touchAction: 'manipulation',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color, border-color, box-shadow, color',
    transitionTimingFunction: easing.standard,
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
});

type ToggleGroupRootProps<Value extends string = string> = PartProps<BaseToggleGroup.Props<Value>>;
type ToggleGroupItemProps<Value extends string = string> = PartProps<BaseToggle.Props<Value>>;

/** The accessible name comes from `aria-label` or `aria-labelledby`; no child part can carry it. */
function Root<Value extends string = string>({ style, ...props }: ToggleGroupRootProps<Value>) {
  return <BaseToggleGroup<Value> {...props} {...stylex.props(styles.root, style)} />;
}

function Item<Value extends string = string>({ style, ...props }: ToggleGroupItemProps<Value>) {
  return <BaseToggle<Value> {...props} {...stylex.props(styles.item, style)} />;
}

const ToggleGroup = { Root, Item };

export { ToggleGroup, type ToggleGroupRootProps, type ToggleGroupItemProps };
