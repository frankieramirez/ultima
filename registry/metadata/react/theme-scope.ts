import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'theme-scope',
  kind: 'react',
  title: 'Theme Scope',
  description: 'Theme a subtree in one mode and keep its portalled controls inside it.',
  contract: 'docs/spec/ultima.md#mode-and-scope-packaging',
  installDocs: 'Pass the Studio export\'s ultimaTheme as theme. A portalled control inside passes useThemeScopeContainer() as its portal container; one that omits it mounts under <body> and reads the document theme. See https://ultima.systems/components/theme-scope.',
  primaryExport: 'ThemeScope',
  release: 'v0.2',
  order: 31,
  group: 'layout',
} satisfies ReactDescriptor;
