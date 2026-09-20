'use client';

import { Autocomplete as BaseAutocomplete } from '@base-ui/react/autocomplete';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, shadow, space, text, z } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const listHeight = `calc(5 * ${space['--ult-space-12']})`;

const styles = stylex.create({
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
    color: color['--ult-color-text'],
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
    appearance: 'none',
    backgroundColor: { default: 'transparent', ':is([data-highlighted])': color['--ult-color-surface-hover'] },
    borderRadius: radius['--ult-radius-md'],
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    cursor: 'default',
    display: 'grid',
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    gap: space['--ult-space-4'],
    gridTemplateColumns: '1fr',
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
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
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-2'],
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-4'],
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
