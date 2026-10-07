import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'hover-card',
  kind: 'react',
  title: 'Hover Card',
  description: 'A preview of where a link goes, opened by hovering or focusing the link itself.',
  contract: 'docs/spec/ultima.md#the-overlay-set',
  installDocs: 'import { HoverCard } from \'@/components/ui/hover-card\';\n\n<p>\n  The gate is documented in the{\' \'}\n  <HoverCard.Root>\n    <HoverCard.Trigger href="/docs/contrast-gate">contrast gate</HoverCard.Trigger>\n    <HoverCard.Portal>\n      <HoverCard.Positioner sideOffset={8}>\n        <HoverCard.Popup>\n          <HoverCard.Arrow />\n          Every semantic pairing is checked against WCAG AA before a palette ships.\n        </HoverCard.Popup>\n      </HoverCard.Positioner>\n    </HoverCard.Portal>\n  </HoverCard.Root>{\' \'}\n  section, which lists the pairings it covers.\n</p>\n\nTrigger is the link itself, an <a> with your own href, styled by Ultima and underlined because it sits in your prose. It is the one Ultima link that underlines. Put everything the card shows at that destination too: the card never opens on touch, and a screen reader reads its content as unlabelled text, so the link must be the whole story on its own. There is no Title, no Description, and no Close. delay and closeDelay are Trigger props, defaulting to 600 and 300.',
  primaryExport: 'HoverCard',
  release: 'v0.2',
  order: 7,
  group: 'overlays',
  elementless: ['Root', 'Portal', 'Handle'],
} satisfies ReactDescriptor;
