'use client';

import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, shadow, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import { createContext, use, type ComponentProps } from 'react';

const HOVER = '@media (hover: hover)';

const styles = stylex.create({
  root: {
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    margin: 0,
  },
  list: {
    display: 'flex',
    flexDirection: { default: 'row', ':is([data-orientation="vertical"])': 'column' },
    position: 'relative',
  },
  tab: {
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: 'transparent',
    borderStyle: 'none',
    boxSizing: 'border-box',
    // Hover lifts a resting tab to the active ink, only on devices that hover; a disabled tab
    // takes the disabled ink instead of fading.
    color: {
      default: color['--ult-color-text-muted'],
      ':is([data-active])': color['--ult-color-text'],
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
    paddingBlock: 0,
    position: 'relative',
    touchAction: 'manipulation',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'color',
    transitionTimingFunction: easing.standard,
    userSelect: 'none',
    whiteSpace: 'nowrap',
    zIndex: 1,
    WebkitTapHighlightColor: 'transparent',
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  indicator: {
    position: 'absolute',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'inset-block-start, inset-inline-start, width, height',
    transitionTimingFunction: easing.standard,
  },
  panel: {
    paddingBlockStart: space['--ult-space-6'],
  },
});

const lists = stylex.create({
  underline: {
    borderBlockEndColor: color['--ult-color-border'],
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: border.hairline,
    gap: space['--ult-space-4'],
  },
  segmented: {
    backgroundColor: color['--ult-color-surface-sunken'],
    borderRadius: radius['--ult-radius-md'],
    gap: space['--ult-space-1'],
    padding: space['--ult-space-1'],
  },
});

// An underline tab stands at the md control height; a segmented tab fills the sm height less the
// list's inset, so the list is 32px and the tab's corner nests in it (4 + 2 = 6).
const tabs = stylex.create({
  underline: {
    borderRadius: radius['--ult-radius-md'],
    minBlockSize: space['--ult-space-10'],
    paddingInline: space['--ult-space-4'],
  },
  segmented: {
    borderRadius: radius['--ult-radius-sm'],
    minBlockSize: `calc(${space['--ult-space-9']} - 2 * ${space['--ult-space-1']})`,
    paddingInline: space['--ult-space-5'],
  },
});

const indicators = stylex.create({
  underline: {
    backgroundColor: color['--ult-color-accent'],
    height: border.focus,
    // Lies over the list's hairline rather than above it.
    insetBlockEnd: `calc(var(--active-tab-bottom) - ${border.hairline})`,
    insetInlineStart: 'var(--active-tab-left)',
    width: 'var(--active-tab-width)',
  },
  segmented: {
    backgroundColor: color['--ult-color-surface-raised'],
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-sm'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxShadow: shadow['--ult-shadow-xs'],
    boxSizing: 'border-box',
    height: 'var(--active-tab-height)',
    insetBlockStart: 'var(--active-tab-top)',
    insetInlineStart: 'var(--active-tab-left)',
    width: 'var(--active-tab-width)',
    zIndex: 0,
  },
});

type TabsVariant = keyof typeof lists;

const VariantContext = createContext<TabsVariant>('underline');

type TabsRootProps = PartProps<ComponentProps<typeof BaseTabs.Root>> & { variant?: TabsVariant };
type TabsListProps = PartProps<ComponentProps<typeof BaseTabs.List>>;
type TabsTabProps = PartProps<ComponentProps<typeof BaseTabs.Tab>>;
type TabsIndicatorProps = PartProps<ComponentProps<typeof BaseTabs.Indicator>>;
type TabsPanelProps = PartProps<ComponentProps<typeof BaseTabs.Panel>>;

function Root({ variant = 'underline', style, ...props }: TabsRootProps) {
  return (
    <VariantContext value={variant}>
      <BaseTabs.Root {...props} {...stylex.props(styles.root, style)} />
    </VariantContext>
  );
}

function List({ style, ...props }: TabsListProps) {
  return <BaseTabs.List {...props} {...stylex.props(styles.list, lists[use(VariantContext)], style)} />;
}

function Tab({ style, ...props }: TabsTabProps) {
  return <BaseTabs.Tab {...props} {...stylex.props(styles.tab, tabs[use(VariantContext)], style)} />;
}

function Indicator({ style, ...props }: TabsIndicatorProps) {
  return <BaseTabs.Indicator {...props} {...stylex.props(styles.indicator, indicators[use(VariantContext)], style)} />;
}

function Panel({ style, ...props }: TabsPanelProps) {
  return <BaseTabs.Panel {...props} {...stylex.props(styles.panel, style)} />;
}

const Tabs = { Root, List, Tab, Indicator, Panel };

export {
  Tabs,
  type TabsVariant,
  type TabsRootProps,
  type TabsListProps,
  type TabsTabProps,
  type TabsIndicatorProps,
  type TabsPanelProps,
};
