import { AlertDialog, Button } from '@ultima/ui';

export default function Confirm() {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger render={<Button />}>Delete report</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop forceRender />
        <AlertDialog.Viewport>
          <AlertDialog.Popup>
            <AlertDialog.Header>
              <AlertDialog.Title>Delete report</AlertDialog.Title>
              <AlertDialog.Description>This cannot be undone.</AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Close render={<Button variant="ghost" />}>Cancel</AlertDialog.Close>
              <AlertDialog.Close render={<Button tone="danger" />}>Delete</AlertDialog.Close>
            </AlertDialog.Footer>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
