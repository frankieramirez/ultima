import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';

import { components } from './components';
import { componentTitle } from './document-title';
import { componentPages } from './generated/component-pages';
import { Prose } from './prose';
import { ComponentsPage } from './routes/components';
import { Home } from './routes/home';
import { ElementsPage } from './routes/elements';
import { InstallPage } from './routes/install';
import { NotFound } from './routes/not-found';
import { PalettePage } from './routes/palette';
import { RationalePage } from './routes/rationale';
import { Root } from './routes/root';
import { ThemeStudio } from './routes/theme-studio';
import { TokensPage } from './routes/tokens';

const rootRoute = createRootRoute({
  component: Root,
  notFoundComponent: NotFound,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
  staticData: { title: 'Good interfaces start with good parts' },
});

const installRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/install',
  component: InstallPage,
  staticData: { title: 'Install' },
});

const elementsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/elements',
  component: ElementsPage,
  staticData: { title: 'Elements' },
});

const tokensRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tokens',
  component: TokensPage,
  staticData: { title: 'Tokens' },
});

const paletteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/palette',
  component: PalettePage,
  staticData: { title: 'Palette' },
});

const componentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/components',
  component: ComponentsPage,
  staticData: { title: 'Components' },
});

const componentNameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/components/$name',
  component: ComponentNamePage,
  staticData: { title: componentTitle },
});

function ComponentNamePage() {
  const { name } = componentNameRoute.useParams();
  const component = components.find(({ item }) => item === name);
  const Content = componentPages[name];

  if (!component || !Content) return <NotFound />;

  return (
    <Prose
      Content={Content}
      breadcrumb={[{ label: 'Components', to: '/components' }, { label: component.name }]}
    />
  );
}

const rationaleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rationale',
  component: RationalePage,
  staticData: { title: 'Rationale' },
});

const themeStudioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/theme-studio',
  component: ThemeStudio,
  staticData: { title: 'Theme Studio' },
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  installRoute,
  elementsRoute,
  tokensRoute,
  paletteRoute,
  componentsRoute,
  componentNameRoute,
  rationaleRoute,
  themeStudioRoute,
]);

export const router = createRouter({ routeTree, scrollRestoration: true });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
