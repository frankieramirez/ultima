import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'scroll-area',
  kind: 'react',
  title: 'Scroll Area',
  description: 'A native scroll container with scrollbars you can see and a viewport a keyboard can reach.',
  contract: 'docs/spec/ultima.md#the-toggle-accordion-avatar-and-scroll-area-set',
  installDocs: 'import { ScrollArea } from \'@/components/ui/scroll-area\';\n\n<ScrollArea.Root style={styles.bounds}>\n  <ScrollArea.Viewport>\n    <ScrollArea.Content>Anything.</ScrollArea.Content>\n  </ScrollArea.Viewport>\n  <ScrollArea.Scrollbar>\n    <ScrollArea.Thumb />\n  </ScrollArea.Scrollbar>\n</ScrollArea.Root>\n\nThe bound is yours: give Root a block size through the style slot, or nothing scrolls. A horizontal bar is a second Scrollbar with orientation="horizontal", and Corner fills the intersection when both overflow. The bar is visible whenever its axis overflows; there is no type prop and no hide delay.',
  primaryExport: 'ScrollArea',
  release: 'v0.2',
  order: 11,
  group: 'layout',
  replaces: { roles: ['scrollbar'] },
} satisfies ReactDescriptor;
