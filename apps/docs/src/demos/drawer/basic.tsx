import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button, Drawer } from '@ultima/ui';

const styles = stylex.create({
  panel: {
    alignContent: 'start',
    display: 'grid',
    gap: space['--ult-space-4'],
    justifyItems: 'start',
  },
});

export default function BasicDrawer() {
  return (
    <Drawer.Root>
      <Drawer.Trigger render={<Button />}>Filters</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop forceRender />
        <Drawer.Viewport>
          <Drawer.Popup style={styles.panel}>
            <Drawer.Title>Filters</Drawer.Title>
            <Drawer.Description>
              Narrow the report to one team. Drag the panel down to dismiss it, or press Escape.
            </Drawer.Description>
            <Drawer.Close render={<Button variant="ghost" />}>Done</Drawer.Close>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
