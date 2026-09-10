'use client';

import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { border, color, easing, font, motion, radius, space, text } from '@ultima/tokens/tokens.stylex';
import { Dialog } from '@ultima/ui/dialog';
import type { PartProps } from '@ultima/ui/lib/component';
import { createContext, use, useCallback, useId, useMemo, useState } from 'react';

const styles = stylex.create({
  panel: {
    backgroundColor: color['--ult-color-surface'],
    borderInlineEndColor: color['--ult-color-border'],
    borderInlineEndStyle: 'solid',
    borderInlineEndWidth: { default: border.hairline, ':is([data-closed])': 0 },
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    inlineSize: { default: `calc(4 * ${space['--ult-space-12']})`, ':is([data-closed])': 0 },
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
    overflow: { default: 'auto', ':is([data-closed])': 'hidden' },
    paddingBlock: space['--ult-space-4'],
    paddingInline: { default: space['--ult-space-4'], ':is([data-closed])': 0 },
    transitionDuration: motion['--ult-motion-base'],
    transitionProperty: 'inline-size, padding-inline, border-inline-end-width, visibility',
    transitionTimingFunction: easing.standard,
    visibility: { default: 'visible', ':is([data-closed])': 'hidden' },
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-2'],
    paddingBlock: space['--ult-space-4'],
  },
  groupLabel: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-wide'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-4'],
    textTransform: 'uppercase',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  row: {
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: { default: 'transparent', ':hover': color['--ult-color-surface-hover'] },
    borderInlineStartColor: 'transparent',
    borderInlineStartStyle: 'solid',
    borderInlineStartWidth: 0,
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'none',
    boxSizing: 'border-box',
    color: { default: color['--ult-color-text-muted'], ':hover': color['--ult-color-text'] },
    cursor: 'pointer',
    display: 'flex',
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-regular'],
    gap: space['--ult-space-4'],
    inlineSize: '100%',
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-4'],
    textAlign: 'start',
    textDecoration: 'none',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color, border-color, color',
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  /** Reading `aria-current` is what styles a router's own link, TanStack Router's included, with no `active` prop. */
  link: {
    backgroundColor: {
      default: 'transparent',
      ':is([data-active], [aria-current="page"])': color['--ult-color-surface-sunken'],
      ':hover': color['--ult-color-surface-hover'],
    },
    borderInlineStartColor: {
      default: 'transparent',
      ':is([data-active], [aria-current="page"])': color['--ult-color-accent'],
    },
    borderInlineStartWidth: {
      default: 0,
      ':is([data-active], [aria-current="page"])': border.focus,
    },
    color: {
      default: color['--ult-color-text-muted'],
      ':is([data-active], [aria-current="page"])': color['--ult-color-text'],
      ':hover': color['--ult-color-text'],
    },
    fontWeight: {
      default: font['--ult-font-weight-regular'],
      ':is([data-active], [aria-current="page"])': font['--ult-font-weight-medium'],
    },
  },
});

const depths = stylex.create({
  root: { paddingInlineStart: 0 },
  nested: { paddingInlineStart: space['--ult-space-6'] },
});

type SidebarState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  isMobile: boolean;
  /** Flips whichever of the two applies at the current width. */
  toggle: () => void;
};

const SidebarContext = createContext<{ state: SidebarState; panelId: string } | null>(null);

const DepthContext = createContext(0);

function useRoot(caller: string) {
  const context = use(SidebarContext);
  if (!context) throw new Error(`${caller} must be used inside Sidebar.Root`);
  return context;
}

function useSidebar(): SidebarState {
  return useRoot('useSidebar').state;
}

/** Reads the viewport half of the breakpoint. Both halves land together on ULT-64; until then every width is desktop. */
function useIsMobile(): boolean {
  return false;
}

type SidebarRootProps = PartProps<useRender.ComponentProps<'div'>> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  mobileOpen?: boolean;
  defaultMobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
};

type SidebarPanelProps = PartProps<useRender.ComponentProps<'nav'>> &
  ({ 'aria-label': string } | { 'aria-labelledby': string });

type SidebarTriggerProps = PartProps<useRender.ComponentProps<'button'>>;
type SidebarCloseProps = PartProps<useRender.ComponentProps<'button'>>;
type SidebarGroupProps = PartProps<useRender.ComponentProps<'div'>>;
type SidebarGroupLabelProps = PartProps<useRender.ComponentProps<'h3'>>;
type SidebarListProps = PartProps<useRender.ComponentProps<'ul'>>;
type SidebarItemProps = PartProps<useRender.ComponentProps<'li'>>;
type SidebarLinkProps = PartProps<useRender.ComponentProps<'a'>> & { active?: boolean };
type SidebarButtonProps = PartProps<useRender.ComponentProps<'button'>>;

function Root({
  ref,
  render,
  style,
  open,
  defaultOpen = true,
  onOpenChange,
  mobileOpen,
  defaultMobileOpen = false,
  onMobileOpenChange,
  ...props
}: SidebarRootProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [uncontrolledMobileOpen, setUncontrolledMobileOpen] = useState(defaultMobileOpen);
  const panelId = useId();

  const resolvedOpen = open ?? uncontrolledOpen;
  const resolvedMobileOpen = mobileOpen ?? uncontrolledMobileOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  const setMobileOpen = useCallback(
    (next: boolean) => {
      setUncontrolledMobileOpen(next);
      onMobileOpenChange?.(next);
    },
    [onMobileOpenChange],
  );

  const isMobile = useIsMobile();

  const state = useMemo<SidebarState>(
    () => ({
      open: resolvedOpen,
      setOpen,
      mobileOpen: resolvedMobileOpen,
      setMobileOpen,
      isMobile,
      toggle: () => (isMobile ? setMobileOpen(!resolvedMobileOpen) : setOpen(!resolvedOpen)),
    }),
    [isMobile, resolvedOpen, resolvedMobileOpen, setOpen, setMobileOpen],
  );

  const element = useRender({
    defaultTagName: 'div',
    ref,
    render,
    props: { ...props, ...stylex.props(style) },
  });

  return (
    <SidebarContext value={useMemo(() => ({ state, panelId }), [state, panelId])}>
      <Dialog.Root open={resolvedMobileOpen} onOpenChange={setMobileOpen}>
        {element}
      </Dialog.Root>
    </SidebarContext>
  );
}

function Panel({ ref, render, style, id, ...props }: SidebarPanelProps) {
  const { state, panelId } = useRoot('Sidebar.Panel');

  return useRender({
    defaultTagName: 'nav',
    ref,
    render,
    state: { open: state.open },
    stateAttributesMapping: {
      open: (value: boolean): Record<string, string> => (value ? { 'data-open': '' } : { 'data-closed': '' }),
    },
    props: { id: id ?? panelId, ...props, ...stylex.props(styles.panel, style) },
  });
}

function Trigger({ ref, render, style, ...props }: SidebarTriggerProps) {
  const { state, panelId } = useRoot('Sidebar.Trigger');

  return useRender({
    defaultTagName: 'button',
    ref,
    render,
    props: {
      type: 'button',
      'aria-controls': panelId,
      'aria-expanded': state.open,
      onClick: state.toggle,
      ...props,
      ...stylex.props(style),
    },
  });
}

function Close({ ref, render, style, ...props }: SidebarCloseProps) {
  const { state } = useRoot('Sidebar.Close');

  return useRender({
    defaultTagName: 'button',
    ref,
    render,
    enabled: state.isMobile,
    props: {
      type: 'button',
      onClick: () => state.setMobileOpen(false),
      ...props,
      ...stylex.props(style),
    },
  });
}

function Group({ ref, render, style, ...props }: SidebarGroupProps) {
  return useRender({
    defaultTagName: 'div',
    ref,
    render,
    props: { ...props, ...stylex.props(styles.group, style) },
  });
}

function GroupLabel({ ref, render, style, ...props }: SidebarGroupLabelProps) {
  return useRender({
    defaultTagName: 'h3',
    ref,
    render,
    props: { ...props, ...stylex.props(styles.groupLabel, style) },
  });
}

function List({ ref, render, style, ...props }: SidebarListProps) {
  const depth = use(DepthContext);
  const element = useRender({
    defaultTagName: 'ul',
    ref,
    render,
    props: { ...props, ...stylex.props(styles.list, depths[depth === 0 ? 'root' : 'nested'], style) },
  });

  return <DepthContext value={depth + 1}>{element}</DepthContext>;
}

function Item({ ref, render, style, ...props }: SidebarItemProps) {
  return useRender({ defaultTagName: 'li', ref, render, props: { ...props, ...stylex.props(style) } });
}

function Link({ ref, render, style, active = false, ...props }: SidebarLinkProps) {
  return useRender({
    defaultTagName: 'a',
    ref,
    render,
    state: { active },
    stateAttributesMapping: {
      active: (value: boolean): Record<string, string> | null =>
        value ? { 'data-active': '', 'aria-current': 'page' } : null,
    },
    props: { ...props, ...stylex.props(styles.row, styles.link, style) },
  });
}

function Button({ ref, render, style, ...props }: SidebarButtonProps) {
  return useRender({
    defaultTagName: 'button',
    ref,
    render,
    props: { type: 'button', ...props, ...stylex.props(styles.row, style) },
  });
}

const Sidebar = { Root, Panel, Trigger, Close, Group, GroupLabel, List, Item, Link, Button };

export {
  Sidebar,
  useSidebar,
  type SidebarState,
  type SidebarRootProps,
  type SidebarPanelProps,
  type SidebarTriggerProps,
  type SidebarCloseProps,
  type SidebarGroupProps,
  type SidebarGroupLabelProps,
  type SidebarListProps,
  type SidebarItemProps,
  type SidebarLinkProps,
  type SidebarButtonProps,
};
