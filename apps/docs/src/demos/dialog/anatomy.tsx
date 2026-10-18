import * as stylex from '@stylexjs/stylex';
import { Button, Dialog } from '@ultima/ui';
import { useRef } from 'react';

const styles = stylex.create({
  stage: {
    blockSize: '26rem',
    inlineSize: 'min(36rem, 100cqi)',
    isolation: 'isolate',
    position: 'relative',
  },
  contained: { position: 'absolute' },
  body: { margin: 0 },
});

export default function DialogAnatomy() {
  const stage = useRef<HTMLDivElement>(null);
  return (
    <div ref={stage} {...stylex.props(styles.stage)}>
      <Dialog.Root open modal={false}>
        <Dialog.Portal container={stage}>
          <Dialog.Backdrop forceRender style={styles.contained} />
          <Dialog.Viewport style={styles.contained}>
            <Dialog.Popup initialFocus={false} finalFocus={false}>
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
    </div>
  );
}
