'use client';

import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import { createContext, use, type ComponentProps } from 'react';

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
    appearance: 'none',
    backgroundColor: 'transparent',
    borderStyle: 'none',
    boxSizing: 'border-box',
    color: { default: color['--ult-color-text-muted'], ':is([data-active])': color['--ult-color-text'] },
    cursor: { default: 'pointer', ':is([data-disabled])': 'default' },
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-4'],
    position: 'relative',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'color',
    zIndex: 1,
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
    gap: space['--ult-space-6'],
  },
  segmented: {
    backgroundColor: color['--ult-color-surface-sunken'],
    borderRadius: radius['--ult-radius-md'],
    gap: space['--ult-space-1'],
    padding: space['--ult-space-1'],
  },
});

const tabs = stylex.create({
  underline: { borderRadius: radius['--ult-radius-md'] },
  segmented: { borderRadius: radius['--ult-radius-sm'] },
});

const indicators = stylex.create({
  underline: {
    backgroundColor: color['--ult-color-accent'],
    height: border.focus,
    insetBlockEnd: 'var(--active-tab-bottom)',
    insetInlineStart: 'var(--active-tab-left)',
    width: 'var(--active-tab-width)',
  },
  segmented: {
    backgroundColor: color['--ult-color-surface-raised'],
    borderRadius: radius['--ult-radius-sm'],
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
