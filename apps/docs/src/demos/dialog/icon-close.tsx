import { XIcon } from 'lucide-react';
import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button, Dialog, Icon } from '@ultima/ui';

const styles = stylex.create({
  close: {
    aspectRatio: 1,
    paddingInline: 0,
  },
  header: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-5'],
    justifyContent: 'space-between',
  },
});

export default function IconCloseDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger render={<Button variant="outline" />}>Edit profile</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop forceRender />
        <Dialog.Viewport>
          <Dialog.Popup>
            <header {...stylex.props(styles.header)}>
              <Dialog.Title>Edit profile</Dialog.Title>
              <Dialog.Close
                render={<Button aria-label="Close dialog" variant="ghost" style={styles.close} />}
              >
                <Icon><XIcon /></Icon>
              </Dialog.Close>
            </header>
            <Dialog.Description>Change the details shown to other party members.</Dialog.Description>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
