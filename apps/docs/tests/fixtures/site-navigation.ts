/**
 * Plain values the site-navigation.route-and-mode production binding reads: the routes it loads, the
 * headings each one names and the destinations it reaches through real links. Data only; bump `version`
 * when a value changes so a report names the fixture it ran.
 */
export const siteNavigation = {
  version: 1,
  directLoads: [
    { pathname: '/', heading: 'Good interfaces start with good parts.' },
    { pathname: '/install', heading: 'Install' },
    { pathname: '/components/button', heading: 'Button' },
  ],
  /** The home page's link to the install guide, in the page content. */
  homeLink: { name: 'Installation guide', pathname: '/install', heading: 'Install' },
  /** A destination both the desktop header and the narrow site menu link to. */
  destination: { name: 'Tokens', pathname: '/tokens', heading: 'Tokens' },
  menu: { trigger: 'Toggle navigation', name: 'Ultima' },
  colorMode: { group: 'Color mode', storageKey: 'ultima-theme' },
} as const;
