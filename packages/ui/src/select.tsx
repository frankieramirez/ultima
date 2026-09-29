'use client';

import { Select as BaseSelect } from '@base-ui/react/select';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, shadow, space, text, z } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const styles = stylex.create({
  label: {
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
  },
  trigger: {
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: color['--ult-color-surface-sunken'],
    borderColor: {
      default: color['--ult-color-border-strong'],
      ':is([aria-invalid="true"])': color['--ult-color-danger-border'],
    },
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    display: 'inline-flex',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-4'],
    justifyContent: 'space-between',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  value: {
    color: { default: color['--ult-color-text'], ':is([data-placeholder])': color['--ult-color-text-subtle'] },
    flexGrow: 1,
    overflow: 'hidden',
    textAlign: 'start',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  icon: {
    color: color['--ult-color-text-subtle'],
    display: 'flex',
    flexShrink: 0,
  },
  positioner: {
    outline: 0,
    zIndex: z.popup,
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
    outline: 'none',
    overflow: 'hidden',
    padding: space['--ult-space-1'],
    position: 'relative',
    transformOrigin: 'var(--transform-origin)',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'opacity, transform',
    transitionTimingFunction: easing.enter,
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
  item: {
    alignItems: 'center',
    backgroundColor: { ':is([data-highlighted])': color['--ult-color-surface-hover'] },
    borderRadius: radius['--ult-radius-md'],
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    cursor: 'default',
    display: 'grid',
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    fontWeight: {
      default: font['--ult-font-weight-regular'],
      ':is([data-selected])': font['--ult-font-weight-medium'],
    },
    gap: space['--ult-space-4'],
    gridTemplateColumns: `${space['--ult-space-6']} 1fr`,
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
    outline: 'none',
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-4'],
  },
  itemText: {
    gridColumn: 2,
  },
  itemIndicator: {
    display: 'flex',
    flexShrink: 0,
    gridColumn: 1,
    height: '1em',
    width: '1em',
  },
  separator: {
    backgroundColor: color['--ult-color-border'],
    blockSize: border.hairline,
    border: 'none',
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
  scrollArrow: {
    alignItems: 'center',
    backgroundColor: color['--ult-color-surface-raised'],
    display: { default: 'none', ':is([data-visible])': 'flex' },
    height: space['--ult-space-8'],
    insetInline: 0,
    justifyContent: 'center',
    position: 'absolute',
    zIndex: 1,
  },
  scrollUp: {
    insetBlockStart: 0,
  },
  scrollDown: {
    insetBlockEnd: 0,
  },
  chevronUp: {
    display: 'flex',
    transform: 'rotate(180deg)',
  },
});

const sizes = stylex.create({
  sm: {
    fontSize: text['--ult-text-4'],
    height: space['--ult-space-9'],
    paddingInline: space['--ult-space-4'],
  },
  md: {
    fontSize: text['--ult-text-5'],
    height: space['--ult-space-10'],
    paddingInline: space['--ult-space-5'],
  },
  lg: {
    fontSize: text['--ult-text-5'],
    height: space['--ult-space-11'],
    paddingInline: space['--ult-space-6'],
  },
});

type SelectSize = keyof typeof sizes;
type SelectLabelProps = PartProps<ComponentProps<typeof BaseSelect.Label>>;
type SelectTriggerProps = PartProps<ComponentProps<typeof BaseSelect.Trigger>> & { size?: SelectSize };
type SelectValueProps = PartProps<ComponentProps<typeof BaseSelect.Value>>;
type SelectIconProps = PartProps<ComponentProps<typeof BaseSelect.Icon>>;
type SelectPortalProps = PartProps<ComponentProps<typeof BaseSelect.Portal>>;
type SelectBackdropProps = PartProps<ComponentProps<typeof BaseSelect.Backdrop>>;
type SelectPositionerProps = PartProps<ComponentProps<typeof BaseSelect.Positioner>>;
type SelectPopupProps = PartProps<ComponentProps<typeof BaseSelect.Popup>>;
type SelectListProps = PartProps<ComponentProps<typeof BaseSelect.List>>;
type SelectItemProps = PartProps<ComponentProps<typeof BaseSelect.Item>>;
type SelectItemTextProps = PartProps<ComponentProps<typeof BaseSelect.ItemText>>;
type SelectItemIndicatorProps = PartProps<ComponentProps<typeof BaseSelect.ItemIndicator>>;
type SelectGroupProps = PartProps<ComponentProps<typeof BaseSelect.Group>>;
type SelectGroupLabelProps = PartProps<ComponentProps<typeof BaseSelect.GroupLabel>>;
type SelectSeparatorProps = PartProps<ComponentProps<typeof BaseSelect.Separator>>;
type SelectScrollUpArrowProps = PartProps<ComponentProps<typeof BaseSelect.ScrollUpArrow>>;
type SelectScrollDownArrowProps = PartProps<ComponentProps<typeof BaseSelect.ScrollDownArrow>>;
type SelectArrowProps = PartProps<ComponentProps<typeof BaseSelect.Arrow>>;

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
      aria-hidden
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
      aria-hidden
    >
      <path d="M5 12l5 5L19 8" />
    </svg>
  );
}

function Label({ style, ...props }: SelectLabelProps) {
  return <BaseSelect.Label {...props} {...stylex.props(styles.label, style)} />;
}

function Trigger({ size = 'md', style, ...props }: SelectTriggerProps) {
  return <BaseSelect.Trigger {...props} {...stylex.props(styles.trigger, sizes[size], style)} />;
}

function Value({ style, ...props }: SelectValueProps) {
  return <BaseSelect.Value {...props} {...stylex.props(styles.value, style)} />;
}

function Icon({ style, children, ...props }: SelectIconProps) {
  return (
    <BaseSelect.Icon {...props} {...stylex.props(styles.icon, style)}>
      {children ?? <ChevronDown />}
    </BaseSelect.Icon>
  );
}

function Portal({ style, ...props }: SelectPortalProps) {
  return <BaseSelect.Portal {...props} {...stylex.props(style)} />;
}

function Backdrop({ style, ...props }: SelectBackdropProps) {
  return <BaseSelect.Backdrop {...props} {...stylex.props(style)} />;
}

function Positioner({ style, ...props }: SelectPositionerProps) {
  return <BaseSelect.Positioner {...props} {...stylex.props(styles.positioner, style)} />;
}

function Popup({ style, ...props }: SelectPopupProps) {
  return <BaseSelect.Popup {...props} {...stylex.props(styles.popup, style)} />;
}

function List({ style, ...props }: SelectListProps) {
  return <BaseSelect.List {...props} {...stylex.props(style)} />;
}

function Item({ style, ...props }: SelectItemProps) {
  return <BaseSelect.Item {...props} {...stylex.props(styles.item, style)} />;
}

function ItemText({ style, ...props }: SelectItemTextProps) {
  return <BaseSelect.ItemText {...props} {...stylex.props(styles.itemText, style)} />;
}

function ItemIndicator({ style, children, ...props }: SelectItemIndicatorProps) {
  return (
    <BaseSelect.ItemIndicator {...props} {...stylex.props(styles.itemIndicator, style)}>
      {children ?? <Check />}
    </BaseSelect.ItemIndicator>
  );
}

function Group({ style, ...props }: SelectGroupProps) {
  return <BaseSelect.Group {...props} {...stylex.props(style)} />;
}

function GroupLabel({ style, ...props }: SelectGroupLabelProps) {
  return <BaseSelect.GroupLabel {...props} {...stylex.props(styles.groupLabel, style)} />;
}

function Separator({ style, ...props }: SelectSeparatorProps) {
  return <BaseSelect.Separator {...props} {...stylex.props(styles.separator, style)} />;
}

function ScrollUpArrow({ style, children, ...props }: SelectScrollUpArrowProps) {
  return (
    <BaseSelect.ScrollUpArrow {...props} {...stylex.props(styles.scrollArrow, styles.scrollUp, style)}>
      {children ?? (
        <span {...stylex.props(styles.chevronUp)}>
          <ChevronDown />
        </span>
      )}
    </BaseSelect.ScrollUpArrow>
  );
}

function ScrollDownArrow({ style, children, ...props }: SelectScrollDownArrowProps) {
  return (
    <BaseSelect.ScrollDownArrow {...props} {...stylex.props(styles.scrollArrow, styles.scrollDown, style)}>
      {children ?? <ChevronDown />}
    </BaseSelect.ScrollDownArrow>
  );
}

function Arrow({ style, ...props }: SelectArrowProps) {
  return <BaseSelect.Arrow {...props} {...stylex.props(style)} />;
}

const Select = {
  Root: BaseSelect.Root,
  Label,
  Trigger,
  Value,
  Icon,
  Portal,
  Backdrop,
  Positioner,
  Popup,
  List,
  Item,
  ItemText,
  ItemIndicator,
  Group,
  GroupLabel,
  Separator,
  ScrollUpArrow,
  ScrollDownArrow,
  Arrow,
};

export {
  Select,
  type SelectSize,
  type SelectLabelProps,
  type SelectTriggerProps,
  type SelectValueProps,
  type SelectIconProps,
  type SelectPortalProps,
  type SelectBackdropProps,
  type SelectPositionerProps,
  type SelectPopupProps,
  type SelectListProps,
  type SelectItemProps,
  type SelectItemTextProps,
  type SelectItemIndicatorProps,
  type SelectGroupProps,
  type SelectGroupLabelProps,
  type SelectSeparatorProps,
  type SelectScrollUpArrowProps,
  type SelectScrollDownArrowProps,
  type SelectArrowProps,
};
