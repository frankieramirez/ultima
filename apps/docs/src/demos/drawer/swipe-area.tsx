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

export default function DrawerSwipeArea() {
  return (
    <Drawer.Root swipeDirection="right">
      <Drawer.Trigger render={<Button />}>Notifications</Drawer.Trigger>
      <Drawer.SwipeArea />
      <Drawer.Portal>
        <Drawer.Backdrop forceRender />
        <Drawer.Viewport>
          <Drawer.Popup style={styles.panel}>
            <Drawer.Title>Notifications</Drawer.Title>
            <Drawer.Description>
              On a touch screen, swipe in from the right edge of the window to open this without the button.
            </Drawer.Description>
            <Drawer.Close render={<Button variant="ghost" />}>Done</Drawer.Close>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
