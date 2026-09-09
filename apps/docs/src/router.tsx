/**
 * Code-based routes, one page. File-based routing and the real page set are
 * decided in ULT-14; this exists only so the app boots.
 */
import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';

import { Root } from './routes/root';
import { Home } from './routes/home';
import { PrototypeUlt7 } from './routes/prototype-ult7';

const rootRoute = createRootRoute({ component: Root });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
});

// PROTOTYPE route (ULT-7). Delete with apps/docs/src/routes/prototype-ult7.tsx.
const prototypeUlt7Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/prototype/ult-7',
  component: PrototypeUlt7,
});

const routeTree = rootRoute.addChildren([indexRoute, prototypeUlt7Route]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
