import * as ui from './generated/anatomy';
import { useContext, type ComponentType, type RefObject } from 'react';

import { BoundaryPortalContext } from './theme-boundary';

export * from './generated/anatomy';

type Portalled = { Portal: ComponentType<never> };

/** `part` is whichever part takes Base UI's portal `container`: `Portal`, or `Sidebar.Panel` for its mobile menu. */
function withBoundaryPortal<T extends Record<P, ComponentType<never>>, P extends string = 'Portal'>(namespace: T, part = 'Portal' as P): T {
  const Part = namespace[part] as ComponentType<{ container?: unknown }>;
  function BoundaryPart(props: { container?: unknown }) {
    const container = useContext(BoundaryPortalContext);
    if (container === undefined || props.container !== undefined) return <Part {...props} />;
    return <Part container={container} {...props} />;
  }
  return { ...namespace, [part]: BoundaryPart };
}

/** Zag's Portal takes a ref and falls back to `<body>` while it is empty, so it waits here instead. */
function withBoundaryPortalByRef<T extends Portalled>(namespace: T): T {
  const Portal = namespace.Portal as ComponentType<{ container?: RefObject<HTMLElement> }>;
  function BoundaryPortal(props: { container?: RefObject<HTMLElement> }) {
    const container = useContext(BoundaryPortalContext);
    if (container === undefined || props.container !== undefined) return <Portal {...props} />;
    if (container === null) return null;
    return <Portal container={{ current: container }} {...props} />;
  }
  return { ...namespace, Portal: BoundaryPortal };
}

export const AlertDialog = withBoundaryPortal(ui.AlertDialog);
export const ColorField = withBoundaryPortal(ui.ColorField);
export const Combobox = withBoundaryPortal(ui.Combobox);
export const Command = withBoundaryPortal(ui.Command);
export const ContextMenu = withBoundaryPortal(ui.ContextMenu);
export const DatePicker = withBoundaryPortalByRef(ui.DatePicker);
export const Dialog = withBoundaryPortal(ui.Dialog);
export const Drawer = withBoundaryPortal(ui.Drawer);
export const DropdownMenu = withBoundaryPortal(ui.DropdownMenu);
export const HoverCard = withBoundaryPortal(ui.HoverCard);
export const NavigationMenu = withBoundaryPortal(ui.NavigationMenu);
export const Popover = withBoundaryPortal(ui.Popover);
export const Select = withBoundaryPortal(ui.Select);
export const Sidebar = withBoundaryPortal(ui.Sidebar, 'Panel');
export const Toast = withBoundaryPortal(ui.Toast);
export const Tooltip = withBoundaryPortal(ui.Tooltip);
