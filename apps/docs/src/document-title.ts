import { components } from './components';
import { blocks } from './generated/blocks';

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    /**
     * The page's share of `document.title`, which Root joins to the site name. A function reads the
     * match's params and returns the not-found title when they name nothing the route serves.
     */
    title?: string | ((params: Record<string, string>) => string);
  }
}

export const NOT_FOUND_TITLE = 'Lost in the aether';

export function componentTitle(params: Record<string, string>): string {
  return components.find(({ item }) => item === params.name)?.name ?? NOT_FOUND_TITLE;
}

export function blockTitle(params: Record<string, string>): string {
  return blocks.find(({ id }) => id === params.id)?.title ?? NOT_FOUND_TITLE;
}

type TitleMatch = {
  status: string;
  _notFound?: boolean;
  params: Record<string, string>;
  staticData: { title?: string | ((params: Record<string, string>) => string) };
};

/** `X - Ultima` from the deepest match's `staticData.title`, or the not-found title when the router reports one. */
export function documentTitle(matches: readonly TitleMatch[]): string {
  const leaf = matches[matches.length - 1];
  if (!leaf || leaf._notFound || leaf.status === 'notFound') return `${NOT_FOUND_TITLE} - Ultima`;
  const option = leaf.staticData.title;
  const title = typeof option === 'function' ? option(leaf.params) : option;
  return title ? `${title} - Ultima` : 'Ultima';
}
