import * as stylex from '@stylexjs/stylex';
import { Button, Dialog } from '@ultima/ui';

const styles = stylex.create({
  body: { margin: 0 },
});

export default function BasicDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger render={<Button />}>Open dialog</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop forceRender />
        <Dialog.Viewport>
          <Dialog.Popup>
            <Dialog.Header>
              <Dialog.Title>Archive report</Dialog.Title>
              <Dialog.Description>
                The report stays available in the archive and can be restored later.
              </Dialog.Description>
            </Dialog.Header>
            <p {...stylex.props(styles.body)}>Archive the quarterly accessibility report?</p>
            <Dialog.Footer>
              <Dialog.Close render={<Button variant="ghost" />}>Close</Dialog.Close>
            </Dialog.Footer>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
