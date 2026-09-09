import * as stylex from '@stylexjs/stylex';
import { Button, Dialog } from '@ultima/ui';

const styles = stylex.create({
  hidden: {
    borderWidth: 0,
    clip: 'rect(0 0 0 0)',
    height: '1px',
    margin: '-1px',
    overflow: 'hidden',
    padding: 0,
    position: 'absolute',
    whiteSpace: 'nowrap',
    width: '1px',
  },
});

export default function HiddenTitleDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger render={<Button variant="outline" />}>Show keyboard help</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Viewport>
          <Dialog.Popup>
            <Dialog.Title style={styles.hidden}>Keyboard shortcuts</Dialog.Title>
            <Dialog.Description>The title remains in the accessibility tree.</Dialog.Description>
            <p>Press Command K to open search.</p>
            <Dialog.Close render={<Button variant="ghost" />}>Close</Dialog.Close>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
