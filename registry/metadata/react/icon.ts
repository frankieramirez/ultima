import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'icon',
  kind: 'react',
  title: 'Icon',
  description: 'Sizes a glyph from any icon set to its surrounding text, without shipping an icon set.',
  contract: 'docs/spec/ultima.md#the-icon-item',
  installDocs: 'import { Icon } from \'@/components/ui/icon\';\n\n<Button>\n  <Icon><DownloadIcon /></Icon>\n  Download\n</Button>\n\nWrap each icon from your own set. Icon merges onto the set\'s own svg and sizes it to 1em, whatever the set defaults to. It is aria-hidden unless you give it an aria-label.',
  primaryExport: 'Icon',
  release: 'v0.2',
  order: 23,
  group: 'layout',
} satisfies ReactDescriptor;
