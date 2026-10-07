import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button, Drawer } from '@ultima/ui';
import { useRef } from 'react';

const styles = stylex.create({
  stage: {
    blockSize: '22rem',
    inlineSize: 'min(36rem, 100cqi)',
    isolation: 'isolate',
    position: 'relative',
  },
  contained: { position: 'absolute' },
  panel: {
    alignContent: 'start',
    display: 'grid',
    gap: space['--ult-space-4'],
    justifyItems: 'start',
  },
});

export default function DrawerAnatomy() {
  const stage = useRef<HTMLDivElement>(null);
  return (
    <div ref={stage} {...stylex.props(styles.stage)}>
      <Drawer.Root open modal={false}>
        <Drawer.Portal container={stage}>
          <Drawer.Backdrop forceRender style={styles.contained} />
          <Drawer.Viewport style={styles.contained}>
            <Drawer.Popup initialFocus={false} finalFocus={false} style={styles.panel}>
              <Drawer.Title>Filters</Drawer.Title>
              <Drawer.Description>
                Narrow the report to one team. Drag the panel down to dismiss it, or press Escape.
              </Drawer.Description>
              <Drawer.Close render={<Button variant="ghost" />}>Done</Drawer.Close>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
