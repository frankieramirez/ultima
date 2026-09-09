import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';

import { ComponentsPage } from './routes/components';
import { Home } from './routes/home';
import { InstallPage } from './routes/install';
import { NotFound } from './routes/not-found';
import { PalettePage } from './routes/palette';
import { Placeholder } from './routes/placeholder';
import { PrototypeUlt7 } from './routes/prototype-ult7';
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
  return <Placeholder title={name} ticket="ULT-36 through ULT-39" />;
}

const rationaleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rationale',
  component: RationalePage,
});

const prototypeUlt7Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/prototype/ult-7',
  component: PrototypeUlt7,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  installRoute,
  tokensRoute,
  paletteRoute,
  componentsRoute,
  componentNameRoute,
  rationaleRoute,
  prototypeUlt7Route,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
