import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { AlertDialog, Button } from '@ultima/ui';

const styles = stylex.create({
  footer: {
    display: 'flex',
    gap: space['--ult-space-3'],
    justifyContent: 'flex-end',
    marginBlockStart: space['--ult-space-6'],
  },
});

export default function Confirm() {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger render={<Button />}>Delete report</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Viewport>
          <AlertDialog.Popup>
            <AlertDialog.Title>Delete report</AlertDialog.Title>
            <AlertDialog.Description>This cannot be undone.</AlertDialog.Description>
            <footer {...stylex.props(styles.footer)}>
              <AlertDialog.Close render={<Button variant="ghost" />}>Cancel</AlertDialog.Close>
              <AlertDialog.Close render={<Button tone="danger" />}>Delete</AlertDialog.Close>
            </footer>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
