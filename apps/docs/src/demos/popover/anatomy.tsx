import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button, Popover } from '@ultima/ui';
import { useRef } from 'react';

const styles = stylex.create({
  stage: {
    blockSize: '18rem',
    inlineSize: 'min(28rem, 100cqi)',
    isolation: 'isolate',
    position: 'relative',
  },
  body: {
    display: 'grid',
    gap: space['--ult-space-4'],
    justifyItems: 'start',
  },
});

const ignoreViewportCollisions = { side: 'none', fallbackAxisSide: 'none' } as const;

export default function PopoverAnatomy() {
  const stage = useRef<HTMLDivElement>(null);
  return (
    <div ref={stage} {...stylex.props(styles.stage)}>
      <Popover.Root open>
        <Popover.Trigger render={<Button />}>Share report</Popover.Trigger>
        <Popover.Portal container={stage}>
          <Popover.Positioner collisionAvoidance={ignoreViewportCollisions} sideOffset={8} align="start">
            <Popover.Popup initialFocus={false} finalFocus={false}>
              <Popover.Arrow />
              <div {...stylex.props(styles.body)}>
                <Popover.Title>Share this report</Popover.Title>
                <Popover.Description>Anyone with the link can read the report. Nobody can edit it.</Popover.Description>
                <Popover.Close render={<Button variant="ghost" size="sm" />}>Done</Popover.Close>
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
