'use client';

import { Combobox as BaseCombobox } from '@base-ui/react/combobox';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, shadow, space, text, z } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const listHeight = `calc(5 * ${space['--ult-space-12']})`;

const styles = stylex.create({
  label: {
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
  },
  inputGroup: {
    alignItems: 'center',
    backgroundColor: color['--ult-color-surface-sunken'],
    borderColor: {
      default: color['--ult-color-border-strong'],
      ':is([aria-invalid="true"], [data-invalid])': color['--ult-color-danger-border'],
    },
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    display: 'inline-flex',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-3'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
    width: '100%',
    ':focus-within': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  input: {
    appearance: 'none',
    backgroundColor: 'transparent',
    borderStyle: 'none',
    borderWidth: 0,
    borderRadius: 0,
    color: color['--ult-color-text'],
    flexGrow: 1,
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    margin: 0,
    minWidth: 0,
    outline: 'none',
    padding: 0,
    '::placeholder': { color: color['--ult-color-text-subtle'] },
  },
  trigger: {
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: 'transparent',
    borderStyle: 'none',
    borderWidth: 0,
    // Base UI sets `data-placeholder` on Trigger and renders Value's text into it, so the
    // chevron button carries the value colour as well as the chevron's.
    color: {
      default: color['--ult-color-text'],
      ':is([data-placeholder])': color['--ult-color-text-subtle'],
    },
    cursor: 'default',
    display: 'inline-flex',
    flexShrink: 0,
    fontFamily: 'inherit',
    justifyContent: 'center',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
    padding: 0,
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  icon: {
    color: color['--ult-color-text-subtle'],
    display: 'flex',
    flexShrink: 0,
  },
  clear: {
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: 'transparent',
    borderStyle: 'none',
    borderWidth: 0,
    color: color['--ult-color-text-subtle'],
    cursor: 'default',
    // Base UI unmounts Clear after its exit transition, so the button is still in the DOM
    // without `data-visible` during that window and must not paint there.
    display: { default: 'none', ':is([data-visible])': 'inline-flex' },
    flexShrink: 0,
    justifyContent: 'center',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    padding: 0,
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  chip: {
    alignItems: 'center',
    backgroundColor: color['--ult-color-accent-subtle'],
    borderColor: color['--ult-color-accent-border'],
    borderRadius: radius['--ult-radius-sm'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: text['--ult-text-3'],
    gap: space['--ult-space-2'],
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
    paddingBlock: space['--ult-space-1'],
    paddingInline: space['--ult-space-3'],
  },
  chipRemove: {
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: 'transparent',
    borderStyle: 'none',
    borderWidth: 0,
    color: color['--ult-color-text-subtle'],
    cursor: 'default',
    display: 'inline-flex',
    flexShrink: 0,
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    padding: 0,
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  positioner: {
    outline: 0,
  },
  popup: {
    backgroundColor: color['--ult-color-surface-raised'],
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-lg'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxShadow: shadow['--ult-shadow-md'],
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    maxWidth: 'var(--available-width)',
    outline: 'none',
    paddingInline: space['--ult-space-1'],
    position: 'relative',
    transformOrigin: 'var(--transform-origin)',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'opacity, transform',
    transitionTimingFunction: easing.enter,
    width: 'var(--anchor-width)',
    zIndex: z.popup,
    ':is([data-starting-style])': {
      opacity: 0,
      transform: 'scale(0.98)',
    },
    ':is([data-ending-style])': {
      opacity: 0,
      transform: 'scale(0.98)',
      transitionTimingFunction: easing.exit,
    },
  },
  list: {
    maxHeight: `min(${listHeight}, var(--available-height))`,
    outline: 'none',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    paddingBlock: space['--ult-space-1'],
    scrollPaddingBlock: space['--ult-space-1'],
  },
  item: {
    alignItems: 'center',
    backgroundColor: { ':is([data-highlighted])': color['--ult-color-surface-hover'] },
    borderRadius: radius['--ult-radius-md'],
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    cursor: 'default',
    display: 'flex',
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    fontWeight: {
      default: font['--ult-font-weight-regular'],
      ':is([data-selected])': font['--ult-font-weight-medium'],
    },
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
    outline: 'none',
    paddingBlock: space['--ult-space-2'],
    paddingInlineEnd: space['--ult-space-4'],
    paddingInlineStart: space['--ult-space-10'],
    position: 'relative',
  },
  itemIndicator: {
    alignItems: 'center',
    display: 'flex',
    height: '1em',
    insetInlineStart: space['--ult-space-4'],
    justifyContent: 'center',
    position: 'absolute',
    width: '1em',
  },
  separator: {
    backgroundColor: color['--ult-color-border'],
    blockSize: border.hairline,
    borderStyle: 'none',
    borderWidth: 0,
    marginBlock: space['--ult-space-2'],
  },
  groupLabel: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
    letterSpacing: font['--ult-font-tracking-wide'],
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-4'],
    textTransform: 'uppercase',
  },
  // Empty and Status stay mounted so a screen reader hears the text change, so the box
  // collapses on `:empty` instead of being hidden.
  message: {
    color: color['--ult-color-text-muted'],
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    paddingBlock: { default: 0, ':not(:empty)': space['--ult-space-4'] },
    paddingInline: { default: 0, ':not(:empty)': space['--ult-space-4'] },
  },
  arrow: {
    height: space['--ult-space-4'],
    width: space['--ult-space-4'],
    '::before': {
      backgroundColor: color['--ult-color-surface-raised'],
      borderColor: color['--ult-color-border'],
      borderStyle: 'solid',
      borderWidth: border.hairline,
      content: '""',
      display: 'block',
      height: space['--ult-space-4'],
      transform: 'rotate(45deg)',
      width: space['--ult-space-4'],
    },
  },
});

const sizes = stylex.create({
  sm: {
    fontSize: text['--ult-text-4'],
    minHeight: space['--ult-space-9'],
    paddingInline: space['--ult-space-4'],
  },
  md: {
    fontSize: text['--ult-text-5'],
    minHeight: space['--ult-space-10'],
    paddingInline: space['--ult-space-5'],
  },
  lg: {
    fontSize: text['--ult-text-5'],
    minHeight: space['--ult-space-11'],
    paddingInline: space['--ult-space-6'],
  },
});

type ComboboxSize = keyof typeof sizes;
type ComboboxLabelProps = PartProps<ComponentProps<typeof BaseCombobox.Label>>;
type ComboboxInputGroupProps = PartProps<ComponentProps<typeof BaseCombobox.InputGroup>> & { size?: ComboboxSize };
type ComboboxInputProps = PartProps<ComponentProps<typeof BaseCombobox.Input>>;
type ComboboxTriggerProps = PartProps<ComponentProps<typeof BaseCombobox.Trigger>>;
type ComboboxIconProps = PartProps<ComponentProps<typeof BaseCombobox.Icon>>;
type ComboboxClearProps = PartProps<ComponentProps<typeof BaseCombobox.Clear>>;
type ComboboxChipsProps = PartProps<ComponentProps<typeof BaseCombobox.Chips>>;
type ComboboxChipProps = PartProps<ComponentProps<typeof BaseCombobox.Chip>>;
type ComboboxChipRemoveProps = PartProps<ComponentProps<typeof BaseCombobox.ChipRemove>>;
type ComboboxPortalProps = PartProps<ComponentProps<typeof BaseCombobox.Portal>>;
type ComboboxBackdropProps = PartProps<ComponentProps<typeof BaseCombobox.Backdrop>>;
type ComboboxPositionerProps = PartProps<ComponentProps<typeof BaseCombobox.Positioner>>;
type ComboboxPopupProps = PartProps<ComponentProps<typeof BaseCombobox.Popup>>;
type ComboboxArrowProps = PartProps<ComponentProps<typeof BaseCombobox.Arrow>>;
type ComboboxListProps = PartProps<ComponentProps<typeof BaseCombobox.List>>;
type ComboboxRowProps = PartProps<ComponentProps<typeof BaseCombobox.Row>>;
type ComboboxItemProps = PartProps<ComponentProps<typeof BaseCombobox.Item>>;
type ComboboxItemIndicatorProps = PartProps<ComponentProps<typeof BaseCombobox.ItemIndicator>>;
type ComboboxGroupProps = PartProps<ComponentProps<typeof BaseCombobox.Group>>;
type ComboboxGroupLabelProps = PartProps<ComponentProps<typeof BaseCombobox.GroupLabel>>;
type ComboboxSeparatorProps = PartProps<ComponentProps<typeof BaseCombobox.Separator>>;
type ComboboxStatusProps = PartProps<ComponentProps<typeof BaseCombobox.Status>>;
type ComboboxEmptyProps = PartProps<ComponentProps<typeof BaseCombobox.Empty>>;

function ChevronDown() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      aria-hidden="true"
    >
      <path d="M5 12l5 5L19 8" />
    </svg>
  );
}

function Cross() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** Names the Trigger, not the Input. Use it only where Trigger is the field's control. */
function Label({ style, ...props }: ComboboxLabelProps) {
  return <BaseCombobox.Label {...props} {...stylex.props(styles.label, style)} />;
}

function InputGroup({ size = 'md', style, ...props }: ComboboxInputGroupProps) {
  return <BaseCombobox.InputGroup {...props} {...stylex.props(styles.inputGroup, sizes[size], style)} />;
}

/** The field's control in the canonical pattern, so `Field.Label` keeps `nativeLabel`. */
function Input({ style, ...props }: ComboboxInputProps) {
  return <BaseCombobox.Input {...props} {...stylex.props(styles.input, style)} />;
}

function Trigger({ style, ...props }: ComboboxTriggerProps) {
  return <BaseCombobox.Trigger {...props} {...stylex.props(styles.trigger, style)} />;
}

function Icon({ style, children, ...props }: ComboboxIconProps) {
  return (
    <BaseCombobox.Icon {...props} {...stylex.props(styles.icon, style)}>
      {children ?? <ChevronDown />}
    </BaseCombobox.Icon>
  );
}

function Clear({ style, children, ...props }: ComboboxClearProps) {
  return (
    <BaseCombobox.Clear {...props} {...stylex.props(styles.clear, style)}>
      {children ?? <Cross />}
    </BaseCombobox.Clear>
  );
}

function Chips({ style, ...props }: ComboboxChipsProps) {
  return <BaseCombobox.Chips {...props} {...stylex.props(style)} />;
}

function Chip({ style, ...props }: ComboboxChipProps) {
  return <BaseCombobox.Chip {...props} {...stylex.props(styles.chip, style)} />;
}

function ChipRemove({ style, children, ...props }: ComboboxChipRemoveProps) {
  return (
    <BaseCombobox.ChipRemove {...props} {...stylex.props(styles.chipRemove, style)}>
      {children ?? <Cross />}
    </BaseCombobox.ChipRemove>
  );
}

function Portal({ style, ...props }: ComboboxPortalProps) {
  return <BaseCombobox.Portal {...props} {...stylex.props(style)} />;
}

function Backdrop({ style, ...props }: ComboboxBackdropProps) {
  return <BaseCombobox.Backdrop {...props} {...stylex.props(style)} />;
}

function Positioner({ style, ...props }: ComboboxPositionerProps) {
  return <BaseCombobox.Positioner {...props} {...stylex.props(styles.positioner, style)} />;
}

function Popup({ style, ...props }: ComboboxPopupProps) {
  return <BaseCombobox.Popup {...props} {...stylex.props(styles.popup, style)} />;
}

function Arrow({ style, ...props }: ComboboxArrowProps) {
  return <BaseCombobox.Arrow {...props} {...stylex.props(styles.arrow, style)} />;
}

function List({ style, ...props }: ComboboxListProps) {
  return <BaseCombobox.List {...props} {...stylex.props(styles.list, style)} />;
}

function Row({ style, ...props }: ComboboxRowProps) {
  return <BaseCombobox.Row {...props} {...stylex.props(style)} />;
}

function Item({ style, ...props }: ComboboxItemProps) {
  return <BaseCombobox.Item {...props} {...stylex.props(styles.item, style)} />;
}

function ItemIndicator({ style, children, ...props }: ComboboxItemIndicatorProps) {
  return (
    <BaseCombobox.ItemIndicator {...props} {...stylex.props(styles.itemIndicator, style)}>
      {children ?? <Check />}
    </BaseCombobox.ItemIndicator>
  );
}

function Group({ style, ...props }: ComboboxGroupProps) {
  return <BaseCombobox.Group {...props} {...stylex.props(style)} />;
}

function GroupLabel({ style, ...props }: ComboboxGroupLabelProps) {
  return <BaseCombobox.GroupLabel {...props} {...stylex.props(styles.groupLabel, style)} />;
}

function Separator({ style, ...props }: ComboboxSeparatorProps) {
  return <BaseCombobox.Separator {...props} {...stylex.props(styles.separator, style)} />;
}

function Status({ style, ...props }: ComboboxStatusProps) {
  return <BaseCombobox.Status {...props} {...stylex.props(styles.message, style)} />;
}

function Empty({ style, ...props }: ComboboxEmptyProps) {
  return <BaseCombobox.Empty {...props} {...stylex.props(styles.message, style)} />;
}

const Combobox = {
  Root: BaseCombobox.Root,
  Label,
  Value: BaseCombobox.Value,
  Input,
  InputGroup,
  Trigger,
  Icon,
  Clear,
  Chips,
  Chip,
  ChipRemove,
  Portal,
  Backdrop,
  Positioner,
  Popup,
  Arrow,
  List,
  Row,
  Collection: BaseCombobox.Collection,
  Item,
  ItemIndicator,
  Group,
  GroupLabel,
  Separator,
  Status,
  Empty,
  useFilter: BaseCombobox.useFilter,
  useFilteredItems: BaseCombobox.useFilteredItems,
  createItems: BaseCombobox.createItems,
};

export {
  Combobox,
  type ComboboxSize,
  type ComboboxLabelProps,
  type ComboboxInputGroupProps,
  type ComboboxInputProps,
  type ComboboxTriggerProps,
  type ComboboxIconProps,
  type ComboboxClearProps,
  type ComboboxChipsProps,
  type ComboboxChipProps,
  type ComboboxChipRemoveProps,
  type ComboboxPortalProps,
  type ComboboxBackdropProps,
  type ComboboxPositionerProps,
  type ComboboxPopupProps,
  type ComboboxArrowProps,
  type ComboboxListProps,
  type ComboboxRowProps,
  type ComboboxItemProps,
  type ComboboxItemIndicatorProps,
  type ComboboxGroupProps,
  type ComboboxGroupLabelProps,
  type ComboboxSeparatorProps,
  type ComboboxStatusProps,
  type ComboboxEmptyProps,
};
