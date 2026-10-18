'use client';

import { ContextMenu as BaseContextMenu } from '@base-ui/react/context-menu';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, shadow, space, text, z } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const UP = ':is([data-side="bottom"])';
const DOWN = ':is([data-side="top"])';
// The `dir` attribute rather than `:dir()`, which the CSS pipeline lowers to language matching.
const RIGHTWARD = ':is([data-side="left"], [data-side="inline-start"]:not([dir="rtl"] *), [data-side="inline-end"]:is([dir="rtl"] *))';
const LEFTWARD = ':is([data-side="right"], [data-side="inline-end"]:not([dir="rtl"] *), [data-side="inline-start"]:is([dir="rtl"] *))';
const ARROW_OFFSET = `calc(-0.5 * ${space['--ult-space-4']})`;
// The trailing indicator's column: the item's 8px padding, the 1em indicator, and the 12px that
// keeps a label apart from what trails it. Every row of a popup that holds a checkbox or radio item
// keeps it, so labels end and shortcuts line up at one edge whichever rows can be checked.
const INDICATOR_ROOM = `calc(${space['--ult-space-4']} + 1em + ${space['--ult-space-5']})`;
const BESIDE_INDICATORS = ':is([role="menu"]:has([role="menuitemcheckbox"], [role="menuitemradio"]) *)';

const styles = stylex.create({
  positioner: { outline: '0' },
  popup: {
    appearance: 'none',
    boxSizing: 'border-box',
    margin: 0,
    fontFamily: font['--ult-font-sans'],
    lineHeight: font['--ult-font-leading-normal'],
    backgroundColor: color['--ult-color-surface-raised'],
    borderWidth: border.fine,
    borderStyle: 'solid',
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-lg'],
    boxShadow: shadow['--ult-shadow-md'],
    color: color['--ult-color-text'],
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
    transform: { default: 'none', ':is([data-starting-style])': 'scale(0.96)', ':is([data-ending-style])': 'scale(0.96)' },
  },
  // Items are 32px rows with the small radius, so the popup's 8px corner nests around them at its
  // 4px inset. An icon the item carries leads, 8px from its label; the shortcut, the check, the dot
  // and the chevron trail, at least 12px from it. Ink and highlight fill come from the tone table.
  item: {
    appearance: 'none',
    boxSizing: 'border-box',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: space['--ult-space-4'],
    minHeight: space['--ult-space-9'],
    borderRadius: radius['--ult-radius-sm'],
    paddingBlock: space['--ult-space-2'],
    paddingInlineEnd: { default: space['--ult-space-4'], [BESIDE_INDICATORS]: INDICATOR_ROOM },
    paddingInlineStart: space['--ult-space-4'],
    position: 'relative',
    fontSize: text['--ult-text-4'],
    fontFamily: font['--ult-font-sans'],
    lineHeight: font['--ult-font-leading-normal'],
    cursor: 'default',
    userSelect: 'none',
    outlineWidth: 0,
    outlineStyle: 'none',
  },
  /** The trailing indicator's room is kept whether or not it is mounted, so checking an item never reflows it. */
  selectionItem: {
    paddingInlineEnd: INDICATOR_ROOM,
  },
  linkItem: { textDecoration: 'none' },
  // The chevron keeps the trailing edge with the indicators, so the row gives up the indicator room.
  submenuTrigger: {
    paddingInlineEnd: space['--ult-space-4'],
    backgroundColor: { default: 'transparent', ':is([data-highlighted])': color['--ult-color-surface-hover'], ':is([data-popup-open])': color['--ult-color-surface-hover'] },
  },
  indicator: { position: 'absolute', insetInlineEnd: space['--ult-space-4'], width: '1em', height: '1em', display: 'flex' },
  // The item's 8px gap and this 4px keep 12px between a label and what trails it.
  chevron: { flexShrink: 0, marginInlineStart: 'auto', paddingInlineStart: space['--ult-space-2'] },
  /**
   * Muted 12px text at the row's trailing edge, so it sits before a selection indicator. Capitals
   * and modifier glyphs take the micro-label's wide tracking. In a danger item it takes the item's danger ink,
   * which the gate checks on the danger fill; a disabled item's shortcut takes the disabled ink.
   */
  shortcut: {
    color: {
      default: color['--ult-color-text-subtle'],
      ':is([data-tone="danger"]:not([data-disabled]) *)': 'inherit',
      ':is([data-disabled] *)': color['--ult-color-text-disabled'],
    },
    flexShrink: 0,
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-2'],
    letterSpacing: font['--ult-font-tracking-wide'],
    lineHeight: font['--ult-font-leading-none'],
    marginInlineStart: 'auto',
    paddingInlineStart: space['--ult-space-2'],
    whiteSpace: 'nowrap',
  },
  separator: { borderTopWidth: border.fine, borderTopStyle: 'solid', borderTopColor: color['--ult-color-border'], marginBlock: space['--ult-space-2'] },
  groupLabel: {
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-2'],
    letterSpacing: font['--ult-font-tracking-wide'],
    lineHeight: font['--ult-font-leading-snug'],
    textTransform: 'uppercase',
    color: color['--ult-color-text-subtle'],
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-4'],
  },
  /**
   * A square turned 45deg, half outside the popup's edge on the side that faces the anchor.
   * Base UI places only the cross axis; the side offset and the two outward hairlines are set
   * here, so the arrow continues the popup's border and covers it where they meet.
   */
  arrow: {
    backgroundColor: color['--ult-color-surface-raised'],
    borderBottomColor: { default: 'transparent', [DOWN]: color['--ult-color-border'], [LEFTWARD]: color['--ult-color-border'] },
    borderLeftColor: { default: 'transparent', [UP]: color['--ult-color-border'], [LEFTWARD]: color['--ult-color-border'] },
    borderRightColor: { default: 'transparent', [DOWN]: color['--ult-color-border'], [RIGHTWARD]: color['--ult-color-border'] },
    borderTopColor: { default: 'transparent', [UP]: color['--ult-color-border'], [RIGHTWARD]: color['--ult-color-border'] },
    borderStyle: 'solid',
    borderWidth: border.fine,
    bottom: { default: null, [DOWN]: ARROW_OFFSET },
    boxSizing: 'border-box',
    height: space['--ult-space-4'],
    left: { default: null, [LEFTWARD]: ARROW_OFFSET },
    right: { default: null, [RIGHTWARD]: ARROW_OFFSET },
    top: { default: null, [UP]: ARROW_OFFSET },
    transform: 'rotate(45deg)',
    width: space['--ult-space-4'],
  },
});

// A menu item is neutral or danger. Danger colors the label, the icon and the shortcut with the
// danger ink, and the highlight with the danger tint the ink is gated on, as a ghost danger Button does.
const tones = stylex.create({
  neutral: {
    backgroundColor: { default: 'transparent', ':is([data-highlighted])': color['--ult-color-surface-hover'] },
    color: { default: color['--ult-color-text'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
  },
  danger: {
    backgroundColor: { default: 'transparent', ':is([data-highlighted])': color['--ult-color-danger-subtle'] },
    color: { default: color['--ult-color-danger-text'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
  },
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

export type ContextMenuItemTone = keyof typeof tones;

export type ContextMenuItemProps = PartProps<ComponentProps<typeof BaseContextMenu.Item>> & { tone?: ContextMenuItemTone };

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

export type ContextMenuShortcutProps = PartProps<ComponentProps<'span'>>;

function Positioner({ style, ...props }: ContextMenuPositionerProps) {
  return <BaseContextMenu.Positioner {...props} {...stylex.props(styles.positioner, style)} />;
}

function Popup({ style, ...props }: ContextMenuPopupProps) {
  return <BaseContextMenu.Popup {...props} {...stylex.props(styles.popup, style)} />;
}

function Arrow({ style, ...props }: ContextMenuArrowProps) {
  return <BaseContextMenu.Arrow {...props} {...stylex.props(styles.arrow, style)} />;
}

function Item({ tone = 'neutral', style, ...props }: ContextMenuItemProps) {
  return <BaseContextMenu.Item data-tone={tone} {...props} {...stylex.props(styles.item, tones[tone], style)} />;
}

function LinkItem({ style, ...props }: ContextMenuLinkItemProps) {
  return <BaseContextMenu.LinkItem {...props} {...stylex.props(styles.item, tones.neutral, styles.linkItem, style)} />;
}

function GroupLabel({ style, ...props }: ContextMenuGroupLabelProps) {
  return <BaseContextMenu.GroupLabel {...props} {...stylex.props(styles.groupLabel, style)} />;
}

function Separator({ style, ...props }: ContextMenuSeparatorProps) {
  return <BaseContextMenu.Separator {...props} {...stylex.props(styles.separator, style)} />;
}

function CheckboxItem({ style, ...props }: ContextMenuCheckboxItemProps) {
  return <BaseContextMenu.CheckboxItem {...props} {...stylex.props(styles.item, tones.neutral, styles.selectionItem, style)} />;
}

function CheckboxItemIndicator({ style, children, ...props }: ContextMenuCheckboxItemIndicatorProps) {
  return <BaseContextMenu.CheckboxItemIndicator {...props} {...stylex.props(styles.indicator, style)}>{children ?? <Check />}</BaseContextMenu.CheckboxItemIndicator>;
}

function RadioItem({ style, ...props }: ContextMenuRadioItemProps) {
  return <BaseContextMenu.RadioItem {...props} {...stylex.props(styles.item, tones.neutral, styles.selectionItem, style)} />;
}

function RadioItemIndicator({ style, children, ...props }: ContextMenuRadioItemIndicatorProps) {
  return <BaseContextMenu.RadioItemIndicator {...props} {...stylex.props(styles.indicator, style)}>{children ?? <Dot />}</BaseContextMenu.RadioItemIndicator>;
}

function SubmenuTrigger({ style, children, ...props }: ContextMenuSubmenuTriggerProps) {
  return <BaseContextMenu.SubmenuTrigger {...props} {...stylex.props(styles.item, tones.neutral, styles.submenuTrigger, style)}>{children}<ChevronRight /></BaseContextMenu.SubmenuTrigger>;
}

/** The keys that run an item, as text: `<ContextMenu.Shortcut>⇧⌘P</ContextMenu.Shortcut>`. */
function Shortcut({ style, ...props }: ContextMenuShortcutProps) {
  return <span {...props} {...stylex.props(styles.shortcut, style)} />;
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
  Shortcut,
};

export { ContextMenu };
