"use client";

import { useRender } from "@base-ui/react/use-render";
import * as stylex from "@stylexjs/stylex";
import {
  border,
  color,
  easing,
  font,
  motion,
  radius,
  space,
  text,
} from "@ultima/tokens/tokens.stylex";
import { Dialog } from "@ultima/ui/dialog";
import type { PartProps } from "@ultima/ui/lib/component";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

/**
 * The one breakpoint, above which Sidebar is an inline panel. Both halves of the switch read this
 * string: the at-rule keys below, and the `matchMedia` subscription that decides what mounts. A
 * runtime value cannot sit in a StyleX media condition, so it is a module constant and not a prop.
 */
const DESKTOP = "@media (min-width: 48rem)";

const DESKTOP_CONDITION = DESKTOP.slice("@media ".length);

const styles = stylex.create({
  /**
   * The inline panel, and the CSS half of the breakpoint. It is hidden below `DESKTOP` so a narrow
   * server render never flashes the desktop layout, and every collapse condition is nested inside
   * the query, because a bare media query outranks every state condition written beside it.
   */
  panel: {
    backgroundColor: color["--ult-color-surface"],
    borderInlineEndColor: color["--ult-color-border"],
    borderInlineEndStyle: "solid",
    borderInlineEndWidth: 0,
    boxSizing: "border-box",
    color: color["--ult-color-text"],
    display: { default: "none", [DESKTOP]: "block" },
    fontFamily: font["--ult-font-sans"],
    inlineSize: {
      default: `min(calc(4 * ${space["--ult-space-12"]}), 100%)`,
      [DESKTOP]: {
        default: `min(calc(4 * ${space["--ult-space-12"]}), 100%)`,
        ":is([data-closed])": 0,
      },
    },
    lineHeight: font["--ult-font-leading-normal"],
    margin: 0,
    overflow: {
      default: "auto",
      [DESKTOP]: { default: "auto", ":is([data-closed])": "hidden" },
    },
    paddingBlock: space["--ult-space-4"],
    paddingInline: {
      default: space["--ult-space-4"],
      [DESKTOP]: { default: space["--ult-space-4"], ":is([data-closed])": 0 },
    },
    transitionDuration: motion["--ult-motion-base"],
    transitionProperty:
      "inline-size, padding-inline, border-inline-end-width, visibility",
    transitionTimingFunction: easing.standard,
    visibility: {
      default: "visible",
      [DESKTOP]: { default: "visible", ":is([data-closed])": "hidden" },
    },
  },
  group: {
    display: "flex",
    flexDirection: "column",
    gap: space["--ult-space-2"],
    paddingBlock: space["--ult-space-4"],
  },
  groupLabel: {
    color: color["--ult-color-text-subtle"],
    fontSize: text["--ult-text-2"],
    fontWeight: font["--ult-font-weight-medium"],
    letterSpacing: font["--ult-font-tracking-wide"],
    lineHeight: font["--ult-font-leading-none"],
    margin: 0,
    paddingBlock: space["--ult-space-2"],
    paddingInline: space["--ult-space-4"],
    textTransform: "uppercase",
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  row: {
    alignItems: "center",
    appearance: "none",
    backgroundColor: {
      default: "transparent",
      ":hover": color["--ult-color-surface-hover"],
    },
    borderInlineStartColor: "transparent",
    borderInlineStartStyle: "solid",
    borderInlineStartWidth: 0,
    borderRadius: radius["--ult-radius-sm"],
    borderStyle: "none",
    boxSizing: "border-box",
    color: {
      default: color["--ult-color-text-muted"],
      ":hover": color["--ult-color-text"],
    },
    cursor: "pointer",
    display: "flex",
    fontFamily: font["--ult-font-sans"],
    fontSize: text["--ult-text-4"],
    fontWeight: font["--ult-font-weight-regular"],
    gap: space["--ult-space-4"],
    inlineSize: "100%",
    lineHeight: font["--ult-font-leading-normal"],
    margin: 0,
    paddingBlock: space["--ult-space-2"],
    paddingInline: space["--ult-space-4"],
    textAlign: "start",
    textDecoration: "none",
    transitionDuration: motion["--ult-motion-fast"],
    transitionProperty: "background-color, border-color, color",
    ":focus-visible": {
      outline: `${border.focus} solid ${color["--ult-color-border-focus"]}`,
      outlineOffset: border.focusOffset,
    },
  },
  /** Reading `aria-current` is what styles a router's own link, TanStack Router's included, with no `active` prop. */
  link: {
    backgroundColor: {
      default: "transparent",
      ':is([data-active], [aria-current="page"])': color["--ult-color-accent-subtle"],
      ":hover": color["--ult-color-surface-hover"],
    },
    borderInlineStartColor: {
      default: "transparent",
      ':is([data-active], [aria-current="page"])': color["--ult-color-accent"],
    },
    borderInlineStartWidth: {
      default: 0,
      ':is([data-active], [aria-current="page"])': border.focus,
    },
    color: {
      default: color["--ult-color-text-muted"],
      ':is([data-active], [aria-current="page"])': color["--ult-color-text"],
      ":hover": color["--ult-color-text"],
    },
    fontWeight: {
      default: font["--ult-font-weight-regular"],
      ':is([data-active], [aria-current="page"])':
        font["--ult-font-weight-medium"],
    },
  },
});

/**
 * StyleX merges a property one condition at a time, so the popup's `transform` names all three of
 * its states: a state left out here would keep Dialog's own `scale(0.98)` underneath the slide.
 */
const mobile = stylex.create({
  viewport: {
    display: "flex",
    justifyContent: "flex-start",
    padding: 0,
  },
  popup: {
    blockSize: "100%",
    borderInlineEndWidth: border.hairline,
    borderRadius: 0,
    borderWidth: 0,
    inlineSize: `min(calc(4 * ${space["--ult-space-12"]}), 100%)`,
    maxWidth: "none",
    padding: 0,
    transform: {
      default: "translateX(0)",
      ":is([data-starting-style])": "translateX(-100%)",
      ":is([data-ending-style])": "translateX(-100%)",
    },
    transitionDuration: motion["--ult-motion-base"],
    transitionProperty: "opacity, transform",
  },
  panel: {
    blockSize: "100%",
    // A later plain value replaces the whole property, media query and all, so this lifts the
    // panel style's `display: none` rather than losing to it on StyleX's at-rule priority.
    display: "block",
  },
});

const depths = stylex.create({
  root: { paddingInlineStart: 0 },
  nested: { paddingInlineStart: space["--ult-space-6"] },
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

const SidebarContext = createContext<{
  state: SidebarState;
  panelId: string;
} | null>(null);

const DepthContext = createContext(0);

function useRoot(caller: string) {
  const context = use(SidebarContext);
  if (!context) throw new Error(`${caller} must be used inside Sidebar.Root`);
  return context;
}

function useSidebar(): SidebarState {
  return useRoot("useSidebar").state;
}

function subscribeToDesktop(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_CONDITION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function readIsMobile(): boolean {
  return !window.matchMedia(DESKTOP_CONDITION).matches;
}

function serverIsMobile(): boolean {
  return false;
}

function useIsMobile(): boolean {
  return useSyncExternalStore(subscribeToDesktop, readIsMobile, serverIsMobile);
}

type SidebarRootProps = PartProps<useRender.ComponentProps<"div">> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  mobileOpen?: boolean;
  defaultMobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
};

type SidebarPanelProps = PartProps<useRender.ComponentProps<"nav">> &
  ({ "aria-label": string } | { "aria-labelledby": string });

type SidebarPanelName = { "aria-label"?: string; "aria-labelledby"?: string };

type SidebarTriggerProps = PartProps<useRender.ComponentProps<"button">>;
type SidebarCloseProps = PartProps<useRender.ComponentProps<"button">>;
type SidebarGroupProps = PartProps<useRender.ComponentProps<"div">>;
type SidebarGroupLabelProps = PartProps<useRender.ComponentProps<"h3">>;
type SidebarListProps = PartProps<useRender.ComponentProps<"ul">>;
type SidebarItemProps = PartProps<useRender.ComponentProps<"li">>;
type SidebarLinkProps = PartProps<useRender.ComponentProps<"a">> & {
  active?: boolean;
};
type SidebarButtonProps = PartProps<useRender.ComponentProps<"button">>;

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
  const [uncontrolledMobileOpen, setUncontrolledMobileOpen] =
    useState(defaultMobileOpen);
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

  useEffect(() => {
    if (!isMobile && resolvedMobileOpen) setMobileOpen(false);
  }, [isMobile, resolvedMobileOpen, setMobileOpen]);

  const state = useMemo<SidebarState>(
    () => ({
      open: resolvedOpen,
      setOpen,
      mobileOpen: resolvedMobileOpen,
      setMobileOpen,
      isMobile,
      toggle: () =>
        isMobile ? setMobileOpen(!resolvedMobileOpen) : setOpen(!resolvedOpen),
    }),
    [isMobile, resolvedOpen, resolvedMobileOpen, setOpen, setMobileOpen],
  );

  const element = useRender({
    defaultTagName: "div",
    ref,
    render,
    props: { ...props, ...stylex.props(style) },
  });

  return (
    <SidebarContext
      value={useMemo(() => ({ state, panelId }), [state, panelId])}
    >
      <Dialog.Root open={resolvedMobileOpen} onOpenChange={setMobileOpen}>
        {element}
      </Dialog.Root>
    </SidebarContext>
  );
}

function Panel({ ref, render, style, id, ...props }: SidebarPanelProps) {
  const { state, panelId } = useRoot("Sidebar.Panel");
  const {
    "aria-label": label,
    "aria-labelledby": labelledBy,
  }: SidebarPanelName = props;

  const nav = useRender({
    defaultTagName: "nav",
    ref,
    render,
    state: { open: state.open },
    stateAttributesMapping: {
      open: (value: boolean): Record<string, string> =>
        value ? { "data-open": "" } : { "data-closed": "" },
    },
    props: {
      id: id ?? panelId,
      ...props,
      ...stylex.props(styles.panel, state.isMobile && mobile.panel, style),
    },
  });

  if (!state.isMobile) return nav;

  return (
    <Dialog.Portal>
      <Dialog.Backdrop />
      <Dialog.Viewport style={mobile.viewport}>
        <Dialog.Popup
          style={mobile.popup}
          aria-label={label}
          aria-labelledby={labelledBy}
        >
          {nav}
        </Dialog.Popup>
      </Dialog.Viewport>
    </Dialog.Portal>
  );
}

function Trigger({ ref, render, style, ...props }: SidebarTriggerProps) {
  const { state, panelId } = useRoot("Sidebar.Trigger");

  const desktop = useRender({
    defaultTagName: "button",
    ref,
    render,
    enabled: !state.isMobile,
    props: {
      type: "button",
      "aria-controls": panelId,
      "aria-expanded": state.open,
      onClick: state.toggle,
      ...props,
      ...stylex.props(style),
    },
  });

  if (state.isMobile)
    return (
      <Dialog.Trigger
        ref={ref}
        render={render}
        {...props}
        {...stylex.props(style)}
      />
    );

  return desktop;
}

function Close({ ref, render, style, ...props }: SidebarCloseProps) {
  const { state } = useRoot("Sidebar.Close");

  if (!state.isMobile) return null;

  return (
    <Dialog.Close
      ref={ref}
      render={render}
      {...props}
      {...stylex.props(style)}
    />
  );
}

function Group({ ref, render, style, ...props }: SidebarGroupProps) {
  return useRender({
    defaultTagName: "div",
    ref,
    render,
    props: { ...props, ...stylex.props(styles.group, style) },
  });
}

function GroupLabel({ ref, render, style, ...props }: SidebarGroupLabelProps) {
  return useRender({
    defaultTagName: "h3",
    ref,
    render,
    props: { ...props, ...stylex.props(styles.groupLabel, style) },
  });
}

function List({ ref, render, style, ...props }: SidebarListProps) {
  const depth = use(DepthContext);
  const element = useRender({
    defaultTagName: "ul",
    ref,
    render,
    props: {
      ...props,
      ...stylex.props(
        styles.list,
        depths[depth === 0 ? "root" : "nested"],
        style,
      ),
    },
  });

  return <DepthContext value={depth + 1}>{element}</DepthContext>;
}

function Item({ ref, render, style, ...props }: SidebarItemProps) {
  return useRender({
    defaultTagName: "li",
    ref,
    render,
    props: { ...props, ...stylex.props(style) },
  });
}

function Link({
  ref,
  render,
  style,
  active = false,
  onClick,
  ...props
}: SidebarLinkProps) {
  const { state } = useRoot("Sidebar.Link");

  return useRender({
    defaultTagName: "a",
    ref,
    render,
    state: { active },
    stateAttributesMapping: {
      active: (value: boolean): Record<string, string> | null =>
        value ? { "data-active": "", "aria-current": "page" } : null,
    },
    props: {
      ...props,
      onClick: (event: ReactMouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (state.isMobile) state.setMobileOpen(false);
      },
      ...stylex.props(styles.row, styles.link, style),
    },
  });
}

function Button({ ref, render, style, ...props }: SidebarButtonProps) {
  return useRender({
    defaultTagName: "button",
    ref,
    render,
    props: { type: "button", ...props, ...stylex.props(styles.row, style) },
  });
}

const Sidebar = {
  Root,
  Panel,
  Trigger,
  Close,
  Group,
  GroupLabel,
  List,
  Item,
  Link,
  Button,
};

export {
  Sidebar,
  useSidebar,
  type SidebarButtonProps,
  type SidebarCloseProps,
  type SidebarGroupLabelProps,
  type SidebarGroupProps,
  type SidebarItemProps,
  type SidebarLinkProps,
  type SidebarListProps,
  type SidebarPanelProps,
  type SidebarRootProps,
  type SidebarState,
  type SidebarTriggerProps,
};
