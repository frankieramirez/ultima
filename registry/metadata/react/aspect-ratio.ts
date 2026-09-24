import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'aspect-ratio',
  kind: 'react',
  title: 'Aspect Ratio',
  description: 'A fixed-ratio box for media, with the box and the radius left to the style slot.',
  contract: 'docs/spec/ultima.md#the-aspect-ratio-and-resizable-set',
  installDocs: 'import { AspectRatio } from \'@/components/ui/aspect-ratio\';\n\n<AspectRatio ratio={16 / 9}>\n  <img src="/cover.png" alt="Ridgeline at dusk" />\n</AspectRatio>\n\nratio is a number written inline as aspect-ratio, the file\'s one runtime declaration. The box and the radius go through the style slot, and render swaps the div for your own element, like a figure.',
  primaryExport: 'AspectRatio',
  release: 'v0.2',
  order: 14,
} satisfies ReactDescriptor;
