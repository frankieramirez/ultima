/**
 * Plain values the site-navigation.route-and-mode production binding reads: the routes it loads, the
 * headings each one names and the destinations it reaches through real links. Data only; bump `version`
 * when a value changes so a report names the fixture it ran.
 */
export const siteNavigation = {
  version: 5,
  directLoads: [
    { pathname: '/', heading: 'A system for building interfaces.' },
    { pathname: '/install', heading: 'Install' },
    { pathname: '/elements', heading: 'Elements' },
    { pathname: '/elements/', heading: 'Elements' },
    { pathname: '/components/button', heading: 'Button' },
  ],
  /** The direct load whose link the menu marks current. */
  componentLoad: { pathname: '/components/button', heading: 'Button' },
  /** The home page's link to the install guide, in the page content. */
  homeLink: { name: 'Installation guide', pathname: '/install', heading: 'Install' },
  /** A destination both the desktop header and the narrow site menu link to. */
  destination: { name: 'Tokens', pathname: '/tokens', heading: 'Tokens' },
  menu: { trigger: 'Toggle navigation', name: 'Ultima' },
  /** The menu's section headings, in order; Components is one flat list under its heading. */
  menuSections: ['Foundations', 'Components', 'Blocks'],
  colorMode: { group: 'Color mode', storageKey: 'ultima-theme' },
} as const;
