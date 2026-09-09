import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button, Dialog } from '@ultima/ui';

const styles = stylex.create({
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBlockStart: space['--ult-space-6'],
  },
});

export default function BasicDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger render={<Button />}>Open dialog</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Viewport>
          <Dialog.Popup>
            <Dialog.Title>Archive report</Dialog.Title>
            <Dialog.Description>
              The report stays available in the archive and can be restored later.
            </Dialog.Description>
            <p>Archive the quarterly accessibility report?</p>
            <footer {...stylex.props(styles.footer)}>
              <Dialog.Close render={<Button variant="ghost" />}>Close</Dialog.Close>
            </footer>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
