'use client';

import { Autocomplete as BaseAutocomplete } from '@base-ui/react/autocomplete';
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
const ARROW_OFFSET = `calc(-0.5 * ${space['--ult-space-4']})`;

const listHeight = `calc(5 * ${space['--ult-space-12']})`;

const styles = stylex.create({
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
      ':focus-within:not(:is([aria-invalid="true"], [data-invalid], :has([aria-invalid="true"], [data-invalid])))': `${border.focus} solid ${color['--ult-color-border-focus']}`,
      ':is([aria-invalid="true"], [data-invalid], :has([aria-invalid="true"], [data-invalid])):focus-within': `${border.focus} solid ${color['--ult-color-danger']}`,
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
    flexGrow: 1,
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    margin: 0,
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
    color: { default: color['--ult-color-text'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
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
  positioner: {
    outline: '0',
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
  // A 32px row with the small radius, nested in the popup's 4px inset; an icon the item carries leads.
  item: {
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: { default: 'transparent', ':is([data-highlighted])': color['--ult-color-surface-hover'] },
    borderRadius: radius['--ult-radius-sm'],
    boxSizing: 'border-box',
    color: { default: color['--ult-color-text'], ':is([data-disabled])': color['--ult-color-text-disabled'] },
    cursor: 'default',
    display: 'flex',
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    gap: space['--ult-space-3'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
    minHeight: space['--ult-space-9'],
    outlineStyle: 'none',
    outlineWidth: 0,
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-4'],
    userSelect: 'none',
  },
  separator: {
    borderTopColor: color['--ult-color-border'],
    borderTopStyle: 'solid',
    borderTopWidth: border.hairline,
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
    borderWidth: border.hairline,
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
const sizes = stylex.create({
  sm: {
    fontSize: { default: text['--ult-text-4'], [COARSE]: text['--ult-text-5'] },
    minHeight: space['--ult-space-9'],
    paddingInline: space['--ult-space-4'],
  },
  md: {
    fontSize: { default: text['--ult-text-4'], [COARSE]: text['--ult-text-5'] },
    minHeight: space['--ult-space-10'],
    paddingInline: space['--ult-space-5'],
  },
  lg: {
    fontSize: text['--ult-text-5'],
    minHeight: space['--ult-space-11'],
    paddingInline: space['--ult-space-6'],
  },
});

type CommandSize = keyof typeof sizes;
type CommandInputGroupProps = PartProps<ComponentProps<typeof BaseAutocomplete.InputGroup>> & { size?: CommandSize };
type CommandInputProps = PartProps<ComponentProps<typeof BaseAutocomplete.Input>>;
type CommandTriggerProps = PartProps<ComponentProps<typeof BaseAutocomplete.Trigger>>;
type CommandIconProps = PartProps<ComponentProps<typeof BaseAutocomplete.Icon>>;
type CommandClearProps = PartProps<ComponentProps<typeof BaseAutocomplete.Clear>>;
type CommandPortalProps = PartProps<ComponentProps<typeof BaseAutocomplete.Portal>>;
type CommandBackdropProps = PartProps<ComponentProps<typeof BaseAutocomplete.Backdrop>>;
type CommandPositionerProps = PartProps<ComponentProps<typeof BaseAutocomplete.Positioner>>;
type CommandPopupProps = PartProps<ComponentProps<typeof BaseAutocomplete.Popup>>;
type CommandArrowProps = PartProps<ComponentProps<typeof BaseAutocomplete.Arrow>>;
type CommandListProps = PartProps<ComponentProps<typeof BaseAutocomplete.List>>;
type CommandRowProps = PartProps<ComponentProps<typeof BaseAutocomplete.Row>>;
type CommandItemProps = PartProps<ComponentProps<typeof BaseAutocomplete.Item>>;
type CommandGroupProps = PartProps<ComponentProps<typeof BaseAutocomplete.Group>>;
type CommandGroupLabelProps = PartProps<ComponentProps<typeof BaseAutocomplete.GroupLabel>>;
type CommandSeparatorProps = PartProps<ComponentProps<typeof BaseAutocomplete.Separator>>;
type CommandStatusProps = PartProps<ComponentProps<typeof BaseAutocomplete.Status>>;
type CommandEmptyProps = PartProps<ComponentProps<typeof BaseAutocomplete.Empty>>;

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

function InputGroup({ size = 'md', style, ...props }: CommandInputGroupProps) {
  return <BaseAutocomplete.InputGroup {...props} {...stylex.props(styles.inputGroup, sizes[size], style)} />;
}

/** The control in both arrangements, so a `<label htmlFor>` or `Field.Label` names it natively. */
function Input({ style, ...props }: CommandInputProps) {
  return <BaseAutocomplete.Input {...props} {...stylex.props(styles.input, style)} />;
}

function Trigger({ style, ...props }: CommandTriggerProps) {
  return <BaseAutocomplete.Trigger {...props} {...stylex.props(styles.trigger, style)} />;
}

function Icon({ style, children, ...props }: CommandIconProps) {
  return (
    <BaseAutocomplete.Icon {...props} {...stylex.props(styles.icon, style)}>
      {children ?? <ChevronDown />}
    </BaseAutocomplete.Icon>
  );
}

function Clear({ style, children, ...props }: CommandClearProps) {
  return (
    <BaseAutocomplete.Clear {...props} {...stylex.props(styles.clear, style)}>
      {children ?? <Cross />}
    </BaseAutocomplete.Clear>
  );
}

function Portal({ style, ...props }: CommandPortalProps) {
  return <BaseAutocomplete.Portal {...props} {...stylex.props(style)} />;
}

function Backdrop({ style, ...props }: CommandBackdropProps) {
  return <BaseAutocomplete.Backdrop {...props} {...stylex.props(style)} />;
}

function Positioner({ style, ...props }: CommandPositionerProps) {
  return <BaseAutocomplete.Positioner {...props} {...stylex.props(styles.positioner, style)} />;
}

function Popup({ style, ...props }: CommandPopupProps) {
  return <BaseAutocomplete.Popup {...props} {...stylex.props(styles.popup, style)} />;
}

function Arrow({ style, ...props }: CommandArrowProps) {
  return <BaseAutocomplete.Arrow {...props} {...stylex.props(styles.arrow, style)} />;
}

function List({ style, ...props }: CommandListProps) {
  return <BaseAutocomplete.List {...props} {...stylex.props(styles.list, style)} />;
}

function Row({ style, ...props }: CommandRowProps) {
  return <BaseAutocomplete.Row {...props} {...stylex.props(style)} />;
}

function Item({ style, ...props }: CommandItemProps) {
  return <BaseAutocomplete.Item {...props} {...stylex.props(styles.item, style)} />;
}

function Group({ style, ...props }: CommandGroupProps) {
  return <BaseAutocomplete.Group {...props} {...stylex.props(style)} />;
}

function GroupLabel({ style, ...props }: CommandGroupLabelProps) {
  return <BaseAutocomplete.GroupLabel {...props} {...stylex.props(styles.groupLabel, style)} />;
}

function Separator({ style, ...props }: CommandSeparatorProps) {
  return <BaseAutocomplete.Separator {...props} {...stylex.props(styles.separator, style)} />;
}

function Status({ style, ...props }: CommandStatusProps) {
  return <BaseAutocomplete.Status {...props} {...stylex.props(styles.message, style)} />;
}

function Empty({ style, ...props }: CommandEmptyProps) {
  return <BaseAutocomplete.Empty {...props} {...stylex.props(styles.message, style)} />;
}

const Command = {
  Root: BaseAutocomplete.Root,
  Value: BaseAutocomplete.Value,
  Trigger,
  Input,
  InputGroup,
  Icon,
  Clear,
  List,
  Status,
  Portal,
  Backdrop,
  Positioner,
  Popup,
  Arrow,
  Group,
  GroupLabel,
  Item,
  Row,
  Collection: BaseAutocomplete.Collection,
  Empty,
  Separator,
  useFilter: BaseAutocomplete.useFilter,
  useFilteredItems: BaseAutocomplete.useFilteredItems,
};

export {
  Command,
  type CommandSize,
  type CommandInputGroupProps,
  type CommandInputProps,
  type CommandTriggerProps,
  type CommandIconProps,
  type CommandClearProps,
  type CommandPortalProps,
  type CommandBackdropProps,
  type CommandPositionerProps,
  type CommandPopupProps,
  type CommandArrowProps,
  type CommandListProps,
  type CommandRowProps,
  type CommandItemProps,
  type CommandGroupProps,
  type CommandGroupLabelProps,
  type CommandSeparatorProps,
  type CommandStatusProps,
  type CommandEmptyProps,
};
