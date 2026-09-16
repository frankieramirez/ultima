import { NavigationMenu } from '@ultima/ui';

export default function Menu() {
  return (
    <NavigationMenu.Root aria-label="Product areas">
      <NavigationMenu.List>
        <NavigationMenu.Item>
          <NavigationMenu.Trigger>
            Components
            <NavigationMenu.Icon />
          </NavigationMenu.Trigger>
          <NavigationMenu.Content>
            <NavigationMenu.Link href="/components/button">Button</NavigationMenu.Link>
            <NavigationMenu.Link href="/components/card">Card</NavigationMenu.Link>
            <NavigationMenu.Link href="/components/navigation-menu" active>
              Navigation Menu
            </NavigationMenu.Link>
            <NavigationMenu.Link href="/components/table">Table</NavigationMenu.Link>
            <NavigationMenu.Link href="/components/tabs">Tabs</NavigationMenu.Link>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Trigger>
            Tokens
            <NavigationMenu.Icon />
          </NavigationMenu.Trigger>
          <NavigationMenu.Content>
            <NavigationMenu.Link href="/tokens">Every token</NavigationMenu.Link>
            <NavigationMenu.Link href="/palette">The palette</NavigationMenu.Link>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
      </NavigationMenu.List>
      <NavigationMenu.Portal>
        <NavigationMenu.Backdrop />
        <NavigationMenu.Positioner sideOffset={8}>
          <NavigationMenu.Popup>
            <NavigationMenu.Arrow />
            <NavigationMenu.Viewport />
          </NavigationMenu.Popup>
        </NavigationMenu.Positioner>
      </NavigationMenu.Portal>
    </NavigationMenu.Root>
  );
}
