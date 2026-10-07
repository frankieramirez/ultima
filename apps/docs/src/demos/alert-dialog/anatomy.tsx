import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { AlertDialog, Button, Dialog } from '@ultima/ui';
import { useRef } from 'react';

const styles = stylex.create({
  stage: {
    blockSize: '20rem',
    inlineSize: 'min(36rem, 100cqi)',
    isolation: 'isolate',
    position: 'relative',
  },
  contained: { position: 'absolute' },
  footer: {
    display: 'flex',
    gap: space['--ult-space-3'],
    justifyContent: 'flex-end',
    marginBlockStart: space['--ult-space-6'],
  },
});

/** AlertDialog.Root is always modal, so Dialog's root, which its parts share, holds them open without trapping focus. */
export default function AlertDialogAnatomy() {
  const stage = useRef<HTMLDivElement>(null);
  return (
    <div ref={stage} {...stylex.props(styles.stage)}>
      <Dialog.Root open modal={false}>
        <AlertDialog.Portal container={stage}>
          <AlertDialog.Backdrop forceRender style={styles.contained} />
          <AlertDialog.Viewport style={styles.contained}>
            <AlertDialog.Popup initialFocus={false} finalFocus={false}>
              <AlertDialog.Title>Delete report</AlertDialog.Title>
              <AlertDialog.Description>This cannot be undone.</AlertDialog.Description>
              <footer {...stylex.props(styles.footer)}>
                <AlertDialog.Close render={<Button variant="ghost" />}>Cancel</AlertDialog.Close>
                <AlertDialog.Close render={<Button tone="danger" />}>Delete</AlertDialog.Close>
              </footer>
            </AlertDialog.Popup>
          </AlertDialog.Viewport>
        </AlertDialog.Portal>
      </Dialog.Root>
    </div>
  );
}
