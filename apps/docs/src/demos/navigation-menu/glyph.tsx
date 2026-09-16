import { NavigationMenu } from '@ultima/ui';

export default function ReplacedGlyph() {
  return (
    <NavigationMenu.Root aria-label="Resources">
      <NavigationMenu.List>
        <NavigationMenu.Item>
          <NavigationMenu.Trigger>
            Resources
            <NavigationMenu.Icon>+</NavigationMenu.Icon>
          </NavigationMenu.Trigger>
          <NavigationMenu.Content>
            <NavigationMenu.Link href="/llms.txt">The agent guide</NavigationMenu.Link>
            <NavigationMenu.Link href="https://base-ui.com">Base UI</NavigationMenu.Link>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
      </NavigationMenu.List>
      <NavigationMenu.Portal>
        <NavigationMenu.Positioner sideOffset={8}>
          <NavigationMenu.Popup>
            <NavigationMenu.Viewport />
          </NavigationMenu.Popup>
        </NavigationMenu.Positioner>
      </NavigationMenu.Portal>
    </NavigationMenu.Root>
  );
}
