import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button, Drawer } from '@ultima/ui';

const EDGES = [
  { direction: 'down', label: 'Bottom' },
  { direction: 'up', label: 'Top' },
  { direction: 'left', label: 'Left' },
  { direction: 'right', label: 'Right' },
] as const;

const styles = stylex.create({
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-4'],
  },
  panel: {
    alignContent: 'start',
    display: 'grid',
    gap: space['--ult-space-4'],
    justifyItems: 'start',
  },
});

export default function DrawerEdges() {
  return (
    <div {...stylex.props(styles.row)}>
      {EDGES.map(({ direction, label }) => (
        <Drawer.Root key={direction} swipeDirection={direction}>
          <Drawer.Trigger render={<Button variant="outline" />}>{label}</Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Backdrop forceRender />
            <Drawer.Viewport>
              <Drawer.Popup style={styles.panel}>
                <Drawer.Title>{label}</Drawer.Title>
                <Drawer.Description>
                  Dismissed by swiping {direction}, which is the edge this panel sits on.
                </Drawer.Description>
                <Drawer.Close render={<Button variant="ghost" />}>Close</Drawer.Close>
              </Drawer.Popup>
            </Drawer.Viewport>
          </Drawer.Portal>
        </Drawer.Root>
      ))}
    </div>
  );
}
