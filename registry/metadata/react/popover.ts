import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'popover',
  kind: 'react',
  title: 'Popover',
  description: 'An anchored panel of rich content, opened from a control and dismissed without blocking the page.',
  contract: 'docs/spec/ultima.md#the-overlay-set',
  installDocs: "import { Popover } from '@/components/ui/popover';\n\n<Popover.Root>\n  <Popover.Trigger render={<Button />}>Share</Popover.Trigger>\n  <Popover.Portal>\n    <Popover.Positioner sideOffset={8}>\n      <Popover.Popup>\n        <Popover.Arrow />\n        <Popover.Title>Share this report</Popover.Title>\n        <Popover.Description>Anyone with the link can read it.</Popover.Description>\n      </Popover.Popup>\n    </Popover.Positioner>\n  </Popover.Portal>\n</Popover.Root>\n\nTrigger and Close are unstyled slots: render an Ultima Button or an element with its own focus ring. Name the popup with Popover.Title, or with aria-label on Popup when it has no visible heading. openOnHover, delay, and closeDelay are Trigger props, not Root's.",
  primaryExport: 'Popover',
  release: 'v0.2',
  order: 4,
  group: 'overlays',
} satisfies ReactDescriptor;
