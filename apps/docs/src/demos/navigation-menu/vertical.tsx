import * as stylex from '@stylexjs/stylex';
import { NavigationMenu } from '@ultima/ui';

const styles = stylex.create({
  column: {
    alignItems: 'stretch',
    flexDirection: 'column',
  },
});

export default function VerticalMenu() {
  return (
    <NavigationMenu.Root aria-label="Docs sections" orientation="vertical">
      <NavigationMenu.List style={styles.column}>
        <NavigationMenu.Item>
          <NavigationMenu.Trigger>
            Getting started
            <NavigationMenu.Icon />
          </NavigationMenu.Trigger>
          <NavigationMenu.Content>
            <NavigationMenu.Link href="/install">Install</NavigationMenu.Link>
            <NavigationMenu.Link href="/setup">Set up a project</NavigationMenu.Link>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Trigger>
            Guides
            <NavigationMenu.Icon />
          </NavigationMenu.Trigger>
          <NavigationMenu.Content>
            <NavigationMenu.Link href="/guides/theming">Theming</NavigationMenu.Link>
            <NavigationMenu.Link href="/guides/registry">The registry</NavigationMenu.Link>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
      </NavigationMenu.List>
      <NavigationMenu.Portal>
        <NavigationMenu.Positioner side="inline-end" sideOffset={8}>
          <NavigationMenu.Popup>
            <NavigationMenu.Viewport />
          </NavigationMenu.Popup>
        </NavigationMenu.Positioner>
      </NavigationMenu.Portal>
    </NavigationMenu.Root>
  );
}
