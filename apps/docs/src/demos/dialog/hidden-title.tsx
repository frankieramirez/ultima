import { Button, Dialog } from '@ultima/ui';
import { visuallyHidden } from '@ultima/ui/lib/visually-hidden';

export default function HiddenTitleDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger render={<Button variant="outline" />}>Show keyboard help</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop forceRender />
        <Dialog.Viewport>
          <Dialog.Popup>
            <Dialog.Title style={visuallyHidden}>Keyboard shortcuts</Dialog.Title>
            <Dialog.Description>The title remains in the accessibility tree.</Dialog.Description>
            <p>Press Command K to open search.</p>
            <Dialog.Close render={<Button variant="ghost" />}>Close</Dialog.Close>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
