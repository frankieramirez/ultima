'use client';

import { Menu } from '@base-ui/react/menu';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, shadow, space, text, z } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const styles = stylex.create({
  positioner: { outline: 0 },
  popup: {
    appearance: 'none',
    boxSizing: 'border-box',
    margin: 0,
    fontFamily: font['--ult-font-sans'],
    lineHeight: font['--ult-font-leading-normal'],
    backgroundColor: color['--ult-color-surface-raised'],
    borderWidth: border.hairline,
    borderStyle: 'solid',
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-lg'],
    boxShadow: shadow['--ult-shadow-md'],
    zIndex: z.popup,
    outlineWidth: 0,
    outlineStyle: 'none',
    padding: space['--ult-space-2'],
    minWidth: `calc(${space['--ult-space-12']} * 2)`,
    transformOrigin: 'var(--transform-origin)',
    transitionProperty: 'opacity, transform',
    transitionDuration: motion['--ult-motion-fast'],
    transitionTimingFunction: { default: easing.enter, ':is([data-ending-style])': easing.exit },
    opacity: { default: 1, ':is([data-starting-style])': 0, ':is([data-ending-style])': 0 },
    transform: { default: 'none', ':is([data-starting-style])': 'scale(0.98)', ':is([data-ending-style])': 'scale(0.98)' },
  },
  item: {
    appearance: 'none',
    boxSizing: 'border-box',
    margin: 0,
    display: 'grid',
    gridTemplateColumns: '1fr',
    alignItems: 'center',
    gap: space['--ult-space-4'],
    borderRadius: radius['--ult-radius-md'],
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-4'],
    fontSize: text['--ult-text-4'],
    fontFamily: font['--ult-font-sans'],
    lineHeight: font['--ult-font-leading-normal'],
    color: color['--ult-color-text'],
    cursor: 'default',
    userSelect: 'none',
    outlineWidth: 0,
    outlineStyle: 'none',
    backgroundColor: { default: 'transparent', ':is([data-highlighted])': color['--ult-color-surface-hover'] },
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
  },
  selectionItem: {
    gridTemplateColumns: `1fr ${space['--ult-space-6']}`,
    '::after': { content: '""', gridColumn: '2', gridRow: '1' },
  },
  linkItem: { textDecoration: 'none', color: color['--ult-color-text'] },
  submenuTrigger: {
    gridTemplateColumns: '1fr auto',
    backgroundColor: { default: 'transparent', ':is([data-highlighted])': color['--ult-color-surface-hover'], ':is([data-popup-open])': color['--ult-color-surface-hover'] },
  },
  indicator: { gridColumn: '2', gridRow: '1', width: '1em', height: '1em', flexShrink: 0, display: 'flex' },
  chevron: { gridColumn: '2', gridRow: '1', flexShrink: 0 },
  separator: { borderTopWidth: border.hairline, borderTopStyle: 'solid', borderTopColor: color['--ult-color-border'], marginBlock: space['--ult-space-2'] },
  groupLabel: {
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-2'],
    color: color['--ult-color-text-subtle'],
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-4'],
  },
  arrow: { backgroundColor: color['--ult-color-surface-raised'], borderWidth: border.hairline, borderStyle: 'solid', borderColor: color['--ult-color-border'] },
});

function Check() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>;
}

function Dot() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor" /></svg>;
}

function ChevronRight() {
  return <svg {...stylex.props(styles.chevron)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>;
}

export type DropdownMenuRootProps = ComponentProps<typeof Menu.Root>;

export type DropdownMenuTriggerProps = ComponentProps<typeof Menu.Trigger>;

export type DropdownMenuPortalProps = ComponentProps<typeof Menu.Portal>;

export type DropdownMenuBackdropProps = ComponentProps<typeof Menu.Backdrop>;

export type DropdownMenuPositionerProps = PartProps<ComponentProps<typeof Menu.Positioner>>;

export type DropdownMenuPopupProps = PartProps<ComponentProps<typeof Menu.Popup>>;

export type DropdownMenuViewportProps = ComponentProps<typeof Menu.Viewport>;

export type DropdownMenuArrowProps = PartProps<ComponentProps<typeof Menu.Arrow>>;

export type DropdownMenuItemProps = PartProps<ComponentProps<typeof Menu.Item>>;

export type DropdownMenuLinkItemProps = PartProps<ComponentProps<typeof Menu.LinkItem>>;

export type DropdownMenuGroupProps = ComponentProps<typeof Menu.Group>;

export type DropdownMenuGroupLabelProps = PartProps<ComponentProps<typeof Menu.GroupLabel>>;

export type DropdownMenuSeparatorProps = PartProps<ComponentProps<typeof Menu.Separator>>;

export type DropdownMenuCheckboxItemProps = PartProps<ComponentProps<typeof Menu.CheckboxItem>>;

export type DropdownMenuCheckboxItemIndicatorProps = PartProps<ComponentProps<typeof Menu.CheckboxItemIndicator>>;

export type DropdownMenuRadioGroupProps = ComponentProps<typeof Menu.RadioGroup>;

export type DropdownMenuRadioItemProps = PartProps<ComponentProps<typeof Menu.RadioItem>>;

export type DropdownMenuRadioItemIndicatorProps = PartProps<ComponentProps<typeof Menu.RadioItemIndicator>>;

export type DropdownMenuSubmenuRootProps = ComponentProps<typeof Menu.SubmenuRoot>;

export type DropdownMenuSubmenuTriggerProps = PartProps<ComponentProps<typeof Menu.SubmenuTrigger>>;

function Positioner({ style, ...props }: DropdownMenuPositionerProps) {
  return <Menu.Positioner {...props} {...stylex.props(styles.positioner, style)} />;
}

function Popup({ style, ...props }: DropdownMenuPopupProps) {
  return <Menu.Popup {...props} {...stylex.props(styles.popup, style)} />;
}

function Arrow({ style, ...props }: DropdownMenuArrowProps) {
  return <Menu.Arrow {...props} {...stylex.props(styles.arrow, style)} />;
}

function Item({ style, ...props }: DropdownMenuItemProps) {
  return <Menu.Item {...props} {...stylex.props(styles.item, style)} />;
}

function LinkItem({ style, ...props }: DropdownMenuLinkItemProps) {
  return <Menu.LinkItem {...props} {...stylex.props(styles.item, styles.linkItem, style)} />;
}

function GroupLabel({ style, ...props }: DropdownMenuGroupLabelProps) {
  return <Menu.GroupLabel {...props} {...stylex.props(styles.groupLabel, style)} />;
}

function Separator({ style, ...props }: DropdownMenuSeparatorProps) {
  return <Menu.Separator {...props} {...stylex.props(styles.separator, style)} />;
}

function CheckboxItem({ style, ...props }: DropdownMenuCheckboxItemProps) {
  return <Menu.CheckboxItem {...props} {...stylex.props(styles.item, styles.selectionItem, style)} />;
}

function CheckboxItemIndicator({ style, children, ...props }: DropdownMenuCheckboxItemIndicatorProps) {
  return <Menu.CheckboxItemIndicator {...props} {...stylex.props(styles.indicator, style)}>{children ?? <Check />}</Menu.CheckboxItemIndicator>;
}

function RadioItem({ style, ...props }: DropdownMenuRadioItemProps) {
  return <Menu.RadioItem {...props} {...stylex.props(styles.item, styles.selectionItem, style)} />;
}

function RadioItemIndicator({ style, children, ...props }: DropdownMenuRadioItemIndicatorProps) {
  return <Menu.RadioItemIndicator {...props} {...stylex.props(styles.indicator, style)}>{children ?? <Dot />}</Menu.RadioItemIndicator>;
}

function SubmenuTrigger({ style, children, ...props }: DropdownMenuSubmenuTriggerProps) {
  return <Menu.SubmenuTrigger {...props} {...stylex.props(styles.item, styles.submenuTrigger, style)}>{children}<ChevronRight /></Menu.SubmenuTrigger>;
}

const DropdownMenu = {
  Root: Menu.Root,
  Trigger: Menu.Trigger,
  Portal: Menu.Portal,
  Backdrop: Menu.Backdrop,
  Positioner,
  Popup,
  Viewport: Menu.Viewport,
  Arrow,
  Item,
  LinkItem,
  Group: Menu.Group,
  GroupLabel,
  Separator,
  CheckboxItem,
  CheckboxItemIndicator,
  RadioGroup: Menu.RadioGroup,
  RadioItem,
  RadioItemIndicator,
  SubmenuRoot: Menu.SubmenuRoot,
  SubmenuTrigger,
};

export { DropdownMenu };
