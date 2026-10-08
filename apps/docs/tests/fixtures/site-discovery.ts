/**
 * Plain values the site-discovery.discovery-surface bindings read: the title each route serves and
 * the crawler entrypoints. Data only; bump `version` when a value changes so a report names the
 * fixture it ran.
 */
export const siteDiscovery = {
  version: 5,
  /** A route and the document.title it serves, one per shape the router knows. */
  titles: [
    { pathname: '/', title: 'A system for building interfaces. - Ultima' },
    { pathname: '/install', title: 'Install - Ultima' },
    { pathname: '/install/update', title: 'Update the base theme - Ultima' },
    { pathname: '/elements', title: 'Elements - Ultima' },
    { pathname: '/tokens', title: 'Tokens - Ultima' },
    { pathname: '/palette', title: 'Palette - Ultima' },
    { pathname: '/rationale', title: 'Rationale - Ultima' },
    { pathname: '/theme-studio', title: 'Theme Studio - Ultima' },
    { pathname: '/components', title: 'Components - Ultima' },
    { pathname: '/blocks', title: 'Blocks - Ultima' },
    { pathname: '/blocks/sign-in-01', title: 'Sign-in 01 - Ultima' },
    { pathname: '/components/button', title: 'Button - Ultima' },
  ],
  /** Both not-found shapes: a path no route knows and a component name the catalogue lacks. */
  notFound: { title: 'Lost in the aether - Ultima', component: 'not-a-component' },
  origin: 'https://ultima.systems',
} as const;
