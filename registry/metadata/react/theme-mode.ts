import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'theme-mode',
  kind: 'react',
  title: 'Theme Mode',
  description: 'Persist a document mode before hydration and follow system preference changes.',
  contract: 'docs/spec/ultima.md#mode-and-scope-packaging',
  installDocs: 'Import a root CSS theme with [data-theme] blocks. See https://ultima.systems/components/theme-mode for the Vite head script and Next layout usage.',
  primaryExport: 'ThemeModeScript',
  release: 'v0.2',
  order: 30,
  group: 'layout',
} satisfies ReactDescriptor;
