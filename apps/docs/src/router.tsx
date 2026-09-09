import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';

import { ButtonPage } from './routes/button';
import { ComponentsPage } from './routes/components';
import { Home } from './routes/home';
import { InputPage } from './routes/input';
import { InstallPage } from './routes/install';
import { MeterPage } from './routes/meter';
import { NotFound } from './routes/not-found';
import { PalettePage } from './routes/palette';
import { Placeholder } from './routes/placeholder';
import { RationalePage } from './routes/rationale';
import { Root } from './routes/root';
import { SwitchPage } from './routes/switch';
import { TabsPage } from './routes/tabs';
import { TokensPage } from './routes/tokens';
import { TooltipPage } from './routes/tooltip';

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

const buttonRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/components/button',
  component: ButtonPage,
});

const tabsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/components/tabs',
  component: TabsPage,
});

const meterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/components/meter',
  component: MeterPage,
});

const tooltipRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/components/tooltip',
  component: TooltipPage,
});

const inputRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/components/input',
  component: InputPage,
});

const switchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/components/switch',
  component: SwitchPage,
});

const componentNameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/components/$name',
  component: ComponentNamePage,
});

function ComponentNamePage() {
  const { name } = componentNameRoute.useParams();
  return <Placeholder title={name} ticket="ULT-37 through ULT-39" />;
}

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
  buttonRoute,
  tabsRoute,
  meterRoute,
  tooltipRoute,
  inputRoute,
  switchRoute,
  componentNameRoute,
  rationaleRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
