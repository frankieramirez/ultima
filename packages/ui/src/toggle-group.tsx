'use client';

import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, motion, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';

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
    backgroundColor: {
      default: 'transparent',
      ':hover': color['--ult-color-surface-hover'],
      /**
       * Nested rather than a sibling of `:hover`, which StyleX sorts above a data
       * attribute: as siblings, hovering the pressed item would repaint it as a
       * resting one and the selection would look like it had moved.
       */
      ':is([data-pressed])': {
        default: color['--ult-color-surface-raised'],
        ':hover': color['--ult-color-surface-raised'],
      },
    },
    borderRadius: radius['--ult-radius-sm'],
    borderStyle: 'none',
    boxSizing: 'border-box',
    color: {
      default: color['--ult-color-text-muted'],
      ':is([data-pressed])': color['--ult-color-text'],
    },
    cursor: { default: 'pointer', ':is([data-disabled])': 'default' },
    display: 'inline-flex',
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-3'],
    fontWeight: font['--ult-font-weight-medium'],
    justifyContent: 'center',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
    paddingBlock: space['--ult-space-3'],
    paddingInline: space['--ult-space-5'],
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color, color',
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
