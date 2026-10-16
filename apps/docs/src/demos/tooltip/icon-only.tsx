import { InfoIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { Button, Tooltip } from '@ultima/ui';

const styles = stylex.create({
  iconOnly: {
    aspectRatio: 1,
    paddingInline: 0,
  },
});

export default function IconOnly() {
  return (
    <Tooltip.Provider delay={0}>
      <Tooltip.Root>
        <Tooltip.Trigger
          aria-label="More information"
          render={<Button variant="outline" style={styles.iconOnly} />}
        >
          <InfoIcon />
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner>
            <Tooltip.Popup>More information</Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
