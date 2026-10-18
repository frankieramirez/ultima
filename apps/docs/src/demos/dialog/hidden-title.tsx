import * as stylex from '@stylexjs/stylex';
import { Button, Dialog } from '@ultima/ui';
import { visuallyHidden } from '@ultima/ui/lib/visually-hidden';

const styles = stylex.create({
  body: { margin: 0 },
});

export default function HiddenTitleDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger render={<Button variant="outline" />}>Show keyboard help</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop forceRender />
        <Dialog.Viewport>
          <Dialog.Popup>
            <Dialog.Header>
              <Dialog.Title style={visuallyHidden}>Keyboard shortcuts</Dialog.Title>
              <Dialog.Description>The title remains in the accessibility tree.</Dialog.Description>
            </Dialog.Header>
            <p {...stylex.props(styles.body)}>Press Command K to open search.</p>
            <Dialog.Footer>
              <Dialog.Close render={<Button variant="ghost" />}>Close</Dialog.Close>
            </Dialog.Footer>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
