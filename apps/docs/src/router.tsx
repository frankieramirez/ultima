import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';

import type { MDXComponents } from 'mdx/types';
import type { ComponentType } from 'react';

import BadgeContent from './content/components/badge.mdx';
import ButtonContent from './content/components/button.mdx';
import CardContent from './content/components/card.mdx';
import CodeContent from './content/components/code.mdx';
import DialogContent from './content/components/dialog.mdx';
import DropdownMenuContent from './content/components/dropdown-menu.mdx';
import InputContent from './content/components/input.mdx';
import MeterContent from './content/components/meter.mdx';
import SelectContent from './content/components/select.mdx';
import StatContent from './content/components/stat.mdx';
import SwitchContent from './content/components/switch.mdx';
import TableContent from './content/components/table.mdx';
import TabsContent from './content/components/tabs.mdx';
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
  badge: BadgeContent,
  button: ButtonContent,
  card: CardContent,
  code: CodeContent,
  dialog: DialogContent,
  'dropdown-menu': DropdownMenuContent,
  input: InputContent,
  meter: MeterContent,
  select: SelectContent,
  stat: StatContent,
  switch: SwitchContent,
  table: TableContent,
  tabs: TabsContent,
  tooltip: TooltipContent,
};

const rationaleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rationale',
  component: RationalePage,
});

const routeTree = rootRoute.addChildren([
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
