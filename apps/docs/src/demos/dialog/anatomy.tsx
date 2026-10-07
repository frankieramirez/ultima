import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
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
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBlockStart: space['--ult-space-6'],
  },
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
    </div>
  );
}
