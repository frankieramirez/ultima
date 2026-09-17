'use client';

import { ContextMenu as BaseContextMenu } from '@base-ui/react/context-menu';
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
    borderRadius: radius['--ult-radius-md'],
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

export type ContextMenuRootProps = ComponentProps<typeof BaseContextMenu.Root>;

export type ContextMenuTriggerProps = ComponentProps<typeof BaseContextMenu.Trigger>;

export type ContextMenuPortalProps = ComponentProps<typeof BaseContextMenu.Portal>;

export type ContextMenuBackdropProps = ComponentProps<typeof BaseContextMenu.Backdrop>;

export type ContextMenuPositionerProps = PartProps<ComponentProps<typeof BaseContextMenu.Positioner>>;

export type ContextMenuPopupProps = PartProps<ComponentProps<typeof BaseContextMenu.Popup>>;

export type ContextMenuArrowProps = PartProps<ComponentProps<typeof BaseContextMenu.Arrow>>;

export type ContextMenuItemProps = PartProps<ComponentProps<typeof BaseContextMenu.Item>>;

export type ContextMenuLinkItemProps = PartProps<ComponentProps<typeof BaseContextMenu.LinkItem>>;

export type ContextMenuGroupProps = ComponentProps<typeof BaseContextMenu.Group>;

export type ContextMenuGroupLabelProps = PartProps<ComponentProps<typeof BaseContextMenu.GroupLabel>>;

export type ContextMenuSeparatorProps = PartProps<ComponentProps<typeof BaseContextMenu.Separator>>;

export type ContextMenuCheckboxItemProps = PartProps<ComponentProps<typeof BaseContextMenu.CheckboxItem>>;

export type ContextMenuCheckboxItemIndicatorProps = PartProps<ComponentProps<typeof BaseContextMenu.CheckboxItemIndicator>>;

export type ContextMenuRadioGroupProps = ComponentProps<typeof BaseContextMenu.RadioGroup>;

export type ContextMenuRadioItemProps = PartProps<ComponentProps<typeof BaseContextMenu.RadioItem>>;

export type ContextMenuRadioItemIndicatorProps = PartProps<ComponentProps<typeof BaseContextMenu.RadioItemIndicator>>;

export type ContextMenuSubmenuRootProps = ComponentProps<typeof BaseContextMenu.SubmenuRoot>;

export type ContextMenuSubmenuTriggerProps = PartProps<ComponentProps<typeof BaseContextMenu.SubmenuTrigger>>;

function Positioner({ style, ...props }: ContextMenuPositionerProps) {
  return <BaseContextMenu.Positioner {...props} {...stylex.props(styles.positioner, style)} />;
}

function Popup({ style, ...props }: ContextMenuPopupProps) {
  return <BaseContextMenu.Popup {...props} {...stylex.props(styles.popup, style)} />;
}

function Arrow({ style, ...props }: ContextMenuArrowProps) {
  return <BaseContextMenu.Arrow {...props} {...stylex.props(styles.arrow, style)} />;
}

function Item({ style, ...props }: ContextMenuItemProps) {
  return <BaseContextMenu.Item {...props} {...stylex.props(styles.item, style)} />;
}

function LinkItem({ style, ...props }: ContextMenuLinkItemProps) {
  return <BaseContextMenu.LinkItem {...props} {...stylex.props(styles.item, styles.linkItem, style)} />;
}

function GroupLabel({ style, ...props }: ContextMenuGroupLabelProps) {
  return <BaseContextMenu.GroupLabel {...props} {...stylex.props(styles.groupLabel, style)} />;
}

function Separator({ style, ...props }: ContextMenuSeparatorProps) {
  return <BaseContextMenu.Separator {...props} {...stylex.props(styles.separator, style)} />;
}

function CheckboxItem({ style, ...props }: ContextMenuCheckboxItemProps) {
  return <BaseContextMenu.CheckboxItem {...props} {...stylex.props(styles.item, styles.selectionItem, style)} />;
}

function CheckboxItemIndicator({ style, children, ...props }: ContextMenuCheckboxItemIndicatorProps) {
  return <BaseContextMenu.CheckboxItemIndicator {...props} {...stylex.props(styles.indicator, style)}>{children ?? <Check />}</BaseContextMenu.CheckboxItemIndicator>;
}

function RadioItem({ style, ...props }: ContextMenuRadioItemProps) {
  return <BaseContextMenu.RadioItem {...props} {...stylex.props(styles.item, styles.selectionItem, style)} />;
}

function RadioItemIndicator({ style, children, ...props }: ContextMenuRadioItemIndicatorProps) {
  return <BaseContextMenu.RadioItemIndicator {...props} {...stylex.props(styles.indicator, style)}>{children ?? <Dot />}</BaseContextMenu.RadioItemIndicator>;
}

function SubmenuTrigger({ style, children, ...props }: ContextMenuSubmenuTriggerProps) {
  return <BaseContextMenu.SubmenuTrigger {...props} {...stylex.props(styles.item, styles.submenuTrigger, style)}>{children}<ChevronRight /></BaseContextMenu.SubmenuTrigger>;
}

const ContextMenu = {
  Root: BaseContextMenu.Root,
  Trigger: BaseContextMenu.Trigger,
  Portal: BaseContextMenu.Portal,
  Backdrop: BaseContextMenu.Backdrop,
  Positioner,
  Popup,
  Arrow,
  Item,
  LinkItem,
  Group: BaseContextMenu.Group,
  GroupLabel,
  Separator,
  CheckboxItem,
  CheckboxItemIndicator,
  RadioGroup: BaseContextMenu.RadioGroup,
  RadioItem,
  RadioItemIndicator,
  SubmenuRoot: BaseContextMenu.SubmenuRoot,
  SubmenuTrigger,
};

export { ContextMenu };
