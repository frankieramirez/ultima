import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'context-menu',
  kind: 'react',
  title: 'Context Menu',
  description: 'A menu opened by right click or long press, anchored to the pointer rather than to a control.',
  contract: 'docs/spec/ultima.md#the-overlay-set',
  installDocs: 'import { ContextMenu } from \'@/components/ui/context-menu\';\n\n<ContextMenu.Root>\n  <ContextMenu.Trigger>Quarterly report</ContextMenu.Trigger>\n  <ContextMenu.Portal>\n    <ContextMenu.Backdrop />\n    <ContextMenu.Positioner>\n      <ContextMenu.Popup aria-label="Quarterly report">\n        <ContextMenu.Item>Rename</ContextMenu.Item>\n        <ContextMenu.Separator />\n        <ContextMenu.Item>Archive</ContextMenu.Item>\n      </ContextMenu.Popup>\n    </ContextMenu.Positioner>\n  </ContextMenu.Portal>\n</ContextMenu.Root>\n\nTrigger is the region you right-click, wrapping your own content: no role, no ARIA, not focusable, and never a Button. Put the same actions on a visible control too, or a keyboard user cannot reach them. Name the popup with aria-label; a submenu popup is named by its SubmenuTrigger. Portalling needs isolation: isolate on your app root and body { position: relative } for iOS 26 Safari.',
  primaryExport: 'ContextMenu',
  release: 'v0.2',
  order: 6,
  group: 'overlays',
} satisfies ReactDescriptor;
