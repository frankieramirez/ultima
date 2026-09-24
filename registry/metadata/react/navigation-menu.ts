import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'navigation-menu',
  kind: 'react',
  title: 'Navigation Menu',
  description: 'A top-level navigation whose panels morph between one another, on two nav landmarks.',
  contract: 'docs/spec/ultima.md#the-navigation-set',
  installDocs: 'import { NavigationMenu } from \'@/components/ui/navigation-menu\';\n\n<NavigationMenu.Root aria-label="Main">\n  <NavigationMenu.List>\n    <NavigationMenu.Item>\n      <NavigationMenu.Trigger>Components<NavigationMenu.Icon /></NavigationMenu.Trigger>\n      <NavigationMenu.Content>\n        <NavigationMenu.Link href="/components/button">Button</NavigationMenu.Link>\n      </NavigationMenu.Content>\n    </NavigationMenu.Item>\n  </NavigationMenu.List>\n  <NavigationMenu.Portal>\n    <NavigationMenu.Positioner sideOffset={8}>\n      <NavigationMenu.Popup>\n        <NavigationMenu.Arrow />\n        <NavigationMenu.Viewport />\n      </NavigationMenu.Popup>\n    </NavigationMenu.Positioner>\n  </NavigationMenu.Portal>\n</NavigationMenu.Root>\n\nOne Portal for the whole menu, not one per Item: the active Content is portalled into the Viewport. Name Root yourself; Popup carries aria-label="Submenu" unless you name it. Portalling needs isolation: isolate on your app root and body { position: relative } for iOS 26 Safari.',
  primaryExport: 'NavigationMenu',
  release: 'v0.2',
  order: 3,
} satisfies ReactDescriptor;
