import * as stylex from '@stylexjs/stylex';
import { Button, Tooltip } from '@ultima/ui';
import { useRef } from 'react';

const styles = stylex.create({
  stage: {
    blockSize: '7rem',
    display: 'flex',
    inlineSize: 'min(20rem, 100cqi)',
    isolation: 'isolate',
    justifyContent: 'center',
    position: 'relative',
  },
});

const ignoreViewportCollisions = { side: 'none', fallbackAxisSide: 'none' } as const;

/** Below its trigger, so the positioner wraps the popup; above it, Base UI sets the popup absolute and the positioner has no box. */
export default function TooltipAnatomy() {
  const stage = useRef<HTMLDivElement>(null);
  return (
    <div ref={stage} {...stylex.props(styles.stage)}>
      <Tooltip.Provider delay={0}>
        <Tooltip.Root open>
          <Tooltip.Trigger aria-label="Save changes" render={<Button />}>
            Save
          </Tooltip.Trigger>
          <Tooltip.Portal container={stage}>
            <Tooltip.Positioner collisionAvoidance={ignoreViewportCollisions} side="bottom">
              <Tooltip.Popup>
                <Tooltip.Arrow />
                <Tooltip.Viewport>Save changes</Tooltip.Viewport>
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>
  );
}
