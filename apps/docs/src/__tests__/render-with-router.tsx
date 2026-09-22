import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { render } from 'vitest-browser-react';

export function renderWithRouter(node: ReactNode) {
  const rootRoute = createRootRoute();
  const routeTree = rootRoute.addChildren([
    createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => node }),
  ]);
  const history = createMemoryHistory({ initialEntries: ['/'] });
  return render(<RouterProvider router={createRouter({ routeTree, history })} />);
}
