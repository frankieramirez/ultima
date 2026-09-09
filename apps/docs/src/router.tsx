import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';

import { ButtonPage } from './routes/button';
import { ComponentsPage } from './routes/components';
import { DialogPage } from './routes/dialog';
import { DropdownMenuPage } from './routes/dropdown-menu';
import { Home } from './routes/home';
import { InstallPage } from './routes/install';
import { NotFound } from './routes/not-found';
import { PalettePage } from './routes/palette';
import { Placeholder } from './routes/placeholder';
import { RationalePage } from './routes/rationale';
import { Root } from './routes/root';
import { SelectPage } from './routes/select';
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

const buttonRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/components/button',
  component: ButtonPage,
});

const dialogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/components/dialog',
  component: DialogPage,
});

const dropdownMenuRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/components/dropdown-menu',
  component: DropdownMenuPage,
});

const selectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/components/select',
  component: SelectPage,
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
  dialogRoute,
  dropdownMenuRoute,
  selectRoute,
  componentNameRoute,
  rationaleRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
