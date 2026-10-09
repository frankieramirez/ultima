import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';

import { useAnatomyReport } from './block-anatomy';
import { BlockPage } from './block-page';
import { SCREEN_LESSONS, ScreenPreview } from './build-a-screen';
import { ComponentPage } from './component-page';
import { components } from './components';
import { blockTitle, componentTitle } from './document-title';
import { blocks } from './generated/blocks';
import { componentPages } from './generated/component-pages';
import { BlocksPage } from './routes/blocks';
import { BuildAScreenPage } from './routes/build-a-screen';
import { CliPage } from './routes/cli';
import { ComponentsPage } from './routes/components';
import { Home } from './routes/home';
import { ElementsPage } from './routes/elements';
import { InstallPage } from './routes/install';
import { InstallUpdatePage } from './routes/install-update';
import { NotFound } from './routes/not-found';
import { PalettePage } from './routes/palette';
import { RationalePage } from './routes/rationale';
import { Root } from './routes/root';
import { ThemeStudio } from './routes/theme-studio';
import { TokensPage } from './routes/tokens';
import { RecipesPage } from './routes/recipes';
import { SupportPage } from './routes/support';

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

const installUpdateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/install/update',
  component: InstallUpdatePage,
  staticData: { title: 'Update the base theme' },
});

const buildAScreenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/build-a-screen',
  component: BuildAScreenPage,
  staticData: { title: 'Build a screen' },
});

const screenPreviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/build-a-screen/$lesson/preview',
  component: ScreenPreviewPage,
  staticData: { title: 'Build a screen preview', bare: true },
});

function ScreenPreviewPage() {
  const { lesson } = screenPreviewRoute.useParams();
  return SCREEN_LESSONS.includes(lesson) ? <ScreenPreview id={lesson} /> : <NotFound />;
}

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

const recipesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/recipes',
  component: RecipesPage,
  staticData: { title: 'Recipes' },
});

const supportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/support',
  component: SupportPage,
  staticData: { title: 'Support' },
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
  const block = blocks.find((entry) => entry.id === id);
  useAnatomyReport(block);
  return block ? <block.preview /> : <NotFound />;
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
  installUpdateRoute,
  buildAScreenRoute,
  screenPreviewRoute,
  cliRoute,
  elementsRoute,
  tokensRoute,
  paletteRoute,
  componentsRoute,
  componentNameRoute,
  blocksRoute,
  recipesRoute,
  supportRoute,
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
