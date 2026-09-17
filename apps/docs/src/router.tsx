import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';

import type { MDXComponents } from 'mdx/types';
import type { ComponentType } from 'react';

import AlertContent from './content/components/alert.mdx';
import AlertDialogContent from './content/components/alert-dialog.mdx';
import BadgeContent from './content/components/badge.mdx';
import BreadcrumbContent from './content/components/breadcrumb.mdx';
import ButtonContent from './content/components/button.mdx';
import CardContent from './content/components/card.mdx';
import CheckboxContent from './content/components/checkbox.mdx';
import CodeContent from './content/components/code.mdx';
import CollapsibleContent from './content/components/collapsible.mdx';
import ComboboxContent from './content/components/combobox.mdx';
import ContextMenuContent from './content/components/context-menu.mdx';
import DialogContent from './content/components/dialog.mdx';
import DropdownMenuContent from './content/components/dropdown-menu.mdx';
import EmptyContent from './content/components/empty.mdx';
import FieldContent from './content/components/field.mdx';
import FieldsetContent from './content/components/fieldset.mdx';
import InputContent from './content/components/input.mdx';
import MeterContent from './content/components/meter.mdx';
import NavigationMenuContent from './content/components/navigation-menu.mdx';
import PaginationContent from './content/components/pagination.mdx';
import PopoverContent from './content/components/popover.mdx';
import ProgressContent from './content/components/progress.mdx';
import RadioGroupContent from './content/components/radio-group.mdx';
import SelectContent from './content/components/select.mdx';
import SeparatorContent from './content/components/separator.mdx';
import SidebarContent from './content/components/sidebar.mdx';
import SkeletonContent from './content/components/skeleton.mdx';
import SliderContent from './content/components/slider.mdx';
import SpinnerContent from './content/components/spinner.mdx';
import StatContent from './content/components/stat.mdx';
import SwitchContent from './content/components/switch.mdx';
import TableContent from './content/components/table.mdx';
import TabsContent from './content/components/tabs.mdx';
import TextareaContent from './content/components/textarea.mdx';
import ToastContent from './content/components/toast.mdx';
import ToggleGroupContent from './content/components/toggle-group.mdx';
import TooltipContent from './content/components/tooltip.mdx';
import { components } from './components';
import { Prose } from './prose';
import { ComponentsPage } from './routes/components';
import { Home } from './routes/home';
import { InstallPage } from './routes/install';
import { NotFound } from './routes/not-found';
import { PalettePage } from './routes/palette';
import { Placeholder } from './routes/placeholder';
import { RationalePage } from './routes/rationale';
import { Root } from './routes/root';
import { TokensPage } from './routes/tokens';

const rootRoute = createRootRoute({
  component: Root,
  notFoundComponent: NotFound,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
});

const installRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/install',
  component: InstallPage,
});

const tokensRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tokens',
  component: TokensPage,
});

const paletteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/palette',
  component: PalettePage,
});

const componentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/components',
  component: ComponentsPage,
});

const componentNameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/components/$name',
  component: ComponentNamePage,
});

function ComponentNamePage() {
  const { name } = componentNameRoute.useParams();
  const component = components.find(({ item }) => item === name);
  const Content = writtenPages[name];

  if (!component) return <NotFound />;
  if (!Content) return <Placeholder title={component.name} ticket="a later component-page ticket" />;

  return <Prose Content={Content} />;
}

const writtenPages: Record<string, ComponentType<{ components?: MDXComponents }>> = {
  alert: AlertContent,
  'alert-dialog': AlertDialogContent,
  badge: BadgeContent,
  breadcrumb: BreadcrumbContent,
  button: ButtonContent,
  card: CardContent,
  checkbox: CheckboxContent,
  code: CodeContent,
  collapsible: CollapsibleContent,
  combobox: ComboboxContent,
  'context-menu': ContextMenuContent,
  dialog: DialogContent,
  'dropdown-menu': DropdownMenuContent,
  empty: EmptyContent,
  field: FieldContent,
  fieldset: FieldsetContent,
  input: InputContent,
  meter: MeterContent,
  'navigation-menu': NavigationMenuContent,
  pagination: PaginationContent,
  popover: PopoverContent,
  progress: ProgressContent,
  'radio-group': RadioGroupContent,
  select: SelectContent,
  separator: SeparatorContent,
  sidebar: SidebarContent,
  skeleton: SkeletonContent,
  slider: SliderContent,
  spinner: SpinnerContent,
  stat: StatContent,
  switch: SwitchContent,
  table: TableContent,
  tabs: TabsContent,
  textarea: TextareaContent,
  toast: ToastContent,
  'toggle-group': ToggleGroupContent,
  tooltip: TooltipContent,
};

const rationaleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rationale',
  component: RationalePage,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  installRoute,
  tokensRoute,
  paletteRoute,
  componentsRoute,
  componentNameRoute,
  rationaleRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
