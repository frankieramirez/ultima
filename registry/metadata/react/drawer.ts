import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'drawer',
  kind: 'react',
  title: 'Drawer',
  description: 'An edge-anchored panel with swipe gestures, snap points, and the Android back gesture, on Base UI.',
  docsDescription: 'An edge-anchored panel with swipe gestures, snap points, and the Android back gesture.',
  contract: 'docs/spec/ultima.md#the-overlay-set',
  installDocs: 'import { Button } from \'@/components/ui/button\';\nimport { Drawer } from \'@/components/ui/drawer\';\n\n<Drawer.Root>\n  <Drawer.Trigger render={<Button />}>Filters</Drawer.Trigger>\n  <Drawer.Portal>\n    <Drawer.Backdrop />\n    <Drawer.Viewport>\n      <Drawer.Popup>\n        <Drawer.Title>Filters</Drawer.Title>\n        <Drawer.Description>Narrow the report to one team.</Drawer.Description>\n        <Drawer.Close render={<Button variant="ghost" />}>Done</Drawer.Close>\n      </Drawer.Popup>\n    </Drawer.Viewport>\n  </Drawer.Portal>\n</Drawer.Root>\n\nRoot > Portal > Viewport > Popup is the minimum spine: without the Viewport the swipe gesture and touch scroll locking are both off. swipeDirection is the direction the drawer is dismissed toward, which is the edge it sits on, and its values are physical: \'down\' by default, or \'up\', \'left\', \'right\'. Trigger and Close are unstyled slots: render an Ultima Button or an element with its own focus ring. Ship a Trigger alongside any SwipeArea, because swiping a drawer open has no keyboard equivalent. Indent and IndentBackground pass through unstyled; the app-shell CSS that animates them is on the documentation page. Portalling needs isolation: isolate on your app root and body { position: relative } for iOS 26 Safari.',
  primaryExport: 'Drawer',
  release: 'v0.2',
  order: 5,
  group: 'overlays',
} satisfies ReactDescriptor;
