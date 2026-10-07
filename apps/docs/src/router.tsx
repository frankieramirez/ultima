import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';

import { BlockPage } from './block-page';
import { ComponentPage } from './component-page';
import { components } from './components';
import { blockTitle, componentTitle } from './document-title';
import { blocks } from './generated/blocks';
import { componentPages } from './generated/component-pages';
import { BlocksPage } from './routes/blocks';
import { CliPage } from './routes/cli';
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
  staticData: { title: 'A system for building interfaces.' },
});

const installRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/install',
  component: InstallPage,
  staticData: { title: 'Install' },
});

const cliRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cli',
  component: CliPage,
  staticData: { title: 'CLI' },
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

  return <ComponentPage key={component.item} entry={component} Content={Content} />;
}

const blocksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/blocks',
  component: BlocksPage,
  staticData: { title: 'Blocks' },
});

const blockRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/blocks/$id',
  component: BlockIdPage,
  staticData: { title: blockTitle },
});

function BlockIdPage() {
  const { id } = blockRoute.useParams();
  const block = blocks.find((entry) => entry.id === id);
  if (!block) return <NotFound />;
  return <BlockPage key={block.id} block={block} />;
}

const blockPreviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/blocks/$id/preview',
  component: BlockPreviewPage,
  staticData: { title: (params) => `${blockTitle(params)} preview`, bare: true },
});

function BlockPreviewPage() {
  const { id } = blockPreviewRoute.useParams();
  const Block = blocks.find((entry) => entry.id === id)?.preview;
  return Block ? <Block /> : <NotFound />;
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
  cliRoute,
  elementsRoute,
  tokensRoute,
  paletteRoute,
  componentsRoute,
  componentNameRoute,
  blocksRoute,
  blockRoute,
  blockPreviewRoute,
  rationaleRoute,
  themeStudioRoute,
]);

export const router = createRouter({ routeTree, scrollRestoration: true });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
