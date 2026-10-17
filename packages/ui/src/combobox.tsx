'use client';

import { Combobox as BaseCombobox } from '@base-ui/react/combobox';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, shadow, space, text, z } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const HOVER = '@media (hover: hover)';
const COARSE = '@media (pointer: coarse)';

const UP = ':is([data-side="bottom"])';
const DOWN = ':is([data-side="top"])';
// The `dir` attribute rather than `:dir()`, which the CSS pipeline lowers to language matching.
const RIGHTWARD = ':is([data-side="left"], [data-side="inline-start"]:not([dir="rtl"] *), [data-side="inline-end"]:is([dir="rtl"] *))';
const LEFTWARD = ':is([data-side="right"], [data-side="inline-end"]:not([dir="rtl"] *), [data-side="inline-start"]:is([dir="rtl"] *))';
const WITH_CHIPS = ':has([role="toolbar"])';
const ARROW_OFFSET = `calc(-0.5 * ${space['--ult-space-4']})`;

const listHeight = `calc(5 * ${space['--ult-space-12']})`;

const styles = stylex.create({
  label: {
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
  },
  // Input Group's field recipe, restated. Its own `:read-only` would match the div, so the keys
  // ask whether the input inside is read-only, which a disabled input also is. Invalid is read on
  // the group itself as well as inside it, since a caller or Field may mark either.
  inputGroup: {
    alignItems: 'center',
    backgroundColor: {
      default: color['--ult-color-field'],
      ':has(:is(input, textarea):read-only)': color['--ult-color-surface-sunken'],
    },
    borderColor: {
      default: color['--ult-color-border-strong'],
      ':has(:is(input, textarea):read-only):not(:is([aria-invalid="true"], [data-invalid], :has([aria-invalid="true"], [data-invalid])))': color['--ult-color-border'],
      ':is([aria-invalid="true"], [data-invalid], :has([aria-invalid="true"], [data-invalid]))': color['--ult-color-danger'],
      [HOVER]: {
        ':hover:not(:is([aria-invalid="true"], [data-invalid]), :has(:is(input, textarea):read-only, [aria-invalid="true"], [data-invalid]))':
          color['--ult-color-border-hover'],
      },
    },
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    color: { default: color['--ult-color-text'], ':has(:disabled)': color['--ult-color-text-disabled'] },
    display: 'inline-flex',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-3'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    minWidth: 0,
    outline: {
      default: 'none',
      ':focus-within': `${border.focus} solid ${color['--ult-color-border-focus']}`,
    },
    outlineOffset: border.focusOffset,
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color, border-color',
    transitionTimingFunction: easing.standard,
    width: '100%',
  },
  input: {
    appearance: 'none',
    backgroundColor: 'transparent',
    borderStyle: 'none',
    borderWidth: 0,
    borderRadius: 0,
    color: 'inherit',
    // Inside Chips the input wraps to a row of its own only when fewer than 64px are left.
    flexBasis: space['--ult-space-12'],
    flexGrow: 1,
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    margin: 0,
    // A chip's height, so a row the input wraps onto is as tall as a row of chips.
    minHeight: space['--ult-space-8'],
    minWidth: 0,
    outline: 'none',
    padding: 0,
    '::placeholder': { color: color['--ult-color-text-subtle'], opacity: 1 },
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
      ':is([data-disabled])': color['--ult-color-text-disabled'],
    },
    cursor: 'default',
    display: 'inline-flex',
    flexShrink: 0,
    fontFamily: 'inherit',
    justifyContent: 'center',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
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
  // Chips lays the chips and the input out in rows that wrap, 4px apart, the gap between
  // things that belong together.
  chips: {
    alignItems: 'center',
    display: 'flex',
    flexGrow: 1,
    flexWrap: 'wrap',
    gap: space['--ult-space-2'],
    minWidth: 0,
  },
  // A chip is a small inset object inside the field: the accent's tint is its edge, so it has
  // no border, and it takes the small-inset corner. 24px tall, 8px of padding on the side that
  // holds text and 4px on the side that holds the remove button, which sits 4px in from the
  // chip's top, bottom and end alike. Keyboard focus moves between chips with the arrow keys
  // and shows as the ring every control uses. A disabled or read-only field is already the
  // sunken step the tint matches, so its chips move one step up to keep their shape.
  chip: {
    alignItems: 'center',
    backgroundColor: {
      default: color['--ult-color-accent-subtle'],
      ':is([data-disabled], [aria-readonly="true"])': color['--ult-color-surface-hover'],
    },
    borderRadius: radius['--ult-radius-sm'],
    boxSizing: 'border-box',
    color: { default: color['--ult-color-text'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: text['--ult-text-3'],
    gap: space['--ult-space-1'],
    height: space['--ult-space-8'],
    lineHeight: font['--ult-font-leading-none'],
    outline: {
      default: 'none',
      ':focus-visible': `${border.focus} solid ${color['--ult-color-border-focus']}`,
    },
    outlineOffset: border.focusOffset,
    paddingInlineEnd: { default: space['--ult-space-4'], ':has(> button)': space['--ult-space-2'] },
    paddingInlineStart: space['--ult-space-4'],
    whiteSpace: 'nowrap',
  },
  // A 16px target inside the chip's 4px inset, so the mark's corner is the 2px one. Hover moves
  // the chip's tint one step.
  chipRemove: {
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: {
      default: 'transparent',
      [HOVER]: { ':hover:not(:disabled, [aria-disabled="true"])': color['--ult-color-accent-subtle-hover'] },
      ':active:not(:disabled, [aria-disabled="true"])': color['--ult-color-accent-subtle-active'],
    },
    borderRadius: radius['--ult-radius-xs'],
    borderStyle: 'none',
    borderWidth: 0,
    color: {
      default: color['--ult-color-text-subtle'],
      [HOVER]: { ':hover:not(:disabled, [aria-disabled="true"])': color['--ult-color-text'] },
      ':is(:disabled, [aria-disabled="true"])': color['--ult-color-text-disabled'],
    },
    cursor: 'default',
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: text['--ult-text-4'],
    height: space['--ult-space-6'],
    justifyContent: 'center',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    padding: 0,
    width: space['--ult-space-6'],
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  positioner: {
    outline: '0',
  },
  popup: {
    backgroundColor: color['--ult-color-surface-raised'],
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-lg'],
    borderStyle: 'solid',
    borderWidth: border.fine,
    boxShadow: shadow['--ult-shadow-md'],
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    maxWidth: 'var(--available-width)',
    opacity: {
      default: 1,
      ':is([data-starting-style])': 0,
      ':is([data-ending-style])': 0,
    },
    outline: 'none',
    paddingInline: space['--ult-space-2'],
    position: 'relative',
    transform: {
      default: 'none',
      ':is([data-starting-style])': 'scale(0.96)',
      ':is([data-ending-style])': 'scale(0.96)',
    },
    transformOrigin: 'var(--transform-origin)',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'opacity, transform',
    transitionTimingFunction: {
      default: easing.enter,
      ':is([data-ending-style])': easing.exit,
    },
    width: 'var(--anchor-width)',
    zIndex: z.popup,
  },
  list: {
    maxHeight: `min(${listHeight}, var(--available-height))`,
    outline: 'none',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    paddingBlock: space['--ult-space-2'],
    scrollPaddingBlock: space['--ult-space-2'],
  },
  // Items are 32px rows with the small radius, nested in the popup's 4px inset. The check trails,
  // leaving the leading edge to an icon the item carries, and its room is kept whether or not it
  // is mounted, so selecting never reflows the label.
  item: {
    alignItems: 'center',
    backgroundColor: { ':is([data-highlighted])': color['--ult-color-surface-hover'] },
    borderRadius: radius['--ult-radius-sm'],
    boxSizing: 'border-box',
    color: { default: color['--ult-color-text'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
    cursor: 'default',
    display: 'flex',
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-regular'],
    gap: space['--ult-space-3'],
    minHeight: space['--ult-space-9'],
    outline: 'none',
    paddingBlock: space['--ult-space-2'],
    paddingInlineEnd: space['--ult-space-9'],
    paddingInlineStart: space['--ult-space-4'],
    position: 'relative',
  },
  itemIndicator: {
    alignItems: 'center',
    display: 'flex',
    height: '1em',
    insetInlineEnd: space['--ult-space-4'],
    justifyContent: 'center',
    position: 'absolute',
    width: '1em',
  },
  separator: {
    backgroundColor: color['--ult-color-border'],
    blockSize: border.fine,
    borderStyle: 'none',
    borderWidth: 0,
    marginBlock: space['--ult-space-2'],
  },
  groupLabel: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
    letterSpacing: font['--ult-font-tracking-wide'],
    lineHeight: font['--ult-font-leading-snug'],
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

// Field text is text step 4, and rises to step 5 under a coarse pointer so iOS doesn't zoom on focus.
// The block padding is the gap above and below a 24px chip, at or just under what centring it in
// the control height leaves, so a wrapped field keeps the inset of a single row. With a chip in the
// field, the start padding drops to about that same gap, so the first chip sits evenly in the corner
// rather than further from the side than from the top. Base UI gives Chips `role="toolbar"` exactly
// while it holds a chip.
const sizes = stylex.create({
  sm: {
    fontSize: { default: text['--ult-text-4'], [COARSE]: text['--ult-text-5'] },
    minHeight: space['--ult-space-9'],
    paddingBlock: space['--ult-space-1'],
    paddingInlineEnd: space['--ult-space-4'],
    paddingInlineStart: { default: space['--ult-space-4'], [WITH_CHIPS]: space['--ult-space-2'] },
  },
  md: {
    fontSize: { default: text['--ult-text-4'], [COARSE]: text['--ult-text-5'] },
    minHeight: space['--ult-space-10'],
    paddingBlock: space['--ult-space-3'],
    paddingInlineEnd: space['--ult-space-5'],
    paddingInlineStart: { default: space['--ult-space-5'], [WITH_CHIPS]: space['--ult-space-3'] },
  },
  lg: {
    fontSize: text['--ult-text-5'],
    minHeight: space['--ult-space-11'],
    paddingBlock: space['--ult-space-4'],
    paddingInlineEnd: space['--ult-space-6'],
    paddingInlineStart: { default: space['--ult-space-6'], [WITH_CHIPS]: space['--ult-space-5'] },
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
  return <BaseCombobox.Chips {...props} {...stylex.props(styles.chips, style)} />;
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
